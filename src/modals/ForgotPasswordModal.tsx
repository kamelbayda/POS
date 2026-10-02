import React, { useState } from 'react';
import { KeyRound, X } from 'lucide-react';

interface ForgotPasswordModalProps {
  lang: 'ar' | 'en';
  /** True when this device already has an active licence (the key must then match it). */
  isLicensed: boolean;
  verifyOwnerKey: (key: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  resetAdminPassword: (plain: string) => Promise<void>;
  onClose: () => void;
  onDone: () => void;
}

const MIN_LENGTH = 4;

/**
 * Resets the admin password when it is forgotten. The owner proves ownership with the
 * activation key (the active one on a licensed device, or a valid key that activates now).
 */
export function ForgotPasswordModal({ lang, isLicensed, verifyOwnerKey, resetAdminPassword, onClose, onDone }: ForgotPasswordModalProps) {
  const ar = lang === 'ar';
  const [key, setKey] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
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
    const result = await verifyOwnerKey(key);
    if ('error' in result) {
      setBusy(false);
      setError(result.error);
      return;
    }
    await resetAdminPassword(password);
    setBusy(false);
    onDone();
  };

  const inputClass = 'w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:bg-white transition';

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" id="forgot-password-modal" dir={ar ? 'rtl' : 'ltr'}>
      <form onSubmit={submit} className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 text-start">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-slate-800 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#1D9E75]" />
            {ar ? 'استعادة كلمة مرور المدير' : 'Reset admin password'}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label={ar ? 'إغلاق' : 'Close'}>
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          {isLicensed
            ? (ar ? 'أدخل كود التفعيل المفعّل على هذا الجهاز، ثم اختر كلمة مرور جديدة لحساب المدير (admin).' : 'Enter the activation key active on this device, then choose a new password for the admin account.')
            : (ar ? 'أدخل كود تفعيل صالح لهذا المحل (سيتم تفعيل البرنامج به)، ثم اختر كلمة مرور جديدة لحساب المدير (admin).' : 'Enter a valid activation key for this shop (the program will be activated with it), then choose a new admin password.')}
        </p>

        {error && <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm p-3 rounded-xl">{error}</div>}

        <div>
          <label className="block text-slate-700 font-bold mb-1.5 text-sm" htmlFor="recovery-key">{ar ? 'كود التفعيل' : 'Activation key'}</label>
          <input id="recovery-key" value={key} onChange={e => setKey(e.target.value)} className={`${inputClass} font-mono`} dir="ltr" placeholder="POS-XXXXX-XXXXX-XXXXX" autoComplete="off" required />
        </div>
        <div>
          <label className="block text-slate-700 font-bold mb-1.5 text-sm" htmlFor="recovery-password">{ar ? 'كلمة المرور الجديدة' : 'New password'}</label>
          <input id="recovery-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} autoComplete="new-password" required />
        </div>
        <div>
          <label className="block text-slate-700 font-bold mb-1.5 text-sm" htmlFor="recovery-confirm">{ar ? 'تأكيد كلمة المرور' : 'Confirm password'}</label>
          <input id="recovery-confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className={inputClass} autoComplete="new-password" required />
        </div>

        <button type="submit" disabled={busy} className="w-full bg-[#1D9E75] hover:bg-[#15805e] disabled:opacity-60 text-white font-bold py-3 rounded-xl transition cursor-pointer">
          {busy ? (ar ? 'جارٍ التحقق…' : 'Checking…') : (ar ? 'تعيين كلمة المرور' : 'Set password')}
        </button>
      </form>
    </div>
  );
}
