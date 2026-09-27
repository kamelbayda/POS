import { motion } from 'motion/react';
import React from 'react';

interface QuickAddCustomerModalProps {
  lang: "ar" | "en";
  setShowQuickAddCustomerModal: React.Dispatch<React.SetStateAction<boolean>>;
  quickAddCustomerName: string;
  setQuickAddCustomerName: React.Dispatch<React.SetStateAction<string>>;
  quickAddCustomerPhone: string;
  setQuickAddCustomerPhone: React.Dispatch<React.SetStateAction<string>>;
  quickAddCustomerType: "retail" | "wholesale";
  setQuickAddCustomerType: React.Dispatch<React.SetStateAction<"retail" | "wholesale">>;
  quickAddCustomerDebtLimit: string;
  setQuickAddCustomerDebtLimit: React.Dispatch<React.SetStateAction<string>>;
  handleQuickAddCustomerSubmit: () => void;
}

export function QuickAddCustomerModal({
  lang,
  setShowQuickAddCustomerModal,
  quickAddCustomerName,
  setQuickAddCustomerName,
  quickAddCustomerPhone,
  setQuickAddCustomerPhone,
  quickAddCustomerType,
  setQuickAddCustomerType,
  quickAddCustomerDebtLimit,
  setQuickAddCustomerDebtLimit,
  handleQuickAddCustomerSubmit,
}: QuickAddCustomerModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="quick-add-customer-modal">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-6 w-full max-w-md text-right border border-emerald-150 shadow-2xl space-y-4 font-sans"
      >
        <div className="text-center space-y-2">
          <span className="text-3xl">👤</span>
          <h3 className="text-base font-black text-slate-800">
            {lang === 'ar' ? 'تسجيل زبون جديد فوري ومطابق' : 'Quick Register New Customer'}
          </h3>
          <p className="text-[11px] text-slate-400 font-medium">
            {lang === 'ar' 
              ? 'سجل حساب زبون جديد مباشرة من شاشة البيع لربط النسبة، الديون ونقاط الولاء بالفاتورة الحالية.'
              : 'Register a client account instantly to bind current cart stats, loyalty points, and credit accounts.'}
          </p>
        </div>

        <div className="space-y-3.5 text-right">
          <div>
            <label className="block text-slate-500 mb-1 text-[11px] font-bold">
              {lang === 'ar' ? 'الاسم الكامل للزبون/الشركة *:' : 'Customer/Business Full Name *:'}
            </label>
            <input 
              type="text" 
              value={quickAddCustomerName} 
              onChange={e => setQuickAddCustomerName(e.target.value)}
              placeholder={lang === 'ar' ? 'كتب الاسم هنا... (مثال: أحمد العلي)' : 'e.g. Ahmad Al Ali'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-right font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1 text-[11px] font-bold">
              {lang === 'ar' ? 'رقم الهاتف للتواصل والدين:' : 'Phone Number (Credit Account ID):'}
            </label>
            <input 
              type="text" 
              value={quickAddCustomerPhone} 
              onChange={e => setQuickAddCustomerPhone(e.target.value)}
              placeholder="e.g. +961 70 082327"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-center font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1 text-[11px] font-bold">
                {lang === 'ar' ? 'سقف ديون الزبون بقيمة ($):' : 'Max Debt Limit ($):'}
              </label>
              <input 
                type="number" 
                value={quickAddCustomerDebtLimit} 
                onChange={e => setQuickAddCustomerDebtLimit(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-center font-bold font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1 text-[11px] font-bold">
                {lang === 'ar' ? 'فئة التسعير الافتراضية:' : 'Customer Pricing Mode:'}
              </label>
              <select 
                value={quickAddCustomerType} 
                onChange={e => setQuickAddCustomerType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-right font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                <option value="retail">{lang === 'ar' ? 'مستقل / مفرّق' : 'Retail'}</option>
                <option value="wholesale">{lang === 'ar' ? 'جملة / شركات' : 'Wholesale'}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-2 text-xs font-sans pt-2">
          <button 
            type="button"
            onClick={handleQuickAddCustomerSubmit}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
          >
            💾 {lang === 'ar' ? 'حفظ الحساب وربطه فوراً' : 'Save & Link Now'}
          </button>
          <button 
            type="button"
            onClick={() => {
              setQuickAddCustomerName('');
              setQuickAddCustomerPhone('');
              setQuickAddCustomerType('retail');
              setQuickAddCustomerDebtLimit('1000');
              setShowQuickAddCustomerModal(false);
            }}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition cursor-pointer"
          >
            {lang === 'ar' ? 'تراجع' : 'Cancel'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
