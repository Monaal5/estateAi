import React from 'react';
import { money, useApi } from '../api';
import { AiMeta, Badge, Card, ErrorPanel, Loading, PageHeader, Stat, Table } from '../ui';

function usePage(path: string) {
  const q = useApi(path);
  const status = (
    <>
      {q.error && <ErrorPanel error={q.error} onRetry={q.refresh} />}
      {q.loading && !q.data && <Loading />}
    </>
  );
  const meta = <AiMeta model={q.data?.model} at={q.data?.generatedAt} onRefresh={q.refresh} loading={q.loading} />;
  return { d: q.data, status, meta };
}

export const ExtractionAudit: React.FC = () => {
  const { d, status, meta } = usePage('/extraction-audit');
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Model Governance" title="Extraction Audit" desc="Every AI field extraction, with confidence, human overrides and the final accepted value." right={meta} />
      {status}
      {d && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Stat label="Documents" value={d.stats.documentsProcessed} />
            <Stat label="Fields Extracted" value={d.stats.fieldsExtracted} />
            <Stat label="Auto-Accept" value={`${d.stats.autoAcceptRate}%`} accent="text-emerald-600" />
            <Stat label="Human Overrides" value={d.stats.humanOverrides} accent="text-orange-600" />
            <Stat label="Avg Confidence" value={`${d.stats.avgConfidence}%`} accent="text-blue-700" />
          </div>
          <Card title="AI Insights"><ul className="space-y-1.5">{d.insights?.map((s: string, i: number) => <li key={i} className="text-sm">• {s}</li>)}</ul></Card>
          <Card title="Audit Trail">
            <Table head={['Time', 'Deal', 'Document / Field', 'Extracted → Final', 'Confidence', 'Action', 'Actor']}>
              {d.events?.map((e: any, i: number) => (
                <tr key={i}>
                  <td className="py-2.5 pr-4 font-mono text-xs">{e.time}</td>
                  <td className="pr-4 text-xs font-semibold">{e.dealId}</td>
                  <td className="pr-4"><p className="text-sm font-semibold">{e.field}</p><p className="text-xs text-slate-500">{e.document}</p></td>
                  <td className="pr-4 font-mono text-xs">{e.extracted}{e.finalValue !== e.extracted && <> → <b>{e.finalValue}</b></>}</td>
                  <td className="pr-4 font-mono text-xs">{e.confidence}%</td>
                  <td className="pr-4"><Badge>{e.action}</Badge></td>
                  <td className="text-xs">{e.actor}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}
    </div>
  );
};

export const Syndication: React.FC = () => {
  const { d, status, meta } = usePage('/syndication');
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Capital Markets" title="Syndication & Term Sheets" desc="AI-generated term sheets, lender participations and market commentary." right={meta} />
      {status}
      {d && (
        <>
          <Card title="Market Commentary"><p className="text-sm text-slate-700 leading-relaxed">{d.marketCommentary}</p></Card>
          <Card title="Term Sheets">
            <Table head={['Deal', 'Lender', 'Amount', 'Pricing', 'Structure', 'Key Terms', 'Status']}>
              {d.termSheets?.map((t: any, i: number) => (
                <tr key={i}>
                  <td className="py-2.5 pr-4 text-xs font-semibold">{t.dealId}</td>
                  <td className="pr-4 font-semibold text-[#0b1f3a]">{t.lender}</td>
                  <td className="pr-4 font-bold">{money(t.amount)}</td>
                  <td className="pr-4 font-mono text-xs">{t.rate}</td>
                  <td className="pr-4 text-xs">{t.term}</td>
                  <td className="pr-4 text-xs text-slate-600">{t.keyTerms?.join(' · ')}</td>
                  <td><Badge>{t.status}</Badge></td>
                </tr>
              ))}
            </Table>
          </Card>
          <div className="grid lg:grid-cols-3 gap-6">
            {d.participations?.map((p: any, i: number) => (
              <Card key={i} title={`${p.dealId} · Lead: ${p.leadLender}`}>
                <div className="space-y-2">
                  {p.participants?.map((x: any, j: number) => (
                    <div key={j}>
                      <div className="flex justify-between text-sm"><span>{x.name}</span><span className="font-mono font-bold">{x.share}%</span></div>
                      <div className="h-1.5 bg-slate-100 rounded"><div className="h-1.5 bg-blue-600 rounded" style={{ width: `${x.share}%` }} /></div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const Covenants: React.FC = () => {
  const { d, status, meta } = usePage('/covenants');
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Portfolio Monitoring" title="Covenant Compliance" desc={d?.summary || 'AI-monitored covenant tests across the active portfolio.'} right={meta} />
      {status}
      {d && (
        <>
          <div className="grid grid-cols-3 gap-4">
            {['Compliant', 'Watch', 'Breach'].map((s) => (
              <Stat key={s} label={s} value={d.covenants?.filter((c: any) => c.status === s).length} accent={s === 'Compliant' ? 'text-emerald-600' : s === 'Watch' ? 'text-amber-600' : 'text-rose-600'} />
            ))}
          </div>
          <Card title="Alerts">
            <div className="space-y-2">
              {d.alerts?.map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-3 border border-slate-200 rounded-lg px-3 py-2"><Badge>{a.severity}</Badge><span className="text-xs font-semibold">{a.dealId}</span><span className="text-sm">{a.message}</span></div>
              ))}
            </div>
          </Card>
          <Card title="Covenant Tests">
            <Table head={['Deal', 'Covenant', 'Threshold', 'Actual', 'Next Test', 'Status']}>
              {d.covenants?.map((c: any, i: number) => (
                <tr key={i}>
                  <td className="py-2.5 pr-4 text-xs font-semibold">{c.dealId}</td>
                  <td className="pr-4"><p className="font-semibold text-[#0b1f3a]">{c.covenant}</p><p className="text-xs text-slate-500">{c.note}</p></td>
                  <td className="pr-4 font-mono text-xs">{c.threshold}</td>
                  <td className="pr-4 font-mono text-xs font-bold">{c.actual}</td>
                  <td className="pr-4 text-xs">{c.nextTest}</td>
                  <td><Badge>{c.status}</Badge></td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}
    </div>
  );
};
