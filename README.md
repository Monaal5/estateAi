# estate AI — AI-Powered Commercial Real Estate Loan Underwriting

estate AI is a full-stack web app that helps a lender decide whether a commercial property loan is safe to make.
An AI engine reads loan data and documents (including scanned PDFs and photos), flags risks, answers questions and writes the credit memo.
All money ratios (DSCR, LTV, debt yield) are calculated with fixed formulas, so the AI never guesses them.

> A plain-English guide with an example for each page is in [`docs/estate_AI_User_Guide.pdf`](docs/estate_AI_User_Guide.pdf).

---

## ✨ Features

| # | Page / Feature | What it does |
|---|----------------|--------------|
| 1 | **Deal Pipeline & Inbox** | Lists every loan request with its stage, priority, blockers, compliance state and DSCR/LTV. Shows portfolio totals (volume, average DSCR, deals needing action). |
| 2 | **Underwriting Workspace** | The working view for one deal: key metrics, AI-extracted facts with source/page/confidence, conflicting values between documents, a conditions tracker and risk flags. |
| 3 | **Document Upload (PDF / Scans)** | Drag-and-drop PDFs, scanned PDFs or JPG/PNG/WEBP photos. The AI extracts fields, compares them with the deal and lists any mismatches. If the document states NOI, loan amount, value, rate or term, the deal is updated and **re-underwritten automatically**. |
| 4 | **AI OCR** | Scanned PDFs and images with no text layer are sent straight to the AI model, which transcribes them. The full transcription is stored in the database. |
| 5 | **Underwriting Copilot** | A chat box tied to each deal. The AI answers only from that deal's data, cites its sources and saves the conversation. |
| 6 | **Credit Memorandum** | AI-written committee memo: recommendation, executive summary, sponsor/market/collateral analysis, strengths, weaknesses, mitigants, stress tests, lender matches and package completeness. |
| 7 | **Extraction Audit** | Portfolio-wide view of AI extraction quality: documents processed, auto-accept rate, human overrides and a timeline of events. |
| 8 | **Syndication & Term Sheets** | Term sheets sent to lenders, loan participations (how a loan is split between banks) and market commentary. |
| 9 | **Covenant Compliance** | Tracks borrower covenants (Compliant / Watch / Breach), upcoming test dates and alerts. |
| 10 | **AI Engine status** | The top bar shows *AI Engine Live / Offline*, based on a live health check of the AI and the database. |
| 11 | **Regenerate anywhere** | Every AI view has a *Regenerate* button. Results are cached in PostgreSQL so pages load instantly next time. |
| 12 | **AI call audit log** | Every AI request (success or failure, latency, error) is logged to the database and available at `/api/ai-log`. |

### Design principles
- **No fake data:** if the AI fails, the UI shows the real error and a Retry button. Nothing is ever filled in with placeholder data.
- **Fixed-formula maths:** `finance.py` cleans up the AI's numbers (for example, rate `6.85` becomes `0.0685` and a term in years becomes months), then computes DSCR, LTV and debt yield.
- **Key stays on the server:** the AI key lives only in `backend/.env` and is never bundled into the frontend.
- **Rate-limit safe:** AI calls run one at a time and retry after a 429. Identical requests that arrive together share a single AI call.

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, lucide-react icons |
| Backend | Python, FastAPI, Uvicorn, SQLAlchemy, httpx, pypdf, python-multipart |
| Database | PostgreSQL 17 (JSONB columns) |
| AI | Large language model via REST API (JSON-mode responses, inline PDF/image input for OCR) |

---

## 📁 Project Structure

```
portfolio/
├── backend/
│   ├── .env                 # AI key + database URL (server-only, not committed)
│   ├── requirements.txt
│   ├── create_db.py         # creates the estate_ai database
│   └── app/
│       ├── main.py          # FastAPI routes (deals, underwriting, memo, chat, documents, portfolio)
│       ├── gemini.py        # AI client: serial queue, retries, JSON parsing, file attachments
│       ├── finance.py       # fixed-formula underwriting maths + input normalisation
│       ├── db.py            # SQLAlchemy models
│       └── config.py        # env config + lender policy (min DSCR 1.25x, max LTV 75%)
├── src/
│   └── dashboard/
│       ├── Dashboard.tsx    # layout: navy top bar, sidebar nav, AI status
│       ├── api.ts           # fetch helper + useApi hook (load / refresh / reload)
│       ├── ui.tsx           # Card, Badge, Stat, Table, Loading, ErrorPanel, AiMeta
│       └── pages/
│           ├── DealInbox.tsx
│           ├── Underwriting.tsx   # includes Document Upload + Copilot
│           ├── CreditMemo.tsx
│           └── Portfolio.tsx      # Extraction Audit, Syndication, Covenants
├── docs/
│   ├── guide.html
│   └── estate_AI_User_Guide.pdf
├── package.json
└── vite.config.ts           # proxies /api → http://localhost:5000
```

---

## 🗄️ Database Tables

| Table | Contents |
|-------|----------|
| `deals` | Each loan facility: AI-generated fields (`data`) + computed `metrics` |
| `deal_artifacts` | Per-deal AI output (`underwriting`, `memo`) |
| `portfolio_artifacts` | Portfolio-wide AI output (`audit`, `syndication`, `covenants`) |
| `chat_messages` | Copilot conversation history per deal |
| `uploaded_documents` | Uploaded files: type, pages, size, extracted/OCR text, AI extraction JSON |
| `ai_call_log` | Audit log of every AI call |

Tables are created automatically when the backend starts.

---

## 🚀 Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 17 (this project expects the binaries at `D:\pgsql`; change the `db` scripts in `package.json` if yours are elsewhere)
- An AI API key

### 1. Install
```powershell
npm install
python -m venv backend\.venv
backend\.venv\Scripts\pip install -r backend\requirements.txt
```

### 2. Configure `backend/.env`
```env
GEMINI_API_KEY=your_ai_api_key
GEMINI_MODELS=gemini-2.5-flash
DATABASE_URL=postgresql+psycopg://postgres:<password>@localhost:5432/estate_ai
```

### 3. Create the database (first time only)
```powershell
npm run db:start
backend\.venv\Scripts\python backend\create_db.py
npm run db:stop
```

### 4. Run
```powershell
npm run dev
```
This starts three processes together:

| Name | Service | URL |
|------|---------|-----|
| `db` | PostgreSQL | `localhost:5432` |
| `api` | FastAPI (auto-reload) | http://localhost:5000 |
| `web` | Vite dev server | **http://localhost:3000** |

Open **http://localhost:3000**.

---

## 🧭 How to Use

1. **Deal Pipeline:** browse the loan requests and click one.
2. **Underwriting Workspace:** review the metrics, extracted facts, conflicts and conditions.
3. **Upload documents:** drop a rent roll, T-12, appraisal or scan. The AI reads it and updates the deal if the numbers differ.
4. **Ask the Copilot:** for example, *"What is the biggest credit risk?"*
5. **Credit Memorandum:** get the approve or decline recommendation along with stress tests.
6. **Portfolio pages:** monitor the extraction audit, syndication and covenants.

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | AI + database health |
| GET | `/api/deals?refresh=1` | Deal pipeline + summary (`refresh=1` regenerates) |
| GET | `/api/deals/{id}/underwriting?refresh=1` | Underwriting analysis |
| GET | `/api/deals/{id}/memo?refresh=1` | Credit memorandum |
| GET / POST | `/api/deals/{id}/chat` | Copilot history / ask a question `{ "question": "..." }` |
| GET | `/api/deals/{id}/documents` | List uploaded documents |
| POST | `/api/deals/{id}/documents/upload` | Multipart: `file` (PDF/JPG/PNG/WEBP), `doc_type` |
| DELETE | `/api/deals/{id}/documents/{docId}` | Delete a document |
| GET | `/api/extraction-audit` | Extraction audit |
| GET | `/api/syndication` | Term sheets & participations |
| GET | `/api/covenants` | Covenant monitoring |
| GET | `/api/ai-log?limit=50` | AI call audit log |

Interactive docs: **http://localhost:5000/docs**

---

## 📐 Underwriting Formulas

```
Annual debt service = monthly amortising payment(loanAmount, rate, termMonths) × 12
DSCR       = NOI ÷ (proposed + existing annual debt service)
LTV        = loanAmount ÷ propertyValue × 100
Debt Yield = NOI ÷ loanAmount × 100
```
Lender policy: **DSCR ≥ 1.25x**, **LTV ≤ 75%**. Deals are graded from these values.

---

## ⚠️ Limits & Notes

- Upload limit is 20 MB, or 14 MB for scanned files that need AI OCR.
- Free-tier AI keys allow only a few requests per minute, so expect short waits; failed requests retry automatically.
- The starting deal pipeline is AI-generated demo data. Upload real documents to replace the numbers.
- *"Deal not found"* means the pipeline was regenerated. Pick a deal again from the Inbox.

## 🛠️ Troubleshooting

| Problem | Fix |
|---------|-----|
| *AI Engine Offline* | Check your internet connection and the key in `backend/.env`, then restart `npm run dev`. |
| `429 RESOURCE_EXHAUSTED` | Rate limit reached. Wait a minute and click Retry. |
| Backend can't connect to DB | Make sure nothing else is using port 5432 and that `DATABASE_URL` is correct. |
| Scan not readable | Upload a clearer, higher-resolution copy. |
