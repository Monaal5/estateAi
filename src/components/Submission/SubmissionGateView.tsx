import React, { useState } from 'react';
import { useDealContext } from '../../state/dealContext';
import { ApprovalGate } from '../Common/ApprovalGate';
import { Send, ShieldAlert, CheckCircle2, FileCheck, Lock, History, AlertTriangle } from 'lucide-react';

export const SubmissionGateView: React.FC = () => {
  const {
    activeDeal,
    policy,
    consents,
    tasks,
    canonicalFields,
    submissions,
    createSubmissionPackage,
    activeRole,
  } = useDealContext();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{ success: boolean; error?: string } | null>(null);

  const openTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'waived');
  const hasConsent = consents.some((c) => c.purpose === 'lender_submission' && !c.revokedAt);
  const isBroker = activeRole === 'broker';

  const canSubmit = openTasks.length === 0 && hasConsent && isBroker;

  const handleExecuteSubmission = (rationale?: string) => {
    const result = createSubmissionPackage(policy.lenderId);
    setSubmissionResult(result);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-brand-400" />
              Human-Gated Lender Submission Gate
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Creates an immutable submission snapshot signed by authorized broker. Direct model-triggered submission is prohibited.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 text-xs font-mono font-bold rounded-lg border flex items-center gap-1.5 ${
                canSubmit
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              {canSubmit ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {canSubmit ? 'All Preconditions Satisfied' : 'Submission Gate Locked'}
            </span>
          </div>
        </div>
      </div>

      {/* Precondition Checklist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Consent Check */}
        <div
          className={`p-4 rounded-xl border ${
            hasConsent
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : 'bg-amber-950/20 border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-slate-400">Consent Check</span>
            {hasConsent ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <p className="text-sm font-bold text-white">
            {hasConsent ? 'Lender Submission Consent Verified' : 'Missing Consent Record'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {hasConsent
              ? 'Active signed authorization record on file.'
              : 'Requires borrower consent before package dispatch.'}
          </p>
        </div>

        {/* 2. Critical Blockers Check */}
        <div
          className={`p-4 rounded-xl border ${
            openTasks.length === 0
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : 'bg-amber-950/20 border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-slate-400">Needs List Check</span>
            {openTasks.length === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <p className="text-sm font-bold text-white">
            {openTasks.length === 0 ? 'Zero Open Blocker Tasks' : `${openTasks.length} Pending Tasks`}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {openTasks.length === 0
              ? 'All requirements completed or waived.'
              : 'Complete open tasks before authorizing.'}
          </p>
        </div>

        {/* 3. Role Scope Check */}
        <div
          className={`p-4 rounded-xl border ${
            isBroker
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : 'bg-amber-950/20 border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-slate-400">Role Check</span>
            {isBroker ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <p className="text-sm font-bold text-white">
            {isBroker ? 'Senior Broker Role Active' : `Active Role: ${activeRole.toUpperCase()}`}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {isBroker
              ? 'Broker possesses submission authorization.'
              : 'Switch active role to Senior Broker.'}
          </p>
        </div>
      </div>

      {/* Submission Action Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
        <h3 className="font-bold text-white text-lg">Target Lender: {policy.lenderName}</h3>
        <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
          Submitting will compile an <span className="text-slate-200 font-mono">immutable package snapshot</span> containing confirmed canonical fields, SHA256 document digests, and the deterministic DSCR analysis.
        </p>

        {submissionResult && !submissionResult.success && (
          <div className="p-4 bg-red-950/50 border border-red-500/40 rounded-xl text-red-300 text-xs font-mono max-w-md mx-auto">
            [422 UNPROCESSABLE ENTITY] Precondition Error: {submissionResult.error}
          </div>
        )}

        <div>
          <button
            onClick={() => setShowConfirmModal(true)}
            className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-bold shadow-xl shadow-brand-600/30 inline-flex items-center gap-2 transition-all"
          >
            <Send className="w-4 h-4" /> Authorize & Dispatch Lender Package
          </button>
        </div>
      </div>

      {/* Past Submissions History */}
      {submissions.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" /> Immutable Submission History
          </h3>

          <div className="space-y-3">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono"
              >
                <div>
                  <p className="font-bold text-white text-sm">{sub.lenderName} ({sub.id})</p>
                  <p className="text-slate-400 mt-0.5">
                    Authorized By: {sub.approvedByName} • {new Date(sub.sentAt || '').toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded font-bold">
                    {sub.deliveryStatus.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approval Gate Confirmation Dialog */}
      <ApprovalGate
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleExecuteSubmission}
        title="Authorize & Freeze Submission Package?"
        detail={`You are authorizing the dispatch of Metro Shopping Plaza Acquisition package to ${policy.lenderName}. This action writes an immutable audit record.`}
        actionText="Confirm Package Dispatch"
      />
    </div>
  );
};
