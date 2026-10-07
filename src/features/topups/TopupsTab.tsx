import React, { useState } from 'react';
import { Zap, Plus, Settings2 } from 'lucide-react';
import { Customer, Invoice, TopupWallet } from '../../types';

export const DEFAULT_TOPUP_WALLETS: TopupWallet[] = [
  { id: 'alfa', name: 'Alfa', balance: 0, avgCostUSD: 1, sellRateUSD: 1.1 },
  { id: 'touch', name: 'Touch', balance: 0, avgCostUSD: 1, sellRateUSD: 1.1 },
];
const QUICK_AMOUNTS = [1, 2, 3, 5, 10, 15, 20, 30];
const WALLET_COLORS: Record<string, string> = { alfa: 'from-rose-600 to-rose-500', touch: 'from-sky-600 to-sky-500' };

export interface ServiceSale { productId: string; name: string; priceUSD: number; costUSD: number; paymentMethod: 'cash' | 'debt'; paidNowUSD: number; customerId?: string; note?: string; /** the caller updates the customer's balance itself */ keepBalance?: boolean }

interface TopupsTabProps {
  lang: 'ar' | 'en';
  sysDate: string;
  wallets: TopupWallet[];
  setWallets: (rows: TopupWallet[]) => void;
  invoices: Invoice[];
  customers: Customer[];
  showToast: (type: 'success' | 'error' | 'warning', message: string) => void;
  onSell: (sale: ServiceSale) => Invoice | null;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Phone shops: transfer Alfa / Touch credit to customers out of the shop's own operator balance. */
export function TopupsTab({ lang, sysDate, wallets, setWallets, invoices, customers, showToast, onSell }: TopupsTabProps) {
  const ar = lang === 'ar';
  const [walletId, setWalletId] = useState(wallets[0]?.id || 'alfa');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [payment, setPayment] = useState<'cash' | 'debt'>('cash');
  const [customerId, setCustomerId] = useState('');
  const [loadFor, setLoadFor] = useState<string | null>(null);
  const [loadCredit, setLoadCredit] = useState('');
  const [loadPaid, setLoadPaid] = useState('');
  const [editRates, setEditRates] = useState(false);

  const wallet = wallets.find(w => w.id === walletId) || wallets[0];
  const credit = parseFloat(amount) || 0;
  const suggested = wallet ? r2(credit * wallet.sellRateUSD) : 0;
  const finalPrice = price === '' ? suggested : parseFloat(price) || 0;

  const updateWallet = (id: string, patch: Partial<TopupWallet>) => setWallets(wallets.map(w => (w.id === id ? { ...w, ...patch } : w)));

  const sell = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    const number = phone.replace(/\D/g, '');
    if (number.length < 7) { showToast('error', ar ? 'اكتب رقم الخط يلي بدّك تشرجلو.' : 'Enter the line number.'); return; }
    if (credit <= 0 || finalPrice <= 0) { showToast('error', ar ? 'اكتب قيمة التشريج والسعر.' : 'Enter the credit and price.'); return; }
    if (credit > wallet.balance) {
      showToast('error', ar ? `رصيد ${wallet.name} عندك ${wallet.balance.toFixed(2)}$ بس. اشحن الرصيد أوّل.` : `Only ${wallet.balance.toFixed(2)}$ of ${wallet.name} credit left.`);
      return;
    }
    if (payment === 'debt' && !customerId) { showToast('error', ar ? 'اختار الزبون يلي بدّو يتسجّل عليه الدين.' : 'Choose the customer for credit.'); return; }
    const inv = onSell({
      productId: `topup-${wallet.id}`,
      name: `${ar ? 'تشريج' : 'Top-up'} ${wallet.name} ${credit}$ ${ar ? 'للرقم' : 'to'} ${number}`,
      priceUSD: finalPrice,
      costUSD: r2(credit * wallet.avgCostUSD),
      paymentMethod: payment,
      paidNowUSD: payment === 'cash' ? finalPrice : 0,
      ...(payment === 'debt' ? { customerId } : {}),
    });
    if (!inv) return;
    updateWallet(wallet.id, { balance: r2(wallet.balance - credit) });
    showToast('success', ar ? `✅ انبعت ${credit}$ ${wallet.name} عالرقم ${number} — قبضت ${finalPrice.toFixed(2)}$` : `Sent ${credit}$ to ${number}`);
    setPhone(''); setAmount(''); setPrice(''); setPayment('cash'); setCustomerId('');
  };

  const load = (e: React.FormEvent) => {
    e.preventDefault();
    const w = wallets.find(x => x.id === loadFor);
    const c = parseFloat(loadCredit) || 0;
    const paid = parseFloat(loadPaid) || 0;
    if (!w || c <= 0 || paid <= 0) { showToast('error', ar ? 'اكتب قيمة الرصيد وقدّيش دفعت حقّو.' : 'Enter the credit and what you paid.'); return; }
    // weighted average cost, so profit stays right when the distributor price changes
    const oldValue = Math.max(0, w.balance) * w.avgCostUSD;
    const newBalance = r2(w.balance + c);
    const avg = (oldValue + paid) / (Math.max(0, w.balance) + c);
    updateWallet(w.id, { balance: newBalance, avgCostUSD: Math.round(avg * 10000) / 10000, loads: [{ date: sysDate, credit: c, paidUSD: paid }, ...(w.loads || [])].slice(0, 20) });
    showToast('success', ar ? `انشحن رصيد ${w.name} بـ ${c}$ (صار ${newBalance.toFixed(2)}$).` : `${w.name} loaded with ${c}$.`);
    setLoadFor(null); setLoadCredit(''); setLoadPaid('');
  };

  const history = invoices.filter(inv => inv.items.length === 1 && inv.items[0].productId.startsWith('topup-')).slice(0, 50);
  const today = history.filter(inv => inv.date === sysDate);
  const todayProfit = today.reduce((s, inv) => s + inv.totalUSD - (inv.items[0].unitCostUSD || 0), 0);
  const input = 'w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:bg-white';

  return (
    <div className="space-y-5" id="tab-topups" dir={ar ? 'rtl' : 'ltr'}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {wallets.map(w => (
          <div key={w.id} data-wallet={w.id} className={`bg-gradient-to-l ${WALLET_COLORS[w.id] || 'from-slate-700 to-slate-500'} text-white rounded-2xl p-5 space-y-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg font-black"><Zap className="w-5 h-5" /> {w.name}</div>
              <button type="button" data-load-wallet={w.id} onClick={() => setLoadFor(w.id)} className="flex items-center gap-1 bg-white/20 hover:bg-white/30 rounded-xl px-3 py-1.5 text-xs font-bold cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> {ar ? 'شحن رصيد المحل' : 'Load credit'}
              </button>
            </div>
            <div>
              <div className="text-xs opacity-80">{ar ? 'الرصيد المتوفّر' : 'Available credit'}</div>
              <div className="text-3xl font-black font-mono" data-wallet-balance>{w.balance.toFixed(2)}$</div>
            </div>
            <div className="text-xs opacity-90">
              {ar ? 'كلفة الدولار' : 'Cost per 1$'}: <span className="font-mono">{w.avgCostUSD.toFixed(3)}$</span> · {ar ? 'سعر المبيع' : 'Sell per 1$'}: <span className="font-mono">{w.sellRateUSD.toFixed(3)}$</span>
            </div>
          </div>
        ))}
      </div>

      {loadFor && (
        <form onSubmit={load} id="wallet-load-form" className="bg-amber-50 border border-amber-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end text-sm">
          <div className="md:col-span-4 font-black text-amber-900">{ar ? `شحن رصيد ${wallets.find(w => w.id === loadFor)?.name} من الموزّع` : 'Load credit from the distributor'}</div>
          <label className="space-y-1"><span className="text-xs font-bold text-slate-600">{ar ? 'قيمة الرصيد ($)' : 'Credit ($)'}</span>
            <input id="load-credit" type="number" min="0" step="any" className={`${input} font-mono`} value={loadCredit} onChange={e => setLoadCredit(e.target.value)} /></label>
          <label className="space-y-1"><span className="text-xs font-bold text-slate-600">{ar ? 'قدّيش دفعت ($)' : 'You paid ($)'}</span>
            <input id="load-paid" type="number" min="0" step="any" className={`${input} font-mono`} value={loadPaid} onChange={e => setLoadPaid(e.target.value)} /></label>
          <button type="submit" id="btn-confirm-load" className="bg-amber-600 hover:bg-amber-700 text-white font-black py-2 rounded-xl cursor-pointer">{ar ? 'تأكيد الشحن' : 'Confirm'}</button>
          <button type="button" onClick={() => setLoadFor(null)} className="bg-white border border-slate-200 font-bold py-2 rounded-xl cursor-pointer">{ar ? 'إلغاء' : 'Cancel'}</button>
        </form>
      )}

      <form onSubmit={sell} id="topup-form" className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-800">{ar ? '📲 تشريج لزبون' : '📲 Top up a customer'}</h3>
          <button type="button" onClick={() => setEditRates(v => !v)} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer">
            <Settings2 className="w-3.5 h-3.5" /> {ar ? 'أسعار المبيع' : 'Selling rates'}
          </button>
        </div>
        {editRates && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3">
            {wallets.map(w => (
              <label key={w.id} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                {ar ? `سعر 1$ ${w.name}` : `1$ ${w.name} sells for`}
                <input data-sell-rate={w.id} type="number" min="0" step="0.01" className={`${input} font-mono w-28`} value={w.sellRateUSD}
                  onChange={e => updateWallet(w.id, { sellRateUSD: parseFloat(e.target.value) || 0 })} />$
              </label>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          {wallets.map(w => (
            <button key={w.id} type="button" data-topup-wallet={w.id} onClick={() => { setWalletId(w.id); setPrice(''); }}
              className={`flex-1 rounded-xl border py-2 font-black cursor-pointer ${walletId === w.id ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
              {w.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input id="topup-phone" dir="ltr" className={`${input} font-mono`} placeholder={ar ? 'رقم الخط (03 / 70 / 71 / 76 / 78 / 79 / 81)' : 'Line number'} value={phone} onChange={e => setPhone(e.target.value)} />
          <input id="topup-amount" type="number" min="0" step="any" className={`${input} font-mono`} placeholder={ar ? 'قيمة التشريج ($)' : 'Credit ($)'} value={amount} onChange={e => { setAmount(e.target.value); setPrice(''); }} />
          <input id="topup-price" type="number" min="0" step="any" className={`${input} font-mono`} placeholder={ar ? `السعر للزبون (${suggested.toFixed(2)}$)` : `Price (${suggested.toFixed(2)}$)`} value={price} onChange={e => setPrice(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_AMOUNTS.map(a => (
            <button key={a} type="button" data-topup-quick={a} onClick={() => { setAmount(String(a)); setPrice(''); }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold cursor-pointer ${credit === a ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>{a}$</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {(['cash', 'debt'] as const).map(m => (
            <button key={m} type="button" data-topup-payment={m} onClick={() => setPayment(m)}
              className={`px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer ${payment === m ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
              {m === 'cash' ? (ar ? '💵 كاش' : '💵 Cash') : (ar ? '📒 دين على زبون' : '📒 On account')}
            </button>
          ))}
          {payment === 'debt' && (
            <select id="topup-customer" className={`${input} w-64`} value={customerId} onChange={e => setCustomerId(e.target.value)}>
              <option value="">{ar ? '— اختار الزبون —' : '— customer —'}</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
            </select>
          )}
        </div>
        {credit > 0 && wallet && (
          <div className={`text-xs font-bold rounded-xl px-3 py-2 ${credit > wallet.balance ? 'text-rose-800 bg-rose-50' : 'text-teal-800 bg-teal-50'}`} id="topup-summary">
            {credit > wallet.balance && <div className="mb-1">⚠️ {ar ? `رصيد ${wallet.name} ما بيكفّي — اشحن رصيد المحل أوّل.` : `Not enough ${wallet.name} credit.`}</div>}
            {ar ? 'الزبون بيدفع' : 'Customer pays'} {finalPrice.toFixed(2)}$ · {ar ? 'ربحك' : 'profit'} {(finalPrice - credit * wallet.avgCostUSD).toFixed(2)}$ · {ar ? 'بيبقى برصيدك' : 'left'} {(wallet.balance - credit).toFixed(2)}$
          </div>
        )}
        <button type="submit" id="btn-send-topup" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-2.5 rounded-xl cursor-pointer">
          {ar ? 'تسجيل التشريج' : 'Record top-up'}
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-800">{ar ? 'آخر التشريجات' : 'Recent top-ups'}</h3>
          <div className="text-xs font-bold text-slate-600" id="topup-today">
            {ar ? 'اليوم' : 'Today'}: {today.length} · {today.reduce((s, i) => s + i.totalUSD, 0).toFixed(2)}$ · {ar ? 'ربح' : 'profit'} {todayProfit.toFixed(2)}$
          </div>
        </div>
        {history.length === 0 ? <p className="text-slate-400 text-sm">{ar ? 'ما في تشريجات بعد.' : 'None yet.'}</p> : (
          <div className="divide-y divide-slate-100 text-sm">
            {history.map(inv => (
              <div key={inv.id} className="py-2 flex justify-between gap-2" data-topup-row>
                <span className="font-bold text-slate-700">{inv.items[0].productName}</span>
                <span className="text-xs text-slate-500 font-mono">{inv.date} {inv.time} · {inv.totalUSD.toFixed(2)}$ {inv.paymentMethod === 'debt' ? (ar ? '(دين)' : '(credit)') : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
