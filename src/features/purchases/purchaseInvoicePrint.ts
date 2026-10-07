import { PurchaseInvoice } from '../../types';
import { printInPage } from '../../lib/print';
import { lineDiscount, lineGross, lineTax, lineTotal, sumLines } from './purchaseMath';

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const money = (n: number) => `${n.toFixed(2)} $`;
const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

export interface ShopIdentity {
  name: string;
  logo?: string; // data URL from Settings
}

/** A4 purchase invoice / goods received note: markup plus its print CSS (scoped to the print root). */
export function buildPurchaseInvoice(inv: PurchaseInvoice, shop: ShopIdentity, lang: 'ar' | 'en') {
  const ar = lang === 'ar';
  const t = (a: string, e: string) => (ar ? a : e);
  const items = inv.items;
  const hasDiscount = items.some((i) => (i.discountPercent || 0) > 0);
  const hasFree = items.some((i) => (i.freeQty || 0) > 0);
  const hasTax = items.some((i) => (i.taxRate || 0) > 0);

  const gross = sumLines(items, lineGross);
  const discount = inv.discountUSD ?? sumLines(items, lineDiscount);
  const tax = inv.taxUSD ?? sumLines(items, lineTax);
  const transport = inv.transportationCostUSD || 0;
  const offer = inv.offerFreeItems || [];
  const offerValue = inv.offerFreeValueUSD ?? offer.reduce((a, o) => a + o.qty * o.unitValueUSD, 0);
  const units = items.reduce((a, i) => a + i.qty + (i.freeQty || 0), 0) + offer.reduce((a, o) => a + o.qty, 0);

  const head = [
    '#',
    t('الصنف', 'Item'),
    t('الكمية', 'Qty'),
    ...(hasFree ? [t('مجاني', 'Free')] : []),
    t('سعر الوحدة', 'Unit price'),
    ...(hasDiscount ? [t('حسم', 'Disc.')] : []),
    ...(hasTax ? ['TVA'] : []),
    t('المجموع', 'Total'),
    t('سعر المبيع', 'Sell price'),
  ];

  const rows = items
    .map((i, n) => `
      <tr>
        <td class="c">${n + 1}</td>
        <td class="name">${esc(i.productName)}${i.expiryDate ? `<div class="sub">${t('صلاحية', 'Exp.')}: <span class="ltr">${esc(i.expiryDate)}</span></div>` : ''}</td>
        <td class="c">${num(i.qty)}</td>
        ${hasFree ? `<td class="c ltr">${i.freeQty ? `+${num(i.freeQty)}` : '—'}</td>` : ''}
        <td class="n">${money(i.costPriceUSD)}</td>
        ${hasDiscount ? `<td class="c">${i.discountPercent ? `${num(i.discountPercent)}%` : '—'}</td>` : ''}
        ${hasTax ? `<td class="c">${i.taxRate ? `${num(i.taxRate)}%` : '—'}</td>` : ''}
        <td class="n b">${money(lineTotal(i))}</td>
        <td class="n">${money(i.newPriceUSD)}</td>
      </tr>`)
    .join('');

  const summary = [
    [t('مجموع الأصناف', 'Items subtotal'), money(gross)],
    ...(discount > 0 ? [[t('الحسم', 'Discount'), `- ${money(discount)}`]] : []),
    ...(tax > 0 ? [[t('الضريبة (TVA)', 'VAT'), `+ ${money(tax)}`]] : []),
    ...(transport > 0 ? [[t('المواصلات والشحن', 'Transport'), `+ ${money(transport)}`]] : []),
  ]
    .map(([k, v]) => `<tr><td>${k}</td><td class="n">${v}</td></tr>`)
    .join('');

  const paid = inv.paymentStatus === 'paid';
  const css = `  @page { size: A4 portrait; margin: 14mm 12mm; }
  #in-page-print-root * { box-sizing: border-box; font-family: inherit; }
  #in-page-print-root { margin: 0; font-family: 'Cairo', Tahoma, Arial, sans-serif !important; font-size: 11pt; color: #000; }
  #in-page-print-root .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 8px; }
  #in-page-print-root .shop { font-size: 16pt; font-weight: 800; display: flex; align-items: center; gap: 10px; }
  #in-page-print-root .logo { max-height: 18mm; max-width: 40mm; object-fit: contain; }
  #in-page-print-root .doc { text-align: ${ar ? 'left' : 'right'}; }
  #in-page-print-root .doc h1 { margin: 0; font-size: 15pt; font-weight: 800; }
  #in-page-print-root .doc .no { font-variant-numeric: tabular-nums; font-size: 11pt; }
  #in-page-print-root .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px 14px; margin: 10px 0 12px; font-size: 10pt; }
  #in-page-print-root .meta div span { display: block; color: #555; font-size: 8.5pt; }
  #in-page-print-root .meta div b { font-size: 10.5pt; }
  #in-page-print-root table { width: 100%; border-collapse: collapse; }
  #in-page-print-root .items th { background: #eee; border: 1px solid #999; padding: 5px 4px; font-size: 9.5pt; }
  #in-page-print-root .items td { border: 1px solid #bbb; padding: 4px; font-size: 10pt; vertical-align: top; }
  #in-page-print-root .items tr { page-break-inside: avoid; }
  #in-page-print-root thead { display: table-header-group; }
  #in-page-print-root .c { text-align: center; }
  #in-page-print-root .n { text-align: center; font-variant-numeric: tabular-nums; white-space: nowrap; direction: ltr; unicode-bidi: isolate; }
  #in-page-print-root .ltr { direction: ltr; unicode-bidi: isolate; }
  #in-page-print-root .b { font-weight: 800; }
  #in-page-print-root .name { font-weight: 600; }
  #in-page-print-root .sub { font-size: 8pt; color: #555; font-weight: 400; }
  #in-page-print-root .offer { margin-top: 10px; }
  #in-page-print-root .offer th { background: #e0f2fe; }
  #in-page-print-root .bottom { display: flex; justify-content: space-between; gap: 16px; margin-top: 12px; page-break-inside: avoid; }
  #in-page-print-root .note { flex: 1; font-size: 9.5pt; border: 1px dashed #999; padding: 6px 8px; min-height: 40px; }
  #in-page-print-root .totals { width: 46%; }
  #in-page-print-root .totals td { padding: 3px 6px; border-bottom: 1px solid #ddd; }
  #in-page-print-root .totals .grand td { border-top: 2px solid #000; border-bottom: none; font-size: 13pt; font-weight: 800; padding-top: 6px; }
  #in-page-print-root .sign { display: flex; justify-content: space-between; margin-top: 36px; font-size: 9.5pt; page-break-inside: avoid; }
  #in-page-print-root .sign div { width: 40%; border-top: 1px solid #000; padding-top: 4px; text-align: center; }`;

  const body = `<div dir="${ar ? 'rtl' : 'ltr'}" lang="${lang}">
  <div class="top">
    <div class="shop">${shop.logo ? `<img class="logo" src="${esc(shop.logo)}" alt="">` : ''}<span>${esc(shop.name)}</span></div>
    <div class="doc">
      <h1>${t('فاتورة شراء / سند استلام بضاعة', 'Purchase invoice / Goods received')}</h1>
      <div class="no">${esc(inv.invoiceNumber)}</div>
    </div>
  </div>

  <div class="meta">
    <div><span>${t('المورّد', 'Supplier')}</span><b>${esc(inv.supplierName)}</b></div>
    <div><span>${t('التاريخ', 'Date')}</span><b class="ltr">${esc(inv.date)}</b></div>
    <div><span>${t('الدفع', 'Payment')}</span><b>${paid ? t('مدفوع نقداً', 'Paid') : t('دين على الحساب', 'On credit')}</b></div>
    <div><span>${t('الاستلام في', 'Received into')}</span><b>${inv.destination === 'warehouse' ? t('المستودع', 'Warehouse') : t('المحل', 'Shop')}</b></div>
  </div>

  <table class="items">
    <thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
${offer.length ? `
  <table class="items offer">
    <thead><tr><th colspan="3">🎁 ${t('بضاعة مجانية من عرض الفاتورة', 'Free goods from the invoice offer')}</th></tr>
      <tr><th>${t('الصنف', 'Item')}</th><th>${t('الكمية', 'Qty')}</th><th>${t('القيمة', 'Value')}</th></tr></thead>
    <tbody>${offer.map((o) => `<tr><td class="name">${esc(o.productName)}</td><td class="c">${num(o.qty)}</td><td class="n">${money(o.qty * o.unitValueUSD)}</td></tr>`).join('')}</tbody>
  </table>
  <div class="sub" style="margin-top:3px">${t(`قيمة الهدية ${money(offerValue)} وُزّعت كحسم على كلفة كل البضاعة.`, `Gift value ${money(offerValue)} spread as a discount over every item's cost.`)}</div>` : ''}

  <div class="bottom">
    <div class="note">
      <b>${t('عدد الأصناف', 'Lines')}:</b> ${items.length} &nbsp;•&nbsp; <b>${t('مجموع القطع المستلمة', 'Units received')}:</b> ${num(units)}
      ${inv.note ? `<div style="margin-top:4px"><b>${t('ملاحظات', 'Notes')}:</b> ${esc(inv.note)}</div>` : ''}
    </div>
    <table class="totals">
      ${summary}
      <tr class="grand"><td>${t('الإجمالي للمورّد', 'Total due')}</td><td class="n">${money(inv.totalAmountUSD)}</td></tr>
    </table>
  </div>

  <div class="sign">
    <div>${t('توقيع المستلم', 'Received by')}</div>
    <div>${t('توقيع المورّد', 'Supplier')}</div>
  </div>
</div>`;
  return { css, body };
}

export function printPurchaseInvoice(inv: PurchaseInvoice, shop: ShopIdentity, lang: 'ar' | 'en') {
  const { css, body } = buildPurchaseInvoice(inv, shop, lang);
  printInPage(body, css);
}
