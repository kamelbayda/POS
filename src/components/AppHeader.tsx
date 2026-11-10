import type { LicenseState } from '../hooks/useLicense';
import { Clock, MessageCircle, Unlock } from 'lucide-react';
import { Invoice, SystemSettings } from '../types';
import React from 'react';
import { BeeCashMark } from './BeeCashLogo';
import { trialInvoicesUsed, TRIAL_LIMIT } from '../lib/trial';

interface AppHeaderProps {
  lang: "ar" | "en";
  settings: SystemSettings;
  invoices: Invoice[];
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  posLayoutMode: "modern" | "terminal";
  license: LicenseState;
  setShowPurchaseContactModal: React.Dispatch<React.SetStateAction<boolean>>;
  /** Opens the subscription picker (shop type, plan, request). */
  onSubscribe: () => void;
  /** A subscription request was sent and is waiting for approval. */
  subscriptionPending: boolean;
}

export function AppHeader({
  lang,
  settings,
  invoices,
  activeTab,
  setActiveTab,
  posLayoutMode,
  license,
  setShowPurchaseContactModal,
  onSubscribe,
  subscriptionPending,
}: AppHeaderProps) {
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
                  ? Math.max(0, TRIAL_LIMIT - trialInvoicesUsed(invoices)) <= 0 
                    ? 'انتهت صلاحية الفترة التجريبية (الحد الأقصى 15 فاتورة مبيعات). يرجى تفعيل البرنامج فوراً للمتابعة.'
                    : `تم إصدار ${trialInvoicesUsed(invoices)} من أصل 15 فاتورة تجريبية كحد أقصى. فعّل البرنامج للعمل اللامحدود.` 
                  : Math.max(0, TRIAL_LIMIT - trialInvoicesUsed(invoices)) <= 0
                    ? 'Trial expired (Max 15 reached). Please activate to resume.'
                    : `Emitted ${trialInvoicesUsed(invoices)} of 15 allowed trial invoices. Activate for unlimited.`}
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
                ? (lang === 'ar' ? 'طلب الاشتراك قيد المراجعة' : 'Subscription pending')
                : (lang === 'ar' ? 'اشترك الآن' : 'Subscribe')}
            </button>
            <button
              type="button"
              onClick={() => setShowPurchaseContactModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] py-1 px-3 rounded-lg transition duration-150 cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'تواصل للتفعيل' : 'Contact to Activate'}</span>
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
              <span>{lang === 'ar' ? 'إدخل المفتاح' : 'Enter Key'}</span>
            </button>
          </div>
        </div>
      )}

      {license.inGracePeriod && (
        <div className="bg-amber-500/10 border-t border-b border-amber-500/20 px-4 sm:px-6 lg:px-4 py-1.5 flex justify-between items-center text-[11px] text-amber-800 font-bold no-print flex-row-reverse gap-3">
          <span>
            {lang === 'ar'
              ? `تم تحديث نظام التفعيل. يرجى إدخال كود تفعيل جديد خلال ${license.graceDaysLeft} يوم للاستمرار بدون انقطاع.`
              : `Activation system updated. Please enter a new activation key within ${license.graceDaysLeft} days.`}
          </span>
          <button
            type="button"
            onClick={() => setShowPurchaseContactModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] py-1 px-3 rounded-lg transition duration-150 cursor-pointer shrink-0"
          >
            {lang === 'ar' ? 'طلب كود جديد' : 'Request new key'}
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
