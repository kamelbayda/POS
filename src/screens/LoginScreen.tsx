import { Globe, ShieldAlert, User, Lock } from 'lucide-react';
import React, { useState } from 'react';
import { BeeCashMark, BeeCashWordmark } from '../components/BeeCashLogo';

interface LoginScreenProps {
  SYS_DATE: string;
  lang: "ar" | "en";
  handleToggleLang: () => void;
  loginUsername: string;
  setLoginUsername: React.Dispatch<React.SetStateAction<string>>;
  loginPassword: string;
  setLoginPassword: React.Dispatch<React.SetStateAction<string>>;
  loginError: string;
  handleLogin: (e: React.FormEvent) => void;
  /** A new shop whose admin account has no password yet: show the owner setup form. */
  needsOwnerSetup: boolean;
  /** Creates the owner's admin account and signs in; returns an error message or null. */
  onCreateOwner: (name: string, email: string, password: string) => Promise<string | null>;
  onForgotPassword: () => void;
  /** New device: sign in to the shop's cloud account and download the shop. */
  onJoinCloud: () => void;
}

export function LoginScreen({
  SYS_DATE,
  lang,
  handleToggleLang,
  loginUsername,
  setLoginUsername,
  loginPassword,
  setLoginPassword,
  loginError,
  handleLogin,
  needsOwnerSetup,
  onCreateOwner,
  onForgotPassword,
  onJoinCloud,
}: LoginScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-emerald-50 via-slate-50 to-emerald-100/30 flex items-center justify-center p-4" id="login-screen">
      <div className="bg-white rounded-3xl ltr:shadow-2xl shadow-emerald-950/5 border border-slate-100 w-full max-w-md overflow-hidden animate-fade-in">
        {/* Brand header */}
        <div className="bg-[#1E1B16] p-8 text-center text-white relative">
          <div className="absolute top-4 right-4 bg-white/10 text-xs px-2 py-1 rounded backdrop-blur-sm font-mono">
            {lang === 'ar' ? 'التوقيت اليومي' : 'System Time'}: {SYS_DATE}
          </div>

          {/* Language switcher button flag */}
          <button 
            type="button"
            onClick={handleToggleLang}
            className="absolute top-4 left-4 bg-white/10 hover:bg-white/20 text-xs px-2.5 py-1 rounded backdrop-blur-sm font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <Globe className="w-3 h-3" />
            <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
          </button>

          <BeeCashMark className="w-20 h-20 mx-auto mb-3 drop-shadow-lg" />
          <h1 className="text-3xl font-sans">
            <BeeCashWordmark onDark />
          </h1>
          <p className="text-[#FFC21A] text-sm font-bold mt-0.5">{lang === 'ar' ? 'بي كاش' : 'Point of sale'}</p>
          <p className="text-slate-300 text-sm mt-2">
            {lang === 'ar' ? 'نظام الكاشير والمخزون للسوبرماركت' : 'Checkout and inventory for supermarkets'}
          </p>
        </div>

        {needsOwnerSetup ? (
          <OwnerSetupForm lang={lang} onCreateOwner={onCreateOwner} onJoinCloud={onJoinCloud} />
        ) : (
        <form onSubmit={handleLogin} className="p-8 space-y-5 text-right">
          {loginError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm p-4 rounded-xl flex items-start gap-2 text-right">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-1.5 text-sm text-right" htmlFor="username">
              {lang === 'ar' ? 'الإيميل أو اسم المستخدم' : 'Email or username'}
            </label>
            <div className="relative">
              <input 
                id="username"
                type="text" 
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-right focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:bg-white transition"
                placeholder="name@email.com"
                autoCapitalize="none"
                autoComplete="username"
                required
              />
              <User className="absolute left-3.5 top-3.5 text-slate-400 w-5 h-5" />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1.5 text-sm text-right" htmlFor="password">
              {lang === 'ar' ? 'كلمة المرور' : 'Password'}
            </label>
            <div className="relative">
              <input 
                id="password"
                type="password" 
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-right ltr:font-mono focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:bg-white transition"
                placeholder="••••••••"
                required
              />
              <Lock className="absolute left-3.5 top-3.5 text-slate-400 w-5 h-5" />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-[#1D9E75] hover:bg-[#15805e] text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-emerald-700/10 hover:shadow-emerald-700/20 active:scale-[0.98] cursor-pointer"
          >
            {lang === 'ar' ? 'دخول للنظام 🔓' : 'Login to System 🔓'}
          </button>

          <button
            type="button"
            onClick={onForgotPassword}
            className="w-full text-center text-sm font-bold text-[#1D9E75] hover:underline cursor-pointer"
            id="btn-forgot-password"
          >
            {lang === 'ar' ? 'نسيت كلمة المرور؟ (بالإيميل وكود التفعيل)' : 'Forgot password? (email + activation key)'}
          </button>

          <button
            type="button"
            onClick={onJoinCloud}
            className="w-full text-center text-sm font-bold text-sky-700 hover:underline cursor-pointer"
            id="btn-join-cloud"
          >
            {lang === 'ar' ? '☁️ جهاز جديد؟ نزّل بيانات المحل من السحاب' : '☁️ New device? Download the shop from the cloud'}
          </button>

        </form>
        )}
      </div>
    </div>
  );
}

const MIN_PASSWORD = 4;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** First run of a new shop: the owner creates the admin account (no default passwords). */
function OwnerSetupForm({ lang, onCreateOwner, onJoinCloud }: {
  lang: 'ar' | 'en';
  onCreateOwner: LoginScreenProps['onCreateOwner'];
  onJoinCloud: () => void;
}) {
  const ar = lang === 'ar';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError(ar ? 'اكتب اسمك.' : 'Enter your name.');
    if (!EMAIL_RE.test(email.trim())) return setError(ar ? 'الإيميل مش مكتوب صح.' : 'Please enter a valid email.');
    if (password.length < MIN_PASSWORD) {
      return setError(ar ? `كلمة المرور لازم تكون ${MIN_PASSWORD} أحرف أو أكتر.` : `Password must be at least ${MIN_PASSWORD} characters.`);
    }
    if (password !== confirm) return setError(ar ? 'كلمتا المرور مش متطابقتين.' : 'Passwords do not match.');
    setBusy(true);
    const err = await onCreateOwner(name, email, password);
    setBusy(false);
    if (err) setError(err);
  };

  const inputClass = 'w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:bg-white transition';

  return (
    <form onSubmit={submit} className="p-8 space-y-4 text-right" id="owner-setup-form">
      <div>
        <h2 className="font-black text-slate-800 text-lg">{ar ? '👋 أهلاً فيك! أنشئ حساب المدير' : '👋 Welcome! Create the admin account'}</h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          {ar
            ? 'هيدا حسابك إنت كصاحب المحل. بتفوت فيه بالإيميل وكلمة المرور، ومنو بتضيف حسابات الكاشير بعدين.'
            : 'This is your owner account. You sign in with this email and password, and add cashier accounts from it later.'}
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm p-3 rounded-xl flex items-start gap-2">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block text-slate-700 font-bold mb-1.5 text-sm" htmlFor="owner-name">{ar ? 'الاسم' : 'Name'}</label>
        <input id="owner-name" value={name} onChange={e => setName(e.target.value)} className={inputClass} autoComplete="name" required />
      </div>
      <div>
        <label className="block text-slate-700 font-bold mb-1.5 text-sm" htmlFor="owner-email">{ar ? 'الإيميل' : 'Email'}</label>
        <input id="owner-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className={`${inputClass} font-mono`} dir="ltr" placeholder="name@email.com" autoCapitalize="none" autoComplete="email" required />
      </div>
      <div>
        <label className="block text-slate-700 font-bold mb-1.5 text-sm" htmlFor="owner-password">{ar ? 'كلمة المرور' : 'Password'}</label>
        <input id="owner-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} autoComplete="new-password" required />
      </div>
      <div>
        <label className="block text-slate-700 font-bold mb-1.5 text-sm" htmlFor="owner-confirm">{ar ? 'تأكيد كلمة المرور' : 'Confirm password'}</label>
        <input id="owner-confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className={inputClass} autoComplete="new-password" required />
      </div>

      <button type="submit" disabled={busy} className="w-full bg-[#1D9E75] hover:bg-[#15805e] disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition cursor-pointer" id="btn-create-owner">
        {busy ? (ar ? 'جارٍ الإنشاء…' : 'Creating…') : (ar ? 'إنشاء الحساب والدخول 🚀' : 'Create account and sign in 🚀')}
      </button>

      <button type="button" onClick={onJoinCloud} className="w-full text-center text-sm font-bold text-sky-700 hover:underline cursor-pointer" id="btn-join-cloud">
        {ar ? '☁️ عندك محل عالسحاب؟ نزّل بياناتو' : '☁️ Already have a shop in the cloud? Download it'}
      </button>
    </form>
  );
}
