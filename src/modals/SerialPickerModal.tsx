import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Product } from '../types';
import { normalizeSerial } from '../lib/serials';

interface SerialPickerModalProps {
  lang: 'ar' | 'en';
  product: Product;
  /** IMEIs of this product already in the cart. */
  inCart: string[];
  /** Returns true when the unit was added (the window then closes). */
  onPick: (serial: string) => boolean;
  onClose: () => void;
}

/** Choose which unit (IMEI) of a phone is being sold: scan, type or tap it. */
export function SerialPickerModal({ lang, product, inCart, onPick, onClose }: SerialPickerModalProps) {
  const ar = lang === 'ar';
  const [query, setQuery] = useState('');
  const available = (product.serialNumbers || []).filter(s => !inCart.includes(s));
  const q = normalizeSerial(query);
  const shown = q ? available.filter(s => s.includes(q)) : available;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const exact = available.find(s => s === q) || (shown.length === 1 ? shown[0] : '');
    if (exact && onPick(exact)) onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" id="serial-picker" dir={ar ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col p-5 gap-3 text-start">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-slate-800">📱 {ar ? 'اختار الجهاز (IMEI)' : 'Pick the unit (IMEI)'}</h2>
            <div className="text-xs text-slate-500">{product.name} · {ar ? `${available.length} بالمخزون` : `${available.length} in stock`}</div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label={ar ? 'إغلاق' : 'Close'}>
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <form onSubmit={submit}>
          <input
            id="serial-picker-input"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={ar ? 'امسح أو اكتب الـ IMEI' : 'Scan or type the IMEI'}
            dir="ltr"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 font-mono text-center focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
          />
        </form>
        <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[80px]">
          {shown.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              {available.length === 0
                ? (ar ? 'ما في أجهزة من هالصنف بالمخزون. زيد الـ IMEI من فاتورة المشتريات أو من إدارة المخزن.' : 'No units in stock. Add IMEIs from a purchase invoice or the inventory.')
                : (ar ? 'ما في رقم بيطابق.' : 'No matching IMEI.')}
            </p>
          ) : shown.map(s => (
            <button key={s} type="button" data-serial={s} onClick={() => { if (onPick(s)) onClose(); }}
              className="w-full text-center font-mono font-bold bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl py-2 cursor-pointer" dir="ltr">
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
