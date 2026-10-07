import type { Product } from '../types';

/**
 * Operating cost of a product (transport, cooling, packaging...), on top of its purchase
 * cost: a fixed amount per unit and/or a percentage of the purchase cost. It counts in
 * profit, margins and prices set from the cost, not in the stock value.
 */
export function operatingCostPerUnit(p: Pick<Product, 'operatingCostUSD' | 'operatingCostPercent'>, baseCost: number): number {
  const pct = Number(p.operatingCostPercent) || 0;
  const fixed = Number(p.operatingCostUSD) || 0;
  return baseCost * (pct / 100) + fixed;
}

/** Purchase cost plus operating cost, per unit. */
export function withOperatingCost(p: Pick<Product, 'operatingCostUSD' | 'operatingCostPercent'>, baseCost: number): number {
  return baseCost + operatingCostPerUnit(p, baseCost);
}

/**
 * Cost of the goods sold in these invoices, split into purchase cost and the products'
 * operating cost. Products without a recorded cost fall back to their wholesale price,
 * then to 75% of the sale price.
 */
export function costOfGoodsSold(
  invoices: Array<{ items: Array<{ productId: string; priceUSD: number; quantity: number; unitCostUSD?: number }> }>,
  products: Product[],
): { purchase: number; operating: number; total: number } {
  const byId = new Map(products.map((p) => [p.id, p]));
  let purchase = 0;
  let operating = 0;
  for (const inv of invoices) {
    for (const item of inv.items) {
      const prod = byId.get(item.productId);
      // Lines that are not stock products (repairs) carry their own cost
      const base = item.unitCostUSD ?? prod?.costPriceUSD ?? prod?.priceWholesale ?? item.priceUSD * 0.75;
      purchase += base * item.quantity;
      if (prod) operating += operatingCostPerUnit(prod, base) * item.quantity;
    }
  }
  return { purchase, operating, total: purchase + operating };
}
