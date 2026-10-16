import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { BeeCashMark } from '../components/BeeCashLogo';

interface TrialMessageModalProps {
  lang: 'ar' | 'en';
  text: string;
  /** Shown when there are more messages after this one. */
  more: number;
  onSubscribe: () => void;
  onClose: () => void;
}

/** A message from BeeCash to a shop on trial, with a way to subscribe right away. */
export function TrialMessageModal({ lang, text, more, onSubscribe, onClose }: TrialMessageModalProps) {
  const ar = lang === 'ar';
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[210] flex items-center justify-center p-4" id="trial-message" dir={ar ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
        <div className="bg-[#1E1B16] text-white px-6 py-5 flex items-center gap-3 relative">
          <BeeCashMark className="w-11 h-11 shrink-0" />
          <div>
            <div className="font-black text-lg">{ar ? 'رسالة من BeeCash' : 'A message from BeeCash'}</div>
            <div className="text-xs text-[#FFC21A] font-bold">🐝 {ar ? 'فريق BeeCash' : 'The BeeCash team'}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="close" className="absolute top-3 left-3 p-1 rounded-lg hover:bg-white/10 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <p className="text-slate-800 text-base leading-relaxed whitespace-pre-line" id="trial-message-text">{text}</p>
          <div className="flex gap-2">
            <button type="button" id="btn-trial-message-subscribe" onClick={onSubscribe}
              className="flex-1 flex items-center justify-center gap-2 bg-[#1D9E75] hover:bg-[#15805e] text-white font-black py-3 rounded-xl cursor-pointer">
              <Sparkles className="w-4 h-4" /> {ar ? '⭐ اشترك الآن' : '⭐ Subscribe now'}
            </button>
            <button type="button" id="btn-trial-message-later" onClick={onClose}
              className="px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl cursor-pointer">
              {more > 0 ? (ar ? `التالي (${more})` : `Next (${more})`) : (ar ? 'لاحقاً' : 'Later')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
