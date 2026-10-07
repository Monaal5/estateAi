import React from 'react';
import { useDealContext } from '../state/dealContext';
import { Navigation, TabType } from '../components/Navigation';
import { DocumentViewer } from '../components/DocumentViewer/DocumentViewer';
import { FieldConfirmCard } from '../components/FieldConfirmCard/FieldConfirmCard';
import { RequirementList } from '../components/Requirements/RequirementList';
import { FinancialAnalysis } from '../components/Analysis/FinancialAnalysis';
import { SubmissionGateView } from '../components/Submission/SubmissionGateView';
import { ConditionTracker } from '../components/Conditions/ConditionTracker';
import { AIAssistantPanel } from '../components/Assistant/AIAssistantPanel';
import { AuditTrailView } from '../components/Audit/AuditTrailView';
import { DealInboxPage } from './DealInboxPage';
import { StageBadge, ComplianceBadge } from '../components/Common/StatusBadge';
import { Building2, MapPin, ShieldCheck, DollarSign, Calculator } from 'lucide-react';

export const DealDetailPage: React.FC = () => {
  const { activeDeal, tasks, observations, canonicalFields, latestAnalysis } = useDealContext();
  const [activeTab, setActiveTab] = React.useState<TabType>('review');

  const openTasksCount = tasks.filter((t) => t.status !== 'completed' && t.status !== 'waived').length;
  const unconfirmedCount = observations.filter((o) => o.reviewStatus === 'candidate').length;

  return (
    <div className="space-y-4">
      {/* Operating Process Two-Record Summary Bar (Spec Section 8 Overview) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white">{activeDeal.title}</h2>
              <StageBadge stage={activeDeal.stage} />
              <ComplianceBadge status={activeDeal.complianceStatus} />
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap">
              <span className="flex items-center gap-1 text-slate-200">
                <Building2 className="w-3.5 h-3.5 text-brand-400" /> {activeDeal.borrowerName}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" /> {activeDeal.propertyAddress}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800/80 font-mono text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">Requested Financing:</span>
              <span className="font-bold text-emerald-400 text-sm">
                ${(activeDeal.requestedAmount.amount / 1000000).toFixed(2)}M USD
              </span>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <span className="text-slate-400 block text-[10px]">Calculated DSCR:</span>
              <span className="font-bold text-brand-400 text-sm">
                {latestAnalysis?.dscr.dscr.toFixed(2)}x ({latestAnalysis?.lendingGrade.grade})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Navigation Tabs */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openTasksCount={openTasksCount}
        unconfirmedCount={unconfirmedCount}
      />

      {/* Active Tab Workspace View */}
      <div className="mt-4">
        {activeTab === 'inbox' && (
          <DealInboxPage onSelectDeal={() => setActiveTab('review')} />
        )}

        {activeTab === 'documents' && <DocumentViewer />}

        {activeTab === 'review' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">
                  Extraction & Field Candidate Reconciliation ({observations.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Confirm extracted candidate observations into canonical deal facts. Candidate rows are preserved in audit history.
                </p>
              </div>
              <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300">
                Canonical Facts: <span className="text-emerald-400 font-bold">{canonicalFields.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {observations.map((obs) => (
                <FieldConfirmCard
                  key={obs.id}
                  observation={obs}
                  onNavigateToDocs={() => setActiveTab('documents')}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'requirements' && <RequirementList />}
        {activeTab === 'analysis' && <FinancialAnalysis />}
        {activeTab === 'submission' && <SubmissionGateView />}
        {activeTab === 'conditions' && <ConditionTracker />}
        {activeTab === 'assistant' && <AIAssistantPanel />}
        {activeTab === 'audit' && <AuditTrailView />}
      </div>
    </div>
  );
};
