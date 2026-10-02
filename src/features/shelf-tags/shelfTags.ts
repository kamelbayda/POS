import { Product } from '../../types';

/** Supermarket shelf price tags (yellow / red), shared by the on-screen preview and the print. */

export type TagSize = 'large' | 'medium' | 'small';
export type TagStyle = 'classic' | 'offer';

export interface TagOptions {
  size: TagSize;
  style: TagStyle;
  showLbp: boolean;
  showBarcode: boolean;
  showShopName: boolean;
  showDate: boolean;
  shopName: string;
  exchangeRate: number;
  date: string;
  lang: 'ar' | 'en';
}

export interface TagItem {
  product: Product;
  count: number;
  /** Offer price in USD; when set the tag shows the old price struck through. */
  offerPriceUSD?: number;
}

// A4 printable area is about 190 x 277 mm with 10 mm margins
export const TAG_SIZES: Record<TagSize, { w: number; h: number; cols: number; labelAr: string; labelEn: string }> = {
  large: { w: 190, h: 135, cols: 1, labelAr: 'كبير (2 بالصفحة)', labelEn: 'Large (2 per page)' },
  medium: { w: 94, h: 67, cols: 2, labelAr: 'وسط (8 بالصفحة)', labelEn: 'Medium (8 per page)' },
  small: { w: 62, h: 37, cols: 3, labelAr: 'صغير (21 بالصفحة)', labelEn: 'Small (21 per page)' },
};

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** LBP price: the product's own LBP price, else USD x rate rounded to the nearest 1,000. */
export const lbpPrice = (usd: number, rate: number) => Math.round((usd * rate) / 1000) * 1000;

function tagHtml(item: TagItem, o: TagOptions) {
  const ar = o.lang === 'ar';
  const p = item.product;
  const isOffer = o.style === 'offer' || (item.offerPriceUSD !== undefined && item.offerPriceUSD < p.priceUSD);
  const price = item.offerPriceUSD !== undefined ? item.offerPriceUSD : p.priceUSD;
  const lbp = item.offerPriceUSD === undefined && p.priceLBP ? p.priceLBP : lbpPrice(price, o.exchangeRate);
  const unit = p.isWeighed ? (ar ? ' / كغ' : ' / kg') : '';
  const [whole, cents] = price.toFixed(2).split('.');
  const band = isOffer ? (ar ? '🔥 عرض خاص' : '🔥 SPECIAL OFFER') : o.showShopName ? esc(o.shopName) : '';

  return `
    <div class="tag ${o.size} ${isOffer ? 'offer' : 'classic'}">
      ${band ? `<div class="band">${band}</div>` : ''}
      <div class="name">${esc(p.name)}</div>
      <div class="price-row">
        ${isOffer && price < p.priceUSD ? `<div class="old"><s>${p.priceUSD.toFixed(2)} $</s></div>` : ''}
        <div class="price"><span class="cur">$</span><span class="whole">${whole}</span><span class="cents">.${cents}</span><span class="unit">${unit}</span></div>
      </div>
      <div class="foot">
        ${o.showLbp ? `<span class="lbp">${lbp.toLocaleString('en-US')} ${ar ? 'ل.ل' : 'LBP'}</span>` : '<span></span>'}
        <span class="meta">${o.showBarcode && p.barcode ? `<span class="bc">${esc(p.barcode)}</span>` : ''}${o.showDate ? `<span class="dt">${esc(o.date)}</span>` : ''}</span>
      </div>
    </div>`;
}

export function buildShelfTags(items: TagItem[], o: TagOptions) {
  const tags = items.flatMap((it) => Array.from({ length: Math.max(1, it.count) }, () => tagHtml(it, o)));
  return `<div class="sheet ${o.size}" dir="${o.lang === 'ar' ? 'rtl' : 'ltr'}">${tags.join('')}</div>`;
}

/** CSS for the tags, scoped under `root` (the preview box or the print root). */
export function shelfTagsCss(root: string, size: TagSize) {
  const s = TAG_SIZES[size];
  // Font sizes scale with the tag height
  const k = s.h / 67;
  const r = root;
  return `
  ${r} .sheet { display: grid; grid-template-columns: repeat(${s.cols}, ${s.w}mm); gap: 2mm; justify-content: center; font-family: 'Cairo', Tahoma, Arial, sans-serif; }
  ${r} .tag { width: ${s.w}mm; height: ${s.h}mm; box-sizing: border-box; border: ${Math.max(0.6, 0.8 * k)}mm solid #D50000; border-radius: ${2 * k}mm;
    background: #FFD600; color: #111; display: flex; flex-direction: column; overflow: hidden; break-inside: avoid; page-break-inside: avoid;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  ${r} .tag * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  ${r} .band { background: #D50000; color: #fff; font-weight: 800; text-align: center; font-size: ${9 * k}pt; padding: ${0.8 * k}mm ${2 * k}mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${r} .name { font-weight: 800; text-align: center; font-size: ${11.5 * k}pt; line-height: 1.15; padding: ${1.5 * k}mm ${2.5 * k}mm 0;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  ${r} .price-row { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  ${r} .old { font-size: ${10 * k}pt; font-weight: 700; color: #333; direction: ltr; }
  ${r} .price { color: #D50000; font-weight: 900; direction: ltr; line-height: 0.9; display: flex; align-items: flex-start; }
  ${r} .price .cur { font-size: ${14 * k}pt; margin-top: ${1.5 * k}mm; margin-right: ${0.8 * k}mm; }
  ${r} .price .whole { font-size: ${40 * k}pt; letter-spacing: -0.02em; }
  ${r} .price .cents { font-size: ${18 * k}pt; margin-top: ${1.5 * k}mm; }
  ${r} .price .unit { font-size: ${9 * k}pt; align-self: flex-end; margin-left: ${1 * k}mm; color: #111; }
  ${r} .foot { display: flex; justify-content: space-between; align-items: flex-end; gap: 2mm; padding: 0 ${2.5 * k}mm ${1.2 * k}mm; font-size: ${8 * k}pt; font-weight: 700; }
  ${r} .foot .lbp { font-size: ${10 * k}pt; font-weight: 800; direction: ltr; unicode-bidi: isolate; }
  ${r} .foot .meta { display: flex; gap: 2mm; direction: ltr; color: #333; font-weight: 600; }
  ${r} .tag.offer { background: #D50000; color: #fff; border-color: #FFD600; }
  ${r} .tag.offer .band { background: #FFD600; color: #D50000; }
  ${r} .tag.offer .price { color: #FFD600; }
  ${r} .tag.offer .price .unit, ${r} .tag.offer .old, ${r} .tag.offer .foot .meta { color: #fff; }
  `;
}

export const SHELF_TAG_PAGE_CSS = `@page { size: A4 portrait; margin: 10mm; }`;

/** Offer price from an active single-product promotion, the same rule the till applies. */
export function promoPriceFor(product: Product, promotions: import('../../types').Promotion[], today: string): number | undefined {
  const promo = promotions.find((p) =>
    p.active && p.productId === product.id && !(p.startDate && today < p.startDate) && !(p.endDate && today > p.endDate));
  if (!promo) return undefined;
  const price = promo.discountType === 'fixed' ? product.priceUSD - promo.value : product.priceUSD * (100 - promo.value) / 100;
  return Math.max(0, Math.round(price * 100) / 100);
}
