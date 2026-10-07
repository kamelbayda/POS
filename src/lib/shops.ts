/**
 * Several shops on one browser (e.g. an owner with a supermarket and a phone shop).
 *
 * Each shop keeps its own data: storage.ts prefixes every key with the active shop,
 * so products, invoices, accounts, the licence and the cloud session never mix.
 * The first shop ("main") keeps the original unprefixed keys, so existing data is
 * that shop. Switching shop reloads the page, so every screen starts on the new data.
 *
 * This file is the one place that reads localStorage directly (the registry is shared by all shops).
 */

export interface ShopEntry {
  id: string;
  name: string;
  businessType?: 'supermarket' | 'phones';
  createdAt: number;
}

const REGISTRY_KEY = 'beecash_shops';
const ACTIVE_KEY = 'beecash_active_shop';
export const MAIN_SHOP_ID = 'main';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch {
    // storage unavailable
  }
}

export function listShops(): ShopEntry[] {
  const shops = read<ShopEntry[]>(REGISTRY_KEY, []);
  return shops.some(s => s.id === MAIN_SHOP_ID) ? shops : [{ id: MAIN_SHOP_ID, name: '', createdAt: 0 }, ...shops];
}

function readActive(): string {
  try {
    const id = localStorage.getItem(ACTIVE_KEY) || MAIN_SHOP_ID;
    return id === MAIN_SHOP_ID || read<ShopEntry[]>(REGISTRY_KEY, []).some(s => s.id === id) ? id : MAIN_SHOP_ID;
  } catch {
    return MAIN_SHOP_ID;
  }
}

/** Fixed for the life of the page: switching shop reloads. */
export const ACTIVE_SHOP_ID = readActive();

/** Prefix of the active shop's storage keys ('' for the first shop). */
export const SHOP_KEY_PREFIX = ACTIVE_SHOP_ID === MAIN_SHOP_ID ? '' : `shop_${ACTIVE_SHOP_ID}::`;

/** Name of the Firebase app for this shop: each has its own cloud sign-in and offline cache. */
export const FIREBASE_APP_NAME = ACTIVE_SHOP_ID === MAIN_SHOP_ID ? '[DEFAULT]' : `shop-${ACTIVE_SHOP_ID}`;

/** Keeps the shop list's name and type in step with the active shop's settings. */
export function updateActiveShop(patch: Partial<Pick<ShopEntry, 'name' | 'businessType'>>) {
  const shops = listShops();
  const next = shops.map(s => (s.id === ACTIVE_SHOP_ID ? { ...s, ...patch } : s));
  if (JSON.stringify(next) !== JSON.stringify(shops)) write(REGISTRY_KEY, next);
}

export function switchShop(id: string) {
  write(ACTIVE_KEY, id);
  window.location.reload();
}

/** Adds an empty shop and opens it (it starts on the "what kind of business" screen). */
export function addShop() {
  const id = Date.now().toString(36);
  write(REGISTRY_KEY, [...listShops(), { id, name: '', createdAt: Date.now() }]);
  switchShop(id);
}

/**
 * Deletes a shop kept on this browser with all its data (stock, invoices, accounts, licence).
 * The open shop and the first shop (whose data uses the original keys) can't be deleted here.
 */
export function deleteShop(id: string): boolean {
  if (id === MAIN_SHOP_ID || id === ACTIVE_SHOP_ID) return false;
  const prefix = `shop_${id}::`;
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith(prefix)) localStorage.removeItem(key);
  } catch {
    return false;
  }
  write(REGISTRY_KEY, listShops().filter(s => s.id !== id));
  // the shop's offline cloud cache (its own Firebase app); best effort
  try {
    indexedDB.databases?.().then(dbs => dbs.forEach(db => { if (db.name?.includes(`shop-${id}`)) indexedDB.deleteDatabase(db.name); }));
  } catch {
    // ignore
  }
  return true;
}
