import { motion } from 'motion/react';
import { FileSpreadsheet, X, Download, Upload, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Product } from '../types';
import React from 'react';

interface ImportExcelModalProps {
  lang: "ar" | "en";
  setShowImportExcelModal: React.Dispatch<React.SetStateAction<boolean>>;
  importStatus: "error" | "idle" | "parsing" | "preview";
  setImportStatus: React.Dispatch<React.SetStateAction<"error" | "idle" | "parsing" | "preview">>;
  importError: string;
  parsedProducts: { product: Product; status: "new" | "update" | "invalid"; warning?: string; }[];
  setParsedProducts: React.Dispatch<React.SetStateAction<{ product: Product; status: "new" | "update" | "invalid"; warning?: string; }[]>>;
  updateExistingOnMatch: boolean;
  setUpdateExistingOnMatch: React.Dispatch<React.SetStateAction<boolean>>;
  downloadExcelTemplate: () => void;
  handleExcelImport: (file: File) => void;
  confirmExcelImport: () => void;
}

export function ImportExcelModal({
  lang,
  setShowImportExcelModal,
  importStatus,
  setImportStatus,
  importError,
  parsedProducts,
  setParsedProducts,
  updateExistingOnMatch,
  setUpdateExistingOnMatch,
  downloadExcelTemplate,
  handleExcelImport,
  confirmExcelImport,
}: ImportExcelModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex justify-center items-center p-4 md:p-8 z-50 overflow-y-auto animate-fade-in font-sans" id="excel-import-modal-container">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full p-6 shadow-2xl relative text-right font-sans my-auto flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-800 flex-row-reverse mb-4">
          <div className="flex items-center gap-2.5 flex-row-reverse">
            <div className="p-2.5 bg-sky-500/10 rounded-xl text-sky-400">
              <FileSpreadsheet className="w-5 h-5 animate-pulse" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              {lang === 'ar' ? 'استيراد أصناف من ملف Excel 📥' : 'Import Products from Excel Spreadsheet'}
            </h3>
          </div>
          <button 
            onClick={() => {
              setShowImportExcelModal(false);
              setImportStatus('idle');
              setParsedProducts([]);
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer border-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto pr-1 space-y-4 flex-1">
          {/* Instructions & Template Block */}
          {importStatus === 'idle' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-right flex-row-reverse">
              <div className="md:col-span-7 bg-slate-950/60 border border-slate-800/80 p-5 rounded-2xl text-xs space-y-3 text-slate-300">
                <p className="font-extrabold text-slate-100 text-sm flex items-center gap-1.5 flex-row-reverse">
                  <span>💡 دليل وإرشادات استيراد الأصناف السليم:</span>
                </p>
                <ul className="list-disc list-inside space-y-2 leading-relaxed pr-2 flex flex-col items-end">
                  <li className="list-none flex items-center gap-1 flex-row-reverse">
                    <span className="text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded font-bold font-mono">1</span>
                    <span>يجب أن يتضمن ملف الإكسيل رأس الأعمدة في السجل/السطر الأول للمطابقة الذكية.</span>
                  </li>
                  <li className="list-none flex items-center gap-1 flex-row-reverse">
                    <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-bold font-mono">2</span>
                    <span><strong>اسم المنتج / الصنف:</strong> حقل إلزامي أساسي بدون كتابته لن يتم استيراد السطر.</span>
                  </li>
                  <li className="list-none flex items-center gap-1 flex-row-reverse">
                    <span className="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-bold font-mono">3</span>
                    <span><strong>الباركود:</strong> حقل اختياري. إذا تركته فارغاً سيقوم السوبرماركت بتوليد باركود فريد تلقائياً.</span>
                  </li>
                  <li className="list-none flex items-center gap-1 flex-row-reverse">
                    <span className="text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded font-bold font-mono">4</span>
                    <span><strong>التصنيف:</strong> إذا كان اسم الفئة أو التصنيف المسجل بالملف جديداً، سيقوم النظام بتسجيله فوراً كذلك!</span>
                  </li>
                  <li className="list-none flex items-center gap-1 flex-row-reverse">
                    <span className="text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded font-bold font-mono">5</span>
                    <span><strong>الأسعار والكمية:</strong> يُفضل صياغتها كقيم رقمية نقية خالية من الرموز والعملات (مثال: <code className="font-mono text-emerald-400 font-bold">12.5</code>).</span>
                  </li>
                  <li className="list-none flex items-center gap-1 flex-row-reverse">
                    <span className="text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded font-bold font-mono">6</span>
                    <span><strong>تاريخ الصلاحية:</strong> يفضل تنسيقه كـ <code className="font-mono bg-slate-800 text-pink-300 font-black px-1 rounded">YYYY-MM-DD</code> (مثال: <code className="font-mono text-pink-300">2026-10-25</code>).</span>
                  </li>
                </ul>

                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={downloadExcelTemplate}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-lg font-black text-xs py-2.5 px-4 rounded-xl transition cursor-pointer flex items-center gap-1.5 border-none"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل القالب الاسترشادي الجاهز (Excel Template)</span>
                  </button>
                  <span className="text-[11px] text-slate-400">للحصول على تماثل وهيكل سليم للبيانات</span>
                </div>
              </div>

              <div className="md:col-span-5 flex flex-col justify-between bg-slate-950/20 border border-slate-800/80 p-5 rounded-2xl space-y-4">
                <div className="space-y-2">
                  <span className="block font-extrabold text-slate-100 text-xs">🛠️ خيارات المطابقة والتحديث التلقائي:</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    ماذا تريد أن يحدث عندما يتطابق باركود في ملف الإكسل مع باركود منتج تم تسجيله وحفظه مسبقاً بالنظام؟
                  </p>
                  <label className="flex items-center gap-2.5 cursor-pointer bg-slate-900 p-3 rounded-xl border border-slate-800 hover:border-slate-750 transition flex-row-reverse text-right select-none">
                    <input 
                      type="checkbox"
                      checked={updateExistingOnMatch}
                      onChange={(e) => setUpdateExistingOnMatch(e.target.checked)}
                      className="accent-[#1D9E75] w-4 h-4 cursor-pointer"
                    />
                    <div className="flex-1 text-right">
                      <span className="block font-black text-xs text-white">تحديث وتجاوز بيانات الصنف الحالي</span>
                      <span className="text-[10px] text-slate-500 block font-normal mt-0.5">سيتم استبدال سعر البيع، التكلفة، والكمية بما هو مكتوب بالملف</span>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-sky-500/30 hover:border-sky-500 bg-sky-500/5 hover:bg-sky-500/10 p-6 rounded-2xl cursor-pointer transition text-center group">
                    <Upload className="w-9 h-9 text-sky-400 group-hover:scale-110 transition mb-2" />
                    <span className="font-extrabold text-xs text-white">اختر ملف Excel أو اسحبه وأفلته هنا</span>
                    <span className="text-[10px] text-slate-500 mt-1 font-mono">(.xlsx, .xls, .csv)</span>
                    <input 
                      type="file" 
                      accept=".xlsx, .xls, .csv" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleExcelImport(file);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {importStatus === 'parsing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <RefreshCw className="w-12 h-12 text-[#1D9E75] animate-spin" />
              <div className="space-y-1">
                <h4 className="font-extrabold text-white text-sm">جاري قراءة وتحليل بيانات جدول الإكسيل...</h4>
                <p className="text-xs text-slate-400">نقوم بفحص أسماء ومطابقة الأعمدة والتحقق الصارم من صحة البيانات</p>
              </div>
            </div>
          )}

          {importStatus === 'error' && (
            <div className="bg-red-950/20 border border-red-800/80 p-5 rounded-2xl text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
              <h4 className="font-extrabold text-red-200 text-sm">عفواً، لم نتمكن من تحليل هذا الملف بشكل دقيق!</h4>
              <p className="text-xs text-red-400 max-w-lg mx-auto leading-relaxed">
                قد يكون الملف فارغاً، أو لا تتوفر فيه ترويسات الأعمدة بالسطر الأول، أو يحتوي على ترميزات نص وبنى تالفة. يرجى مراجعة الخطأ التفصيلي أدناه.
              </p>
              <div className="bg-red-950/80 text-red-400 p-3 rounded-xl text-xs font-mono select-all inline-block border border-red-900">
                {importError}
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setImportStatus('idle')}
                  className="bg-slate-800 hover:bg-slate-750 text-white font-extrabold text-xs py-2 px-4 rounded-xl transition cursor-pointer border-none"
                >
                  المحاولة من جديد واختيار ملف آخر
                </button>
              </div>
            </div>
          )}

          {importStatus === 'preview' && (
            <div className="space-y-4">
              {/* Live summary stats badges */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-2xl text-center">
                  <span className="block text-slate-400 text-[10px] font-bold">إجمالي الأسطر الصالحة</span>
                  <span className="text-lg font-black text-white font-mono">{parsedProducts.length}</span>
                </div>
                <div className="bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-2xl text-center">
                  <span className="block text-emerald-400 text-[10px] font-bold">أصناف جديدة للتسجيل</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">
                    {parsedProducts.filter(p => p.status === 'new').length}
                  </span>
                </div>
                <div className="bg-amber-950/20 border border-amber-900/30 p-3 rounded-2xl text-center">
                  <span className="block text-amber-400 text-[10px] font-bold">أصناف للتحديث والدمج</span>
                  <span className="text-lg font-black text-amber-400 font-mono">
                    {parsedProducts.filter(p => p.status === 'update').length}
                  </span>
                </div>
                <div className="bg-red-950/20 border border-red-900/30 p-3 rounded-2xl text-center">
                  <span className="block text-red-400 text-[10px] font-bold">أسطر تالفة مستبعدة</span>
                  <span className="text-lg font-black text-red-400 font-mono">
                    {parsedProducts.filter(p => p.status === 'invalid').length}
                  </span>
                </div>
              </div>

              {/* Policy notify Banner */}
              <div className="bg-sky-950/20 border border-sky-900/60 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs flex-row-reverse text-right">
                <span className="text-sky-300 leading-normal font-medium">
                  ℹ️ سياسة الدمج مفعّلة: عند تطابق الباركود، سيقوم النظام بـ <strong className="text-white">{updateExistingOnMatch ? 'تحديث وتعديل' : 'تجاهل تخطي التحديث والاحتفاظ بالبيانات القديمة لـ'}</strong> الأصناف الحالية.
                </span>
                <button
                  type="button"
                  onClick={() => setUpdateExistingOnMatch(!updateExistingOnMatch)}
                  className="bg-slate-850 hover:bg-slate-800 text-white font-black text-[10px] py-1.5 px-3 rounded-lg transition cursor-pointer border-none"
                >
                  تغيير سياسة التعامل
                </button>
              </div>

              {/* Table preview */}
              <div className="border border-slate-800/80 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/70 text-slate-300 sticky top-0 border-b border-slate-800 font-sans">
                    <tr>
                      <th className="p-3 text-center">#</th>
                      <th className="p-3 text-right">صنف المنتج بالملف</th>
                      <th className="p-3 text-center">الباركود</th>
                      <th className="p-3 text-center">التصنيف</th>
                      <th className="p-3 text-center">سعر البيع retail</th>
                      <th className="p-3 text-center">سعر الجملة wholesale</th>
                      <th className="p-3 text-center">التكلفة cost</th>
                      <th className="p-3 text-center">الكمية المستوردة</th>
                      <th className="p-3 text-center">تاريخ الانتهاء</th>
                      <th className="p-3 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 font-sans">
                    {parsedProducts.map((item, idx) => (
                      <tr 
                        key={idx} 
                        className={`hover:bg-slate-850/50 transition-colors ${item.status === 'invalid' ? 'bg-red-950/5 text-slate-500' : 'text-slate-250 bg-slate-900/40'}`}
                      >
                        <td className="p-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                        <td className="p-3 text-right font-extrabold truncate max-w-[210px]" title={item.product.name}>
                          {item.product.name}
                        </td>
                        <td className="p-3 text-center font-mono">
                          {item.product.barcode ? (
                            <span className="text-slate-300">{item.product.barcode}</span>
                          ) : (
                            <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                              توليد عشوائي ⚡
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] font-sans">
                            {item.product.category || 'عام'}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-[#1D9E75] font-mono">${item.product.priceUSD.toFixed(2)}</td>
                        <td className="p-3 text-center text-slate-400 font-mono">
                          {item.product.priceWholesale !== undefined ? `$${item.product.priceWholesale.toFixed(2)}` : '-'}
                        </td>
                        <td className="p-3 text-center text-slate-400 font-mono">
                          {item.product.costPriceUSD !== undefined ? `$${item.product.costPriceUSD.toFixed(2)}` : '-'}
                        </td>
                        <td className="p-3 text-center font-black font-mono text-white">{item.product.quantity}</td>
                        <td className="p-3 text-center font-mono text-slate-400">{item.product.expiryDate || '-'}</td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {item.status === 'new' && (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black px-2 py-0.5 rounded text-[10px]">
                              جديد
                            </span>
                          )}
                          {item.status === 'update' && (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black px-2 py-0.5 rounded text-[10px]">
                              تحديث صلة
                            </span>
                          )}
                          {item.status === 'invalid' && (
                            <span className="bg-red-500/10 text-red-400 border border-red-500/20 font-black px-2 py-0.5 rounded text-[10px]" title={item.warning}>
                              خطأ تالف
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions footer */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setImportStatus('idle');
                    setParsedProducts([]);
                  }}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer border-none"
                >
                  إلغاء واستبدال الملف دوت حفظ
                </button>

                <button
                  type="button"
                  onClick={confirmExcelImport}
                  className="bg-sky-600 hover:bg-sky-500 hover:shadow-sky-700/10 hover:shadow-lg text-white font-black text-xs py-2.5 px-6 rounded-xl transition cursor-pointer flex items-center gap-1.5 border-none"
                >
                  <CheckCircle2 className="w-4 h-4 animate-bounce" />
                  <span>تأكيد جلب السلع وتسجيل الفهرس ⚡</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
