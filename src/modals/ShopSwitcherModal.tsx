import React, { useState } from 'react';
import { X, Plus, Store, Check, Trash2 } from 'lucide-react';
import { ACTIVE_SHOP_ID, MAIN_SHOP_ID, addShop, deleteShop, listShops, switchShop } from '../lib/shops';

const TYPE_ICON: Record<string, string> = { supermarket: '🛒', phones: '📱' };

/** The shops kept on this browser: open another one, or add a new shop with its own data. */
export function ShopSwitcherModal({ lang, onClose }: { lang: 'ar' | 'en'; onClose: () => void }) {
  const ar = lang === 'ar';
  const [shops, setShops] = useState(listShops);
  const remove = (id: string, label: string, setUp: boolean) => {
    const warn = ar
      ? `بدّك تمحي "${label}"؟\n\nبتنمحى كل بياناتو عن هالجهاز: البضاعة والفواتير والزبائن والحسابات${setUp ? ' والاشتراك' : ''}. ما فيك ترجّعها.`
      : `Delete "${label}"?\n\nAll its data on this device (stock, invoices, customers, accounts${setUp ? ', subscription' : ''}) is removed for good.`;
    if (!window.confirm(warn)) return;
    if (setUp) {
      const typed = window.prompt(ar ? 'للتأكيد اكتب كلمة: حذف' : 'Type DELETE to confirm');
      if (!typed || !['حذف', 'delete'].includes(typed.trim().toLowerCase())) return;
    }
    if (deleteShop(id)) setShops(listShops());
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" id="shop-switcher" dir={ar ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-[#1E1B16] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-black"><Store className="w-5 h-5 text-[#FFC21A]" /> {ar ? 'محلاتك على هالجهاز' : 'Your shops on this device'}</div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 cursor-pointer" aria-label="close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-2">
          {shops.map((s, i) => {
            const active = s.id === ACTIVE_SHOP_ID;
            return (
              <button key={s.id} type="button" data-shop={s.id} disabled={active} onClick={() => switchShop(s.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-start transition ${active ? 'border-[#1D9E75] bg-emerald-50 cursor-default' : 'border-slate-200 hover:border-[#1D9E75] hover:bg-emerald-50/50 cursor-pointer'}`}>
                <span className="text-2xl">{(s.businessType && TYPE_ICON[s.businessType]) || '🏪'}</span>
                <span className="flex-1">
                  <span className="block font-black text-slate-800">{s.name || (ar ? `محل ${i + 1}` : `Shop ${i + 1}`)}</span>
                  <span className="block text-xs text-slate-500">
                    {s.businessType === 'phones' ? (ar ? 'محل تلفونات' : 'Phone shop') : s.businessType === 'supermarket' ? (ar ? 'سوبرماركت' : 'Supermarket') : (ar ? 'بعدو ما تجهّز' : 'Not set up yet')}
                  </span>
                </span>
                {active && <span className="flex items-center gap-1 text-xs font-bold text-[#1D9E75]"><Check className="w-4 h-4" /> {ar ? 'مفتوح' : 'Open'}</span>}
                {!active && s.id !== MAIN_SHOP_ID && (
                  <span role="button" tabIndex={0} data-delete-shop={s.id}
                    onClick={e => { e.stopPropagation(); remove(s.id, s.name || (ar ? `محل ${i + 1}` : `Shop ${i + 1}`), !!s.businessType); }}
                    title={ar ? 'محي المحل' : 'Delete shop'}
                    className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </span>
                )}
              </button>
            );
          })}
          <button type="button" id="btn-add-shop" onClick={() => addShop()}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-slate-300 text-slate-600 font-bold hover:border-[#1D9E75] hover:text-[#1D9E75] cursor-pointer">
            <Plus className="w-4 h-4" /> {ar ? 'إضافة محل جديد' : 'Add a new shop'}
          </button>
          <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
            {ar
              ? 'كل محل إلو بضاعتو وفواتيرو وزبائنو وحساباتو واشتراكو لحالو. بتنقل بيناتن من هون بلا ما يختلطوا. 🗑️ بتمحي محل وإنت فاتح محل غيرو (المحل الأول ما بينمحى).'
              : 'Each shop has its own stock, invoices, customers, accounts and subscription. Switch between them here.'}
          </p>
        </div>
      </div>
    </div>
  );
}
