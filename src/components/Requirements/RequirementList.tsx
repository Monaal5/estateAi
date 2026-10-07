import React, { useState } from 'react';
import { useDealContext } from '../../state/dealContext';
import { TaskStatusBadge } from '../Common/StatusBadge';
import { ApprovalGate } from '../Common/ApprovalGate';
import { ListTodo, CheckCircle2, ShieldAlert, Sparkles, FileCheck, FileQuestion } from 'lucide-react';

export const RequirementList: React.FC = () => {
  const { requirements, tasks, completeTask, waiveRequirement, activeDeal } = useDealContext();
  const [waiveTaskId, setWaiveTaskId] = useState<string | null>(null);

  const activeWaiveTask = tasks.find((t) => t.id === waiveTaskId);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-brand-400" />
            Deterministic Needs List & Task Queue
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gated by pure code policies for <span className="font-semibold text-slate-200">{activeDeal.selectedProgram.toUpperCase()} ({activeDeal.purpose})</span>. Model calls cannot modify applicability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300">
            Applicable Rules: <span className="text-brand-400 font-bold">{requirements.length}</span>
          </div>
          <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300">
            Open Tasks: <span className="text-amber-400 font-bold">{tasks.filter((t) => t.status !== 'completed' && t.status !== 'waived').length}</span>
          </div>
        </div>
      </div>

      {/* Task & Requirement Cards */}
      <div className="grid grid-cols-1 gap-4">
        {requirements.map((req) => {
          const associatedTask = tasks.find((t) => t.requirementId === req.requirementId);
          const isCompleted = associatedTask?.status === 'completed';
          const isWaived = associatedTask?.status === 'waived';

          return (
            <div
              key={req.id}
              className={`p-5 rounded-2xl border transition-all ${
                isCompleted
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : isWaived
                  ? 'bg-slate-900/50 border-slate-800 opacity-75'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-lg'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-xl border mt-0.5 ${
                      isCompleted
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : isWaived
                        ? 'bg-slate-800 text-slate-500 border-slate-700'
                        : 'bg-brand-500/10 text-brand-400 border-brand-500/20'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <FileCheck className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-white">{req.title}</h3>
                      {req.criticalFlag && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/30 rounded">
                          Critical Blocker
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{req.description}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-1">
                      Policy Rule: {req.sourcePolicy}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {associatedTask && <TaskStatusBadge status={associatedTask.status} />}
                </div>
              </div>

              {/* Evidence Specs & Action Bar */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <div className="text-slate-400">
                  Required Format:{' '}
                  <span className="text-slate-200 uppercase">
                    {req.evidenceSpec.acceptedFormats.join(', ')}
                  </span>
                  {req.evidenceSpec.periodRequired && (
                    <span className="ml-2">({req.evidenceSpec.periodRequired})</span>
                  )}
                </div>

                {associatedTask && !isCompleted && !isWaived && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setWaiveTaskId(associatedTask.id)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                    >
                      Waive Requirement
                    </button>
                    <button
                      onClick={() => completeTask(associatedTask.id)}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-md shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark Completed
                    </button>
                  </div>
                )}

                {isWaived && associatedTask?.waivedReason && (
                  <div className="text-xs text-amber-400 font-mono bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                    Waived by {associatedTask.waivedBy}: "{associatedTask.waivedReason}"
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Waive Rationale Approval Gate Modal */}
      <ApprovalGate
        isOpen={!!waiveTaskId}
        onClose={() => setWaiveTaskId(null)}
        onConfirm={(rationale) => {
          if (waiveTaskId && rationale) {
            waiveRequirement(waiveTaskId, rationale);
          }
        }}
        title={`Waive Requirement: ${activeWaiveTask?.title}`}
        detail="Waiving a requirement item overrides standard credit manual criteria. You must provide a formal compliance rationale for the audit record."
        requireRationale={true}
        variant="warning"
        actionText="Waive & Record Rationale"
      />
    </div>
  );
};
