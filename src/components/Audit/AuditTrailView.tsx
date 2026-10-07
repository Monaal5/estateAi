import React, { useState } from 'react';
import { useDealContext } from '../../state/dealContext';
import { History, ShieldCheck, Terminal, Filter, Code } from 'lucide-react';

export const AuditTrailView: React.FC = () => {
  const { auditLogs } = useDealContext();
  const [filterType, setFilterType] = useState<string>('all');

  const filteredLogs = filterType === 'all'
    ? auditLogs
    : auditLogs.filter((l) => l.eventType === filterType);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-brand-400" />
            Immutable Audit Trail & Event Catalog
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Section 9 Event Bus stream. Every state transition is recorded with correlation IDs for regulatory auditability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs font-mono rounded-lg p-2 text-slate-200 focus:outline-none"
          >
            <option value="all">All Events Catalog ({auditLogs.length})</option>
            <option value="field.verified">field.verified</option>
            <option value="document.received">document.received</option>
            <option value="decision.recorded">decision.recorded</option>
            <option value="submission.authorized">submission.authorized</option>
            <option value="requirement.changed">requirement.changed</option>
          </select>
        </div>
      </div>

      <div className="space-y-3 font-mono text-xs">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition-colors shadow-md"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/30 rounded font-bold">
                  {log.eventType}
                </span>
                <span className="text-slate-400 text-[11px]">ID: {log.id}</span>
                <span className="text-slate-500 text-[11px]">Corr: {log.correlationId}</span>
              </div>

              <div className="text-[11px] text-slate-400">
                Actor: <span className="text-slate-200 font-bold">{log.actorId || 'system'}</span> ({log.actorRole || 'system'}) • {new Date(log.occurredAt).toLocaleTimeString()}
              </div>
            </div>

            {/* Event Payload */}
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-[11px] text-slate-300 overflow-x-auto">
              <pre>{JSON.stringify(log.payload, null, 2)}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
