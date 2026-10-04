import { motion } from 'motion/react';
import { Printer, Trash2, RefreshCw, MessageSquare } from 'lucide-react';
import { printElementViaIFrame } from '../lib/print';
import { Invoice, SystemSettings, Customer } from '../types';
import React, { useState } from 'react';
import { useStoredState } from '../lib/storage';

interface InvoiceReceiptModalProps {
  lang: "ar" | "en";
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  customers: Customer[];
  showInvoiceReceipt: Invoice;
  setShowInvoiceReceipt: React.Dispatch<React.SetStateAction<Invoice>>;
  showToast: (type: "success" | "error" | "warning", message: string) => void;
  openCashDrawer: () => Promise<void>;
  printInvoiceToRawHardware: (inv: any) => Promise<void>;
  handleCancelWholeInvoice: (inv: Invoice) => void;
  handleReturnSingleItem: (inv: Invoice, productId: string, qtyToReturn: number) => void;
}

export function InvoiceReceiptModal({
  lang,
  settings,
  setSettings,
  customers,
  showInvoiceReceipt,
  setShowInvoiceReceipt,
  showToast,
  openCashDrawer,
  printInvoiceToRawHardware,
  handleCancelWholeInvoice,
  handleReturnSingleItem,
}: InvoiceReceiptModalProps) {
  const [receiptPaperSize, setReceiptPaperSize] = useStoredState<'80mm' | '58mm' | 'a4' | 'a5'>('pos_receipt_paper_size', '80mm');
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [receiptTemplateStyle, setReceiptTemplateStyle] = useStoredState<'modern' | 'classic' | 'compact'>('pos_receipt_template_style', 'modern');
  const [showReceiptCashier, setShowReceiptCashier] = useStoredState<boolean>('pos_receipt_show_cashier', true);
  const [showReceiptCalculations, setShowReceiptCalculations] = useStoredState<boolean>('pos_receipt_show_calculations', true);
  const [showReceiptBarcode, setShowReceiptBarcode] = useStoredState<boolean>('pos_receipt_show_barcode', true);
  const [showReceiptFooter, setShowReceiptFooter] = useStoredState<boolean>('pos_receipt_show_footer', true);

  return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex justify-center items-start p-4 md:p-8 z-50 overflow-y-auto animate-fade-in font-sans" id="receipt-modal-container">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full p-6 shadow-2xl relative grid grid-cols-1 lg:grid-cols-12 gap-6 hover:border-emerald-500/20 transition-all text-right font-sans my-auto"
          >

            {/* Left Column: Controlling Options */}
            <div className="lg:col-span-5 space-y-4 text-right no-print overflow-y-auto max-h-[70vh] lg:max-h-none lg:h-0 lg:min-h-full pr-1">
              <div className="flex items-center gap-2 justify-end text-white pb-3 border-b border-slate-800 mb-4 h-fit">
                <span className="font-extrabold text-base">لوحة تنسيق وإعدادات الفاتورة</span>
                <Printer className="w-5 h-5 text-emerald-500" />
              </div>

              {/* Paper Size Control Selector */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/65 space-y-3">
                <label className="block text-slate-300 font-bold text-xs">📏 تحديد حجم ورق الطباعة المعياري:</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['80mm', '58mm', 'a4', 'a5'] as const).map(sz => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setReceiptPaperSize(sz)}
                      className={`py-2 px-1 rounded-xl border transition-all text-center font-black uppercase text-[10px] cursor-pointer ${
                        receiptPaperSize === sz ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Typography styling and spacing sliders */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/65 space-y-4">
                <span className="font-bold text-slate-350 block text-xs">🎨 التنسيق البصري وهوامش الطباعة:</span>

                {/* Font scale adjustment */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="font-mono text-emerald-400 font-bold">{settings.receiptFontSize !== undefined ? settings.receiptFontSize : 100}%</span>
                    <span className="text-slate-400">حجم خط الخطوط (Font Scale):</span>
                  </div>
                  <input
                    type="range"
                    min="70"
                    max="140"
                    step="5"
                    value={settings.receiptFontSize !== undefined ? settings.receiptFontSize : 100}
                    onChange={e => setSettings(prev => ({ ...prev, receiptFontSize: parseInt(e.target.value) }))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Margins */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="block text-slate-400 text-[10px] font-bold">الهامش العلوي (مم):</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={settings.receiptMarginTop !== undefined ? settings.receiptMarginTop : 4}
                      onChange={e => setSettings(prev => ({ ...prev, receiptMarginTop: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-1 px-2.5 text-center text-xs font-mono text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-400 text-[10px] font-bold">الهامش السفلي (مم):</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={settings.receiptMarginBottom !== undefined ? settings.receiptMarginBottom : 4}
                      onChange={e => setSettings(prev => ({ ...prev, receiptMarginBottom: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-1 px-2.5 text-center text-xs font-mono text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-400 text-[10px] font-bold">الهامش الأيمن (مم):</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={settings.receiptMarginRight !== undefined ? settings.receiptMarginRight : 4}
                      onChange={e => setSettings(prev => ({ ...prev, receiptMarginRight: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-1 px-2.5 text-center text-xs font-mono text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-400 text-[10px] font-bold">الهامش الأيسر (مم):</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={settings.receiptMarginLeft !== undefined ? settings.receiptMarginLeft : 4}
                      onChange={e => setSettings(prev => ({ ...prev, receiptMarginLeft: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-1 px-2.5 text-center text-xs font-mono text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Visibility toggles */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/65 space-y-2.5">
                <span className="font-bold text-slate-350 block text-xs">👁️ إخفاء وإظهار مكونات الفاتورة:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReceiptCashier(!showReceiptCashier)}
                    className={`py-1.5 px-2 rounded-xl border transition-all text-center flex items-center justify-between cursor-pointer text-[10px] font-bold ${
                      showReceiptCashier ? 'bg-slate-900 text-emerald-400 border-slate-700 shadow-sm' : 'bg-slate-900/40 text-slate-500 border-slate-800'
                    }`}
                  >
                    <span>اسم الكاشير بائع</span>
                    <span>{showReceiptCashier ? '✔' : '✖'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowReceiptCalculations(!showReceiptCalculations)}
                    className={`py-1.5 px-2 rounded-xl border transition-all text-center flex items-center justify-between cursor-pointer text-[10px] font-bold ${
                      showReceiptCalculations ? 'bg-slate-900 text-emerald-400 border-slate-700 shadow-sm' : 'bg-slate-900/40 text-slate-500 border-slate-800'
                    }`}
                  >
                    <span>تفاصيل المدفوع</span>
                    <span>{showReceiptCalculations ? '✔' : '✖'}</span>
                  </button>
                </div>
              </div>

              {/* Cancel & Return Controls (no-print) */}
              <div className="no-print bg-slate-950 p-4 rounded-xl border border-rose-900/50 space-y-3 text-right font-sans w-full">
                <div className="flex justify-between items-center text-rose-400">
                  <span className="font-bold text-xs flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>إلغاء الفواتير وإرجاع الأصناف</span>
                  </span>
                  {showInvoiceReceipt.totalUSD <= 0 && (
                    <span className="bg-rose-500/15 py-0.5 px-2 text-[9px] font-black rounded text-rose-300 border border-rose-500/20">ملغاة تماماً ✖</span>
                  )}
                </div>

                {showInvoiceReceipt.totalUSD <= 0 ? (
                  <p className="text-[10px] text-slate-400 bg-rose-950/20 p-2.5 rounded-lg border border-rose-900/25 leading-relaxed">
                    ⚠️ هذه الفاتورة تم إلغاؤها وتصفيرها بالكامل مسبقاً، وتم إرجاع جميع أصنافها إلى جرد المستودع العام تلقائياً ولا توجد كميات متبقية للارتجاع.
                  </p>
                ) : (
                  <div className="space-y-3.5">
                    <button
                      type="button"
                      onClick={() => handleCancelWholeInvoice(showInvoiceReceipt)}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-2 px-3 rounded-lg text-[11px] transition duration-150 flex items-center justify-center gap-2 cursor-pointer border border-rose-500 shadow-md shadow-rose-950/20"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>إلغاء الفاتورة بالكامل وإرجاع المخزون</span>
                    </button>

                    <div className="border-t border-slate-900/60 pt-3 space-y-2">
                      <span className="text-[10px] font-bold text-slate-350 block">🔄 إرجاع صنف واحد مع اختيار الكمية:</span>
                      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                        {showInvoiceReceipt.items.filter(itm => (itm.quantity - (itm.returnedQty || 0)) > 0).map((itm, idx) => {
                          const maxAvailable = itm.quantity - (itm.returnedQty || 0);
                          const selectedQty = returnQtys[`${showInvoiceReceipt.id}-${itm.productId}`] || 1;
                          return (
                            <div key={idx} className="bg-slate-900/40 p-2 rounded-xl border border-slate-800 flex flex-col gap-2">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-white font-black truncate max-w-[120px]">{itm.productName}</span>
                                <span className="text-emerald-400 font-mono">({maxAvailable} متبقي)</span>
                              </div>
                              <div className="flex items-center gap-1.5 justify-between">
                                <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-800">
                                  <button
                                    type="button"
                                    onClick={() => setReturnQtys(prev => ({
                                      ...prev,
                                      [`${showInvoiceReceipt.id}-${itm.productId}`]: Math.max(1, selectedQty - 1)
                                    }))}
                                    className="text-slate-400 hover:text-white px-1.5 text-xs font-bold font-mono cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    max={maxAvailable}
                                    value={selectedQty}
                                    onChange={e => {
                                      const val = Math.min(maxAvailable, Math.max(1, parseInt(e.target.value) || 1));
                                      setReturnQtys(prev => ({
                                        ...prev,
                                        [`${showInvoiceReceipt.id}-${itm.productId}`]: val
                                      }));
                                    }}
                                    className="w-10 bg-transparent text-center font-mono text-[10px] text-white focus:outline-none focus:ring-0 border-none p-0"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setReturnQtys(prev => ({
                                      ...prev,
                                      [`${showInvoiceReceipt.id}-${itm.productId}`]: Math.min(maxAvailable, selectedQty + 1)
                                    }))}
                                    className="text-slate-400 hover:text-white px-1.5 text-xs font-bold font-mono cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleReturnSingleItem(showInvoiceReceipt, itm.productId, selectedQty)}
                                  className="bg-slate-800 hover:bg-slate-750 hover:text-emerald-400 border border-slate-700 text-slate-300 font-bold py-1 px-2.5 rounded-lg text-[9px] transition cursor-pointer flex items-center gap-1"
                                >
                                  <RefreshCw className="w-3 h-3 text-emerald-400" />
                                  <span>إرجاع الصنف</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {showInvoiceReceipt.items.filter(itm => (itm.quantity - (itm.returnedQty || 0)) > 0).length === 0 && (
                          <p className="text-[9px] text-center text-slate-400 py-2">جميع الأصناف تم ترجيعها بالكامل.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Offline Export utility / backup tools (no-print) */}
              <div className="no-print bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 space-y-2 text-right font-sans w-full">
                <span className="font-bold text-purple-400 block text-xs"> أدوات وتصدير الفاتورة :</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const linkedCust = customers.find(c => c.id === showInvoiceReceipt.customerId);
                      const custName = linkedCust ? linkedCust.name : (lang === 'ar' ? 'زبون نقدي' : 'Cash Customer');
                      let txt = `====================================\n`;
                      txt += `        ${settings.shopName}        \n`;
                      if (settings.phone?.trim()) txt += `هاتف: ${settings.phone}\n`;
                      if (settings.address?.trim()) txt += `${settings.address}\n`;
                      txt += `====================================\n`;
                      txt += `رقم الفاتورة: ${showInvoiceReceipt.invoiceNumber}\n`;
                      txt += `التاريخ: ${showInvoiceReceipt.date} | ${showInvoiceReceipt.time}\n`;
                      txt += `الزبون: ${custName}\n`;
                      if (showReceiptCashier) {
                        txt += `البائع الكاشير: ${showInvoiceReceipt.cashier}\n`;
                      }
                      txt += `وسيلة الدفع: ${showInvoiceReceipt.paymentMethod === 'cash' ? 'كاش' : showInvoiceReceipt.paymentMethod === 'debt' ? 'دين' : 'بطاقة'}\n`;
                      txt += `------------------------------------\n`;
                      showInvoiceReceipt.items.forEach(itm => {
                        txt += `• ${itm.productName} (×${itm.quantity}) = ${itm.totalUSD.toFixed(1)}$\n`;
                      });
                      txt += `------------------------------------\n`;
                      txt += `المجموع الفرعي: ${showInvoiceReceipt.subtotalUSD.toFixed(2)}$\n`;
                      if (showInvoiceReceipt.discountUSD > 0) {
                        txt += `الخصم: -${showInvoiceReceipt.discountUSD.toFixed(2)}$\n`;
                      }
                      txt += `المطلوب النهائي: ${showInvoiceReceipt.totalUSD.toFixed(2)}$\n`;
                      txt += `المطلوب النهائي بالليرة: ${Math.ceil(showInvoiceReceipt.totalLBP).toLocaleString()} ل.ل\n`;
                      if (showReceiptCalculations) {
                        txt += `------------------------------------\n`;
                        txt += `صرف الدولار المعتمد: ${showInvoiceReceipt.exchangeRate.toLocaleString()} ل.ل\n`;
                        txt += `المدفوع دولار: ${(showInvoiceReceipt.paidAmountUSD || 0).toFixed(2)}$\n`;
                        txt += `المدفوع ليرة: ${Math.ceil(showInvoiceReceipt.paidAmountLBP || 0).toLocaleString()} ل.ل\n`;
                        txt += `المسترجع ليرة: ${Math.ceil(showInvoiceReceipt.changeAmountLBP || 0).toLocaleString()} ل.ل\n`;
                      }
                      if (showReceiptFooter) {
                        txt += `------------------------------------\n`;
                        txt += `${settings.receiptFooter}\n`;
                      }
                      txt += `====================================`;

                      navigator.clipboard.writeText(txt).then(() => {
                        showToast('success', 'تم نسخ نص الفاتورة بالكامل بنجاح إلى الحافظة! جاهز للصق في أي تطبيق.');
                      }).catch(() => {
                        showToast('error', 'فشل نسخ النص، يرجى المحاولة لاحقاً');
                      });
                    }}
                    className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2 rounded-xl transition text-[10px] flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    <span>نسخ الفاتورة كنص ذكي 📋</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const linkedCust = customers.find(c => c.id === showInvoiceReceipt.customerId);
                      const custName = linkedCust ? linkedCust.name : (lang === 'ar' ? 'زبون نقدي' : 'Cash Customer');

                      let txt = `====================================\n`;
                      txt += `        ${settings.shopName}        \n`;
                      if (settings.phone?.trim()) txt += `هاتف: ${settings.phone}\n`;
                      if (settings.address?.trim()) txt += `${settings.address}\n`;
                      txt += `====================================\n`;
                      txt += `رقم الفاتورة: ${showInvoiceReceipt.invoiceNumber}\n`;
                      txt += `التاريخ: ${showInvoiceReceipt.date} | ${showInvoiceReceipt.time}\n`;
                      txt += `الزبون: ${custName}\n`;
                      txt += `------------------------------------\n`;
                      showInvoiceReceipt.items.forEach(itm => {
                        txt += `${itm.productName} [×${itm.quantity}] = ${itm.totalUSD.toFixed(1)}$\n`;
                      });
                      txt += `------------------------------------\n`;
                      txt += `المطلوب للدفع بالتسوية: ${showInvoiceReceipt.totalUSD.toFixed(2)}$ / ${Math.ceil(showInvoiceReceipt.totalLBP).toLocaleString()} ل.ل\n`;
                      txt += `سعر الصرف: ${showInvoiceReceipt.exchangeRate.toLocaleString()} ل.ل\n`;

                      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `invoice-${showInvoiceReceipt.invoiceNumber}.txt`;
                      link.click();
                      URL.revokeObjectURL(url);
                      showToast('success', 'تم تحميل ملف التصدير الاحتياطي للفاتورة بنجاح!');
                    }}
                    className="bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold py-2 rounded-xl transition text-[10px] flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    <span>تصدير كملف (.txt) 💾</span>
                  </button>
                </div>
              </div>

              {/* WhatsApp Integration Module */}
              <div className="bg-slate-800 p-3.5 rounded-2xl space-y-2 text-right text-xs no-print border border-slate-700 font-sans w-full">
                <span className="font-bold text-emerald-400 block">💬 إرسال الفاتورة عبر WhatsApp للزبون:</span>
                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => {
                      const phoneInput = document.getElementById('wa-client-phone') as HTMLInputElement;
                      const phone = phoneInput ? phoneInput.value.replace(/[^0-9]/g, '') : '';
                      if (!phone) {
                        showToast('warning', 'الرجاء إدخال رقم هاتف الزبون أولاً لإرسال الرسالة!');
                        return;
                      }

                      const linkedCust = customers.find(c => c.id === showInvoiceReceipt.customerId);
                      const custName = linkedCust ? linkedCust.name : (lang === 'ar' ? 'زبون نقدي' : 'Cash Customer');
                      const creditBalanceUSD = linkedCust ? (linkedCust.creditBalance || 0) : 0;
                      const creditBalanceLBP = creditBalanceUSD * settings.exchangeRate;

                      let text = `*فاتورة مبيعات من ${settings.shopName}*\n`;
                      text += `*الزبون:* ${custName}\n`;
                      if (creditBalanceUSD > 0) {
                        text += `*رصيد الدين الإجمالي للزبون:* ${creditBalanceUSD.toFixed(2)}$ / ${Math.ceil(creditBalanceLBP).toLocaleString()} ل.ل\n`;
                      }
                      text += `*رقم الفاتورة:* ${showInvoiceReceipt.invoiceNumber}\n`;
                      text += `*التاريخ:* ${showInvoiceReceipt.date} | ${showInvoiceReceipt.time}\n`;
                      if (showReceiptCashier) {
                        text += `*الكاشير:* ${showInvoiceReceipt.cashier}\n`;
                      }
                      text += `------------------------------------\n`;
                      showInvoiceReceipt.items.forEach(itm => {
                        text += `• ${itm.productName} (الكمية: ${itm.quantity}) = ${itm.totalUSD.toFixed(1)}$\n`;
                      });
                      text += `------------------------------------\n`;
                      if (showInvoiceReceipt.discountUSD > 0) {
                        text += `*المجموع الفرعي:* ${showInvoiceReceipt.subtotalUSD.toFixed(1)}$\n`;
                        text += `*الخصم المباشر:* ${showInvoiceReceipt.discountUSD.toFixed(1)}$\n`;
                      }
                      text += `*المطلوب النهائي:* ${showInvoiceReceipt.totalUSD.toFixed(1)}$ / ${Math.ceil(showInvoiceReceipt.totalLBP).toLocaleString()} ل.ل\n`;
                      if (showReceiptFooter) {
                        text += `------------------------------------\n`;
                        text += `*${settings.receiptFooter}*`;
                      }

                      const encoded = encodeURIComponent(text);
                      const link = `https://wa.me/${phone}?text=${encoded}`;
                      window.open(link, '_blank');
                      showToast('success', 'جاري توجيهك إلى واتساب لإرسال الفاتورة...');
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0 animate-pulse"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>إرسال</span>
                  </button>
                  <input
                    id="wa-client-phone"
                    type="text"
                    placeholder="مثال: 96170123456"
                    defaultValue={(() => {
                      const linkedCust = customers.find(c => c.id === showInvoiceReceipt.customerId);
                      return linkedCust ? linkedCust.phone : '';
                    })()}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-center font-mono text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

            </div>

            {/* Right Column: Live Thermal Paper View (lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-4 flex flex-col items-center">
            {/* Simulated physical thermal receipt paper roll */}
            <div className="relative bg-slate-950 p-6 rounded-3xl border border-slate-800/80 w-full max-w-md flex flex-col items-center overflow-hidden">

              {/* Visual Printer Mockup Head Block (No-Print) */}
              <div className="no-print w-[120%] -mt-6 bg-linear-to-b from-stone-800 via-stone-900 to-stone-950 h-10 border-b-4 border-stone-950 shadow-inner flex flex-col items-center justify-center relative select-none">
                <div className="w-24 h-1 bg-emerald-500/80 rounded-full animate-pulse shadow-sm shadow-emerald-500/50 mb-1"></div>
                <span className="font-mono text-[8.5px] text-stone-500 tracking-widest font-black uppercase">--- THERMAL FEED PRINTER ACTUATOR ---</span>
                {/* Metal razor jagged cutter visualization */}
                <div className="absolute -bottom-[2px] left-0 right-0 h-[3px] bg-stone-950 flex overflow-hidden">
                  {Array.from({ length: 65 }).map((_, i) => (
                    <div key={i} className="w-2 h-2 bg-stone-700 rotate-45 transform translate-y-0.5 shrink-0"></div>
                  ))}
                </div>
              </div>

              {/* Thermal sheet block with accurate on-screen live dynamic sizing */}
              <div className="w-full flex justify-center mt-6">
                <div 
                  id="thermal-paper-print"
                  className="bg-stone-50 text-stone-950 border border-stone-250 p-4 transition-all duration-300 relative font-sans shadow-lg select-all"
                  style={{
                    width: receiptPaperSize === '80mm' ? '100%' : receiptPaperSize === '58mm' ? '72.5%' : receiptPaperSize === 'a5' ? '92%' : '100%',
                    maxWidth: receiptPaperSize === '80mm' ? '302px' : receiptPaperSize === '58mm' ? '219px' : receiptPaperSize === 'a5' ? '410px' : '520px',
                    minHeight: '380px',
                    fontFamily: receiptTemplateStyle === 'classic' ? 'Courier New, monospace' : 'Cairo, Inter, sans-serif'
                  }}
                >
                  {/* Premium Branded Thermal Receipt Header Container */}
                  <div className="text-center font-sans space-y-1 block">
                    {settings.receiptLogoBase64 && (
                      <div className="flex justify-center mb-1.5 select-none no-print">
                        <img 
                          src={settings.receiptLogoBase64} 
                          alt="Shop logo monochrome" 
                          className="max-h-12 w-auto object-contain filter grayscale" 
                          style={{ maxHeight: '48px', maxWidth: '110px' }}
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    {/* Inline fallback for printers/PDF renderers */}
                    {settings.receiptLogoBase64 && (
                      <div className="hidden print:flex justify-center mb-1.5">
                        <img 
                          src={settings.receiptLogoBase64} 
                          alt="Shop logo print" 
                          className="max-h-12 w-auto object-contain filter grayscale"
                          style={{ maxHeight: '48px', maxWidth: '110px' }}
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <span className="font-black text-xs text-stone-900 bg-stone-250/80 px-2.5 py-0.5 rounded-full border border-stone-300 inline-block uppercase tracking-wider">
                      *** {receiptPaperSize === 'a4' || receiptPaperSize === 'a5' ? 'فاتورة بيع رسمية' : 'فاتورة مبيعات ممتازة'} ***
                    </span>
                    <h1 className="font-black text-rose-950 md:text-xl text-lg block leading-tight font-sans tracking-tight mt-1.5">
                      {settings.shopName}
                    </h1>
                    {settings.businessActivity?.trim() && (
                      <p className="font-bold text-[10.5px] text-stone-600 block">{settings.businessActivity}</p>
                    )}
                    {(settings.phone?.trim() || settings.address?.trim()) && (
                      <p className="text-[9.5px] text-stone-500 font-extrabold block">
                        {settings.phone?.trim() && <>هاتف: <span dir="ltr" className="font-mono">{settings.phone}</span></>}
                        {settings.phone?.trim() && settings.address?.trim() && ' | '}
                        {settings.address?.trim()}
                      </p>
                    )}
                    <div className="text-stone-300 text-[8px] my-1 block select-none">===================================</div>
                  </div>

                  {/* Receipt Details Box */}
                  <div className="space-y-1 block text-stone-700 bg-stone-100 p-2 rounded-lg border border-stone-250 font-sans text-right mt-2">
                    <div className="flex flex-row-reverse justify-between items-center text-[10px]">
                      <span dir="ltr" className="font-mono font-black text-stone-950">#{showInvoiceReceipt.invoiceNumber}</span>
                      <span className="font-extrabold text-stone-600">رقم الفاتورة:</span>
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center text-[10px]">
                      <span dir="ltr" className="font-mono text-stone-955">{showInvoiceReceipt.date} | {showInvoiceReceipt.time}</span>
                      <span className="text-stone-600">تاريخ ووقت المعاملة:</span>
                    </div>
                    {showReceiptCashier && (
                      <div className="flex flex-row-reverse justify-between items-center text-[10px]">
                        <span className="font-bold text-stone-950">{showInvoiceReceipt.cashier}</span>
                        <span className="text-stone-600">المستخدم الكاشير:</span>
                      </div>
                    )}
                    <div className="flex flex-row-reverse justify-between items-center text-[10px]">
                      <span className="font-bold text-stone-950 bg-stone-250 px-1.5 py-0.5 rounded text-[9px]">
                        {showInvoiceReceipt.paymentMethod === 'cash' ? 'كاش (Cash)' : showInvoiceReceipt.paymentMethod === 'debt' ? 'آجل (دين)' : 'بطاقة دفع'}
                      </span>
                      <span className="text-stone-600">طريقة السداد الماكينة:</span>
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center text-[10px] border-t border-stone-250 mt-1 pt-1">
                      <span dir="ltr" className="font-mono font-bold text-stone-905">{showInvoiceReceipt.exchangeRate.toLocaleString()} ل.ل</span>
                      <span className="text-stone-600">سعر الصرف المطبق:</span>
                    </div>
                  </div>

                  {/* Clean Products Table Header */}
                  <div className="grid grid-cols-12 gap-1 font-black text-stone-955 text-right border-y border-stone-400 py-1.5 mt-3 text-[10px] uppercase tracking-wider font-sans bg-stone-200/50 rounded">
                    <span className="col-span-6 text-right pr-1">الصنف والوصف</span>
                    <span className="col-span-2 text-center font-bold">الكمية</span>
                    <span className="col-span-2 text-left font-bold">السعر</span>
                    <span className="col-span-2 text-left pl-1 font-bold">المجموع</span>
                  </div>

                  {/* Receipt Items list with beautiful clean grid rows */}
                  <div className="space-y-1.5 text-stone-900 my-2 divide-y divide-dotted divide-stone-300 max-h-[160px] overflow-y-auto pr-1">
                    {showInvoiceReceipt.items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-1 text-right text-[10px] pt-1.5">
                        <span className="col-span-6 text-right font-black text-stone-955 truncate pr-0.5">{item.productName}</span>
                        <span className="col-span-2 text-center font-mono font-extrabold text-stone-850">×{item.quantity}</span>
                        <span className="col-span-2 text-left font-mono text-stone-700">${item.priceUSD.toFixed(1)}</span>
                        <span className="col-span-2 text-left font-mono font-black text-stone-955 pl-0.5">${(item.priceUSD * item.quantity).toFixed(1)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-dashed border-stone-400 pt-2 block"></div>

                  {/* premium styled invoice pricing summary */}
                  <div className="space-y-1 text-stone-900 text-right font-sans">
                    <div className="flex flex-row-reverse justify-between text-[11px]">
                      <span dir="ltr" className="font-mono font-bold text-stone-800">${showInvoiceReceipt.subtotalUSD.toFixed(2)}</span>
                      <span className="text-stone-600 font-bold">المجموع الفرعي الإجمالي:</span>
                    </div>
                    {showInvoiceReceipt.discountUSD > 0 && (
                      <div className="flex flex-row-reverse justify-between text-[11px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md animate-pulse">
                        <span dir="ltr" className="font-mono font-black">-${showInvoiceReceipt.discountUSD.toFixed(2)}</span>
                        <span>الخصم التسويقي الممنوح:</span>
                      </div>
                    )}

                    {/* Light styled total block */}
                    <div className="bg-stone-100 text-stone-955 rounded-xl p-3.5 my-2.5 space-y-1 text-right border-r-4 border-emerald-600 shadow-xs border border-stone-250 font-sans">
                      <div className="flex flex-row-reverse justify-between items-center">
                        <span dir="ltr" className="font-mono font-black text-base text-emerald-700">${showInvoiceReceipt.totalUSD.toFixed(2)}</span>
                        <span className="text-xs font-black tracking-wide text-stone-900">الصافي للدفع (دولار):</span>
                      </div>
                      <div className="flex flex-row-reverse justify-between items-center border-t border-stone-350 pt-1.5 mt-1">
                        <span dir="ltr" className="font-mono font-black text-base text-stone-955">{Math.ceil(showInvoiceReceipt.totalLBP).toLocaleString()} ل.ل</span>
                        <span className="text-xs font-black tracking-wide text-stone-900 font-bold">الصافي للدفع (ليرة):</span>
                      </div>
                    </div>
                  </div>

                  {/* DETAILED EXCHANGE BREAKDOWN BOX */}
                  {showReceiptCalculations && (
                    <div className="border rounded-xl p-2.5 mt-2.5 text-[10px] space-y-1 text-right bg-stone-100 border-stone-250 text-stone-700 font-sans">
                      <div className="font-black text-stone-905 border-b border-stone-300 pb-1 mb-1 text-center text-[10px] flex items-center justify-center gap-1">
                        <span>🔄 تفصيل المدفوعات ومطابقة الصرف</span>
                      </div>
                      <div className="flex flex-row-reverse justify-between font-bold leading-none text-stone-900">
                        <span dir="ltr" className="font-mono">1$ = {showInvoiceReceipt.exchangeRate.toLocaleString()} ل.ل</span>
                        <span className="text-stone-600">سعر الصرف لليوم:</span>
                      </div>
                      <div className="text-stone-300 text-[8px] my-0.5 text-center">-----------------------------------</div>
                      <div className="flex flex-row-reverse justify-between text-[10px] text-stone-700">
                        <span dir="ltr" className="font-mono text-stone-900">${showInvoiceReceipt.totalUSD.toFixed(2)}</span>
                        <span>قيمة الفاتورة بالدولار:</span>
                      </div>
                      <div className="flex flex-row-reverse justify-between text-[10px] text-stone-700">
                        <span dir="ltr" className="font-mono text-stone-900">{Math.ceil(showInvoiceReceipt.totalLBP).toLocaleString()} ل.ل</span>
                        <span>قيمة الفاتورة بالليرة:</span>
                      </div>
                      <div className="text-stone-300 text-[8px] my-0.5 text-center">-----------------------------------</div>
                      <div className="flex flex-row-reverse justify-between text-[10px]">
                        <span dir="ltr" className="font-mono text-stone-900">${(showInvoiceReceipt.paidAmountUSD || 0).toFixed(2)}</span>
                        <span>المدفوع نقداً بالدولار:</span>
                      </div>
                      <div className="flex flex-row-reverse justify-between text-[10px]">
                        <span dir="ltr" className="font-mono text-stone-900">{Math.ceil(showInvoiceReceipt.paidAmountLBP || 0).toLocaleString()} ل.ل</span>
                        <span>المدفوع نقداً بالليرة:</span>
                      </div>
                      <div className="flex flex-row-reverse justify-between font-extrabold text-stone-955 border-t border-stone-250 pt-1 mt-1">
                        <span dir="ltr" className="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded animate-pulse">
                          {((showInvoiceReceipt.paidAmountUSD || 0) + ((showInvoiceReceipt.paidAmountLBP || 0) / showInvoiceReceipt.exchangeRate)).toFixed(2)} $
                        </span>
                        <span>إجمالي المستلم الفعلي:</span>
                      </div>
                      <div className="text-stone-300 text-[8px] my-0.5 text-center">-----------------------------------</div>
                      <div className="flex flex-row-reverse justify-between font-black text-emerald-955 bg-emerald-100 px-2 py-1 rounded-lg text-[10.5px]">
                        <span dir="ltr" className="font-mono">{Math.ceil(showInvoiceReceipt.changeAmountLBP || 0).toLocaleString()} ل.ل</span>
                        <span>الباقي المسترجع للزبون:</span>
                      </div>
                      {showInvoiceReceipt.changeAmountUSD && showInvoiceReceipt.changeAmountUSD > 0 ? (
                        <div className="flex flex-row-reverse justify-between font-black text-emerald-955 bg-emerald-100 px-2 py-1 rounded-lg text-[10.5px] mt-0.5">
                          <span dir="ltr" className="font-mono">${showInvoiceReceipt.changeAmountUSD.toFixed(2)}</span>
                          <span>الباقي المسترجع بالدولار:</span>
                        </div>
                      ) : null}
                    </div>
                  )}



            {/* VISUAL BARCODE & QR CODE FOR INVOICE SCANNING / LOOKUP */}
            {showReceiptBarcode && (
              <div className="flex flex-col items-center justify-center my-4 pt-4 border-t border-dashed border-stone-300 animate-fade-in space-y-4">
                {/* Linear Barcode (Code 128) - Wide and Large for laser/CCD scanners */}
                <div className="flex flex-col items-center w-full">
                  <span className="text-[9px] text-stone-500 font-bold mb-1.5 block">باركود الفاتورة الضوئي (Code-128):</span>
                  <div className="bg-white p-2.5 rounded-xl border border-stone-250 shadow-xs flex items-center justify-center w-full max-w-[270px]">
                    <img 
                      src={`https://quickchart.io/barcode?type=code128&text=${encodeURIComponent(showInvoiceReceipt.invoiceNumber)}&width=320&height=75&includeText=false`}
                      alt="Invoice Barcode" 
                      className="w-full h-14 object-contain"
                      referrerPolicy="no-referrer"
                      loading="eager"
                    />
                  </div>
                  <div className="text-[10px] tracking-widest font-mono text-stone-900 font-extrabold mt-1 select-all text-center">
                    * {showInvoiceReceipt.invoiceNumber} *
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center pt-1 border-t border-dotted border-stone-200 w-full">
                  <span className="text-[9px] text-stone-500 font-bold mb-1.5 block">رمز الاستجابة (QR Code):</span>
                  <div className="p-2.5 bg-white rounded-xl border border-stone-250 shadow-xs flex items-center justify-center">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(showInvoiceReceipt.invoiceNumber)}&color=0c0a09&bgcolor=ffffff`}
                      alt="Invoice QR Code" 
                      className="w-24 h-24"
                      referrerPolicy="no-referrer"
                      loading="eager"
                    />
                  </div>
                </div>
              </div>
            )}

            {showReceiptFooter && (
              <>
                <div className="text-stone-300 text-[8px] pt-1 block text-center">-----------------------------------</div>
                <div className="text-center font-extrabold text-stone-505 text-[9.5px] block font-sans">
                  {settings.receiptFooter}
                </div>
              </>
            )}

            {/* Decorative Paper Zig-Zag Jagged Bottom Edge */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-stone-100/10 overflow-hidden z-25 flex">
              {Array.from({ length: 42 }).map((_, i) => (
                <div key={i} className="w-3.5 h-3.5 bg-slate-950 rotate-45 transform translate-y-0.5 shrink-0"></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      </div> {/* End lg:col-span-7 Right Column */}

        {/* Print trigger and exit buttons - STICKY FOOTER to keep always visible and easily accessible */}
        <div className="col-span-12 sticky bottom-[-24px] bg-slate-900 border-t border-slate-800/80 pt-4 pb-1.5 px-6 -mx-6 rounded-b-[22px] flex gap-2 text-xs font-sans z-30">
          <button 
            onClick={() => {
              let customPrintStyles = '';
              const scaleFactor = (settings.receiptFontSize !== undefined ? settings.receiptFontSize : 100) / 100;
              if (receiptPaperSize === '80mm') {
                customPrintStyles = `
                  body {
                    padding: 0 !important;
                    margin: 0 !important;
                    width: 80mm !important;
                    background: white !important;
                    color: black !important;
                  }
                  #thermal-paper-print {
                    background: white !important;
                    color: black !important;
                    width: 80mm !important;
                    max-width: 80mm !important;
                    padding-top: ${settings.receiptMarginTop !== undefined ? settings.receiptMarginTop : 4}mm !important;
                    padding-right: ${settings.receiptMarginRight !== undefined ? settings.receiptMarginRight : 4}mm !important;
                    padding-bottom: ${settings.receiptMarginBottom !== undefined ? settings.receiptMarginBottom : 4}mm !important;
                    padding-left: ${settings.receiptMarginLeft !== undefined ? settings.receiptMarginLeft : 4}mm !important;
                    margin: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    border-radius: 0 !important;
                    max-height: none !important;
                    overflow: visible !important;
                    box-sizing: border-box !important;
                    font-family: ${receiptTemplateStyle === 'classic' ? '"Courier New", monospace' : '"Cairo", "Inter", sans-serif'} !important;
                    transform-origin: top center !important;
                    transform: scale(min(1, calc(80mm / 100%))) !important;
                  }
                  /* Force print layout custom details styles with dynamic scale factor scaling */
                  #thermal-paper-print div, #thermal-paper-print span {
                    font-size: ${((receiptTemplateStyle === 'compact' ? 10 : 11) * scaleFactor).toFixed(1)}px !important;
                    line-height: ${receiptTemplateStyle === 'compact' ? '1.1' : '1.3'} !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                  @page {
                    size: 80mm auto;
                    margin: 0;
                  }
                `;
              } else if (receiptPaperSize === '58mm') {
                customPrintStyles = `
                  body {
                    padding: 0 !important;
                    margin: 0 !important;
                    width: 58mm !important;
                    background: white !important;
                    color: black !important;
                    font-family: ${receiptTemplateStyle === 'classic' ? '"Courier New", monospace' : '"Cairo", "Inter", sans-serif'} !important;
                  }
                  #thermal-paper-print {
                    background: white !important;
                    color: black !important;
                    width: 58mm !important;
                    max-width: 58mm !important;
                    padding-top: ${settings.receiptMarginTop !== undefined ? settings.receiptMarginTop : 4}mm !important;
                    padding-right: ${settings.receiptMarginRight !== undefined ? settings.receiptMarginRight : 4}mm !important;
                    padding-bottom: ${settings.receiptMarginBottom !== undefined ? settings.receiptMarginBottom : 4}mm !important;
                    padding-left: ${settings.receiptMarginLeft !== undefined ? settings.receiptMarginLeft : 4}mm !important;
                    margin: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    border-radius: 0 !important;
                    max-height: none !important;
                    overflow: visible !important;
                    box-sizing: border-box !important;
                    font-size: ${((receiptTemplateStyle === 'compact' ? 8.5 : 9.5) * scaleFactor).toFixed(1)}px !important;
                    transform-origin: top center !important;
                    transform: scale(min(1, calc(58mm / 100%))) !important;
                  }
                  /* Scaled text content & dividers with dynamic scale factor scaling */
                  #thermal-paper-print div, #thermal-paper-print span {
                    font-size: ${((receiptTemplateStyle === 'compact' ? 8.5 : 9.5) * scaleFactor).toFixed(1)}px !important;
                    line-height: ${receiptTemplateStyle === 'compact' ? '1.05' : '1.25'} !important;
                  }
                  #thermal-paper-print .text-xs, #thermal-paper-print .text-sm {
                    font-size: ${(9 * scaleFactor).toFixed(1)}px !important;
                  }
                  #thermal-paper-print .grid-cols-12 {
                    font-size: ${(8.5 * scaleFactor).toFixed(1)}px !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                  @page {
                    size: 58mm auto;
                    margin: 0;
                  }
                `;
              } else if (receiptPaperSize === 'a5') {
                customPrintStyles = `
                  body {
                    padding: 8mm 10mm !important;
                    background: white !important;
                    color: black !important;
                    font-family: 'Cairo', system-ui, sans-serif !important;
                  }
                  #thermal-paper-print {
                    background: white !important;
                    color: black !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    padding-top: ${settings.receiptMarginTop !== undefined ? settings.receiptMarginTop : 4}mm !important;
                    padding-right: ${settings.receiptMarginRight !== undefined ? settings.receiptMarginRight : 4}mm !important;
                    padding-bottom: ${settings.receiptMarginBottom !== undefined ? settings.receiptMarginBottom : 4}mm !important;
                    padding-left: ${settings.receiptMarginLeft !== undefined ? settings.receiptMarginLeft : 4}mm !important;
                    margin: 0 auto !important;
                    border: none !important;
                    box-shadow: none !important;
                    max-height: none !important;
                    overflow: visible !important;
                  }
                  #thermal-paper-print div, #thermal-paper-print span, #thermal-paper-print h3, #thermal-paper-print h4 {
                    font-size: 11px !important;
                    line-height: 1.4 !important;
                    color: #000000 !important;
                  }
                  #thermal-paper-print .font-bold {
                    font-weight: 700 !important;
                  }
                  #thermal-paper-print .text-sm, #thermal-paper-print .text-xs {
                    font-size: 10.5px !important;
                  }
                  #thermal-paper-print .text-slate-400 {
                    color: #475569 !important;
                  }
                  #thermal-paper-print .grid-cols-12 {
                    font-size: 10px !important;
                    border-bottom: 1px solid #cbd5e1 !important;
                    padding: 5px 3px !important;
                    display: grid !important;
                    align-items: center !important;
                  }
                  #thermal-paper-print .grid-cols-12.bg-stone-200\/50 {
                    background-color: #0f172a !important;
                    color: #ffffff !important;
                    border-radius: 6px !important;
                    padding: 7px 4px !important;
                  }
                  #thermal-paper-print .grid-cols-12.bg-stone-200\/50 span {
                    color: #ffffff !important;
                    font-weight: 900 !important;
                  }
                  #thermal-paper-print .max-h-\[160px\] {
                    max-height: none !important;
                    overflow: visible !important;
                  }
                  #thermal-paper-print .bg-stone-100 {
                    background-color: #f8fafc !important;
                    border: 1px solid #e2e8f0 !important;
                    padding: 10px !important;
                    border-radius: 8px !important;
                  }
                  #thermal-paper-print .border-emerald-600 {
                    border-right-width: 4px !important;
                    border-right-color: #10b981 !important;
                    background-color: #f0fdf4 !important;
                    border-top: 1px solid #bbf7d0 !important;
                    border-bottom: 1px solid #bbf7d0 !important;
                    border-left: 1px solid #bbf7d0 !important;
                    padding: 10px !important;
                  }
                  #thermal-paper-print .text-emerald-700 {
                    color: #15803d !important;
                    font-weight: 900 !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                  @page {
                    size: A5 portrait;
                    margin: 8mm 10mm;
                  }
                `;
              } else {
                customPrintStyles = `
                  body {
                    padding: 15mm 20mm !important;
                    background: white !important;
                    color: black !important;
                    font-family: 'Cairo', system-ui, sans-serif !important;
                  }
                  #thermal-paper-print {
                    background: white !important;
                    color: black !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    padding-top: ${settings.receiptMarginTop !== undefined ? settings.receiptMarginTop : 4}mm !important;
                    padding-right: ${settings.receiptMarginRight !== undefined ? settings.receiptMarginRight : 4}mm !important;
                    padding-bottom: ${settings.receiptMarginBottom !== undefined ? settings.receiptMarginBottom : 4}mm !important;
                    padding-left: ${settings.receiptMarginLeft !== undefined ? settings.receiptMarginLeft : 4}mm !important;
                    margin: 0 auto !important;
                    border: none !important;
                    box-shadow: none !important;
                    max-height: none !important;
                    overflow: visible !important;
                  }
                  #thermal-paper-print div, #thermal-paper-print span, #thermal-paper-print h3, #thermal-paper-print h4 {
                    font-size: 14px !important;
                    line-height: 1.5 !important;
                    color: #000000 !important;
                  }
                  #thermal-paper-print .font-bold {
                    font-weight: 700 !important;
                  }
                  #thermal-paper-print .text-sm, #thermal-paper-print .text-xs {
                    font-size: 13px !important;
                  }
                  #thermal-paper-print .text-slate-400 {
                    color: #475569 !important;
                  }
                  #thermal-paper-print .grid-cols-12 {
                    font-size: 13px !important;
                    border-bottom: 1px solid #cbd5e1 !important;
                    padding: 8px 4px !important;
                    display: grid !important;
                    align-items: center !important;
                  }
                  #thermal-paper-print .grid-cols-12.bg-stone-200\/50 {
                    background-color: #0f172a !important;
                    color: #ffffff !important;
                    border-radius: 8px !important;
                    padding: 10px 6px !important;
                  }
                  #thermal-paper-print .grid-cols-12.bg-stone-200\/50 span {
                    color: #ffffff !important;
                    font-weight: 900 !important;
                  }
                  #thermal-paper-print .max-h-\[160px\] {
                    max-height: none !important;
                    overflow: visible !important;
                  }
                  #thermal-paper-print .bg-stone-100 {
                    background-color: #f8fafc !important;
                    border: 1px solid #e2e8f0 !important;
                    padding: 16px !important;
                    border-radius: 12px !important;
                  }
                  #thermal-paper-print .border-emerald-600 {
                    border-right-width: 6px !important;
                    border-right-color: #10b981 !important;
                    background-color: #f0fdf4 !important;
                    border-top: 1px solid #bbf7d0 !important;
                    border-bottom: 1px solid #bbf7d0 !important;
                    border-left: 1px solid #bbf7d0 !important;
                    padding: 16px !important;
                  }
                  #thermal-paper-print .text-emerald-700 {
                    color: #15803d !important;
                    font-weight: 900 !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                  @page {
                    size: A4 portrait;
                    margin: 12mm 15mm;
                  }
                `;
              }
              // Will automatically perform direct silent print if configured, else manual print
              printElementViaIFrame('thermal-paper-print', customPrintStyles, false);
              // Fire automated physical drawer opening peak pulse
              openCashDrawer();
              // Fire direct hardware printer driver stream if configured for USB/Serial
              printInvoiceToRawHardware(showInvoiceReceipt);
            }}
            className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>{settings.directSilentPrint !== false ? 'طباعة تلقائية صامتة (فوري) ⚡' : 'طباعة الفاتورة 🖨️'}</span>
          </button>

          {settings.directSilentPrint !== false && (
            <button 
              onClick={() => {
                let customPrintStyles = '';
                if (settings.receiptFontSize !== undefined) {
                  customPrintStyles = `
                    #thermal-paper-print {
                      background: white !important;
                      color: black !important;
                      width: 100% !important;
                      max-width: 100% !important;
                      padding-top: ${settings.receiptMarginTop !== undefined ? settings.receiptMarginTop : 4}mm !important;
                      padding-right: ${settings.receiptMarginRight !== undefined ? settings.receiptMarginRight : 4}mm !important;
                      padding-bottom: ${settings.receiptMarginBottom !== undefined ? settings.receiptMarginBottom : 4}mm !important;
                      padding-left: ${settings.receiptMarginLeft !== undefined ? settings.receiptMarginLeft : 4}mm !important;
                      margin: 0 auto !important;
                    }
                    #thermal-paper-print div, #thermal-paper-print span {
                      font-size: 14px !important;
                    }
                  `;
                }
                printElementViaIFrame('thermal-paper-print', customPrintStyles, true); // Force manual print
              }}
              className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 border border-slate-200 text-xs font-sans font-bold"
              title="فتح نافذة حوار طباعة المتصفح اليدوية"
            >
              <span>طباعة يدوية / حفظ PDF 📄</span>
            </button>
          )}

          <button 
            onClick={() => setShowInvoiceReceipt(null)}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition cursor-pointer text-xs"
          >
            إنهاء وإغلاق المعاينة
          </button>
        </div>
      </motion.div>
    </div>
  );
}
