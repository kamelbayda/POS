/**
 * Pure helpers for the live multi-device sync (see hooks/useCloudSync.ts).
 *
 * Every device keeps its data in local state + localStorage and mirrors it to
 * Firestore under shops/{uid}/{collection}/{id}. For each collection the engine
 * remembers the last version it knows the cloud has ("known"); a local change is
 * whatever differs from that, and a remote change replaces both.
 *
 * Counter fields (stock, balances) are sent as increments of the difference, so
 * two tills selling the same product at the same time both count.
 */

export interface SyncedCollection {
  /** Firestore collection under the shop. */
  name: string;
  /** localStorage key the app already uses for this list. */
  storageKey: string;
  /** Numeric fields synced as increments rather than overwritten. */
  counters?: string[];
  /**
   * Log collections (sales, returns...) only listen to recent records, to keep
   * Firestore reads low; older records stay as they are on each device.
   */
  log?: boolean;
}

export const SYNCED_COLLECTIONS: SyncedCollection[] = [
  { name: 'products', storageKey: 'pos_products', counters: ['quantity', 'warehouseQuantity'] },
  { name: 'categories', storageKey: 'pos_categories' },
  { name: 'customers', storageKey: 'pos_customers', counters: ['creditBalance', 'loyaltyPoints'] },
  { name: 'suppliers', storageKey: 'pos_suppliers', counters: ['debtBalance'] },
  { name: 'promotions', storageKey: 'pos_promotions' },
  { name: 'users', storageKey: 'pos_users' },
  { name: 'invoices', storageKey: 'pos_invoices', log: true },
  { name: 'returns', storageKey: 'pos_returns', log: true },
  { name: 'waste', storageKey: 'pos_waste', log: true },
  { name: 'expenses', storageKey: 'pos_expenses', log: true },
  { name: 'purchaseInvoices', storageKey: 'pos_purchases', log: true },
  { name: 'repairs', storageKey: 'pos_repairs' },
  { name: 'tradeIns', storageKey: 'pos_tradeins' },
  { name: 'topupWallets', storageKey: 'pos_topup_wallets', counters: ['balance'] },
  { name: 'installments', storageKey: 'pos_installments' },
];

/** Settings that belong to one machine (its printers and cash drawer), never synced. */
export const DEVICE_ONLY_SETTINGS = ['printersList', 'printerAssignments', 'directSilentPrint', 'cashDrawerCodes', 'cashDrawerEnabled'];

/** Fired after cloud sync stored new admin/cashier password hashes in localStorage. */
export const PASSCODES_CHANGED_EVENT = 'pos-passcodes-changed';

/** Days of sales/returns/... each device listens to live. */
export const LOG_WINDOW_DAYS = 3;

/** JSON with sorted keys and undefined dropped, so equal records compare equal. */
export function stable(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.keys(v).sort().reduce((o: Record<string, unknown>, k) => {
          if (v[k] !== undefined) o[k] = v[k];
          return o;
        }, {})
      : v);
}

export interface Known {
  /** The local object last matched against the cloud (cheap identity check). */
  ref: unknown;
  json: string;
  data: Record<string, any>;
}

export type Change =
  | { kind: 'set'; id: string; data: Record<string, any> }
  | { kind: 'update'; id: string; fields: Record<string, any>; increments: Record<string, number>; removed: string[] }
  | { kind: 'delete'; id: string };

/**
 * Local changes to send: new records, edited records and removed records.
 * Updates the known map as if the writes already succeeded (Firestore queues
 * them offline and applies them to its own cache at once).
 */
export function diffLocal(
  items: Array<{ id: string }>,
  known: Map<string, Known>,
  spec: SyncedCollection,
  opts: { allowDeletes: boolean },
): Change[] {
  const changes: Change[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !item.id) continue;
    seen.add(item.id);
    const prev = known.get(item.id);
    if (prev && prev.ref === item) continue;
    const json = stable(item);
    if (prev && prev.json === json) {
      prev.ref = item;
      continue;
    }
    const data = JSON.parse(json) as Record<string, any>;
    if (!prev || !spec.counters?.length) {
      changes.push({ kind: 'set', id: item.id, data });
    } else {
      const fields: Record<string, any> = {};
      const increments: Record<string, number> = {};
      for (const [k, v] of Object.entries(data)) {
        if (spec.counters.includes(k) && typeof v === 'number') {
          const delta = v - (Number(prev.data[k]) || 0);
          if (delta !== 0) increments[k] = delta;
        } else if (stable(v) !== stable(prev.data[k])) {
          fields[k] = v;
        }
      }
      const removed = Object.keys(prev.data).filter((k) => !(k in data));
      changes.push({ kind: 'update', id: item.id, fields, increments, removed });
    }
    known.set(item.id, { ref: item, json, data });
  }
  if (opts.allowDeletes) {
    for (const id of [...known.keys()]) {
      if (!seen.has(id)) {
        changes.push({ kind: 'delete', id });
        known.delete(id);
      }
    }
  }
  return changes;
}

/**
 * Applies remote records to the local list, keeping the local order; records
 * new to this device go first (newest first for sales and logs).
 * `removedIds` are deleted on another device.
 */
export function mergeRemote<T extends { id: string }>(local: T[], remote: Map<string, T>, removedIds: Set<string>): T[] {
  const out: T[] = [];
  const used = new Set<string>();
  for (const item of local) {
    if (removedIds.has(item.id)) continue;
    const r = remote.get(item.id);
    out.push(r ?? item);
    used.add(item.id);
  }
  const fresh = [...remote.values()].filter((r) => !used.has(r.id));
  return [...fresh, ...out];
}

export function isoDaysAgo(today: string, days: number): string {
  const d = new Date(`${today}T00:00:00`);
  d.setDate(d.getDate() - days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
