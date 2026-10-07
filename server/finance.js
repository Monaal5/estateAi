export function monthlyPayment(principal, annualRate, termMonths) {
  const r = annualRate / 12;
  if (!r) return principal / termMonths;
  return (principal * r) / (1 - Math.pow(1 + r, -termMonths));
}

export function underwrite({ noi, existingAnnualDebt = 0, loanAmount, rate, termMonths, propertyValue }, policy = {}) {
  const minDscr = policy.minDscr ?? 1.25;
  const maxLtv = policy.maxLtv ?? 75;
  const proposedAnnual = monthlyPayment(loanAmount, rate, termMonths) * 12;
  const totalDebt = proposedAnnual + existingAnnualDebt;
  const dscr = totalDebt ? noi / totalDebt : 0;
  const ltv = propertyValue ? (loanAmount / propertyValue) * 100 : 0;
  const debtYield = loanAmount ? (noi / loanAmount) * 100 : 0;

  let grade = 'Weak';
  if (dscr >= minDscr + 0.25 && ltv <= maxLtv - 10) grade = 'Strong';
  else if (dscr >= minDscr && ltv <= maxLtv) grade = 'Adequate';
  else if (dscr >= minDscr - 0.1) grade = 'Marginal';

  const r2 = (n) => Math.round(n * 100) / 100;
  return {
    dscr: r2(dscr), ltv: r2(ltv), debtYield: r2(debtYield),
    proposedAnnualDebtService: Math.round(proposedAnnual),
    totalAnnualDebtService: Math.round(totalDebt),
    grade, minDscr, maxLtv,
    passesDscr: dscr >= minDscr, passesLtv: ltv <= maxLtv,
  };
}
