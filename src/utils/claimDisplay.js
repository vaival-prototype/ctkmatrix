// Display helpers shared by the claim lists and the claim page.

const SOURCE_LABELS = {
  auto: "Claim Toolkit Auto",
  compliance: "Compliance · manual entry",
  manual: "Manual entry",
  audit: "Claim Audit",
};

/** Where a claim came from, e.g. "Claim Toolkit Auto". */
export function sourceLabel(claim) {
  return SOURCE_LABELS[claim?.originApp] ?? "Claim Matrix";
}

/** Whole-dollar currency ("$24,500"), the raw value if it isn't a number, or null when empty. */
export function formatMoney(value, currency = "USD") {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", { style: "currency", currency, maximumFractionDigits: 0 })
    : String(value);
}
