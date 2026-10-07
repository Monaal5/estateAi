import asyncio
import base64
import json
import re
import time

import httpx

from .config import GEMINI_API_KEY, GEMINI_MODELS
from .db import AiCallLog, SessionLocal


class GeminiError(Exception):
    def __init__(self, message: str, status: int = 502, reason: str | None = None):
        super().__init__(message)
        self.status, self.reason = status, reason


# Free-tier keys allow only a few requests per minute: never call Gemini concurrently.
_lock = asyncio.Lock()
_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def _mask(s: str) -> str:
    k = GEMINI_API_KEY
    return s.replace(k, f"{k[:4]}…{k[-4:]}") if k else s


def _retry_delay(body: dict) -> float:
    for d in body.get("error", {}).get("details", []):
        if "retryDelay" in d:
            m = re.match(r"([\d.]+)", d["retryDelay"])
            if m:
                return min(max(float(m.group(1)), 2), 40)
    return 10


def _log(purpose, model, ok, started, error=None):
    try:
        with SessionLocal() as s:
            s.add(AiCallLog(purpose=purpose, model=model, ok=ok, latency_ms=int((time.time() - started) * 1000), error=error))
            s.commit()
    except Exception as e:  # noqa: BLE001
        print(f"[gemini log error] {purpose}: {e}")


async def generate_json(prompt: str, purpose: str, temperature: float = 0.9,
                        attachments: list[tuple[str, bytes]] | None = None) -> tuple[dict, str]:
    """Returns (parsed_json, model). `attachments` = [(mime_type, bytes)] sent inline (e.g. scanned PDFs for OCR).
    Raises GeminiError — there is NO fallback data."""
    parts_in = [{"inline_data": {"mime_type": m, "data": base64.b64encode(b).decode()}} for m, b in (attachments or [])]
    parts_in.append({"text": prompt})
    if not GEMINI_API_KEY:
        raise GeminiError("GEMINI_API_KEY is not set in backend/.env", 500, "NO_KEY")
    async with _lock:
        started = time.time()
        failures: list[str] = []
        last: GeminiError | None = None
        async with httpx.AsyncClient(timeout=120) as client:
            for model in GEMINI_MODELS:
                for _attempt in range(2):
                    try:
                        r = await client.post(
                            _URL.format(model=model),
                            headers={"x-goog-api-key": GEMINI_API_KEY},
                            json={
                                "contents": [{"role": "user", "parts": parts_in}],
                                "generationConfig": {"responseMimeType": "application/json", "temperature": temperature},
                            },
                        )
                        body = r.json() if r.content else {}
                    except httpx.HTTPError as e:
                        last = GeminiError(f"{model}: network error ({e})", 502, "NETWORK")
                        failures.append(str(last))
                        await asyncio.sleep(1)
                        continue
                    if r.status_code != 200:
                        err = body.get("error", {})
                        reason = next((d["reason"] for d in err.get("details", []) if "reason" in d), err.get("status"))
                        last = GeminiError(_mask(err.get("message", f"HTTP {r.status_code}")), r.status_code, reason)
                        failures.append(f"{model}: {r.status_code} {reason}")
                        if r.status_code in (401, 403):
                            _log(purpose, model, False, started, str(last))
                            raise last
                        if r.status_code == 429:
                            await asyncio.sleep(_retry_delay(body))
                            continue
                        if r.status_code >= 500:
                            await asyncio.sleep(2)
                            continue
                        break  # 400/404 → try next model
                    parts = (body.get("candidates") or [{}])[0].get("content", {}).get("parts", [])
                    text = "".join(p.get("text", "") for p in parts)
                    try:
                        data = json.loads(text)
                        _log(purpose, model, True, started)
                        return data, model
                    except json.JSONDecodeError:
                        last = GeminiError(f"{model}: response was not valid JSON", 502, "BAD_JSON")
                        failures.append(str(last))
        msg = f"{last} (attempts: {' | '.join(failures)})"
        _log(purpose, None, False, started, msg)
        raise GeminiError(msg, last.status if last else 502, last.reason if last else None)
