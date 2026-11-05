/**
 * New versions of the app. The service worker (vite-plugin-pwa, "prompt" mode) downloads a new
 * version in the background and keeps it waiting; the app then shows a message asking to close
 * and reopen it (or tap "update now"). Closing and reopening the app starts the new version.
 *
 * A tablet can stay open on the till for days, so while the app is open we look for a new version
 * every 15 minutes and whenever it comes back to the foreground. When the screen is locked or on
 * the login page (nobody is selling) and nothing is being typed, the waiting version is applied
 * right away instead of waiting for someone to read the message.
 */
const CHECK_EVERY_MS = 15 * 60 * 1000;

let applyWaiting: ((reload?: boolean) => Promise<void>) | null = null;
let updateReady = false;
const listeners = new Set<() => void>();

export const isUpdateReady = () => updateReady;
export function onUpdateReady(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Starts the waiting version now (the page reloads into it). */
export function applyUpdate() {
  if (applyWaiting) applyWaiting(true).catch(() => location.reload());
  else location.reload();
}

function nobodyWorking(): boolean {
  if (document.visibilityState !== 'visible') return false;
  const el = document.activeElement as HTMLElement | null;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return false;
  return !!(document.getElementById('lock-screen-container') || document.getElementById('username'));
}

/** Called by the service worker registration when a new version has been downloaded. */
export function newVersionWaiting(update: (reload?: boolean) => Promise<void>) {
  applyWaiting = update;
  updateReady = true;
  listeners.forEach((l) => l());
  if (nobodyWorking()) applyUpdate();
}

export function keepAppUpdated(registration: ServiceWorkerRegistration | undefined) {
  if (!registration) return;
  const check = () => {
    if (updateReady) { if (nobodyWorking()) applyUpdate(); return; }
    if (document.visibilityState === 'visible' && navigator.onLine) registration.update().catch(() => {});
  };
  setInterval(check, CHECK_EVERY_MS);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
}
