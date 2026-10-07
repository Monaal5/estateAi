import './env.js';

const MODELS = (process.env.GEMINI_MODELS || 'gemini-2.5-flash,gemini-3.5-flash-lite').split(',');

// Serial queue: free-tier keys allow only a few requests/minute, so never call Gemini concurrently.
let queue = Promise.resolve();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function retryDelayMs(body) {
  const d = body?.error?.details?.find((x) => x.retryDelay)?.retryDelay; // e.g. "17s"
  const s = d ? parseFloat(d) : 10;
  return Math.min(Math.max(s, 2), 40) * 1000;
}

export class GeminiError extends Error {
  constructor(message, status, reason) {
    super(message);
    this.status = status;
    this.reason = reason;
  }
}

/**
 * Calls Gemini and returns parsed JSON. Throws GeminiError on any failure.
 * There is intentionally NO fallback data: failures surface to the UI.
 */
export function generateJSON(prompt, opts) {
  const run = queue.then(() => callGemini(prompt, opts));
  queue = run.catch(() => {});
  return run;
}

async function callGemini(prompt, { temperature = 0.9 } = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError('GEMINI_API_KEY is not set in server/.env', 500, 'NO_KEY');
  const mask = (s) => String(s).split(key).join(`${key.slice(0, 4)}…${key.slice(-4)}`);

  const failures = [];
  let last;
  for (const raw of MODELS) {
    const model = raw.trim();
    for (let attempt = 0; attempt < 2; attempt++) {
      let res, body;
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature },
          }),
        });
        body = await res.json().catch(() => ({}));
      } catch (e) {
        last = new GeminiError(`${model}: network error (${e.message})`, 502, 'NETWORK');
        failures.push(last.message);
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      if (!res.ok) {
        const reason = body?.error?.details?.find((d) => d.reason)?.reason || body?.error?.status;
        last = new GeminiError(mask(body?.error?.message || `HTTP ${res.status}`), res.status, reason);
        failures.push(`${model}: ${res.status} ${reason || ''}`);
        if (res.status === 401 || res.status === 403) throw last; // key problem — other models won't help
        if (res.status === 429) { await sleep(retryDelayMs(body)); continue; }
        if (res.status >= 500) { await sleep(2000); continue; }
        break; // 400/404: try next model
      }
      const text = body?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('');
      if (!text) {
        last = new GeminiError(`${model}: empty response (finishReason ${body?.candidates?.[0]?.finishReason})`, 502, 'EMPTY');
        failures.push(last.message);
        continue;
      }
      try {
        return { data: JSON.parse(text), model };
      } catch {
        last = new GeminiError(`${model}: response was not valid JSON`, 502, 'BAD_JSON');
        failures.push(last.message);
      }
    }
  }
  console.error('[gemini] all attempts failed:', failures);
  last.message = `${last.message} (attempts: ${failures.join(' | ')})`;
  throw last;
}
