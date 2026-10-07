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

/**
 * Free goods given for the whole invoice ("buy these 4 products, get 4 cartons free").
 * Their value is spread over everything received: every unit, paid or free, carries the
 * same share of what was actually paid. `costFactor` is the share kept per unit of value.
 */
export type OfferFreeItem = { productId: string; qty: number; unitValueUSD: number };
export const offerFreeValue = (offer: OfferFreeItem[]) => offer.reduce((acc, o) => acc + o.qty * o.unitValueUSD, 0);
export function costFactor(lines: PricedLine[], offer: OfferFreeItem[]): number {
  const paid = sumLines(lines, lineTotal);
  const free = offerFreeValue(offer);
  return paid > 0 && free > 0 ? paid / (paid + free) : 1;
}
/** Real unit cost of a paid line once the invoice offer is spread (offerUnits/offerValue: same product's offer share). */
export function landedCostWithOffer(l: PricedLine, factor: number, offerUnits = 0, offerValue = 0): number {
  const units = l.qty + (l.freeQty || 0) + offerUnits;
  if (units > 0 && l.qty > 0) return ((lineTotal(l) + offerValue) * factor) / units;
  return landedCost(l) * factor;
}
