import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, X } from 'lucide-react';

interface ApprovalGateProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rationale?: string) => void;
  title: string;
  detail: string;
  actionText?: string;
  requireRationale?: boolean;
  variant?: 'danger' | 'primary' | 'warning';
}

export const ApprovalGate: React.FC<ApprovalGateProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  detail,
  actionText = 'Confirm & Authorize',
  requireRationale = false,
  variant = 'primary',
}) => {
  const [rationale, setRationale] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requireRationale && !rationale.trim()) return;
    onConfirm(rationale);
    setRationale('');
    onClose();
  };

  const buttonStyle =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-500 text-white'
      : variant === 'warning'
      ? 'bg-amber-600 hover:bg-amber-500 text-white'
      : 'bg-brand-600 hover:bg-brand-500 text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl text-brand-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-sm text-slate-300 mt-1 leading-relaxed">{detail}</p>
          </div>
        </div>

        {requireRationale && (
          <div className="mt-4">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Authorization Rationale (Required for Audit Trail)
            </label>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Enter compliance justification or broker exception notes..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-brand-500 font-sans"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={requireRationale && !rationale.trim()}
            className={`px-5 py-2.5 text-sm font-semibold rounded-xl flex items-center gap-2 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${buttonStyle}`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {actionText}
          </button>
        </div>
      </div>
    </div>
  );
};
