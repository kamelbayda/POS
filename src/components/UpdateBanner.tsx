import { useEffect, useState } from 'react';
import * as storage from '../lib/storage';
import { applyUpdate, isUpdateReady, onUpdateReady } from '../lib/appUpdates';

/** Shown on every screen (lock and login included) once a new version is waiting. */
export function UpdateBanner() {
  const [ready, setReady] = useState(isUpdateReady());
  const [hidden, setHidden] = useState(false);
  useEffect(() => onUpdateReady(() => { setReady(true); setHidden(false); }), []);
  if (!ready || hidden) return null;
  const ar = (storage.getItem('pos_language') || 'ar') !== 'en';
  return (
    <div
      id="app-update-banner"
      dir={ar ? 'rtl' : 'ltr'}
      role="alert"
      className="fixed bottom-4 inset-x-0 mx-auto z-[9999] w-[min(560px,calc(100%-32px))] bg-[#1E1B16] text-white border-2 border-[#FFC21A] rounded-2xl shadow-2xl p-4 flex flex-wrap items-center gap-3 font-sans"
    >
      <span className="text-2xl">🐝</span>
      <div className="flex-1 min-w-[200px]">
        <div className="font-black text-[#FFC21A] text-sm">{ar ? 'يوجد تحديث جديد للبرنامج' : 'A new version is available'}</div>
        <div className="text-xs text-slate-200 mt-0.5">
          {ar ? 'الرجاء إغلاق البرنامج وإعادة تشغيله من جديد، أو اضغط "تحديث الآن".' : 'Please close the app and open it again, or tap "Update now".'}
        </div>
      </div>
      <button type="button" id="app-update-now" onClick={applyUpdate}
        className="bg-[#FFC21A] hover:bg-[#ffd34d] text-[#1E1B16] font-black text-sm px-4 py-2 rounded-xl cursor-pointer">
        {ar ? 'تحديث الآن' : 'Update now'}
      </button>
      <button type="button" onClick={() => setHidden(true)} aria-label={ar ? 'لاحقاً' : 'Later'}
        className="text-slate-300 hover:text-white text-xs font-bold px-2 py-2 cursor-pointer">
        {ar ? 'لاحقاً' : 'Later'}
      </button>
    </div>
  );
}
