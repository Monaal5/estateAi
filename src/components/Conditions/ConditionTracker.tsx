import React from 'react';
import { useDealContext } from '../../state/dealContext';
import { LenderCondition } from '../../types';
import { FileSpreadsheet, CheckCircle2, Clock, ShieldCheck, Tag } from 'lucide-react';

export const ConditionTracker: React.FC = () => {
  const { lenderConditions, updateConditionStatus } = useDealContext();

  const statusOptions: Array<{ value: LenderCondition['status']; label: string }> = [
    { value: 'proposed', label: '1. Proposed by Lender' },
    { value: 'processor_validated', label: '2. Processor Validated' },
    { value: 'task_created', label: '3. Task Dispatched' },
    { value: 'borrower_submitted', label: '4. Borrower Uploaded' },
    { value: 'accepted_by_lender', label: '5. Accepted by Lender' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-brand-400" />
            Lender Conditions Tracker
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Original lender condition text is preserved verbatim. Processor validates before dispatching task to borrower.
          </p>
        </div>

        <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300">
          Total Conditions: <span className="text-brand-400 font-bold">{lenderConditions.length}</span>
        </div>
      </div>

      <div className="space-y-4">
        {lenderConditions.map((cond) => {
          const isAccepted = cond.status === 'accepted_by_lender';

          return (
            <div
              key={cond.id}
              className={`p-5 rounded-2xl border transition-all ${
                isAccepted
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-lg'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-800 text-slate-300 rounded border border-slate-700 uppercase">
                      {cond.parsedCategory}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Received: {new Date(cond.receivedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-white leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800 font-serif">
                    "{cond.originalText}"
                  </p>
                </div>

                <div className="min-w-[200px]">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Condition Workflow Status:
                  </label>
                  <select
                    value={cond.status}
                    onChange={(e) => updateConditionStatus(cond.id, e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-mono font-bold rounded-lg p-2 text-brand-300 focus:outline-none focus:border-brand-500 cursor-pointer"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
