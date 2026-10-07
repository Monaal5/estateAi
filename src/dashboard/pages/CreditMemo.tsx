import React from 'react';
import { money, useApi } from '../api';
import { AiMeta, Badge, Card, ErrorPanel, Loading, PageHeader, Stat } from '../ui';

const List: React.FC<{ items?: string[]; color: string }> = ({ items, color }) => (
  <ul className="space-y-1.5">{items?.map((s, i) => <li key={i} className="text-sm flex gap-2"><span className={color}>•</span>{s}</li>)}</ul>
);

export const CreditMemo: React.FC<{ dealId: string | null }> = ({ dealId }) => {
  const q = useApi(dealId ? `/deals/${dealId}/memo` : null);
  if (!dealId) return <p className="text-slate-500">Select a deal from the Deal Inbox.</p>;
  const m = q.data;
  const deal = m?.deal;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Credit Memorandum"
        title={deal ? `${deal.property}` : 'Loading memo…'}
        desc={deal ? `${deal.borrower} · ${deal.propertyType} · ${deal.city}` : undefined}
        right={<div className="flex items-center gap-4">{deal && <span className="text-3xl font-extrabold text-[#0b1f3a]">{money(deal.loanAmount)}</span>}<AiMeta model={m?.model} at={m?.generatedAt} onRefresh={q.refresh} loading={q.loading} /></div>}
      />
      {q.error && <ErrorPanel error={q.error} onRetry={q.refresh} />}
      {q.loading && !m && <Loading label="AI is drafting the credit memorandum…" />}
      {m && (
        <>
          <div className="bg-[#0b1f3a] text-white rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] tracking-widest uppercase text-blue-200 font-bold">AI Credit Officer Recommendation</p>
              <p className="text-2xl font-extrabold mt-1">{m.recommendation}</p>
              <p className="text-sm text-blue-100 mt-1 max-w-3xl">{m.recommendationRationale}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase text-blue-200 font-bold">Package completeness</p>
              <p className="text-3xl font-extrabold">{m.packageCompleteness}%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="DSCR" value={`${deal.metrics.dscr}x`} accent={deal.metrics.passesDscr ? 'text-emerald-600' : 'text-rose-600'} />
            <Stat label="LTV" value={`${deal.metrics.ltv}%`} />
            <Stat label="Debt Yield" value={`${deal.metrics.debtYield}%`} />
            <Stat label="Lending Grade" value={deal.metrics.grade} accent="text-blue-700" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card title="Executive Summary"><p className="text-sm text-slate-700 leading-relaxed">{m.executiveSummary}</p></Card>
            <Card title="Sponsor Analysis"><p className="text-sm text-slate-700 leading-relaxed">{m.sponsorAnalysis}</p></Card>
            <Card title="Market Analysis"><p className="text-sm text-slate-700 leading-relaxed">{m.marketAnalysis}</p></Card>
            <Card title="Collateral Analysis"><p className="text-sm text-slate-700 leading-relaxed">{m.collateralAnalysis}</p></Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <Card title={<span className="text-emerald-700">Strengths</span>}><List items={m.strengths} color="text-emerald-500" /></Card>
            <Card title={<span className="text-orange-700">Weaknesses</span>}><List items={m.weaknesses} color="text-orange-500" /></Card>
            <Card title={<span className="text-blue-700">Mitigants</span>}><List items={m.mitigants} color="text-blue-500" /></Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card title="Stress Tests">
              <div className="space-y-2">
                {m.stressTests?.map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2">
                    <span className="text-sm">{s.scenario}</span>
                    <span className="flex items-center gap-2 font-mono font-bold">{Number(s.dscr).toFixed(2)}x <Badge tone={s.pass ? 'green' : 'red'}>{s.pass ? 'Pass' : 'Fail'}</Badge></span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Lender Placement Matches">
              <div className="space-y-3">
                {m.lenderMatches?.map((l: any, i: number) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-3">
                    <div className="flex justify-between"><p className="font-bold text-[#0b1f3a]">{l.lender}</p><span className="font-mono text-sm font-bold text-blue-700">{l.fit}% fit</span></div>
                    <p className="text-xs text-slate-500">{l.program}</p>
                    <div className="h-1.5 bg-slate-100 rounded mt-2"><div className="h-1.5 bg-blue-600 rounded" style={{ width: `${l.fit}%` }} /></div>
                    <p className="text-xs text-slate-600 mt-2">{l.reason}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
