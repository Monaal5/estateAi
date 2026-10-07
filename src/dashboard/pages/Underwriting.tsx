import React, { useEffect, useRef, useState } from 'react';
import { Bot, FileText, Send, Trash2, UploadCloud } from 'lucide-react';
import { api, fullMoney, money, useApi } from '../api';
import { AiMeta, Badge, Card, ErrorPanel, Loading, PageHeader, Stat, Table } from '../ui';

const DOC_TYPES = ['Auto-detect', 'Rent Roll', 'Operating Statement', 'Appraisal', 'Tax Return', 'Bank Statement', 'Loan Application', 'Purchase Agreement'];

const DocumentUpload: React.FC<{ dealId: string; onDealUpdated: () => void }> = ({ dealId, onDealUpdated }) => {
  const [docs, setDocs] = useState<any[]>([]);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = () => api(`/deals/${dealId}/documents`).then(setDocs).catch(() => {});
  useEffect(() => { setDocs([]); setNotice(null); setError(null); load(); }, [dealId]);

  const upload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!/\.(pdf|jpe?g|png|webp)$/i.test(file.name)) { setError('Please choose a PDF or an image scan (JPG, PNG, WEBP).'); return; }
    setError(null); setNotice(null); setBusy(file.name);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('doc_type', docType === 'Auto-detect' ? 'Other' : docType);
      const r = await api(`/deals/${dealId}/documents/upload`, { method: 'POST', body: fd });
      setOpen(r.document.id);
      const keys = Object.keys(r.updatedFields || {});
      if (keys.length) {
        setNotice(`Deal updated from document: ${keys.join(', ')}. Metrics re-underwritten.`);
        onDealUpdated();
      } else setNotice('Document processed. No deal financials changed.');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (id: number) => {
    await api(`/deals/${dealId}/documents/${id}`, { method: 'DELETE' }).catch(() => {});
    load();
  };

  return (
    <Card title={<span className="flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" /> Loan Documents (PDF / Scans)</span>}>
      <div className="flex gap-2 mb-3">
        <select id="doc-type" value={docType} onChange={(e) => setDocType(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2 py-1.5">
          {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div
        id="pdf-dropzone"
        onClick={() => !busy && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${drag ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
      >
        <UploadCloud className={`w-8 h-8 mx-auto ${busy ? 'text-blue-600 animate-bounce' : 'text-slate-400'}`} />
        <p className="text-sm font-semibold text-[#0b1f3a] mt-2">{busy ? `AI is reading ${busy}… (scanned files are OCR'd, this can take a minute)` : 'Drop a PDF or scan here, or click to upload'}</p>
        <p className="text-xs text-slate-500">Text PDFs, scanned PDFs, JPG/PNG photos · AI OCR for scans · max 20 MB</p>
        <input ref={inputRef} id="pdf-input" type="file" accept="application/pdf,.pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => upload(e.target.files)} />
      </div>
      {error && <p className="mt-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">{error}</p>}
      {notice && <p className="mt-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2">{notice}</p>}

      <div className="mt-4 space-y-2">
        {docs.map((d) => (
          <div key={d.id} className="border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2 px-3 py-2">
              <button onClick={() => setOpen(open === d.id ? null : d.id)} className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-[#0b1f3a] truncate">{d.filename} {d.extracted?.ocr && <Badge tone="violet">AI OCR</Badge>}</p>
                <p className="text-xs text-slate-500">{d.docType} · {d.pageCount} pp · {(d.sizeBytes / 1024).toFixed(0)} KB</p>
              </button>
              <button onClick={() => remove(d.id)} title="Delete" className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
            </div>
            {open === d.id && (
              <div className="border-t border-slate-100 px-3 py-2 space-y-2 text-xs">
                <p className="text-slate-600">{d.extracted?.summary}</p>
                {d.extracted?.fields?.slice(0, 12).map((f: any, i: number) => (
                  <div key={i} className="flex justify-between gap-2"><span className="text-slate-500">{f.field}{f.page ? ` (p.${f.page})` : ''}</span><span className="font-mono text-right">{f.value}</span></div>
                ))}
                {d.extracted?.discrepancies?.map((x: any, i: number) => (
                  <p key={i} className="text-rose-700"><b>{x.field}:</b> doc {x.documentValue} vs deal {x.dealValue}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

const Copilot: React.FC<{ dealId: string }> = ({ dealId }) => {
  const [msgs, setMsgs] = useState<{ role: 'user' | 'ai'; text: string; cites?: string[] }[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMsgs([]);
    api(`/deals/${dealId}/chat`).then(setMsgs).catch(() => {});
  }, [dealId]);

  const ask = async (question: string) => {
    if (!question.trim()) return;
    setMsgs((m) => [...m, { role: 'user', text: question }]);
    setInput('');
    setBusy(true);
    try {
      const r = await api(`/deals/${dealId}/chat`, { method: 'POST', body: JSON.stringify({ question }) });
      setMsgs((m) => [...m, { role: 'ai', text: r.answer, cites: r.citations }]);
    } catch (e: any) {
      setMsgs((m) => [...m, { role: 'ai', text: `⚠ ${e.message}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={<span className="flex items-center gap-2"><Bot className="w-4 h-4 text-blue-600" /> Underwriting Copilot</span>} className="flex flex-col">
      <div className="space-y-3 max-h-[420px] overflow-y-auto">
        {!msgs.length && (
          <div className="space-y-2">
            {['Why is this file flagged?', 'Summarize the open conditions', 'What is the biggest credit risk?'].map((s) => (
              <button key={s} onClick={() => ask(s)} className="block w-full text-left text-xs px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50">{s}</button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`text-sm rounded-xl px-3 py-2 ${m.role === 'user' ? 'bg-[#0b1f3a] text-white ml-8' : 'bg-slate-50 border border-slate-200 mr-4'}`}>
            {m.text}
            {m.cites?.length ? <div className="mt-1.5 flex flex-wrap gap-1">{m.cites.map((c) => <Badge key={c} tone="blue">{c}</Badge>)}</div> : null}
          </div>
        ))}
        {busy && <p className="text-xs text-blue-600 animate-pulse">AI is reasoning over the deal file…</p>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex gap-2 mt-3">
        <input id="copilot-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about this deal…" className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" />
        <button id="copilot-send" disabled={busy || !input.trim()} className="px-3 rounded-lg bg-blue-600 text-white disabled:opacity-50"><Send className="w-4 h-4" /></button>
      </form>
    </Card>
  );
};

export const Underwriting: React.FC<{ dealId: string | null }> = ({ dealId }) => {
  const q = useApi(dealId ? `/deals/${dealId}/underwriting` : null);
  if (!dealId) return <p className="text-slate-500">Select a deal from the Deal Inbox.</p>;
  const d = q.data;
  const deal = d?.deal;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Underwriting Workspace"
        title={deal ? <>{deal.borrower} <span className="text-slate-400 text-xl">· {deal.purpose}</span></> : 'Loading deal…'}
        desc={deal ? `${deal.property} · ${deal.propertyType} · ${deal.city} · Sponsor ${deal.sponsor}` : undefined}
        right={<AiMeta model={d?.model} at={d?.generatedAt} onRefresh={q.refresh} loading={q.loading} />}
      />
      {q.error && <ErrorPanel error={q.error} onRetry={q.refresh} />}
      {q.loading && !d && <Loading label="AI is extracting and reviewing documents…" />}
      {d && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Stat label="DSCR" value={`${deal.metrics.dscr}x`} accent={deal.metrics.passesDscr ? 'text-emerald-600' : 'text-rose-600'} sub={`Min ${d.policy.minDscr}x`} />
            <Stat label="LTV" value={`${deal.metrics.ltv}%`} accent={deal.metrics.passesLtv ? 'text-[#0b1f3a]' : 'text-rose-600'} sub={`Max ${d.policy.maxLtv}%`} />
            <Stat label="Debt Yield" value={`${deal.metrics.debtYield}%`} />
            <Stat label="Grade" value={deal.metrics.grade} accent="text-blue-700" />
            <Stat label="Requested" value={money(deal.loanAmount)} sub={`${(deal.rate * 100).toFixed(2)}% · ${deal.termMonths / 12} yrs`} />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card title="Extraction Verification & Attribution">
                <p className="text-sm text-slate-600 mb-4">{d.analystNote}</p>
                <Table head={['Field', 'Extracted Value', 'Source', 'Confidence', 'Status']}>
                  {d.extractions?.map((x: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2.5 pr-4 font-semibold text-[#0b1f3a]">{x.field}</td>
                      <td className="pr-4 font-mono">{x.value}</td>
                      <td className="pr-4 text-xs text-slate-500">{x.source}</td>
                      <td className="pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded"><div className={`h-1.5 rounded ${x.confidence > 85 ? 'bg-emerald-500' : x.confidence > 65 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${x.confidence}%` }} /></div>
                          <span className="text-xs font-mono">{x.confidence}%</span>
                        </div>
                      </td>
                      <td><Badge>{x.status}</Badge></td>
                    </tr>
                  ))}
                </Table>
              </Card>

              {!!d.conflicts?.length && (
                <Card title={<span className="text-rose-700">Conflicting Source Values</span>}>
                  <div className="space-y-3">
                    {d.conflicts.map((c: any, i: number) => (
                      <div key={i} className="border border-rose-200 bg-rose-50/40 rounded-xl p-4">
                        <div className="flex justify-between"><p className="font-bold text-[#0b1f3a]">{c.field}</p><Badge>{c.severity}</Badge></div>
                        <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                          <div className="bg-white rounded-lg p-2 border border-slate-200"><p className="font-mono font-bold">{c.valueA}</p><p className="text-xs text-slate-500">{c.sourceA}</p></div>
                          <div className="bg-white rounded-lg p-2 border border-slate-200"><p className="font-mono font-bold">{c.valueB}</p><p className="text-xs text-slate-500">{c.sourceB}</p></div>
                        </div>
                        <p className="text-xs text-slate-600 mt-2"><b>AI recommendation:</b> {c.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <Card title="Credit Policy & Conditions Tracker">
                <Table head={['Condition', 'Category', 'Owner', 'Status']}>
                  {d.conditions?.map((c: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2.5 pr-4"><p className="font-semibold text-[#0b1f3a]">{c.title}</p><p className="text-xs text-slate-500">{c.note}</p></td>
                      <td className="pr-4 text-xs">{c.category}</td>
                      <td className="pr-4 text-xs">{c.owner}</td>
                      <td><Badge>{c.status}</Badge></td>
                    </tr>
                  ))}
                </Table>
              </Card>
            </div>

            <div className="space-y-6">
              <DocumentUpload dealId={dealId} onDealUpdated={q.reload} />
              <Copilot dealId={dealId} />
              <Card title="Risk Flags">
                <ul className="space-y-2">{d.riskFlags?.map((r: string, i: number) => <li key={i} className="text-sm flex gap-2"><span className="text-orange-500">▲</span>{r}</li>)}</ul>
              </Card>
              <Card title="Debt Service (deterministic)">
                <dl className="text-sm space-y-1.5">
                  <div className="flex justify-between"><dt className="text-slate-500">NOI</dt><dd className="font-mono">{fullMoney(deal.noi)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Proposed debt service</dt><dd className="font-mono">{fullMoney(deal.metrics.proposedAnnualDebtService)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Existing debt service</dt><dd className="font-mono">{fullMoney(deal.existingAnnualDebt)}</dd></div>
                  <div className="flex justify-between font-bold border-t pt-1.5"><dt>Total</dt><dd className="font-mono">{fullMoney(deal.metrics.totalAnnualDebtService)}</dd></div>
                </dl>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
