import { motion } from 'motion/react';
import { ShieldAlert } from 'lucide-react';
import { Product } from '../types';
import React from 'react';

interface ExpiryWarningModalProps {
  expiryWarningModal: Product;
  setExpiryWarningModal: React.Dispatch<React.SetStateAction<Product>>;
}

export function ExpiryWarningModal({
  expiryWarningModal,
  setExpiryWarningModal,
}: ExpiryWarningModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="expiry-warning-modal">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-6 w-full max-w-md text-right border border-rose-100 shadow-2xl space-y-4"
      >
        <div className="bg-rose-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 border border-rose-100">
          <ShieldAlert className="text-rose-600 w-8 h-8" />
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-lg font-black text-rose-700">🚫 عذراً! منتهى الصلاحية ومحظر بيعه</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-sans">
            لقد دخل هذا الصنف حيز انتهاء الصلاحية مقارنة بتاريخ اليوم بالدكان ويرفض نظام الـ POS إدراج أي عنصر منه حماية للسلامة.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1 text-xs text-slate-700">
          <div>• اسم الصنف المستبعد: <span className="font-bold text-slate-900">{expiryWarningModal.name}</span></div>
          <div>• باركود التسجيل: <span className="font-mono text-slate-500 font-bold">{expiryWarningModal.barcode}</span></div>
          <div>• تاريخ الصلاحية المنتهي: <span className="font-mono text-red-600 font-bold">{expiryWarningModal.expiryDate}</span></div>
        </div>

        <p className="text-[10px] text-rose-600 text-center font-semibold">
          يرجى سحب الصنف من صالة العرض والمستودع فوراً! ⚠️
        </p>

        <button 
          onClick={() => setExpiryWarningModal(null)}
          className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-3 rounded-xl text-xs transition cursor-pointer"
        >
          فهمت! سأقوم بسحب المعروض للتلف ✔️
        </button>
      </motion.div>
    </div>
  );
}
