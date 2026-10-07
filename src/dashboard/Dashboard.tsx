import React, { useEffect, useState } from 'react';
import { Inbox, Briefcase, FileText, ScanSearch, Landmark, ShieldCheck, Activity } from 'lucide-react';
import { api, money, useApi } from './api';
import { DealInbox } from './pages/DealInbox';
import { Underwriting } from './pages/Underwriting';
import { CreditMemo } from './pages/CreditMemo';
import { ExtractionAudit, Syndication, Covenants } from './pages/Portfolio';

const NAV = [
  { id: 'inbox', label: 'Deal Pipeline & Inbox', icon: Inbox },
  { id: 'underwriting', label: 'Underwriting Workspace', icon: Briefcase },
  { id: 'memo', label: 'Credit Memorandum', icon: FileText },
  { id: 'audit', label: 'Extraction Audit', icon: ScanSearch },
  { id: 'syndication', label: 'Syndication & Term Sheets', icon: Landmark },
  { id: 'covenants', label: 'Covenant Compliance', icon: ShieldCheck },
] as const;
type Page = (typeof NAV)[number]['id'];

const AiStatus: React.FC = () => {
  const [s, setS] = useState<{ ok: boolean; model?: string; reason?: string } | null>(null);
  useEffect(() => { api('/health').then(setS).catch(() => setS({ ok: false, reason: 'API OFFLINE' })); }, []);
  if (!s) return <span className="text-xs text-blue-200">Checking AI Engine…</span>;
  return (
    <span title={s.reason} className={`flex items-center gap-1.5 text-xs font-mono ${s.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
      <Activity className="w-3.5 h-3.5" /> {s.ok ? 'AI Engine Live' : `AI Engine Offline · ${s.reason}`}
    </span>
  );
};

export const Dashboard: React.FC = () => {
  const [page, setPage] = useState<Page>('inbox');
  const [dealId, setDealId] = useState<string | null>(null);
  const deals = useApi('/deals');
  const list: any[] = deals.data?.deals || [];
  const active = list.find((d) => d.id === dealId);

  useEffect(() => { if (!dealId && list.length) setDealId(list[0].id); }, [list, dealId]);

  const open = (id: string) => { setDealId(id); setPage('underwriting'); };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex flex-col">
      <header className="bg-[#0b1f3a] text-white h-14 flex items-center px-5 gap-6 sticky top-0 z-20">
        <div className="flex items-center gap-2 w-56">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-extrabold">e</div>
          <div><p className="font-extrabold leading-none">estate AI</p><p className="text-[10px] text-blue-200">Apex Commercial Lending</p></div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-blue-200 text-xs">Active Deal</span>
          <select id="active-deal" value={dealId || ''} onChange={(e) => setDealId(e.target.value)} className="bg-[#16325c] border border-blue-900 rounded-lg px-2 py-1 text-sm max-w-xs" disabled={!list.length}>
            {!list.length && <option>No deals loaded</option>}
            {list.map((d) => <option key={d.id} value={d.id}>{d.property} ({money(d.loanAmount)})</option>)}
          </select>
        </div>
        <div className="ml-auto"><AiStatus /></div>
      </header>

      <div className="flex flex-1">
        <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-4 sticky top-14 h-[calc(100vh-56px)]">
          {active && (
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
              <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Active Facility</p>
              <p className="font-bold text-[#0b1f3a] text-sm mt-0.5 truncate">{active.borrower}</p>
              <p className="text-xs text-slate-500">{money(active.loanAmount)} · {active.propertyType}</p>
              <p className={`text-xs font-mono mt-1 ${active.metrics.passesDscr ? 'text-emerald-600' : 'text-rose-600'}`}>DSCR {active.metrics.dscr}x · LTV {active.metrics.ltv}%</p>
            </div>
          )}
          <nav className="space-y-1">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-2 mb-1">Navigation</p>
            {NAV.map(({ id, label, icon: Icon }) => (
              <button key={id} id={`nav-${id}`} onClick={() => setPage(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${page === id ? 'bg-[#0b1f3a] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </nav>
          <div className="mt-auto rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-900">
            <p className="font-bold">AI-generated data</p>
            <p className="mt-0.5 text-blue-800">Content is produced live by AI via the backend. Ratios (DSCR, LTV, debt yield) are computed deterministically.</p>
          </div>
        </aside>

        <main className="flex-1 p-6 max-w-[1500px]">
          {page === 'inbox' && <DealInbox q={deals} onOpen={open} />}
          {page === 'underwriting' && <Underwriting dealId={dealId} />}
          {page === 'memo' && <CreditMemo dealId={dealId} />}
          {page === 'audit' && <ExtractionAudit />}
          {page === 'syndication' && <Syndication />}
          {page === 'covenants' && <Covenants />}
        </main>
      </div>
    </div>
  );
};
