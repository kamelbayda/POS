import React, { useState } from 'react';

interface VirtualKeyboardProps {
  setBarcodeInput: React.Dispatch<React.SetStateAction<string>>;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  isBarcodeKeyboardOpen: boolean;
  setIsBarcodeKeyboardOpen: React.Dispatch<React.SetStateAction<boolean>>;
  keyboardTarget: "search" | "barcode";
  theme: "light" | "dark";
  setTerminalProductPage: React.Dispatch<React.SetStateAction<number>>;
  handleBarcodeSubmit: (e: React.FormEvent) => void;
}

export function VirtualKeyboard({
  setBarcodeInput,
  setSearchQuery,
  isBarcodeKeyboardOpen,
  setIsBarcodeKeyboardOpen,
  keyboardTarget,
  theme,
  setTerminalProductPage,
  handleBarcodeSubmit,
}: VirtualKeyboardProps) {
  const [keyboardLanguage, setKeyboardLanguage] = useState<'ar' | 'en' | 'num'>('ar');

  if (!isBarcodeKeyboardOpen) return null;

  const appendChar = (char: string) => {
    if (keyboardTarget === 'barcode') {
      setBarcodeInput(prev => prev + char);
    } else {
      setSearchQuery(prev => {
        const res = prev + char;
        setTerminalProductPage(0);
        return res;
      });
    }
  };

  const handleBackspace = () => {
    if (keyboardTarget === 'barcode') {
      setBarcodeInput(prev => prev.slice(0, -1));
    } else {
      setSearchQuery(prev => {
        const res = prev.slice(0, -1);
        setTerminalProductPage(0);
        return res;
      });
    }
  };

  const handleClear = () => {
    if (keyboardTarget === 'barcode') {
      setBarcodeInput('');
    } else {
      setSearchQuery('');
      setTerminalProductPage(0);
    }
  };

  const handleEnter = () => {
    if (keyboardTarget === 'barcode') {
      handleBarcodeSubmit(new Event('submit') as any);
    }
    setIsBarcodeKeyboardOpen(false);
  };

  const numbersRow = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '*'];

  const arKeys = [
    ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'],
    ['ش', 'س', 'ي', 'ب', 'ل', 'ت', 'ن', 'م', 'ك', 'ط', 'ذ', 'أ'],
    ['ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ', 'إ', 'آ']
  ];

  const enKeys = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", '\\'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', '@', '_']
  ];

  const currentRows = keyboardLanguage === 'ar' ? arKeys : enKeys;

  return (
    <div className={`p-4 rounded-2xl border transition shadow-lg w-full text-right select-none ${
      theme === 'dark' ? 'bg-[#1C1C1E] border-stone-850 text-white' : 'bg-slate-50 border-slate-200 text-slate-820'
    }`}>
      <div className="flex items-center justify-between border-b pb-2 mb-3 border-slate-200 dark:border-stone-800">
        <div className="flex gap-1.5">
          <button
            onClick={() => setIsBarcodeKeyboardOpen(false)}
            className="text-[10px] bg-slate-200 hover:bg-slate-300 dark:bg-stone-800 dark:hover:bg-stone-700 px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 dark:text-stone-300 dark:hover:text-white font-extrabold cursor-pointer transition-all"
          >
            إغلاق ×
          </button>
          <span className="text-[10px] bg-[#1D9E75]/10 text-[#1D9E75] px-2 py-0.5 rounded-full font-bold font-sans">
            {keyboardTarget === 'barcode' ? 'مستهدف: حقل الباركود 📟' : 'مستهدف: مربع البحث الفوري 🔍'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-row-reverse">
          <span className="text-xs font-black font-sans flex items-center gap-1">
            <span>لوحة المفاتيح الافتراضية المدمجة</span>
            <span>⌨️</span>
          </span>
          <div className="flex bg-slate-200 dark:bg-stone-900 rounded-xl p-0.5 text-[10px] font-bold">
            <button
              onClick={() => setKeyboardLanguage('ar')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${keyboardLanguage === 'ar' ? 'bg-[#1D9E75] text-white font-black shadow-xs' : 'text-slate-400'}`}
            >
              عربي
            </button>
            <button
              onClick={() => setKeyboardLanguage('en')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${keyboardLanguage === 'en' ? 'bg-[#1D9E75] text-white font-black shadow-xs' : 'text-slate-400'}`}
            >
              EN
            </button>
            <button
              onClick={() => setKeyboardLanguage('num')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${keyboardLanguage === 'num' ? 'bg-[#1D9E75] text-white font-black shadow-xs' : 'text-slate-400'}`}
            >
              123 فقط
            </button>
          </div>
        </div>
      </div>

      {keyboardLanguage === 'num' ? (
        /* Numpad Grid */
        <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto p-2" dir="ltr">
          {['7', '8', '9', 'Backspace'].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => k === 'Backspace' ? handleBackspace() : appendChar(k)}
              className={`h-11 rounded-xl text-sm font-black transition cursor-pointer flex items-center justify-center ${
                k === 'Backspace' 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white col-span-1 shadow-xs' 
                  : theme === 'dark' ? 'bg-stone-800 hover:bg-stone-700 text-stone-100' : 'bg-white hover:bg-slate-100 text-slate-800 shadow-xs border border-slate-200'
              }`}
            >
              {k === 'Backspace' ? '←' : k}
            </button>
          ))}
          {['4', '5', '6', 'Clear'].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => k === 'Clear' ? handleClear() : appendChar(k)}
              className={`h-11 rounded-xl text-sm font-black transition cursor-pointer flex items-center justify-center ${
                k === 'Clear' 
                  ? 'bg-rose-500 hover:bg-rose-600 text-white col-span-1 shadow-xs' 
                  : theme === 'dark' ? 'bg-stone-800 hover:bg-stone-700 text-stone-100' : 'bg-white hover:bg-slate-100 text-slate-800 shadow-xs border border-slate-200'
              }`}
            >
              {k === 'Clear' ? 'C' : k}
            </button>
          ))}
          {['1', '2', '3', 'Enter'].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => k === 'Enter' ? handleEnter() : appendChar(k)}
              className={`h-11 rounded-xl text-sm font-black transition cursor-pointer flex items-center justify-center ${
                k === 'Enter' 
                  ? 'bg-[#1D9E75] hover:bg-[#15805e] text-white col-span-1 row-span-2 h-[96px] shadow-xs' 
                  : theme === 'dark' ? 'bg-stone-800 hover:bg-stone-700 text-stone-100' : 'bg-white hover:bg-slate-100 text-slate-800 shadow-xs border border-slate-200'
              }`}
            >
              {k === 'Enter' ? 'Enter' : k}
            </button>
          ))}
          {['0', '.', '-'].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => appendChar(k)}
              className={`h-11 rounded-xl text-sm font-black transition cursor-pointer flex items-center justify-center ${
                theme === 'dark' ? 'bg-stone-800 hover:bg-stone-700 text-stone-100' : 'bg-white hover:bg-slate-100 text-slate-800 shadow-xs border border-slate-200'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      ) : (
        /* Full Text Layout */
        <div className="space-y-2 flex flex-col items-center" dir={keyboardLanguage === 'ar' ? 'rtl' : 'ltr'}>
          <div className="flex gap-1.5 w-full justify-center">
            {numbersRow.map(num => (
              <button
                key={num}
                type="button"
                onClick={() => appendChar(num)}
                className={`flex-1 h-10 min-w-[28px] max-w-[45px] rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  theme === 'dark' 
                    ? 'bg-stone-800 hover:bg-stone-700 text-white' 
                    : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-150'
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          {currentRows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-1 w-full justify-center">
              {row.map(char => (
                <button
                  key={char}
                  type="button"
                  onClick={() => appendChar(char)}
                  className={`flex-1 h-10 min-w-[28px] max-w-[45px] rounded-xl text-xs font-bold transition cursor-pointer ${
                    theme === 'dark' 
                      ? 'bg-stone-800 hover:bg-stone-750 text-white' 
                      : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-xs'
                  }`}
                >
                  {char}
                </button>
              ))}
            </div>
          ))}

          <div className="flex gap-1.5 w-full justify-center">
            <button
              onClick={handleClear}
              type="button"
              className="px-3 h-10 rounded-xl text-xs font-black bg-rose-500 hover:bg-rose-600 text-white transition cursor-pointer shrink-0"
            >
              مسح الكل
            </button>
            <button
              onClick={handleBackspace}
              type="button"
              className="px-4 h-10 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white transition cursor-pointer shrink-0"
            >
              مسح
            </button>
            <button
              onClick={() => appendChar(' ')}
              type="button"
              className={`flex-1 h-10 rounded-xl text-xs font-bold transition cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-stone-700 hover:bg-stone-600 text-white' 
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300'
              }`}
            >
              مــســافــة
            </button>
            <button
              onClick={handleEnter}
              type="button"
              className="px-5 h-10 rounded-xl text-xs font-extrabold bg-[#1D9E75] hover:bg-emerald-600 text-white transition cursor-pointer shrink-0"
            >
              تأكيد
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
