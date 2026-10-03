import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { Cloud, X } from 'lucide-react';
import { auth, googleProvider } from '../firebase';

interface CloudJoinModalProps {
  lang: 'ar' | 'en';
  /** Called before signing in, so the sign-in triggers a download. */
  onBeforeSignIn: () => void;
  onClose: () => void;
}

/**
 * Login-screen entry for a new device: sign in to the shop's cloud account and download
 * the shop (products, accounts, sales). The accounts then exist here to sign in with.
 */
export function CloudJoinModal({ lang, onBeforeSignIn, onClose }: CloudJoinModalProps) {
  const ar = lang === 'ar';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fail = (err: unknown) => {
    const code = (err as { code?: string })?.code || '';
    setError(code.includes('invalid') || code.includes('wrong-password') || code.includes('user-not-found')
      ? (ar ? 'الإيميل أو كلمة سر السحاب غلط.' : 'Wrong cloud email or password.')
      : (ar ? 'ما زبط الدخول. تأكد من الإنترنت وجرّب كمان مرة.' : 'Sign-in failed. Check the internet connection and try again.'));
  };

  const withEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    onBeforeSignIn();
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onClose();
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  const withGoogle = async () => {
    setError('');
    setBusy(true);
    onBeforeSignIn();
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  const input = 'w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-mono focus:outline-none focus:ring-2 focus:ring-[#1D9E75]';
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" id="cloud-join-modal" dir={ar ? 'rtl' : 'ltr'}>
      <form onSubmit={withEmail} className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 text-start">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-slate-800 flex items-center gap-2"><Cloud className="w-5 h-5 text-sky-600" />{ar ? 'تنزيل بيانات المحل من السحاب' : 'Download shop data from the cloud'}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label={ar ? 'إغلاق' : 'Close'}><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <p className="text-xs text-slate-500">{ar
          ? 'فوت بحساب مزامنة السحاب تبع المحل (نفس الحساب يلي على الأجهزة التانية). بعد التنزيل بتفوت عالبرنامج بإيميلك وكلمة سرّك.'
          : 'Sign in with the shop\'s cloud sync account (the same one as on the other devices). After the download, sign in to the app with your email and password.'}</p>
        {error && <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm p-3 rounded-xl">{error}</div>}
        <input id="cloud-join-email" type="email" dir="ltr" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" className={input} required />
        <input id="cloud-join-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={ar ? 'كلمة سر حساب السحاب' : 'Cloud account password'} className={input} required />
        <button type="submit" disabled={busy} className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl cursor-pointer">
          {busy ? (ar ? 'جارٍ الدخول…' : 'Signing in…') : (ar ? 'دخول وتنزيل البيانات' : 'Sign in and download')}
        </button>
        <button type="button" onClick={withGoogle} disabled={busy} className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 rounded-xl cursor-pointer text-sm">
          {ar ? 'أو بحساب Google' : 'or with Google'}
        </button>
      </form>
    </div>
  );
}
