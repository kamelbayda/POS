import { Category } from '../types';

/** Bucket for products whose category matches none of the shop's categories. */
export const UNCATEGORIZED = '__uncategorized__';

const norm = (s: string) => s.trim().toLowerCase();

/**
 * The category id a product belongs to. Products normally store the category id, but some were
 * saved with the category's name (quick add in purchases, Excel import) or with a category that
 * was deleted since: match by id, then by name, else UNCATEGORIZED, so no product is hidden.
 */
export function categoryIdOf(value: string | undefined, categories: Category[]): string {
  if (!value) return UNCATEGORIZED;
  if (categories.some(c => c.id === value)) return value;
  const v = norm(value);
  return categories.find(c => norm(c.name) === v || norm(c.id) === v)?.id ?? UNCATEGORIZED;
}
