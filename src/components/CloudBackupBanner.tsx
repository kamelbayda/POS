import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { useStoredState } from '../lib/storage';

interface CloudBackupBannerProps {
  lang: 'ar' | 'en';
  SYS_DATE: string;
  isAdmin: boolean;
  openCloudSync: () => void;
}

/**
 * Reminds the admin to turn on cloud sync. Local data lives in this browser/computer only,
 * so without sync, clearing browser data or losing the computer loses the shop's records.
 * "Later" hides it until the next day.
 */
export function CloudBackupBanner({ lang, SYS_DATE, isAdmin, openCloudSync }: CloudBackupBannerProps) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [dismissedOn, setDismissedOn] = useStoredState<string>('cloudBackupReminderDismissed', '');

  useEffect(() => onAuthStateChanged(auth, (user) => setSignedIn(!!user)), []);

  if (!isAdmin || signedIn !== false || dismissedOn === SYS_DATE) return null;

  return (
    <div className="bg-sky-500/10 border-t border-b border-sky-500/20 px-4 sm:px-6 lg:px-4 py-1.5 flex justify-between items-center text-[11px] text-sky-900 font-bold no-print gap-3" id="cloud-backup-banner">
      <span>
        {lang === 'ar'
          ? '☁️ بياناتك محفوظة على هذا الجهاز فقط. شغّل المزامنة السحابية حتى لا تضيع إذا مُسحت بيانات المتصفح أو تعطّل الجهاز.'
          : '☁️ Your data is stored on this device only. Turn on cloud sync so it is not lost if browser data is cleared or the computer fails.'}
      </span>
      <span className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={openCloudSync}
          className="bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-[10px] py-1 px-3 rounded-lg transition duration-150 cursor-pointer"
        >
          {lang === 'ar' ? 'تشغيل المزامنة' : 'Turn on sync'}
        </button>
        <button
          type="button"
          onClick={() => setDismissedOn(SYS_DATE)}
          className="text-sky-800 hover:text-sky-950 font-bold text-[10px] py-1 px-2 rounded-lg cursor-pointer"
        >
          {lang === 'ar' ? 'لاحقاً' : 'Later'}
        </button>
      </span>
    </div>
  );
}
