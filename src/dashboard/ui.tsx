import React from 'react';
import { AlertOctagon, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { ApiError } from './api';

export const Card: React.FC<{ title?: React.ReactNode; action?: React.ReactNode; className?: string; children: React.ReactNode }> = ({ title, action, className = '', children }) => (
  <section className={`bg-white border border-slate-200 rounded-2xl shadow-sm ${className}`}>
    {(title || action) && (
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <h3 className="text-sm font-bold text-[#0b1f3a]">{title}</h3>
        {action}
      </header>
    )}
    <div className="p-5">{children}</div>
  </section>
);

const tones: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-rose-50 text-rose-700 border-rose-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  slate: 'bg-slate-50 text-slate-600 border-slate-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
};

export function toneFor(v = ''): keyof typeof tones {
  const s = v.toLowerCase();
  if (/(verified|confirmed|compliant|accepted|approve$|strong|received|auto-accepted|pass)/.test(s)) return 'green';
  if (/(breach|conflict|decline|weak|rejected|high|exception)/.test(s)) return 'red';
  if (/(watch|review|pending|marginal|conditions|medium|open|requested|negotiating|override|escalated|outstanding)/.test(s)) return 'amber';
  if (/(issued|drafting|adequate|low)/.test(s)) return 'blue';
  return 'slate';
}

export const Badge: React.FC<{ children: React.ReactNode; tone?: keyof typeof tones }> = ({ children, tone }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap ${tones[tone || toneFor(String(children))]}`}>
    {children}
  </span>
);

export const Stat: React.FC<{ label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: string }> = ({ label, value, sub, accent = 'text-[#0b1f3a]' }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
    <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{label}</p>
    <p className={`text-2xl font-extrabold mt-1 ${accent}`}>{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
  </div>
);

export const Loading: React.FC<{ label?: string }> = ({ label = 'AI is generating this view…' }) => (
  <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    <p className="text-sm">{label}</p>
  </div>
);

export const ErrorPanel: React.FC<{ error: ApiError; onRetry?: () => void }> = ({ error, onRetry }) => (
  <div className="border border-rose-200 bg-rose-50 rounded-2xl p-6 flex gap-4">
    <AlertOctagon className="w-6 h-6 text-rose-600 shrink-0" />
    <div className="space-y-2">
      <p className="font-bold text-rose-800">AI request failed{error.reason ? ` — ${error.reason}` : ''}</p>
      <p className="text-sm text-rose-700 break-words">{error.message}</p>
      {error.reason === 'CONSUMER_SUSPENDED' && (
        <p className="text-sm text-rose-700">
          The AI API key has been suspended. Create a new key, put it in <code className="bg-white px-1 rounded">backend/.env</code>, then retry. No placeholder data is shown.
        </p>
      )}
      {onRetry && (
        <button onClick={onRetry} className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700 hover:text-rose-900">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      )}
    </div>
  </div>
);

export const AiMeta: React.FC<{ model?: string; at?: string; onRefresh?: () => void; loading?: boolean }> = ({ model, at, onRefresh, loading }) => (
  <div className="flex items-center gap-3 text-xs text-slate-500">
    {model && (
      <span className="inline-flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-blue-600" />AI generated{at && ` · ${new Date(at).toLocaleTimeString()}`}</span>
    )}
    {onRefresh && (
      <button onClick={onRefresh} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b1f3a] text-white font-semibold hover:bg-[#16325c] disabled:opacity-50">
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Regenerate
      </button>
    )}
  </div>
);

export const PageHeader: React.FC<{ eyebrow: string; title: React.ReactNode; desc?: string; right?: React.ReactNode }> = ({ eyebrow, title, desc, right }) => (
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div>
      <p className="text-[11px] font-bold tracking-widest text-blue-700 uppercase">{eyebrow}</p>
      <h1 className="text-3xl font-extrabold text-[#0b1f3a] mt-1">{title}</h1>
      {desc && <p className="text-sm text-slate-500 mt-1 max-w-2xl">{desc}</p>}
    </div>
    {right}
  </div>
);

export const Table: React.FC<{ head: string[]; children: React.ReactNode }> = ({ head, children }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
          {head.map((h) => <th key={h} className="py-2.5 pr-4 font-bold">{h}</th>)}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  </div>
);
