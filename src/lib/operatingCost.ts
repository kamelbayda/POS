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
