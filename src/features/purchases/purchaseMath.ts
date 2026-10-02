/** Shared maths for purchase invoice lines (screen, saved invoice and printout). */
// Purchase line maths. costPriceUSD is the supplier's unit price before discount and VAT;
// discountPercent comes off first, VAT (taxRate, Lebanon is 11%) is charged on the discounted
// amount, and freeQty bonus units arrive at no charge.
export const VAT_PRESETS = [0, 11];
export type PricedLine = { qty: number; costPriceUSD: number; taxRate?: number; discountPercent?: number; freeQty?: number };
export const lineGross = (l: PricedLine) => l.qty * l.costPriceUSD;
export const lineDiscount = (l: PricedLine) => lineGross(l) * ((l.discountPercent || 0) / 100);
export const lineTax = (l: PricedLine) => (lineGross(l) - lineDiscount(l)) * ((l.taxRate || 0) / 100);
/** What the supplier is paid for the line: after discount, VAT included. */
export const lineTotal = (l: PricedLine) => lineGross(l) - lineDiscount(l) + lineTax(l);
/** Real cost of one unit on the shelf, spreading the paid total over paid + free units. */
export const landedCost = (l: PricedLine) => {
  const units = l.qty + (l.freeQty || 0);
  if (units > 0 && l.qty > 0) return lineTotal(l) / units;
  return l.costPriceUSD * (1 - (l.discountPercent || 0) / 100) * (1 + (l.taxRate || 0) / 100);
};
/** Free units from a "for every N, M free" bonus. */
export const bonusFor = (qty: number, every?: number, free?: number) =>
  every && every > 0 && free && free > 0 ? Math.floor(qty / every) * free : 0;
export const sumLines = (lines: PricedLine[], f: (l: PricedLine) => number) => lines.reduce((acc, l) => acc + f(l), 0);
