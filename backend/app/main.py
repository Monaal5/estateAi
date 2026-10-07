import asyncio
import io
import json

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from pypdf import PdfReader
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import delete, select

from .config import DATABASE_URL, POLICY
from .db import AiCallLog, ChatMessage, Deal, DealArtifact, PortfolioArtifact, SessionLocal, UploadedDocument, init_db
from .finance import normalize_deal, underwrite
from .gemini import GeminiError, generate_json

app = FastAPI(title="estate AI API", version="2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


async def _init_db_with_retry():
    host = DATABASE_URL.split("@")[-1]
    print(f"[startup] connecting to database at {host}")
    for attempt in range(40):
        try:
            init_db()
            print("[startup] database ready")
            return
        except Exception as e:  # noqa: BLE001
            print(f"[startup] database not ready ({type(e).__name__}: {str(e).strip()[:300]}) {attempt + 1}/40")
            await asyncio.sleep(3)
    print(f"[startup] GAVE UP connecting to {host}. Check DATABASE_URL.")


@app.on_event("startup")
async def _startup():
    asyncio.create_task(_init_db_with_retry())  # don't block port binding



@app.exception_handler(GeminiError)
async def _gemini_err(_req: Request, e: GeminiError):
    status = e.status if 400 <= e.status < 600 else 502
    return JSONResponse(status_code=status, content={"error": str(e), "reason": e.reason or "AI_ERROR"})


# Concurrent requests for the same resource share one AI call (avoids burning quota).
_inflight: dict[str, asyncio.Task] = {}


async def once(key: str, coro_fn):
    if key not in _inflight:
        _inflight[key] = asyncio.create_task(coro_fn())
        _inflight[key].add_done_callback(lambda _t: _inflight.pop(key, None))
    return await _inflight[key]


def iso(dt):
    return dt.isoformat() if dt else None


# ---------------------------------------------------------------- deals
DEALS_PROMPT = """You generate realistic, varied commercial real estate loan pipeline data for a lender dashboard.
Return JSON: {"deals":[...]} with exactly 10 deals. Each deal:
{"id":"DL-####","borrower":"entity name LLC","sponsor":"person name","property":"property name","propertyType":"Multifamily|Retail|Office|Industrial|Hospitality|Mixed-Use","city":"US city, ST","purpose":"Acquisition|Refinance|Construction|Bridge",
"loanAmount":number,"rate":annual rate as a DECIMAL e.g. 0.0685,"termMonths":amortization in MONTHS e.g. 300,"propertyValue":number,"noi":annual net operating income,"existingAnnualDebt":annual debt service on OTHER loans that remain outstanding (usually 0),
"stage":"Intake|Extraction Review|Underwriting Analysis|Credit Memo|Term Sheet Issued|Lender Submission",
"complianceState":"Verified|Exception Flagged|KYC Pending|Docs Outstanding",
"assignee":"analyst name","daysInStage":number,"priority":"High|Medium|Low","blockers":number,"lastActivity":"short sentence"}
Size NOI so DSCR = NOI / annual debt service varies: about 4 strong deals (1.45-1.9x), 4 marginal (1.15-1.3x), 2 weak (0.9-1.1x).
Loan amounts between 2,000,000 and 60,000,000. LTV mostly 55-80%."""


def deal_out(d: Deal) -> dict:
    return {**d.data, "id": d.id, "metrics": d.metrics}


async def ensure_deals(force: bool = False) -> list[Deal]:
    with SessionLocal() as s:
        rows = s.scalars(select(Deal).order_by(Deal.position)).all()
    if rows and not force:
        return rows

    async def gen():
        data, model = await generate_json(DEALS_PROMPT, "deals")
        with SessionLocal() as s:
            s.execute(delete(Deal))  # cascades to artifacts + chat
            s.execute(delete(PortfolioArtifact))
            for i, raw in enumerate(data["deals"]):
                d = normalize_deal(raw)
                did = str(d.pop("id", f"DL-{i + 1:04d}"))
                if s.get(Deal, did):
                    did = f"{did}-{i}"
                s.add(Deal(id=did, position=i, data=d, metrics=underwrite(d, POLICY), model=model))
            s.commit()
            return s.scalars(select(Deal).order_by(Deal.position)).all()

    return await once("deals", gen)


def get_deal(deal_id: str) -> Deal:
    with SessionLocal() as s:
        d = s.get(Deal, deal_id)
    if not d:
        raise HTTPException(404, detail="Deal not found — the pipeline may have been regenerated. Pick a deal from the inbox.")
    return d


@app.get("/api/health")
async def health():
    try:
        with SessionLocal() as s:
            s.execute(select(1))
        db = "ok"
    except Exception as e:  # noqa: BLE001
        db = f"error: {type(e).__name__}: {e}"
    try:
        _, model = await generate_json('Return {"ok":true}', "health", temperature=0)
        return {"ok": True, "model": model, "database": db}
    except Exception as e:  # noqa: BLE001
        reason = getattr(e, "reason", type(e).__name__)
        return {"ok": False, "error": str(e), "reason": reason, "database": db}



@app.get("/api/deals")
async def list_deals(refresh: int = 0):
    rows = await ensure_deals(bool(refresh))
    deals = [deal_out(d) for d in rows]
    n = len(deals) or 1
    return {
        "deals": deals,
        "model": rows[0].model if rows else None,
        "generatedAt": iso(rows[0].generated_at) if rows else None,
        "summary": {
            "activeFacilities": len(deals),
            "totalVolume": sum(d["loanAmount"] for d in deals),
            "requiringAction": sum(1 for d in deals if d.get("priority") == "High" or (d.get("blockers") or 0) > 0),
            "underAnalysis": sum(1 for d in deals if d.get("stage") in ("Extraction Review", "Underwriting Analysis")),
            "impasses": sum(1 for d in deals if d.get("complianceState") != "Verified"),
            "avgDscr": round(sum(d["metrics"]["dscr"] for d in deals) / n, 2),
        },
    }


# ---------------------------------------------------------------- per-deal artifacts
def underwriting_prompt(deal: dict) -> str:
    return f"""You are a CRE loan underwriting extraction engine. For this deal, simulate what document extraction found.
DEAL: {json.dumps(deal)}
Return JSON:
{{"extractions":[{{"field":"e.g. Net Operating Income","value":"formatted value","source":"document name, page N","confidence":0-100,"status":"Confirmed|Needs Review|Conflict"}}] (8 items, consistent with the deal numbers),
"conflicts":[{{"field":"...","valueA":"...","sourceA":"...","valueB":"...","sourceB":"...","severity":"High|Medium","recommendation":"..."}}] (1-3 items),
"conditions":[{{"title":"...","category":"Documentation|Insurance|Legal|Appraisal|Financial","status":"Open|Requested|Received|Waived","owner":"Borrower|Broker|Processor","note":"..."}}] (4-6 items),
"riskFlags":["short risk statements"] (3-4),
"analystNote":"2-3 sentence summary of where underwriting stands"}}"""


def memo_prompt(deal: dict) -> str:
    return f"""You are a senior CRE credit officer writing a credit memorandum.
DEAL: {json.dumps(deal)}
COMPUTED METRICS (authoritative, do not change): {json.dumps(deal["metrics"])}
LENDER POLICY: {json.dumps(POLICY)}
Return JSON:
{{"recommendation":"Approve|Approve with Conditions|Decline|Defer","recommendationRationale":"...",
"executiveSummary":"paragraph","sponsorAnalysis":"paragraph","marketAnalysis":"paragraph","collateralAnalysis":"paragraph",
"strengths":["..."],"weaknesses":["..."],"mitigants":["..."],
"stressTests":[{{"scenario":"e.g. NOI -10%","dscr":number,"pass":boolean}}] (4 scenarios, compute DSCR from the metrics),
"lenderMatches":[{{"lender":"name","program":"...","fit":0-100,"reason":"..."}}] (3),
"packageCompleteness":0-100}}"""


PROMPTS = {"underwriting": (underwriting_prompt, 0.9), "memo": (memo_prompt, 0.6)}


async def deal_artifact(deal_id: str, kind: str, refresh: bool):
    d = get_deal(deal_id)
    deal = deal_out(d)
    with SessionLocal() as s:
        art = s.scalar(select(DealArtifact).where(DealArtifact.deal_id == deal_id, DealArtifact.kind == kind))
    if not art or refresh:
        prompt_fn, temp = PROMPTS[kind]

        async def gen():
            data, model = await generate_json(prompt_fn(deal), f"{kind}:{deal_id}", temp)
            with SessionLocal() as s:
                s.execute(delete(DealArtifact).where(DealArtifact.deal_id == deal_id, DealArtifact.kind == kind))
                a = DealArtifact(deal_id=deal_id, kind=kind, data=data, model=model)
                s.add(a)
                s.commit()
                return a

        art = await once(f"{kind}:{deal_id}", gen)
    return {"deal": deal, "policy": POLICY, **art.data, "model": art.model, "generatedAt": iso(art.generated_at)}


@app.get("/api/deals/{deal_id}/underwriting")
async def underwriting(deal_id: str, refresh: int = 0):
    return await deal_artifact(deal_id, "underwriting", bool(refresh))


@app.get("/api/deals/{deal_id}/memo")
async def memo(deal_id: str, refresh: int = 0):
    return await deal_artifact(deal_id, "memo", bool(refresh))


# ---------------------------------------------------------------- copilot chat (persisted)
class ChatIn(BaseModel):
    question: str


@app.get("/api/deals/{deal_id}/chat")
def chat_history(deal_id: str):
    get_deal(deal_id)
    with SessionLocal() as s:
        msgs = s.scalars(select(ChatMessage).where(ChatMessage.deal_id == deal_id).order_by(ChatMessage.id)).all()
    return [{"role": m.role, "text": m.text, "cites": m.citations} for m in msgs]


@app.post("/api/deals/{deal_id}/chat")
async def chat(deal_id: str, body: ChatIn):
    deal = deal_out(get_deal(deal_id))
    with SessionLocal() as s:
        arts = {a.kind: a.data for a in s.scalars(select(DealArtifact).where(DealArtifact.deal_id == deal_id))}
        history = s.scalars(select(ChatMessage).where(ChatMessage.deal_id == deal_id).order_by(ChatMessage.id.desc()).limit(6)).all()
    memo_ctx = {"recommendation": arts["memo"].get("recommendation"), "weaknesses": arts["memo"].get("weaknesses")} if "memo" in arts else "not generated yet"
    prompt = f"""You are a read-only CRE underwriting copilot. Answer ONLY from the context. If unknown, say so.
DEAL: {json.dumps(deal)}
UNDERWRITING: {json.dumps(arts.get("underwriting", "not generated yet"))}
MEMO: {json.dumps(memo_ctx)}
HISTORY: {json.dumps([{"role": m.role, "text": m.text} for m in reversed(history)])}
QUESTION: {body.question}
Return JSON: {{"answer":"concise answer","citations":["field or document names used"]}}"""
    data, model = await generate_json(prompt, f"chat:{deal_id}", 0.3)
    with SessionLocal() as s:
        s.add(ChatMessage(deal_id=deal_id, role="user", text=body.question, citations=[]))
        s.add(ChatMessage(deal_id=deal_id, role="ai", text=data.get("answer", ""), citations=data.get("citations", [])))
        s.commit()
    return {**data, "model": model}


# ---------------------------------------------------------------- portfolio views
def brief(rows: list[Deal]) -> str:
    return json.dumps([
        {"id": d.id, "borrower": d.data.get("borrower"), "property": d.data.get("property"), "propertyType": d.data.get("propertyType"),
         "loanAmount": d.data.get("loanAmount"), "stage": d.data.get("stage"), "dscr": d.metrics["dscr"], "ltv": d.metrics["ltv"]}
        for d in rows
    ])


PORTFOLIO = {
    "audit": lambda deals: f"""You audit an AI document extraction pipeline for these CRE deals: {deals}
Return JSON: {{"stats":{{"documentsProcessed":n,"fieldsExtracted":n,"autoAcceptRate":0-100,"humanOverrides":n,"avgConfidence":0-100}},
"events":[{{"time":"HH:MM","dealId":"...","document":"...","field":"...","extracted":"...","finalValue":"...","action":"Auto-accepted|Human override|Rejected|Escalated","actor":"system or analyst name","confidence":0-100}}] (14 events across the deals),
"insights":["3 observations about extraction quality"]}}""",
    "syndication": lambda deals: f"""You are a CRE loan syndication desk. Deals: {deals}
Return JSON: {{"termSheets":[{{"dealId":"...","lender":"lender name","amount":n,"rate":"e.g. SOFR + 285","term":"e.g. 5 yr / 30 yr amort","status":"Drafting|Issued|Negotiating|Accepted|Declined","keyTerms":["..."]}}] (6 items),
"participations":[{{"dealId":"...","leadLender":"...","participants":[{{"name":"...","share":percent}}]}}] (3 items, shares sum to 100),
"marketCommentary":"paragraph on current CRE lending market"}}""",
    "covenants": lambda deals: f"""You monitor loan covenants for these CRE deals: {deals}
Return JSON: {{"covenants":[{{"dealId":"...","covenant":"e.g. Minimum DSCR","threshold":"...","actual":"...","status":"Compliant|Watch|Breach","nextTest":"YYYY-MM-DD","note":"..."}}] (12 items; base actuals on each deal's dscr/ltv),
"alerts":[{{"dealId":"...","severity":"High|Medium|Low","message":"..."}}] (3-5),
"summary":"1-2 sentence portfolio covenant health summary"}}""",
}


async def portfolio_artifact(kind: str, refresh: bool):
    rows = await ensure_deals()
    with SessionLocal() as s:
        art = s.get(PortfolioArtifact, kind)
    if not art or refresh:
        async def gen():
            data, model = await generate_json(PORTFOLIO[kind](brief(rows)), kind)
            with SessionLocal() as s:
                a = s.merge(PortfolioArtifact(kind=kind, data=data, model=model))
                s.commit()
                return a
        art = await once(kind, gen)
    return {**art.data, "model": art.model, "generatedAt": iso(art.generated_at)}


@app.get("/api/extraction-audit")
async def extraction_audit(refresh: int = 0):
    return await portfolio_artifact("audit", bool(refresh))


@app.get("/api/syndication")
async def syndication(refresh: int = 0):
    return await portfolio_artifact("syndication", bool(refresh))


@app.get("/api/covenants")
async def covenants(refresh: int = 0):
    return await portfolio_artifact("covenants", bool(refresh))


# ---------------------------------------------------------------- PDF documents
MAX_PDF_BYTES = 20 * 1024 * 1024
MAX_TEXT_CHARS = 60_000
MAX_OCR_BYTES = 14 * 1024 * 1024  # inline AI requests cap at ~20 MB after base64 encoding
IMAGE_TYPES = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}


def doc_out(d: UploadedDocument) -> dict:
    return {"id": d.id, "filename": d.filename, "docType": d.doc_type, "sizeBytes": d.file_size_bytes,
            "pageCount": d.page_count, "extracted": d.extracted_data, "uploadedAt": iso(d.uploaded_at)}


@app.get("/api/deals/{deal_id}/documents")
def list_documents(deal_id: str):
    get_deal(deal_id)
    with SessionLocal() as s:
        rows = s.scalars(select(UploadedDocument).where(UploadedDocument.deal_id == deal_id).order_by(UploadedDocument.id.desc())).all()
    return [doc_out(d) for d in rows]


@app.delete("/api/deals/{deal_id}/documents/{doc_id}")
def delete_document(deal_id: str, doc_id: int):
    with SessionLocal() as s:
        d = s.get(UploadedDocument, doc_id)
        if not d or d.deal_id != deal_id:
            raise HTTPException(404, detail="Document not found")
        s.delete(d)
        s.commit()
    return {"ok": True}


@app.post("/api/deals/{deal_id}/documents/upload")
async def upload_document(deal_id: str, file: UploadFile = File(...), doc_type: str = Form("Other")):
    d = get_deal(deal_id)
    name = (file.filename or "").lower()
    ext = name.rsplit(".", 1)[-1] if "." in name else ""
    is_pdf = ext == "pdf" or file.content_type == "application/pdf"
    image_mime = IMAGE_TYPES.get(ext) or (file.content_type if file.content_type in IMAGE_TYPES.values() else None)
    if not is_pdf and not image_mime:
        raise HTTPException(400, detail="Supported files: PDF, JPG, PNG, WEBP.")
    raw = await file.read()
    if len(raw) > MAX_PDF_BYTES:
        raise HTTPException(413, detail="File exceeds 20 MB limit.")

    pages: list[str] = []
    if is_pdf:
        try:
            pages = [(p.extract_text() or "") for p in PdfReader(io.BytesIO(raw)).pages]
        except Exception as e:  # noqa: BLE001
            raise HTTPException(400, detail=f"Could not read PDF: {e}")
    text = "\n\n".join(f"[Page {i + 1}]\n{t}" for i, t in enumerate(pages)).strip()
    needs_ocr = not is_pdf or len("".join(pages).strip()) < 20
    if needs_ocr and len(raw) > MAX_OCR_BYTES:
        raise HTTPException(413, detail="Scanned documents must be under 14 MB for AI OCR.")

    deal = deal_out(d)
    source = ("The document is ATTACHED as a scanned file. Perform OCR on every page, then extract."
              if needs_ocr else f"DOCUMENT TEXT:\n{text[:MAX_TEXT_CHARS]}")
    prompt = f"""You are a CRE loan document extraction engine. Extract facts ONLY from the document. Never invent values.
DEAL CONTEXT: {json.dumps(deal)}
DOCUMENT TYPE (user-declared): {doc_type}
{source}
Return JSON:
{{"detectedType":"Rent Roll|Operating Statement|Appraisal|Tax Return|Bank Statement|Loan Application|Purchase Agreement|Other",
"summary":"2-3 sentence summary",
{'"ocrText":"full transcribed text of the document, pages separated by [Page N] markers","pageCount":n,' if needs_ocr else ''}
"fields":[{{"field":"name","value":"formatted value","page":n,"confidence":0-100}}] (all material financial/legal facts found),
"financials":{{"noi":number or null,"loanAmount":number or null,"propertyValue":number or null,"rate":decimal or null,"termMonths":number or null}} (only if explicitly stated in the document),
"discrepancies":[{{"field":"...","documentValue":"...","dealValue":"...","note":"..."}}] (compare with DEAL CONTEXT),
"riskFlags":["..."]}}"""
    attachments = [("application/pdf" if is_pdf else image_mime, raw)] if needs_ocr else None
    data, model = await generate_json(prompt, f"document{'-ocr' if needs_ocr else ''}:{deal_id}", 0.1, attachments)
    if needs_ocr:
        text = str(data.pop("ocrText", "") or "")
        if not pages:
            pages = [""] * max(int(data.pop("pageCount", 1) or 1), 1)
        data.pop("pageCount", None)
        data["ocr"] = True
        if len(text.strip()) < 20 and not data.get("fields"):
            raise HTTPException(422, detail="AI OCR could not read any text from this scan. Try a clearer or higher-resolution copy.")

    fin = {k: v for k, v in (data.get("financials") or {}).items() if isinstance(v, (int, float)) and v > 0}
    updated = {}
    with SessionLocal() as s:
        row = s.get(Deal, deal_id)
        if fin:
            new = normalize_deal({**row.data, **fin})
            updated = {k: new[k] for k in fin if new.get(k) != row.data.get(k)}
            if updated:
                row.data = new
                row.metrics = underwrite(new, POLICY)
                s.execute(delete(DealArtifact).where(DealArtifact.deal_id == deal_id))  # stale analyses
        doc = UploadedDocument(deal_id=deal_id, filename=file.filename or "document.pdf", doc_type=data.get("detectedType") or doc_type,
                               file_size_bytes=len(raw), page_count=len(pages), extracted_text=text,
                               extracted_data={**data, "appliedUpdates": updated}, model=model)
        s.add(doc)
        s.commit()
        return {"document": doc_out(doc), "updatedFields": updated, "deal": deal_out(row)}


@app.get("/api/ai-log")
def ai_log(limit: int = 50):
    with SessionLocal() as s:
        rows = s.scalars(select(AiCallLog).order_by(AiCallLog.id.desc()).limit(limit)).all()
    return [{"purpose": r.purpose, "model": r.model, "ok": r.ok, "latencyMs": r.latency_ms, "error": r.error, "at": iso(r.created_at)} for r in rows]


# ---------------------------------------------------------------- static frontend build (production / Render)
from pathlib import Path
from fastapi.staticfiles import StaticFiles

dist_dir = Path(__file__).resolve().parent.parent.parent / "dist"
if dist_dir.exists():
    app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="static")

