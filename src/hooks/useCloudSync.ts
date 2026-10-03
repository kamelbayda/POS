import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  onSnapshot, query, where, getDocs, limit, writeBatch, increment, deleteField, DocumentData,
} from 'firebase/firestore';
import { auth, db, shopCollection, shopDoc } from '../firebase';
import * as storage from '../lib/storage';
import {
  SYNCED_COLLECTIONS, DEVICE_ONLY_SETTINGS, LOG_WINDOW_DAYS,
  Known, Change, diffLocal, mergeRemote, stable, isoDaysAgo, PASSCODES_CHANGED_EVENT,
} from '../lib/cloudSync';
import { SystemSettings } from '../types';

type Row = { id: string };
type Setter = (rows: any[]) => void;

export interface CloudSyncDeps {
  loaded: boolean;
  SYS_DATE: string;
  lang: 'ar' | 'en';
  lists: Record<string, { items: Row[]; set: Setter }>;
  settings: SystemSettings;
  setSettings: (s: SystemSettings) => void;
  showToast: (type: 'success' | 'error' | 'warning', message: string) => void;
}

export type CloudSyncStatus = 'off' | 'aligning' | 'live' | 'declined';
/** How a device joins a cloud shop that already has data. */
export type AlignChoice = 'upload' | 'download' | 'cancel';

const ALIGNED_KEY = 'pos_cloud_shop'; // uid of the cloud shop this device's data matches
const PASSCODE_KEYS = { admin: 'pos_admin_passcode', kaseer: 'pos_cashier_passcode' } as const;

const sharedSettings = (s: SystemSettings) => {
  const copy: Record<string, unknown> = { ...s };
  for (const k of DEVICE_ONLY_SETTINGS) delete copy[k];
  return copy;
};
const readPasscodes = () => ({ admin: storage.getItem(PASSCODE_KEYS.admin) || '', kaseer: storage.getItem(PASSCODE_KEYS.kaseer) || '' });

/** Writes in batches of up to 450 operations (Firestore allows 500). Not awaited by callers. */
async function commit(ops: Array<(b: ReturnType<typeof writeBatch>) => void>) {
  for (let i = 0; i < ops.length; i += 450) {
    const batch = writeBatch(db);
    ops.slice(i, i + 450).forEach((op) => op(batch));
    await batch.commit();
  }
}

function changeOps(collection: string, changes: Change[]) {
  return changes.map((c) => (b: ReturnType<typeof writeBatch>) => {
    const ref = shopDoc(collection, c.id);
    if (c.kind === 'delete') b.delete(ref);
    else if (c.kind === 'set') b.set(ref, c.data);
    else {
      const patch: Record<string, unknown> = { ...c.fields };
      for (const [k, d] of Object.entries(c.increments)) patch[k] = increment(d);
      for (const k of c.removed) patch[k] = deleteField();
      b.set(ref, patch, { merge: true });
    }
  });
}

/**
 * Live sync between all devices signed in to the same cloud shop: local changes
 * go up as they happen, changes from other devices come down as they happen.
 */
export function useCloudSync({ loaded, SYS_DATE, lang, lists, settings, setSettings, showToast }: CloudSyncDeps) {
  const ar = lang === 'ar';
  const [uid, setUid] = useState<string | null>(null);
  const [status, setStatus] = useState<CloudSyncStatus>('off');
  const [attempt, setAttempt] = useState(0); // bumped to ask again after "declined"
  // Waiting for the person to choose how this device joins a cloud shop with data
  const [choicePending, setChoicePending] = useState(false);
  const choiceResolver = useRef<((c: AlignChoice) => void) | null>(null);
  // Set when the person asked to download from the login screen: no need to ask again
  const presetChoice = useRef<AlignChoice | null>(null);
  const askChoice = () => {
    if (presetChoice.current) { const c = presetChoice.current; presetChoice.current = null; return Promise.resolve(c); }
    setChoicePending(true);
    return new Promise<AlignChoice>((resolve) => { choiceResolver.current = resolve; });
  };
  const resolveChoice = (c: AlignChoice) => {
    setChoicePending(false);
    choiceResolver.current?.(c);
    choiceResolver.current = null;
  };

  // Latest values for listeners (which outlive renders)
  const listsRef = useRef(lists);
  listsRef.current = lists;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const known = useRef(new Map<string, Map<string, Known>>());
  const ready = useRef(new Set<string>());
  const knownSettings = useRef<string | null>(null);
  const knownPasscodes = useRef<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), []);

  // 1. Align this device with the cloud shop once: first device uploads, others download
  useEffect(() => {
    if (!uid || !loaded) { setStatus('off'); return; }
    if (storage.getItem(ALIGNED_KEY) === uid) { setStatus('live'); return; }
    let cancelled = false;
    setStatus('aligning');
    (async () => {
      try {
        const [prod, cfg] = await Promise.all([
          getDocs(query(shopCollection('products'), limit(1))),
          getDocs(query(shopCollection('settings'), limit(1))),
        ]);
        if (cancelled) return;
        const cloudEmpty = prod.empty && cfg.empty;
        if (cloudEmpty) {
          await uploadEverything();
          showToast('success', ar ? '☁️ تم رفع بيانات المحل. هلّق فيك تفوت بنفس الحساب من جهاز تاني.' : '☁️ Shop data uploaded. You can now sign in on another device.');
        } else {
          const choice = await askChoice();
          if (cancelled) return;
          if (choice === 'cancel') { setStatus('declined'); return; }
          if (choice === 'upload') {
            // This device's data goes up; records only the cloud has come down with live sync
            await uploadEverything();
            showToast('success', ar ? '☁️ تم رفع بيانات هالجهاز ودمجها مع السحاب.' : '☁️ This device\'s data was uploaded and merged with the cloud.');
          } else {
            await downloadEverything();
            showToast('success', ar ? '☁️ تم تنزيل بيانات المحل. هالجهاز صار متزامن، وفيك تفوت بإيميلك وكلمة سرّك.' : '☁️ Shop data downloaded. This device is in sync; sign in with your email and password.');
          }
        }
        if (cancelled) return;
        storage.setItem(ALIGNED_KEY, uid);
        setStatus('live');
      } catch (err) {
        console.warn('Cloud alignment failed', err);
        if (!cancelled) setStatus('off');
      }
    })();
    return () => { cancelled = true; };
  }, [uid, loaded, attempt]);

  // 2. Live listeners while aligned
  useEffect(() => {
    if (status !== 'live' || !uid) return;
    known.current = new Map();
    ready.current = new Set();
    knownSettings.current = null;
    knownPasscodes.current = null;
    const since = isoDaysAgo(SYS_DATE, LOG_WINDOW_DAYS);
    const unsubs: Array<() => void> = [];

    for (const spec of SYNCED_COLLECTIONS) {
      const map = new Map<string, Known>();
      known.current.set(spec.name, map);
      if (spec.log) {
        // Older records are assumed to be in the cloud already (they were uploaded or downloaded)
        for (const item of listsRef.current[spec.name]?.items ?? []) {
          map.set(item.id, { ref: item, json: stable(item), data: JSON.parse(stable(item)) });
        }
      }
      const q = spec.log ? query(shopCollection(spec.name), where('date', '>=', since)) : shopCollection(spec.name);
      let first = true;
      unsubs.push(onSnapshot(q, (snap) => {
        const remote = new Map<string, any>();
        const removed = new Set<string>();
        for (const ch of snap.docChanges()) {
          const id = ch.doc.id;
          if (ch.type === 'removed') {
            // For logs a "removed" may just mean the record left the date window
            if (!spec.log) removed.add(id);
            continue;
          }
          remote.set(id, { ...ch.doc.data(), id });
        }
        const list = listsRef.current[spec.name];
        if (!list) return;
        let local = list.items;
        if (first && !spec.log && !snap.empty) {
          // The first snapshot is the cloud truth: drop local records deleted on other devices
          const ids = new Set(snap.docs.map((d) => d.id));
          for (const item of local) if (!ids.has(item.id)) removed.add(item.id);
        }
        first = false;
        if (remote.size === 0 && removed.size === 0) { ready.current.add(spec.name); return; }
        const merged = mergeRemote(local, remote, removed);
        for (const [id, r] of remote) {
          const json = stable(r);
          map.set(id, { ref: merged.find((m) => m.id === id), json, data: JSON.parse(json) });
        }
        for (const id of removed) map.delete(id);
        ready.current.add(spec.name);
        list.set(merged);
        storage.setJSON(spec.storageKey, merged);
      }, (err) => console.warn(`Live sync stopped for ${spec.name}`, err)));
    }

    unsubs.push(onSnapshot(shopDoc('settings', 'global_config'), (snap) => {
      if (!snap.exists()) { knownSettings.current = ''; return; }
      const remote = snap.data() as Record<string, unknown>;
      knownSettings.current = stable(remote);
      if (stable(sharedSettings(settingsRef.current)) === knownSettings.current) return;
      const deviceOnly: Record<string, unknown> = {};
      for (const k of DEVICE_ONLY_SETTINGS) deviceOnly[k] = (settingsRef.current as any)[k];
      const next = { ...(remote as any), ...deviceOnly } as SystemSettings;
      setSettings(next);
      storage.setJSON('pos_settings', next);
    }));

    unsubs.push(onSnapshot(shopDoc('accounts', 'passcodes'), (snap) => {
      if (!snap.exists()) { knownPasscodes.current = ''; return; }
      const remote = snap.data() as { admin?: string; kaseer?: string };
      knownPasscodes.current = stable({ admin: remote.admin || '', kaseer: remote.kaseer || '' });
      if (stable(readPasscodes()) === knownPasscodes.current) return;
      if (remote.admin) storage.setItem(PASSCODE_KEYS.admin, remote.admin);
      if (remote.kaseer) storage.setItem(PASSCODE_KEYS.kaseer, remote.kaseer);
      window.dispatchEvent(new Event(PASSCODES_CHANGED_EVENT));
    }));

    return () => unsubs.forEach((u) => u());
  }, [status, uid]);

  // 3. Send local changes (runs whenever any list changes)
  const listVersions = SYNCED_COLLECTIONS.map((s) => lists[s.name]?.items);
  useEffect(() => {
    if (status !== 'live') return;
    for (const spec of SYNCED_COLLECTIONS) {
      if (!ready.current.has(spec.name)) continue;
      const items = lists[spec.name]?.items ?? [];
      const map = known.current.get(spec.name)!;
      // Guard against a list that is briefly empty or half-loaded wiping the cloud
      const present = new Set(items.map((i) => i.id));
      const missing = [...map.keys()].filter((id) => !present.has(id)).length;
      const allowDeletes = !(missing > 20 && missing > map.size / 2);
      if (!allowDeletes) console.warn(`Live sync: not deleting ${missing} ${spec.name} records at once`);
      const changes = diffLocal(items, map, spec, { allowDeletes });
      if (changes.length) commit(changeOps(spec.name, changes)).catch((err) => console.warn(`Sync write failed for ${spec.name}`, err));
    }
    // Passcodes of the built-in accounts change together with the users list
    if (knownPasscodes.current !== null) {
      const local = readPasscodes();
      const json = stable(local);
      if (json !== knownPasscodes.current && (local.admin || local.kaseer)) {
        knownPasscodes.current = json;
        commit([(b) => b.set(shopDoc('accounts', 'passcodes'), local)]).catch((err) => console.warn('Passcode sync failed', err));
      }
    }
  }, [status, ...listVersions]);

  useEffect(() => {
    if (status !== 'live' || knownSettings.current === null) return;
    const shared = sharedSettings(settings);
    const json = stable(shared);
    if (json === knownSettings.current) return;
    knownSettings.current = json;
    commit([(b) => b.set(shopDoc('settings', 'global_config'), JSON.parse(json))]).catch((err) => console.warn('Settings sync failed', err));
  }, [status, settings]);

  // --- one-time alignment helpers ---
  async function uploadEverything() {
    const ops: Array<(b: ReturnType<typeof writeBatch>) => void> = [];
    for (const spec of SYNCED_COLLECTIONS) {
      for (const item of listsRef.current[spec.name]?.items ?? []) {
        const data = JSON.parse(stable(item));
        ops.push((b) => b.set(shopDoc(spec.name, item.id), data));
      }
    }
    const shared = JSON.parse(stable(sharedSettings(settingsRef.current)));
    ops.push((b) => b.set(shopDoc('settings', 'global_config'), shared));
    const pass = readPasscodes();
    if (pass.admin || pass.kaseer) ops.push((b) => b.set(shopDoc('accounts', 'passcodes'), pass));
    await commit(ops);
  }

  async function downloadEverything() {
    for (const spec of SYNCED_COLLECTIONS) {
      const snap = await getDocs(shopCollection(spec.name));
      // A list the cloud does not have yet (e.g. users uploaded by an older version) keeps this
      // device's copy; live sync then uploads it instead of wiping it here.
      if (snap.empty) continue;
      let rows: Array<{ id: string }> = snap.docs.map((d) => ({ ...(d.data() as DocumentData), id: d.id }));
      if (spec.log) {
        // Sales, returns... are never dropped: records only this device has are kept and uploaded
        const inCloud = new Set(rows.map((r) => r.id));
        const localOnly = (listsRef.current[spec.name]?.items ?? []).filter((r) => r?.id && !inCloud.has(r.id));
        if (localOnly.length) {
          await commit(localOnly.map((r) => { const data = JSON.parse(stable(r)); return (b) => b.set(shopDoc(spec.name, r.id), data); }));
          rows = [...rows, ...localOnly];
        }
        rows.sort((a: any, b: any) => String(b.date || '').localeCompare(String(a.date || '')));
      }
      listsRef.current[spec.name]?.set(rows);
      storage.setJSON(spec.storageKey, rows);
    }
    const cfg = await getDocs(query(shopCollection('settings'), limit(5)));
    const global = cfg.docs.find((d) => d.id === 'global_config');
    if (global) {
      const deviceOnly: Record<string, unknown> = {};
      for (const k of DEVICE_ONLY_SETTINGS) deviceOnly[k] = (settingsRef.current as any)[k];
      const next = { ...(global.data() as any), ...deviceOnly } as SystemSettings;
      setSettings(next);
      storage.setJSON('pos_settings', next);
    }
    const acc = await getDocs(query(shopCollection('accounts'), limit(5)));
    const pass = acc.docs.find((d) => d.id === 'passcodes')?.data() as { admin?: string; kaseer?: string } | undefined;
    if (pass?.admin) storage.setItem(PASSCODE_KEYS.admin, pass.admin);
    if (pass?.kaseer) storage.setItem(PASSCODE_KEYS.kaseer, pass.kaseer);
    if (pass) window.dispatchEvent(new Event(PASSCODES_CHANGED_EVENT));
  }

  return {
    status,
    signedIn: !!uid,
    retry: () => setAttempt((n) => n + 1),
    choicePending,
    resolveChoice,
    /**
     * New device joining from the login screen: download the shop without asking, even if
     * this device was linked to the cloud before. Call before (or right after) signing in.
     */
    joinByDownload: () => {
      presetChoice.current = 'download';
      storage.removeItem(ALIGNED_KEY);
      setAttempt((n) => n + 1);
    },
  };
}
