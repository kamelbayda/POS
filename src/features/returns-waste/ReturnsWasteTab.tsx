import React, { useState } from 'react';
import { AlertTriangle, Printer, RefreshCw, Trash, Undo2, X } from 'lucide-react';
import { Customer, ReturnRecord, WasteRecord, Product, Invoice, Supplier, SystemSettings } from '../../types';

interface ReturnsWasteTabProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  invoices: Invoice[];
  returns: ReturnRecord[];
  setReturns: React.Dispatch<React.SetStateAction<ReturnRecord[]>>;
  waste: WasteRecord[];
  setWaste: React.Dispatch<React.SetStateAction<WasteRecord[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  lang: 'ar' | 'en';
  showToast: (type: 'success' | 'error' | 'warning', msg: string) => void;
  sysDate: string;
  currentUserRole?: string;
}

export function ReturnsWasteTab({ 
  products, 
  setProducts, 
  invoices, 
  returns, 
  setReturns, 
  waste, 
  setWaste, 
  customers,
  setCustomers,
  lang, 
  showToast,
  sysDate,
  currentUserRole = 'admin'
}: ReturnsWasteTabProps) {
  const [subTab, setSubTab] = useState<'returns' | 'waste'>('returns');

  // --- PRINT MODAL STATES FOR RETURNS AND WASTE ---
  const [activePrintReturn, setActivePrintReturn] = useState<ReturnRecord | null>(null);
  const [activePrintWaste, setActivePrintWaste] = useState<WasteRecord | null>(null);

  const [settings] = useState<SystemSettings>(() => {
    try {
      const raw = localStorage.getItem('pos_settings');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      shopName: 'Supermarket Al-Amine',
      exchangeRate: 89000,
      lowStockThreshold: 10,
      expiryAlertDays: 30,
      receiptFooter: 'شكراً لزيارتكم! مأجورين إن شاء الله للجرود والمنفعة'
    };
  });

  // --- RETURN INVOICE SPECIFIC STATE ---
  const [returnInvoiceNo, setReturnInvoiceNo] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [returnProductId, setReturnProductId] = useState('');
  const [returnQty, setReturnQty] = useState('1');
  const [returnReason, setReturnReason] = useState<'damaged' | 'customer_change' | 'expired'>('customer_change');
  const [refundType, setRefundType] = useState<'cash' | 'credit'>('cash');

  // --- WASTE SPECIFIC STATE ---
  const [wasteProductId, setWasteProductId] = useState('');
  const [wasteQty, setWasteQty] = useState('1');
  const [wasteReason, setWasteReason] = useState<'expired' | 'damaged_on_shelf' | 'theft_loss'>('expired');
  const [wasteCompensated, setWasteCompensated] = useState<'loss' | 'compensated'>('loss');

  // --- EXECUTE ACTIONS ---
  const handleFindInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const found = invoices.find(inv => inv.invoiceNumber.toUpperCase() === returnInvoiceNo.trim().toUpperCase());
    if (found) {
      setSelectedInvoice(found);
      setReturnProductId('');
      setReturnQty('1');
      showToast('success', lang === 'ar' ? `تم العثور على الفاتورة بنجاح! تحتوي على ${found.items.length} أصناف مبيعات` : `Invoice found!`);
    } else {
      setSelectedInvoice(null);
      showToast('error', lang === 'ar' ? 'رقم الفاتورة غير صحيح أو غير متوفر بالآرشيف!' : 'No matching invoice number on record');
    }
  };

  const handleProcessReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !returnProductId) return;

    const returnQuantity = parseFloat(returnQty) || 0;
    const soldItem = selectedInvoice.items.find(item => item.productId === returnProductId);
    if (!soldItem) return;

    if (returnQuantity <= 0 || returnQuantity > soldItem.quantity) {
      showToast('error', lang === 'ar' ? 'الكمية المراد إرجاعها غير صالحة أو تجاوزت قيمة الكمية المباعة!' : 'Invalid returned quantity');
      return;
    }

    const unitPrice = soldItem.priceUSD;
    const totalRefundValue = unitPrice * returnQuantity;

    // 1. Return item to inventory stock
    const updatedProducts = products.map(p => {
      if (p.id === returnProductId) {
        return {
          ...p,
          quantity: p.quantity + returnQuantity
        };
      }
      return p;
    });
    setProducts(updatedProducts);
    localStorage.setItem('pos_products', JSON.stringify(updatedProducts));

    // 2. Adjust Customer credit if refundType is 'credit' and customer is linked
    if (refundType === 'credit' && selectedInvoice.customerId) {
      const updatedCusts = customers.map(c => {
        if (c.id === selectedInvoice.customerId) {
          // Subtract from customer debt!
          return {
            ...c,
            creditBalance: Math.max(0, c.creditBalance - totalRefundValue)
          };
        }
        return c;
      });
      setCustomers(updatedCusts);
      localStorage.setItem('pos_customers', JSON.stringify(updatedCusts));
      showToast('success', lang === 'ar' ? `تم خصم قيمة المرتجع ${totalRefundValue.toFixed(2)}$ من مديونية حساب العميل.` : `Reduced client's debt!`);
    }

    // 3. Create Return Record
    const newReturn: ReturnRecord = {
      id: `ret-${Date.now()}`,
      invoiceId: selectedInvoice.id,
      invoiceNumber: selectedInvoice.invoiceNumber,
      date: sysDate,
      productId: returnProductId,
      productName: soldItem.productName,
      qty: returnQuantity,
      quantity: returnQuantity,
      action: refundType === 'cash' ? 'cash' : 'credit',
      refundAmountUSD: totalRefundValue,
      reason: returnReason,
      refundMethod: refundType,
      customerId: selectedInvoice.customerId
    };

    const updatedReturns = [newReturn, ...returns];
    setReturns(updatedReturns);
    localStorage.setItem('pos_returns', JSON.stringify(updatedReturns));
    setActivePrintReturn(newReturn); // Auto triggering printable return receipt!

    // Reset return item
    setReturnProductId('');
    setReturnQty('1');
    showToast('success', lang === 'ar' ? `تم بنجاح تسجيل إرجاع صنف والتعويض للزبون بقيمة ${totalRefundValue}$!` : `Return transaction completed successfully for $${totalRefundValue}!`);
  };

  const handleProcessWaste = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wasteProductId) return;

    const quantityToLoss = parseFloat(wasteQty) || 0;
    const targetProduct = products.find(p => p.id === wasteProductId);
    if (!targetProduct) return;

    if (quantityToLoss <= 0 || quantityToLoss > targetProduct.quantity) {
      showToast('error', lang === 'ar' ? `الكمية المدخلة خاطئة أو تجاوزت الرصيد الحالي المتوفر في الرف وهو ${targetProduct.quantity}!` : 'Invalid waste quantity input');
      return;
    }

    // 1. Subtract from stock inventory
    const updatedProducts = products.map(p => {
      if (p.id === wasteProductId) {
        return {
          ...p,
          quantity: Math.max(0, p.quantity - quantityToLoss)
        };
      }
      return p;
    });
    setProducts(updatedProducts);
    localStorage.setItem('pos_products', JSON.stringify(updatedProducts));

    // 2. Add Spoil Waste record
    const costValueUSD = targetProduct.priceUSD * quantityToLoss;
    const newWaste: WasteRecord = {
      id: `wst-${Date.now()}`,
      productId: wasteProductId,
      productName: targetProduct.name,
      qty: quantityToLoss,
      quantity: quantityToLoss,
      type: wasteReason === 'expired' ? 'expired' : 'damage',
      reason: wasteReason,
      cost: costValueUSD,
      date: sysDate,
      estimatedLossUSD: costValueUSD,
      compensationStatus: wasteCompensated
    };

    const updatedWasteList = [newWaste, ...waste];
    setWaste(updatedWasteList);
    localStorage.setItem('pos_waste', JSON.stringify(updatedWasteList));
    setActivePrintWaste(newWaste); // Auto triggering printable waste receipt voucher!

    // Reset waste states
    setWasteProductId('');
    setWasteQty('1');
    showToast('success', lang === 'ar' ? `تم تفريغ وإتلاف ${quantityToLoss} وحدات مفقودة وتسجيل المتبقي في تصفية الجرود بنجاح!` : `Waste/Loss logged! Stock removed.`);
  };

  const totalLossFromWaste = waste.reduce((sum, w) => w.compensationStatus === 'loss' ? sum + w.estimatedLossUSD : sum, 0);

  return (
    <div className="space-y-6" id="extensions-returns-waste">
      
      {/* Sub tabs navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setSubTab('returns')}
          className={`px-6 py-3 font-extrabold text-sm flex items-center gap-2 border-b-2 transition ${subTab === 'returns' ? 'border-[#1D9E75] text-[#1D9E75]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Undo2 className="w-4 h-4" />
          <span>{lang === 'ar' ? 'قسم مرتجعات المبيعات والزبائن' : 'Product Sales Returns'}</span>
        </button>
        <button
          onClick={() => setSubTab('waste')}
          className={`px-6 py-3 font-extrabold text-sm flex items-center gap-2 border-b-2 transition ${subTab === 'waste' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Trash className="w-4 h-4 text-rose-500" />
          <span>{lang === 'ar' ? 'قسم شطب التوالف والتآكل المخرجات الفاسدة' : 'Spoilage & Damaged Stock Waste'}</span>
        </button>
      </div>

      {subTab === 'returns' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Register returns */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-5">
            <h3 className="font-extrabold text-slate-800 text-base mb-2 pb-2 border-b border-slate-100 text-right flex items-center gap-2 flex-row-reverse">
              <Undo2 className="w-5 h-5 text-emerald-600" />
              <span>{lang === 'ar' ? 'تسجيل إرجاع صنف مبيعات' : 'Process Return Credit'}</span>
            </h3>

            {/* Sub Form A: Find Invoice */}
            <form onSubmit={handleFindInvoice} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 text-right mb-1">
                  {lang === 'ar' ? 'خطوة أولى: ابحث برقم الفاتورة الفعلي:' : 'Step 1: Enter Invoice Number:'}
                </label>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition"
                  >
                    {lang === 'ar' ? 'مزامنة' : 'Scan'}
                  </button>
                  <input
                    type="text"
                    placeholder="مثال: INV-123456-0001"
                    value={returnInvoiceNo}
                    onChange={e => setReturnInvoiceNo(e.target.value)}
                    className="w-full text-center bg-slate-50 border border-slate-200 py-1.5 px-2 rounded-lg text-xs font-mono font-bold"
                    required
                  />
                </div>
              </div>
            </form>

            {selectedInvoice && (
              <form onSubmit={handleProcessReturn} className="space-y-3.5 pt-3 border-t border-slate-100">
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-xs text-right space-y-1">
                  <div className="font-bold text-slate-800">📋 {lang === 'ar' ? 'بيانات الفاتورة المحددة:' : 'Invoice Metadata:'}</div>
                  <div>ID: <strong className="font-mono">{selectedInvoice.invoiceNumber}</strong></div>
                  <div>{lang === 'ar' ? 'إجمالي الدفع:' : 'Paid amount:'} <strong className="text-emerald-700 font-mono">{selectedInvoice.totalUSD}$ / {(selectedInvoice.totalLBP).toLocaleString()} LBP</strong></div>
                  {selectedInvoice.customerId && (
                    <div className="text-amber-700 font-bold">👤 {lang === 'ar' ? 'زبون آجل / معرّف' : 'Linked Customer'}</div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 text-right mb-1">
                    {lang === 'ar' ? 'خطوة ثانية: حدد جرد الصنف المراد إرجاعه:' : 'Step 2: Selection Item to Return:'}
                  </label>
                  <select
                    value={returnProductId}
                    onChange={e => setReturnProductId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold text-right"
                    required
                  >
                    <option value="">-- {lang === 'ar' ? 'اختر منتج من القائمة' : 'Select Item'} --</option>
                    {selectedInvoice.items.map(it => (
                      <option key={it.productId} value={it.productId}>
                        {it.productName} ({it.quantity} مباع بقيمة {it.priceUSD}$)
                      </option>
                    ))}
                  </select>
                </div>

                {returnProductId && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 text-right mb-1">
                          {lang === 'ar' ? 'سبب الإرجاع المعالج:' : 'Reason:'}
                        </label>
                        <select
                          value={returnReason}
                          onChange={e => setReturnReason(e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-xs font-bold text-right"
                        >
                          <option value="customer_change">{lang === 'ar' ? 'تبديل رغبة الزبون' : 'Customer change'}</option>
                          <option value="damaged">{lang === 'ar' ? 'تالف في المصنع' : 'Damaged / Spoil'}</option>
                          <option value="expired">{lang === 'ar' ? 'انتهاء صلاحية لاحق' : 'Expired product'}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 text-right mb-1">
                          {lang === 'ar' ? 'كمية الإرجاع:' : 'Qty:'}
                        </label>
                        <input
                          type="number"
                          value={returnQty}
                          min="0.01"
                          step="any"
                          onChange={e => setReturnQty(e.target.value)}
                          className="w-full text-center bg-slate-50 border border-slate-200 p-1 rounded-lg text-sm font-mono font-bold"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 text-right mb-1">
                        {lang === 'ar' ? 'آلية التعويض المالي:' : 'Refund Method:'}
                      </label>
                      <select
                        value={refundType}
                        onChange={e => setRefundType(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-xs font-bold text-right"
                      >
                        <option value="cash">{lang === 'ar' ? 'دفع كاش نقداً ($)' : 'Cash Refund ($)'}</option>
                        {selectedInvoice.customerId && (
                          <option value="credit">{lang === 'ar' ? 'خصم وتنزيل من قيمة المديونية العامة العميل' : 'Store Credit / Account Balance'}</option>
                        )}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Undo2 className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'تأكيد الإرجاع وتصفية المخزون' : 'Commit Return'}</span>
                    </button>
                  </>
                )}
              </form>
            )}
          </div>

          {/* Right Column: Historic logs */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-[525px] flex flex-col">
            <h3 className="font-extrabold text-slate-800 text-base mb-4 pb-2 border-b border-slate-100 text-right flex items-center gap-2 flex-row-reverse justify-between">
              <span className="flex items-center gap-2 flex-row-reverse animate-pulse">
                <RefreshCw className="w-5 h-5 text-emerald-600" />
                <span>{lang === 'ar' ? 'دفتر قيود المبيعات المسترجعة' : 'Sales Returns History'}</span>
              </span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin">
              {returns.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  {lang === 'ar' ? 'لا توجد مبيعات مرتجعة مسجلة في هذا الجرد.' : 'No return records registered yet.'}
                </div>
              ) : (
                returns.map(ret => (
                  <div key={ret.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50 text-right text-xs text-slate-600 flex justify-between items-center flex-row-reverse gap-4">
                    <div className="space-y-1">
                      <div className="font-extrabold text-slate-800 text-sm">
                        {ret.productName} ( {ret.quantity} {lang === 'ar' ? 'قطع' : 'pcs'} )
                      </div>
                      <div>{lang === 'ar' ? 'رقم الفاتورة الأصلية:' : 'Orig Inv:'} <span className="font-mono font-semibold">{ret.invoiceNumber}</span></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActivePrintReturn(ret)}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-2 py-1.5 rounded-lg border border-emerald-200 text-[10px] flex items-center gap-1 cursor-pointer transition select-none"
                        title={lang === 'ar' ? 'طباعة ومعاينة الفاتورة الحرارية' : 'Print Return Invoice'}
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'طباعة' : 'Print'}</span>
                      </button>
                      <div className="text-left space-y-1 whitespace-nowrap">
                        <div className="text-rose-600 font-extrabold font-mono text-sm">+{((ret.refundAmountUSD !== undefined && ret.refundAmountUSD !== null) ? ret.refundAmountUSD : 0).toFixed(2)} $</div>
                        <div className="text-[10px] text-slate-400 font-mono">{ret.date}</div>
                        <span className="inline-block bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                          {ret.reason === 'damaged' ? (lang === 'ar' ? 'بضائع معطوبة' : 'damaged') : (lang === 'ar' ? 'رغبة الزبون' : 'customer change')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* WASTE AND LOST DIVISION SCREEN */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: register waste */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-5">
            <h3 className="font-extrabold text-slate-800 text-base mb-2 pb-2 border-b border-slate-100 text-right flex items-center gap-2 flex-row-reverse">
              <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
              <span>{lang === 'ar' ? 'تسجيل وشطب تالف / منتهي الصلاحية' : 'Log Loss or Damaged Spoils'}</span>
            </h3>

            <form onSubmit={handleProcessWaste} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 text-right mb-1">
                  {lang === 'ar' ? 'اختر المنتج من الجرود الحالية:' : 'Choose Stock Item:'}
                </label>
                <select
                  value={wasteProductId}
                  onChange={e => setWasteProductId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold text-right"
                  required
                >
                  <option value="">-- {lang === 'ar' ? 'حدد صنف من المخزون لفتحه' : 'Select Product'} --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({lang === 'ar' ? 'رصيد:' : 'Stock:'} {p.quantity} قطع / بـ {p.priceUSD}$)
                    </option>
                  ))}
                </select>
              </div>

              {wasteProductId && (
                <>
                  <div className="grid grid-cols-2 gap-3 text-right">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {lang === 'ar' ? 'نوع الضرر الحادث:' : 'Loss Reason:'}
                      </label>
                      <select
                        value={wasteReason}
                        onChange={e => setWasteReason(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-xs font-bold text-right"
                      >
                        <option value="expired">{lang === 'ar' ? 'إكسباير منتهي تاريخية' : 'Expired'}</option>
                        <option value="damaged_on_shelf">{lang === 'ar' ? 'تلف صدمات / تكسير بالرف' : 'Damaged'}</option>
                        <option value="theft_loss">{lang === 'ar' ? 'عجز سرقة وبضائع ضائعة' : 'Missing/Stolen'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {lang === 'ar' ? 'الكمية التالفة:' : 'Damage Qty:'}
                      </label>
                      <input
                        type="number"
                        value={wasteQty}
                        min="0.01"
                        step="any"
                        onChange={e => setWasteQty(e.target.value)}
                        className="w-full text-center bg-slate-50 border border-slate-200 p-1 rounded-lg text-sm font-mono font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 text-right mb-1">
                      {lang === 'ar' ? 'بند تحميل التكلفة المالية:' : 'Cost Allocation:'}
                    </label>
                    <select
                      value={wasteCompensated}
                      onChange={e => setWasteCompensated(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-xs font-bold text-right"
                    >
                      <option value="loss">{lang === 'ar' ? 'شطب بقيمتها بالكامل (خسارة على السوبر ماركت)' : 'Uncompensated loss (100% shop burden)'}</option>
                      <option value="compensated">{lang === 'ar' ? 'تعويض من الموزع / المورد لاحقاً' : 'Compensated/Returned by supplier'}</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'شطب وتنزيل صك الإتلاف والتبديد' : 'Commit Damaged/Loss'}</span>
                  </button>
                </>
              )}
            </form>
          </div>

          {/* Right Column: Spoil List Logs & Financial Total estimation */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-[525px] flex flex-col">
            <h3 className="font-extrabold text-slate-800 text-base mb-4 pb-2 border-b border-slate-100 text-right flex items-center gap-2 flex-row-reverse justify-between">
              <span className="flex items-center gap-2 flex-row-reverse text-rose-600">
                <Trash className="w-5 h-5" />
                <span>{lang === 'ar' ? 'دفتر تسويات التوالف والجرود التالفة' : 'Damaged Stock & Expired Ledger'}</span>
              </span>
              {currentUserRole === 'admin' && (
                <div className="text-left text-xs text-rose-700 font-extrabold">
                  {lang === 'ar' ? 'خسائر الإتلاف:' : 'Net spoilage burden:'} <strong className="font-mono text-sm">{totalLossFromWaste.toFixed(2)}$</strong>
                </div>
              )}
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin">
              {waste.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  {lang === 'ar' ? 'لا يوجد أصناف تالفة مسجلة في جردة التفتيش الحالية.' : 'No spoils registered in this audit interval.'}
                </div>
              ) : (
                waste.map(wst => (
                  <div key={wst.id} className="p-3 rounded-lg border border-rose-100 bg-rose-50/20 text-right text-xs text-slate-600 flex justify-between items-center flex-row-reverse gap-4">
                    <div className="space-y-1">
                      <div className="font-extrabold text-slate-800 text-sm">
                        {wst.productName} ( {wst.quantity} {lang === 'ar' ? 'وحدة' : 'units'} )
                      </div>
                      <div className="text-xs text-slate-400">
                        {lang === 'ar' ? 'السبب:' : 'Type:'} {wst.reason === 'expired' ? (lang === 'ar' ? 'تاريخ انتهاء صلاحية' : 'Expired date') : (lang === 'ar' ? 'تلف رفوف' : 'Shelf damage')}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActivePrintWaste(wst)}
                        className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold px-2 py-1.5 rounded-lg border border-amber-200 text-[10px] flex items-center gap-1 cursor-pointer transition select-none"
                        title={lang === 'ar' ? 'طباعة ومعاينة السند التفصيلي للإهلاك' : 'Print Spoil Voucher'}
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'طباعة' : 'Print'}</span>
                      </button>
                      <div className="text-left space-y-1">
                        {currentUserRole === 'admin' && (
                          <div className="text-rose-600 font-extrabold font-mono text-sm">-{((wst.estimatedLossUSD !== undefined && wst.estimatedLossUSD !== null) ? wst.estimatedLossUSD : 0).toFixed(2)} $</div>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono">{wst.date}</div>
                        <span className={`inline-block px-1 rounded text-[10px] font-bold ${wst.compensationStatus === 'compensated' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {wst.compensationStatus === 'compensated' ? (lang === 'ar' ? 'الموزع معوض' : 'compensated') : (lang === 'ar' ? 'المحل يتحمل الخسارة' : 'direct shop loss')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL OVERLAYS FOR COLOURED THERMAL INVOICING & SHARING
          ========================================== */}
      {activePrintReturn && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print" id="receipt-modal-container">
          <div className="bg-slate-900 text-white rounded-3xl p-6 w-full max-w-sm border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button 
                onClick={() => setActivePrintReturn(null)}
                className="hover:bg-slate-800 p-1 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h4 className="font-bold text-sm text-right">معاينة إيصال مرتجع المبيعات 📑</h4>
            </div>

            {/* Simulated Paper block */}
            <div 
              className="bg-slate-50 text-slate-900 font-mono text-[11px] p-5 rounded-2xl overflow-y-auto max-h-[380px] space-y-2.5 text-right font-sans border-t-4 border-rose-500 shadow-inner"
              style={{ fontFamily: 'Courier New, monospace' }}
            >
              <div className="text-center font-bold text-sm text-slate-950 block">{settings.shopName}</div>
              <div className="text-center text-xs text-rose-600 font-bold block">إيصال مرتجع مبيعات رسمي</div>
              <div className="text-center text-slate-400 text-[9px] block">************************************</div>
              
              <div className="space-y-0.5 text-slate-550 text-right">
                <div>رقم مستند المرتجعات: <strong className="font-mono text-slate-900">{activePrintReturn.id}</strong></div>
                <div>المرجع للفاتورة الأصلية: <strong className="font-mono text-slate-900">{activePrintReturn.invoiceNumber || activePrintReturn.invoiceId}</strong></div>
                <div>تاريخ المعالجة: <span className="font-mono">{activePrintReturn.date}</span></div>
                <div>الجهة المصدرة: <span className="font-bold text-slate-800">قسم المراقبة العينية والجرود</span></div>
                {activePrintReturn.customerId && (
                  <div>
                    الزبون المرتبط: <strong className="text-emerald-700">
                      {customers.find(c => c.id === activePrintReturn.customerId)?.name || "زبون معرف"}
                    </strong>
                  </div>
                )}
              </div>

              <div className="text-slate-400 text-[9px] block">------------------------------------+</div>
              <div className="grid grid-cols-12 gap-1 font-bold text-slate-950 text-right">
                <span className="col-span-8">الصنف المرتجع</span>
                <span className="col-span-2 text-center">الكمية</span>
                <span className="col-span-2 text-left">القيمة</span>
              </div>
              <div className="text-slate-400 text-[9px] block">------------------------------------+</div>

              {/* Receipt Item */}
              <div className="text-slate-800">
                <div className="grid grid-cols-12 gap-1 text-right items-center">
                  <span className="col-span-8 text-right font-bold text-slate-900 truncate">{activePrintReturn.productName}</span>
                  <span className="col-span-2 text-center font-bold text-slate-900">{activePrintReturn.quantity || activePrintReturn.qty}</span>
                  <span className="col-span-2 text-left font-bold text-rose-600">{(activePrintReturn.refundAmountUSD || 0).toFixed(2)}$</span>
                </div>
              </div>

              <div className="text-slate-400 text-[9px] block">------------------------------------+</div>

              {/* pricing */}
              <div className="space-y-0.5 text-slate-800 text-right">
                <div className="flex justify-between font-black text-rose-700 text-xs">
                  <span className="font-mono">{((activePrintReturn.refundAmountUSD || 0)).toFixed(2)} $</span>
                  <span>المبلغ المرتجع الصافي للزبون:</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span className="font-mono">{Math.ceil((activePrintReturn.refundAmountUSD || 0) * settings.exchangeRate).toLocaleString()} ل.ل</span>
                  <span>القيمة المسترجعة باللبناني:</span>
                </div>
                <div className="text-slate-400 text-[8px] my-0.5 text-center">-----------------------------------</div>
                <div className="flex justify-between font-bold text-slate-700">
                  <span>{activePrintReturn.refundMethod === 'credit' ? (lang === 'ar' ? 'تنزيل من حساب الديون' : 'Store Credit') : (lang === 'ar' ? 'تعويض نقدي كاش' : 'Cash Refund')}</span>
                  <span>طريقة التعويض:</span>
                </div>
              </div>

              {/* BARCODE */}
              <div className="flex flex-col items-center justify-center my-3 pb-1 border-t border-dashed border-slate-300">
                <div className="flex h-10 items-end justify-center bg-white px-3 py-1.5 rounded-lg border border-slate-300 gap-[1.5px] w-full">
                  {(activePrintReturn.id).split('').map((char, index) => {
                    const charCode = char.charCodeAt(0);
                    const barHeight = charCode % 2 === 0 ? "h-7" : "h-6";
                    const barWidth = charCode % 3 === 0 ? "w-[3px]" : charCode % 2 === 0 ? "w-[2px]" : "w-[1px]";
                    const barColor = charCode % 5 === 0 ? "bg-red-900/80" : "bg-rose-950";
                    return (
                      <div key={index} className={`${barColor} ${barWidth} ${barHeight}`} />
                    );
                  })}
                </div>
                <div className="text-[9px] tracking-widest font-mono text-rose-800 font-extrabold mt-1 text-center select-all">
                  * {activePrintReturn.id} *
                </div>
              </div>

              <div className="text-slate-400 text-[9px] pt-1 block text-center">************************************</div>
              <div className="text-center font-bold text-slate-500 text-[9px] block">
                {settings.receiptFooter}
              </div>
            </div>

            {/* WA details */}
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-800 space-y-2 mt-2">
              <label className="block text-slate-400 text-[10.5px] font-bold text-right">إرسال تفاصيل الإرجاع مباشرة للزبون بواتساب 💬</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const phoneInput = document.getElementById('wa-ret-phone') as HTMLInputElement;
                    const phone = phoneInput ? phoneInput.value.replace(/[^0-9]/g, '') : '';
                    if (!phone) {
                      showToast('warning', lang === 'ar' ? 'الرجاء إدخال رقم هاتف الزبون أولاً لإرسال الرسالة!' : 'Enter client phone first');
                      return;
                    }
                    
                    const linkedCust = customers.find(c => c.id === activePrintReturn.customerId);
                    const custName = linkedCust ? linkedCust.name : (lang === 'ar' ? 'زبون نقدي' : 'Cash Customer');

                    let text = `*إيصال مرتجع مبيعات من ${settings.shopName}*\n`;
                    text += `*الزبون:* ${custName}\n`;
                    text += `*رقم المرتجع:* ${activePrintReturn.id}\n`;
                    text += `*تاريخ المعالجة:* ${activePrintReturn.date}\n`;
                    text += `------------------------------------\n`;
                    text += `• تم إرجاع: ${activePrintReturn.productName} (الكمية: ${activePrintReturn.quantity || activePrintReturn.qty})\n`;
                    text += `*القيمة الإجمالية للمرتجع:* ${((activePrintReturn.refundAmountUSD || 0)).toFixed(2)}$ / ${Math.ceil((activePrintReturn.refundAmountUSD || 0) * settings.exchangeRate).toLocaleString()} ل.ل\n`;
                    text += `*طريقة التعويض:* ${activePrintReturn.refundMethod === 'credit' ? 'تنزيل مالي من حساب الدين العام للزبون بالدفتر' : 'تعويض نقدي كاش من الصندوق الرئيسي'}\n`;
                    text += `------------------------------------\n`;
                    text += `*${settings.receiptFooter}*`;

                    const encoded = encodeURIComponent(text);
                    const link = `https://wa.me/${phone}?text=${encoded}`;
                    window.open(link, '_blank');
                    showToast('success', lang === 'ar' ? 'جاري توجيهك إلى واتساب...' : 'Redirecting to WhatsApp...');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0 text-xs"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>إرسال</span>
                </button>
                <input
                  id="wa-ret-phone"
                  type="text"
                  placeholder="96170123456"
                  defaultValue={(() => {
                    const linkedCust = customers.find(c => c.id === activePrintReturn.customerId);
                    return linkedCust ? linkedCust.phone : '';
                  })()}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-1 px-3 text-center font-mono text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 text-xs font-sans">
              <button 
                onClick={() => window.print()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer border border-emerald-500 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الإيصال الحراري</span>
              </button>
              <button 
                onClick={() => setActivePrintReturn(null)}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-2xl transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {activePrintWaste && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print" id="receipt-modal-container">
          <div className="bg-slate-900 text-white rounded-3xl p-6 w-full max-w-sm border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button 
                onClick={() => setActivePrintWaste(null)}
                className="hover:bg-slate-800 p-1 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h4 className="font-bold text-sm text-right">معاينة سند إهلاك وشطب بضاعة تالفة 📑</h4>
            </div>

            {/* Simulated Paper block */}
            <div 
              className="bg-slate-50 text-slate-900 font-mono text-[11px] p-5 rounded-2xl overflow-y-auto max-h-[380px] space-y-2.5 text-right font-sans border-t-4 border-amber-500 shadow-inner"
              style={{ fontFamily: 'Courier New, monospace' }}
            >
              <div className="text-center font-bold text-sm text-slate-950 block">{settings.shopName}</div>
              <div className="text-center text-xs text-amber-600 font-black block">سند إهلاك وشطب توالف وجرد مخزني رسمي</div>
              <div className="text-center text-slate-400 text-[9px] block">************************************</div>
              
              <div className="space-y-0.5 text-slate-550 text-right">
                <div>رقم السند المالي: <strong className="font-mono text-slate-900">{activePrintWaste.id}</strong></div>
                <div>تاريخ المعالجة والشطب: <span className="font-mono">{activePrintWaste.date}</span></div>
                <div>الجهة المدققة: <span className="font-bold text-slate-800">إدارة الرقابة العامة والفرز</span></div>
                <div>تحمل الخسارة المالية: <strong className="text-amber-800 font-bold">{activePrintWaste.compensationStatus === 'compensated' ? 'الموزع / المورد (تعويض لاحق)' : 'خسارة كاملة متكبدة للمحل'}</strong></div>
              </div>

              <div className="text-slate-400 text-[9px] block">------------------------------------+</div>
              <div className="grid grid-cols-12 gap-1 font-bold text-slate-950 text-right">
                <span className="col-span-8">الصنف المشطوب والمبيد</span>
                <span className="col-span-2 text-center">الكمية</span>
                <span className="col-span-2 text-left">التكلفة</span>
              </div>
              <div className="text-slate-400 text-[9px] block">------------------------------------+</div>

              {/* Receipt Item */}
              <div className="text-slate-800">
                <div className="grid grid-cols-12 gap-1 text-right items-center">
                  <span className="col-span-8 text-right font-bold text-slate-900 truncate">{activePrintWaste.productName}</span>
                  <span className="col-span-2 text-center font-bold text-slate-900">{activePrintWaste.quantity || activePrintWaste.qty}</span>
                  <span className="col-span-2 text-left font-bold text-amber-700">{(activePrintWaste.estimatedLossUSD || activePrintWaste.cost || 0).toFixed(2)}$</span>
                </div>
              </div>

              <div className="text-slate-400 text-[9px] block">------------------------------------+</div>

              {/* pricing */}
              <div className="space-y-0.5 text-slate-800 text-right">
                <div className="flex justify-between font-black text-rose-700 text-xs">
                  <span className="font-mono">{((activePrintWaste.estimatedLossUSD || activePrintWaste.cost || 0)).toFixed(2)} $</span>
                  <span>تكلفة البضائع التالفة المهلكة:</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span className="font-mono">{Math.ceil((activePrintWaste.estimatedLossUSD || activePrintWaste.cost || 0) * settings.exchangeRate).toLocaleString()} ل.ل</span>
                  <span>تكلفة الشطب بالعملة الوطنية:</span>
                </div>
                <div className="text-slate-400 text-[8px] my-0.5 text-center">-----------------------------------</div>
                <div className="flex justify-between font-bold text-slate-700">
                  <span>
                    {activePrintWaste.reason === 'expired' ? 'بضائع منتهية الصلاحية (اكسباير)' : 
                     activePrintWaste.reason === 'damaged_on_shelf' ? 'تلف رفوف وضرر تكسير عيني' : 
                     'عجز سرقة وضياع عينات'}
                  </span>
                  <span>السبب الإداري للشطب:</span>
                </div>
              </div>

              {/* BARCODE */}
              <div className="flex flex-col items-center justify-center my-3 pb-1 border-t border-dashed border-slate-300">
                <div className="flex h-10 items-end justify-center bg-white px-3 py-1.5 rounded-lg border border-slate-300 gap-[1.5px] w-full">
                  {(activePrintWaste.id).split('').map((char, index) => {
                    const charCode = char.charCodeAt(0);
                    const barHeight = charCode % 2 === 0 ? "h-7" : "h-6";
                    const barWidth = charCode % 3 === 0 ? "w-[3px]" : charCode % 2 === 0 ? "w-[2px]" : "w-[1px]";
                    const barColor = charCode % 5 === 0 ? "bg-amber-900/80" : "bg-amber-950";
                    return (
                      <div key={index} className={`${barColor} ${barWidth} ${barHeight}`} />
                    );
                  })}
                </div>
                <div className="text-[9px] tracking-widest font-mono text-amber-800 font-extrabold mt-1 text-center select-all">
                  * {activePrintWaste.id} *
                </div>
              </div>

              <div className="text-slate-400 text-[9px] pt-1 block text-center">************************************</div>
              <div className="text-center font-bold text-slate-500 text-[9px] block">
                تم إتلاف وشطب الكمية من جرد المستودع والرفوف بنجاح ✓
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 text-xs font-sans">
              <button 
                onClick={() => window.print()}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-black py-2.5 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer border border-amber-500 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة سند الإتلاف والجرود</span>
              </button>
              <button 
                onClick={() => setActivePrintWaste(null)}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-2xl transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
