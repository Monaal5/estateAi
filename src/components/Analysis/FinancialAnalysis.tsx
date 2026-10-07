import React, { useState } from 'react';
import { useDealContext } from '../../state/dealContext';
import { Calculator, ShieldCheck, ChevronDown, ChevronUp, Sparkles, PieChart, RefreshCw, CheckCircle, AlertTriangle, ShieldAlert, Cpu } from 'lucide-react';
import { generateAIUnderwritingAnalysis, AIUnderwritingAnalysis } from '../../services/aiAssistantService';

export const FinancialAnalysis: React.FC = () => {
  const { activeDeal, latestAnalysis, canonicalFields, policy, tasks } = useDealContext();
  const [showMathDetails, setShowMathDetails] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<AIUnderwritingAnalysis | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!latestAnalysis) return null;

  const { dscr, lendingGrade, criticalBlockers, completenessPercentage } = latestAnalysis;

  const gradeColors: Record<string, string> = {
    Strong: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
    Adequate: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
    Marginal: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
    Weak: 'bg-red-500/20 text-red-300 border-red-500/50',
  };

  const handleGenerateAIAnalysis = async () => {
    setIsGenerating(true);
    const result = await generateAIUnderwritingAnalysis({
      deal: activeDeal,
      canonicalFields,
      latestAnalysis,
      policy,
      tasks,
    });
    setAiAnalysis(result);
    setIsGenerating(false);
  };

  return (
    <div className="space-y-6">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* DSCR Callout */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Calculated DSCR</span>
            <Calculator className="w-4 h-4 text-brand-400" />
          </div>
          <p className="text-3xl font-extrabold text-white font-mono mt-2">
            {dscr.dscr.toFixed(2)}x
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Policy Min: <span className="text-slate-200 font-mono font-bold">{policy.criteria.minDscr}x</span>
          </p>
        </div>

        {/* Lending Grade */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Lending Grade Tier</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`px-3 py-1 text-sm font-extrabold rounded-xl border font-mono ${
                gradeColors[lendingGrade.grade]
              }`}
            >
              {lendingGrade.grade} Risk Tier
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Policy: {policy.lenderName} ({policy.product})
          </p>
        </div>

        {/* Calculated LTV */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Loan-to-Value (LTV)</span>
            <PieChart className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-3xl font-extrabold text-purple-300 font-mono mt-2">
            {lendingGrade.ltv}%
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Policy Max: <span className="text-slate-200 font-mono font-bold">{policy.criteria.maxLtv}%</span>
          </p>
        </div>

        {/* File Completeness */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>File Completeness</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-400 font-mono mt-2">
            {completenessPercentage}%
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {criticalBlockers.length === 0 ? (
              <span className="text-emerald-400 font-semibold">Zero Blockers</span>
            ) : (
              <span className="text-amber-400 font-semibold">{criticalBlockers.length} Open Blocker(s)</span>
            )}
          </p>
        </div>
      </div>

      {/* Dynamic AI Underwriting Analysis Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-brand-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                Dynamic AI Credit Risk & Underwriting Analysis
                <span className="text-[10px] font-mono px-2 py-0.5 bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded">
                  AI Engine
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Real-time AI credit memo generation evaluating deal cash flow, policy constraints, and risk factors.
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateAIAnalysis}
            disabled={isGenerating}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-brand-600/20 flex items-center gap-2 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Analyzing with AI...' : aiAnalysis ? 'Re-run LLM Analysis' : 'Generate AI Underwriting Assessment'}
          </button>
        </div>

        {/* Loading State */}
        {isGenerating && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full border-2 border-brand-500 border-t-transparent animate-spin flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-brand-400 animate-pulse" />
            </div>
            <p className="text-xs font-mono text-brand-300">
              Evaluating canonical fields, DSCR metrics, policy guidelines, and open tasks...
            </p>
          </div>
        )}

        {/* Generated Analysis Results */}
        {!isGenerating && aiAnalysis && (
          <div className="mt-6 space-y-6">
            {/* Recommendation Banner */}
            <div className="p-4 bg-slate-950 border border-brand-500/30 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  AI Credit Officer Decision Recommendation
                </span>
                <p className="text-base font-extrabold text-brand-300 font-mono mt-0.5">
                  {aiAnalysis.recommendation}
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Evaluated: {new Date(aiAnalysis.timestamp).toLocaleTimeString()}
              </span>
            </div>

            {/* Executive Summary & Risk Assessment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Executive Underwriting Summary
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {aiAnalysis.executiveSummary}
                </p>
              </div>

              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-brand-400" /> Financial & Debt Coverage Risk
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {aiAnalysis.financialRiskAssessment}
                </p>
              </div>
            </div>

            {/* Strengths, Risks & Mitigants Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Strengths */}
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" /> Credit Strengths
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {aiAnalysis.strengths.map((str, sIdx) => (
                    <li key={sIdx} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risks */}
              <div className="p-4 bg-amber-950/20 border border-amber-500/20 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> Key Identified Risks
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {aiAnalysis.risks.map((r, rIdx) => (
                    <li key={rIdx} className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mitigants */}
              <div className="p-4 bg-blue-950/20 border border-blue-500/20 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-blue-400" /> Required Mitigants
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {aiAnalysis.recommendedMitigants.map((m, mIdx) => (
                    <li key={mIdx} className="flex items-start gap-2">
                      <span className="text-blue-400 font-bold">•</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {!isGenerating && !aiAnalysis && (
          <div className="mt-6 p-6 bg-slate-950/80 border border-dashed border-slate-800 rounded-xl text-center">
            <Sparkles className="w-8 h-8 text-brand-400 mx-auto mb-2 opacity-80" />
            <h4 className="text-sm font-bold text-white mb-1">Click "Generate AI Underwriting Assessment"</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Our dynamic AI engine will parse canonical financial observations, policy thresholds, and open tasks to generate a complete underwriting memo.
            </p>
          </div>
        )}
      </div>

      {/* Debt Service Math Breakdown Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div
          onClick={() => setShowMathDetails(!showMathDetails)}
          className="flex items-center justify-between cursor-pointer border-b border-slate-800 pb-4"
        >
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-brand-400" />
            Financial Math & Calculation Traceability
          </h3>
          <button className="text-slate-400 hover:text-white flex items-center gap-1 text-xs font-semibold">
            {showMathDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showMathDetails ? 'Hide Calculation' : 'Show Full Math'}
          </button>
        </div>

        {showMathDetails && (
          <div className="mt-5 space-y-6">
            {/* Formula Callout */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-300 leading-relaxed">
              <span className="text-brand-400 font-bold block mb-1">
                PURE FUNCTION FORMULA:
              </span>
              DSCR = Net Operating Income (NOI) / Total Debt Service
              <br />
              <span className="text-slate-400">
                Where Total Debt Service = Annual Existing Debt ($
                {(dscr.existingDebtService.amount * 12).toLocaleString()}) + Proposed Amortized Loan Payment ($
                {(dscr.proposedPayment.amount * 12).toLocaleString()}/yr)
              </span>
            </div>

            {/* Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2">Component</th>
                    <th className="pb-2">Canonical Source</th>
                    <th className="pb-2">Monthly Figure</th>
                    <th className="pb-2 text-right">Annualized Figure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  <tr>
                    <td className="py-3 font-semibold text-white">Net Operating Income (NOI)</td>
                    <td className="py-3 text-slate-400">2024 Form 1120-S / P&L Statement</td>
                    <td className="py-3 text-slate-400">${(dscr.noi.amount / 12).toLocaleString()}</td>
                    <td className="py-3 text-right font-bold text-emerald-400">
                      ${dscr.noi.amount.toLocaleString()} USD
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 font-semibold text-white">Existing Debt Service</td>
                    <td className="py-3 text-slate-400">Confirmed Bank Schedule</td>
                    <td className="py-3 text-slate-300">${dscr.existingDebtService.amount.toLocaleString()}</td>
                    <td className="py-3 text-right font-semibold text-slate-300">
                      ${(dscr.existingDebtService.amount * 12).toLocaleString()} USD
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 font-semibold text-white">
                      Proposed Loan Payment (${(activeDeal.requestedAmount.amount / 1000000).toFixed(1)}M @{' '}
                      {activeDeal.proposedRate * 100}%, {activeDeal.proposedTermMonths / 12} yrs)
                    </td>
                    <td className="py-3 text-slate-400">Calculated Amortization</td>
                    <td className="py-3 text-brand-300 font-semibold">
                      ${dscr.proposedPayment.amount.toLocaleString()}
                    </td>
                    <td className="py-3 text-right font-semibold text-brand-300">
                      ${(dscr.proposedPayment.amount * 12).toLocaleString()} USD
                    </td>
                  </tr>

                  <tr className="bg-slate-950/80 font-bold text-white">
                    <td className="py-3 pl-2">Total Debt Service</td>
                    <td className="py-3 text-slate-400">Combined Annual Obligation</td>
                    <td className="py-3 text-slate-300">
                      $
                      {Math.round(
                        (dscr.existingDebtService.amount + dscr.proposedPayment.amount)
                      ).toLocaleString()}
                    </td>
                    <td className="py-3 pr-2 text-right text-brand-400 text-sm">
                      ${dscr.totalDebtService.amount.toLocaleString()} USD
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Policy Rationale Explanation */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <h4 className="font-bold text-xs text-white uppercase tracking-wider font-mono">
                Policy Underwriting Rationale ({policy.lenderName})
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300 font-sans">
                {lendingGrade.rationale.map((line, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-brand-400 font-bold">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

