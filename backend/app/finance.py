"""Deterministic underwriting math. Gemini supplies inputs; ratios are always computed here."""


def _num(v, default=0.0) -> float:
    try:
        return float(str(v).replace(",", "").replace("$", ""))
    except (TypeError, ValueError):
        return default


def normalize_deal(d: dict) -> dict:
    """LLMs sometimes return rate as 6.85 (percent) or term in years — fix units before doing math."""
    d = dict(d)
    rate = _num(d.get("rate"), 0.07)
    d["rate"] = rate / 100 if rate > 1 else rate
    term = _num(d.get("termMonths"), 300)
    d["termMonths"] = int(term * 12 if term <= 40 else term)
    for k in ("loanAmount", "propertyValue", "noi", "existingAnnualDebt"):
        d[k] = round(_num(d.get(k)))
    return d


def monthly_payment(principal: float, annual_rate: float, months: int) -> float:
    r = annual_rate / 12
    return principal / months if r == 0 else principal * r / (1 - (1 + r) ** -months)


def underwrite(d: dict, policy: dict) -> dict:
    min_dscr, max_ltv = policy["minDscr"], policy["maxLtv"]
    proposed = monthly_payment(d["loanAmount"], d["rate"], d["termMonths"]) * 12
    total = proposed + d.get("existingAnnualDebt", 0)
    dscr = d["noi"] / total if total else 0
    ltv = d["loanAmount"] / d["propertyValue"] * 100 if d["propertyValue"] else 0
    debt_yield = d["noi"] / d["loanAmount"] * 100 if d["loanAmount"] else 0

    if dscr >= min_dscr + 0.25 and ltv <= max_ltv - 10:
        grade = "Strong"
    elif dscr >= min_dscr and ltv <= max_ltv:
        grade = "Adequate"
    elif dscr >= min_dscr - 0.1:
        grade = "Marginal"
    else:
        grade = "Weak"

    return {
        "dscr": round(dscr, 2), "ltv": round(ltv, 2), "debtYield": round(debt_yield, 2),
        "proposedAnnualDebtService": round(proposed), "totalAnnualDebtService": round(total),
        "grade": grade, "minDscr": min_dscr, "maxLtv": max_ltv,
        "passesDscr": dscr >= min_dscr, "passesLtv": ltv <= max_ltv,
    }
