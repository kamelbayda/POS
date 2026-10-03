import { Globe, ShoppingCart, ShieldAlert, User, Lock } from 'lucide-react';
import React from 'react';

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
  /** Show the factory default accounts only while their passwords were never changed. */
  showDefaultCredentials: boolean;
  onForgotPassword: () => void;
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
  showDefaultCredentials,
  onForgotPassword,
}: LoginScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-emerald-50 via-slate-50 to-emerald-100/30 flex items-center justify-center p-4" id="login-screen">
      <div className="bg-white rounded-3xl ltr:shadow-2xl shadow-emerald-950/5 border border-slate-100 w-full max-w-md overflow-hidden animate-fade-in">
        {/* Brand header */}
        <div className="bg-[#1D9E75] p-8 text-center text-white relative">
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

          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
            <ShoppingCart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-sans tracking-tight">
            {lang === 'ar' ? 'نظام مبيعات السوبرماركت المطور' : 'Advanced Supermarket POS System'}
          </h1>
          <p className="text-emerald-100 text-sm mt-1">
            {lang === 'ar' ? 'بوابتك لإدارة البيع، المخزون والجرد بكفاءة' : 'Your gateway for sales, inventory, and stock auditing'}
          </p>
        </div>

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
                placeholder={lang === 'ar' ? 'name@email.com أو admin' : 'name@email.com or admin'}
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

          {showDefaultCredentials && (
          <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 space-y-1 border border-slate-100 text-right">
            <div className="font-bold text-slate-700 mb-1">
              {lang === 'ar' ? '💡 مستندات الدخول الافتراضية للتجربة:' : '💡 Experience Default Login Accounts:'}
            </div>
            <div>
              {lang === 'ar' ? '• حساب المدير: ' : '• Admin Mode: '}
              <span className="font-mono bg-slate-200 px-1 rounded text-red-700">admin</span>
              {lang === 'ar' ? ' كلمة السر: ' : ' pass: '}
              <span className="font-mono bg-slate-200 px-1 rounded text-red-700">admin123</span>
            </div>
            <div>
              {lang === 'ar' ? '• حساب الكاشير: ' : '• Cashier Mode: '}
              <span className="font-mono bg-slate-200 px-1 rounded text-red-700">kaseer</span>
              {lang === 'ar' ? ' كلمة السر: ' : ' pass: '}
              <span className="font-mono bg-slate-200 px-1 rounded text-red-700">1234</span>
            </div>
          </div>
          )}
        </form>
      </div>
    </div>
  );
}
