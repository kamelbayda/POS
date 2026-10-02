import React, { useMemo, useState } from 'react';
import { Printer, Search, Trash2, Plus, Tag } from 'lucide-react';
import { Product, Promotion, SystemSettings } from '../../types';
import { useStoredState } from '../../lib/storage';
import { printInPage } from '../../lib/print';
import {
  TAG_SIZES, TagItem, TagOptions, TagSize, TagStyle,
  buildShelfTags, shelfTagsCss, promoPriceFor, SHELF_TAG_PAGE_CSS,
} from './shelfTags';

interface ShelfTagsTabProps {
  products: Product[];
  promotions: Promotion[];
  settings: SystemSettings;
  lang: 'ar' | 'en';
  sysDate: string;
  showToast: (type: 'success' | 'error' | 'warning', message: string) => void;
}

interface Selected {
  productId: string;
  count: number;
  offerPrice: string; // typed USD offer price; empty = regular price
}

/** Yellow / red supermarket shelf price tags, printed on A4. */
export function ShelfTagsTab({ products, promotions, settings, lang, sysDate, showToast }: ShelfTagsTabProps) {
  const ar = lang === 'ar';
  const t = (a: string, e: string) => (ar ? a : e);

  const [size, setSize] = useStoredState<TagSize>('shelfTags.size', 'medium');
  const [style, setStyle] = useStoredState<TagStyle>('shelfTags.style', 'classic');
  const [showLbp, setShowLbp] = useStoredState<boolean>('shelfTags.lbp', true);
  const [showBarcode, setShowBarcode] = useStoredState<boolean>('shelfTags.barcode', true);
  const [showShopName, setShowShopName] = useStoredState<boolean>('shelfTags.shop', true);
  const [showDate, setShowDate] = useStoredState<boolean>('shelfTags.date', false);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState<Selected[]>([]);

  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))], [products]);
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => (!category || p.category === category))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.barcode.includes(q) || (p.barcodes || []).some((b) => b.includes(q)))
      .slice(0, 40);
  }, [products, query, category]);

  const add = (list: Product[]) => {
    setSelected((prev) => {
      const have = new Set(prev.map((s) => s.productId));
      const extra = list.filter((p) => !have.has(p.id)).map((p) => {
        const promo = promoPriceFor(p, promotions, sysDate);
        return { productId: p.id, count: 1, offerPrice: promo !== undefined ? String(promo) : '' };
      });
      return [...extra, ...prev];
    });
  };
  const update = (id: string, patch: Partial<Selected>) =>
    setSelected((prev) => prev.map((s) => (s.productId === id ? { ...s, ...patch } : s)));

  const options: TagOptions = {
    size, style, showLbp, showBarcode, showShopName, showDate,
    shopName: settings.shopName, exchangeRate: settings.exchangeRate || 89000, date: sysDate, lang,
  };
  const items: TagItem[] = selected
    .map((s) => {
      const product = byId.get(s.productId);
      if (!product) return null;
      const offer = parseFloat(s.offerPrice);
      return { product, count: s.count, offerPriceUSD: s.offerPrice.trim() && !isNaN(offer) ? offer : undefined };
    })
    .filter(Boolean) as TagItem[];
  const totalTags = items.reduce((a, i) => a + Math.max(1, i.count), 0);
  const perPage = TAG_SIZES[size].cols * Math.floor(277 / (TAG_SIZES[size].h + 2));
  const pages = Math.ceil(totalTags / perPage);

  const html = buildShelfTags(items, options);

  const print = () => {
    if (items.length === 0) {
      showToast('error', t('اختر أصنافاً أولاً.', 'Select some products first.'));
      return;
    }
    printInPage(html, SHELF_TAG_PAGE_CSS + shelfTagsCss('#in-page-print-root', size));
  };

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${active ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-red-300'}`;
  const check = (label: string, value: boolean, set: (v: boolean) => void) => (
    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} className="accent-red-600 w-4 h-4" />
      {label}
    </label>
  );

  return (
    <div className="space-y-4" id="tab-shelf-tags" dir={ar ? 'rtl' : 'ltr'}>
      <div className="bg-gradient-to-l from-red-600 to-amber-500 text-white rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2"><Tag className="w-6 h-6" />{t('ملصقات أسعار الرفوف', 'Shelf price tags')}</h2>
          <p className="text-xs text-white/90 mt-1">{t('ملصقات صفرا وحمرا للرفوف، بتنطبع على ورق A4. الأصناف يلي عليها عرض بتطلع بلون العروض لحالها.', 'Yellow and red shelf tags printed on A4. Products on promotion get the offer style automatically.')}</p>
        </div>
        <button onClick={print} id="btn-print-shelf-tags" className="bg-white text-red-700 font-black px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-amber-50">
          <Printer className="w-5 h-5" />
          {t(`طباعة ${totalTags} ملصق`, `Print ${totalTags} tags`)}{pages > 0 ? ` (${pages} ${t('صفحة', 'pages')})` : ''}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
        {/* Product picker and options */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <h3 className="font-black text-slate-800 text-sm">{t('1. اختيار الأصناف', '1. Choose products')}</h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute top-2.5 start-2.5" />
                <input id="shelf-tags-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('اسم الصنف أو الباركود…', 'Name or barcode…')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 ps-8 pe-2 text-sm" />
              </div>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs max-w-[130px]">
                <option value="">{t('كل الأقسام', 'All categories')}</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={() => add(matches)} className="w-full text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg py-1.5 cursor-pointer">
              {t(`+ زيد كل النتائج (${matches.length})`, `+ Add all results (${matches.length})`)}
            </button>
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
              {matches.map((p) => (
                <button key={p.id} onClick={() => add([p])} className="w-full flex items-center justify-between gap-2 px-3 py-2 text-start hover:bg-amber-50 cursor-pointer">
                  <span className="text-sm font-semibold text-slate-800 truncate">{p.name}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-red-700 font-bold">{p.priceUSD.toFixed(2)}$</span>
                    <Plus className="w-4 h-4 text-slate-400" />
                  </span>
                </button>
              ))}
              {matches.length === 0 && <p className="text-xs text-slate-400 p-3 text-center">{t('ما في أصناف.', 'No products.')}</p>}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <h3 className="font-black text-slate-800 text-sm">{t('2. الشكل', '2. Look')}</h3>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TAG_SIZES) as TagSize[]).map((k) => (
                <button key={k} onClick={() => setSize(k)} className={chip(size === k)}>{ar ? TAG_SIZES[k].labelAr : TAG_SIZES[k].labelEn}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setStyle('classic')} className={chip(style === 'classic')}>🟨 {t('أصفر وأحمر', 'Yellow & red')}</button>
              <button onClick={() => setStyle('offer')} className={chip(style === 'offer')}>🟥 {t('أحمر (عروض) للكل', 'Red (offer) for all')}</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {check(t('السعر بالليرة', 'LBP price'), showLbp, setShowLbp)}
              {check(t('رقم الباركود', 'Barcode number'), showBarcode, setShowBarcode)}
              {check(t('اسم المحل', 'Shop name'), showShopName, setShowShopName)}
              {check(t('التاريخ', 'Date'), showDate, setShowDate)}
            </div>
          </div>
        </div>

        {/* Selected list and live preview */}
        <div className="space-y-4 min-w-0">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-black text-slate-800 text-sm">{t(`الأصناف المختارة (${selected.length})`, `Selected (${selected.length})`)}</h3>
              {selected.length > 0 && (
                <button onClick={() => setSelected([])} className="text-xs font-bold text-slate-500 hover:text-red-600 cursor-pointer">{t('مسح الكل', 'Clear all')}</button>
              )}
            </div>
            {selected.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">{t('اختار أصناف من القائمة.', 'Pick products from the list.')}</p>
            ) : (
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                {selected.map((s) => {
                  const p = byId.get(s.productId);
                  if (!p) return null;
                  return (
                    <div key={s.productId} className="flex flex-wrap items-center gap-2 py-2">
                      <span className="flex-1 min-w-[140px] text-sm font-semibold text-slate-800 truncate">{p.name}</span>
                      <span className="text-xs text-slate-500 font-mono">{p.priceUSD.toFixed(2)}$</span>
                      <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        {t('سعر العرض', 'Offer')}
                        <input value={s.offerPrice} onChange={(e) => update(s.productId, { offerPrice: e.target.value })} inputMode="decimal" placeholder="—"
                          className="w-16 bg-red-50 border border-red-200 rounded-md px-1.5 py-1 text-center font-mono text-red-700" />
                      </label>
                      <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        {t('العدد', 'Qty')}
                        <input type="number" min="1" value={s.count} onChange={(e) => update(s.productId, { count: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-14 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-1 text-center font-mono" />
                      </label>
                      <button onClick={() => setSelected((prev) => prev.filter((x) => x.productId !== s.productId))} className="p-1 text-slate-400 hover:text-red-600 cursor-pointer" aria-label={t('حذف', 'Remove')}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 overflow-auto">
            <h3 className="font-black text-slate-800 text-sm mb-3">{t('معاينة', 'Preview')}</h3>
            <style>{shelfTagsCss('#shelf-tags-preview', size)}</style>
            <div id="shelf-tags-preview" className="bg-white rounded-lg p-3 shadow-sm overflow-auto" style={{ zoom: size === 'large' ? 0.6 : 0.8 }}
              dangerouslySetInnerHTML={{ __html: items.length ? html : `<p style="text-align:center;color:#94a3b8;padding:24px;font-size:13px">${t('المعاينة بتطلع هون', 'Preview appears here')}</p>` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
