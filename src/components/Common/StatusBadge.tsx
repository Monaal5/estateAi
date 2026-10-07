import React from 'react';
import { DealStage, ComplianceStatus, TaskStatus } from '../../types';

export const StageBadge: React.FC<{ stage: DealStage }> = ({ stage }) => {
  const styles: Record<DealStage, string> = {
    provisional: 'bg-slate-800 text-slate-300 border-slate-700',
    intake_active: 'bg-blue-950/80 text-blue-300 border-blue-800',
    in_review: 'bg-amber-950/80 text-amber-300 border-amber-800',
    underwriting_ready: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
    submitted: 'bg-indigo-950/80 text-indigo-300 border-indigo-800',
    conditional_approval: 'bg-purple-950/80 text-purple-300 border-purple-800',
    closed: 'bg-emerald-900 text-emerald-100 border-emerald-700',
  };

  const labels: Record<DealStage, string> = {
    provisional: 'Provisional',
    intake_active: 'Intake Active',
    in_review: 'In Broker Review',
    underwriting_ready: 'Underwriting Ready',
    submitted: 'Lender Submitted',
    conditional_approval: 'Conditional Approval',
    closed: 'Closed & Funded',
  };

  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${styles[stage]}`}>
      {labels[stage]}
    </span>
  );
};

export const ComplianceBadge: React.FC<{ status: ComplianceStatus }> = ({ status }) => {
  const isVerified = status === 'consent_verified' || status === 'kyc_cleared';
  return (
    <span
      className={`px-2 py-0.5 text-xs font-mono rounded border ${
        isVerified
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      }`}
    >
      {status.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
};

export const TaskStatusBadge: React.FC<{ status: TaskStatus }> = ({ status }) => {
  const styles: Record<TaskStatus, string> = {
    open: 'bg-slate-800 text-slate-300 border-slate-700',
    in_progress: 'bg-blue-900/60 text-blue-300 border-blue-700',
    borrower_submitted: 'bg-amber-900/60 text-amber-300 border-amber-700',
    under_review: 'bg-purple-900/60 text-purple-300 border-purple-700',
    waived: 'bg-slate-800 text-slate-400 border-slate-700 line-through',
    completed: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${styles[status]}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};
