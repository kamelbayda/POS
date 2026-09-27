import { motion } from 'motion/react';
import { Printer, Delete } from 'lucide-react';
import { SystemSettings, Customer } from '../types';
import React from 'react';

interface TouchPaymentModalProps {
  lang: "ar" | "en";
  settings: SystemSettings;
  customers: Customer[];
  discountInput: string;
  setDiscountInput: React.Dispatch<React.SetStateAction<string>>;
  paidUSDInput: string;
  setPaidUSDInput: React.Dispatch<React.SetStateAction<string>>;
  paidLBPInput: string;
  setPaidLBPInput: React.Dispatch<React.SetStateAction<string>>;
  setIsTouchPaymentModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  touchPaymentActiveField: "usd" | "lbp" | "discount";
  setTouchPaymentActiveField: React.Dispatch<React.SetStateAction<"usd" | "lbp" | "discount">>;
  paymentMethod: "cash" | "card" | "transfer" | "debt";
  setPaymentMethod: React.Dispatch<React.SetStateAction<"cash" | "card" | "transfer" | "debt">>;
  selectedCustomerId: string;
  theme: "light" | "dark";
  showToast: (type: "success" | "error" | "warning", message: string) => void;
  hardwarePrinterType: "system" | "usb" | "serial";
  openCashDrawer: () => Promise<void>;
  triggerCustomerSearch: () => void;
  cartSubtotalUSD: number;
  cartTotalUSD: number;
  cartTotalLBP: number;
  changeUSD: number;
  changeLBP: number;
  handleCheckout: (overrideMethod?: "cash" | "card" | "transfer" | "debt") => void;
}

export function TouchPaymentModal({
  lang,
  settings,
  customers,
  discountInput,
  setDiscountInput,
  paidUSDInput,
  setPaidUSDInput,
  paidLBPInput,
  setPaidLBPInput,
  setIsTouchPaymentModalOpen,
  touchPaymentActiveField,
  setTouchPaymentActiveField,
  paymentMethod,
  setPaymentMethod,
  selectedCustomerId,
  theme,
  showToast,
  hardwarePrinterType,
  openCashDrawer,
  triggerCustomerSearch,
  cartSubtotalUSD,
  cartTotalUSD,
  cartTotalLBP,
  changeUSD,
  changeLBP,
  handleCheckout,
}: TouchPaymentModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans" id="touch-payment-modal">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-3xl p-6 w-full max-w-3xl text-right shadow-2xl border flex flex-col md:flex-row gap-6 ${theme === 'dark' ? 'bg-[#1C1C1E] border-stone-850 text-stone-100' : 'bg-white border-slate-200 text-slate-800'}`}
      >
        {/* Right Division: Checkout Totals & Calculations (Matches mockup order precisely) */}
        <div className="flex-1 space-y-3.5 flex flex-col justify-between">
          <div>
            {/* Header inside modal */}
            <div className="flex justify-between items-center pb-2 border-b border-stone-880/10">
              <button 
                type="button"
                onClick={() => setIsTouchPaymentModalOpen(false)}
                className="p-1 px-3 rounded-lg text-xs font-black bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 cursor-pointer animate-fade-in"
              >
                {lang === 'ar' ? 'إلغاء' : 'Close'}
              </button>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base">{lang === 'ar' ? 'تسوية الفاتورة وحساب المرتجع للزبون' : 'Invoice Settlement'}</span>
                <span className="text-xl">💵</span>
              </div>
            </div>

            {/* Selected Customer indicator (if any) */}
            {selectedCustomerId && (
              <div className={`p-2 py-1.5 my-2 rounded-xl text-xs text-center font-bold border ${theme === 'dark' ? 'bg-amber-950/20 border-amber-900/40 text-amber-300' : 'bg-amber-50 border-amber-200/40 text-amber-800'}`}>
                🔗 {lang === 'ar' ? 'الزبون المُرتبط:' : 'Linked Customer:'} {customers.find(c => c.id === selectedCustomerId)?.name || 'زبون محدد'}
              </div>
            )}

            <div className="space-y-2.5 my-3">
              {/* (1) المجموع الجزئي (Subtotal) */}
              <div className={`flex justify-between items-center text-sm font-bold ${theme === 'dark' ? 'text-stone-300' : 'text-slate-600'}`}>
                <span>{lang === 'ar' ? 'المجموع الجزئي:' : 'Subtotal:'}</span>
                <span className={`font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  $ {cartSubtotalUSD.toFixed(2)}
                </span>
              </div>

              {/* (2) خصم نقدي مباشر ($) */}
              <div className={`flex justify-between items-center text-sm font-bold gap-4 ${theme === 'dark' ? 'text-stone-300' : 'text-slate-600'}`}>
                <span>{lang === 'ar' ? 'خصم نقدي مباشر ($):' : 'Direct cash discount ($):'}</span>
                <div 
                  onClick={() => setTouchPaymentActiveField('discount')}
                  className={`flex items-center gap-1.5 cursor-pointer rounded-xl px-2.5 py-1.5 border transition-all ${touchPaymentActiveField === 'discount' ? 'border-[#1D9E75] bg-emerald-500/5 ring-2 ring-[#1D9E75]/30' : (theme === 'dark' ? 'border-stone-800 bg-[#121213] text-white' : 'border-slate-250 bg-slate-50 text-slate-900 shadow-inner')}`}
                >
                  <span className="text-xs font-bold text-slate-400 font-mono">$</span>
                  <span className={`w-16 text-center font-mono font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {discountInput || '0'}
                  </span>
                </div>
              </div>

              {/* (3) المطلوب الكلي ($) */}
              <div className={`flex justify-between items-center pt-2.5 border-t ${theme === 'dark' ? 'border-stone-850' : 'border-slate-250'}`}>
                <span className={`font-black text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{lang === 'ar' ? 'المطلوب الكلي ($):' : 'Total Amount ($):'}</span>
                <span className={`text-2xl font-black font-mono ${theme === 'dark' ? 'text-rose-500' : 'text-rose-600'}`}>
                  $ {cartTotalUSD.toFixed(2)}
                </span>
              </div>

              {/* (4) المجموع بـ ليرة */}
              <div className="flex justify-between items-center pb-0.5">
                <span className={`text-xs font-bold px-2.5 py-1 rounded border ${theme === 'dark' ? 'text-emerald-400 bg-emerald-950/40 border-emerald-900/40' : 'text-emerald-750 bg-emerald-50 border-emerald-150'}`}>
                  {lang === 'ar' ? 'المجموع بـ ليرة' : 'Total LBP'}
                </span>
                <span className={`text-xl font-black font-mono ${theme === 'dark' ? 'text-emerald-400' : 'text-[#1D9E75]'}`}>
                  {Math.ceil(cartTotalLBP).toLocaleString()} ل.ل
                </span>
              </div>

              {/* (5 & 6) Cash received Green Container */}
              <div className={`rounded-2xl p-3 space-y-3 border ${theme === 'dark' ? 'bg-[#18181A] border-stone-800' : 'bg-[#EAF6ED]/70 border-emerald-100'}`}>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div 
                    onClick={() => setTouchPaymentActiveField('usd')}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${touchPaymentActiveField === 'usd' ? 'bg-white border-[#1D9E75] ring-2 ring-[#1D9E75]/30' : (theme === 'dark' ? 'bg-[#121213] border-stone-850' : 'bg-white border-emerald-205 shadow-sm')}`}
                  >
                    <span className={`block mb-0.5 text-right text-[10.5px] font-black ${theme === 'dark' ? 'text-stone-400' : 'text-slate-600'}`}>{lang === 'ar' ? 'المدفوع دولار ($):' : 'Paid USD ($):'}</span>
                    <div className={`font-mono font-black text-center text-base py-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {paidUSDInput || '0'}
                    </div>
                  </div>

                  <div 
                    onClick={() => setTouchPaymentActiveField('lbp')}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${touchPaymentActiveField === 'lbp' ? 'bg-white border-[#1D9E75] ring-2 ring-[#1D9E75]/30' : (theme === 'dark' ? 'bg-[#121213] border-stone-850' : 'bg-white border-emerald-205 shadow-sm')}`}
                  >
                    <span className={`block mb-0.5 text-right text-[10.5px] font-black ${theme === 'dark' ? 'text-stone-400' : 'text-slate-600'}`}>{lang === 'ar' ? 'أو المدفوع ليرة:' : 'Or Paid LBP:'}</span>
                    <div className={`font-mono font-black text-center text-base py-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {paidLBPInput ? parseInt(paidLBPInput).toLocaleString() : '0'}
                    </div>
                  </div>
                </div>

                {/* Change returned details */}
                <div className={`flex justify-between items-center text-xs pt-1.5 border-t ${theme === 'dark' ? 'text-stone-300 border-stone-800' : 'text-slate-800 border-emerald-150/40'}`}>
                  <span className="font-black">{lang === 'ar' ? 'الباقي المرتجع للزبون:' : 'Change Return Amount:'}</span>
                  <div className={`text-left font-mono font-black text-[#1D9E75] dark:text-emerald-400 text-sm leading-none`}>
                    {changeUSD > 0 ? `${changeUSD.toFixed(2)} $ / ${Math.ceil(changeLBP).toLocaleString()} ل.ل` : '0.00 $'}
                  </div>
                </div>
              </div>

              {/* (7) Payment methods row */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {(['cash', 'card', 'transfer', 'debt'] as const).map((m) => {
                  const isSelected = paymentMethod === m;
                  const isDebtDisabled = m === 'debt' && !selectedCustomerId;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        if (m === 'debt' && !selectedCustomerId) {
                          showToast('warning', lang === 'ar' ? '⚠️ يرجى أولاً ربط زبون لتمكين المبيعات بالدين!' : 'Please associate customer first to pay as debt!');
                          triggerCustomerSearch();
                          return;
                        }
                        setPaymentMethod(m);
                      }}
                      className={`py-2 rounded-xl font-black text-center transition cursor-pointer text-xs border ${
                        isSelected 
                          ? 'bg-red-600 border-red-700 text-black' 
                          : isDebtDisabled 
                          ? 'opacity-30 cursor-not-allowed bg-black text-slate-400 border-transparent'
                          : 'bg-black text-white border-stone-850 hover:bg-stone-900'
                      }`}
                    >
                      {m === 'cash' ? (lang === 'ar' ? 'كاش' : 'Cash') :
                       m === 'card' ? (lang === 'ar' ? 'بطاقة' : 'Card') :
                       m === 'transfer' ? (lang === 'ar' ? 'تحويل' : 'Transfer') :
                       (lang === 'ar' ? 'آجل/دين' : 'Debt')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Confirm & print, direct drawer, cancel buttons */}
          <div className="space-y-2 mt-auto">
            <button
              type="button"
              onClick={() => {
                const paidUSDVal = parseFloat(paidUSDInput) || 0;
                const paidLBPVal = parseFloat(paidLBPInput) || 0;
                const totalPaidEquivalentUSDVal = paidUSDVal + (paidLBPVal / settings.exchangeRate);
                const isChangeSatisfied = totalPaidEquivalentUSDVal >= cartTotalUSD;

                if (!isChangeSatisfied && paymentMethod !== 'debt') {
                  if (confirm(lang === 'ar' ? '⚠️ المبلغ غير كامل بعد لتسجيل عملية بيع مالي كاش! هل ترغب في المحاسبة على أي حال وترك الباقي ديناً؟' : 'Underpaid amount. Sell anyway?')) {
                    setIsTouchPaymentModalOpen(false);
                    handleCheckout();
                  }
                } else {
                  setIsTouchPaymentModalOpen(false);
                  handleCheckout();
                }
              }}
              className="w-full bg-[#1D9E75] hover:bg-[#15805e] active:scale-[0.98] text-white font-extrabold py-3 px-3 rounded-xl transition shadow-lg shadow-emerald-500/10 text-xs text-center flex items-center justify-center gap-1.5 cursor-pointer h-12 leading-none"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>{lang === 'ar' ? 'حفظ الفاتورة وحساب الكاشير (F1)' : 'Save & Print Invoice (F1)'}</span>
            </button>

            <div className="flex gap-1.5 w-full">
              <button
                type="button"
                onClick={openCashDrawer}
                className="flex-1 bg-[#F59E0B] hover:bg-amber-500 text-white font-extrabold py-2.5 rounded-xl transition shadow-md active:translate-y-px text-xs flex items-center justify-center gap-1.5 cursor-pointer h-11"
              >
                💵 {lang === 'ar' ? 'فتح درج الكاش المباشر' : 'Open Cash Drawer'}
              </button>
              {hardwarePrinterType !== 'system' ? (
                <div className="bg-emerald-50 dark:bg-emerald-950 text-emerald-750 dark:text-emerald-300 text-[10px] font-mono font-extrabold px-2.5 rounded-xl flex items-center justify-center border border-emerald-250 h-11 shrink-0">
                  {hardwarePrinterType.toUpperCase()} متصل
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 text-[10px] font-medium px-2 rounded-xl flex items-center justify-center border border-slate-205 dark:border-stone-800 h-11 shrink-0">
                  طابعة نظام 🖥️
                </div>
              )}
            </div>

            <button 
              type="button"
              onClick={() => setIsTouchPaymentModalOpen(false)}
              className="w-full text-slate-400 hover:text-rose-600 py-1 transition text-xs font-semibold text-center block"
            >
              {lang === 'ar' ? 'إلغاء السلة ' : 'Cancel Quick Basket'}
            </button>
          </div>
        </div>

        {/* Left Division: Touch numpad & Quick Presets (Matches layout perfectly) */}
        <div className={`w-full md:w-[240px] flex flex-col p-4 rounded-3xl shrink-0 justify-between ${theme === 'dark' ? 'bg-[#212124] border border-stone-800' : 'bg-slate-50 border border-slate-250 shadow-xs'}`}>
          <div>
            <span className="text-[11px] block font-bold text-center text-slate-400 mb-2.5">
              {lang === 'ar' 
                ? `لوحة اللمس لـ [${touchPaymentActiveField === 'usd' ? 'المدفوع دولار' : touchPaymentActiveField === 'lbp' ? 'المدفوع ليرة' : 'الخصم المباشر'}]` 
                : `Virtual numpad editing [${touchPaymentActiveField}]`
              }
            </span>

            {/* Virtual keypad keys */}
            <div className="grid grid-cols-3 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    if (touchPaymentActiveField === 'usd') {
                      setPaidUSDInput(prev => (prev === '0' || prev === '') ? num.toString() : prev + num.toString());
                    } else if (touchPaymentActiveField === 'lbp') {
                      setPaidLBPInput(prev => (prev === '0' || prev === '') ? num.toString() : prev + num.toString());
                    } else if (touchPaymentActiveField === 'discount') {
                      setDiscountInput(prev => (prev === '0' || prev === '') ? num.toString() : prev + num.toString());
                    }
                  }}
                  className={`py-3 rounded-xl font-bold font-mono text-center active:scale-95 transition cursor-pointer ${theme === 'dark' ? 'bg-[#2C2C30] hover:bg-zinc-700 text-white text-base' : 'bg-white border border-slate-250 hover:bg-slate-100 text-slate-850 text-base shadow-xs'}`}
                >
                  {num}
                </button>
              ))}

              {/* Decimal Dot */}
              <button
                type="button"
                onClick={() => {
                  if (touchPaymentActiveField === 'usd') {
                    if (!paidUSDInput.includes('.')) setPaidUSDInput(prev => prev === '' ? '0.' : prev + '.');
                  } else if (touchPaymentActiveField === 'lbp') {
                    if (!paidLBPInput.includes('.')) setPaidLBPInput(prev => prev === '' ? '0.' : prev + '.');
                  } else if (touchPaymentActiveField === 'discount') {
                    if (!discountInput.includes('.')) setDiscountInput(prev => prev === '' ? '0.' : prev + '.');
                  }
                }}
                className={`py-3 rounded-xl font-black font-mono text-center active:scale-95 transition cursor-pointer text-base ${theme === 'dark' ? 'bg-[#2C2C30] hover:bg-[#343438] text-white' : 'bg-white border border-slate-250 hover:bg-slate-100 text-slate-850 shadow-xs'}`}
              >
                .
              </button>

              {/* Number 0 */}
              <button
                type="button"
                onClick={() => {
                  if (touchPaymentActiveField === 'usd') {
                    setPaidUSDInput(prev => (prev === '0' || prev === '') ? '0' : prev + '0');
                  } else if (touchPaymentActiveField === 'lbp') {
                    setPaidLBPInput(prev => (prev === '0' || prev === '') ? '0' : prev + '0');
                  } else if (touchPaymentActiveField === 'discount') {
                    setDiscountInput(prev => (prev === '0' || prev === '') ? '0' : prev + '0');
                  }
                }}
                className={`py-3 rounded-xl font-bold font-mono text-center active:scale-95 transition cursor-pointer text-base ${theme === 'dark' ? 'bg-[#2C2C30] hover:bg-[#343438] text-white' : 'bg-white border border-slate-250 hover:bg-slate-100 text-slate-850 shadow-xs'}`}
              >
                0
              </button>

              {/* Clear Input */}
              <button
                type="button"
                onClick={() => {
                  if (touchPaymentActiveField === 'usd') {
                    setPaidUSDInput('');
                  } else if (touchPaymentActiveField === 'lbp') {
                    setPaidLBPInput('');
                  } else if (touchPaymentActiveField === 'discount') {
                    setDiscountInput('');
                  }
                }}
                className="py-3 rounded-xl font-bold text-center active:scale-95 transition cursor-pointer text-xs bg-rose-600 hover:bg-rose-500 text-white shadow font-sans"
              >
                {lang === 'ar' ? 'تصفير' : 'C'}
              </button>

              {/* Double Zero */}
              <button
                type="button"
                onClick={() => {
                  if (touchPaymentActiveField === 'usd') {
                    setPaidUSDInput(prev => (prev === '0' || prev === '') ? '0' : prev + '00');
                  } else if (touchPaymentActiveField === 'lbp') {
                    setPaidLBPInput(prev => (prev === '0' || prev === '') ? '0' : prev + '00');
                  } else if (touchPaymentActiveField === 'discount') {
                    setDiscountInput(prev => (prev === '0' || prev === '') ? '0' : prev + '00');
                  }
                }}
                className={`col-span-2 py-3 rounded-xl font-bold font-mono text-center active:scale-95 transition cursor-pointer text-sm ${theme === 'dark' ? 'bg-[#242426] text-stone-300 hover:bg-[#2F2F32]' : 'bg-slate-100 hover:bg-slate-205 text-slate-800 font-bold border border-slate-250'}`}
              >
                00
              </button>

              {/* Backspace Key */}
              <button
                type="button"
                onClick={() => {
                  if (touchPaymentActiveField === 'usd') {
                    setPaidUSDInput(prev => prev ? prev.slice(0, -1) : '');
                  } else if (touchPaymentActiveField === 'lbp') {
                    setPaidLBPInput(prev => prev ? prev.slice(0, -1) : '');
                  } else if (touchPaymentActiveField === 'discount') {
                    setDiscountInput(prev => prev ? prev.slice(0, -1) : '');
                  }
                }}
                className={`py-3 rounded-xl font-bold text-center active:scale-95 transition cursor-pointer flex items-center justify-center ${theme === 'dark' ? 'bg-[#242426] text-stone-300 hover:bg-[#2F2F32]' : 'bg-slate-100 hover:bg-slate-200 text-slate-850 border border-slate-250'}`}
                title={lang === 'ar' ? 'مسح خطوة للخلف' : 'Backspace'}
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Preset Buttons Pane */}
          <div className="space-y-1.5 mt-3 pt-2.5 border-t border-dashed border-stone-800/10">
            <span className="block text-[10px] text-slate-400 font-bold">{lang === 'ar' ? 'التعبئة لمس (Presets):' : 'Pre-fills:'}</span>

            {/* LBP Bills helper */}
            <div className="flex flex-wrap gap-1 items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setPaidLBPInput(Math.ceil(cartTotalLBP).toString());
                  setTouchPaymentActiveField('lbp');
                }}
                className="py-1 px-1.5 rounded-lg text-[9.5px] font-black bg-[#EAF6ED] text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
              >
                {lang === 'ar' ? 'كامل ليرة' : 'Exact LBP'}
              </button>
              {[100000, 250000, 500000, 1000000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setPaidLBPInput(val.toString());
                    setTouchPaymentActiveField('lbp');
                  }}
                  className="py-1 px-1.5 rounded-lg text-[9.5px] font-semibold bg-slate-100 border border-slate-250 hover:bg-slate-200 text-slate-700 dark:bg-stone-900 dark:text-stone-300 dark:border-stone-800 cursor-pointer"
                >
                  {val / 1000}k
                </button>
              ))}
            </div>

            {/* USD Presets help */}
            <div className="flex flex-wrap gap-1 items-center justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  setPaidUSDInput(cartTotalUSD.toFixed(2));
                  setTouchPaymentActiveField('usd');
                }}
                className="py-1 px-1.5 rounded-lg text-[9.5px] font-black bg-[#EAF6ED] text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
              >
                {lang === 'ar' ? 'كامل دولار' : 'Exact USD'}
              </button>
              {[5, 10, 20, 50, 100].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setPaidUSDInput(val.toString());
                    setTouchPaymentActiveField('usd');
                  }}
                  className="py-1 px-1.5 rounded-lg text-[9.5px] font-semibold bg-slate-100 border border-slate-250 hover:bg-slate-200 text-slate-700 dark:bg-stone-900 dark:text-stone-300 dark:border-stone-800 cursor-pointer"
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
