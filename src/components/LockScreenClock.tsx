import React, { useEffect, useState } from 'react';

// Independent high-performance ticking clock component for the elegant lock screen
export const LockScreenClock = ({ lang }: { lang: 'en' | 'ar' }) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hoursStr = time.toLocaleTimeString(lang === 'ar' ? 'ar-LB' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  const secondsStr = time.toLocaleTimeString(lang === 'ar' ? 'ar-LB' : 'en-US', {
    second: '2-digit'
  });

  const dateStr = time.toLocaleDateString(lang === 'ar' ? 'ar-LB' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-1.5 text-center md:text-right font-sans">
      <div className="flex items-baseline justify-center md:justify-end gap-1.5 flex-row-reverse md:flex-row">
        <span className="text-sm font-bold text-slate-350 shrink-0">
          {hoursStr.includes('PM') || hoursStr.includes('م') ? (lang === 'ar' ? 'مساً' : 'PM') : (lang === 'ar' ? 'صباحاً' : 'AM')}
        </span>
        <span className="text-lg font-bold text-emerald-400 animate-pulse font-mono shrink-0">
          :{secondsStr}
        </span>
        <span className="text-5xl font-black tracking-tight text-white drop-shadow-md shrink-0">
          {hoursStr.replace(/\s*[AMP]+|[\u0635\u0645]/g, '')}
        </span>
      </div>
      <div className="text-xs font-semibold text-slate-350 tracking-wide">
        {dateStr}
      </div>
    </div>
  );
};
