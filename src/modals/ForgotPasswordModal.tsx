import React, { useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { User } from '../types';

interface ForgotPasswordModalProps {
  lang: 'ar' | 'en';
  /** True when this device already has an active licence (the key must then match it). */
  isLicensed: boolean;
  users: User[];
  verifyOwnerKey: (key: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  resetPassword: (username: string, plain: string) => Promise<void>;
  /** Saves the email on an account (used to give the admin its first email). */
  linkEmail: (username: string, email: string) => void;
  onClose: () => void;
  /** Called with the email to sign in with. */
  onDone: (email: string) => void;
}

const MIN_LENGTH = 4;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Account recovery with the account's email plus the shop's activation key (the active
 * one on a licensed device, or a valid key that activates now). If no account has that
 * email yet and the admin has none, the email is linked to the admin account.
 */
export function ForgotPasswordModal({ lang, isLicensed, users, verifyOwnerKey, resetPassword, linkEmail, onClose, onDone }: ForgotPasswordModalProps) {
  const ar = lang === 'ar';
  const [step, setStep] = useState<'verify' | 'password'>('verify');
  const [email, setEmail] = useState('');
  const [key, setKey] = useState('');
  const [account, setAccount] = useState<User | null>(null);
  const [linkToAdmin, setLinkToAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const mail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(mail)) {
      setError(ar ? 'الإيميل مش مكتوب صح.' : 'Please enter a valid email.');
      return;
    }
    const byEmail = users.find((u) => u.email === mail);
    const admin = users.find((u) => u.username === 'admin') || users.find((u) => u.role === 'admin');
    const canLinkAdmin = !byEmail && !!admin && !admin.email;
    if (!byEmail && !canLinkAdmin) {
      setError(ar ? 'ما في حساب مسجّل بهالإيميل على هالجهاز.' : 'No account on this device has that email.');
      return;
    }
    setBusy(true);
    const result = await verifyOwnerKey(key);
    setBusy(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setAccount(byEmail || admin!);
    setLinkToAdmin(!byEmail);
    setStep('password');
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
    const mail = email.trim().toLowerCase();
    setBusy(true);
    if (linkToAdmin) linkEmail(account!.username, mail);
    await resetPassword(account!.username, password);
    setBusy(false);
    onDone(mail);
  };

  const inputClass = 'w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:bg-white transition';

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" id="forgot-password-modal" dir={ar ? 'rtl' : 'ltr'}>
      <form onSubmit={step === 'verify' ? verify : save} className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 text-start max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-slate-800 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#1D9E75]" />
            {ar ? 'استرجاع الحساب' : 'Recover account'}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label={ar ? 'إغلاق' : 'Close'}>
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {error && <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm p-3 rounded-xl">{error}</div>}

        {step === 'verify' ? (
          <>
            <p className="text-xs text-slate-500 leading-relaxed">
              {ar
                ? `اكتب إيميل حسابك و${isLicensed ? 'كود التفعيل المفعّل على هالجهاز' : 'كود تفعيل صالح للمحل (البرنامج بيتفعّل فيه)'}، وبعدين بتختار كلمة مرور جديدة.`
                : `Enter your account email and ${isLicensed ? 'the activation key active on this device' : 'a valid activation key for this shop (the program will be activated with it)'}, then choose a new password.`}
            </p>
            <div>
              <label className="block text-slate-700 font-bold mb-1.5 text-sm" htmlFor="recovery-email">{ar ? 'الإيميل' : 'Email'}</label>
              <input id="recovery-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className={`${inputClass} font-mono`} dir="ltr" placeholder="name@email.com" autoCapitalize="none" autoComplete="email" required />
            </div>
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
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-sm" id="recovery-account">
              <div className="font-black text-slate-800">{account!.name}</div>
              <div className="text-xs text-slate-600 font-mono" dir="ltr" style={{ textAlign: ar ? 'right' : 'left' }}>{email.trim().toLowerCase()}</div>
              {linkToAdmin && (
                <div className="text-xs text-amber-700 font-bold mt-1">
                  {ar ? 'هالإيميل رح ينربط بحساب المدير، وبتفوت فيه من هلّق ورايح.' : 'This email will be linked to the admin account and used to sign in from now on.'}
                </div>
              )}
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
              {busy ? (ar ? 'جارٍ الحفظ…' : 'Saving…') : (ar ? 'تعيين كلمة المرور' : 'Set password')}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
