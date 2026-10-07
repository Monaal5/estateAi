import './env.js';
import express from 'express';
import cors from 'cors';
import { generateJSON, GeminiError } from './gemini.js';
import { underwrite } from './finance.js';

const app = express();
app.use(cors());
app.use(express.json());

// In-memory cache of AI-generated data (resets on server restart or ?refresh=1)
const cache = { deals: null, perDeal: {}, audit: null, syndication: null, covenants: null };
const POLICY = { lender: 'Apex Commercial Lending', minDscr: 1.25, maxLtv: 75 };

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const fresh = (req) => req.query.refresh === '1';
const findDeal = (id) => cache.deals?.deals.find((d) => d.id === id);

async function ensureDeals(force = false) {
  if (cache.deals && !force) return cache.deals;
  const { data, model } = await generateJSON(`You generate realistic, varied commercial real estate loan pipeline data for a lender dashboard.
Return JSON: {"deals":[...]} with exactly 10 deals. Each deal:
{"id":"DL-####","borrower":"entity name LLC","sponsor":"person name","property":"property name","propertyType":"Multifamily|Retail|Office|Industrial|Hospitality|Mixed-Use","city":"US city, ST","purpose":"Acquisition|Refinance|Construction|Bridge",
"loanAmount":number,"rate":decimal like 0.0685,"termMonths":number,"propertyValue":number,"noi":number,"existingAnnualDebt":number,
"stage":"Intake|Extraction Review|Underwriting Analysis|Credit Memo|Term Sheet Issued|Lender Submission",
"complianceState":"Verified|Exception Flagged|KYC Pending|Docs Outstanding",
"assignee":"analyst name","daysInStage":number,"priority":"High|Medium|Low","blockers":number,"lastActivity":"short sentence"}
Vary the numbers so some deals are strong (DSCR > 1.5), some marginal (~1.2), and some weak (< 1.1). Loan amounts between 2,000,000 and 60,000,000.`);
  const deals = data.deals.map((d) => ({ ...d, metrics: underwrite(d, POLICY) }));
  cache.deals = { deals, model, generatedAt: new Date().toISOString() };
  cache.perDeal = {};
  return cache.deals;
}

function dealCache(id) { return (cache.perDeal[id] ||= {}); }

app.get('/api/health', wrap(async (_req, res) => {
  try {
    const { model } = await generateJSON('Return {"ok":true}', { temperature: 0 });
    res.json({ ok: true, model });
  } catch (e) {
    res.json({ ok: false, error: e.message, reason: e.reason });
  }
}));

// ---- Deal Inbox / Pipeline ----
app.get('/api/deals', wrap(async (req, res) => {
  const d = await ensureDeals(fresh(req));
  const deals = d.deals;
  res.json({
    ...d,
    summary: {
      activeFacilities: deals.length,
      totalVolume: deals.reduce((s, x) => s + x.loanAmount, 0),
      requiringAction: deals.filter((x) => x.priority === 'High' || x.blockers > 0).length,
      underAnalysis: deals.filter((x) => ['Extraction Review', 'Underwriting Analysis'].includes(x.stage)).length,
      impasses: deals.filter((x) => x.complianceState !== 'Verified').length,
      avgDscr: Math.round((deals.reduce((s, x) => s + x.metrics.dscr, 0) / deals.length) * 100) / 100,
    },
  });
}));

// ---- Underwriting Workspace ----
app.get('/api/deals/:id/underwriting', wrap(async (req, res) => {
  await ensureDeals();
  const deal = findDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: 'Deal not found' });
  const c = dealCache(deal.id);
  if (!c.underwriting || fresh(req)) {
    const { data, model } = await generateJSON(`You are a CRE loan underwriting extraction engine. For this deal, simulate what document extraction found.
DEAL: ${JSON.stringify(deal)}
Return JSON:
{"extractions":[{"field":"e.g. Net Operating Income","value":"formatted value","source":"document name, page N","confidence":0-100,"status":"Confirmed|Needs Review|Conflict"}] (8 items, consistent with the deal numbers),
"conflicts":[{"field":"...","valueA":"...","sourceA":"...","valueB":"...","sourceB":"...","severity":"High|Medium","recommendation":"..."}] (1-3 items),
"conditions":[{"title":"...","category":"Documentation|Insurance|Legal|Appraisal|Financial","status":"Open|Requested|Received|Waived","owner":"Borrower|Broker|Processor","note":"..."}] (4-6 items),
"riskFlags":["short risk statements"] (3-4),
"analystNote":"2-3 sentence summary of where underwriting stands"}`);
    c.underwriting = { ...data, model, generatedAt: new Date().toISOString() };
  }
  res.json({ deal, policy: POLICY, ...c.underwriting });
}));

// ---- Credit Memorandum ----
app.get('/api/deals/:id/memo', wrap(async (req, res) => {
  await ensureDeals();
  const deal = findDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: 'Deal not found' });
  const c = dealCache(deal.id);
  if (!c.memo || fresh(req)) {
    const { data, model } = await generateJSON(`You are a senior CRE credit officer writing a credit memorandum.
DEAL: ${JSON.stringify(deal)}
COMPUTED METRICS (authoritative, do not change): ${JSON.stringify(deal.metrics)}
LENDER POLICY: ${JSON.stringify(POLICY)}
Return JSON:
{"recommendation":"Approve|Approve with Conditions|Decline|Defer","recommendationRationale":"...",
"executiveSummary":"paragraph","sponsorAnalysis":"paragraph","marketAnalysis":"paragraph","collateralAnalysis":"paragraph",
"strengths":["..."],"weaknesses":["..."],"mitigants":["..."],
"stressTests":[{"scenario":"e.g. NOI -10%","dscr":number,"pass":boolean}] (4 scenarios, compute DSCR from the metrics),
"lenderMatches":[{"lender":"name","program":"...","fit":0-100,"reason":"..."}] (3),
"packageCompleteness":0-100}`, { temperature: 0.6 });
    c.memo = { ...data, model, generatedAt: new Date().toISOString() };
  }
  res.json({ deal, policy: POLICY, ...c.memo });
}));

// ---- Copilot chat ----
app.post('/api/deals/:id/chat', wrap(async (req, res) => {
  await ensureDeals();
  const deal = findDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: 'Deal not found' });
  const c = dealCache(deal.id);
  const { data, model } = await generateJSON(`You are a read-only CRE underwriting copilot. Answer ONLY from the context. If unknown, say so.
DEAL: ${JSON.stringify(deal)}
UNDERWRITING: ${JSON.stringify(c.underwriting || 'not generated yet')}
MEMO: ${JSON.stringify(c.memo ? { recommendation: c.memo.recommendation, weaknesses: c.memo.weaknesses } : 'not generated yet')}
HISTORY: ${JSON.stringify((req.body.history || []).slice(-6))}
QUESTION: ${req.body.question}
Return JSON: {"answer":"concise answer","citations":["field or document names used"]}`, { temperature: 0.3 });
  res.json({ ...data, model });
}));

// ---- Portfolio-level features ----
function portfolioRoute(path, key, promptFn) {
  app.get(path, wrap(async (req, res) => {
    const d = await ensureDeals();
    if (!cache[key] || fresh(req)) {
      const { data, model } = await generateJSON(promptFn(d.deals));
      cache[key] = { ...data, model, generatedAt: new Date().toISOString() };
    }
    res.json(cache[key]);
  }));
}
const brief = (deals) => JSON.stringify(deals.map(({ id, borrower, property, propertyType, loanAmount, stage, metrics }) => ({ id, borrower, property, propertyType, loanAmount, stage, dscr: metrics.dscr, ltv: metrics.ltv })));

portfolioRoute('/api/extraction-audit', 'audit', (deals) => `You audit an AI document extraction pipeline for these CRE deals: ${brief(deals)}
Return JSON: {"stats":{"documentsProcessed":n,"fieldsExtracted":n,"autoAcceptRate":0-100,"humanOverrides":n,"avgConfidence":0-100},
"events":[{"time":"HH:MM","dealId":"...","document":"...","field":"...","extracted":"...","finalValue":"...","action":"Auto-accepted|Human override|Rejected|Escalated","actor":"system or analyst name","confidence":0-100}] (14 events across the deals),
"insights":["3 observations about extraction quality"]}`);

portfolioRoute('/api/syndication', 'syndication', (deals) => `You are a CRE loan syndication desk. Deals: ${brief(deals)}
Return JSON: {"termSheets":[{"dealId":"...","lender":"lender name","amount":n,"rate":"e.g. SOFR + 285","term":"e.g. 5 yr / 30 yr amort","status":"Drafting|Issued|Negotiating|Accepted|Declined","keyTerms":["..."]}] (6 items),
"participations":[{"dealId":"...","leadLender":"...","participants":[{"name":"...","share":percent}]}] (3 items, shares sum to 100),
"marketCommentary":"paragraph on current CRE lending market"}`);

portfolioRoute('/api/covenants', 'covenants', (deals) => `You monitor loan covenants for these CRE deals: ${brief(deals)}
Return JSON: {"covenants":[{"dealId":"...","covenant":"e.g. Minimum DSCR","threshold":"...","actual":"...","status":"Compliant|Watch|Breach","nextTest":"YYYY-MM-DD","note":"..."}] (12 items; base actuals on each deal's dscr/ltv),
"alerts":[{"dealId":"...","severity":"High|Medium|Low","message":"..."}] (3-5),
"summary":"1-2 sentence portfolio covenant health summary"}`);

// ---- Error handler: surface real Gemini errors, never fake data ----
app.use((err, _req, res, _next) => {
  const status = err instanceof GeminiError ? (err.status >= 400 ? err.status : 502) : 500;
  console.error('[api error]', err.message);
  res.status(status).json({ error: err.message, reason: err.reason || 'SERVER_ERROR' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`estate AI API listening on http://localhost:${PORT}`));
