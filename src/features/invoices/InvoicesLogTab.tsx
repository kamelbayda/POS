import React, { useState } from 'react';
import { Printer, Scan, Search } from 'lucide-react';
import { Invoice } from '../../types';
import { ColumnSelector } from '../../components/ColumnSelector';
import { useResizableColumns } from '../../hooks/useResizableColumns';

interface InvoicesLogTabProps {
  invoices: Invoice[];
  /** Opens the receipt preview for an invoice. */
  onOpenInvoice: (invoice: Invoice) => void;
  lang: 'ar' | 'en';
  showToast: (type: 'success' | 'error' | 'warning', message: string) => void;
}

export function InvoicesLogTab({ invoices, onOpenInvoice, lang, showToast }: InvoicesLogTabProps) {
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState<string>('');
  const [visibleInvLogCols, setVisibleInvLogCols] = useState<{ [key: string]: boolean }>({
    actions: true,
    cashier: true,
    payment_method: true,
    exchange_rate: true,
    total_lbp: true,
    total_usd: true,
    time: true,
    date: true,
    invoice_number: true,
  });
  const { colWidths, handleResizeStart } = useResizableColumns({
    actions: 120,
    cashier: 130,
    payment_method: 120,
    exchange_rate: 110,
    total_lbp: 130,
    total_usd: 120,
    time: 100,
    date: 110,
    invoice_number: 140,
  }, lang);

  const invLogColumns = [
    { key: 'actions', label: lang === 'ar' ? 'الإجراءات' : 'Actions' },
    { key: 'cashier', label: lang === 'ar' ? 'البائع الكاشير' : 'Cashier' },
    { key: 'payment_method', label: lang === 'ar' ? 'وسيلة الدفع' : 'Pay Method' },
    { key: 'exchange_rate', label: lang === 'ar' ? 'صرف الدولار' : 'Exchange' },
    { key: 'total_lbp', label: lang === 'ar' ? 'الكلي بالليرة' : 'Total LBP' },
    { key: 'total_usd', label: lang === 'ar' ? 'الكلي بالدولار' : 'Total USD' },
    { key: 'time', label: lang === 'ar' ? 'الوقت' : 'Time' },
    { key: 'date', label: lang === 'ar' ? 'التاريخ' : 'Date' },
    { key: 'invoice_number', label: lang === 'ar' ? 'رقم الفاتورة' : 'Invoice No.' },
  ];

  // Internal computation for filtered list
  const cleanQuery = invoiceSearchQuery.trim().toLowerCase();
  const filteredInvoices = invoices.filter(inv => {
    if (!cleanQuery) return true;
    return (
      inv.invoiceNumber.toLowerCase().includes(cleanQuery) ||
      (inv.barcode && inv.barcode.toLowerCase().includes(cleanQuery)) ||
      inv.cashier.toLowerCase().includes(cleanQuery) ||
      inv.totalUSD.toString().includes(cleanQuery) ||
      inv.items.some(it => (it.serials || []).some(sn => sn.toLowerCase().includes(cleanQuery)))
    );
  });

  // Phone shops: an exact IMEI shows who bought it and whether its warranty still runs
  const serialQuery = invoiceSearchQuery.replace(/[\s-]+/g, '').toUpperCase();
  const serialHit = serialQuery.length >= 6 ? (() => {
    for (const inv of invoices) {
      for (const it of inv.items) {
        if ((it.serials || []).includes(serialQuery)) return { inv, item: it };
      }
    }
    return null;
  })() : null;
  const todayIso = new Date().toISOString().slice(0, 10);

  // Exact match for automated scan display
  const exactMatch = invoices.find(inv => 
    inv.invoiceNumber.toLowerCase() === cleanQuery ||
    (inv.barcode && inv.barcode.toLowerCase() === cleanQuery)
  ) || serialHit?.inv;

  const handleBarcodeFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (exactMatch) {
      onOpenInvoice(exactMatch);
      showToast('success', `تم العثور على الفاتورة [${exactMatch.invoiceNumber}] وفتحها للمعاينة بنجاح!`);
    } else if (filteredInvoices.length === 1) {
      onOpenInvoice(filteredInvoices[0]);
      showToast('success', `تم العثور على الفاتورة المطابقة [${filteredInvoices[0].invoiceNumber}]`);
    } else {
      showToast('warning', 'يرجى كتابة رقم فاتورة صحيح أو التأكد من إدخال رمز باركود كامل.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs" id="tab-invoices-logs">
      <div className="pb-4 border-b border-slate-100 mb-5 text-right flex flex-col md:flex-row justify-between items-end md:items-center gap-3">
        <div className="text-right">
          <h3 className="font-bold text-slate-800 text-lg">🧾 مستودع الفواتير ونسخ الزبائن المسجلة</h3>
          <p className="text-xs text-slate-400 mt-1">انقر على أيقونة الطابعة لمعاينة تذييل وتفاصيل الفاتورة الحرارية للزبون.</p>
        </div>
        
        {/* Quick helper of items */}
        <div className="bg-slate-50 text-slate-600 font-bold px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-right">
          إجمالي الفواتير: <span className="font-mono text-emerald-600 font-extrabold">{invoices.length}</span>
        </div>
      </div>

      {/* BARCODE SEARCH AND SCANNER FIELD */}
      <div className="bg-emerald-50/55 rounded-2xl border border-emerald-100 p-4 mb-5 space-y-3.5">
        <form onSubmit={handleBarcodeFormSubmit} className="text-right">
          <label className="block text-xs font-black text-slate-700 mb-1.5">
            🔍 مربع البحث وقارئ الباركود للفاتورة:
          </label>
          <div className="flex gap-2.5">
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>بحث ومزامنة</span>
            </button>

            <div className="relative w-full">
              <input
                type="text"
                placeholder="امسح الـ Barcode أو اكتب رقم الفاتورة أو الـ IMEI للوصول الفوري..."
                value={invoiceSearchQuery}
                onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                className="w-full text-right pr-10 pl-3 py-2.5 rounded-xl border border-emerald-200 bg-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 font-bold"
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600">
                <Scan className="w-5 h-5 animate-pulse" />
              </div>
            </div>
          </div>
          {serialHit && (() => {
            const until = serialHit.item.warrantyUntil;
            const returned = (serialHit.item.serials || []).indexOf(serialQuery) < (serialHit.item.returnedQty || 0);
            const active = !!until && until >= todayIso;
            return (
              <div className="mt-3 bg-white border-2 border-sky-200 rounded-xl p-3 text-right text-xs space-y-1" id="imei-lookup">
                <div className="font-black text-sky-900">📱 IMEI <span dir="ltr" className="font-mono">{serialQuery}</span> — {serialHit.item.productName}</div>
                <div className="text-slate-600">
                  انباع بالفاتورة <b className="font-mono">{serialHit.inv.invoiceNumber}</b> بتاريخ <b dir="ltr">{serialHit.inv.date}</b>
                  {serialHit.inv.customerId ? ' (لزبون مسجّل)' : ''}
                </div>
                {returned ? (
                  <div className="font-bold text-amber-700">↩️ هالجهاز ترجّع للمحل.</div>
                ) : until ? (
                  <div className={`font-black ${active ? 'text-emerald-700' : 'text-rose-600'}`}>
                    🛡️ {active ? 'الكفالة سارية لغاية' : 'الكفالة انتهت بتاريخ'} <span dir="ltr">{until}</span>
                  </div>
                ) : (
                  <div className="text-slate-500">بلا كفالة.</div>
                )}
              </div>
            );
          })()}
          <p className="text-[10px] text-slate-400 mt-1.5">
            * يدعم هذا الحقل قارئ الباركود الليزري الموجه للورق الحراري. قم بتوجيهه إلى باركود الفاتورة ليقوم بفتحه تلقائياً.
          </p>
        </form>

        {/* EXACT MATCH HIGHLIGHT */}
        {exactMatch && (
          <div className="bg-white border-2 border-[#1D9E75] p-3.5 rounded-xl flex items-center justify-between flex-row-reverse animate-bounce">
            <div className="text-right space-y-0.5">
              <div className="text-xs font-black text-[#1D9E75]">⚡ تم الكشف عن تطابق رقم الباركود التام!</div>
              <div className="text-[11px] text-slate-500 font-mono">فاتورة: <strong className="text-slate-800">{exactMatch.invoiceNumber}</strong> | مجموع: {exactMatch.totalUSD.toFixed(2)}$</div>
            </div>
            <button
              onClick={() => {
                onOpenInvoice(exactMatch);
              }}
              className="bg-[#1D9E75] hover:bg-emerald-600 text-white font-black px-4 py-2 rounded-lg text-xs transition cursor-pointer"
            >
              فتح معاينة الفاتورة 📑
            </button>
          </div>
        )}
      </div>

      {/* Invoices List table */}
      <div className="flex justify-end mb-4">
        <ColumnSelector
          columns={invLogColumns}
          visibleCols={visibleInvLogCols}
          onChange={(key) => setVisibleInvLogCols(prev => ({ ...prev, [key]: !prev[key] }))}
          lang={lang}
        />
      </div>

      <div className="overflow-x-auto border border-slate-150 rounded-2xl">
        <table 
          className="w-full border-collapse text-right text-xs table-fixed min-w-full"
          style={{
            minWidth: Object.entries(visibleInvLogCols)
              .filter(([_, visible]) => visible)
              .reduce((sum, [colKey, _]) => sum + (colWidths[colKey] || 120), 0) + 'px'
          }}
          role="grid" 
          aria-label="Invoices Log Table"
        >
          <colgroup>
            {visibleInvLogCols.actions !== false && <col style={{ width: colWidths.actions || 110 }} />}
            {visibleInvLogCols.cashier !== false && <col style={{ width: colWidths.cashier || 130 }} />}
            {visibleInvLogCols.payment_method !== false && <col style={{ width: colWidths.payment_method || 120 }} />}
            {visibleInvLogCols.exchange_rate !== false && <col style={{ width: colWidths.exchange_rate || 110 }} />}
            {visibleInvLogCols.total_lbp !== false && <col style={{ width: colWidths.total_lbp || 130 }} />}
            {visibleInvLogCols.total_usd !== false && <col style={{ width: colWidths.total_usd || 120 }} />}
            {visibleInvLogCols.time !== false && <col style={{ width: colWidths.time || 100 }} />}
            {visibleInvLogCols.date !== false && <col style={{ width: colWidths.date || 110 }} />}
            {visibleInvLogCols.invoice_number !== false && <col style={{ width: colWidths.invoice_number || 140 }} />}
          </colgroup>
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
              {visibleInvLogCols.actions !== false && (
                <th className="p-3 relative group select-none text-right font-extrabold" style={{ width: colWidths.actions }}>
                  <span>{lang === 'ar' ? 'الإجراءات' : 'Actions'}</span>
                  <div 
                    onPointerDown={e => handleResizeStart(e, 'actions')} 
                    className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-100 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                  />
                </th>
              )}
              {visibleInvLogCols.cashier !== false && (
                <th className="p-3 relative group select-none text-right font-extrabold" style={{ width: colWidths.cashier }}>
                  <span>{lang === 'ar' ? 'البائع الكاشير' : 'Cashier'}</span>
                  <div 
                    onPointerDown={e => handleResizeStart(e, 'cashier')} 
                    className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-100 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                  />
                </th>
              )}
              {visibleInvLogCols.payment_method !== false && (
                <th className="p-3 relative group select-none text-right font-extrabold" style={{ width: colWidths.payment_method }}>
                  <span>{lang === 'ar' ? 'وسيلة الدفع' : 'Payment Method'}</span>
                  <div 
                    onPointerDown={e => handleResizeStart(e, 'payment_method')} 
                    className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-100 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                  />
                </th>
              )}
              {visibleInvLogCols.exchange_rate !== false && (
                <th className="p-3 relative group select-none text-right font-extrabold" style={{ width: colWidths.exchange_rate }}>
                  <span>{lang === 'ar' ? 'صرف الدولار' : 'Exchange Rate'}</span>
                  <div 
                    onPointerDown={e => handleResizeStart(e, 'exchange_rate')} 
                    className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-100 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                  />
                </th>
              )}
              {visibleInvLogCols.total_lbp !== false && (
                <th className="p-3 relative group select-none text-right font-extrabold" style={{ width: colWidths.total_lbp }}>
                  <span>{lang === 'ar' ? 'الكلي بالليرة' : 'Total LBP'}</span>
                  <div 
                    onPointerDown={e => handleResizeStart(e, 'total_lbp')} 
                    className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-100 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                  />
                </th>
              )}
              {visibleInvLogCols.total_usd !== false && (
                <th className="p-3 relative group select-none text-right font-extrabold" style={{ width: colWidths.total_usd }}>
                  <span>{lang === 'ar' ? 'الكلي بالدولار' : 'Total USD'}</span>
                  <div 
                    onPointerDown={e => handleResizeStart(e, 'total_usd')} 
                    className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-100 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                  />
                </th>
              )}
              {visibleInvLogCols.time !== false && (
                <th className="p-3 relative group select-none text-right font-extrabold" style={{ width: colWidths.time }}>
                  <span>{lang === 'ar' ? 'الوقت' : 'Time'}</span>
                  <div 
                    onPointerDown={e => handleResizeStart(e, 'time')} 
                    className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-100 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                  />
                </th>
              )}
              {visibleInvLogCols.date !== false && (
                <th className="p-3 relative group select-none text-right font-extrabold" style={{ width: colWidths.date }}>
                  <span>{lang === 'ar' ? 'التاريخ' : 'Date'}</span>
                  <div 
                    onPointerDown={e => handleResizeStart(e, 'date')} 
                    className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-100 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                  />
                </th>
              )}
              {visibleInvLogCols.invoice_number !== false && (
                <th className="p-3 relative group select-none text-right font-extrabold" style={{ width: colWidths.invoice_number }}>
                  <span>{lang === 'ar' ? 'رقم الفاتورة' : 'Invoice Number'}</span>
                  <div 
                    onPointerDown={e => handleResizeStart(e, 'invoice_number')} 
                    className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-100 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                  />
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={Object.values(visibleInvLogCols).filter(Boolean).length} className="p-8 text-center text-slate-400 font-sans">
                  {lang === 'ar' ? 'لا توجد أي فواتير مطابقة لفلترة البحث الحالية. حاول إعادة كتابة رقم صحيح.' : 'No matching invoices found.'}
                </td>
              </tr>
            ) : (
              filteredInvoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/50">
                  {visibleInvLogCols.actions !== false && (
                    <td className="p-3">
                      <button 
                        onClick={() => onOpenInvoice(inv)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1 rounded-lg text-[11px] transition flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'معاينة الفاتورة' : 'Preview'}</span>
                      </button>
                    </td>
                  )}
                  {visibleInvLogCols.cashier !== false && (
                    <td className="p-3 font-semibold">{inv.cashier}</td>
                  )}
                  {visibleInvLogCols.payment_method !== false && (
                    <td className="p-3 font-bold text-slate-600">
                      {inv.paymentMethod === 'cash' ? (lang === 'ar' ? 'كاش (Cash)' : 'Cash') : inv.paymentMethod === 'card' ? (lang === 'ar' ? 'بطاقة دفع' : 'Card') : inv.paymentMethod === 'debt' ? (lang === 'ar' ? 'آجل (دين)' : 'Debt') : (lang === 'ar' ? 'تحويل' : 'Transfer')}
                    </td>
                  )}
                  {visibleInvLogCols.exchange_rate !== false && (
                    <td className="p-3 font-mono text-slate-400">{inv.exchangeRate.toLocaleString()} L.L</td>
                  )}
                  {visibleInvLogCols.total_lbp !== false && (
                    <td className="p-3 font-mono font-bold">{Math.ceil(inv.totalLBP).toLocaleString()} ل.ل</td>
                  )}
                  {visibleInvLogCols.total_usd !== false && (
                    <td className="p-3 font-mono font-black text-rose-600">{inv.totalUSD.toFixed(2)} $</td>
                  )}
                  {visibleInvLogCols.time !== false && (
                    <td className="p-3 font-mono text-slate-400">{inv.time}</td>
                  )}
                  {visibleInvLogCols.date !== false && (
                    <td className="p-3 font-mono font-bold text-slate-600">{inv.date}</td>
                  )}
                  {visibleInvLogCols.invoice_number !== false && (
                    <td className="p-3 font-mono font-extrabold text-slate-900">{inv.invoiceNumber}</td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
