import React, { useState } from 'react';
import { useDealContext } from '../state/dealContext';
import { StageBadge, ComplianceBadge } from '../components/Common/StatusBadge';
import { DealStage } from '../types';
import { Inbox, Plus, Building, DollarSign, ArrowRight, ShieldCheck } from 'lucide-react';

interface DealInboxPageProps {
  onSelectDeal: (dealId: string) => void;
}

export const DealInboxPage: React.FC<DealInboxPageProps> = ({ onSelectDeal }) => {
  const { deals, setActiveDealId } = useDealContext();
  const [filterStage, setFilterStage] = useState<string>('all');

  const filteredDeals = filterStage === 'all'
    ? deals
    : deals.filter((d) => d.stage === filterStage);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Inbox className="w-6 h-6 text-brand-400" />
            Commercial Loan Deal Inbox
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Provisional & Authorized Deals. Structured workflow pipeline with explicit evidence gating.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs font-mono rounded-xl p-2.5 text-slate-200 focus:outline-none"
          >
            <option value="all">All Stages ({deals.length})</option>
            <option value="provisional">Provisional</option>
            <option value="intake_active">Intake Active</option>
            <option value="in_review">In Review</option>
            <option value="submitted">Lender Submitted</option>
          </select>
        </div>
      </div>

      {/* Deal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDeals.map((deal) => (
          <div
            key={deal.id}
            onClick={() => {
              setActiveDealId(deal.id);
              onSelectDeal(deal.id);
            }}
            className="bg-slate-900 border border-slate-800 hover:border-brand-500/50 rounded-2xl p-5 transition-all cursor-pointer hover:shadow-xl hover:shadow-brand-500/5 group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <StageBadge stage={deal.stage} />
                <ComplianceBadge status={deal.complianceStatus} />
              </div>

              <h3 className="font-bold text-base text-white group-hover:text-brand-300 transition-colors">
                {deal.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-500" /> {deal.borrowerName}
              </p>

              <div className="my-4 p-3 bg-slate-950 rounded-xl border border-slate-800/80 font-mono text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Financing:</span>
                  <span className="font-bold text-emerald-400">
                    ${(deal.requestedAmount.amount / 1000000).toFixed(2)}M USD
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Program / Purpose:</span>
                  <span className="text-slate-200 capitalize">
                    {deal.selectedProgram} ({deal.purpose})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rate / Term:</span>
                  <span className="text-slate-200">
                    {deal.proposedRate * 100}% • {deal.proposedTermMonths / 12} Yrs
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-brand-400 group-hover:text-brand-300">
              <span>Open Workstation</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
