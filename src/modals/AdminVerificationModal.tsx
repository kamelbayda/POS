import { motion } from 'motion/react';
import { Lock } from 'lucide-react';
import React from 'react';

interface AdminVerificationModalProps {
  lang: "ar" | "en";
  theme: "light" | "dark";
  /** Resolves true when the input matches the admin account password. */
  verifyAdminPassword: (input: string) => Promise<boolean>;
  adminVerificationAction: () => void;
  setAdminVerificationOpen: React.Dispatch<React.SetStateAction<boolean>>;
  adminVerificationPasswordInput: string;
  setAdminVerificationPasswordInput: React.Dispatch<React.SetStateAction<string>>;
  adminVerificationError: string;
  setAdminVerificationError: React.Dispatch<React.SetStateAction<string>>;
  adminVerificationTitle: string;
}

export function AdminVerificationModal({
  lang,
  theme,
  verifyAdminPassword,
  adminVerificationAction,
  setAdminVerificationOpen,
  adminVerificationPasswordInput,
  setAdminVerificationPasswordInput,
  adminVerificationError,
  setAdminVerificationError,
  adminVerificationTitle,
}: AdminVerificationModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`rounded-3xl p-6 w-full max-w-sm text-right shadow-2xl border ${
          theme === 'dark' ? 'bg-[#1C1C1E] border-stone-800 text-stone-100' : 'bg-white border-slate-150 text-slate-800'
        }`}
      >
        <div className="text-center space-y-3 flex flex-col items-center justify-center">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-2xl inline-block">
            <Lock className="w-6 h-6 text-rose-600" />
          </div>
          <h3 className="text-base font-black text-slate-800 dark:text-stone-100">
            {lang === 'ar' ? 'طلب صلاحية المدير المسؤول' : 'Admin Authorization Required'}
          </h3>
          <p className="text-[11px] text-slate-400 dark:text-stone-300 leading-relaxed text-center px-2">
            {lang === 'ar'
              ? `أنت تحاول القيام بإجراء حساس: (${adminVerificationTitle || 'تعديل أو تصفير بيانات'}). يرجى تأكيد هوية مسؤول النظام بإدخال الباسكود الخاص بالمدير:`
              : `You are performing a sensitive operation: (${adminVerificationTitle || 'system reset/wipe'}). Please authorize with the admin passcode:`}
          </p>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const matchedPass = await verifyAdminPassword(adminVerificationPasswordInput);
            if (matchedPass) {
              setAdminVerificationOpen(false);
              if (adminVerificationAction) {
                adminVerificationAction();
              }
            } else {
              setAdminVerificationError(lang === 'ar' ? '❌ كلمة المرور خاطئة! حاول مجدداً.' : '❌ Incorrect password. Try again.');
            }
          }}
          className="mt-5 space-y-4"
        >
          <div>
            <input
              type="password"
              autoFocus
              placeholder={lang === 'ar' ? 'أدخل باسوورد الـ admin...' : 'Enter admin password...'}
              value={adminVerificationPasswordInput}
              onChange={(e) => {
                setAdminVerificationPasswordInput(e.target.value);
                setAdminVerificationError('');
              }}
              className={`w-full p-3 rounded-xl border text-center text-sm font-bold font-mono tracking-widest focus:ring-2 focus:ring-[#1D9E75] outline-none ${
                theme === 'dark' 
                  ? 'bg-[#121213] border-stone-750 text-white placeholder-stone-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-450'
              }`}
            />
            {adminVerificationError && (
              <p className="text-[11.5px] text-red-500 font-bold text-center mt-2 animate-pulse">
                {adminVerificationError}
              </p>
            )}
          </div>

          {/* On-screen numeric keyboard helper for touch screens */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => {
                  setAdminVerificationPasswordInput((prev) => prev + num);
                  setAdminVerificationError('');
                }}
                className={`py-2 rounded-xl text-xs font-black transition active:scale-95 ${
                  theme === 'dark' 
                    ? 'bg-stone-800/80 text-stone-200 hover:bg-stone-750' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setAdminVerificationPasswordInput('');
                setAdminVerificationError('');
              }}
              className={`py-2 rounded-xl text-xs font-bold text-red-500 transition active:scale-95 ${
                theme === 'dark' ? 'bg-rose-950/20 hover:bg-rose-950/40' : 'bg-red-50 hover:bg-red-100'
              }`}
            >
              {lang === 'ar' ? 'تصفير' : 'Clear'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdminVerificationPasswordInput((prev) => prev + '0');
                setAdminVerificationError('');
              }}
              className={`py-2 rounded-xl text-xs font-black transition active:scale-95 ${
                theme === 'dark' 
                  ? 'bg-stone-800/80 text-stone-200 hover:bg-stone-750' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              0
            </button>
            <button
              type="button"
              onClick={() => {
                setAdminVerificationPasswordInput((prev) => prev.slice(0, -1));
                setAdminVerificationError('');
              }}
              className={`py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                theme === 'dark' 
                  ? 'bg-stone-800/80 text-stone-400 hover:bg-stone-750' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              ⌫
            </button>
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-150/50">
            <button
              type="button"
              onClick={() => setAdminVerificationOpen(false)}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer text-center ${
                theme === 'dark' 
                  ? 'bg-stone-800 text-stone-400 hover:bg-stone-750' 
                  : 'bg-slate-250 text-slate-600 hover:bg-slate-300'
              }`}
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl font-black text-xs text-white bg-rose-600 hover:bg-rose-700 transition active:scale-95 cursor-pointer text-center"
            >
              {lang === 'ar' ? 'تأكيد الصلاحية' : 'Authorize'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
