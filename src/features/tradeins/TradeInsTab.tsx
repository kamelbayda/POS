import React, { useState } from 'react';
import { Smartphone, Printer, Search } from 'lucide-react';
import { Category, Customer, Product, PurchaseInvoice, SystemSettings, TradeIn } from '../../types';
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
}

const empty = { sellerName: '', sellerPhone: '', sellerIdNumber: '', device: '', imei: '', condition: 'good' as TradeIn['condition'], batteryHealth: '', notes: '', pricePaid: '', sellPrice: '', warrantyMonths: '', payment: 'cash' as TradeIn['payment'] };

/** Phone shops: buy a used phone from a customer and put it on sale. */
export function TradeInsTab(props: TradeInsTabProps) {
  const { lang, sysDate, settings, tradeIns, setTradeIns, products, setProducts, categories, setCategories, purchaseInvoices, setPurchaseInvoices, customers, setCustomers, showToast } = props;
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
    const nextProducts = [product, ...products];
    setProducts(nextProducts);
    storage.setJSON('pos_products', nextProducts);
    if (!categories.some(c => c.id === USED_CATEGORY.id)) {
      setCategories(prev => {
        const next = [...prev, USED_CATEGORY];
        storage.setJSON('pos_categories', next);
        return next;
      });
    }

    // Recorded with the purchases (money paid out for stock)
    const purchase: PurchaseInvoice = {
      id: `pur-inv-${Date.now()}`,
      invoiceNumber: nextNumber(),
      supplierName: `${form.sellerName.trim()} (${ar ? 'زبون' : 'customer'})`,
      date: sysDate,
      items: [{ id: `pur-item-${Date.now()}`, productId: product.id, productName: product.name, qty: 1, costPriceUSD: paid, newPriceUSD: sell, serials: [imei] }],
      totalAmountUSD: paid,
      paymentStatus: 'paid',
      note: ar ? `شرا جهاز مستعمل ${form.payment === 'credit' ? '(رصيد على حساب الزبون)' : '(نقداً)'}` : `Used phone ${form.payment === 'credit' ? '(customer credit)' : '(cash)'}`,
      destination: 'shop',
    };
    const nextPurchases = [purchase, ...purchaseInvoices];
    setPurchaseInvoices(nextPurchases);
    storage.setJSON('pos_purchases', nextPurchases);

    // Trade-in: the price goes to the customer's account (lowers what they owe, may go below zero)
    if (form.payment === 'credit' && customer) {
      const nextCustomers = customers.map(c => (c.id === customer.id ? { ...c, creditBalance: c.creditBalance - paid } : c));
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
    };
    setTradeIns([record, ...tradeIns]);
    setForm(empty);
    showToast('success', ar ? `انشرى الجهاز (${record.number}) وصار معروض للبيع بـ ${sell.toFixed(2)}$ 📱` : `Bought (${record.number}); on sale at ${sell.toFixed(2)}$`);
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
          {(['cash', 'credit'] as const).map(m => (
            <button key={m} type="button" data-payment={m} onClick={() => setForm({ ...form, payment: m })}
              className={`flex-1 rounded-xl border text-xs font-bold py-2 cursor-pointer ${form.payment === m ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
              {m === 'cash' ? (ar ? '💵 دفعتلو كاش' : '💵 Paid cash') : (ar ? '🔄 رصيد على حسابو (مقايضة بجهاز جديد)' : '🔄 Credit to his account (trade-in)')}
            </button>
          ))}
        </div>
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
