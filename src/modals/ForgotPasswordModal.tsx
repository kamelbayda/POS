import React, { useState } from 'react';
import { KeyRound, X, UserRound } from 'lucide-react';
import { User } from '../types';

interface ForgotPasswordModalProps {
  lang: 'ar' | 'en';
  /** True when this device already has an active licence (the key must then match it). */
  isLicensed: boolean;
  users: User[];
  verifyOwnerKey: (key: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  resetPassword: (username: string, plain: string) => Promise<void>;
  onClose: () => void;
  /** Called with the account whose password was reset (to prefill the login form). */
  onDone: (username: string) => void;
}

const MIN_LENGTH = 4;
const ROLE_LABELS: Record<User['role'], { ar: string; en: string }> = {
  admin: { ar: 'مدير', en: 'Admin' },
  cashier: { ar: 'كاشير', en: 'Cashier' },
  accountant: { ar: 'محاسب', en: 'Accountant' },
};

/**
 * Recovers access with the activation key: step 1 proves ownership with the key
 * (the active one on a licensed device, or a valid key that activates now), step 2
 * shows every account's username and sets a new password for the chosen one.
 */
export function ForgotPasswordModal({ lang, isLicensed, users, verifyOwnerKey, resetPassword, onClose, onDone }: ForgotPasswordModalProps) {
  const ar = lang === 'ar';
  const [step, setStep] = useState<'key' | 'account'>('key');
  const [key, setKey] = useState('');
  const [username, setUsername] = useState(() => users.find((u) => u.role === 'admin')?.username || users[0]?.username || 'admin');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const checkKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const result = await verifyOwnerKey(key);
    setBusy(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setStep('account');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_LENGTH) {
      setError(ar ? `كلمة المرور يجب أن تكون ${MIN_LENGTH} أحرف أو أكثر.` : `Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError(ar ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }
    setBusy(true);
    await resetPassword(username, password);
    setBusy(false);
    onDone(username);
  };

  const inputClass = 'w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:bg-white transition';

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" id="forgot-password-modal" dir={ar ? 'rtl' : 'ltr'}>
      <form onSubmit={step === 'key' ? checkKey : save} className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 text-start max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-slate-800 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#1D9E75]" />
            {ar ? 'استعادة اسم المستخدم وكلمة المرور' : 'Recover username and password'}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label={ar ? 'إغلاق' : 'Close'}>
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {error && <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm p-3 rounded-xl">{error}</div>}

        {step === 'key' ? (
          <>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isLicensed
                ? (ar ? 'أدخل كود التفعيل المفعّل على هذا الجهاز لعرض أسماء المستخدمين وتعيين كلمة مرور جديدة.' : 'Enter the activation key active on this device to see the usernames and set a new password.')
                : (ar ? 'أدخل كود تفعيل صالح لهذا المحل (سيتم تفعيل البرنامج به) لعرض أسماء المستخدمين وتعيين كلمة مرور جديدة.' : 'Enter a valid activation key for this shop (the program will be activated with it) to see the usernames and set a new password.')}
            </p>
            <div>
              <label className="block text-slate-700 font-bold mb-1.5 text-sm" htmlFor="recovery-key">{ar ? 'كود التفعيل' : 'Activation key'}</label>
              <input id="recovery-key" value={key} onChange={e => setKey(e.target.value)} className={`${inputClass} font-mono`} dir="ltr" placeholder="POS-XXXXX-XXXXX-XXXXX" autoComplete="off" required />
            </div>
            <button type="submit" disabled={busy} className="w-full bg-[#1D9E75] hover:bg-[#15805e] disabled:opacity-60 text-white font-bold py-3 rounded-xl transition cursor-pointer">
              {busy ? (ar ? 'جارٍ التحقق…' : 'Checking…') : (ar ? 'متابعة' : 'Continue')}
            </button>
          </>
        ) : (
          <>
            <div>
              <div className="text-slate-700 font-bold mb-1.5 text-sm">{ar ? 'الحسابات على هذا الجهاز (اختر حساباً):' : 'Accounts on this device (pick one):'}</div>
              <div className="space-y-1.5" id="recovery-accounts">
                {users.map((u) => (
                  <label key={u.id} className={`flex items-center gap-3 border rounded-xl px-3 py-2 cursor-pointer ${username === u.username ? 'border-[#1D9E75] bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="radio" name="recovery-user" checked={username === u.username} onChange={() => setUsername(u.username)} className="accent-[#1D9E75]" />
                    <UserRound className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-mono font-black text-slate-800" dir="ltr" style={{ textAlign: ar ? 'right' : 'left' }}>{u.username}</span>
                      <span className="block text-[11px] text-slate-500 truncate">{u.name}</span>
                    </span>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full shrink-0">{ROLE_LABELS[u.role]?.[lang] ?? u.role}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1.5 text-sm" htmlFor="recovery-password">
                {ar ? 'كلمة مرور جديدة لـ ' : 'New password for '}<span className="font-mono" dir="ltr">{username}</span>
              </label>
              <input id="recovery-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} autoComplete="new-password" required />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1.5 text-sm" htmlFor="recovery-confirm">{ar ? 'تأكيد كلمة المرور' : 'Confirm password'}</label>
              <input id="recovery-confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className={inputClass} autoComplete="new-password" required />
            </div>
            <button type="submit" disabled={busy} className="w-full bg-[#1D9E75] hover:bg-[#15805e] disabled:opacity-60 text-white font-bold py-3 rounded-xl transition cursor-pointer">
              {busy ? (ar ? 'جارٍ الحفظ…' : 'Saving…') : (ar ? 'تعيين كلمة المرور' : 'Set password')}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
