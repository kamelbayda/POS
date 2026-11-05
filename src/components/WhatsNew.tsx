import { useEffect, useState } from 'react';
import * as storage from '../lib/storage';
import { WHATS_NEW, WhatsNewEntry, OPEN_WHATS_NEW_EVENT, markWhatsNewSeen, unseenWhatsNew } from '../lib/whatsNew';

/**
 * "What's new" window: opens by itself once after an update (not over the lock screen), and
 * from the footer link at any time (then it lists every entry).
 */
export function WhatsNew() {
  const [entries, setEntries] = useState<WhatsNewEntry[] | null>(null);

  useEffect(() => {
    const open = () => setEntries(WHATS_NEW);
    window.addEventListener(OPEN_WHATS_NEW_EVENT, open);
    const unseen = unseenWhatsNew();
    let timer: ReturnType<typeof setInterval> | undefined;
    if (unseen && unseen.length) {
      // wait until the screen is unlocked, so it is read by someone using the program
      const tryShow = () => {
        if (document.getElementById('lock-screen-container')) return;
        clearInterval(timer);
        setEntries(unseen);
      };
      timer = setInterval(tryShow, 1500);
      tryShow();
    }
    return () => { window.removeEventListener(OPEN_WHATS_NEW_EVENT, open); clearInterval(timer); };
  }, []);

  if (!entries) return null;
  const ar = (storage.getItem('pos_language') || 'ar') !== 'en';
  const close = () => { markWhatsNewSeen(); setEntries(null); };
  const fmt = (d: string) => {
    try { return new Date(d + 'T12:00:00').toLocaleDateString(ar ? 'ar-LB' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return d; }
  };

  return (
    <div className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4" onClick={close} id="whats-new">
      <div
        dir={ar ? 'rtl' : 'ltr'}
        className="bg-white text-slate-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col font-sans"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="whats-new-title"
      >
        <div className="bg-[#1E1B16] px-6 py-4 flex items-center gap-3">
          <span className="text-2xl">🐝</span>
          <h2 id="whats-new-title" className="text-lg font-black text-[#FFC21A]">{ar ? 'ما الجديد في BeeCash' : "What's new in BeeCash"}</h2>
        </div>
        <div className="overflow-y-auto px-6 py-4 space-y-5">
          {entries.map((e) => (
            <section key={e.id}>
              <div className="text-xs font-black text-[#B98600] mb-2">{fmt(e.date)}</div>
              <ul className="space-y-2">
                {(ar ? e.ar : e.en).map((line, i) => (
                  <li key={i} className="text-sm leading-relaxed bg-amber-50/60 border border-amber-100 rounded-xl px-3 py-2">{line}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button type="button" id="whats-new-close" onClick={close}
            className="bg-[#1D9E75] hover:bg-[#15805e] text-white font-black text-sm px-6 py-2.5 rounded-xl cursor-pointer">
            {ar ? 'تمام، فهمت' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
}
