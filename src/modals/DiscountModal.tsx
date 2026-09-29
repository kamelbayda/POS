import type { PosRegister } from '../features/pos/usePosRegister';
import { motion } from 'motion/react';
import { Tag, X, Delete, Check } from 'lucide-react';
import { CartItem, SystemSettings } from '../types';
import React, { useState } from 'react';

interface DiscountModalProps {
  /** Cart, sessions and checkout state from usePosRegister. */
  register: PosRegister;
  lang: "ar" | "en";
  settings: SystemSettings;
  theme: "light" | "dark";
  showToast: (type: "success" | "error" | "warning", message: string) => void;
}

export function DiscountModal({
  register,
  lang,
  settings,
  theme,
  showToast,
}: DiscountModalProps) {
  const {
    cart,
    setDiscountInput,
    setIsDiscountModalOpen,
    posSaleType,
    voidedCartItemIds,
    getCalculatedDiscountUSD,
  } = register;
  const [discountModalMode, setDiscountModalMode] = useState<'usd' | 'percentage' | 'lbp'>('usd');
  const [discountModalVal, setDiscountModalVal] = useState<string>('0');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans" id="financial-discount-modal">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-3xl p-6 w-full max-w-md text-right shadow-2xl border ${theme === 'dark' ? 'bg-[#1C1C1E] border-stone-800 text-stone-100' : 'bg-white border-slate-150 text-slate-800'}`}
      >
        <div className="flex justify-between items-center flex-row-reverse border-b pb-3 mb-4 border-stone-850/30">
          <Tag className="w-5 h-5 text-[#1D9E75]" />
          <h3 className="text-sm font-black tracking-wide">{lang === 'ar' ? 'تطبيق خصم مالي على الفاتورة الحالية' : 'Apply Invoice Direct Discount'}</h3>
          <button 
            onClick={() => setIsDiscountModalOpen(false)}
            className="p-1.5 rounded-lg hover:bg-stone-500/10 text-stone-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selection tab of discount types (Percentage, USD, LBP) */}
        <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl mb-4 border ${theme === 'dark' ? 'bg-[#121213] border-stone-805' : 'bg-slate-50 border-slate-200 shadow-inner'}`}>
          <button
            type="button"
            onClick={() => {
              setDiscountModalMode('usd');
              setDiscountModalVal('0');
            }}
            className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${discountModalMode === 'usd' ? 'bg-[#1D9E75] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <span>$</span>
            <span>{lang === 'ar' ? 'دولار أمريكي' : 'USD ($)'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDiscountModalMode('percentage');
              setDiscountModalVal('0');
            }}
            className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${discountModalMode === 'percentage' ? 'bg-[#1C73E8] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <span>%</span>
            <span>{lang === 'ar' ? 'نسبة مئوية' : 'Percent (%)'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDiscountModalMode('lbp');
              setDiscountModalVal('0');
            }}
            className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${discountModalMode === 'lbp' ? 'bg-[#8E24AA] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <span>ل.ل</span>
            <span>{lang === 'ar' ? 'ليرة لبنانية' : 'LBP (ل.ل)'}</span>
          </button>
        </div>

        {/* Numeric Display value */}
        <div className={`p-4 rounded-2xl mb-4 text-center font-black text-2xl font-mono tracking-widest border border-dashed flex items-center justify-center gap-1.5 ${theme === 'dark' ? 'bg-[#121213] border-stone-800 text-amber-400' : 'bg-slate-50 border-slate-200 text-amber-705 shadow-inner'}`}>
          {discountModalMode === 'usd' && <span>$</span>}
          <span>{(parseFloat(discountModalVal) || 0).toLocaleString()}</span>
          {discountModalMode === 'percentage' && <span>%</span>}
          {discountModalMode === 'lbp' && <span className="text-[14px]">ل.ل.</span>}
        </div>

        {/* Embedded Keypad layout inside discount modal */}
        <div className="grid grid-cols-3 gap-1.5 mb-4 select-none">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => setDiscountModalVal(prev => (prev === '0' || prev === '') ? num.toString() : prev + num.toString())}
              className={`py-2.5 rounded-xl font-mono text-base font-black transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-[#252528] text-white hover:bg-[#2C2C30]' : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-250'}`}
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setDiscountModalVal('0')}
            className={`py-2.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-stone-800/80 hover:bg-[#AA2E25]/15 text-rose-500' : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100'}`}
          >
            {lang === 'ar' ? 'تصفير' : 'Clear'}
          </button>

          <button
            type="button"
            onClick={() => setDiscountModalVal(prev => (prev === '' || prev === '0') ? '0' : prev + '0')}
            className={`py-2.5 rounded-xl font-mono text-base font-black transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-[#252528] text-white hover:bg-[#2C2C30]' : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-250'}`}
          >
            0
          </button>

          <button
            type="button"
            onClick={() => {
              setDiscountModalVal(prev => {
                const str = prev || '0';
                if (str.length <= 1) return '';
                return str.slice(0, -1);
              });
            }}
            className={`py-2.5 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-[#252528] text-white hover:bg-[#2C2C30]' : 'bg-slate-100 text-slate-800 border border-slate-300'}`}
          >
            <Delete className="w-4 h-4 text-stone-400" />
          </button>
        </div>

        {/* Quick Presets based on chosen discount mode */}
        <div className="space-y-1 mb-4 select-none">
          <span className={`text-[10px] block font-extrabold pr-1.5 ${theme === 'dark' ? 'text-stone-500' : 'text-slate-400'}`}>
            {lang === 'ar' ? '⚡️ قوالب الخصم بنقرة واحدة:' : '⚡️ One-click discount templates:'}
          </span>

          {discountModalMode === 'percentage' && (
            <div className="grid grid-cols-6 gap-1 select-none">
              {['5', '10', '15', '20', '25', '50'].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDiscountModalVal(val)}
                  className="py-1.5 rounded-lg text-[10px] font-mono font-bold bg-[#1C73E8]/10 hover:bg-[#1C73E8]/20 text-[#1C73E8] transition active:scale-95 cursor-pointer"
                >
                  {val}%
                </button>
              ))}
            </div>
          )}

          {discountModalMode === 'usd' && (
            <div className="grid grid-cols-6 gap-1 select-none">
              {['1', '2', '5', '10', '15', '20'].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDiscountModalVal(val)}
                  className="py-1.5 rounded-lg text-[10px] font-mono font-bold bg-[#1D9E75]/10 hover:bg-[#1D9E75]/20 text-[#1D9E75] transition active:scale-95 cursor-pointer"
                >
                  ${val}
                </button>
              ))}
            </div>
          )}

          {discountModalMode === 'lbp' && (
            <div className="grid grid-cols-5 gap-1 select-none">
              {['5000', '10000', '25000', '50000', '100000'].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDiscountModalVal(val)}
                  className="py-1.5 rounded-lg text-[9px] font-mono font-black bg-[#8E24AA]/10 hover:bg-[#8E24AA]/20 text-[#8E24AA] transition active:scale-95 cursor-pointer"
                >
                  {(parseFloat(val) || 0).toLocaleString()} ل.ل
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Calculations and Live Preview values */}
        {(() => {
          const activeCart = cart.filter(i => !voidedCartItemIds.includes(i.product.id));
          const subtotal = activeCart.reduce((sum, item) => {
            const isWholesaleMode = posSaleType === 'wholesale';
            const qualifiesByQty = item.quantity >= (item.product.minWholesaleQty || 5);
            const unitPrice = (isWholesaleMode || qualifiesByQty) ? (item.product.priceWholesale || item.product.priceUSD * 0.9) : item.product.priceUSD;
            return sum + (unitPrice * item.quantity);
          }, 0);

          // Construct hypothetical input for parser
          let hypotheticalInp = '0';
          if (discountModalMode === 'percentage') {
            hypotheticalInp = `${discountModalVal}%`;
          } else if (discountModalMode === 'lbp') {
            hypotheticalInp = `${discountModalVal} ل.ل`;
          } else {
            hypotheticalInp = discountModalVal;
          }

          const discPreviewUSD = getCalculatedDiscountUSD(subtotal, hypotheticalInp);
          const resultingTotal = Math.max(0, subtotal - discPreviewUSD);

          return (
            <div className={`p-3 rounded-2xl mb-4 text-xs font-medium space-y-1 ${theme === 'dark' ? 'bg-[#121213]/60 text-stone-300' : 'bg-slate-50 border border-slate-100 text-slate-700'}`}>
              <div className="flex justify-between flex-row-reverse border-b pb-1.5 border-dashed border-stone-800/10">
                <span>{lang === 'ar' ? 'مجموع سلة المشتريات مـالياً:' : 'Active Cart Subtotal:'}</span>
                <span className="font-mono font-bold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between flex-row-reverse text-rose-500">
                <span>{lang === 'ar' ? 'قيمة الخصم بالدولار ($):' : 'Applied Discount USD ($):'}</span>
                <span className="font-mono font-bold">-${discPreviewUSD.toFixed(1)}</span>
              </div>
              <div className="flex justify-between flex-row-reverse text-emerald-500 font-extrabold text-[12.5px] pt-1">
                <span>{lang === 'ar' ? 'المجموع المستحق الصـافي:' : 'Net Invoice Balance Total:'}</span>
                <div className="text-right">
                  <div className="font-mono">${resultingTotal.toFixed(2)}</div>
                  <div className="text-[10px] font-mono">({Math.round(resultingTotal * settings.exchangeRate).toLocaleString()} ل.ل.)</div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Footers controls block */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              let finalValStr = '0';
              if (discountModalMode === 'percentage') {
                finalValStr = `${discountModalVal}%`;
              } else if (discountModalMode === 'lbp') {
                finalValStr = `${discountModalVal} ل.ل`;
              } else {
                finalValStr = discountModalVal;
              }

              setDiscountInput(finalValStr);
              setIsDiscountModalOpen(false);
              showToast('success', lang === 'ar' ? `✔️ تم إدراج قيمة الخصم المالي بنجاح لـ ${finalValStr}` : `Discount successfully bounds with ${finalValStr}`);
            }}
            className="flex-1 bg-[#1D9E75] hover:bg-emerald-600 text-white font-extrabold py-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1 active:scale-95 shadow-md shadow-emerald-500/10"
          >
            <Check className="w-4 h-4" />
            <span>{lang === 'ar' ? 'حفظ وتطبيق الخصم' : 'Save & Active'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDiscountInput('0');
              setIsDiscountModalOpen(false);
              showToast('success', lang === 'ar' ? 'تم إلغاء خصومات الفاتورة وتصفيرها بالكامل' : 'Removed all bill discounts');
            }}
            className={`py-3 px-3.5 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-[#AA2E25]/15 text-[#FF2E25] hover:bg-[#AA2E25]/25 hover:text-[#FFAA9D]' : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-150'}`}
            title={lang === 'ar' ? 'تصفير الخصم وقيمة الفاتورة كاملة' : 'Reboot and dismiss all discounts'}
          >
            {lang === 'ar' ? 'تصفير' : 'Reset'}
          </button>

          <button
            type="button"
            onClick={() => setIsDiscountModalOpen(false)}
            className={`py-3 px-4 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-stone-800 text-stone-400 hover:bg-stone-750' : 'bg-slate-200 text-slate-600 hover:bg-slate-250 border border-slate-300'}`}
          >
            {lang === 'ar' ? 'تراجع' : 'Cancel'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
