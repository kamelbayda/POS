import { motion } from 'motion/react';
import { X, Printer } from 'lucide-react';
import { printElementViaIFrame } from '../lib/print';
import { generateBarcodePattern } from '../lib/barcode';
import { Product, SystemSettings } from '../types';
import React from 'react';
import { useStoredState } from '../lib/storage';

interface BarcodeLabelModalProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  settings: SystemSettings;
  theme: "light" | "dark";
  barcodeLabelProduct: Product;
  setBarcodeLabelProduct: React.Dispatch<React.SetStateAction<Product>>;
  barcodeLabelCopies: number;
  setBarcodeLabelCopies: React.Dispatch<React.SetStateAction<number>>;
  showToast: (type: "success" | "error" | "warning", message: string) => void;
}

export function BarcodeLabelModal({
  products,
  setProducts,
  settings,
  theme,
  barcodeLabelProduct,
  setBarcodeLabelProduct,
  barcodeLabelCopies,
  setBarcodeLabelCopies,
  showToast,
}: BarcodeLabelModalProps) {
  // Label layout preferences are remembered on this device
  const [barcodeLabelShowPrice, setBarcodeLabelShowPrice] = useStoredState<boolean>('pos_label_show_price', true);
  const [barcodeLabelShowName, setBarcodeLabelShowName] = useStoredState<boolean>('pos_label_show_name', true);
  const [barcodeLabelShowCode, setBarcodeLabelShowCode] = useStoredState<boolean>('pos_label_show_code', true);
  const [barcodeLabelCurrency, setBarcodeLabelCurrency] = useStoredState<'USD' | 'LBP' | 'BOTH'>('pos_label_currency', 'BOTH');
  const [barcodeLabelStripeWidth, setBarcodeLabelStripeWidth] = useStoredState<'thin' | 'medium' | 'thick'>('pos_label_stripe_width', 'medium');
  const [barcodeLabelSize, setBarcodeLabelSize] = useStoredState<'small' | 'medium' | 'large' | 'custom'>('pos_label_size', 'medium');
  const [barcodeLabelCustomWidth, setBarcodeLabelCustomWidth] = useStoredState<number>('pos_label_custom_width', 50);
  const [barcodeLabelCustomHeight, setBarcodeLabelCustomHeight] = useStoredState<number>('pos_label_custom_height', 30);

  let currentWidth = 50;
  let currentHeight = 30;
  let currentPadding = 1.8;
  let shopNameSize = '9.5px';
  let productNameSize = '11px';
  let barcodeHeight = '32px';
  let codeSize = '8px';
  let priceSize = '13px';
  let subPriceSize = '9.5px';

  if (barcodeLabelSize === 'small') {
    currentWidth = 38;
    currentHeight = 25;
    currentPadding = 1.2;
    shopNameSize = '8px';
    productNameSize = '9.5px';
    barcodeHeight = '24px';
    codeSize = '7px';
    priceSize = '10px';
    subPriceSize = '8px';
  } else if (barcodeLabelSize === 'medium') {
    currentWidth = 50;
    currentHeight = 30;
    currentPadding = 1.8;
    shopNameSize = '9.5px';
    productNameSize = '11px';
    barcodeHeight = '32px';
    codeSize = '8px';
    priceSize = '13px';
    subPriceSize = '9.5px';
  } else if (barcodeLabelSize === 'large') {
    currentWidth = 80;
    currentHeight = 50;
    currentPadding = 3.5;
    shopNameSize = '13px';
    productNameSize = '15px';
    barcodeHeight = '48px';
    codeSize = '10px';
    priceSize = '18px';
    subPriceSize = '13px';
  } else if (barcodeLabelSize === 'custom') {
    currentWidth = barcodeLabelCustomWidth;
    currentHeight = barcodeLabelCustomHeight;
    const scaleFactor = Math.min(currentWidth / 50, currentHeight / 30);
    currentPadding = Math.max(1, Math.min(6, 1.8 * scaleFactor));
    shopNameSize = `${Math.max(7, Math.min(18, 9.5 * scaleFactor))}px`;
    productNameSize = `${Math.max(8, Math.min(22, 11 * scaleFactor))}px`;
    barcodeHeight = `${Math.max(16, Math.min(80, 32 * scaleFactor))}px`;
    codeSize = `${Math.max(7, Math.min(14, 8 * scaleFactor))}px`;
    priceSize = `${Math.max(9, Math.min(26, 13 * scaleFactor))}px`;
    subPriceSize = `${Math.max(7, Math.min(20, 9.5 * scaleFactor))}px`;
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans" id="receipt-modal-container">
      {/* Dynamic CSS Style Injection for printing overrides based on select label physical sizes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          html, body, html.dark, html.dark body, #root, #main-system {
            background: white !important;
            background-color: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #receipt-modal-container, #receipt-modal-container * {
            color: black !important;
            background: white !important;
            background-color: white !important;
            text-shadow: none !important;
            box-shadow: none !important;
          }
          #receipt-modal-container {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: ${currentWidth}mm !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
          }
          #main-system {
            display: block !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }
          #main-system > *:not(#receipt-modal-container) {
            display: none !important;
          }
          /* Hide scrolls, toasts, etc. */
          .no-print, .toast-container {
            display: none !important;
          }
          /* Print container page setup */
          @page {
            size: ${currentWidth}mm ${currentHeight}mm;
            margin: 0;
          }
          .barcode-label-container {
            width: ${currentWidth}mm !important;
            height: ${currentHeight}mm !important;
            padding: ${currentPadding}mm !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            page-break-after: always !important;
            break-after: page !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            box-sizing: border-box !important;
          }
        }
      ` }} />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 text-white rounded-3xl p-6 w-full max-w-3xl border border-slate-800 flex flex-col md:flex-row gap-6 ltr:shadow-2xl"
      >
        {/* 1. Control Parameters Panel (Hidden during printing) */}
        <div className="flex-1 space-y-4 no-print text-right md:order-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <button 
              onClick={() => setBarcodeLabelProduct(null)}
              className="hover:bg-slate-800 p-1 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-right">
              <h4 className="font-bold text-sm text-amber-500 font-sans">طباعة ملصقات الباركود والأسعار</h4>
              <p className="text-[10px] text-slate-400 font-sans">تخصيص ملصقات لاصقة لطابعات الباركود الحرارية وعرضها بالحجم المناسب</p>
            </div>
          </div>

          {/* No Barcode Warning Section */}
          {(!barcodeLabelProduct.barcode || barcodeLabelProduct.barcode.trim() === '') ? (
            <div className="bg-rose-950/60 border border-rose-800 rounded-2xl p-4 text-center space-y-3">
              <span className="text-xs text-rose-300 font-bold block">هذا المنتج ليس لديه باركود حالياً!</span>
              <p className="text-[10px] text-rose-200">لتتمكن من إنشاء ملصق باركود، يرجى توليد كود عشوائي فريد وحفظه فوراً في النظام.</p>
              <button
                type="button"
                onClick={() => {
                  let rand = '';
                  do {
                    rand = '29' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
                  } while (products.some(p => p.barcode === rand));

                  const updatedProds = products.map(p => {
                    if (p.id === barcodeLabelProduct.id) {
                      return { ...p, barcode: rand };
                    }
                    return p;
                  });
                  setProducts(updatedProds);
                  localStorage.setItem('pos_products', JSON.stringify(updatedProds));

                  setBarcodeLabelProduct({
                    ...barcodeLabelProduct,
                    barcode: rand
                  });

                  showToast('success', 'تم توليد وحفظ الباركود الجديد للصنف بنجاح! ⚡');
                }}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-2 rounded-xl transition text-xs cursor-pointer shadow-md"
              >
                ⚡ توليد باركود للمنتج الآن
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {/* Copy Count */}
              <div>
                <label className="block text-slate-400 text-xs font-bold mb-1 font-sans">عدد الملصقات المطلوب طباعتها (الكمية):</label>
                <input 
                  type="number"
                  min={1}
                  max={100}
                  value={barcodeLabelCopies}
                  onChange={e => setBarcodeLabelCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-center font-mono text-sm text-amber-400 focus:outline-none"
                />
              </div>

              {/* SELECT LABEL SIZE */}
              <div className="bg-slate-800 p-3 rounded-2xl space-y-2 border border-slate-800 text-xs text-right">
                <span className="text-[11px] text-slate-400 font-bold block pb-1 border-b border-slate-800 font-sans">تحديد حجم ملصق الـ Label:</span>
                <div className="grid grid-cols-4 gap-1.5 font-sans">
                  <button
                    type="button"
                    onClick={() => setBarcodeLabelSize('small')}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition border border-slate-700 ${barcodeLabelSize === 'small' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950 font-black'} border-amber-400` : 'bg-slate-950 hover:bg-slate-900 text-slate-300'}`}
                  >
                    صغير جداً
                    <span className="block text-[8px] opacity-70">38x25mm</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBarcodeLabelSize('medium')}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition border border-slate-700 ${barcodeLabelSize === 'medium' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950 font-black'} border-amber-400` : 'bg-slate-950 hover:bg-slate-900 text-slate-300'}`}
                  >
                    وسط قياسي
                    <span className="block text-[8px] opacity-70">50x30mm</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBarcodeLabelSize('large')}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition border border-slate-700 ${barcodeLabelSize === 'large' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950 font-black'} border-amber-400` : 'bg-slate-950 hover:bg-slate-900 text-slate-300'}`}
                  >
                    كبير
                    <span className="block text-[8px] opacity-70">80x50mm</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBarcodeLabelSize('custom')}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition border border-slate-700 ${barcodeLabelSize === 'custom' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950 font-black'} border-amber-400` : 'bg-slate-950 hover:bg-slate-900 text-slate-300'}`}
                  >
                    حجم مخصص
                    <span className="block text-[8px] opacity-70">يدوي</span>
                  </button>
                </div>

                {/* Custom inputs */}
                {barcodeLabelSize === 'custom' && (
                  <div className="pt-2 mt-2 border-t border-slate-700 space-y-3 text-right">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-1">العرض (مم):</label>
                        <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5">
                          <input
                            type="number"
                            min={20}
                            max={120}
                            value={barcodeLabelCustomWidth}
                            onChange={e => setBarcodeLabelCustomWidth(Math.max(20, Math.min(120, parseInt(e.target.value) || 50)))}
                            className="w-12 bg-transparent text-center font-mono text-xs text-amber-400 focus:outline-none border-b border-dashed border-slate-600"
                          />
                          <input
                            type="range"
                            min={20}
                            max={120}
                            value={barcodeLabelCustomWidth}
                            onChange={e => setBarcodeLabelCustomWidth(parseInt(e.target.value) || 50)}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-1">الارتفاع (مم):</label>
                        <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5">
                          <input
                            type="number"
                            min={15}
                            max={100}
                            value={barcodeLabelCustomHeight}
                            onChange={e => setBarcodeLabelCustomHeight(Math.max(15, Math.min(100, parseInt(e.target.value) || 30)))}
                            className="w-12 bg-transparent text-center font-mono text-xs text-amber-400 focus:outline-none border-b border-dashed border-slate-600"
                          />
                          <input
                            type="range"
                            min={15}
                            max={100}
                            value={barcodeLabelCustomHeight}
                            onChange={e => setBarcodeLabelCustomHeight(parseInt(e.target.value) || 30)}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Toggle Content Components */}
              <div className="bg-slate-800 p-3 rounded-2xl space-y-2 border border-slate-800 text-xs text-right">
                <span className="text-[11px] text-slate-400 font-bold block pb-1 border-b border-slate-800 font-sans">مكونات الملصق:</span>
                <label className="flex items-center justify-between cursor-pointer py-1 font-sans">
                  <input 
                    type="checkbox" 
                    checked={barcodeLabelShowName}
                    onChange={e => setBarcodeLabelShowName(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                  <span>أظهر اسم المنتج</span>
                </label>
                <label className="flex items-center justify-between cursor-pointer py-1 font-sans">
                  <input 
                    type="checkbox" 
                    checked={barcodeLabelShowPrice}
                    onChange={e => setBarcodeLabelShowPrice(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                  <span>أظهر سعر البيع</span>
                </label>
                <label className="flex items-center justify-between cursor-pointer py-1 font-sans">
                  <input 
                    type="checkbox" 
                    checked={barcodeLabelShowCode}
                    onChange={e => setBarcodeLabelShowCode(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                  <span>أظهر رقم الباركود نصيّاً</span>
                </label>
              </div>

              {/* Currency selector if Show Price is toggled */}
              {barcodeLabelShowPrice && (
                <div className="bg-slate-800 p-3 rounded-2xl space-y-2 border border-slate-800 text-xs">
                  <span className="text-[11px] text-slate-400 font-bold block pb-1 border-b border-slate-800 font-sans">عرض العملة والسعر بـ:</span>
                  <div className="grid grid-cols-3 gap-2 font-sans">
                    <button
                      type="button"
                      onClick={() => setBarcodeLabelCurrency('BOTH')}
                      className={`py-1 px-1 rounded-xl text-[10px] font-bold transition border border-slate-700 ${barcodeLabelCurrency === 'BOTH' ? `bg-amber-500 ${theme === 'dark' ? 'text-white' : 'text-slate-950'} font-black border-amber-450` : 'bg-slate-950 hover:bg-slate-900 text-slate-300'}`}
                    >
                      الإثنين معاً
                    </button>
                    <button
                      type="button"
                      onClick={() => setBarcodeLabelCurrency('LBP')}
                      className={`py-1 px-1 rounded-xl text-[10px] font-bold transition border border-slate-700 ${barcodeLabelCurrency === 'LBP' ? `bg-amber-500 ${theme === 'dark' ? 'text-white' : 'text-slate-950'} font-black border-amber-450` : 'bg-slate-950 hover:bg-slate-900 text-slate-300'}`}
                    >
                      ليرة لبنانية (L.L)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBarcodeLabelCurrency('USD')}
                      className={`py-1 px-1 rounded-xl text-[10px] font-bold transition border border-slate-700 ${barcodeLabelCurrency === 'USD' ? `bg-amber-500 ${theme === 'dark' ? 'text-white' : 'text-slate-950'} font-black border-amber-450` : 'bg-slate-950 hover:bg-slate-900 text-slate-300'}`}
                    >
                      دولار أمريكي ($)
                    </button>
                  </div>
                </div>
              )}

              {/* Stripe Width selector */}
              <div className="bg-slate-800 p-3 rounded-2xl space-y-2 border border-slate-800 text-xs">
                <span className="text-[11px] text-slate-400 font-bold block pb-1 border-b border-slate-800 font-sans">سمك خطوط الباركود (تناسق الطابعة):</span>
                <div className="grid grid-cols-3 gap-2 font-sans">
                  <button
                    type="button"
                    onClick={() => setBarcodeLabelStripeWidth('thick')}
                    className={`py-1.5 px-1 rounded-xl text-xs transition border border-slate-700 ${barcodeLabelStripeWidth === 'thick' ? `bg-amber-500 ${theme === 'dark' ? 'text-white' : 'text-slate-950'} font-black border-amber-400` : 'bg-slate-950 hover:bg-slate-900 text-slate-300'}`}
                  >
                    عريض
                  </button>
                  <button
                    type="button"
                    onClick={() => setBarcodeLabelStripeWidth('medium')}
                    className={`py-1.5 px-1 rounded-xl text-xs transition border border-slate-700 ${barcodeLabelStripeWidth === 'medium' ? `bg-amber-500 ${theme === 'dark' ? 'text-white' : 'text-slate-950'} font-black border-amber-400` : 'bg-slate-950 hover:bg-slate-900 text-slate-300'}`}
                  >
                    متوسط
                  </button>
                  <button
                    type="button"
                    onClick={() => setBarcodeLabelStripeWidth('thin')}
                    className={`py-1.5 px-1 rounded-xl text-xs transition border border-slate-700 ${barcodeLabelStripeWidth === 'thin' ? `bg-amber-500 ${theme === 'dark' ? 'text-white' : 'text-slate-950'} font-black border-amber-400` : 'bg-slate-950 hover:bg-slate-900 text-slate-300'}`}
                  >
                    دقيق / رقيق
                  </button>
                </div>
              </div>

              {/* Actions buttons */}
              <div className="flex gap-2 font-sans pt-2">
                <button 
                  onClick={() => {
                    printElementViaIFrame('barcode-paper-roll-print-area', `
                      body {
                        background: white !important;
                        color: black !important;
                        margin: 0 !important;
                        padding: 0 !important;
                      }
                      #barcode-paper-roll-print-area {
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        width: 100% !important;
                        background: white !important;
                        padding: 0 !important;
                      }
                      .barcode-label-container {
                        width: ${currentWidth}mm !important;
                        height: ${currentHeight}mm !important;
                        padding: ${currentPadding}mm !important;
                        margin: 0 0 5px 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        page-break-after: always !important;
                        break-after: page !important;
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        justify-content: center !important;
                        box-sizing: border-box !important;
                        background: white !important;
                        color: black !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                      }
                      @page {
                        size: ${currentWidth}mm ${currentHeight}mm;
                        margin: 0;
                      }
                    `, false); // Will trigger background spooling if directSilentPrint is enabled
                  }}
                  className={`flex-[2] bg-amber-500 hover:bg-amber-400 ${theme === 'dark' ? 'text-white' : 'text-slate-950'} py-3 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer border border-amber-400 shadow-md text-xs font-sans font-black`}
                >
                  <Printer className="w-4 h-4" />
                  <span>{settings.directSilentPrint !== false ? 'طباعة صامتة فورية (تلقائي) ⚡' : 'إرسال أمر الطباعة للملصقات 🖨️'}</span>
                </button>

                {settings.directSilentPrint !== false && (
                  <button 
                    onClick={() => {
                      printElementViaIFrame('barcode-paper-roll-print-area', `
                        body {
                          background: white !important;
                          color: black !important;
                          margin: 0 !important;
                          padding: 0 !important;
                        }
                        #barcode-paper-roll-print-area {
                          display: flex !important;
                          flex-direction: column !important;
                          align-items: center !important;
                          width: 100% !important;
                          background: white !important;
                          padding: 0 !important;
                        }
                        .barcode-label-container {
                          width: ${currentWidth}mm !important;
                          height: ${currentHeight}mm !important;
                          padding: ${currentPadding}mm !important;
                          margin: 0 0 5px 0 !important;
                          border: none !important;
                          box-shadow: none !important;
                          page-break-after: always !important;
                          break-after: page !important;
                          display: flex !important;
                          flex-direction: column !important;
                          align-items: center !important;
                          justify-content: center !important;
                          box-sizing: border-box !important;
                          background: white !important;
                          color: black !important;
                        }
                        @page {
                          size: ${currentWidth}mm ${currentHeight}mm;
                          margin: 0;
                        }
                      `, true); // Force manual print dialog
                    }}
                    className="bg-slate-900 hover:bg-slate-805 text-slate-300 font-bold px-3 py-3 rounded-2xl transition border border-slate-700 text-xs cursor-pointer font-sans"
                    title="فتح نافذة طباعة المتصفح اليدوية للملصقات"
                  >
                    معاينة / PDF يدوي 📄
                  </button>
                )}

                <button 
                  onClick={() => setBarcodeLabelProduct(null)}
                  className="bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-450 font-bold px-4 py-3 rounded-2xl transition cursor-pointer text-xs font-sans"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. Label Preview Presentation (Stays visible during print) */}
        <div className="w-full md:w-80 bg-slate-950 rounded-2xl p-4 flex flex-col items-center justify-center space-y-3 border border-slate-800 md:order-1">
          <span className="text-slate-400 text-[10px] font-bold no-print font-sans text-center">👇 معاينة الملصق على رول الورق الحراري ({barcodeLabelSize === 'custom' ? `${currentWidth}x${currentHeight}mm` : barcodeLabelSize === 'small' ? 'صغير جداً' : barcodeLabelSize === 'large' ? 'كبير' : 'وسط'})</span>

          {/* Paper Roll simulation wrapper */}
          <div id="barcode-paper-roll-print-area" className="w-full max-h-[380px] overflow-x-auto overflow-y-auto space-y-4 p-2 bg-slate-900/40 rounded-xl scrollbar-hidden flex flex-col items-center">
            {Array.from({ length: barcodeLabelCopies }).map((_, index) => {
              const computedPriceLBP = barcodeLabelProduct.priceUSD * settings.exchangeRate;
              return (
                <div 
                  key={index}
                  className="bg-white text-black rounded-lg border border-slate-200 flex flex-col items-center justify-center text-center select-none relative overflow-hidden barcode-label-container shadow-sm flex-shrink-0"
                  style={{ 
                    fontFamily: 'Cairo, system-ui, sans-serif',
                    pageBreakAfter: 'always',
                    breakAfter: 'page',
                    width: `${currentWidth}mm`,
                    height: `${currentHeight}mm`,
                    padding: `${currentPadding}mm`,
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Shop Name Header */}
                  <div 
                    style={{ fontSize: shopNameSize }}
                    className="font-black tracking-wide text-slate-800 border-b border-dashed border-slate-200 pb-0.5 w-full uppercase truncate text-center leading-none"
                  >
                    {settings.shopName}
                  </div>

                  {/* Product Name */}
                  {barcodeLabelShowName && (
                    <div 
                      style={{ fontSize: productNameSize }}
                      className="font-black text-slate-950 font-extrabold px-0.5 truncate w-full leading-tight text-center pt-0.5"
                    >
                      {barcodeLabelProduct.name}
                    </div>
                  )}

                  {/* Barcode lines representation */}
                  <div 
                    style={{ height: barcodeHeight }}
                    className="flex justify-center items-stretch bg-white px-2 py-0.5 select-none overflow-hidden max-w-full"
                  >
                    {generateBarcodePattern(barcodeLabelProduct.barcode || '').map((bit, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          width: barcodeLabelStripeWidth === 'thin' ? '1px' : barcodeLabelStripeWidth === 'thick' ? '3px' : '2px',
                          backgroundColor: bit === '1' ? 'black' : 'white'
                        }}
                        className="h-full"
                      />
                    ))}
                  </div>

                  {/* Barcode number string */}
                  {barcodeLabelShowCode && (
                    <div 
                      style={{ fontSize: codeSize }}
                      className="tracking-[3px] font-mono font-bold text-slate-700 leading-none text-center pb-0.5"
                    >
                      *{barcodeLabelProduct.barcode}*
                    </div>
                  )}

                  {/* Prices Tag Line */}
                  {barcodeLabelShowPrice && (
                    <div className="border-t border-dashed border-slate-300 pt-0.5 w-full flex flex-col items-center justify-center leading-none">
                      {barcodeLabelCurrency === 'BOTH' ? (
                        <>
                          <div 
                            style={{ fontSize: priceSize }}
                            className="text-emerald-700 font-extrabold font-bold tracking-tight text-center"
                          >
                            {barcodeLabelProduct.priceUSD.toFixed(2)} $
                          </div>
                          <div 
                            style={{ fontSize: subPriceSize }}
                            className="font-black text-slate-800 font-extrabold antialiased text-center"
                          >
                            {Math.ceil(computedPriceLBP).toLocaleString()} ل.ل
                          </div>
                        </>
                      ) : barcodeLabelCurrency === 'LBP' ? (
                        <div 
                          style={{ fontSize: priceSize }}
                          className="text-emerald-850 font-black font-extrabold text-center"
                        >
                          {Math.ceil(computedPriceLBP).toLocaleString()} ل.ل
                        </div>
                      ) : (
                        <div 
                          style={{ fontSize: priceSize }}
                          className="text-emerald-700 font-extrabold font-bold text-center"
                        >
                          {barcodeLabelProduct.priceUSD.toFixed(2)} $
                        </div>
                      )}
                    </div>
                  )}

                  {/* Copy Index Number (Visual anchor for copies) */}
                  {barcodeLabelCopies > 1 && (
                    <div className="absolute right-1 bottom-1 text-[7px] text-slate-400 no-print font-mono leading-none">
                      {index + 1}/{barcodeLabelCopies}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
