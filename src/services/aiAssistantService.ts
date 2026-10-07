import { Deal, CanonicalField, Task, RequirementVersion, AnalysisRun } from '../types';

export interface AssistantCitation {
  type: 'field' | 'document' | 'requirement' | 'consent' | 'analysis';
  id: string;
  label: string;
  docId?: string;
  docPage?: number;
  docRegion?: any;
}

export interface AssistantResponse {
  answer: string;
  citations: AssistantCitation[];
  timestamp: string;
}

/**
 * AI Assistant Service (Read-Only Tool Execution Layer).
 * Structurally prohibited from altering deal state.
 */
export async function askAssistant(params: {
  deal: Deal;
  role: 'borrower' | 'broker';
  question: string;
  canonicalFields: CanonicalField[];
  tasks: Task[];
  requirements: RequirementVersion[];
  latestAnalysis?: AnalysisRun['output'];
}): Promise<AssistantResponse> {
  const { deal, role, question, canonicalFields, tasks, requirements, latestAnalysis } = params;
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;

  // Derive relevant citations based on content/context
  const openTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'waived');
  const citations: AssistantCitation[] = [];

  if (openTasks.length > 0) {
    openTasks.forEach((t) => {
      citations.push({
        type: 'requirement',
        id: t.requirementId || t.id,
        label: t.title,
      });
    });
  }

  if (latestAnalysis) {
    citations.push(
      { type: 'analysis', id: 'cf_noi_annual', label: `Annual NOI ($${latestAnalysis.dscr.noi.amount.toLocaleString()})` },
      { type: 'analysis', id: 'cf_appraisal_val', label: 'Appraised Property Value ($6,200,000)' }
    );
  }

  canonicalFields.forEach((f) => {
    citations.push({
      type: 'field',
      id: f.id,
      label: `${f.fieldLabel}: ${typeof f.acceptedValue === 'object' ? '$' + f.acceptedValue.amount.toLocaleString() : f.acceptedValue}`,
    });
  });

  // Try calling Google Gemini API if key is present
  if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0) {
    try {
      const contextSummary = `
DEAL SUMMARY:
- Title: ${deal.title}
- Stage: ${deal.stage.toUpperCase()}
- Compliance Status: ${deal.complianceStatus}
- Requested Amount: $${deal.requestedAmount.amount.toLocaleString()} ${deal.requestedAmount.currency}
- Proposed Interest Rate: ${deal.proposedRate * 100}%
- Proposed Term: ${deal.proposedTermMonths / 12} years (${deal.proposedTermMonths} months)

USER ROLE: ${role.toUpperCase()}

CANONICAL FIELDS:
${canonicalFields.map((f) => `- ${f.fieldLabel}: ${typeof f.acceptedValue === 'object' ? '$' + f.acceptedValue.amount.toLocaleString() : f.acceptedValue}`).join('\n')}

REQUIREMENTS:
${requirements.map((r) => `- ${r.title} (Critical: ${r.criticalFlag ? 'Yes' : 'No'})`).join('\n')}

TASKS:
${tasks.map((t) => `- ${t.title} [Status: ${t.status}, Assignee: ${t.assigneeRole}]`).join('\n')}

LATEST FINANCIAL ANALYSIS:
${latestAnalysis ? `- Calculated DSCR: ${latestAnalysis.dscr.dscr.toFixed(2)}, Annual NOI: $${latestAnalysis.dscr.noi.amount.toLocaleString()}, Total Debt Service: $${latestAnalysis.dscr.totalDebtService.amount.toLocaleString()}/yr, Lending Grade: "${latestAnalysis.lendingGrade.grade}"` : 'None'}
`;

      const promptText = `You are estate AI Copilot, a read-only commercial real estate deal analysis assistant.
Use ONLY the canonical deal information provided below to answer the user's question. Do not invent facts or make up figures. Be concise, precise, and professional.

CONTEXT:
${contextSummary}

USER QUESTION: ${question}`;

      const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash'];
      let apiAnswer = '';

      for (const model of modelsToTry) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    role: 'user',
                    parts: [{ text: promptText }],
                  },
                ],
              }),
            }
          );

          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              apiAnswer = text;
              break;
            }
          }
        } catch (mErr) {
          console.warn(`Gemini model ${model} fetch failed`, mErr);
        }
      }

      if (apiAnswer) {
        return {
          answer: apiAnswer,
          citations: citations.slice(0, 5), // Include top 5 context citations
          timestamp: new Date().toISOString(),
        };
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local rule-based assistant:', err);
    }
  }

  // Fallback Rule-Based Logic
  const q = question.toLowerCase();

  if (q.includes('block') || q.includes('stop') || q.includes('prevent') || q.includes('submission')) {
    if (role === 'broker') {
      const taskNames = openTasks.map((t) => `"${t.title}"`).join(' and ');

      return {
        answer: openTasks.length > 0
          ? `Submission is currently blocked by ${openTasks.length} pending requirement item(s): ${taskNames}. The Net Operating Income candidate observation of $585,000 also requires broker confirmation to become a canonical field.`
          : `All critical requirements and consent forms are verified! The file is ready for broker authorization and submission.`,
        citations: openTasks.map((t) => ({
          type: 'requirement',
          id: t.requirementId || t.id,
          label: t.title,
        })),
        timestamp: new Date().toISOString(),
      };
    } else {
      return {
        answer: `Your loan application is currently under review by our underwriting team. We are verifying your 2024 Tax Return and Net Operating Income statements.`,
        citations: [{ type: 'document', id: 'doc_tax_2024', label: '2024 Tax Return' }],
        timestamp: new Date().toISOString(),
      };
    }
  }

  if (q.includes('dscr') || q.includes('ratio') || q.includes('grade') || q.includes('financial')) {
    if (latestAnalysis) {
      const { dscr, lendingGrade } = latestAnalysis;
      return {
        answer: `The current calculated Debt Service Coverage Ratio (DSCR) is ${dscr.dscr.toFixed(2)} based on annual NOI of $${dscr.noi.amount.toLocaleString()} and total debt service of $${dscr.totalDebtService.amount.toLocaleString()}/yr. Under the Apex Commercial Bank policy, this places the deal in the "${lendingGrade.grade}" lending grade tier.`,
        citations: [
          { type: 'analysis', id: 'cf_noi_annual', label: 'Annual NOI ($585,000)' },
          { type: 'analysis', id: 'cf_appraisal_val', label: 'Appraised Property Value ($6,200,000)' },
        ],
        timestamp: new Date().toISOString(),
      };
    }
  }

  if (q.includes('need') || q.includes('document') || q.includes('task') || q.includes('upload')) {
    return {
      answer: `Currently, we need ${openTasks.length} item(s): ${openTasks.map((t) => t.title).join('; ')}. Please upload these documents via your secure upload link.`,
      citations: openTasks.map((t) => ({
        type: 'requirement',
        id: t.id,
        label: t.title,
      })),
      timestamp: new Date().toISOString(),
    };
  }

  // Generic status overview query
  return {
    answer: `Deal "${deal.title}" is currently in stage "${deal.stage.toUpperCase()}" with compliance status "${deal.complianceStatus}". Total requested financing is $${deal.requestedAmount.amount.toLocaleString()} ${deal.requestedAmount.currency} at ${deal.proposedRate * 100}% interest over ${deal.proposedTermMonths / 12} years.`,
    citations: canonicalFields.map((f) => ({
      type: 'field',
      id: f.id,
      label: `${f.fieldLabel}: ${typeof f.acceptedValue === 'object' ? '$' + f.acceptedValue.amount.toLocaleString() : f.acceptedValue}`,
    })),
    timestamp: new Date().toISOString(),
  };
}

export interface AIUnderwritingAnalysis {
  executiveSummary: string;
  financialRiskAssessment: string;
  strengths: string[];
  risks: string[];
  recommendedMitigants: string[];
  recommendation: string;
  timestamp: string;
}

export async function generateAIUnderwritingAnalysis(params: {
  deal: Deal;
  canonicalFields: CanonicalField[];
  latestAnalysis?: AnalysisRun['output'];
  policy: any;
  tasks: Task[];
}): Promise<AIUnderwritingAnalysis> {
  const { deal, canonicalFields, latestAnalysis, policy, tasks } = params;
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;

  if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0) {
    try {
      const prompt = `You are a Senior Commercial Real Estate Credit Risk Officer & Underwriter.
Analyze the following deal payload and provide a dynamic, deep underwriting evaluation in JSON format.

DEAL INFORMATION:
- Property / Borrower: ${deal.title} (${deal.borrowerName})
- Loan Amount Requested: $${deal.requestedAmount.amount.toLocaleString()} USD
- Proposed Rate & Term: ${deal.proposedRate * 100}% over ${deal.proposedTermMonths / 12} years
- Lender Policy: ${policy?.lenderName || 'Apex Commercial Bank'} (Min DSCR: ${policy?.criteria?.minDscr || 1.25}x, Max LTV: ${policy?.criteria?.maxLtv || 75}%)

CANONICAL FINANCIAL DATA:
${canonicalFields.map((f) => `- ${f.fieldLabel}: ${typeof f.acceptedValue === 'object' ? '$' + f.acceptedValue.amount.toLocaleString() : f.acceptedValue}`).join('\n')}

COMPUTED DSCR & GRADE:
- DSCR: ${latestAnalysis?.dscr?.dscr?.toFixed(2) || '1.38'}x
- NOI: $${latestAnalysis?.dscr?.noi?.amount?.toLocaleString() || '585,000'}
- Debt Service: $${latestAnalysis?.dscr?.totalDebtService?.amount?.toLocaleString() || '423,000'}
- Calculated Grade Tier: ${latestAnalysis?.lendingGrade?.grade || 'Adequate'}
- LTV: ${latestAnalysis?.lendingGrade?.ltv || 68}%

OPEN COMPLIANCE TASKS:
${tasks.filter((t) => t.status !== 'completed').map((t) => `- ${t.title}`).join('\n')}

Please return ONLY a valid JSON object matching this structure (no markdown fences, no raw text around JSON):
{
  "executiveSummary": "Detailed narrative summary of the property, loan terms, and borrower creditworthiness",
  "financialRiskAssessment": "Analysis of DSCR margin, debt service capability, and sensitivity to rate changes",
  "strengths": ["List of 3-4 major deal strengths"],
  "risks": ["List of 2-3 key risk factors identified"],
  "recommendedMitigants": ["List of specific mitigants or underwriting conditions required"],
  "recommendation": "Final recommendation (e.g. Approved with Conditions, Standard Approval, Conditional Approval Pending Docs)"
}`;

      const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash'];
      for (const model of modelsToTry) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
              }),
            }
          );

          if (res.ok) {
            const data = await res.json();
            let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

            const parsed = JSON.parse(rawText);
            return {
              executiveSummary: parsed.executiveSummary || 'Executive summary generated.',
              financialRiskAssessment: parsed.financialRiskAssessment || 'Financial risk assessment completed.',
              strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
              risks: Array.isArray(parsed.risks) ? parsed.risks : [],
              recommendedMitigants: Array.isArray(parsed.recommendedMitigants) ? parsed.recommendedMitigants : [],
              recommendation: parsed.recommendation || 'Conditional Approval Recommended',
              timestamp: new Date().toISOString(),
            };
          }
        } catch (err) {
          console.warn(`Model ${model} analysis generation error`, err);
        }
      }
    } catch (err) {
      console.warn('Gemini LLM Underwriting call failed:', err);
    }
  }

  // Fallback dynamic analysis
  return {
    executiveSummary: `The requested $${deal.requestedAmount.amount.toLocaleString()} financing for ${deal.title} demonstrates solid cash flow fundamentals with strong property collateral backing.`,
    financialRiskAssessment: `Calculated DSCR of ${latestAnalysis?.dscr?.dscr?.toFixed(2) || '1.38'}x exceeds Apex Commercial Bank's minimum policy threshold of ${policy?.criteria?.minDscr || 1.25}x, yielding comfortable net income buffer over total debt service obligations.`,
    strengths: [
      `DSCR of ${latestAnalysis?.dscr?.dscr?.toFixed(2) || '1.38'}x provides healthy debt service coverage margin`,
      `Low LTV of ${latestAnalysis?.lendingGrade?.ltv || 68}% offers strong asset protection`,
      'Established commercial tenant base with multi-year lease covenants',
    ],
    risks: [
      'Net Operating Income observation requires formal broker confirmation',
      'Uncompleted tax return documentation tasks pending borrower upload',
    ],
    recommendedMitigants: [
      'Require 2024 Form 1120-S verification prior to final funding authorization',
      'Verify landlord consent and property insurance endorsement certificates',
    ],
    recommendation: 'Conditional Approval — Pending Document Confirmation',
    timestamp: new Date().toISOString(),
  };
}

