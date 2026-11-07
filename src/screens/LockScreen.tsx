import { LockScreenClock } from '../components/LockScreenClock';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, X } from 'lucide-react';
import { Invoice, User } from '../types';
import React, { useEffect, useState } from 'react';
import * as storage from '../lib/storage';

interface LockScreenProps {
  SYS_DATE: string;
  lang: "ar" | "en";
  invoices: Invoice[];
  currentUser: User;
  setIsScreenLocked: React.Dispatch<React.SetStateAction<boolean>>;
  lockPasscode: string;
  setLockPasscode: React.Dispatch<React.SetStateAction<string>>;
  lockError: string;
  setLockError: React.Dispatch<React.SetStateAction<string>>;
  isLockShaking: boolean;
  handleUnlock: () => void;
  handleLogout: () => void;
}

export function LockScreen({
  SYS_DATE,
  lang,
  invoices,
  currentUser,
  setIsScreenLocked,
  lockPasscode,
  setLockPasscode,
  lockError,
  setLockError,
  isLockShaking,
  handleUnlock,
  handleLogout,
}: LockScreenProps) {
  // How this user unlocks: a numeric PIN on the keypad, or a password typed on the keyboard.
  // Remembered per user on this device.
  const modeKey = `pos_lock_mode_${currentUser?.id || ''}`;
  const [mode, setMode] = useState<'pin' | 'password'>(() => (storage.getItem(modeKey) === 'password' ? 'password' : 'pin'));
  const chooseMode = (m: 'pin' | 'password') => {
    setMode(m);
    storage.setItem(modeKey, m);
    setLockPasscode('');
    setLockError('');
    if (m === 'password') {
      // focus inside the tap itself: iPad only opens its keyboard for a focus made by a tap
      const el = document.getElementById('lock-passcode-input') as HTMLInputElement | null;
      if (el) { el.readOnly = false; el.inputMode = 'text'; el.focus(); }
    }
  };
  useEffect(() => {
    if (mode === 'password') document.getElementById('lock-passcode-input')?.focus();
  }, [mode]);

  if (!currentUser) return null;

  // Daily stats filtered strictly for current cashier context
  const todayInvoices = invoices.filter(inv => inv.cashier === currentUser.name && inv.date === SYS_DATE);
  const invoiceCount = todayInvoices.length;
  const totalSalesUSD = todayInvoices.reduce((sum, inv) => sum + inv.totalUSD, 0);
  const totalSalesLBP = todayInvoices.reduce((sum, inv) => sum + inv.totalLBP, 0);

  const initials = currentUser.name.split(' ').map(n => n ? n[0] : '').join('').slice(0, 2).toUpperCase();

  return (
    <div 
      className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 relative overflow-hidden font-sans select-none"
      id="lock-screen-container"
    >
      {/* Glowing backdrop ambient orbs */}
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl opacity-30" />
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl opacity-30" />

      <div className="w-full max-w-4xl bg-slate-900/60 border border-white/5 rounded-[32px] shadow-2xl backdrop-blur-xl overflow-hidden relative z-10 grid grid-cols-1 md:grid-cols-12 animate-fade-in">
        {/* LEFT COLUMN: Date, Ticking Clock, Active cashier profile details, and Shift metrics */}
        <div className="md:col-span-12 lg:col-span-5 bg-gradient-to-b from-slate-900/40 to-slate-950/40 p-8 border-b lg:border-b-0 lg:border-l border-white/5 flex flex-col justify-between gap-8 text-right">

          {/* Live Ticking Clock segment */}
          <LockScreenClock lang={lang} />

          {/* Active Cashier context card & shift performance statistics */}
          <div className="space-y-6">

            {/* Cashier profile block */}
            <div className="flex items-center gap-3.5 flex-row-reverse">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center font-black text-emerald-400 text-lg shadow-inner">
                {initials || 'POS'}
              </div>
              <div className="space-y-0.5">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {lang === 'ar' ? 'المستخدم النشط حالياً' : 'Active cashier on terminal'}
                </span>
                <h3 className="text-base font-black text-white leading-tight">{currentUser.name}</h3>
                <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                  currentUser.role === 'admin' 
                    ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' 
                    : 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/30'
                }`}>
                  {currentUser.role === 'admin' ? (lang === 'ar' ? 'المدير العام' : 'Admin Mode') : (lang === 'ar' ? 'كاشير مبيعات' : 'Cashier Mode')}
                </span>
              </div>
            </div>

            {/* Dynamic shift metrics */}
            <div className="space-y-3 pt-3 border-t border-white/5">
              <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1 flex-row-reverse">
                <span>{lang === 'ar' ? 'موجز الوردية الحالية وبطاقة الأداء:' : 'Session statistics & workflow details'}</span>
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold block">
                    {lang === 'ar' ? 'الفواتير الصادرة' : 'Invoices emitted'}
                  </span>
                  <span className="font-mono text-lg font-black text-white">
                    {invoiceCount}
                  </span>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold block">
                    {lang === 'ar' ? 'إجمالي المدخول' : 'Session gross'}
                  </span>
                  <span className="font-mono text-lg font-black text-emerald-400">
                    ${totalSalesUSD.toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex justify-between items-center text-sm flex-row-reverse">
                <span className="text-slate-400 text-xs font-bold">
                  {lang === 'ar' ? 'المدخول بالعملة المحلية:' : 'LBP Exchange Sum:'}
                </span>
                <span className="font-mono font-black text-slate-200">
                  {totalSalesLBP.toLocaleString()} ل.ل
                </span>
              </div>
            </div>

          </div>

          {/* Hint message explaining capabilities */}
          <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-xs text-slate-400 leading-relaxed hidden lg:block">
            {lang === 'ar' 
              ? 'الشاشة مقفلة بوضع الأمان لحفظ سرية المبيعات والمشتريات. يمكنك استخدام لوحة المفاتيح والضغط على Enter بعد كتابة الرمز مباشرة.' 
              : 'Locked for security. You can type credentials on physical keyboard and press Enter to directly unlock.'}
          </div>

        </div>

        {/* RIGHT COLUMN: Keypad passcode dialer */}
        <div className="md:col-span-12 lg:col-span-7 p-8 flex flex-col justify-center items-center text-center">

          {/* Icon lock header block */}
          <motion.div 
            animate={isLockShaking ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center"
          >
            <div className="bg-emerald-500/10 w-16 h-16 rounded-3xl flex items-center justify-center border border-emerald-500/20 mb-3 shadow-xl shadow-emerald-500/5">
              <Lock className="text-emerald-400 w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white mb-2">
              {lang === 'ar' ? 'تأمين شاشة نقطة البيع' : 'Supermarket Terminal Locked'}
            </h2>
            <p className="text-slate-400 text-xs mb-4">
              {mode === 'pin'
                ? (lang === 'ar' ? 'أدخل رمز الـ PIN لاستئناف المبيعات' : 'Enter your PIN to resume sales')
                : (lang === 'ar' ? 'اكتب كلمة المرور لاستئناف المبيعات' : 'Type your password to resume sales')}
            </p>
          </motion.div>

          {/* Security Interface Panel */}
          <div className="w-full max-w-xs space-y-4">

            {/* PIN or password */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-white/5 border border-white/10 rounded-2xl" role="tablist" id="lock-mode-switch">
              {([['pin', lang === 'ar' ? 'رمز PIN' : 'PIN code'], ['password', lang === 'ar' ? 'كلمة المرور' : 'Password']] as const).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  id={`lock-mode-${m}`}
                  onClick={() => chooseMode(m)}
                  className={`py-2.5 rounded-xl text-sm font-black transition cursor-pointer ${mode === m ? 'bg-[#1D9E75] text-white shadow-lg shadow-emerald-500/20' : 'text-slate-300 hover:bg-white/10'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Floating pin dots indicators */}
            {mode === 'pin' && <div className="flex gap-2.5 justify-center py-1">
              {Array.from({ length: Math.max(4, lockPasscode.length) }).map((_, i) => (
                <div 
                  key={i} 
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                    i < lockPasscode.length 
                      ? 'bg-emerald-400 scale-110 shadow-lg shadow-emerald-500/50' 
                      : 'bg-white/10 border border-white/5'
                  }`} 
                />
              ))}
            </div>}

            {/* Password visual masked screen string input display */}
            <div className="relative">
              {/* PIN: filled by the keypad (no tablet keyboard). Password: typed, opens the tablet keyboard */}
              <input 
                id="lock-passcode-input"
                type="password"
                readOnly={mode === 'pin'}
                inputMode={mode === 'pin' ? 'none' : 'text'}
                value={lockPasscode}
                onChange={e => { setLockPasscode(e.target.value); setLockError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleUnlock(); } }}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                placeholder={mode === 'pin' ? '••••' : (lang === 'ar' ? 'كلمة المرور' : 'Password')}
                className={`w-full bg-white/5 border text-center text-xl font-bold py-3.5 px-4 rounded-2xl text-white ltr:font-mono focus:outline-none focus:border-emerald-400/60 transition-all duration-300 ${
                  lockError ? 'border-red-500 bg-red-500/5' : 'border-white/10'
                }`}
              />
              {lockPasscode && (
                <button
                  type="button"
                  onClick={() => setLockPasscode('')}
                  className="absolute left-3.5 top-3.5 text-slate-400 hover:text-white transition duration-150 cursor-pointer"
                  title={lang === 'ar' ? 'إعادة تعيين' : 'Clear'}
                >
                  <X className="w-5 h-5 opacity-60 hover:opacity-100" />
                </button>
              )}
            </div>

            {/* Error messages feedback overlay */}
            <AnimatePresence>
              {lockError && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-red-400 text-xs font-bold bg-red-500/10 border border-red-500/20 py-1.5 px-3 rounded-xl block text-center"
                >
                  {lockError}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Keypad selector blocks */}
            {mode === 'pin' && <div className="grid grid-cols-3 gap-2.5 max-w-[270px] mx-auto pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(key => {
                const isAction = key === 'C' || key === '⌫';
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (key === 'C') {
                        setLockPasscode('');
                        setLockError('');
                      } else if (key === '⌫') {
                        setLockPasscode(prev => prev.slice(0, -1));
                        setLockError('');
                      } else {
                        setLockPasscode(prev => prev + key);
                        setLockError('');
                      }
                    }}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold transition-all duration-100 cursor-pointer ${
                      isAction 
                        ? 'bg-white/10 hover:bg-white/15 text-slate-200 active:scale-95' 
                        : 'bg-white/5 hover:bg-white/10 border border-white/5 text-white active:bg-[#1D9E75]/20 active:scale-95'
                    }`}
                  >
                    {key}
                  </button>
                );
              })}
            </div>}

            {/* Controls triggers */}
            <div className="flex gap-2.5 pt-4">
              <button
                type="button"
                onClick={handleUnlock}
                className="flex-1 bg-[#1D9E75] hover:bg-[#15805e] border border-emerald-500/20 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] cursor-pointer text-sm font-sans"
              >
                {lang === 'ar' ? 'فتح الشاشة' : 'Unlock Screen'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsScreenLocked(false);
                  storage.setItem('pos_screen_locked', 'false');
                  handleLogout();
                }}
                className="bg-white/5 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 text-slate-350 hover:text-rose-400 font-bold py-3.5 px-3 rounded-xl transition duration-150 active:scale-[0.98] cursor-pointer text-xs flex items-center justify-center gap-1"
                title={lang === 'ar' ? 'الخروج والتبديل لحساب آخر' : 'Logout of account'}
              >
                <span>{lang === 'ar' ? 'تبديل المستخدم' : 'Switch Operator'}</span>
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
