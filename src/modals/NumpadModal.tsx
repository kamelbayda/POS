import { motion } from 'motion/react';
import { X, Check, Delete } from 'lucide-react';
import React from 'react';

interface NumpadModalProps {
  lang: "ar" | "en";
  setIsNumpadOpen: React.Dispatch<React.SetStateAction<boolean>>;
  numpadValue: string;
  setNumpadValue: React.Dispatch<React.SetStateAction<string>>;
  numpadTitle: string;
  numpadOnSave: { fn: (val: string) => void; };
  theme: "light" | "dark";
}

export function NumpadModal({
  lang,
  setIsNumpadOpen,
  numpadValue,
  setNumpadValue,
  numpadTitle,
  numpadOnSave,
  theme,
}: NumpadModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans" id="touch-numpad-modal">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-3xl p-6 w-full max-w-sm text-right shadow-2xl border ${theme === 'dark' ? 'bg-[#1C1C1E] border-stone-800 text-stone-100' : 'bg-white border-slate-150 text-slate-800'}`}
      >
        <div className="flex justify-between items-center flex-row-reverse border-b pb-3 mb-4 border-stone-805/30">
          <span className="text-xl">⌨️</span>
          <h3 className="text-sm font-black tracking-wide truncate max-w-[260px]">{numpadTitle || (lang === 'ar' ? 'التوجيه اللمسي للأرقام' : 'Virtual Numeric Entry')}</h3>
          <button 
            onClick={() => setIsNumpadOpen(false)}
            className="p-1.5 rounded-lg hover:bg-stone-500/10 text-stone-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Value Display */}
        <div className={`p-4 rounded-2xl mb-4 border font-mono font-black text-center text-2xl tracking-widest ${theme === 'dark' ? 'bg-[#121213] border-stone-800 text-emerald-400' : 'bg-slate-50 border-slate-250 text-emerald-600 shadow-inner'}`}>
          {numpadValue || '0'}
        </div>

        {/* Matrix structure Grid layout */}
        <div className="grid grid-cols-3 gap-2 px-1 mb-4 select-none">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => setNumpadValue(prev => (prev === '0' || prev === '') ? num.toString() : prev + num.toString())}
              className={`py-3.5 rounded-xl font-mono text-lg font-black transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-[#252528] text-white hover:bg-[#2C2C30]' : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-250 shadow-xs'}`}
            >
              {num}
            </button>
          ))}

          {/* Special operators and backspaces */}
          <button
            type="button"
            onClick={() => setNumpadValue('0')}
            className={`py-3.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-stone-800/65 hover:bg-stone-800 text-rose-450' : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100'}`}
          >
            {lang === 'ar' ? 'تصفير' : 'Clear'}
          </button>

          <button
            type="button"
            onClick={() => setNumpadValue(prev => (prev === '' || prev === '0') ? '0' : prev + '0')}
            className={`py-3.5 rounded-xl font-mono text-lg font-black transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-[#252528] text-white hover:bg-[#2C2C30]' : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-250 shadow-xs'}`}
          >
            0
          </button>

          <button
            type="button"
            onClick={() => {
              setNumpadValue(prev => {
                const str = prev || '0';
                if (str.includes('.')) return str;
                return str + '.';
              });
            }}
            className={`py-3.5 rounded-xl font-mono text-lg font-black transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-[#252528] text-white hover:bg-[#2C2C30]' : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-250 shadow-xs'}`}
          >
            .
          </button>
        </div>

        {/* Quick adjustment presets keys */}
        <div className="space-y-1.5 mb-5 select-none">
          <span className={`text-[10px] block font-extrabold pr-1.5 ${theme === 'dark' ? 'text-stone-500' : 'text-slate-450'}`}>
            {lang === 'ar' ? '⚡️ اختصارات التعديل بالجمع والفارق:' : '⚡️ Fast addition templates:'}
          </span>
          <div className="grid grid-cols-5 gap-1 select-none">
            {['+1', '+5', '+10', '+20', '+50'].map(mod => (
              <button
                key={mod}
                type="button"
                onClick={() => {
                  const val = parseFloat(numpadValue) || 0;
                  const offset = parseFloat(mod) || 0;
                  setNumpadValue(Math.max(0, val + offset).toString());
                }}
                className={`py-2 rounded-lg text-[10px] font-mono font-bold transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-[#2C2C30] hover:bg-stone-700 text-stone-300' : 'bg-slate-50 border border-slate-200 hover:bg-slate-150 text-slate-600 shadow-sm'}`}
              >
                {mod}
              </button>
            ))}
          </div>
        </div>

        {/* Actions for Touch Numpad */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              numpadOnSave.fn(numpadValue);
              setIsNumpadOpen(false);
            }}
            className="flex-1 bg-[#1D9E75] hover:bg-emerald-600 text-white font-extrabold py-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-emerald-500/10 active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>{lang === 'ar' ? 'حفظ وتأكيد' : 'Confirm & Apply'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNumpadValue(prev => {
                const str = prev || '0';
                if (str.length <= 1) return '';
                return str.slice(0, -1);
              });
            }}
            className={`px-4 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-[#2C2C30] hover:bg-zinc-700 text-stone-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'}`}
            title={lang === 'ar' ? 'حذف خطوة للخلف' : 'Delete last digit'}
          >
            <Delete className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsNumpadOpen(false)}
            className={`px-4 py-3 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-stone-800 text-stone-400 hover:bg-stone-750' : 'bg-slate-200 text-slate-600 hover:bg-slate-250 border border-slate-300'}`}
          >
            {lang === 'ar' ? 'تراجع' : 'Close'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
