/**
 * Lets the licence admin page list who is using the program (trying it or subscribed):
 * shop, kind, owner, this device and how many invoices it has made. Sent when the program
 * opens and then at most every few minutes, only when something changed or an hour went by.
 */
import * as storage from './storage';
import { getDeviceId, getDeviceLabel, getShopUid, licenseServerUrl } from './license';

export interface TrialInfo {
  shopName: string;
  businessType?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  invoicesUsed: number;
  licenseKey?: string;
}

const LAST_KEY = 'pos_trial_ping';
const MIN_GAP_MS = 5 * 60 * 1000;
const REFRESH_MS = 60 * 60 * 1000;

export async function reportUsage(info: TrialInfo): Promise<void> {
  const server = licenseServerUrl();
  // nothing to report until the visitor has at least picked the kind of shop
  if (!info.businessType) return;
  if (!server || typeof navigator !== 'undefined' && navigator.onLine === false) return;
  const body = {
    deviceId: getDeviceId(), shopUid: getShopUid(), deviceLabel: getDeviceLabel(),
    shopName: info.shopName, businessType: info.businessType, ownerName: info.ownerName,
    ownerEmail: info.ownerEmail, ownerPhone: info.ownerPhone, invoicesUsed: info.invoicesUsed, licenseKey: info.licenseKey || null,
  };
  const signature = JSON.stringify(body);
  // who/what the shop is; a change here is sent at once, a new invoice count waits a few minutes
  const identity = JSON.stringify({ ...body, invoicesUsed: undefined });
  const last = storage.getJSON<{ at: number; sig: string; id?: string }>(LAST_KEY, { at: 0, sig: '' });
  const age = Date.now() - last.at;
  if (last.id === identity && (age < MIN_GAP_MS || (last.sig === signature && age < REFRESH_MS))) return;
  try {
    const res = await fetch(`${server}/api/trials/ping`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: signature });
    if (res.ok) storage.setJSON(LAST_KEY, { at: Date.now(), sig: signature, id: identity });
  } catch {
    // offline: try again next time
  }
}

export interface InboxMessage { id: string; text: string; createdAt: string }

/** Messages the admin sent to this device (while on trial). Empty when offline or not configured. */
export async function fetchInbox(): Promise<InboxMessage[]> {
  const server = licenseServerUrl();
  if (!server || typeof navigator !== 'undefined' && navigator.onLine === false) return [];
  try {
    const res = await fetch(`${server}/api/trials/inbox?deviceId=${encodeURIComponent(getDeviceId())}`);
    const data = await res.json();
    return res.ok && Array.isArray(data.messages) ? data.messages : [];
  } catch {
    return [];
  }
}

/** Tells the admin page the message was seen, so it is not shown again. */
export async function markMessageRead(id: string): Promise<void> {
  const server = licenseServerUrl();
  if (!server) return;
  try {
    await fetch(`${server}/api/trials/messages/${encodeURIComponent(id)}/read`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: getDeviceId() }),
    });
  } catch {
    // offline: shown again next time
  }
}
