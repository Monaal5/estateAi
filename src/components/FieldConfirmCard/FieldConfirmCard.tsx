import React, { useState } from 'react';
import { FieldObservation } from '../../types';
import { SourceLink } from '../Common/SourceLink';
import { Check, Flag, Edit2, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { useDealContext } from '../../state/dealContext';

interface FieldConfirmCardProps {
  observation: FieldObservation;
  onNavigateToDocs?: () => void;
}

export const FieldConfirmCard: React.FC<FieldConfirmCardProps> = ({
  observation,
  onNavigateToDocs,
}) => {
  const { confirmFieldObservation, rejectFieldObservation, canonicalFields } = useDealContext();

  const isMoney = typeof observation.value === 'object' && observation.value !== null && 'amount' in observation.value;

  const [editAmount, setEditAmount] = useState<number>(
    isMoney ? observation.value.amount : 0
  );
  const [editText, setEditText] = useState<string>(
    typeof observation.value === 'string' ? observation.value : ''
  );
  const [isEditing, setIsEditing] = useState(false);

  const canonicalMatch = canonicalFields.find((f) => f.fieldKey === observation.fieldKey);
  const isConfirmed = observation.reviewStatus === 'confirmed' || !!canonicalMatch;
  const isRejected = observation.reviewStatus === 'rejected';

  const handleConfirm = () => {
    const finalVal = isMoney
      ? { amount: Number(editAmount), currency: 'USD' }
      : editText;
    confirmFieldObservation(observation.id, finalVal);
    setIsEditing(false);
  };

  const handleReject = () => {
    rejectFieldObservation(observation.id);
  };

  const confidencePct = Math.round(observation.confidence * 100);

  return (
    <div
      className={`p-4 rounded-2xl border transition-all ${
        isConfirmed
          ? 'bg-emerald-950/20 border-emerald-500/30'
          : isRejected
          ? 'bg-red-950/20 border-red-500/30'
          : 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-lg'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-white capitalize">
            {observation.fieldKey.replace(/\./g, ' › ')}
          </span>
          <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-400 rounded">
            {observation.extractionMethod.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Confidence Badge */}
          <span
            className={`px-2 py-0.5 text-xs font-mono font-bold rounded-md flex items-center gap-1 border ${
              confidencePct >= 90
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            <Sparkles className="w-3 h-3" /> {confidencePct}% Confidence
          </span>

          {/* Status Indicator */}
          {isConfirmed ? (
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-md flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Canonical Fact
            </span>
          ) : isRejected ? (
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/40 rounded-md flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Flagged Conflict
            </span>
          ) : (
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-md">
              Candidate
            </span>
          )}
        </div>
      </div>

      {/* Value Display / Edit Form */}
      <div className="my-3 p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[11px] text-slate-400 font-mono block">
            {isConfirmed ? 'Canonical Value:' : 'Proposed Candidate Observation:'}
          </span>
          {isEditing ? (
            <div className="mt-1 flex items-center gap-2">
              {isMoney ? (
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-sm font-bold">$</span>
                  <input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(Number(e.target.value))}
                    className="bg-slate-900 border border-brand-500 rounded px-2 py-1 text-sm font-mono text-emerald-400 font-bold focus:outline-none"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="bg-slate-900 border border-brand-500 rounded px-2 py-1 text-sm text-white focus:outline-none"
                />
              )}
            </div>
          ) : (
            <p className="text-base font-bold font-mono text-emerald-400 mt-0.5">
              {isMoney
                ? `$${(canonicalMatch?.acceptedValue?.amount || observation.value.amount).toLocaleString()} USD ${
                    observation.unit ? `(${observation.unit})` : ''
                  }`
                : canonicalMatch?.acceptedValue || observation.value}
            </p>
          )}
        </div>

        {!isConfirmed && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-slate-400 hover:text-white text-xs flex items-center gap-1 p-1 hover:bg-slate-800 rounded"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
        )}
      </div>

      {/* Source Link & Evidence Trace */}
      <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
        <SourceLink
          docId={observation.sourceDocId}
          docName={observation.sourceDocName}
          page={observation.sourcePage}
          region={observation.sourceRegion}
          onNavigateToDocument={onNavigateToDocs}
        />

        {/* Action Controls */}
        {!isConfirmed && !isRejected && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleReject}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-800 rounded-lg flex items-center gap-1 transition-all"
            >
              <Flag className="w-3.5 h-3.5" /> Flag Conflict
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-lg flex items-center gap-1 transition-all shadow-md shadow-brand-600/20"
            >
              <Check className="w-3.5 h-3.5" /> Confirm Canonical
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
