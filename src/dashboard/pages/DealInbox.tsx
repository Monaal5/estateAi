import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { money, ApiError } from '../api';
import { AiMeta, Badge, Card, ErrorPanel, Loading, PageHeader, Stat, Table } from '../ui';

interface Props {
  q: { data: any; error: ApiError | null; loading: boolean; refresh: () => void };
  onOpen: (id: string) => void;
}

export const DealInbox: React.FC<Props> = ({ q, onOpen }) => {
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('All');
  const deals: any[] = q.data?.deals || [];
  const stages = useMemo(() => ['All', ...Array.from(new Set(deals.map((d) => d.stage)))], [deals]);
  const rows = deals.filter(
    (d) =>
      (stage === 'All' || d.stage === stage) &&
      `${d.borrower} ${d.property} ${d.id} ${d.city}`.toLowerCase().includes(search.toLowerCase())
  );
  const s = q.data?.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Commercial Credit Operations"
        title={<>Deal Inbox {s && <span className="text-base font-semibold text-slate-500">{s.activeFacilities} facilities active</span>}</>}
        desc="AI-generated pipeline of inbound loan applications, document extraction status and covenant exceptions."
        right={<AiMeta model={q.data?.model} at={q.data?.generatedAt} onRefresh={q.refresh} loading={q.loading} />}
      />
      {q.error && <ErrorPanel error={q.error} onRetry={q.refresh} />}
      {q.loading && !q.data && <Loading label="AI is generating the loan pipeline…" />}
      {s && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Active Pipeline" value={`${s.activeFacilities} Facilities`} sub={`Total volume ${money(s.totalVolume)}`} />
            <Stat label="Requiring Action" value={`${s.requiringAction} Urgent`} accent="text-orange-600" sub="High priority or blocked" />
            <Stat label="Under Analysis" value={`${s.underAnalysis} Deals`} accent="text-blue-700" sub={`Avg DSCR ${s.avgDscr}x`} />
            <Stat label="Compliance Impasses" value={`${s.impasses}`} accent="text-rose-600" sub="Not yet verified" />
          </div>
          <Card
            title="Borrower Facilities"
            action={
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2.5 top-2 text-slate-400" />
                  <input id="deal-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search entities, properties…" className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg w-56 focus:outline-none focus:border-blue-500" />
                </div>
                <select id="stage-filter" value={stage} onChange={(e) => setStage(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2">
                  {stages.map((x) => <option key={x}>{x}</option>)}
                </select>
              </div>
            }
          >
            <Table head={['Borrower / Facility', 'Stage', 'Compliance', 'DSCR', 'LTV', 'Requested', '']}>
              {rows.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => onOpen(d.id)}>
                  <td className="py-3 pr-4">
                    <div className="flex items-start gap-2">
                      <span className={`mt-1.5 w-2 h-2 rounded-full ${d.priority === 'High' ? 'bg-orange-500' : d.priority === 'Medium' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                      <div>
                        <p className="font-bold text-[#0b1f3a]">{d.borrower} <span className="text-slate-400 font-normal">· {d.id}</span></p>
                        <p className="text-xs text-slate-500">{d.property} · {d.propertyType} · {d.city}</p>
                        <p className="text-xs text-slate-400 italic">{d.lastActivity}</p>
                      </div>
                    </div>
                  </td>
                  <td className="pr-4"><Badge tone="blue">{d.stage}</Badge><p className="text-[11px] text-slate-400 mt-1">{d.daysInStage}d · {d.assignee}</p></td>
                  <td className="pr-4"><Badge>{d.complianceState}</Badge></td>
                  <td className="pr-4 font-mono font-bold"><span className={d.metrics.passesDscr ? 'text-emerald-600' : 'text-rose-600'}>{d.metrics.dscr}x</span></td>
                  <td className="pr-4 font-mono">{d.metrics.ltv}%</td>
                  <td className="pr-4 font-bold text-[#0b1f3a]">{money(d.loanAmount)}</td>
                  <td className="text-blue-700 text-xs font-semibold">Open →</td>
                </tr>
              ))}
            </Table>
            {!rows.length && <p className="text-sm text-slate-500 py-6 text-center">No deals match your filters.</p>}
          </Card>
        </>
      )}
    </div>
  );
};
