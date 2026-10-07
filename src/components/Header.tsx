import React from 'react';
import { useDealContext } from '../state/dealContext';
import { ParticipantRole } from '../types';
import { ShieldCheck, Building2, UserCheck, Activity } from 'lucide-react';

export const Header: React.FC = () => {
  const { tenant, deals, activeDeal, setActiveDealId, activeRole, setActiveRole } = useDealContext();

  return (
    <header className="bg-slate-900/80 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
      {/* Brand & Tenant Isolation Badge */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-500/20">
          e
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg text-white tracking-tight">estate AI</h1>
            <span className="px-2 py-0.5 text-xs font-mono bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-md flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Tenant Isolated
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Building2 className="w-3 h-3 text-slate-500" /> {tenant.name}
          </p>
        </div>
      </div>

      {/* Active Deal Switcher */}
      <div className="flex items-center gap-3 bg-slate-800/60 p-1.5 rounded-xl border border-slate-700/60">
        <span className="text-xs font-medium text-slate-400 pl-2">Active Deal:</span>
        <select
          value={activeDeal.id}
          onChange={(e) => setActiveDealId(e.target.value)}
          className="bg-slate-900 text-slate-200 text-sm font-medium rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none focus:border-brand-500 cursor-pointer max-w-xs truncate"
        >
          {deals.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title} (${(d.requestedAmount.amount / 1000000).toFixed(1)}M)
            </option>
          ))}
        </select>
      </div>

      {/* User Role Switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {(['broker', 'processor', 'borrower'] as ParticipantRole[]).map((role) => (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${
                activeRole === role
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-400 border-l border-slate-800 pl-4">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Determinism: Enforced</span>
        </div>
      </div>
    </header>
  );
};
