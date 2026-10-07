import type { LicenseState } from '../hooks/useLicense';
import { Globe, Sun, Moon, Maximize, Monitor, Lock, Clock, MessageCircle, Unlock } from 'lucide-react';
import { Invoice, User, SystemSettings } from '../types';
import React, { useState } from 'react';
import * as storage from '../lib/storage';
import { BeeCashMark } from './BeeCashLogo';

interface AppHeaderProps {
  SYS_DATE: string;
  lang: "ar" | "en";
  handleToggleLang: () => void;
  toggleFullScreen: () => void;
  settings: SystemSettings;
  invoices: Invoice[];
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  currentUser: User;
  theme: "light" | "dark";
  setTheme: React.Dispatch<React.SetStateAction<"light" | "dark">>;
  posLayoutMode: "modern" | "terminal";
  setPosLayoutMode: React.Dispatch<React.SetStateAction<"modern" | "terminal">>;
  globalFontScale: number;
  setGlobalFontScale: React.Dispatch<React.SetStateAction<number>>;
  globalButtonScale: number;
  setGlobalButtonScale: React.Dispatch<React.SetStateAction<number>>;
  globalZoomScale: number;
  setGlobalZoomScale: React.Dispatch<React.SetStateAction<number>>;
  setIsScreenLocked: React.Dispatch<React.SetStateAction<boolean>>;
  setLockPasscode: React.Dispatch<React.SetStateAction<string>>;
  setLockError: React.Dispatch<React.SetStateAction<string>>;
  license: LicenseState;
  setShowPurchaseContactModal: React.Dispatch<React.SetStateAction<boolean>>;
  /** Opens the subscription picker (shop type, plan, request). */
  onSubscribe: () => void;
  /** A subscription request was sent and is waiting for approval. */
  subscriptionPending: boolean;
  handleLogout: () => void;
  /** Sign out and pick another shop kept on this browser. */
  onSwitchShop: () => void;
  showToast: (type: "success" | "error" | "warning", message: string) => void;
}

export function AppHeader({
  SYS_DATE,
  lang,
  handleToggleLang,
  toggleFullScreen,
  settings,
  invoices,
  activeTab,
  setActiveTab,
  currentUser,
  theme,
  setTheme,
  posLayoutMode,
  setPosLayoutMode,
  globalFontScale,
  setGlobalFontScale,
  globalButtonScale,
  setGlobalButtonScale,
  globalZoomScale,
  setGlobalZoomScale,
  setIsScreenLocked,
  setLockPasscode,
  setLockError,
  license,
  setShowPurchaseContactModal,
  onSubscribe,
  subscriptionPending,
  handleLogout,
  onSwitchShop,
  showToast,
}: AppHeaderProps) {
  const [showSizeControlPopover, setShowSizeControlPopover] = useState<boolean>(false);

  return (
    <header className={`bg-white border-b border-slate-200 sticky top-0 z-30 font-sans ${activeTab === 'pos' && posLayoutMode === 'terminal' ? 'hidden' : ''}`} id="system-header">
      <div className="w-full max-w-none px-4 sm:px-6 lg:px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-4">

        {/* Brand Logo & Shop Name (At Start of direction: right in RTL, left in LTR) */}
        <div className="flex items-center gap-3 shrink-0">
          {settings.shopLogo ? (
            <img 
              src={settings.shopLogo} 
              alt={settings.shopName} 
              className="max-h-12 w-auto object-contain rounded-xl shadow-xs" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <BeeCashMark className="w-11 h-11 shrink-0" />
          )}
          <div className="text-right">
            <h2 className="text-lg font-bold text-slate-900">{settings.shopName}</h2>
            <p className="text-xs text-emerald-600 font-semibold text-right">
              {lang === 'ar' ? 'صرف الدولار المعتمد' : 'Current Exchange Rate'}: {settings.exchangeRate.toLocaleString()} {lang === 'ar' ? 'ل.ل' : 'LBP'} / 1 $
            </p>
          </div>
        </div>

        {/* Profiles and control buttons (At End of direction: left in RTL, right in LTR) */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {/* Dynamic Globe Language Toggle */}
          <button
            onClick={handleToggleLang}
            className="text-xs bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer"
            title={lang === 'ar' ? 'Switch to English' : 'تحويل للغة العربية'}
          >
            <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>{lang === 'ar' ? 'English 🇺🇸' : 'العربية 🇱🇧'}</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            className="text-xs bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer"
            title={lang === 'ar' ? 'تبديل المظهر' : 'Toggle Theme'}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
            <span>{theme === 'dark' ? (lang === 'ar' ? 'الوضع النهاري ☀️' : 'Light Mode ☀️') : (lang === 'ar' ? 'الوضع الليلي 🌙' : 'Dark Mode 🌙')}</span>
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            onClick={toggleFullScreen}
            className="text-xs bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
            title={lang === 'ar' ? 'تبديل ملء الشاشة' : 'Toggle Fullscreen'}
          >
            <Maximize className="w-3.5 h-3.5 text-indigo-600" />
            <span>{lang === 'ar' ? 'ملء الشاشة 🖥️' : 'Fullscreen 🖥️'}</span>
          </button>

          {/* POS Layout Mode Switcher */}
          <button
            onClick={() => {
              const newVal = posLayoutMode === 'modern' ? 'terminal' : 'modern';
              setPosLayoutMode(newVal);
              if (newVal === 'terminal') {
                setTheme('dark');
              }
              showToast('success', lang === 'ar' ? `🖥️ تم تنشيط شاشة نقاط البيع الاحترافية` : `🖥️ Switched to POS Touch Terminal`);
            }}
            className="text-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg font-extrabold flex items-center gap-1.5 transition cursor-pointer shrink-0"
            title={lang === 'ar' ? 'تعديل تصميم شاشة البيع المباشر' : 'Toggle POS Screen Layout Division'}
          >
            <Monitor className="w-3.5 h-3.5 text-emerald-600" />
            <span>{posLayoutMode === 'terminal' ? (lang === 'ar' ? '🖥️ واجهة عادية' : '🖥️ Standard Dashboard') : (lang === 'ar' ? '🖥️ واجهة الكاشير لمس' : '🖥️ Terminal Cashier')}</span>
          </button>

          {/* Accessibility / Global Scale Panel Button */}
          <div className="relative">
            <button
              onClick={() => setShowSizeControlPopover(!showSizeControlPopover)}
              className="text-xs bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-lg font-extrabold flex items-center gap-1.5 transition cursor-pointer"
              title={lang === 'ar' ? 'التحكم بحجم الخط والأزرار' : 'Font & Button Size Control'}
            >
              <span>🔤</span>
              <span>{lang === 'ar' ? 'حجم الخط والأزرار' : 'Sizes'}</span>
            </button>

            {showSizeControlPopover && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSizeControlPopover(false)} />
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-800 rounded-2xl shadow-xl p-4 z-50 text-right space-y-4 no-print animate-in fade-in duration-100">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-stone-800 pb-2">
                    <button 
                      onClick={() => {
                        setGlobalFontScale(1.0);
                        setGlobalButtonScale(1.0);
                        setGlobalZoomScale(0.85);
                        showToast('success', lang === 'ar' ? '♻️ تم إعادة تعيين الأحجام الافتراضية' : '♻️ Default sizes restored');
                      }}
                      className="text-[10px] text-red-600 dark:text-red-400 font-bold hover:underline"
                    >
                      {lang === 'ar' ? 'إعادة تعيين' : 'Reset'}
                    </button>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-stone-200 flex items-center gap-1.5">
                      <span>{lang === 'ar' ? 'التحكم بالأحجام العامة' : 'Global UI Scaling'}</span>
                      <span>📏</span>
                    </h4>
                  </div>

                  {/* Font Size Controller */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono font-bold text-[#1D9E75]">
                        {Math.round(globalFontScale * 100)}%
                      </span>
                      <span className="font-bold text-slate-700 dark:text-stone-300">
                        {lang === 'ar' ? 'حجم الخط:' : 'Text Font Size:'}
                      </span>
                    </div>
                    <input 
                      type="range"
                      min="0.8"
                      max="1.4"
                      step="0.05"
                      value={globalFontScale}
                      onChange={(e) => setGlobalFontScale(parseFloat(e.target.value))}
                      className="w-full accent-emerald-600 h-1.5 bg-slate-100 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="grid grid-cols-4 gap-1 text-[9px] text-center font-bold">
                      <button onClick={() => setGlobalFontScale(0.85)} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                        {lang === 'ar' ? 'صغير' : 'Small'}
                      </button>
                      <button onClick={() => setGlobalFontScale(1.0)} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                        {lang === 'ar' ? 'افتراضي' : 'Default'}
                      </button>
                      <button onClick={() => setGlobalFontScale(1.15)} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                        {lang === 'ar' ? 'كبير' : 'Large'}
                      </button>
                      <button onClick={() => setGlobalFontScale(1.3)} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                        {lang === 'ar' ? 'ضخم' : 'Huge'}
                      </button>
                    </div>
                  </div>

                  {/* Button Size Controller */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-stone-800/60">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {Math.round(globalButtonScale * 100)}%
                      </span>
                      <span className="font-bold text-slate-700 dark:text-stone-300">
                        {lang === 'ar' ? 'حجم الأزرار والتفاعل:' : 'Button Sizing:'}
                      </span>
                    </div>
                    <input 
                      type="range"
                      min="0.8"
                      max="1.4"
                      step="0.05"
                      value={globalButtonScale}
                      onChange={(e) => setGlobalButtonScale(parseFloat(e.target.value))}
                      className="w-full accent-blue-600 h-1.5 bg-slate-100 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="grid grid-cols-4 gap-1 text-[9px] text-center font-bold">
                      <button onClick={() => setGlobalButtonScale(0.85)} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                        {lang === 'ar' ? 'مضغوط' : 'Compact'}
                      </button>
                      <button onClick={() => setGlobalButtonScale(1.0)} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                        {lang === 'ar' ? 'افتراضي' : 'Default'}
                      </button>
                      <button onClick={() => setGlobalButtonScale(1.15)} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                        {lang === 'ar' ? 'مريح' : 'Comfortable'}
                      </button>
                      <button onClick={() => setGlobalButtonScale(1.3)} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                        {lang === 'ar' ? 'لمس ضخم' : 'Large Touch'}
                      </button>
                    </div>
                  </div>

                  {/* Screen Zoom Controller */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-stone-800/60">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono font-bold text-violet-600 dark:text-violet-400">
                        {Math.round(globalZoomScale * 100)}%
                      </span>
                      <span className="font-bold text-slate-700 dark:text-stone-300">
                        {lang === 'ar' ? 'الزوم ودقة الشاشة:' : 'Screen Zoom Scale:'}
                      </span>
                    </div>
                    <input 
                      type="range"
                      min="0.6"
                      max="1.2"
                      step="0.05"
                      value={globalZoomScale}
                      onChange={(e) => setGlobalZoomScale(parseFloat(e.target.value))}
                      className="w-full accent-violet-600 h-1.5 bg-slate-100 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="grid grid-cols-4 gap-1 text-[9px] text-center font-bold">
                      <button onClick={() => {
                        setGlobalZoomScale(0.75);
                        showToast('success', lang === 'ar' ? '🔍 تم تعيين الزوم لـ 75% للشاشات الصغيرة' : '🔍 Zoom set to 75%');
                      }} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                        75%
                      </button>
                      <button onClick={() => {
                        setGlobalZoomScale(0.85);
                        showToast('success', lang === 'ar' ? '🔍 تم تعيين الزوم لـ 85% للوضوح العالي' : '🔍 Zoom set to 85%');
                      }} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                        85%
                      </button>
                      <button onClick={() => {
                        setGlobalZoomScale(1.0);
                        showToast('success', lang === 'ar' ? '🔍 تم تعيين الزوم لـ 100% الافتراضي' : '🔍 Zoom set to 100%');
                      }} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                        100%
                      </button>
                      <button onClick={() => {
                        setGlobalZoomScale(1.15);
                        showToast('success', lang === 'ar' ? '🔍 تم تعيين الزوم لـ 115% للتكبير' : '🔍 Zoom set to 115%');
                      }} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                        115%
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <span className="text-xs text-slate-400 font-mono bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-100 shrink-0">
            {lang === 'ar' ? 'تاريخ الجرد' : 'Audit Date'}: {SYS_DATE}
          </span>
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-100 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold">{currentUser.name}</span>
            <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">
              {currentUser.role === 'admin' ? (lang === 'ar' ? 'مدير' : 'Admin') : (lang === 'ar' ? 'كاشير' : 'Cashier')}
            </span>
          </div>
          <button
            onClick={() => {
              setIsScreenLocked(true);
              storage.setItem('pos_screen_locked', 'true');
              setLockPasscode('');
              setLockError('');
              showToast('success', lang === 'ar' ? '🔒 تم تأمين شاشة النظام بنجاح' : '🔒 System terminal locked successfully');
            }}
            className="text-xs text-slate-700 hover:text-[#1D9E75] bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-lg transition font-bold border border-slate-200 cursor-pointer shrink-0 flex items-center gap-1"
            title={lang === 'ar' ? 'تأمين شاشة البيع' : 'Lock Screen'}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'قفل الشاشة' : 'Lock Screen'}</span>
          </button>
          <button
            type="button"
            id="btn-header-switch-shop"
            onClick={onSwitchShop}
            className="text-xs text-slate-700 hover:text-[#1D9E75] bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-lg transition font-bold border border-slate-200 cursor-pointer shrink-0"
            title={lang === 'ar' ? 'تبديل المحل' : 'Switch shop'}
          >
            🏪 {lang === 'ar' ? 'تبديل المحل' : 'Switch shop'}
          </button>
          <button 
            onClick={handleLogout}
            className="text-xs text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-lg transition font-bold border border-rose-100 cursor-pointer shrink-0"
          >
            {lang === 'ar' ? 'تسجيل الخروج 👋' : 'Logout 👋'}
          </button>
        </div>

      </div>

      {/* TRIAL & ACTIVATION MANAGEMENT BANNERS MERGED IN HEADER */}
      {!license.isActivated && (
        <div className="bg-amber-500/10 border-t border-b border-amber-500/20 px-4 sm:px-6 lg:px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-amber-850 font-semibold no-print">
          <div className="flex items-center gap-2 flex-row-reverse text-right">
            <Clock className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
            <span>
              {lang === 'ar' ? 'البرنامج يعمل حالياً بالوضع التجريبي: ' : 'System running in sandbox trial mode: '}
              <span className="font-sans text-amber-700 font-bold ml-1">
                {lang === 'ar' 
                  ? Math.max(0, 15 - invoices.length) <= 0 
                    ? '🚨 انتهت صلاحية الفترة التجريبية (الحد الأقصى 15 فاتورة مبيعات). يرجى تفعيل البرنامج فوراً للمتابعة.'
                    : `تم إصدار ${invoices.length} من أصل 15 فاتورة تجريبية كحد أقصى. فعّل البرنامج للعمل اللامحدود.` 
                  : Math.max(0, 15 - invoices.length) <= 0
                    ? '🚨 Trial expired (Max 15 reached). Please activate to resume.'
                    : `Emitted ${invoices.length} of 15 allowed trial invoices. Activate for unlimited.`}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="btn-subscribe"
              onClick={onSubscribe}
              className={`${subscriptionPending ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#1E1B16] hover:bg-black'} text-white font-extrabold text-[10px] py-1 px-3 rounded-lg transition duration-150 cursor-pointer shadow-sm`}
            >
              {subscriptionPending
                ? (lang === 'ar' ? '⏳ طلب الاشتراك قيد المراجعة' : '⏳ Subscription pending')
                : (lang === 'ar' ? '⭐ اشترك الآن' : '⭐ Subscribe')}
            </button>
            <button
              type="button"
              onClick={() => setShowPurchaseContactModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] py-1 px-3 rounded-lg transition duration-150 cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'تواصل للتفعيل 💬' : 'Contact to Activate 💬'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('settings');
                setTimeout(() => {
                  const el = document.getElementById('activation-card-panel');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 250);
              }}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] py-1 px-2.5 rounded-lg transition duration-150 cursor-pointer flex items-center gap-1"
            >
              <Unlock className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'ar' ? 'إدخل المفتاح 🗝️' : 'Enter Key 🗝️'}</span>
            </button>
          </div>
        </div>
      )}

      {license.inGracePeriod && (
        <div className="bg-amber-500/10 border-t border-b border-amber-500/20 px-4 sm:px-6 lg:px-4 py-1.5 flex justify-between items-center text-[11px] text-amber-800 font-bold no-print flex-row-reverse gap-3">
          <span>
            {lang === 'ar'
              ? `⚠️ تم تحديث نظام التفعيل. يرجى إدخال كود تفعيل جديد خلال ${license.graceDaysLeft} يوم للاستمرار بدون انقطاع.`
              : `⚠️ Activation system updated. Please enter a new activation key within ${license.graceDaysLeft} days.`}
          </span>
          <button
            type="button"
            onClick={() => setShowPurchaseContactModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] py-1 px-3 rounded-lg transition duration-150 cursor-pointer shrink-0"
          >
            {lang === 'ar' ? 'طلب كود جديد 💬' : 'Request new key 💬'}
          </button>
        </div>
      )}

      {license.isLicensed && (
        <div className="bg-emerald-500/5 border-t border-slate-100 px-4 sm:px-6 lg:px-4 py-1.5 flex justify-between items-center text-[11px] text-[#1D9E75] font-bold no-print flex-row-reverse">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>
              {license.daysRemaining === null
                ? (lang === 'ar' ? 'ترخيص مدى الحياة نشط لـ: ' : 'Lifetime licence active for: ')
                : (lang === 'ar' ? 'الاشتراك السنوي نشط وفعال لـ: ' : 'Annual Subscription active for: ')}
              <span className="text-slate-900 font-extrabold ml-1">{settings.shopName}</span>
              {license.daysRemaining !== null && (
                <span className="text-[#1D9E75] font-black mr-2">({lang === 'ar' ? `المتبقي: ${license.daysRemaining} يوم` : `Remaining: ${license.daysRemaining} days`})</span>
              )}
            </span>
          </span>
        </div>
      )}
    </header>
  );
}
