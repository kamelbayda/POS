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
  const index = indexOf(categories);
  if (index.ids.has(value)) return value;
  return index.byName.get(norm(value)) ?? UNCATEGORIZED;
}

/**
 * Lookup tables for one categories array, built once and reused: screens call categoryIdOf for
 * every product on every render (counts per section, filters), and scanning the list each time
 * froze big shops. Keyed by the array itself, so a changed list gets fresh tables.
 */
interface CategoryIndex { ids: Set<string>; byName: Map<string, string> }
const indexes = new WeakMap<Category[], CategoryIndex>();
function indexOf(categories: Category[]): CategoryIndex {
  let index = indexes.get(categories);
  if (!index) {
    const ids = new Set(categories.map(c => c.id));
    const byName = new Map<string, string>();
    // same precedence as before: the first category whose name or id matches wins
    for (const c of categories) {
      for (const key of [norm(c.name || ''), norm(c.id)]) if (key && !byName.has(key)) byName.set(key, c.id);
    }
    index = { ids, byName };
    indexes.set(categories, index);
  }
  return index;
}
