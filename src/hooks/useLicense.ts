import { useCallback, useEffect, useState } from 'react';
import * as storage from '../lib/storage';
import {
  LicenseError,
  LicensePayload,
  LICENSE_ERROR_MESSAGES,
  activateLicense,
  getDeviceId,
  refreshLicense,
  verifyLicenseToken,
} from '../lib/license';

const TOKEN_KEY = 'pos_license_token';
const CLOCK_KEY = 'pos_license_clock';
const LEGACY_KEY = 'pos_activation_key';
const GRACE_KEY = 'pos_legacy_grace_until';
const DAY_MS = 24 * 60 * 60 * 1000;
const REFRESH_EVERY_MS = 6 * 60 * 60 * 1000;
// Tolerate small clock corrections, but not turning the date back to stretch a subscription
const CLOCK_TOLERANCE_MS = 2 * DAY_MS;
const LEGACY_GRACE_DAYS = 30;

interface Deps {
  shopName: string;
  lang: 'ar' | 'en';
  showToast: (type: 'success' | 'error' | 'warning', message: string) => void;
  /** Called after a successful activation (e.g. to open the owner setup wizard). */
  onActivated?: () => void;
}

/**
 * Licence state for this installation.
 * `isActivated` is what the rest of the app checks (e.g. to lift the trial invoice limit).
 */
export function useLicense({ shopName, lang, showToast, onActivated }: Deps) {
  const [token, setToken] = useState<string | null>(() => storage.getItem(TOKEN_KEY));
  const [license, setLicense] = useState<LicensePayload | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [isActivating, setIsActivating] = useState(false);
  const [activationErrorMsg, setActivationErrorMsg] = useState('');

  // Installs activated with the old (insecure) key scheme get a grace period to get a new key
  const [graceUntil] = useState<number>(() => {
    const saved = Number(storage.getItem(GRACE_KEY)) || 0;
    if (saved) return saved;
    if (storage.getItem(LEGACY_KEY) && !storage.getItem(TOKEN_KEY)) {
      const until = Date.now() + LEGACY_GRACE_DAYS * DAY_MS;
      storage.setItem(GRACE_KEY, until);
      return until;
    }
    return 0;
  });

  // Verify the stored token's signature (async WebCrypto)
  useEffect(() => {
    let cancelled = false;
    verifyLicenseToken(token).then((payload) => {
      if (!cancelled) setLicense(payload && payload.deviceId === getDeviceId() ? payload : null);
    });
    return () => { cancelled = true; };
  }, [token]);

  // Tick every minute and remember the latest time seen, to detect the clock being turned back
  useEffect(() => {
    const tick = () => {
      const t = Date.now();
      const maxSeen = Number(storage.getItem(CLOCK_KEY)) || 0;
      if (t > maxSeen) storage.setItem(CLOCK_KEY, t);
      setNow(t);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const saveToken = (next: string | null) => {
    if (next) storage.setItem(TOKEN_KEY, next);
    else storage.removeItem(TOKEN_KEY);
    setToken(next);
  };

  const message = (error: LicenseError) => LICENSE_ERROR_MESSAGES[error][lang];

  // Re-check with the server when online, so revoked/expired keys stop working
  const refresh = useCallback(async () => {
    if (!license) return;
    const result = await refreshLicense(license.key);
    if (!('error' in result)) {
      saveToken(result.token);
      // The server just confirmed the licence against its own clock, so the local clock can be trusted again
      // (this also un-sticks a device whose date was once set too far ahead and then corrected)
      storage.setItem(CLOCK_KEY, Date.now());
      setNow(Date.now());
    } else if (['revoked', 'expired', 'device_mismatch', 'invalid_key'].includes(result.error)) {
      saveToken(null);
      showToast('error', message(result.error));
    }
    // network / server errors: keep working offline on the signed licence
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [license?.key, lang]);

  // Keyed on the licence key only: a refresh stores a new token (new issuedAt), which must not re-trigger this
  const licenseKey = license?.key;
  useEffect(() => {
    if (!licenseKey) return;
    refresh();
    const id = setInterval(refresh, REFRESH_EVERY_MS);
    window.addEventListener('online', refresh);
    return () => { clearInterval(id); window.removeEventListener('online', refresh); };
  }, [refresh, licenseKey]);

  const clockTampered = now + CLOCK_TOLERANCE_MS < (Number(storage.getItem(CLOCK_KEY)) || 0);
  const isLicensed = !!license && !clockTampered && (license.expiresAt === null || license.expiresAt > now);
  const inGracePeriod = !isLicensed && graceUntil > now;
  const daysRemaining = !isLicensed ? 0 : license!.expiresAt === null ? null : Math.max(0, Math.ceil((license!.expiresAt - now) / DAY_MS));
  const graceDaysLeft = inGracePeriod ? Math.ceil((graceUntil - now) / DAY_MS) : 0;

  const applyActivation = async (key: string) => {
    setActivationErrorMsg('');
    if (!key.trim()) {
      setActivationErrorMsg(message('bad_request'));
      return;
    }
    setIsActivating(true);
    const result = await activateLicense(key, shopName);
    setIsActivating(false);
    if ('error' in result) {
      setActivationErrorMsg('❌ ' + message(result.error));
      showToast('error', message(result.error));
      return;
    }
    saveToken(result.token);
    storage.removeItem(LEGACY_KEY);
    showToast('success', lang === 'ar' ? 'تم تفعيل البرنامج بنجاح! شكراً لثقتكم بنا.' : 'Program activated successfully! Thank you for your trust.');
    onActivated?.();
  };

  /**
   * Proves the person at the till owns this install, for "forgot password". On a licensed
   * device the key must match the active licence; otherwise the key is activated now, which
   * the server only allows for a valid key that is free or already bound to this device.
   */
  const verifyOwnerKey = async (rawKey: string): Promise<{ ok: true } | { ok: false; error: string }> => {
    const key = rawKey.trim().toUpperCase();
    if (!key) return { ok: false, error: message('bad_request') };
    if (isLicensed && license) {
      return license.key === key ? { ok: true } : { ok: false, error: message('invalid_key') };
    }
    const result = await activateLicense(key, shopName);
    if ('error' in result) return { ok: false, error: message(result.error) };
    saveToken(result.token);
    storage.removeItem(LEGACY_KEY);
    return { ok: true };
  };

  const deactivate = () => {
    saveToken(null);
    storage.removeItem(LEGACY_KEY);
    storage.removeItem('pos_setup_wizard_completed');
  };

  return {
    /** Licensed, or still inside the grace period for old-style keys. */
    isActivated: isLicensed || inGracePeriod,
    isLicensed,
    license: isLicensed ? license : null,
    /** Days left on an annual licence; null for lifetime; 0 when not licensed. */
    daysRemaining,
    inGracePeriod,
    graceDaysLeft,
    clockTampered,
    isActivating,
    activationErrorMsg,
    setActivationErrorMsg,
    applyActivation,
    verifyOwnerKey,
    deactivate,
  };
}

export type LicenseState = ReturnType<typeof useLicense>;
