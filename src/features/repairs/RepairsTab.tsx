import React, { useMemo, useState } from 'react';
import { Wrench, Printer, MessageCircle, Search, Plus, X } from 'lucide-react';
import { Customer, RepairStatus, RepairTicket, SystemSettings } from '../../types';
import { normalizeSerial } from '../../lib/serials';
import { printRepairTicket } from './repairTicketPrint';

export const REPAIR_STATUSES: Array<{ id: RepairStatus; ar: string; en: string; cls: string }> = [
  { id: 'received', ar: '📥 مستلم', en: 'Received', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  { id: 'in_progress', ar: '🔧 عم يتصلّح', en: 'In repair', cls: 'bg-sky-100 text-sky-800 border-sky-200' },
  { id: 'waiting_parts', ar: '⏳ ناطر قطعة', en: 'Waiting parts', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'ready', ar: '✅ جاهز', en: 'Ready', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'delivered', ar: '🤝 تسلّم', en: 'Delivered', cls: 'bg-violet-100 text-violet-800 border-violet-200' },
  { id: 'cancelled', ar: '✖ ملغى', en: 'Cancelled', cls: 'bg-rose-100 text-rose-700 border-rose-200' },
];
const statusInfo = (s: RepairStatus) => REPAIR_STATUSES.find(x => x.id === s)!;

interface RepairsTabProps {
  lang: 'ar' | 'en';
  sysDate: string;
  settings: SystemSettings;
  repairs: RepairTicket[];
  setRepairs: (rows: RepairTicket[]) => void;
  customers: Customer[];
  showToast: (type: 'success' | 'error' | 'warning', message: string) => void;
  /** Creates the sales invoice for a delivered repair and returns its id. */
  onDeliver: (ticket: RepairTicket, finalCostUSD: number, partsCostUSD: number, paymentMethod: 'cash' | 'debt') => string | null;
}

const emptyForm = { customerName: '', customerPhone: '', device: '', imei: '', problem: '', accessories: '', devicePasscode: '', estimate: '', deposit: '', expectedDate: '' };

export function RepairsTab({ lang, sysDate, settings, repairs, setRepairs, customers, showToast, onDeliver }: RepairsTabProps) {
  const ar = lang === 'ar';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState<RepairStatus | 'open' | 'all'>('open');
  const [query, setQuery] = useState('');
  const [delivering, setDelivering] = useState<RepairTicket | null>(null);
  const [finalCost, setFinalCost] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'debt'>('cash');

  const nextNumber = () => {
    const max = repairs.reduce((m, r) => Math.max(m, parseInt(r.ticketNumber.replace(/\D/g, '')) || 0), 0);
    return `REP-${String(max + 1).padStart(4, '0')}`;
  };

  const save = (rows: RepairTicket[]) => setRepairs(rows);
  const update = (id: string, patch: Partial<RepairTicket>, historyNote?: string) => {
    save(repairs.map(r => {
      if (r.id !== id) return r;
      const next = { ...r, ...patch };
      if (patch.status && patch.status !== r.status) next.history = [...r.history, { date: sysDate, status: patch.status, ...(historyNote ? { note: historyNote } : {}) }];
      return next;
    }));
  };

  const whatsapp = (r: RepairTicket, kind: 'received' | 'ready') => {
    const phone = r.customerPhone.replace(/[^0-9]/g, '');
    if (!phone) { showToast('error', ar ? 'ما في رقم تلفون للزبون.' : 'No customer phone.'); return; }
    const intl = phone.startsWith('961') ? phone : phone.startsWith('0') ? `961${phone.slice(1)}` : `961${phone}`;
    const left = Math.max(0, (r.finalCostUSD ?? r.estimateUSD) - r.depositUSD);
    const text = kind === 'ready'
      ? `مرحبا ${r.customerName} 👋\nجهازك ${r.device} صار جاهز للاستلام ✅\nرقم التذكرة: ${r.ticketNumber}\nالمبلغ المتبقي: ${left.toFixed(2)}$\n${settings.shopName}`
      : `مرحبا ${r.customerName} 👋\nاستلمنا جهازك ${r.device} للتصليح.\nرقم التذكرة: ${r.ticketNumber}\nالكلفة التقريبية: ${r.estimateUSD.toFixed(2)}$${r.depositUSD > 0 ? `\nالعربون: ${r.depositUSD.toFixed(2)}$` : ''}\nمنخبرك أول ما يجهز.\n${settings.shopName}`;
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.customerPhone.trim() || !form.device.trim() || !form.problem.trim()) {
      showToast('error', ar ? 'عبّي اسم الزبون، التلفون، الجهاز والعطل.' : 'Fill in customer, phone, device and problem.');
      return;
    }
    const existing = customers.find(c => c.phone && c.phone.replace(/\D/g, '') === form.customerPhone.replace(/\D/g, ''));
    const ticket: RepairTicket = {
      id: `rep-${Date.now()}`,
      ticketNumber: nextNumber(),
      date: sysDate,
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      ...(existing ? { customerId: existing.id } : {}),
      device: form.device.trim(),
      ...(form.imei.trim() ? { imei: normalizeSerial(form.imei) } : {}),
      problem: form.problem.trim(),
      ...(form.accessories.trim() ? { accessories: form.accessories.trim() } : {}),
      ...(form.devicePasscode.trim() ? { devicePasscode: form.devicePasscode.trim() } : {}),
      estimateUSD: parseFloat(form.estimate) || 0,
      depositUSD: parseFloat(form.deposit) || 0,
      ...(form.expectedDate ? { expectedDate: form.expectedDate } : {}),
      status: 'received',
      history: [{ date: sysDate, status: 'received' }],
    };
    save([ticket, ...repairs]);
    setForm(emptyForm);
    setShowForm(false);
    showToast('success', ar ? `انفتحت تذكرة ${ticket.ticketNumber} 🔧` : `Ticket ${ticket.ticketNumber} opened`);
    printRepairTicket(ticket, settings);
  };

  const openDelivery = (r: RepairTicket) => {
    setDelivering(r);
    setFinalCost(String(r.finalCostUSD ?? r.estimateUSD));
    setPartsCost(r.partsCostUSD ? String(r.partsCostUSD) : '');
    setPayMethod('cash');
  };
  const confirmDelivery = () => {
    if (!delivering) return;
    const fc = parseFloat(finalCost) || 0;
    const pc = parseFloat(partsCost) || 0;
    if (payMethod === 'debt' && !delivering.customerId) {
      showToast('error', ar ? 'الدين بدّو زبون مسجّل بنفس رقم التلفون بحسابات الزبائن.' : 'Credit needs a registered customer with this phone.');
      return;
    }
    const invoiceId = onDeliver(delivering, fc, pc, payMethod);
    if (!invoiceId) return;
    update(delivering.id, { status: 'delivered', finalCostUSD: fc, partsCostUSD: pc, deliveredAt: sysDate, invoiceId });
    setDelivering(null);
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: repairs.length, open: 0 };
    for (const r of repairs) {
      c[r.status] = (c[r.status] || 0) + 1;
      if (r.status !== 'delivered' && r.status !== 'cancelled') c.open += 1;
    }
    return c;
  }, [repairs]);

  const q = query.trim().toLowerCase();
  const shown = repairs.filter(r => {
    if (filter === 'open' && (r.status === 'delivered' || r.status === 'cancelled')) return false;
    if (filter !== 'open' && filter !== 'all' && r.status !== filter) return false;
    if (!q) return true;
    return [r.ticketNumber, r.customerName, r.customerPhone, r.device, r.imei || ''].some(v => v.toLowerCase().includes(q));
  });

  const input = 'w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:bg-white';

  return (
    <div className="space-y-5" id="tab-repairs" dir={ar ? 'rtl' : 'ltr'}>
      <div className="bg-gradient-to-l from-sky-700 to-sky-500 text-white rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-white/15 p-3 rounded-xl"><Wrench className="w-6 h-6" /></div>
          <div>
            <h2 className="text-xl font-black">{ar ? 'قسم التصليح' : 'Repairs'}</h2>
            <p className="text-sky-100 text-xs">{ar ? 'استلام الأجهزة، متابعة التصليح، وتسليمها للزبون.' : 'Receive devices, follow repairs and hand them back.'}</p>
          </div>
        </div>
        <button type="button" id="btn-new-repair" onClick={() => setShowForm(v => !v)} className="bg-white text-sky-800 font-black px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {ar ? 'استلام جهاز جديد' : 'Receive a device'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm" id="repair-form">
          <input className={input} id="rep-customer" placeholder={ar ? 'اسم الزبون *' : 'Customer name *'} value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} list="rep-customers" />
          <datalist id="rep-customers">{customers.map(c => <option key={c.id} value={c.name}>{c.phone}</option>)}</datalist>
          <input className={`${input} font-mono`} id="rep-phone" dir="ltr" placeholder={ar ? 'تلفون الزبون *' : 'Phone *'} value={form.customerPhone}
            onChange={e => setForm({ ...form, customerPhone: e.target.value })}
            onBlur={() => { if (!form.customerPhone) { const c = customers.find(x => x.name === form.customerName); if (c?.phone) setForm(f => ({ ...f, customerPhone: c.phone })); } }} />
          <input className={input} id="rep-device" placeholder={ar ? 'الجهاز (متلاً iPhone 13 Pro) *' : 'Device *'} value={form.device} onChange={e => setForm({ ...form, device: e.target.value })} />
          <input className={`${input} font-mono`} id="rep-imei" dir="ltr" placeholder="IMEI" value={form.imei} onChange={e => setForm({ ...form, imei: e.target.value })} />
          <input className={`${input} md:col-span-2`} id="rep-problem" placeholder={ar ? 'العطل (متلاً شاشة مكسورة، ما عم يشحن) *' : 'Problem *'} value={form.problem} onChange={e => setForm({ ...form, problem: e.target.value })} />
          <input className={input} id="rep-accessories" placeholder={ar ? 'شو ترك معو (شاحن، كفر، شريحة…)' : 'Left with it (charger, case…)'} value={form.accessories} onChange={e => setForm({ ...form, accessories: e.target.value })} />
          <input className={input} id="rep-passcode" placeholder={ar ? 'رمز فتح الجهاز (اختياري)' : 'Device passcode (optional)'} value={form.devicePasscode} onChange={e => setForm({ ...form, devicePasscode: e.target.value })} />
          <input className={input} id="rep-expected" type="date" title={ar ? 'الموعد المتوقع' : 'Expected date'} value={form.expectedDate} onChange={e => setForm({ ...form, expectedDate: e.target.value })} />
          <input className={`${input} font-mono`} id="rep-estimate" type="number" min="0" step="any" placeholder={ar ? 'الكلفة التقريبية ($)' : 'Estimate ($)'} value={form.estimate} onChange={e => setForm({ ...form, estimate: e.target.value })} />
          <input className={`${input} font-mono`} id="rep-deposit" type="number" min="0" step="any" placeholder={ar ? 'العربون ($)' : 'Deposit ($)'} value={form.deposit} onChange={e => setForm({ ...form, deposit: e.target.value })} />
          <button type="submit" id="btn-save-repair" className="md:col-span-3 bg-sky-600 hover:bg-sky-700 text-white font-black py-2.5 rounded-xl cursor-pointer">
            {ar ? 'حفظ وطباعة الإيصال 🖨️' : 'Save and print ticket 🖨️'}
          </button>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {([['open', ar ? 'مفتوحة' : 'Open'], ...REPAIR_STATUSES.map(s => [s.id, ar ? s.ar : s.en]), ['all', ar ? 'الكل' : 'All']] as Array<[string, string]>).map(([id, label]) => (
          <button key={id} type="button" data-repair-filter={id} onClick={() => setFilter(id as RepairStatus | 'open' | 'all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${filter === id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>
            {label} <span className="font-mono opacity-70">{counts[id] || 0}</span>
          </button>
        ))}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute top-2.5 right-3 text-slate-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} id="repair-search" placeholder={ar ? 'بحث: رقم التذكرة، الاسم، التلفون، الجهاز، IMEI' : 'Search'} className={`${input} pr-9`} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {shown.length === 0 && <p className="text-slate-400 text-sm p-6">{ar ? 'ما في تذاكر هون.' : 'No tickets.'}</p>}
        {shown.map(r => {
          const st = statusInfo(r.status);
          const left = Math.max(0, (r.finalCostUSD ?? r.estimateUSD) - r.depositUSD);
          const open = r.status !== 'delivered' && r.status !== 'cancelled';
          return (
            <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 text-sm" data-repair-ticket={r.ticketNumber}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono font-black text-slate-800" dir="ltr">{r.ticketNumber}</div>
                  <div className="font-black text-slate-800">{r.device}</div>
                  {r.imei && <div className="text-[11px] font-mono text-slate-500" dir="ltr">IMEI {r.imei}</div>}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-black border ${st.cls}`} data-repair-status>{ar ? st.ar : st.en}</span>
              </div>
              <div className="text-slate-600">👤 {r.customerName} · <span dir="ltr" className="font-mono">{r.customerPhone}</span></div>
              <div className="text-slate-700">🛠️ {r.problem}</div>
              {r.accessories && <div className="text-xs text-slate-500">🎒 {r.accessories}</div>}
              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <span>📅 <span dir="ltr">{r.date}</span></span>
                {r.expectedDate && open && <span>⏰ {ar ? 'متوقع' : 'due'} <span dir="ltr">{r.expectedDate}</span></span>}
                <span>💵 {ar ? 'تقريبي' : 'est.'} {r.estimateUSD.toFixed(2)}$</span>
                {r.depositUSD > 0 && <span>🧾 {ar ? 'عربون' : 'deposit'} {r.depositUSD.toFixed(2)}$</span>}
                {open && <span className="font-bold text-slate-700">{ar ? 'الباقي' : 'left'} {left.toFixed(2)}$</span>}
                {r.status === 'delivered' && <span className="font-bold text-violet-700">{ar ? 'تقبّض' : 'paid'} {(r.finalCostUSD || 0).toFixed(2)}$</span>}
              </div>
              {open && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {REPAIR_STATUSES.filter(s => ['received', 'in_progress', 'waiting_parts', 'ready'].includes(s.id) && s.id !== r.status).map(s => (
                    <button key={s.id} type="button" data-set-status={s.id} onClick={() => update(r.id, { status: s.id })}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold hover:bg-slate-50 cursor-pointer">{ar ? s.ar : s.en}</button>
                  ))}
                  <button type="button" data-deliver={r.id} onClick={() => openDelivery(r)} className="px-2.5 py-1 rounded-lg bg-violet-600 text-white text-xs font-black cursor-pointer">
                    🤝 {ar ? 'تسليم للزبون' : 'Deliver'}
                  </button>
                  <button type="button" onClick={() => { if (window.confirm(ar ? 'إلغاء التذكرة؟' : 'Cancel ticket?')) update(r.id, { status: 'cancelled' }); }}
                    className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 text-xs font-bold cursor-pointer">{ar ? 'إلغاء' : 'Cancel'}</button>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => printRepairTicket(r, settings)} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer">
                  <Printer className="w-3.5 h-3.5" /> {ar ? 'طباعة الإيصال' : 'Print ticket'}
                </button>
                <button type="button" data-wa={r.status === 'ready' ? 'ready' : 'received'} onClick={() => whatsapp(r, r.status === 'ready' ? 'ready' : 'received')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1 cursor-pointer">
                  <MessageCircle className="w-3.5 h-3.5" /> {r.status === 'ready' ? (ar ? 'خبّر الزبون إنو جاهز' : 'Tell customer it is ready') : (ar ? 'WhatsApp للزبون' : 'WhatsApp customer')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {delivering && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 flex items-center justify-center p-4" id="repair-deliver-modal">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3 text-sm">
            <h3 className="font-black text-slate-800">🤝 {ar ? 'تسليم' : 'Deliver'} {delivering.ticketNumber}</h3>
            <div className="text-slate-500">{delivering.device} · {delivering.customerName}</div>
            <label className="block font-bold text-slate-600">{ar ? 'الكلفة النهائية للزبون ($)' : 'Final price ($)'}
              <input id="rep-final" type="number" min="0" step="any" value={finalCost} onChange={e => setFinalCost(e.target.value)} className={`${input} font-mono mt-1`} /></label>
            <label className="block font-bold text-slate-600">{ar ? 'كلفة القطع عليك ($) — للأرباح' : 'Parts cost ($)'}
              <input id="rep-parts" type="number" min="0" step="any" value={partsCost} onChange={e => setPartsCost(e.target.value)} className={`${input} font-mono mt-1`} /></label>
            <div className="bg-slate-50 rounded-xl p-2.5 text-xs space-y-0.5">
              <div>{ar ? 'العربون المقبوض' : 'Deposit taken'}: <b>{delivering.depositUSD.toFixed(2)}$</b></div>
              <div className="font-black text-slate-800">{ar ? 'الباقي للقبض هلّق' : 'To collect now'}: {Math.max(0, (parseFloat(finalCost) || 0) - delivering.depositUSD).toFixed(2)}$</div>
            </div>
            <div className="flex gap-2">
              {(['cash', 'debt'] as const).map(m => (
                <button key={m} type="button" onClick={() => setPayMethod(m)} className={`flex-1 py-2 rounded-xl border font-bold cursor-pointer ${payMethod === m ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>
                  {m === 'cash' ? (ar ? 'كاش' : 'Cash') : (ar ? 'دين على الزبون' : 'On credit')}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" id="btn-confirm-deliver" onClick={confirmDelivery} className="flex-1 bg-violet-600 text-white font-black py-2.5 rounded-xl cursor-pointer">{ar ? 'تأكيد التسليم' : 'Confirm'}</button>
              <button type="button" onClick={() => setDelivering(null)} className="px-4 py-2.5 rounded-xl border font-bold cursor-pointer">{ar ? 'رجوع' : 'Back'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
