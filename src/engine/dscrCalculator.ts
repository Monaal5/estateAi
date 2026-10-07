import { Money, DscrResult, GradeResult, LenderPolicyVersion } from '../types';

/**
 * Calculates monthly payment using standard amortization formula.
 */
export function amortizedMonthlyPayment(
  principal: Money,
  annualRate: number,
  termMonths: number
): Money {
  if (annualRate <= 0 || termMonths <= 0) {
    return { amount: principal.amount / (termMonths || 1), currency: principal.currency };
  }

  const monthlyRate = annualRate / 12;
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, termMonths);
  const denominator = Math.pow(1 + monthlyRate, termMonths) - 1;
  const paymentAmount = principal.amount * (numerator / denominator);

  return {
    amount: Math.round(paymentAmount * 100) / 100,
    currency: principal.currency,
  };
}

/**
 * Calculates DSCR pure financial result.
 */
export function calculateDSCR(input: {
  noi: Money;
  existingDebtService: Money;
  proposedLoanAmount: Money;
  proposedRate: number;
  proposedTermMonths: number;
}): DscrResult {
  const proposedPayment = amortizedMonthlyPayment(
    input.proposedLoanAmount,
    input.proposedRate,
    input.proposedTermMonths
  );

  const totalDebtServiceAmount = input.existingDebtService.amount + (proposedPayment.amount * 12);
  const dscrRatio = totalDebtServiceAmount > 0 
    ? input.noi.amount / totalDebtServiceAmount 
    : 0;

  return {
    dscr: Math.round(dscrRatio * 100) / 100,
    noi: input.noi,
    existingDebtService: input.existingDebtService,
    proposedPayment,
    totalDebtService: {
      amount: Math.round(totalDebtServiceAmount * 100) / 100,
      currency: input.noi.currency,
    },
    asOf: new Date().toISOString(),
  };
}

/**
 * Evaluates lending grade based on Lender Policy Bands.
 */
export function gradeDeal(
  dscr: DscrResult,
  policy: LenderPolicyVersion,
  propertyAppraisedValue: Money,
  proposedLoanAmount: Money
): GradeResult {
  const ltv = Math.round((proposedLoanAmount.amount / propertyAppraisedValue.amount) * 10000) / 100;
  
  const band = policy.criteria.dscrBands.find(
    (b) => dscr.dscr >= b.min && dscr.dscr < b.max
  ) || policy.criteria.dscrBands[policy.criteria.dscrBands.length - 1];

  const rationale: string[] = [
    `DSCR ${dscr.dscr.toFixed(2)} falls in the "${band.label}" band for policy (${policy.product} - ${policy.lenderName}).`,
    `Calculated LTV of ${ltv}% against appraised value of $${propertyAppraisedValue.amount.toLocaleString()} (Threshold: ≤ ${band.ltvMax}%).`,
  ];

  if (ltv > band.ltvMax) {
    rationale.push(`WARNING: Loan-to-Value exceeds max threshold of ${band.ltvMax}% for ${band.label} band.`);
  } else {
    rationale.push(`LTV meets policy requirement for ${band.label} risk tier.`);
  }

  return {
    grade: band.label,
    rationale,
    policyVersionId: policy.id,
    dscr,
    ltv,
  };
}
