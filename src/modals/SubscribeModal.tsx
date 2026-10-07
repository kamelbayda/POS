import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  BUSINESS_TYPES, PERIODS, BusinessType, Period, Plans, StoredRequest,
  fetchPlans, submitRequest, getStoredRequest, clearStoredRequest,
} from '../lib/subscription';

interface SubscribeModalProps {
  lang: 'ar' | 'en';
  businessType: BusinessType;
  shopName: string;
  ownerName: string;
  ownerEmail: string;
  onClose: () => void;
  /** Called once a request was sent, so the app starts checking for approval. */
  onSubmitted: (req: StoredRequest) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Pick the shop type and a subscription, send the request, then see how to pay. */
export function SubscribeModal({ lang, businessType, shopName, ownerName, ownerEmail, onClose, onSubmitted }: SubscribeModalProps) {
  const ar = lang === 'ar';
  const [plans, setPlans] = useState<Plans | null>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<BusinessType>(businessType);
  const [period, setPeriod] = useState<Period>('year');
  const [form, setForm] = useState({ shopName, ownerName, email: ownerEmail, phone: '', note: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<StoredRequest | null>(() => getStoredRequest());

  useEffect(() => {
    fetchPlans().then((p) => { setPlans(p); setLoading(false); });
  }, []);

  const price = (t: BusinessType, p: Period) => {
    const v = plans?.prices?.[t]?.[p];
    return v === null || v === undefined ? (ar ? 'حسب الاتفاق' : 'On request') : `${v} ${plans?.currency || '$'}`;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(form.email.trim())) return setError(ar ? 'الإيميل مش مكتوب صح.' : 'Please enter a valid email.');
    if (!form.phone.trim()) return setError(ar ? 'اكتب رقم تلفونك لنتواصل معك.' : 'Enter your phone number.');
    setBusy(true);
    const res = await submitRequest({ businessType: type, period, ...form }, plans?.paymentInfo || '');
    setBusy(false);
    if ('error' in res) {
      setError(res.error === 'network'
        ? (ar ? 'ما في اتصال بالإنترنت. جرّب كمان مرة.' : 'No internet connection. Try again.')
        : (ar ? 'ما زبط إرسال الطلب. تأكد من المعلومات وجرّب كمان مرة.' : 'Could not send the request. Check the details and try again.'));
      return;
    }
    setPending(res.request);
    onSubmitted(res.request);
  };

  const input = 'w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:bg-white';
  const typeInfo = (t: BusinessType) => BUSINESS_TYPES.find((b) => b.id === t)!;
  const periodName = (p: Period) => { const x = PERIODS.find((q) => q.id === p)!; return ar ? x.ar : x.en; };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" id="subscribe-modal" dir={ar ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 space-y-5 text-start">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-slate-800 text-lg">⭐ {ar ? 'اشترك بـ BeeCash' : 'Subscribe to BeeCash'}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label={ar ? 'إغلاق' : 'Close'}>
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {pending ? (
          <div className="space-y-4" id="subscribe-pending">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1">
              <div className="font-black text-amber-900">⏳ {ar ? 'طلبك وصل وعم ينراجع' : 'Your request was received'}</div>
              <div className="text-sm text-amber-800">
                {typeInfo(pending.businessType).icon} {ar ? typeInfo(pending.businessType).ar : typeInfo(pending.businessType).en} · {periodName(pending.period)}
              </div>
              <div className="text-xs text-amber-700">
                {ar
                  ? 'بعد ما تدفع ويتأكد الدفع، البرنامج بيتفعّل عندك لحالو خلال دقايق. ما في داعي تكتب أي كود.'
                  : 'Once payment is confirmed the program activates itself within minutes. No key to type.'}
              </div>
            </div>
            {pending.paymentInfo && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <div className="font-black text-emerald-900 mb-1">💳 {ar ? 'طريقة الدفع' : 'How to pay'}</div>
                <div className="text-sm text-emerald-900 whitespace-pre-wrap">{pending.paymentInfo}</div>
              </div>
            )}
            <div className="flex justify-between">
              <button type="button" onClick={onClose} className="bg-[#1D9E75] hover:bg-[#15805e] text-white font-bold py-2.5 px-5 rounded-xl cursor-pointer">
                {ar ? 'تمام' : 'OK'}
              </button>
              <button
                type="button"
                onClick={() => { if (window.confirm(ar ? 'إلغاء هالطلب وبعت طلب جديد؟' : 'Cancel this request and send a new one?')) { clearStoredRequest(); setPending(null); } }}
                className="text-xs font-bold text-slate-500 hover:text-rose-600 cursor-pointer"
              >
                {ar ? 'بدي غيّر الطلب' : 'Change my request'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            {error && <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm p-3 rounded-xl">{error}</div>}

            <div>
              <div className="font-bold text-slate-700 text-sm mb-2">1. {ar ? 'شو نوع محلّك؟' : 'What kind of shop?'}</div>
              <div className="grid grid-cols-2 gap-3">
                {BUSINESS_TYPES.map((b) => (
                  <button key={b.id} type="button" data-business-type={b.id} onClick={() => setType(b.id)}
                    className={`p-4 rounded-2xl border-2 text-start cursor-pointer transition ${type === b.id ? 'border-[#1D9E75] bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className="text-2xl">{b.icon}</div>
                    <div className="font-black text-slate-800">{ar ? b.ar : b.en}</div>
                    <div className="text-xs text-slate-500">{ar ? b.descAr : b.descEn}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="font-bold text-slate-700 text-sm mb-2">2. {ar ? 'اختار الاشتراك' : 'Choose a plan'}</div>
              {loading ? (
                <div className="text-sm text-slate-400">{ar ? 'عم نجيب الأسعار…' : 'Loading prices…'}</div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {PERIODS.map((p) => (
                    <button key={p.id} type="button" data-period={p.id} onClick={() => setPeriod(p.id)}
                      className={`p-3 rounded-2xl border-2 text-center cursor-pointer transition ${period === p.id ? 'border-[#1D9E75] bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="font-black text-slate-800">{ar ? p.ar : p.en}</div>
                      <div className="text-sm font-mono font-bold text-[#1D9E75] mt-1" dir="ltr">{price(type, p.id)}</div>
                      {p.id === 'year' && <div className="text-[10px] text-amber-700 font-bold mt-0.5">{ar ? 'الأكتر طلباً' : 'Most popular'}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="font-bold text-slate-700 text-sm mb-2">3. {ar ? 'معلوماتك' : 'Your details'}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input className={input} id="sub-shop" placeholder={ar ? 'اسم المحل' : 'Shop name'} value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
                <input className={input} id="sub-owner" placeholder={ar ? 'اسمك' : 'Your name'} value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
                <input className={`${input} font-mono`} id="sub-email" type="email" dir="ltr" placeholder="name@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                <input className={`${input} font-mono`} id="sub-phone" type="tel" dir="ltr" placeholder={ar ? 'رقم التلفون / واتساب' : 'Phone / WhatsApp'} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                <textarea className={`${input} sm:col-span-2`} id="sub-note" rows={2} placeholder={ar ? 'ملاحظة (اختياري): عدد الأجهزة، المنطقة…' : 'Note (optional)'} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
            </div>

            <button type="submit" disabled={busy} id="btn-send-subscription" className="w-full bg-[#1D9E75] hover:bg-[#15805e] disabled:opacity-60 text-white font-black py-3 rounded-xl cursor-pointer">
              {busy ? (ar ? 'عم نبعت…' : 'Sending…') : (ar ? `بعت طلب الاشتراك (${periodName(period)})` : `Send request (${periodName(period)})`)}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
