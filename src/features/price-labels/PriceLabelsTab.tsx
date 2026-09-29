import React, { useEffect, useState } from 'react';
import { Printer, RotateCcw, Tag, Trash2 } from 'lucide-react';
import { Product, SystemSettings } from '../../types';
import * as storage from '../../lib/storage';
import { generateBarcodePattern } from '../../lib/barcode';
import { printElementViaIFrame } from '../../lib/print';

interface PriceLabelsTabProps {
  products: Product[];
  settings: SystemSettings;
  theme: 'light' | 'dark';
  lang: 'ar' | 'en';
  showToast: (type: 'success' | 'error' | 'warning', message: string) => void;
}

export function PriceLabelsTab({ products, settings, theme, lang, showToast }: PriceLabelsTabProps) {
  // Label layout preferences are remembered on this device
  const [plPaperSize, setPlPaperSize] = useState<'A4' | 'roll58' | 'roll80' | 'custom'>(() => {
    return (storage.getItem('pl_paper_size') as 'A4' | 'roll58' | 'roll80' | 'custom') || 'custom';
  });
  const [plPageWidth, setPlPageWidth] = useState<number>(() => {
    return Number(storage.getItem('pl_page_width')) || 100;
  });
  const [plPageHeight, setPlPageHeight] = useState<number>(() => {
    return Number(storage.getItem('pl_page_height')) || 60;
  });
  const [plIsContinuousRoll, setPlIsContinuousRoll] = useState<boolean>(() => {
    return storage.getItem('pl_is_continuous_roll') !== 'false';
  });
  const [plMarginTop, setPlMarginTop] = useState<number>(() => {
    return storage.getItem('pl_margin_top') !== null ? Number(storage.getItem('pl_margin_top')) : 2;
  });
  const [plMarginBottom, setPlMarginBottom] = useState<number>(() => {
    return storage.getItem('pl_margin_bottom') !== null ? Number(storage.getItem('pl_margin_bottom')) : 2;
  });
  const [plMarginLeft, setPlMarginLeft] = useState<number>(() => {
    return storage.getItem('pl_margin_left') !== null ? Number(storage.getItem('pl_margin_left')) : 2;
  });
  const [plMarginRight, setPlMarginRight] = useState<number>(() => {
    return storage.getItem('pl_margin_right') !== null ? Number(storage.getItem('pl_margin_right')) : 2;
  });
  const [plColumns, setPlColumns] = useState<number>(() => {
    return Number(storage.getItem('pl_columns')) || 2;
  });
  const [plLabelWidth, setPlLabelWidth] = useState<number>(() => {
    return Number(storage.getItem('pl_label_width')) || 45;
  });
  const [plLabelHeight, setPlLabelHeight] = useState<number>(() => {
    return Number(storage.getItem('pl_label_height')) || 25;
  });
  const [plRowSpacing, setPlRowSpacing] = useState<number>(() => {
    return storage.getItem('pl_row_spacing') !== null ? Number(storage.getItem('pl_row_spacing')) : 1;
  });
  const [plColSpacing, setPlColSpacing] = useState<number>(() => {
    return storage.getItem('pl_col_spacing') !== null ? Number(storage.getItem('pl_col_spacing')) : 1;
  });
  const [plShowName, setPlShowName] = useState<boolean>(() => {
    return storage.getItem('pl_show_name') !== 'false';
  });
  const [plShowPrice, setPlShowPrice] = useState<boolean>(() => {
    return storage.getItem('pl_show_price') !== 'false';
  });
  const [plShowCode, setPlShowCode] = useState<boolean>(() => {
    return storage.getItem('pl_show_code') !== 'false';
  });
  const [plShowBarcode, setPlShowBarcode] = useState<boolean>(() => {
    return storage.getItem('pl_show_barcode') !== 'false';
  });
  const [plPriceIncludesTax, setPlPriceIncludesTax] = useState<boolean>(() => {
    return storage.getItem('pl_price_includes_tax') !== 'false';
  });
  const [plShowBorders, setPlShowBorders] = useState<boolean>(() => {
    return storage.getItem('pl_show_borders') !== 'false';
  });
  const [plBarcodeType, setPlBarcodeType] = useState<'EAN13' | 'Code128'>(() => {
    return (storage.getItem('pl_barcode_type') as 'EAN13' | 'Code128') || 'Code128';
  });
  const [plNameSize, setPlNameSize] = useState<number>(() => {
    return Number(storage.getItem('pl_name_size')) || 10;
  });
  const [plPriceSize, setPlPriceSize] = useState<number>(() => {
    return Number(storage.getItem('pl_price_size')) || 13;
  });
  const [plBarcodeHeightValue, setPlBarcodeHeightValue] = useState<number>(() => {
    return Number(storage.getItem('pl_barcode_height_value')) || 18;
  });
  const [plSelectedProducts, setPlSelectedProducts] = useState<{ productId: string; qty: number }[]>([]);
  const [plSearchQuery, setPlSearchQuery] = useState<string>('');

  useEffect(() => {
    storage.setItem('pl_paper_size', plPaperSize);
    storage.setItem('pl_page_width', String(plPageWidth));
    storage.setItem('pl_page_height', String(plPageHeight));
    storage.setItem('pl_is_continuous_roll', String(plIsContinuousRoll));
    storage.setItem('pl_margin_top', String(plMarginTop));
    storage.setItem('pl_margin_bottom', String(plMarginBottom));
    storage.setItem('pl_margin_left', String(plMarginLeft));
    storage.setItem('pl_margin_right', String(plMarginRight));
    storage.setItem('pl_columns', String(plColumns));
    storage.setItem('pl_label_width', String(plLabelWidth));
    storage.setItem('pl_label_height', String(plLabelHeight));
    storage.setItem('pl_row_spacing', String(plRowSpacing));
    storage.setItem('pl_col_spacing', String(plColSpacing));
    storage.setItem('pl_show_name', String(plShowName));
    storage.setItem('pl_show_price', String(plShowPrice));
    storage.setItem('pl_show_code', String(plShowCode));
    storage.setItem('pl_show_barcode', String(plShowBarcode));
    storage.setItem('pl_price_includes_tax', String(plPriceIncludesTax));
    storage.setItem('pl_show_borders', String(plShowBorders));
    storage.setItem('pl_barcode_type', plBarcodeType);
    storage.setItem('pl_name_size', String(plNameSize));
    storage.setItem('pl_price_size', String(plPriceSize));
    storage.setItem('pl_barcode_height_value', String(plBarcodeHeightValue));
  }, [
    plPaperSize, plPageWidth, plPageHeight, plIsContinuousRoll,
    plMarginTop, plMarginBottom, plMarginLeft, plMarginRight,
    plColumns, plLabelWidth, plLabelHeight, plRowSpacing, plColSpacing,
    plShowName, plShowPrice, plShowCode, plShowBarcode, plPriceIncludesTax,
    plShowBorders, plBarcodeType, plNameSize, plPriceSize, plBarcodeHeightValue
  ]);

  // Filter products for search suggestion block
  const filteredSearchProds = plSearchQuery.trim() === '' 
    ? [] 
    : products.filter(p => 
        p.name.toLowerCase().includes(plSearchQuery.toLowerCase()) || 
        (p.barcode && p.barcode.includes(plSearchQuery))
      );

  // Compute actual label render list
  const finalRenderLabels = plSelectedProducts.length > 0 
    ? plSelectedProducts.flatMap(item => {
        const p = products.find(x => x.id === item.productId);
        if (!p) return [];
        return Array.from({ length: item.qty }).map(() => p);
      })
    : products; // default is all products if selection is empty

  const handleAddProductToLabels = (prod: Product) => {
    const exists = plSelectedProducts.find(x => x.productId === prod.id);
    if (exists) {
      setPlSelectedProducts(plSelectedProducts.map(x => x.productId === prod.id ? { ...x, qty: x.qty + 1 } : x));
    } else {
      setPlSelectedProducts([...plSelectedProducts, { productId: prod.id, qty: 1 }]);
    }
    showToast('success', lang === 'ar' ? `✓ تم إضافة المنتج: ${prod.name}` : `Added ${prod.name}`);
  };

  const triggerBatchPrint = () => {
    const borderStyle = plShowBorders ? 'border: 1px solid #000 !important;' : 'border: none !important;';
    const customPrintStyles = `
      @media print {
        html, body {
          background: white !important;
          color: black !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        #main-system {
          display: block !important;
          background: white !important;
        }
        #main-system > *:not(#price-labels-print-area) {
          display: none !important;
        }
        .no-print, .toast-container {
          display: none !important;
        }
        #price-labels-print-area {
          display: block !important;
          background: white !important;
          padding: 0 !important;
          margin: 0 !important;
          width: ${plPaperSize === 'A4' ? '210mm' : `${plPageWidth}mm`} !important;
        }
        .pl-print-grid {
          display: grid !important;
          grid-template-columns: repeat(${plColumns}, minmax(0, 1fr)) !important;
          column-gap: ${plColSpacing}mm !important;
          row-gap: ${plRowSpacing}mm !important;
          padding-top: ${plMarginTop}mm !important;
          padding-bottom: ${plMarginBottom}mm !important;
          padding-left: ${plMarginLeft}mm !important;
          padding-right: ${plMarginRight}mm !important;
          box-sizing: border-box !important;
          background: white !important;
        }
        .pl-print-card {
          width: ${plLabelWidth}mm !important;
          height: ${plLabelHeight}mm !important;
          box-sizing: border-box !important;
          background: white !important;
          color: black !important;
          ${borderStyle}
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: hidden !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        @page {
          size: ${plPaperSize === 'A4' ? 'A4 portrait' : `${plPageWidth}mm ${plIsContinuousRoll ? 'auto' : `${plPageHeight}mm`}`};
          margin: 0 !important;
        }
      }
    `;
    printElementViaIFrame('price-labels-print-area', customPrintStyles, false);
  };

  const resetPlDesign = () => {
    setPlPaperSize('custom');
    setPlPageWidth(100);
    setPlPageHeight(60);
    setPlIsContinuousRoll(true);
    setPlMarginTop(2);
    setPlMarginBottom(2);
    setPlMarginLeft(2);
    setPlMarginRight(2);
    setPlColumns(2);
    setPlLabelWidth(45);
    setPlLabelHeight(25);
    setPlRowSpacing(1);
    setPlColSpacing(1);
    setPlShowName(true);
    setPlShowPrice(true);
    setPlShowCode(true);
    setPlShowBarcode(true);
    setPlPriceIncludesTax(true);
    setPlShowBorders(true);
    setPlBarcodeType('Code128');
    setPlNameSize(10);
    setPlPriceSize(13);
    setPlBarcodeHeightValue(18);
    setPlSelectedProducts([]);
    setPlSearchQuery('');
    showToast('success', lang === 'ar' ? '✓ تم إعادة ضبط قيم وتصميم الملصقات بنجاح!' : 'Layout reset to defaults!');
  };

  const applyPreset = (preset: 'a4_standard' | 'roll_single' | 'roll_double') => {
    if (preset === 'a4_standard') {
      setPlPaperSize('A4');
      setPlPageWidth(210);
      setPlPageHeight(297);
      setPlIsContinuousRoll(false);
      setPlColumns(3);
      setPlLabelWidth(64);
      setPlLabelHeight(34);
      setPlMarginTop(8);
      setPlMarginBottom(8);
      setPlMarginLeft(6);
      setPlMarginRight(6);
      setPlRowSpacing(2);
      setPlColSpacing(2.5);
      setPlShowBorders(true);
    } else if (preset === 'roll_single') {
      setPlPaperSize('roll80');
      setPlPageWidth(80);
      setPlPageHeight(40);
      setPlIsContinuousRoll(true);
      setPlColumns(1);
      setPlMarginTop(1);
      setPlMarginBottom(1);
      setPlMarginLeft(1);
      setPlMarginRight(1);
      setPlLabelWidth(76);
      setPlLabelHeight(38);
      setPlRowSpacing(2);
      setPlColSpacing(0);
      setPlShowBorders(false);
    } else if (preset === 'roll_double') {
      setPlPaperSize('custom');
      setPlPageWidth(100);
      setPlPageHeight(30);
      setPlIsContinuousRoll(true);
      setPlColumns(2);
      setPlMarginTop(1.5);
      setPlMarginBottom(1.5);
      setPlMarginLeft(1.5);
      setPlMarginRight(1.5);
      setPlLabelWidth(47);
      setPlLabelHeight(27);
      setPlRowSpacing(1);
      setPlColSpacing(1.5);
      setPlShowBorders(true);
    }
    showToast('success', lang === 'ar' ? 'تم تطبيق القالب الجاهز بنجاح!' : 'Preset applied successfully!');
  };

  return (
    <div id="price-labels-root-wrapper" className="space-y-6 animate-fade-in text-right" dir="rtl">
      
      {/* Visual Header */}
      <div className={`p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 border ${theme === 'dark' ? 'bg-[#18181b] border-stone-800 text-stone-100' : 'bg-white border-slate-200 text-slate-800'} shadow-sm`}>
        <div className="text-right">
          <h2 className="text-xl font-extrabold flex items-center justify-start gap-2.5">
            <Tag className="w-5 h-5 text-[#1D9E75]" />
            <span>{lang === 'ar' ? 'مصمم ومولد بطاقات الأسعار الذكي' : 'Smart Price Labels & Barcode Designer'}</span>
          </h2>
          <p className={`text-xs mt-1 leading-relaxed ${theme === 'dark' ? 'text-stone-400' : 'text-slate-500'}`}>
            {lang === 'ar' 
              ? 'أنشئ وصمم ملصقات حرارية مخصصة أو أوراق ملصقات A4 للرفوف والسلع مع الباركود والأسعار. يدوي بالمليمتر.' 
              : 'Generate custom barcode tags or A4-sheet price tags for shelves and goods with real-time preview.'}
          </p>
        </div>
        
        {/* Actions right / left */}
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            onClick={() => applyPreset('a4_standard')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              plPaperSize === 'A4' ? 'bg-[#1D9E75]/10 border-[#1D9E75] text-[#1D9E75]' : theme === 'dark' ? 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-850' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
            }`}
            title="قالب ملصقات ورق A4 قياسي 3 أعمدة للرفوف"
          >
            📄 {lang === 'ar' ? 'قالب ورق A4 (رفوف)' : 'A4 Sheets Grid'}
          </button>
          <button
            onClick={() => applyPreset('roll_single')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              plPaperSize === 'roll80' ? 'bg-[#1D9E75]/10 border-[#1D9E75] text-[#1D9E75]' : theme === 'dark' ? 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-850' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
            }`}
            title="ملصق باركود حراري عريض للرول المستمر"
          >
            🛵 {lang === 'ar' ? 'قالب رول فردي 80مم' : '80mm Single Roll'}
          </button>
          <button
            onClick={() => applyPreset('roll_double')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              plPaperSize === 'custom' && plColumns === 2 ? 'bg-[#1D9E75]/10 border-[#1D9E75] text-[#1D9E75]' : theme === 'dark' ? 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-850' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
            }`}
            title="شريط باركود وطباعة مزدوجة للرول"
          >
            👥 {lang === 'ar' ? 'قالب رول مزدوج (عمودين)' : 'Double Labels Roll'}
          </button>
          <button
            onClick={resetPlDesign}
            className={`px-3 py-1.5 rounded-xl border text-xs transition flex items-center gap-1 cursor-pointer ${
              theme === 'dark' ? 'bg-stone-900 border-stone-800 text-rose-400 hover:bg-stone-850' : 'bg-slate-50 border-slate-200 text-rose-600 hover:bg-slate-100'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'إعادة ضبط' : 'Reset'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* SIDEBAR DESIGN PARAMETERS (Spans 4 columns on xl) */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* SECTION 1: LAYOUT & FORMAT */}
          <div className={`p-5 rounded-3xl border ${theme === 'dark' ? 'bg-[#18181b] border-stone-800 text-stone-100' : 'bg-white border-slate-200 text-slate-800'} shadow-xs`}>
            <h3 className="font-extrabold text-[#111112] dark:text-stone-200 text-xs flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-stone-800 w-full mb-3">
              <span className="text-amber-500">⚙️</span>
              <span>{lang === 'ar' ? 'التنسيق وحجم ورق السلع' : 'Paper Format & Margins'}</span>
            </h3>
            
            <div className="space-y-3.5">
              {/* Paper size selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">{lang === 'ar' ? 'مقاس الورق المستخدم:' : 'Paper Size Preset:'}</label>
                <select
                  value={plPaperSize}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setPlPaperSize(val);
                    if (val === 'A4') {
                      setPlPageWidth(210);
                      setPlPageHeight(297);
                      setPlIsContinuousRoll(false);
                      setPlColumns(3);
                    } else if (val === 'roll58') {
                      setPlPageWidth(58);
                      setPlIsContinuousRoll(true);
                      setPlColumns(1);
                    } else if (val === 'roll80') {
                      setPlPageWidth(80);
                      setPlIsContinuousRoll(true);
                      setPlColumns(1);
                    }
                  }}
                  className={`w-full text-xs font-black rounded-xl py-2 px-3 border focus:outline-none ${
                    theme === 'dark' ? 'bg-[#121213] border-stone-850 text-stone-100 focus:ring-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-emerald-500'
                  }`}
                >
                  <option value="custom">{lang === 'ar' ? 'حجم يدوي مخصص' : 'Handmade Custom Size'}</option>
                  <option value="A4">{lang === 'ar' ? 'ورقة ليزر A4 (طابعة مكتبية)' : 'A4 Sheets Sheet (Office Printer)'}</option>
                  <option value="roll58">{lang === 'ar' ? 'رول حراري دقيق (أقصى 58 مم)' : 'Thermal Roll 58mm'}</option>
                  <option value="roll80">{lang === 'ar' ? 'رول باركود حراري عريض (80 مم)' : 'Thermal Roll 80mm'}</option>
                </select>
              </div>

              {/* Page Dimensions inputs */}
              {plPaperSize === 'custom' && (
                <div className="grid grid-cols-2 gap-3 animate-fade-in text-right">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-0.5">{lang === 'ar' ? 'عرض الصفحة (مم):' : 'Page Width (mm):'}</label>
                    <input
                      type="number"
                      min={20}
                      max={300}
                      value={plPageWidth}
                      onChange={(e) => setPlPageWidth(Math.max(20, Math.min(300, parseInt(e.target.value) || 100)))}
                      className={`w-full text-xs font-bold text-center rounded-xl py-2 px-2 border focus:outline-none ${
                        theme === 'dark' ? 'bg-[#121213] border-stone-850 text-stone-100' : 'bg-slate-50 border-slate-100 text-slate-800'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-0.5">{lang === 'ar' ? 'ارتفاع الصفحة (مم):' : 'Page Height (mm):'}</label>
                    <input
                      type="number"
                      min={20}
                      max={500}
                      disabled={plIsContinuousRoll}
                      value={plIsContinuousRoll ? '' : plPageHeight}
                      placeholder={plIsContinuousRoll ? 'رول مستمر' : ''}
                      onChange={(e) => setPlPageHeight(Math.max(20, Math.min(500, parseInt(e.target.value) || 60)))}
                      className={`w-full text-xs font-bold text-center rounded-xl py-2 px-2 border focus:outline-none ${
                        plIsContinuousRoll ? 'opacity-55 cursor-not-allowed bg-slate-100 dark:bg-stone-900' : theme === 'dark' ? 'bg-[#121213] border-stone-850 text-stone-100' : 'bg-slate-50 border-slate-100 text-slate-800'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Margin adjustments (Grid Top, bottom, left, right) */}
              <div className="bg-slate-50 dark:bg-[#121213] border border-slate-100 dark:border-stone-850 rounded-2xl p-3 space-y-2">
                <span className="text-[10px] text-slate-400 font-bold block pb-1 border-b border-slate-200 dark:border-stone-800">{lang === 'ar' ? 'مظاريف الهوامش (الهوامش ملم):' : 'Margins (mm):'}</span>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono">
                  <div>
                    <span className="text-slate-400 block mb-0.5">{lang === 'ar' ? 'أعلى' : 'Top'}</span>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={plMarginTop}
                      onChange={(e) => setPlMarginTop(Math.max(0, parseFloat(e.target.value) || 0))}
                      className={`w-full border rounded-lg py-1 px-1 text-center ${theme === 'dark' ? 'bg-stone-950 border-stone-800 text-stone-100' : 'bg-white border-slate-200 text-slate-800'}`}
                    />
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">{lang === 'ar' ? 'أسفل' : 'Bottom'}</span>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={plMarginBottom}
                      onChange={(e) => setPlMarginBottom(Math.max(0, parseFloat(e.target.value) || 0))}
                      className={`w-full border rounded-lg py-1 px-1 text-center ${theme === 'dark' ? 'bg-stone-950 border-stone-800 text-stone-100' : 'bg-white border-slate-200 text-slate-800'}`}
                    />
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">{lang === 'ar' ? 'يسار' : 'Left'}</span>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={plMarginLeft}
                      onChange={(e) => setPlMarginLeft(Math.max(0, parseFloat(e.target.value) || 0))}
                      className={`w-full border rounded-lg py-1 px-1 text-center ${theme === 'dark' ? 'bg-stone-950 border-stone-800 text-stone-100' : 'bg-white border-slate-200 text-slate-800'}`}
                    />
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">{lang === 'ar' ? 'يمين' : 'Right'}</span>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={plMarginRight}
                      onChange={(e) => setPlMarginRight(Math.max(0, parseFloat(e.target.value) || 0))}
                      className={`w-full border rounded-lg py-1 px-1 text-center ${theme === 'dark' ? 'bg-stone-950 border-stone-800 text-stone-100' : 'bg-white border-slate-200 text-slate-800'}`}
                    />
                  </div>
                </div>
              </div>

              {/* Columns count and Spacing / Gap */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">{lang === 'ar' ? 'عدد الأعمدة (خلايا):' : 'Columns Count:'}</label>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    value={plColumns}
                    onChange={(e) => setPlColumns(parseInt(e.target.value) || 1)}
                    className="w-full accent-[#1D9E75] cursor-pointer mt-1"
                  />
                  <span className="block text-center font-black mt-1 text-xs text-[#1D9E75] font-mono">{plColumns} {plColumns === 1 ? 'أعمدة مفردة' : 'أعمدة متوازية'}</span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">{lang === 'ar' ? 'الطباعة بلا توقف (رول):' : 'Continuous Paper:'}</label>
                  <label className="flex items-center justify-center gap-2 mt-2 cursor-pointer bg-slate-50 dark:bg-stone-950 px-2 py-1 rounded-xl border border-dashed border-slate-300 dark:border-stone-800 select-none text-[11px] font-bold">
                    <input
                      type="checkbox"
                      checked={plIsContinuousRoll}
                      onChange={(e) => {
                        setPlIsContinuousRoll(e.target.checked);
                        if (e.target.checked) setPlPaperSize('custom');
                      }}
                      className="rounded border-slate-300 dark:border-stone-800 bg-transparent text-[#1D9E75] focus:ring-0 cursor-pointer"
                    />
                    <span>{lang === 'ar' ? 'شريط رول مستمر' : 'Continuous Roll'}</span>
                  </label>
                </div>
              </div>

              {/* Label sizing (Width) and (Height) */}
              <div className="grid grid-cols-2 gap-3 border-t border-dashed border-slate-150 dark:border-stone-850 pt-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-0.5">{lang === 'ar' ? 'عرض ملصق السجل (ملم):' : 'Label Width (mm):'}</label>
                  <input
                    type="number"
                    min={10}
                    max={160}
                    value={plLabelWidth}
                    onChange={(e) => setPlLabelWidth(Math.max(10, Math.min(160, parseInt(e.target.value) || 40)))}
                    className={`w-full text-xs font-bold text-center rounded-xl py-2 px-2 border focus:outline-none ${
                      theme === 'dark' ? 'bg-[#121213] border-stone-850 text-stone-100 focus:ring-emerald-500' : 'bg-slate-50 border-slate-150 text-slate-800'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-0.5">{lang === 'ar' ? 'ارتفاع ملصق السجل (ملم):' : 'Label Height (mm):'}</label>
                  <input
                    type="number"
                    min={10}
                    max={200}
                    value={plLabelHeight}
                    onChange={(e) => setPlLabelHeight(Math.max(10, Math.min(200, parseInt(e.target.value) || 25)))}
                    className={`w-full text-xs font-bold text-center rounded-xl py-2 px-2 border focus:outline-none ${
                      theme === 'dark' ? 'bg-[#121213] border-stone-850 text-stone-100 focus:ring-emerald-500' : 'bg-slate-50 border-slate-150 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Row Spacing & Column Spacing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-0.5">{lang === 'ar' ? 'الفراغ بين الصفوف (ملم):' : 'Row Spacing (mm):'}</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.5}
                    value={plRowSpacing}
                    onChange={(e) => setPlRowSpacing(Math.max(0, Math.min(20, parseFloat(e.target.value) || 0)))}
                    className={`w-full text-xs font-bold text-center rounded-xl py-2 px-2 border focus:outline-none ${
                      theme === 'dark' ? 'bg-[#121213] border-stone-850 text-stone-100' : 'bg-slate-50 border-slate-150 text-slate-800'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-0.5">{lang === 'ar' ? 'الفراغ بين الأعمدة (ملم):' : 'Col Spacing (mm):'}</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.5}
                    value={plColSpacing}
                    onChange={(e) => setPlColSpacing(Math.max(0, Math.min(20, parseFloat(e.target.value) || 0)))}
                    className={`w-full text-xs font-bold text-center rounded-xl py-2 px-2 border focus:outline-none ${
                      theme === 'dark' ? 'bg-[#121213] border-stone-850 text-stone-100' : 'bg-slate-50 border-slate-150 text-slate-800'
                    }`}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* SECTION 2: SHOW CHECKBOXES (DISPLAY CONFIGS) */}
          <div className={`p-5 rounded-3xl border ${theme === 'dark' ? 'bg-[#18181b] border-stone-800 text-stone-100' : 'bg-white border-slate-200 text-slate-800'} shadow-xs`}>
            <h3 className="font-extrabold text-[#111112] dark:text-stone-200 text-xs flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-stone-800 w-full mb-3">
              <span className="text-sky-500">👁️</span>
              <span>{lang === 'ar' ? 'العناصر المرئية على الملصق' : 'Visible Fields Options'}</span>
            </h3>
            
            <div className="space-y-2 text-xs">
              <label className="flex items-center justify-between cursor-pointer py-1 hover:opacity-80">
                <input 
                  type="checkbox" 
                  checked={plShowName}
                  onChange={e => setPlShowName(e.target.checked)}
                  className="rounded border-slate-300 dark:border-stone-800 bg-transparent text-[#1D9E75] focus:ring-0 cursor-pointer"
                />
                <span className="font-semibold">{lang === 'ar' ? 'عرض اسم السلعة / المنتج' : 'Display Product Title'}</span>
              </label>
              <label className="flex items-center justify-between cursor-pointer py-1 hover:opacity-80">
                <input 
                  type="checkbox" 
                  checked={plShowPrice}
                  onChange={e => setPlShowPrice(e.target.checked)}
                  className="rounded border-slate-300 dark:border-stone-800 bg-transparent text-[#1D9E75] focus:ring-0 cursor-pointer"
                />
                <span className="font-semibold">{lang === 'ar' ? 'عرض سعر البيع' : 'Display Retail Price'}</span>
              </label>
              <label className="flex items-center justify-between cursor-pointer py-1 hover:opacity-80">
                <input 
                  type="checkbox" 
                  checked={plShowBarcode}
                  onChange={e => setPlShowBarcode(e.target.checked)}
                  className="rounded border-slate-300 dark:border-stone-800 bg-transparent text-[#1D9E75] focus:ring-0 cursor-pointer"
                />
                <span className="font-semibold">{lang === 'ar' ? 'تخطيط خطوط الباركود (Barcode)' : 'Draw Barcode Stripes'}</span>
              </label>
              <label className="flex items-center justify-between cursor-pointer py-1 hover:opacity-80">
                <input 
                  type="checkbox" 
                  checked={plShowCode}
                  onChange={e => setPlShowCode(e.target.checked)}
                  className="rounded border-slate-300 dark:border-stone-800 bg-transparent text-[#1D9E75] focus:ring-0 cursor-pointer"
                />
                <span className="font-semibold">{lang === 'ar' ? 'كتابة رقم الباركود نصيَّاً' : 'Display Text SKU Code'}</span>
              </label>
              <label className="flex items-center justify-between cursor-pointer py-1 hover:opacity-80">
                <input 
                  type="checkbox" 
                  checked={plPriceIncludesTax}
                  onChange={e => setPlPriceIncludesTax(e.target.checked)}
                  className="rounded border-slate-300 dark:border-stone-800 bg-transparent text-[#1D9E75] focus:ring-0 cursor-pointer"
                />
                <span className="font-semibold">{lang === 'ar' ? 'كتابة عبارة "السعر شامل الضريبة"' : 'Include "Tax Included" badge'}</span>
              </label>
              <label className="flex items-center justify-between cursor-pointer py-1 hover:opacity-80">
                <input 
                  type="checkbox" 
                  checked={plShowBorders}
                  onChange={e => setPlShowBorders(e.target.checked)}
                  className="rounded border-slate-300 dark:border-stone-800 bg-transparent text-[#1D9E75] focus:ring-0 cursor-pointer"
                />
                <span className="font-semibold">{lang === 'ar' ? 'رسم إطار خارجي حول البطاقة' : 'Outline Card Borders'}</span>
              </label>
            </div>

            {/* Barcode Type selection */}
            <div className="pt-3 border-t border-dashed border-slate-100 dark:border-stone-850 mt-3">
              <label className="block text-[11px] font-bold text-slate-400 mb-1">{lang === 'ar' ? 'نظام ترميز الباركود:' : 'Barcode Symbology:'}</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setPlBarcodeType('Code128')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                    plBarcodeType === 'Code128' ? 'bg-[#1D9E75] text-white border-[#1D9E75] shadow-xs' : 'bg-transparent border-slate-200 dark:border-stone-800 text-slate-400 hover:text-slate-650'
                  }`}
                >
                  Code 128 (تلقائي)
                </button>
                <button
                  type="button"
                  onClick={() => setPlBarcodeType('EAN13')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                    plBarcodeType === 'EAN13' ? 'bg-[#1D9E75] text-white border-[#1D9E75] shadow-xs' : 'bg-transparent border-slate-200 dark:border-stone-800 text-slate-400 hover:text-slate-650'
                  }`}
                >
                  EAN-13 (قياسي)
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 3: TEXT SIZES & ELEMENT HEIGHTS */}
          <div className={`p-5 rounded-3xl border ${theme === 'dark' ? 'bg-[#18181b] border-stone-800 text-stone-100' : 'bg-white border-slate-200 text-slate-800'} shadow-xs`}>
            <h3 className="font-extrabold text-[#111112] dark:text-stone-200 text-xs flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-stone-800 w-full mb-3">
              <span className="text-yellow-600">📐</span>
              <span>{lang === 'ar' ? 'أحجام النصوص ومقاييس الرسم' : 'Element Fonts & Sizes'}</span>
            </h3>
            
            <div className="space-y-3.5">
              {/* Title font size */}
              <div>
                <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 mb-0.5">
                  <span>{plNameSize}px</span>
                  <span>{lang === 'ar' ? 'حجم خط اسم المنتج:' : 'Title Font Size:'}</span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={22}
                  value={plNameSize}
                  onChange={(e) => setPlNameSize(parseInt(e.target.value) || 10)}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Price font size */}
              <div>
                <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 mb-0.5">
                  <span>{plPriceSize}px</span>
                  <span>{lang === 'ar' ? 'حجم خط السعر:' : 'Price Font Size:'}</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={32}
                  value={plPriceSize}
                  onChange={(e) => setPlPriceSize(parseInt(e.target.value) || 12)}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Barcode height */}
              <div>
                <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 mb-0.5">
                  <span>{plBarcodeHeightValue}px</span>
                  <span>{lang === 'ar' ? 'ارتفاع شريط الباركود المرسوم:' : 'Barcode Canvas Height:'}</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={60}
                  value={plBarcodeHeightValue}
                  onChange={(e) => setPlBarcodeHeightValue(parseInt(e.target.value) || 16)}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: PRODUCTS LIST TO PRINT SELECTOR */}
          <div className={`p-5 rounded-3xl border ${theme === 'dark' ? 'bg-[#18181b] border-stone-800 text-stone-100' : 'bg-white border-slate-200 text-slate-800'} shadow-xs`}>
            <h3 className="font-extrabold text-[#111112] dark:text-stone-200 text-xs flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-stone-800 w-full mb-3">
              <span className="text-[#1D9E75]">📦</span>
              <span>{lang === 'ar' ? 'البضائع والمنتجات المحددة للطباعة' : 'Select Queue Products'}</span>
            </h3>
            
            <div className="space-y-4">
              {/* Search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={lang === 'ar' ? 'ابحث هنا بالاسم أو الكود لإضافة عنصر...' : 'Search product to add to queue...'}
                  value={plSearchQuery}
                  onChange={e => setPlSearchQuery(e.target.value)}
                  className={`w-full text-xs rounded-xl py-2 px-3 border focus:outline-none focus:ring-1 focus:ring-emerald-500 text-right ${
                    theme === 'dark' ? 'bg-[#121213] border-stone-850 text-stone-100 placeholder-stone-600' : 'bg-slate-50 border-slate-150 text-slate-800'
                  }`}
                />
                {plSearchQuery && (
                  <button
                    onClick={() => setPlSearchQuery('')}
                    className="absolute left-2.5 top-2.5 text-slate-400 hover:text-rose-500 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Live search results */}
              {plSearchQuery && (
                <div className={`border rounded-2xl max-h-48 overflow-y-auto divide-y text-right scrollbar-thin text-xs animate-fade-in ${
                  theme === 'dark' ? 'bg-stone-950 border-stone-800 divide-stone-850' : 'bg-white border-slate-150 divide-slate-100'
                }`}>
                  {filteredSearchProds.length === 0 ? (
                    <div className="p-3 text-center text-slate-400">{lang === 'ar' ? '⚠️ لا توجد نتائج مطابقة' : 'No matches'}</div>
                  ) : (
                    filteredSearchProds.map(prod => (
                      <div 
                        key={prod.id}
                        onClick={() => handleAddProductToLabels(prod)}
                        className={`p-2.5 flex items-center justify-between cursor-pointer transition ${
                          theme === 'dark' ? 'hover:bg-stone-900 text-stone-200' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="text-[10px] font-mono text-slate-400">({prod.barcode || 'بلا كود'})</span>
                        <div className="text-right">
                          <span className="font-bold block">{prod.name}</span>
                          <span className="text-emerald-600 block text-[10px] font-semibold">${prod.priceUSD.toFixed(2)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Count Queue / Header selection list */}
              <div className="flex items-center justify-between text-xs pb-1 border-b border-light/10">
                {plSelectedProducts.length > 0 && (
                  <button
                    onClick={() => {
                      setPlSelectedProducts([]);
                      showToast('success', lang === 'ar' ? '🗑️ تم إفراغ طابور السلع!' : 'Queue cleared!');
                    }}
                    className="text-rose-500 hover:text-rose-600 font-bold hover:underline cursor-pointer"
                  >
                    {lang === 'ar' ? 'تفريغ القائمة' : 'Clear List'}
                  </button>
                )}
                <span className={`text-[10px] font-bold ${theme === 'dark' ? 'text-stone-400' : 'text-slate-500'}`}>
                  {lang === 'ar' 
                    ? `المنتجات المحددة: (${plSelectedProducts.length}) صنف` 
                    : `Selected Queue: (${plSelectedProducts.length})`}
                </span>
              </div>

              {/* Selected items list */}
              {plSelectedProducts.length === 0 ? (
                <div className="bg-amber-950/25 border border-dashed border-amber-800/40 rounded-2xl p-4 text-center">
                  <span className="text-[11px] text-amber-500 font-extrabold block">🚨 طابور طباعة السلع فارغ تماماً</span>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    {lang === 'ar' 
                      ? 'سيقوم البرنامج بإنتاج وطباعة ملصق واحد (1x) لكل منتج مخزن في النظام تلقائياً لتسهيل عرض الكتالوج بالكامل.' 
                      : 'The system will generate and show one (1x) copy of all products currently saved in your database.'}
                  </p>
                </div>
              ) : (
                <div className={`space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin`}>
                  {plSelectedProducts.map(item => {
                    const prod = products.find(x => x.id === item.productId);
                    if (!prod) return null;
                    return (
                      <div 
                        key={item.productId}
                        className={`p-2 rounded-xl flex items-center justify-between border text-right text-xs leading-none ${
                          theme === 'dark' ? 'bg-stone-900/60 border-stone-850' : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        {/* Delete btn */}
                        <button
                          onClick={() => {
                            setPlSelectedProducts(plSelectedProducts.filter(x => x.productId !== item.productId));
                            showToast('success', lang === 'ar' ? '✓ تم إزالة الصنف من القائمة' : 'Removed from list');
                          }}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded-lg"
                          title="إزالة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Qty controls */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setPlSelectedProducts(plSelectedProducts.map(x => x.productId === item.productId ? { ...x, qty: x.qty + 1 } : x));
                            }}
                            className="w-5 h-5 rounded-md bg-[#1D9E75] text-white flex items-center justify-center font-bold text-xs"
                          >
                            +
                          </button>
                          <span className="w-7 text-center font-bold font-mono text-xs">{item.qty}</span>
                          <button
                            onClick={() => {
                              const nextQty = Math.max(1, item.qty - 1);
                              setPlSelectedProducts(plSelectedProducts.map(x => x.productId === item.productId ? { ...x, qty: nextQty } : x));
                            }}
                            className="w-5 h-5 rounded-md bg-rose-500 text-white flex items-center justify-center font-bold text-xs"
                          >
                            -
                          </button>
                        </div>

                        {/* Info */}
                        <div className="text-right flex-1 pr-3">
                          <span className="font-extrabold text-xs block text-slate-800 dark:text-stone-250 truncate max-w-[130px]">{prod.name}</span>
                          <span className="text-[10px] font-black text-emerald-600 block mt-0.5">${prod.priceUSD.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
            )}
          </div>
        </div>

        </div>

        {/* PREVIEW CONTAINER & PRINT SHEETS CANVAS (Spans 8 columns on xl) */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* TOP ACTION STRIP */}
          <div className={`p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 border ${
            theme === 'dark' ? 'bg-[#18181b] border-stone-800' : 'bg-white border-slate-200'
          }`}>
            
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1D9E75] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1D9E75]"></span>
              </span>
              <span className={`text-[11px] font-black ${theme === 'dark' ? 'text-stone-300' : 'text-slate-650'}`}>
                {lang === 'ar' 
                  ? `لوحة معاينة المستند: تم التوليد لعدد [${finalRenderLabels.length}] بطاقة لاصقة` 
                  : `Sheet Preview: Generated [${finalRenderLabels.length}] sticky barcode tags`}
              </span>
            </div>

            {/* Main Print Trigger button */}
            <button
              onClick={triggerBatchPrint}
              className="w-full sm:w-auto bg-[#1D9E75] hover:bg-emerald-600 text-white font-black px-6 py-2.5 rounded-2xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-700/10"
            >
              <Printer className="w-4 h-4 text-emerald-100" />
              <span>{lang === 'ar' ? 'طباعة بطاقات الأسعار مجمعة (PDF/طباعة) 🖨️' : 'Print All Price tags (PDF/Direct) 🖨️'}</span>
            </button>
          </div>

          {/* LIVE VIEW SHEET PREVIEW GRID CANVAS */}
          <div className={`p-6 rounded-3xl border flex flex-col items-center overflow-x-auto min-h-[500px] shadow-xs select-none ${
            theme === 'dark' ? 'bg-stone-900/40 border-stone-850' : 'bg-slate-100/60 border-slate-150'
          }`}>
            
            <span className="text-slate-400 dark:text-stone-500 text-[10px] font-bold block mb-4 text-center uppercase tracking-wider">
              {lang === 'ar' 
                ? '👇 المظهر الحقيقي لورقة الطباعة / رول الملصقات النهائي' 
                : '👇 Actual visual layout sheet layout matching print size'}
            </span>

            {/* Printable Outer Container / Emulating standard paper size sheets */}
            <div 
              id="price-labels-print-area"
              className="bg-white text-black transition rounded-2xl shadow-xl flex-shrink-0 relative overflow-hidden" 
              style={{
                width: plPaperSize === 'A4' ? '210mm' : `${plPageWidth}mm`,
                minHeight: plPaperSize === 'A4' ? '297mm' : plIsContinuousRoll ? 'auto' : `${plPageHeight}mm`,
                height: 'auto',
                boxSizing: 'border-box'
              }}
            >
              {/* CSS grid of labels inside the sheet */}
              <div 
                className="pl-print-grid w-full h-full"
                style={{
                  boxSizing: 'border-box',
                  display: 'grid',
                  gridTemplateColumns: `repeat(${plColumns}, minmax(0, 1fr))`,
                  columnGap: `${plColSpacing}mm`,
                  rowGap: `${plRowSpacing}mm`,
                  paddingTop: `${plMarginTop}mm`,
                  paddingBottom: `${plMarginBottom}mm`,
                  paddingLeft: `${plMarginLeft}mm`,
                  paddingRight: `${plMarginRight}mm`,
                  backgroundColor: 'white'
                }}
              >
                {finalRenderLabels.map((p, idx) => {
                  const computedPriceLBP = p.priceUSD * (settings.exchangeRate || 89500);
                  return (
                    <div
                      key={`${p.id}-${idx}`}
                      className="pl-print-card font-sans text-center relative flex flex-col items-center justify-center bg-white text-black"
                      style={{
                        width: `${plLabelWidth}mm`,
                        height: `${plLabelHeight}mm`,
                        boxSizing: 'border-box',
                        padding: '1.5mm',
                        margin: '0',
                        overflow: 'hidden',
                        border: plShowBorders ? '1px solid #ddd' : 'none',
                        borderRadius: plShowBorders ? '4px' : '0'
                      }}
                    >
                      {/* Shop Name header */}
                      <div className="text-[8px] font-black tracking-wider text-slate-500 uppercase border-b border-dashed border-slate-200 w-full mb-0.5 truncate flex justify-center leading-none">
                        {settings.shopName || 'MY SHOP'}
                      </div>

                      {/* Product Name block */}
                      {plShowName && (
                        <div 
                          style={{ fontSize: `${plNameSize}px` }}
                          className="font-extrabold text-slate-950 truncate w-full tracking-tight leading-tight px-1 uppercase"
                          title={p.name}
                        >
                          {p.name}
                        </div>
                      )}

                      {/* Barcode Stripes drawing block */}
                      {plShowBarcode && p.barcode && (
                        <div 
                          style={{ height: `${plBarcodeHeightValue}px` }}
                          className="flex justify-center items-stretch bg-white px-2 py-0.5 select-none overflow-hidden max-w-full my-0.5"
                        >
                          {generateBarcodePattern(p.barcode || '').map((bit, codeIdx) => (
                            <div 
                              key={codeIdx} 
                              style={{ 
                                width: '2px', // Standard clear pixel thickness
                                backgroundColor: bit === '1' ? 'black' : 'white'
                              }}
                              className="h-full"
                            />
                          ))}
                        </div>
                      )}

                      {/* SKU Code Underneath */}
                      {plShowCode && p.barcode && (
                        <div className="font-mono text-[8px] font-bold tracking-[2px] text-slate-600 leading-tight">
                          *{p.barcode}*
                        </div>
                      )}

                      {/* Price block label */}
                      {plShowPrice && (
                        <div className="border-t border-dashed border-slate-200 mt-1 pt-1 w-full flex flex-col items-center justify-center leading-none">
                          <span 
                            style={{ fontSize: `${plPriceSize}px` }}
                            className="text-emerald-700 font-extrabold tracking-tighter"
                          >
                            $ {p.priceUSD.toFixed(2)}
                          </span>
                          <span className="text-[8px] font-bold text-slate-700 mt-0.5">
                            {Math.ceil(computedPriceLBP).toLocaleString()} L.L
                          </span>
                        </div>
                      )}

                      {/* Optional Tax Incl. banner */}
                      {plPriceIncludesTax && (
                        <div className="absolute top-1.5 left-1 text-[6px] font-extrabold bg-slate-100 dark:bg-stone-100 text-slate-500 rounded border border-slate-200 px-0.5 leading-none py-0.5 pointer-events-none scale-75 transform origin-top-left">
                          {lang === 'ar' ? 'شامل الضريبة' : 'VAT Incl.'}
                        </div>
                      )}

                      {/* Visual helpful Copy index on screen page */}
                      <div className="absolute right-0.5 bottom-0.5 text-[6px] text-slate-300 no-print pointer-events-none">
                        #{idx + 1}
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
