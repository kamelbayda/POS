/**
 * Keeps an open app up to date. The service worker (vite-plugin-pwa, autoUpdate) installs a new
 * version as soon as it finds one and the page reloads into it, so the only question is when to
 * look: a tablet can stay open on the till for days. We look every 15 minutes, and when the app
 * comes back to the foreground, but only at a quiet moment, so a sale is never cut by a reload:
 * the screen is locked or on the login page, or nobody has touched it for 3 minutes and nothing
 * is being typed. (The cart and the purchase draft are saved on the device anyway.)
 */
const CHECK_EVERY_MS = 15 * 60 * 1000;
const IDLE_MS = 3 * 60 * 1000;

let lastActivity = Date.now();

function quietMoment(): boolean {
  if (document.visibilityState !== 'visible' || !navigator.onLine) return false;
  const el = document.activeElement as HTMLElement | null;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return false;
  if (document.getElementById('lock-screen-container') || document.getElementById('username')) return true;
  return Date.now() - lastActivity >= IDLE_MS;
}

export function keepAppUpdated(registration: ServiceWorkerRegistration | undefined) {
  if (!registration) return;
  for (const type of ['pointerdown', 'keydown', 'touchstart']) {
    window.addEventListener(type, () => { lastActivity = Date.now(); }, { passive: true, capture: true });
  }
  const check = () => {
    if (quietMoment()) registration.update().catch(() => {});
  };
  setInterval(check, CHECK_EVERY_MS);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
}
