import React, { useState } from 'react';
import { Smartphone, Printer, Search } from 'lucide-react';
import { Category, Customer, Invoice, Product, PurchaseInvoice, SystemSettings, TradeIn } from '../../types';
import { addMonths } from '../../lib/serials';
import { matchesProductSearch } from '../../lib/productSearch';
import * as storage from '../../lib/storage';
import { normalizeSerial } from '../../lib/serials';
import { printTradeInReceipt } from './tradeInReceiptPrint';

const USED_CATEGORY: Category = { id: 'used-phones', name: 'تلفونات مستعملة', emoji: '📱' };
const CONDITIONS: Array<{ id: TradeIn['condition']; ar: string; en: string }> = [
  { id: 'excellent', ar: 'ممتاز', en: 'Excellent' },
  { id: 'good', ar: 'جيد', en: 'Good' },
  { id: 'fair', ar: 'مقبول', en: 'Fair' },
];

interface TradeInsTabProps {
  lang: 'ar' | 'en';
  sysDate: string;
  settings: SystemSettings;
  tradeIns: TradeIn[];
  setTradeIns: (rows: TradeIn[]) => void;
  products: Product[];
  setProducts: (rows: Product[]) => void;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  purchaseInvoices: PurchaseInvoice[];
  setPurchaseInvoices: (rows: PurchaseInvoice[]) => void;
  customers: Customer[];
  setCustomers: (rows: Customer[]) => void;
  showToast: (type: 'success' | 'error' | 'warning', message: string) => void;
  /** Saves the sale of the device given in exchange; false when it can't be recorded (trial used up). */
  onSaleInvoice: (inv: Invoice) => boolean;
  cashierName: string;
  exchangeRate: number;
}

const empty = { sellerName: '', sellerPhone: '', sellerIdNumber: '', device: '', imei: '', condition: 'good' as TradeIn['condition'], batteryHealth: '', notes: '', pricePaid: '', sellPrice: '', warrantyMonths: '', payment: 'cash' as TradeIn['payment'], exProductId: '', exImei: '', exPrice: '', exSearch: '', diffMethod: 'cash' as 'cash' | 'debt' };

/** Phone shops: buy a used phone from a customer and put it on sale. */
export function TradeInsTab(props: TradeInsTabProps) {
  const { lang, sysDate, settings, tradeIns, setTradeIns, products, setProducts, categories, setCategories, purchaseInvoices, setPurchaseInvoices, customers, setCustomers, showToast, onSaleInvoice, cashierName, exchangeRate } = props;
  const ar = lang === 'ar';
  const [form, setForm] = useState(empty);
  const [query, setQuery] = useState('');

  const nextNumber = () => {
    const max = tradeIns.reduce((m, t) => Math.max(m, parseInt(t.number.replace(/\D/g, '')) || 0), 0);
    return `TI-${String(max + 1).padStart(4, '0')}`;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const imei = normalizeSerial(form.imei);
    const paid = parseFloat(form.pricePaid) || 0;
    const sell = parseFloat(form.sellPrice) || 0;
    if (!form.sellerName.trim() || !form.sellerPhone.trim() || !form.sellerIdNumber.trim() || !form.device.trim() || !imei) {
      showToast('error', ar ? 'عبّي اسم البائع، التلفون، رقم الهوية، الجهاز والـ IMEI.' : 'Fill in seller, phone, ID number, device and IMEI.');
      return;
    }
    if (paid <= 0 || sell <= 0) {
      showToast('error', ar ? 'اكتب سعر الشرا وسعر المبيع.' : 'Enter the buying and selling prices.');
      return;
    }
    const owner = products.find(p => (p.serialNumbers || []).includes(imei) || p.barcode === imei);
    if (owner) {
      showToast('error', ar ? `هالـ IMEI موجود بالمخزن (${owner.name}).` : `This IMEI is already in stock (${owner.name}).`);
      return;
    }
    const customer = customers.find(c => c.phone && c.phone.replace(/\D/g, '') === form.sellerPhone.replace(/\D/g, ''));
    if (form.payment === 'credit' && !customer) {
      showToast('error', ar ? 'الرصيد عالحساب بدّو زبون مسجّل بنفس رقم التلفون بحسابات الزبائن.' : 'Credit needs a registered customer with this phone.');
      return;
    }
    // Exchange: the device the customer takes from stock instead of money
    const exProduct = form.payment === 'exchange' ? products.find(p => p.id === form.exProductId) : undefined;
    const exPrice = parseFloat(form.exPrice) || exProduct?.priceUSD || 0;
    const difference = Math.round((exPrice - paid) * 100) / 100; // > 0 customer pays, < 0 shop pays
    if (form.payment === 'exchange') {
      if (!exProduct || exProduct.quantity <= 0) { showToast('error', ar ? 'اختار الجهاز يلي بدّو ياخدو من المخزن.' : 'Choose the device from stock.'); return; }
      if (exProduct.trackSerial && !form.exImei) { showToast('error', ar ? 'اختار IMEI الجهاز يلي عم يستلمو.' : 'Choose the IMEI being handed over.'); return; }
      if (exPrice <= 0) { showToast('error', ar ? 'اكتب سعر الجهاز الجديد.' : 'Enter the new device price.'); return; }
      if (difference > 0 && form.diffMethod === 'debt' && !customer) {
        showToast('error', ar ? 'تسجيل الفرق دين بدّو زبون مسجّل بنفس رقم التلفون.' : 'Debt needs a registered customer with this phone.');
        return;
      }
    }

    const id = `ti-${Date.now()}`;
    const condition = CONDITIONS.find(c => c.id === form.condition)!;
    // Each used phone is its own item: its own cost, price and IMEI, so its profit is exact
    const product: Product = {
      id: `prod-used-${Date.now()}`,
      name: `${form.device.trim()} (${ar ? 'مستعمل' : 'used'} - ${ar ? condition.ar : condition.en})`,
      barcode: imei,
      category: USED_CATEGORY.id,
      priceUSD: sell,
      priceWholesale: sell,
      costPriceUSD: paid,
      quantity: 1,
      expiryDate: '2099-12-31',
      trackSerial: true,
      serialNumbers: [imei],
      ...(parseInt(form.warrantyMonths) > 0 ? { warrantyMonths: parseInt(form.warrantyMonths) } : {}),
    };
    const nextProducts = [product, ...products.map(p => (exProduct && p.id === exProduct.id
      ? { ...p, quantity: p.quantity - 1, ...(form.exImei ? { serialNumbers: (p.serialNumbers || []).filter(x => x !== form.exImei) } : {}) }
      : p))];
    if (!categories.some(c => c.id === USED_CATEGORY.id)) {
      setCategories(prev => {
        const next = [...prev, USED_CATEGORY];
        storage.setJSON('pos_categories', next);
        return next;
      });
    }

    const tiNumber = nextNumber();
    // Exchange: the new device is a normal sale, paid by the used phone plus the difference
    let saleInvoice: Invoice | null = null;
    if (exProduct) {
      const now = new Date();
      const paidNow = difference > 0 && form.diffMethod === 'debt' ? paid : exPrice;
      const diffText = difference > 0
        ? (ar ? `+ ${difference.toFixed(2)}$ ${form.diffMethod === 'cash' ? 'كاش' : 'دين على الحساب'}` : `+ ${difference.toFixed(2)}$ ${form.diffMethod}`)
        : difference < 0 ? (ar ? `(دفعنا للزبون ${(-difference).toFixed(2)}$ فرق)` : `(we paid ${(-difference).toFixed(2)}$ back)`) : '';
      saleInvoice = {
        id: `inv-${Date.now()}`,
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}-TI`,
        date: sysDate,
        time: now.toTimeString().slice(0, 5),
        items: [{
          productId: exProduct.id, productName: exProduct.name, priceUSD: exPrice, quantity: 1, totalUSD: exPrice,
          ...(form.exImei ? { serials: [form.exImei] } : {}),
          ...(exProduct.warrantyMonths ? { warrantyUntil: addMonths(sysDate, exProduct.warrantyMonths) } : {}),
        }],
        subtotalUSD: exPrice, discountUSD: 0, totalUSD: exPrice, totalLBP: exPrice * exchangeRate,
        paymentMethod: difference > 0 && form.diffMethod === 'debt' ? 'debt' : 'cash',
        cashier: cashierName, exchangeRate,
        paidAmountUSD: paidNow,
        ...(customer ? { customerId: customer.id } : {}),
        note: ar ? `مقايضة ${tiNumber}: انحسب ${form.device.trim()} بـ ${paid.toFixed(2)}$ ${diffText}` : `Exchange ${tiNumber}: ${form.device.trim()} counted ${paid.toFixed(2)}$ ${diffText}`,
      };
      if (!onSaleInvoice(saleInvoice)) return;
    }

    setProducts(nextProducts);
    storage.setJSON('pos_products', nextProducts);

    // Recorded with the purchases (money paid out for stock)
    const purchase: PurchaseInvoice = {
      id: `pur-inv-${Date.now()}`,
      invoiceNumber: tiNumber,
      supplierName: `${form.sellerName.trim()} (${ar ? 'زبون' : 'customer'})`,
      date: sysDate,
      items: [{ id: `pur-item-${Date.now()}`, productId: product.id, productName: product.name, qty: 1, costPriceUSD: paid, newPriceUSD: sell, serials: [imei] }],
      totalAmountUSD: paid,
      paymentStatus: 'paid',
      note: exProduct && saleInvoice
        ? (ar ? `مقايضة مقابل ${exProduct.name} (فاتورة ${saleInvoice.invoiceNumber})${difference < 0 ? ` — دفعنا للزبون ${(-difference).toFixed(2)}$ كاش` : ''}` : `Exchange for ${exProduct.name}`)
        : ar ? `شرا جهاز مستعمل ${form.payment === 'credit' ? '(رصيد على حساب الزبون)' : '(نقداً)'}` : `Used phone ${form.payment === 'credit' ? '(customer credit)' : '(cash)'}`,
      destination: 'shop',
    };
    const nextPurchases = [purchase, ...purchaseInvoices];
    setPurchaseInvoices(nextPurchases);
    storage.setJSON('pos_purchases', nextPurchases);

    // Trade-in: the price goes to the customer's account (lowers what they owe, may go below zero)
    const balanceChange = form.payment === 'credit' ? -paid : exProduct && difference > 0 && form.diffMethod === 'debt' ? difference : 0;
    if (balanceChange !== 0 && customer) {
      const nextCustomers = customers.map(c => (c.id === customer.id ? { ...c, creditBalance: c.creditBalance + balanceChange } : c));
      setCustomers(nextCustomers);
      storage.setJSON('pos_customers', nextCustomers);
    }

    const record: TradeIn = {
      id,
      number: purchase.invoiceNumber,
      date: sysDate,
      sellerName: form.sellerName.trim(),
      sellerPhone: form.sellerPhone.trim(),
      sellerIdNumber: form.sellerIdNumber.trim(),
      ...(customer ? { customerId: customer.id } : {}),
      device: form.device.trim(),
      imei,
      condition: form.condition,
      ...(parseInt(form.batteryHealth) > 0 ? { batteryHealth: parseInt(form.batteryHealth) } : {}),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      pricePaidUSD: paid,
      sellPriceUSD: sell,
      payment: form.payment,
      productId: product.id,
      purchaseInvoiceId: purchase.id,
      ...(exProduct && saleInvoice ? { exchange: {
        productId: exProduct.id, productName: exProduct.name, ...(form.exImei ? { imei: form.exImei } : {}),
        priceUSD: exPrice, invoiceId: saleInvoice.id, invoiceNumber: saleInvoice.invoiceNumber,
        differenceUSD: difference, differenceMethod: form.diffMethod,
      } } : {}),
    };
    setTradeIns([record, ...tradeIns]);
    setForm(empty);
    showToast('success', exProduct
      ? (ar ? `✅ مقايضة ${record.number}: استلم ${exProduct.name}${difference > 0 ? ` ودفع فرق ${difference.toFixed(2)}$` : difference < 0 ? ` ودفعتلو فرق ${(-difference).toFixed(2)}$` : ''}` : `Exchange ${record.number} done`)
      : ar ? `انشرى الجهاز (${record.number}) وصار معروض للبيع بـ ${sell.toFixed(2)}$ 📱` : `Bought (${record.number}); on sale at ${sell.toFixed(2)}$`);
    printTradeInReceipt(record, settings);
  };

  const q = query.trim().toLowerCase();
  const shown = tradeIns.filter(t => !q || [t.number, t.sellerName, t.sellerPhone, t.device, t.imei, t.sellerIdNumber].some(v => v.toLowerCase().includes(q)));
  const input = 'w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:bg-white';

  return (
    <div className="space-y-5" id="tab-tradeins" dir={ar ? 'rtl' : 'ltr'}>
      <div className="bg-gradient-to-l from-teal-700 to-teal-500 text-white rounded-2xl p-5 flex items-center gap-3">
        <div className="bg-white/15 p-3 rounded-xl"><Smartphone className="w-6 h-6" /></div>
        <div>
          <h2 className="text-xl font-black">{ar ? 'شرا تلفونات مستعملة' : 'Buy used phones'}</h2>
          <p className="text-teal-100 text-xs">{ar ? 'شرا جهاز من زبون، وبيصير معروض للبيع بالـ IMEI تبعو.' : 'Buy a phone from a customer and put it on sale by IMEI.'}</p>
        </div>
      </div>

      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm" id="tradein-form">
        <div className="md:col-span-3 font-black text-slate-700">👤 {ar ? 'البائع' : 'Seller'}</div>
        <input className={input} id="ti-seller" placeholder={ar ? 'الاسم الكامل *' : 'Full name *'} value={form.sellerName} onChange={e => setForm({ ...form, sellerName: e.target.value })} />
        <input className={`${input} font-mono`} id="ti-phone" dir="ltr" placeholder={ar ? 'التلفون *' : 'Phone *'} value={form.sellerPhone} onChange={e => setForm({ ...form, sellerPhone: e.target.value })} />
        <input className={`${input} font-mono`} id="ti-idnum" dir="ltr" placeholder={ar ? 'رقم الهوية / الباسبور *' : 'ID / passport no. *'} value={form.sellerIdNumber} onChange={e => setForm({ ...form, sellerIdNumber: e.target.value })} />

        <div className="md:col-span-3 font-black text-slate-700 pt-1">📱 {ar ? 'الجهاز' : 'Device'}</div>
        <input className={input} id="ti-device" placeholder={ar ? 'الجهاز (متلاً iPhone 12 64GB أسود) *' : 'Device *'} value={form.device} onChange={e => setForm({ ...form, device: e.target.value })} />
        <input className={`${input} font-mono`} id="ti-imei" dir="ltr" placeholder="IMEI *" value={form.imei} onChange={e => setForm({ ...form, imei: e.target.value })} />
        <div className="flex gap-1.5">
          {CONDITIONS.map(c => (
            <button key={c.id} type="button" data-condition={c.id} onClick={() => setForm({ ...form, condition: c.id })}
              className={`flex-1 rounded-xl border text-xs font-bold py-2 cursor-pointer ${form.condition === c.id ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
              {ar ? c.ar : c.en}
            </button>
          ))}
        </div>
        <input className={`${input} font-mono`} id="ti-battery" type="number" min="0" max="100" placeholder={ar ? 'صحة البطارية %' : 'Battery health %'} value={form.batteryHealth} onChange={e => setForm({ ...form, batteryHealth: e.target.value })} />
        <input className={`${input} md:col-span-2`} id="ti-notes" placeholder={ar ? 'ملاحظات (خدوش، تغيير شاشة، العلبة…)' : 'Notes'} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />

        <div className="md:col-span-3 font-black text-slate-700 pt-1">💵 {ar ? 'السعر' : 'Price'}</div>
        <input className={`${input} font-mono`} id="ti-paid" type="number" min="0" step="any" placeholder={ar ? 'سعر الشرا ($) *' : 'Buying price ($) *'} value={form.pricePaid} onChange={e => setForm({ ...form, pricePaid: e.target.value })} />
        <input className={`${input} font-mono`} id="ti-sell" type="number" min="0" step="any" placeholder={ar ? 'سعر المبيع ($) *' : 'Selling price ($) *'} value={form.sellPrice} onChange={e => setForm({ ...form, sellPrice: e.target.value })} />
        <input className={`${input} font-mono`} id="ti-warranty" type="number" min="0" placeholder={ar ? 'كفالة عند البيع (أشهر)' : 'Warranty when sold (months)'} value={form.warrantyMonths} onChange={e => setForm({ ...form, warrantyMonths: e.target.value })} />
        <div className="md:col-span-3 flex gap-2">
          {(['cash', 'exchange', 'credit'] as const).map(m => (
            <button key={m} type="button" data-payment={m} onClick={() => setForm({ ...form, payment: m })}
              className={`flex-1 rounded-xl border text-xs font-bold py-2 px-1 cursor-pointer ${form.payment === m ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
              {m === 'cash' ? (ar ? '💵 دفعتلو كاش' : '💵 Paid cash')
                : m === 'exchange' ? (ar ? '🔁 مقايضة بجهاز من المحل' : '🔁 Exchange for a device')
                : (ar ? '📒 رصيد على حسابو (لبعدين)' : '📒 Credit to his account')}
            </button>
          ))}
        </div>
        <p className="md:col-span-3 text-[11px] text-slate-500 -mt-1">
          {form.payment === 'cash' ? (ar ? 'بتعطيه حقّ الجهاز مصاري من الجارور.' : 'You pay him from the drawer.')
            : form.payment === 'exchange' ? (ar ? 'بياخد جهاز من عندك، وحقّ المستعمل بينحسم من سعرو. الفرق بيندفع كاش أو بيتسجّل.' : 'He takes a device from your stock; the used phone counts towards its price.')
            : (ar ? 'ما بتدفعلو شي هلّق: المبلغ بيتسجّل لصالحو بحسابات الزبائن وبينحسم من مشترياتو الجاية.' : 'Nothing paid now: the amount is kept on his account for later purchases.')}
        </p>
        {form.payment === 'exchange' && (() => {
          const stock = products.filter(p => p.quantity > 0 && matchesProductSearch(p, form.exSearch)).slice(0, 40);
          const exP = products.find(p => p.id === form.exProductId);
          const newPrice = parseFloat(form.exPrice) || exP?.priceUSD || 0;
          const tradeValue = parseFloat(form.pricePaid) || 0;
          const diff = Math.round((newPrice - tradeValue) * 100) / 100;
          return (
            <div className="md:col-span-3 bg-sky-50 border border-sky-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3" id="exchange-panel">
              <div className="md:col-span-3 font-black text-sky-900">🔁 {ar ? 'شو بدّو ياخد بدالو؟' : 'What does he take instead?'}</div>
              <input id="ex-search" className={input} placeholder={ar ? 'دوّر: اسم، باركود أو IMEI' : 'Search name, barcode or IMEI'} value={form.exSearch} onChange={e => setForm({ ...form, exSearch: e.target.value })} />
              <select id="ex-product" className={`${input} md:col-span-2`} value={form.exProductId}
                onChange={e => { const p = products.find(x => x.id === e.target.value); setForm({ ...form, exProductId: e.target.value, exImei: p?.trackSerial ? (p.serialNumbers || [])[0] || '' : '', exPrice: p ? String(p.priceUSD) : '' }); }}>
                <option value="">{ar ? '— اختار الجهاز من المخزن —' : '— choose from stock —'}</option>
                {stock.map(p => <option key={p.id} value={p.id}>{p.name} · {p.priceUSD.toFixed(2)}$ · {ar ? 'متوفر' : 'qty'} {p.quantity}</option>)}
              </select>
              {exP?.trackSerial && (
                <select id="ex-imei" className={`${input} font-mono`} value={form.exImei} onChange={e => setForm({ ...form, exImei: e.target.value })}>
                  {(exP.serialNumbers || []).map(sn => <option key={sn} value={sn}>IMEI {sn}</option>)}
                </select>
              )}
              {exP && (
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  {ar ? 'سعر الجديد ($)' : 'New price ($)'}
                  <input id="ex-price" type="number" min="0" step="any" className={`${input} font-mono`} value={form.exPrice} onChange={e => setForm({ ...form, exPrice: e.target.value })} />
                </label>
              )}
              {exP && tradeValue > 0 && (
                <div className="md:col-span-3 bg-white rounded-xl border border-sky-200 p-3 text-sm space-y-2" id="exchange-summary">
                  <div className="font-mono text-slate-700">{newPrice.toFixed(2)}$ {ar ? '(الجديد)' : '(new)'} − {tradeValue.toFixed(2)}$ {ar ? '(المستعمل)' : '(used)'} = <b>{Math.abs(diff).toFixed(2)}$</b></div>
                  {diff > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-emerald-700">{ar ? `الزبون بيدفعلك ${diff.toFixed(2)}$` : `Customer pays ${diff.toFixed(2)}$`}</span>
                      {(['cash', 'debt'] as const).map(m => (
                        <button key={m} type="button" data-diff-method={m} onClick={() => setForm({ ...form, diffMethod: m })}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${form.diffMethod === m ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                          {m === 'cash' ? (ar ? '💵 كاش' : '💵 Cash') : (ar ? '📒 دين على حسابو' : '📒 On account')}
                        </button>
                      ))}
                    </div>
                  ) : diff < 0 ? (
                    <div className="font-black text-rose-700">{ar ? `إنت بتدفعلو ${(-diff).toFixed(2)}$ كاش (بيتسجّل بفاتورة الشرا)` : `You pay him ${(-diff).toFixed(2)}$`}</div>
                  ) : (
                    <div className="font-black text-slate-700">{ar ? 'راس براس، ما في فرق.' : 'Even swap.'}</div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
        {(parseFloat(form.sellPrice) || 0) > 0 && (parseFloat(form.pricePaid) || 0) > 0 && (
          <div className="md:col-span-3 text-xs font-bold text-teal-800 bg-teal-50 rounded-xl px-3 py-2" id="ti-margin">
            {ar ? 'ربحك المتوقع' : 'Expected profit'}: {((parseFloat(form.sellPrice) || 0) - (parseFloat(form.pricePaid) || 0)).toFixed(2)}$
          </div>
        )}
        <button type="submit" id="btn-save-tradein" className="md:col-span-3 bg-teal-600 hover:bg-teal-700 text-white font-black py-2.5 rounded-xl cursor-pointer">
          {ar ? 'شرا الجهاز وطباعة السند 🖨️' : 'Buy and print receipt 🖨️'}
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-black text-slate-800">{ar ? 'سجل الأجهزة المشتراة' : 'Bought phones'} <span className="font-mono text-slate-400 text-sm">{tradeIns.length}</span></h3>
          <div className="relative w-64 max-w-full">
            <Search className="w-4 h-4 absolute top-2.5 right-3 text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={ar ? 'بحث: الاسم، التلفون، IMEI، الهوية' : 'Search'} className={`${input} pr-9`} />
          </div>
        </div>
        {shown.length === 0 ? <p className="text-slate-400 text-sm">{ar ? 'ما في أجهزة بعد.' : 'None yet.'}</p> : (
          <div className="divide-y divide-slate-100">
            {shown.map(t => {
              const prod = products.find(p => p.id === t.productId);
              const sold = prod ? prod.quantity <= 0 : true;
              return (
                <div key={t.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm" data-tradein={t.number}>
                  <div>
                    <div className="font-black text-slate-800">{t.device} <span className="text-xs font-mono text-slate-400" dir="ltr">{t.number}</span></div>
                    <div className="text-xs text-slate-500">
                      <span dir="ltr" className="font-mono">IMEI {t.imei}</span> · {t.sellerName} · <span dir="ltr">{t.sellerPhone}</span> · <span dir="ltr">{t.date}</span>
                      {t.exchange && (
                        <div className="text-sky-700 font-bold" data-tradein-exchange>
                          🔁 {ar ? 'مقابل' : 'for'} {t.exchange.productName}
                          {t.exchange.differenceUSD > 0 ? ` · ${ar ? 'دفع فرق' : 'paid'} ${t.exchange.differenceUSD.toFixed(2)}$` : t.exchange.differenceUSD < 0 ? ` · ${ar ? 'دفعنا فرق' : 'we paid'} ${(-t.exchange.differenceUSD).toFixed(2)}$` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono">{t.pricePaidUSD.toFixed(2)}$ → {t.sellPriceUSD.toFixed(2)}$</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold ${sold ? 'bg-violet-100 text-violet-800' : 'bg-emerald-100 text-emerald-800'}`}>{sold ? (ar ? 'انباع' : 'Sold') : (ar ? 'معروض' : 'On sale')}</span>
                    <button type="button" onClick={() => printTradeInReceipt(t, settings)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer" title={ar ? 'طباعة السند' : 'Print'}>
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
