import React from 'react';
import { Globe, Sun, Moon, Maximize, Monitor, Lock, Store, LogOut, CalendarDays } from 'lucide-react';
import type { User } from '../types';

interface DisplayAccountPanelProps {
  lang: 'ar' | 'en';
  SYS_DATE: string;
  currentUser: User;
  handleToggleLang: () => void;
  toggleFullScreen: () => void;
  theme: 'light' | 'dark';
  setTheme: React.Dispatch<React.SetStateAction<'light' | 'dark'>>;
  posLayoutMode: 'modern' | 'terminal';
  setPosLayoutMode: React.Dispatch<React.SetStateAction<'modern' | 'terminal'>>;
  globalFontScale: number;
  setGlobalFontScale: (v: number) => void;
  globalButtonScale: number;
  setGlobalButtonScale: (v: number) => void;
  globalZoomScale: number;
  setGlobalZoomScale: (v: number) => void;
  onLock: () => void;
  onSwitchShop: () => void;
  handleLogout: () => void;
  showToast: (type: 'success' | 'error' | 'warning', message: string) => void;
}

/**
 * The screen and account controls that used to sit in the top header:
 * language, theme, full screen, till layout, sizes, the signed-in user, lock, switch shop and log out.
 * Shown as its own tab in Settings, and to cashiers on the Settings page as well.
 */
export function DisplayAccountPanel({
  lang, SYS_DATE, currentUser, handleToggleLang, toggleFullScreen, theme, setTheme, posLayoutMode, setPosLayoutMode,
  globalFontScale, setGlobalFontScale, globalButtonScale, setGlobalButtonScale, globalZoomScale, setGlobalZoomScale,
  onLock, onSwitchShop, handleLogout, showToast,
}: DisplayAccountPanelProps) {
  const ar = lang === 'ar';
  const tile = 'flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 text-right';
  const action = 'text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 flex items-center gap-1.5 cursor-pointer shrink-0';

  return (
    <div className="space-y-6 text-right" id="settings-display-account">
      {/* Account */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-800 text-base pb-3 border-b border-slate-100">{ar ? 'الحساب' : 'Account'}</h3>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">{currentUser.name}</span>
            <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">
              {currentUser.role === 'admin' ? (ar ? 'مدير' : 'Admin') : (ar ? 'كاشير' : 'Cashier')}
            </span>
            <span className="text-xs text-slate-500 flex items-center gap-1 ms-2">
              <CalendarDays className="w-3.5 h-3.5" />
              {ar ? 'تاريخ الجرد' : 'Audit date'}: <span className="font-mono">{SYS_DATE}</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" id="btn-settings-lock" onClick={onLock} className={action}>
              <Lock className="w-3.5 h-3.5" /><span>{ar ? 'قفل الشاشة' : 'Lock screen'}</span>
            </button>
            <button type="button" id="btn-header-switch-shop" onClick={onSwitchShop} className={action}>
              <Store className="w-3.5 h-3.5" /><span>{ar ? 'تبديل المحل' : 'Switch shop'}</span>
            </button>
            <button type="button" id="btn-settings-logout" onClick={handleLogout}
              className="text-xs font-bold px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center gap-1.5 cursor-pointer shrink-0">
              <LogOut className="w-3.5 h-3.5" /><span>{ar ? 'تسجيل الخروج' : 'Log out'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Screen */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-800 text-base pb-3 border-b border-slate-100">{ar ? 'الشاشة' : 'Screen'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className={tile}>
            <span className="text-sm font-bold text-slate-800">{ar ? 'اللغة' : 'Language'}</span>
            <button type="button" id="btn-settings-lang" onClick={handleToggleLang} className={action}>
              <Globe className="w-3.5 h-3.5" /><span>{ar ? 'English' : 'العربية'}</span>
            </button>
          </div>
          <div className={tile}>
            <span className="text-sm font-bold text-slate-800">{ar ? 'المظهر' : 'Theme'}</span>
            <button type="button" id="btn-settings-theme" onClick={() => setTheme(prev => (prev === 'light' ? 'dark' : 'light'))} className={action}>
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{theme === 'dark' ? (ar ? 'الوضع النهاري' : 'Light mode') : (ar ? 'الوضع الليلي' : 'Dark mode')}</span>
            </button>
          </div>
          <div className={tile}>
            <span className="text-sm font-bold text-slate-800">{ar ? 'ملء الشاشة' : 'Full screen'}</span>
            <button type="button" id="btn-settings-fullscreen" onClick={toggleFullScreen} className={action}>
              <Maximize className="w-3.5 h-3.5" /><span>{ar ? 'تشغيل / إيقاف' : 'On / off'}</span>
            </button>
          </div>
          <div className={tile}>
            <span className="text-sm font-bold text-slate-800">{ar ? 'شاشة البيع' : 'Till screen'}</span>
            <button
              type="button"
              id="btn-settings-layout"
              onClick={() => {
                const next = posLayoutMode === 'modern' ? 'terminal' : 'modern';
                setPosLayoutMode(next);
                if (next === 'terminal') setTheme('dark');
                showToast('success', next === 'terminal'
                  ? (ar ? 'صارت شاشة البيع على واجهة الكاشير لمس' : 'Till set to the touch layout')
                  : (ar ? 'صارت شاشة البيع على الواجهة العادية' : 'Till set to the standard layout'));
              }}
              className={action}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>{posLayoutMode === 'terminal' ? (ar ? 'واجهة عادية' : 'Standard layout') : (ar ? 'واجهة الكاشير لمس' : 'Touch layout')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sizes (moved here from the general settings tab) */}
      <div>
      {/* ACCESSIBILITY & DISPLAY SCALING SYSTEM CONTROLLER */}
      <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-2xl space-y-4 text-right">
        <h4 className="font-extrabold text-amber-800 text-xs sm:text-sm flex items-center gap-1.5 flex-row-reverse">
          <span>{lang === 'ar' ? 'التحكم بالزوم والخط وحجم الأزرار للبرنامج (دقة الشاشات المختلفة)' : 'UI Accessibility Sizing (Font, Buttons & Overall Screen Zoom)'}</span>
        </h4>
        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
          {lang === 'ar'
            ? 'بإمكانك تخصيص وتكبير كامل نصوص البرنامج وأزراره أو عمل زوم (Zoom Out/In) لكامل الصفحة لتناسب جميع شاشات نقاط البيع ذات الدقة المنخفضة أو التابلت.'
            : 'Customize and scale the entire program typography, button sizes, or apply general page zoom to fit smaller display resolutions and touch terminals.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1.5">
          {/* Font size */}
          <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center text-xs">
              <span className="font-mono font-black text-[#1D9E75] bg-emerald-50 px-2 py-0.5 rounded">
                {Math.round(globalFontScale * 100)}%
              </span>
              <span className="font-bold text-slate-700">
                {lang === 'ar' ? 'مؤشر حجم الخط العام:' : 'Global Font Scale Selector:'}
              </span>
            </div>
            <input 
              type="range"
              min="0.8"
              max="1.4"
              step="0.05"
              value={globalFontScale}
              onChange={(e) => setGlobalFontScale(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
            />
            <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-extrabold">
              <button type="button" onClick={() => setGlobalFontScale(0.85)} className={`p-1 rounded cursor-pointer ${globalFontScale === 0.85 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                {lang === 'ar' ? 'صغير' : 'Small'}
              </button>
              <button type="button" onClick={() => setGlobalFontScale(1.0)} className={`p-1 rounded cursor-pointer ${globalFontScale === 1.0 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                {lang === 'ar' ? 'افتراضي' : 'Default'}
              </button>
              <button type="button" onClick={() => setGlobalFontScale(1.15)} className={`p-1 rounded cursor-pointer ${globalFontScale === 1.15 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                {lang === 'ar' ? 'كبير' : 'Large'}
              </button>
              <button type="button" onClick={() => setGlobalFontScale(1.3)} className={`p-1 rounded cursor-pointer ${globalFontScale === 1.3 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                {lang === 'ar' ? 'ضخم' : 'Huge'}
              </button>
            </div>
          </div>

          {/* Button size */}
          <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center text-xs">
              <span className="font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {Math.round(globalButtonScale * 100)}%
              </span>
              <span className="font-bold text-slate-700">
                {lang === 'ar' ? 'مؤشر حجم الأزرار والتفاعل:' : 'Button Touch Sizing Scale:'}
              </span>
            </div>
            <input 
              type="range"
              min="0.8"
              max="1.4"
              step="0.05"
              value={globalButtonScale}
              onChange={(e) => setGlobalButtonScale(parseFloat(e.target.value))}
              className="w-full accent-blue-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
            />
            <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-extrabold">
              <button type="button" onClick={() => setGlobalButtonScale(0.85)} className={`p-1 rounded cursor-pointer ${globalButtonScale === 0.85 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                {lang === 'ar' ? 'مضغوط' : 'Compact'}
              </button>
              <button type="button" onClick={() => setGlobalButtonScale(1.0)} className={`p-1 rounded cursor-pointer ${globalButtonScale === 1.0 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                {lang === 'ar' ? 'افتراضي' : 'Default'}
              </button>
              <button type="button" onClick={() => setGlobalButtonScale(1.15)} className={`p-1 rounded cursor-pointer ${globalButtonScale === 1.15 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                {lang === 'ar' ? 'مريح' : 'Comfortable'}
              </button>
              <button type="button" onClick={() => setGlobalButtonScale(1.3)} className={`p-1 rounded cursor-pointer ${globalButtonScale === 1.3 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                {lang === 'ar' ? 'لمس ضخم' : 'Touch XL'}
              </button>
            </div>
          </div>

          {/* Screen Zoom Scale */}
          <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center text-xs">
              <span className="font-mono font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded">
                {Math.round(globalZoomScale * 100)}%
              </span>
              <span className="font-bold text-slate-700">
                {lang === 'ar' ? 'الزوم ودقة الشاشة الكاملة:' : 'Screen Zoom & Resolution:'}
              </span>
            </div>
            <input 
              type="range"
              min="0.6"
              max="1.2"
              step="0.05"
              value={globalZoomScale}
              onChange={(e) => setGlobalZoomScale(parseFloat(e.target.value))}
              className="w-full accent-violet-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
            />
            <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-extrabold">
              <button type="button" onClick={() => {
                setGlobalZoomScale(0.75);
                showToast('success', lang === 'ar' ? 'زوم لـ 75%' : 'Zoom set to 75%');
              }} className={`p-1 rounded cursor-pointer ${globalZoomScale === 0.75 ? 'bg-violet-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                75% ({lang === 'ar' ? 'صغيرة' : 'Small'})
              </button>
              <button type="button" onClick={() => {
                setGlobalZoomScale(0.85);
                showToast('success', lang === 'ar' ? 'زوم لـ 85%' : 'Zoom set to 85%');
              }} className={`p-1 rounded cursor-pointer ${globalZoomScale === 0.85 ? 'bg-violet-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                85%
              </button>
              <button type="button" onClick={() => {
                setGlobalZoomScale(1.0);
                showToast('success', lang === 'ar' ? 'زوم لـ 100%' : 'Zoom set to 100%');
              }} className={`p-1 rounded cursor-pointer ${globalZoomScale === 1.0 ? 'bg-violet-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                100%
              </button>
              <button type="button" onClick={() => {
                setGlobalZoomScale(1.15);
                showToast('success', lang === 'ar' ? 'زوم لـ 115%' : 'Zoom set to 115%');
              }} className={`p-1 rounded cursor-pointer ${globalZoomScale === 1.15 ? 'bg-violet-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                115%
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 text-[10px] text-slate-400 font-semibold pt-1">
          <span>{lang === 'ar' ? 'يتم حفظ هذه القيم وتفعيلها فورياً ومزامنتها على هذا المتصفح.' : 'Changes apply immediately and persist in this browser.'}</span>
        </div>
      </div>
      </div>
    </div>
  );
}
