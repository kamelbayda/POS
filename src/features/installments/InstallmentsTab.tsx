import React, { useMemo, useState } from 'react';
import { CalendarClock, Printer, MessageCircle, Plus, X } from 'lucide-react';
import { Customer, InstallmentPlan, Invoice, SystemSettings } from '../../types';
import * as storage from '../../lib/storage';
import { addMonths } from '../../lib/serials';
import { applyPayment, buildSchedule, nextDueOf, overdueOf, remainingOf } from '../../lib/installments';
import { printInstallmentPlan } from './installmentPrint';
import type { ServiceSale } from '../topups/TopupsTab';

interface InstallmentsTabProps {
  lang: 'ar' | 'en';
  sysDate: string;
  settings: SystemSettings;
  plans: InstallmentPlan[];
  setPlans: (rows: InstallmentPlan[]) => void;
  invoices: Invoice[];
  customers: Customer[];
  setCustomers: (rows: Customer[]) => void;
  showToast: (type: 'success' | 'error' | 'warning', message: string) => void;
  onMarkup: (sale: ServiceSale) => Invoice | null;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const MONTH_PICKS = [3, 6, 9, 12, 18, 24];
type Filter = 'active' | 'overdue' | 'done' | 'all';

/** Phone shops: split what a customer owes into monthly dues, collect them and chase late ones. */
export function InstallmentsTab({ lang, sysDate, settings, plans, setPlans, invoices, customers, setCustomers, showToast, onMarkup }: InstallmentsTabProps) {
  const ar = lang === 'ar';
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<Filter>('active');
  const [f, setF] = useState({ customerId: '', invoiceId: '', description: '', price: '', down: '', markup: '0', months: '6', firstDue: addMonths(sysDate, 1), guarantorName: '', guarantorPhone: '' });
  const [paying, setPaying] = useState<InstallmentPlan | null>(null);
  const [payAmount, setPayAmount] = useState('');

  const customer = customers.find(c => c.id === f.customerId);
  const debtInvoices = useMemo(
    () => invoices.filter(inv => inv.customerId === f.customerId && inv.paymentMethod === 'debt').slice(0, 30),
    [invoices, f.customerId],
  );
  const price = parseFloat(f.price) || 0;
  const down = parseFloat(f.down) || 0;
  const months = Math.max(1, parseInt(f.months) || 1);
  const markupPct = parseFloat(f.markup) || 0;
  const financed = r2(price - down);
  const markupUSD = r2(financed * markupPct / 100);
  const total = r2(financed + markupUSD);

  const pickInvoice = (id: string) => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) { setF({ ...f, invoiceId: '' }); return; }
    const owed = r2(inv.totalUSD - (inv.paidAmountUSD || 0));
    const desc = inv.items.map(it => `${it.productName}${it.serials?.length ? ` (IMEI ${it.serials.join(', ')})` : ''}`).join(' + ');
    setF({ ...f, invoiceId: id, price: String(owed), description: desc });
  };

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) { showToast('error', ar ? 'اختار الزبون (لازم يكون مسجّل بحسابات الزبائن).' : 'Choose a registered customer.'); return; }
    if (!f.description.trim() || price <= 0) { showToast('error', ar ? 'اكتب البضاعة والسعر.' : 'Enter the item and price.'); return; }
    if (down < 0 || down >= price) { showToast('error', ar ? 'الدفعة الأولى لازم تكون أقل من السعر.' : 'Down payment must be less than the price.'); return; }
    if (price > customer.creditBalance + 0.01) {
      showToast('error', ar
        ? `دين ${customer.name} الحالي ${customer.creditBalance.toFixed(2)}$ بس. بيع الجهاز أوّل من شاشة البيع "دين/آجل" على هالزبون، وبعدين اعمل الخطة.`
        : `${customer.name} only owes ${customer.creditBalance.toFixed(2)}$. Sell the item on credit at the till first.`);
      return;
    }
    const max = plans.reduce((m, p) => Math.max(m, parseInt(p.number.replace(/\D/g, '')) || 0), 0);
    const number = `INS-${String(max + 1).padStart(4, '0')}`;
    const id = `ins-${Date.now()}`;
    // The instalment markup is income: recorded as its own sale on the customer's account
    if (markupUSD > 0) {
      const inv = onMarkup({ productId: `installment-${id}`, name: `${ar ? 'زيادة تقسيط' : 'Instalment markup'} ${number}`, priceUSD: markupUSD, costUSD: 0, paymentMethod: 'debt', paidNowUSD: 0, customerId: customer.id, keepBalance: true });
      if (!inv) return;
    }
    const plan: InstallmentPlan = {
      id, number, date: sysDate,
      customerId: customer.id, customerName: customer.name, customerPhone: customer.phone || '',
      description: f.description.trim(),
      ...(f.invoiceId ? { invoiceId: f.invoiceId } : {}),
      priceUSD: price, downPaymentUSD: down, markupPercent: markupPct, totalUSD: total, months,
      ...(f.guarantorName.trim() ? { guarantorName: f.guarantorName.trim(), guarantorPhone: f.guarantorPhone.trim() } : {}),
      schedule: buildSchedule(total, months, f.firstDue || addMonths(sysDate, 1)),
      payments: down > 0 ? [{ date: sysDate, amountUSD: down }] : [],
      status: 'active',
    };
    // Down payment collected now, markup added to what they owe
    const nextCustomers = customers.map(c => (c.id === customer.id ? { ...c, creditBalance: r2(c.creditBalance - down + markupUSD) } : c));
    setCustomers(nextCustomers);
    storage.setJSON('pos_customers', nextCustomers);
    setPlans([plan, ...plans]);
    showToast('success', ar ? `انعملت خطة ${number}: ${months} أقساط × ${plan.schedule[0].amountUSD.toFixed(2)}$` : `Plan ${number} created`);
    setShowForm(false);
    setF({ customerId: '', invoiceId: '', description: '', price: '', down: '', markup: '0', months: '6', firstDue: addMonths(sysDate, 1), guarantorName: '', guarantorPhone: '' });
    printInstallmentPlan(plan, settings);
  };

  const openPay = (p: InstallmentPlan) => {
    const next = nextDueOf(p);
    setPaying(p);
    setPayAmount(next ? r2(next.amountUSD - next.paidUSD).toString() : '');
  };

  const collect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paying) return;
    const amt = r2(parseFloat(payAmount) || 0);
    const left = remainingOf(paying);
    if (amt <= 0) { showToast('error', ar ? 'اكتب المبلغ.' : 'Enter the amount.'); return; }
    if (amt > left + 0.001) { showToast('error', ar ? `الباقي عالخطة ${left.toFixed(2)}$ بس.` : `Only ${left.toFixed(2)}$ left.`); return; }
    const updated = applyPayment(paying, amt, sysDate);
    setPlans(plans.map(p => (p.id === updated.id ? updated : p)));
    const nextCustomers = customers.map(c => (c.id === paying.customerId ? { ...c, creditBalance: r2(Math.max(0, c.creditBalance - amt)) } : c));
    setCustomers(nextCustomers);
    storage.setJSON('pos_customers', nextCustomers);
    showToast('success', updated.status === 'done'
      ? (ar ? `🎉 خلصت أقساط ${paying.customerName} (${paying.number}).` : 'Plan fully paid.')
      : (ar ? `انقبض ${amt.toFixed(2)}$ من ${paying.customerName}. الباقي ${remainingOf(updated).toFixed(2)}$` : `Collected ${amt.toFixed(2)}$`));
    setPaying(null);
  };

  const remind = (p: InstallmentPlan) => {
    const phone = p.customerPhone.replace(/[^0-9]/g, '');
    if (!phone) { showToast('error', ar ? 'ما في رقم تلفون للزبون.' : 'No customer phone.'); return; }
    const intl = phone.startsWith('961') ? phone : phone.startsWith('0') ? `961${phone.slice(1)}` : `961${phone}`;
    const late = overdueOf(p, sysDate);
    const next = nextDueOf(p);
    const lateSum = late.reduce((s, d) => s + d.amountUSD - d.paidUSD, 0);
    const text = late.length
      ? `مرحبا ${p.customerName} 👋\nتذكير: عليك ${late.length > 1 ? `${late.length} أقساط متأخرة` : 'قسط متأخر'} بقيمة ${lateSum.toFixed(2)}$ (من تاريخ ${late[0].dueDate}).\nرقم الخطة: ${p.number}\nالباقي الكامل: ${remainingOf(p).toFixed(2)}$\nشكراً 🙏\n${settings.shopName}`
      : `مرحبا ${p.customerName} 👋\nتذكير بقسطك القادم ${next ? `${(next.amountUSD - next.paidUSD).toFixed(2)}$ بتاريخ ${next.dueDate}` : ''}.\nرقم الخطة: ${p.number}\n${settings.shopName}`;
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const active = plans.filter(p => p.status === 'active');
  const overduePlans = active.filter(p => overdueOf(p, sysDate).length > 0);
  const outstanding = active.reduce((s, p) => s + remainingOf(p), 0);
  const monthKey = sysDate.slice(0, 7);
  const dueThisMonth = active.reduce((s, p) => s + p.schedule.filter(d => d.dueDate.startsWith(monthKey)).reduce((x, d) => x + d.amountUSD - d.paidUSD, 0), 0);
  const shown = filter === 'all' ? plans : filter === 'done' ? plans.filter(p => p.status === 'done') : filter === 'overdue' ? overduePlans : active;
  const input = 'w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:bg-white';
  const label = 'text-xs font-bold text-slate-600';

  return (
    <div className="space-y-5" id="tab-installments" dir={ar ? 'rtl' : 'ltr'}>
      <div className="bg-gradient-to-l from-indigo-700 to-indigo-500 text-white rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/15 p-3 rounded-xl"><CalendarClock className="w-6 h-6" /></div>
          <div>
            <h2 className="text-xl font-black">{ar ? 'التقسيط' : 'Instalments'}</h2>
            <p className="text-indigo-100 text-xs">{ar ? 'بيع الجهاز "دين" من شاشة البيع، وبعدين قسّط المبلغ هون.' : 'Sell on credit at the till, then split it here.'}</p>
          </div>
        </div>
        <div className="flex gap-3 text-center" id="installments-summary">
          <div className="bg-white/10 rounded-xl px-4 py-2"><div className="text-[11px] opacity-80">{ar ? 'المبالغ الباقية' : 'Outstanding'}</div><div className="font-black font-mono">{outstanding.toFixed(2)}$</div></div>
          <div className="bg-white/10 rounded-xl px-4 py-2"><div className="text-[11px] opacity-80">{ar ? 'مستحق هالشهر' : 'Due this month'}</div><div className="font-black font-mono">{dueThisMonth.toFixed(2)}$</div></div>
          <div className={`rounded-xl px-4 py-2 ${overduePlans.length ? 'bg-rose-500' : 'bg-white/10'}`}><div className="text-[11px] opacity-80">{ar ? 'متأخرين' : 'Overdue'}</div><div className="font-black font-mono" data-overdue-count>{overduePlans.length}</div></div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {([['active', ar ? 'جارية' : 'Active'], ['overdue', ar ? 'متأخرة' : 'Overdue'], ['done', ar ? 'خالصة' : 'Paid off'], ['all', ar ? 'الكل' : 'All']] as [Filter, string][]).map(([k, l]) => (
            <button key={k} type="button" data-ins-filter={k} onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${filter === k ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>{l}</button>
          ))}
        </div>
        <button type="button" id="btn-new-installment" onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm px-4 py-2 rounded-xl cursor-pointer">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {ar ? 'خطة تقسيط جديدة' : 'New plan'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} id="installment-form" className="bg-white border border-slate-200 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <label className="space-y-1"><span className={label}>{ar ? 'الزبون *' : 'Customer *'}</span>
            <select id="ins-customer" className={input} value={f.customerId} onChange={e => setF({ ...f, customerId: e.target.value, invoiceId: '' })}>
              <option value="">{ar ? '— اختار —' : '— choose —'}</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''} · {ar ? 'دين' : 'owes'} {c.creditBalance.toFixed(2)}$</option>)}
            </select></label>
          <label className="space-y-1 md:col-span-2"><span className={label}>{ar ? 'فاتورة البيع بالدين' : 'Credit sale invoice'}</span>
            <select id="ins-invoice" className={input} value={f.invoiceId} onChange={e => pickInvoice(e.target.value)} disabled={!f.customerId}>
              <option value="">{ar ? '— بدون / اختار فاتورة —' : '— none —'}</option>
              {debtInvoices.map(inv => <option key={inv.id} value={inv.id}>{inv.invoiceNumber} · {inv.date} · {inv.totalUSD.toFixed(2)}$ · {inv.items.map(i => i.productName).join(', ').slice(0, 50)}</option>)}
            </select></label>
          <label className="space-y-1 md:col-span-3"><span className={label}>{ar ? 'البضاعة *' : 'Item *'}</span>
            <input id="ins-description" className={input} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder={ar ? 'متلاً iPhone 15 128GB (IMEI …)' : 'e.g. iPhone 15'} /></label>
          <label className="space-y-1"><span className={label}>{ar ? 'المبلغ المستحق ($) *' : 'Amount owed ($) *'}</span>
            <input id="ins-price" type="number" min="0" step="any" className={`${input} font-mono`} value={f.price} onChange={e => setF({ ...f, price: e.target.value })} /></label>
          <label className="space-y-1"><span className={label}>{ar ? 'الدفعة الأولى ($)' : 'Down payment ($)'}</span>
            <input id="ins-down" type="number" min="0" step="any" className={`${input} font-mono`} value={f.down} onChange={e => setF({ ...f, down: e.target.value })} /></label>
          <label className="space-y-1"><span className={label}>{ar ? 'زيادة التقسيط (%)' : 'Markup (%)'}</span>
            <input id="ins-markup" type="number" min="0" step="any" className={`${input} font-mono`} value={f.markup} onChange={e => setF({ ...f, markup: e.target.value })} /></label>
          <div className="space-y-1 md:col-span-2"><span className={label}>{ar ? 'عدد الأشهر' : 'Months'}</span>
            <div className="flex flex-wrap gap-1.5 items-center">
              {MONTH_PICKS.map(m => (
                <button key={m} type="button" data-ins-months={m} onClick={() => setF({ ...f, months: String(m) })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${months === m ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>{m}</button>
              ))}
              <input id="ins-months" type="number" min="1" className={`${input} font-mono w-20`} value={f.months} onChange={e => setF({ ...f, months: e.target.value })} />
            </div></div>
          <label className="space-y-1"><span className={label}>{ar ? 'أول قسط بتاريخ' : 'First due'}</span>
            <input id="ins-first-due" type="date" className={`${input} font-mono`} value={f.firstDue} onChange={e => setF({ ...f, firstDue: e.target.value })} /></label>
          <label className="space-y-1"><span className={label}>{ar ? 'الكفيل (اختياري)' : 'Guarantor'}</span>
            <input id="ins-guarantor" className={input} value={f.guarantorName} onChange={e => setF({ ...f, guarantorName: e.target.value })} /></label>
          <label className="space-y-1"><span className={label}>{ar ? 'تلفون الكفيل' : 'Guarantor phone'}</span>
            <input id="ins-guarantor-phone" dir="ltr" className={`${input} font-mono`} value={f.guarantorPhone} onChange={e => setF({ ...f, guarantorPhone: e.target.value })} /></label>
          {price > 0 && (
            <div className="md:col-span-3 bg-indigo-50 text-indigo-900 rounded-xl px-3 py-2 text-xs font-bold" id="ins-preview">
              {ar ? 'الباقي بعد الدفعة الأولى' : 'After down payment'} {financed.toFixed(2)}$
              {markupUSD > 0 && <> + {ar ? 'زيادة' : 'markup'} {markupUSD.toFixed(2)}$</>} = {total.toFixed(2)}$ → <span className="text-base">{months} × {(total / months).toFixed(2)}$</span>
            </div>
          )}
          <button type="submit" id="btn-save-installment" className="md:col-span-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 rounded-xl cursor-pointer">
            {ar ? 'حفظ الخطة وطباعة العقد 🖨️' : 'Save and print agreement 🖨️'}
          </button>
        </form>
      )}

      {paying && (
        <form onSubmit={collect} id="installment-pay" className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-wrap items-end gap-3 text-sm">
          <div className="w-full font-black text-emerald-900">{ar ? `قبض قسط من ${paying.customerName} (${paying.number}) — الباقي ${remainingOf(paying).toFixed(2)}$` : `Collect from ${paying.customerName}`}</div>
          <input id="ins-pay-amount" type="number" min="0" step="any" className={`${input} font-mono w-40`} value={payAmount} onChange={e => setPayAmount(e.target.value)} />
          <button type="submit" id="btn-confirm-ins-pay" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 py-2 rounded-xl cursor-pointer">{ar ? 'قبض' : 'Collect'}</button>
          <button type="button" onClick={() => setPaying(null)} className="bg-white border border-slate-200 font-bold px-4 py-2 rounded-xl cursor-pointer">{ar ? 'إلغاء' : 'Cancel'}</button>
        </form>
      )}

      {shown.length === 0 ? <p className="text-slate-400 text-sm">{ar ? 'ما في خطط هون.' : 'No plans.'}</p> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {shown.map(p => {
            const late = overdueOf(p, sysDate);
            const paidCount = p.schedule.filter(d => d.paidUSD >= d.amountUSD).length;
            const next = nextDueOf(p);
            return (
              <div key={p.id} data-plan={p.number} className={`bg-white border rounded-2xl p-4 space-y-3 ${late.length ? 'border-rose-300' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-black text-slate-800">{p.customerName} <span className="text-xs font-mono text-slate-400" dir="ltr">{p.number}</span></div>
                    <div className="text-xs text-slate-500">{p.description}</div>
                  </div>
                  <span data-plan-status className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${p.status === 'done' ? 'bg-emerald-100 text-emerald-800' : late.length ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800'}`}>
                    {p.status === 'done' ? (ar ? 'خالصة' : 'Paid off') : late.length ? (ar ? `متأخر ${late.length}` : `${late.length} late`) : (ar ? 'جارية' : 'Active')}
                  </span>
                </div>
                <div className="flex gap-1">
                  {p.schedule.map((d, i) => (
                    <div key={i} title={`${d.dueDate} · ${d.amountUSD.toFixed(2)}$`}
                      className={`h-2 flex-1 rounded-full ${d.paidUSD >= d.amountUSD ? 'bg-emerald-500' : d.dueDate < sysDate ? 'bg-rose-500' : d.paidUSD > 0 ? 'bg-amber-400' : 'bg-slate-200'}`} />
                  ))}
                </div>
                <div className="flex flex-wrap justify-between text-xs text-slate-600 gap-1">
                  <span>{ar ? 'مدفوع' : 'Paid'} {paidCount}/{p.months}</span>
                  <span>{ar ? 'الباقي' : 'Left'} <b className="font-mono" data-plan-left>{remainingOf(p).toFixed(2)}$</b></span>
                  {next && <span>{ar ? 'القسط الجاي' : 'Next'} <span className="font-mono">{(next.amountUSD - next.paidUSD).toFixed(2)}$ · {next.dueDate}</span></span>}
                </div>
                <div className="flex gap-2">
                  {p.status === 'active' && (
                    <button type="button" data-plan-pay onClick={() => openPay(p)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-2 rounded-xl cursor-pointer">{ar ? '💵 قبض قسط' : 'Collect'}</button>
                  )}
                  {p.status === 'active' && (
                    <button type="button" data-plan-remind onClick={() => remind(p)} className="flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer"><MessageCircle className="w-3.5 h-3.5" /> {ar ? 'تذكير' : 'Remind'}</button>
                  )}
                  <button type="button" onClick={() => printInstallmentPlan(p, settings)} className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer"><Printer className="w-3.5 h-3.5" /> {ar ? 'العقد' : 'Print'}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
