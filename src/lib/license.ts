/**
 * POS licensing client.
 *
 * Keys are issued and bound to a device by the licence server (super-app-backend).
 * The server returns a licence token signed with ECDSA P-256; the app verifies it
 * offline with the public key below, so it works without internet and a token
 * cannot be forged or edited (e.g. to push the expiry date).
 */
import * as storage from './storage';

export interface LicensePayload {
  v: number;
  key: string;
  deviceId: string;
  shop: string | null;
  plan: 'year' | 'life';
  issuedAt: number;
  /** Epoch ms, or null for lifetime licences. */
  expiresAt: number | null;
}

export type LicenseError =
  | 'invalid_key'
  | 'revoked'
  | 'expired'
  | 'device_mismatch'
  | 'rate_limited'
  | 'bad_request'
  | 'network'
  | 'not_configured'
  | 'bad_signature'
  | 'server_error';

export type LicenseResult = { ok: true; token: string; payload: LicensePayload } | { ok: false; error: LicenseError };

const PUBLIC_KEY_B64 = (import.meta.env.VITE_LICENSE_PUBLIC_KEY as string | undefined) || '';
const SERVER_URL = ((import.meta.env.VITE_LICENSE_SERVER_URL as string | undefined) || '').replace(/\/$/, '');

export const isLicensingConfigured = () => Boolean(PUBLIC_KEY_B64 && SERVER_URL);

/** A random id for this installation, created once and remembered on the device. */
export function getDeviceId(): string {
  let id = storage.getItem('pos_device_id');
  if (!id) {
    id = crypto.randomUUID();
    storage.setItem('pos_device_id', id);
  }
  return id;
}

const fromB64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const fromB64Url = (s: string) => fromB64(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));

let publicKeyPromise: Promise<CryptoKey> | null = null;
function getPublicKey(): Promise<CryptoKey> {
  if (!publicKeyPromise) {
    publicKeyPromise = crypto.subtle.importKey('spki', fromB64(PUBLIC_KEY_B64), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  }
  return publicKeyPromise;
}

/** Returns the payload if the token carries a valid signature, otherwise null. */
export async function verifyLicenseToken(token: string | null | undefined): Promise<LicensePayload | null> {
  if (!token || !PUBLIC_KEY_B64) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      await getPublicKey(),
      fromB64Url(sig),
      new TextEncoder().encode(body)
    );
    if (!ok) return null;
    return JSON.parse(new TextDecoder().decode(fromB64Url(body))) as LicensePayload;
  } catch {
    return null;
  }
}

async function callServer(path: 'activate' | 'refresh', body: Record<string, string>): Promise<LicenseResult> {
  if (!isLicensingConfigured()) return { ok: false, error: 'not_configured' };
  let res: Response;
  try {
    res = await fetch(`${SERVER_URL}/api/licenses/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: 'network' };
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) return { ok: false, error: (data?.error as LicenseError) || 'server_error' };
  const payload = await verifyLicenseToken(data.token);
  if (!payload || payload.deviceId !== body.deviceId) return { ok: false, error: 'bad_signature' };
  return { ok: true, token: data.token, payload };
}

export const activateLicense = (key: string, shopName: string) =>
  callServer('activate', { key: key.trim().toUpperCase(), deviceId: getDeviceId(), shopName });

export const refreshLicense = (key: string) =>
  callServer('refresh', { key, deviceId: getDeviceId() });

export const LICENSE_ERROR_MESSAGES: Record<LicenseError, { ar: string; en: string }> = {
  invalid_key: { ar: 'كود التفعيل غير صحيح.', en: 'Invalid activation key.' },
  revoked: { ar: 'تم إيقاف هذا الترخيص. تواصل معنا.', en: 'This licence has been revoked. Please contact us.' },
  expired: { ar: 'انتهت صلاحية هذا الاشتراك. جدّد الاشتراك للمتابعة.', en: 'This subscription has expired. Please renew.' },
  device_mismatch: { ar: 'هذا الكود مفعّل على جهاز آخر. تواصل معنا لنقله لهذا الجهاز.', en: 'This key is already active on another computer. Contact us to move it.' },
  rate_limited: { ar: 'محاولات كثيرة، حاول بعد قليل.', en: 'Too many attempts, try again shortly.' },
  bad_request: { ar: 'الرجاء كتابة كود التفعيل.', en: 'Please enter an activation key.' },
  network: { ar: 'تعذّر الاتصال بخادم التفعيل. تأكد من الإنترنت وحاول مجدداً.', en: 'Could not reach the activation server. Check your internet connection.' },
  not_configured: { ar: 'خادم التفعيل غير مُعدّ في هذه النسخة.', en: 'The activation server is not configured in this build.' },
  bad_signature: { ar: 'رد غير صالح من خادم التفعيل.', en: 'Invalid response from the activation server.' },
  server_error: { ar: 'خطأ في خادم التفعيل، حاول لاحقاً.', en: 'Activation server error, try again later.' },
};
