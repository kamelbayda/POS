/**
 * Self-service subscriptions: the shop picks its business type and a period, sends a
 * request to the licence server, pays the shop owner (Whish, OMT, cash...), and once the
 * request is approved on the admin page the app receives its key and activates itself.
 */
import * as storage from './storage';

export type BusinessType = 'supermarket' | 'phones';
export type Period = 'month' | 'year' | 'life';

export const BUSINESS_TYPES: Array<{ id: BusinessType; icon: string; ar: string; en: string; descAr: string; descEn: string }> = [
  { id: 'supermarket', icon: '🛒', ar: 'سوبرماركت', en: 'Supermarket', descAr: 'بقالة، ميني ماركت، سوبرماركت', descEn: 'Grocery, minimarket, supermarket' },
  { id: 'phones', icon: '📱', ar: 'محل تلفونات', en: 'Phone shop', descAr: 'تلفونات، إكسسوارات، تصليح، تشريج', descEn: 'Phones, accessories, repairs, top-ups' },
];
export const PERIODS: Array<{ id: Period; ar: string; en: string }> = [
  { id: 'month', ar: 'شهري', en: 'Monthly' },
  { id: 'year', ar: 'سنوي', en: 'Yearly' },
  { id: 'life', ar: 'مدى الحياة', en: 'Lifetime' },
];

export interface Plans {
  currency: string;
  prices: Record<BusinessType, Record<Period, number | null>>;
  paymentInfo: string;
}

export interface StoredRequest {
  id: string;
  secret: string;
  businessType: BusinessType;
  period: Period;
  paymentInfo: string;
  submittedAt: number;
}

const REQUEST_KEY = 'pos_subscription_request';
const SERVER_URL = ((import.meta.env.VITE_LICENSE_SERVER_URL as string | undefined) || '').replace(/\/$/, '');

export const getStoredRequest = () => storage.getJSON<StoredRequest | null>(REQUEST_KEY, null);
export const clearStoredRequest = () => storage.removeItem(REQUEST_KEY);

export async function fetchPlans(): Promise<Plans | null> {
  try {
    const res = await fetch(`${SERVER_URL}/api/plans`);
    const data = await res.json();
    return data.ok ? data.plans : null;
  } catch {
    return null;
  }
}

export async function submitRequest(input: {
  businessType: BusinessType; period: Period; shopName: string; ownerName: string; email: string; phone: string; note: string;
}, paymentInfo: string): Promise<{ ok: true; request: StoredRequest } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${SERVER_URL}/api/requests`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!data.ok) return { ok: false, error: data.error || 'server_error' };
    const request: StoredRequest = {
      id: data.id, secret: data.secret, businessType: input.businessType, period: input.period, paymentInfo, submittedAt: Date.now(),
    };
    storage.setJSON(REQUEST_KEY, request);
    return { ok: true, request };
  } catch {
    return { ok: false, error: 'network' };
  }
}

/** Current state of the stored request; null when it cannot be reached right now. */
export async function checkRequest(req: StoredRequest): Promise<{ status: 'pending' | 'approved' | 'rejected'; licenseKey: string | null } | null> {
  try {
    const res = await fetch(`${SERVER_URL}/api/requests/${encodeURIComponent(req.id)}?secret=${encodeURIComponent(req.secret)}`);
    const data = await res.json();
    return data.ok ? { status: data.status, licenseKey: data.licenseKey } : null;
  } catch {
    return null;
  }
}
