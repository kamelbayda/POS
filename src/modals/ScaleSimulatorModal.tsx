import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { Product } from '../types';
import React from 'react';

interface ScaleSimulatorModalProps {
  lang: "ar" | "en";
  setBarcodeInput: React.Dispatch<React.SetStateAction<string>>;
  theme: "light" | "dark";
  selectedScaleProduct: Product;
  simulatedWeight: number;
  setSimulatedWeight: React.Dispatch<React.SetStateAction<number>>;
  setIsScaleSimulatorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showToast: (type: "success" | "error" | "warning", message: string) => void;
  addToCart: (product: Product, customQty?: number) => void;
}

export function ScaleSimulatorModal({
  lang,
  setBarcodeInput,
  theme,
  selectedScaleProduct,
  simulatedWeight,
  setSimulatedWeight,
  setIsScaleSimulatorOpen,
  showToast,
  addToCart,
}: ScaleSimulatorModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans" id="scale-simulator-modal">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-3xl p-6 w-full max-w-lg text-right shadow-2xl border ${theme === 'dark' ? 'bg-[#1C1C1E] border-stone-800 text-stone-105' : 'bg-white border-slate-150 text-slate-800'}`}
      >
        {/* Header */}
        <div className="flex justify-between items-center flex-row-reverse border-b pb-3 mb-4 border-stone-805/30">
          <span className="text-xl">⚖️</span>
          <h3 className="text-sm font-black tracking-wide flex items-center gap-2">
            <span>{lang === 'ar' ? 'محاكي الميزان الإلكتروني الذكي' : 'Smart Weighing Scale Simulator'}</span>
          </h3>
          <button 
            onClick={() => setIsScaleSimulatorOpen(false)}
            className="p-1.5 rounded-lg hover:bg-stone-500/10 text-stone-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Item Info */}
        <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-2xl mb-4 text-center">
          <h4 className="font-extrabold text-base text-amber-900 dark:text-amber-400">{selectedScaleProduct.name}</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {lang === 'ar' 
              ? `رمز الصنف (PLU): ${selectedScaleProduct.plu || 'بدون'} | سعر الكيلو: $${selectedScaleProduct.priceUSD.toFixed(2)}` 
              : `Item PLU: ${selectedScaleProduct.plu || 'None'} | Price/Kg: $${selectedScaleProduct.priceUSD.toFixed(2)}`}
          </p>
        </div>

        {/* Simulated Digital LED Display */}
        <div className={`p-5 rounded-2xl mb-5 border font-mono flex flex-col justify-center items-center gap-1 text-center select-none shadow-inner ${
          theme === 'dark' ? 'bg-[#121213] border-stone-850 text-cyan-400' : 'bg-slate-950 border-slate-900 text-cyan-400'
        }`}>
          <div className="text-[10px] text-cyan-600 font-sans tracking-widest uppercase">
            {lang === 'ar' ? 'شاشة ميزان الرصد الإلكتروني' : 'Electronic Weight indicator'}
          </div>

          {/* Weight output */}
          <div className="text-4xl font-extrabold tracking-wider flex items-baseline gap-1.5 justify-center">
            <span>{simulatedWeight.toFixed(3)}</span>
            <span className="text-xs font-sans text-cyan-600">KG / كغ</span>
          </div>

          {/* Grid of details: Tare, Price/Kg, Total */}
          <div className="grid grid-cols-3 gap-4 w-full mt-4 pt-3 border-t border-cyan-950 text-[11px]">
            <div>
              <span className="block text-cyan-700 font-sans text-[9px] uppercase">{lang === 'ar' ? 'سعر الكيلو' : 'Price/Kg'}</span>
              <span className="font-bold text-sm">${selectedScaleProduct.priceUSD.toFixed(2)}</span>
            </div>
            <div>
              <span className="block text-cyan-700 font-sans text-[9px] uppercase">{lang === 'ar' ? 'تصفير الميزان' : 'Tare'}</span>
              <span className="font-bold text-sm">0.000</span>
            </div>
            <div>
              <span className="block text-cyan-700 font-sans text-[9px] uppercase">{lang === 'ar' ? 'الإجمالي للوزن' : 'Total Price'}</span>
              <span className="font-bold text-sm text-yellow-450">${(simulatedWeight * selectedScaleProduct.priceUSD).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Simulated controls / Weight Adjusters */}
        <div className="space-y-4 mb-5">
          {/* Slider selector */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
              <span>5.00 kg</span>
              <span>{lang === 'ar' ? 'اسحب لتغيير الوزن يدوياً:' : 'Drag to adjust weight manually:'}</span>
              <span>0.02 kg</span>
            </div>
            <input 
              type="range"
              min="0.02"
              max="5.00"
              step="0.01"
              value={simulatedWeight}
              onChange={(e) => setSimulatedWeight(parseFloat(e.target.value))}
              className="w-full accent-cyan-600 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Quick weight buttons */}
          <div className="grid grid-cols-5 gap-1.5 text-center font-extrabold text-[10px]">
            <button 
              type="button" 
              onClick={() => setSimulatedWeight(prev => Math.min(5.0, prev + 0.1))} 
              className={`p-2 rounded-xl cursor-pointer ${theme === 'dark' ? 'bg-stone-800 hover:bg-stone-750 text-stone-250' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'}`}
            >
              +100g
            </button>
            <button 
              type="button" 
              onClick={() => setSimulatedWeight(prev => Math.min(5.0, prev + 0.25))} 
              className={`p-2 rounded-xl cursor-pointer ${theme === 'dark' ? 'bg-stone-800 hover:bg-stone-750 text-stone-250' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'}`}
            >
              +250g
            </button>
            <button 
              type="button" 
              onClick={() => setSimulatedWeight(prev => Math.min(5.0, prev + 0.5))} 
              className={`p-2 rounded-xl cursor-pointer ${theme === 'dark' ? 'bg-stone-800 hover:bg-stone-750 text-stone-250' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'}`}
            >
              +500g
            </button>
            <button 
              type="button" 
              onClick={() => setSimulatedWeight(prev => Math.min(5.0, prev + 1.0))} 
              className={`p-2 rounded-xl cursor-pointer ${theme === 'dark' ? 'bg-stone-800 hover:bg-stone-750 text-stone-250' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'}`}
            >
              +1.0kg
            </button>
            <button 
              type="button" 
              onClick={() => setSimulatedWeight(0.00)} 
              className="p-2 rounded-xl cursor-pointer bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
            >
              {lang === 'ar' ? 'تصفير' : 'Tare'}
            </button>
          </div>

          {/* Automatic Weight generator */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                // Generate a realistic weight between 0.150 and 2.800 kg
                const randWeight = parseFloat((0.150 + Math.random() * 2.650).toFixed(3));
                setSimulatedWeight(randWeight);
                showToast('success', lang === 'ar' ? 'تم قراءة وزن واقعي من حساس الميزان!' : 'Simulated weight sensor reading!');
              }}
              className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 py-1.5 px-3 rounded-xl text-[10px] font-black cursor-pointer transition flex items-center justify-center gap-1"
            >
              <span>📡 {lang === 'ar' ? 'قراءة وزن تلقائي من حساس الميزان (محاكاة)' : 'Simulate Weight Sensor'}</span>
            </button>
          </div>
        </div>

        {/* Simulated Scale printed barcode generation */}
        <div className="bg-slate-100 dark:bg-stone-950 p-3.5 rounded-2xl border border-slate-200 dark:border-stone-850 space-y-2 mb-5">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
            <span className="font-mono text-emerald-600 font-extrabold">
              {(() => {
                const plu = (selectedScaleProduct.plu || '00000').padStart(5, '0').slice(-5);
                const weightGrams = Math.round(simulatedWeight * 1000);
                const weightStr = weightGrams.toString().padStart(5, '0').slice(-5);
                const baseCode = `20${plu}${weightStr}`;
                let sum = 0;
                for (let i = 0; i < 12; i++) {
                  const digit = parseInt(baseCode[i], 10) || 0;
                  sum += (i % 2 === 0) ? digit : digit * 3;
                }
                const checkDigit = ((10 - (sum % 10)) % 10).toString();
                return baseCode + checkDigit;
              })()}
            </span>
            <span>{lang === 'ar' ? 'ملصق الباركود المطبوع من الميزان (EAN-13):' : 'Scale printed barcode label (EAN-13):'}</span>
          </div>

          {/* Virtual Barcode strips */}
          <div className="flex flex-col items-center justify-center bg-white p-2 rounded-lg border border-slate-200 shadow-2xs select-none">
            <div className="flex items-center justify-center gap-0.5 h-7 opacity-85">
              {[3, 1, 2, 1, 4, 1, 2, 3, 1, 2, 4, 1, 2, 1, 3, 1, 4, 1, 2, 3, 1, 2, 4, 1, 2, 3, 1, 4, 1, 2].map((w, idx) => (
                <div key={idx} className="bg-slate-900" style={{ width: `${w}px`, height: '100%' }}></div>
              ))}
            </div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-slate-700 mt-1">
              {(() => {
                const plu = (selectedScaleProduct.plu || '00000').padStart(5, '0').slice(-5);
                const weightGrams = Math.round(simulatedWeight * 1000);
                const weightStr = weightGrams.toString().padStart(5, '0').slice(-5);
                const baseCode = `20${plu}${weightStr}`;
                let sum = 0;
                for (let i = 0; i < 12; i++) {
                  const digit = parseInt(baseCode[i], 10) || 0;
                  sum += (i % 2 === 0) ? digit : digit * 3;
                }
                const checkDigit = ((10 - (sum % 10)) % 10).toString();
                return baseCode + checkDigit;
              })()}
            </div>
          </div>

          {/* Action: simulate scanning this label */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                const plu = (selectedScaleProduct.plu || '00000').padStart(5, '0').slice(-5);
                const weightGrams = Math.round(simulatedWeight * 1000);
                const weightStr = weightGrams.toString().padStart(5, '0').slice(-5);
                const baseCode = `20${plu}${weightStr}`;
                let sum = 0;
                for (let i = 0; i < 12; i++) {
                  const digit = parseInt(baseCode[i], 10) || 0;
                  sum += (i % 2 === 0) ? digit : digit * 3;
                }
                const checkDigit = ((10 - (sum % 10)) % 10).toString();
                const generatedBarcode = baseCode + checkDigit;

                setBarcodeInput(generatedBarcode);
                setIsScaleSimulatorOpen(false);

                setTimeout(() => {
                  addToCart(selectedScaleProduct, simulatedWeight);
                  setBarcodeInput('');
                  showToast(
                    'success',
                    lang === 'ar'
                      ? `📡 [محاكاة الباركود] تم مسح ملصق الميزان تلقائياً بوزن: ${simulatedWeight.toFixed(3)} كغم`
                      : `📡 [Barcode Sweep] Scanned scale printed label: ${simulatedWeight.toFixed(3)} Kg`
                  );
                }, 100);
              }}
              className="text-xs font-bold text-sky-700 hover:text-sky-800 bg-sky-50 dark:bg-sky-955 hover:bg-sky-100 py-1 px-3.5 rounded-lg border border-sky-200/50 cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>📷 {lang === 'ar' ? 'محاكاة طباعة ومسح هذا الملصق على الكاشير' : 'Simulate print & scan of this label'}</span>
            </button>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex gap-2 flex-row-reverse border-t pt-4 border-stone-805/20">
          <button 
            type="button"
            disabled={simulatedWeight <= 0}
            onClick={() => {
              if (simulatedWeight <= 0) return;
              addToCart(selectedScaleProduct, simulatedWeight);
              setIsScaleSimulatorOpen(false);
              showToast(
                'success',
                lang === 'ar'
                  ? `✔️ تم إضافة [${selectedScaleProduct.name}] بوزن ${simulatedWeight.toFixed(3)} كغم للسلة!`
                  : `✔️ Added [${selectedScaleProduct.name}] with weight ${simulatedWeight.toFixed(3)} Kg!`
              );
            }}
            className={`flex-1 font-black py-3 px-5 rounded-2xl transition cursor-pointer text-xs text-center flex items-center justify-center gap-2 ${
              simulatedWeight <= 0 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
            }`}
          >
            <span>✔️ {lang === 'ar' ? 'إرسال الوزن وإضافته للسلة مباشرة' : 'Weigh and Add to Cart'}</span>
          </button>
          <button 
            type="button"
            onClick={() => setIsScaleSimulatorOpen(false)}
            className={`py-3 px-5 rounded-2xl transition cursor-pointer text-xs font-bold ${
              theme === 'dark' ? 'bg-[#2A2A2E] text-stone-300 hover:bg-[#323236]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
