import { PurchaseInvoice } from '../../types';
import { printHtmlDocument } from '../../lib/print';
import { lineDiscount, lineGross, lineTax, lineTotal, sumLines } from './purchaseMath';

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const money = (n: number) => `${n.toFixed(2)} $`;
const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/** A4 purchase invoice / goods received note, as a standalone HTML document. */
export function buildPurchaseInvoiceHtml(inv: PurchaseInvoice, shopName: string, lang: 'ar' | 'en') {
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
  const units = items.reduce((a, i) => a + i.qty + (i.freeQty || 0), 0);

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
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${ar ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<title>${esc(inv.invoiceNumber)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800&display=swap" rel="stylesheet">
<style>
  @page { size: A4 portrait; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Cairo', Tahoma, Arial, sans-serif; font-size: 11pt; color: #000; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 8px; }
  .shop { font-size: 16pt; font-weight: 800; }
  .doc { text-align: ${ar ? 'left' : 'right'}; }
  .doc h1 { margin: 0; font-size: 15pt; }
  .doc .no { font-family: monospace; font-size: 11pt; }
  .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px 14px; margin: 10px 0 12px; font-size: 10pt; }
  .meta div span { display: block; color: #555; font-size: 8.5pt; }
  .meta div b { font-size: 10.5pt; }
  table { width: 100%; border-collapse: collapse; }
  .items th { background: #eee; border: 1px solid #999; padding: 5px 4px; font-size: 9.5pt; }
  .items td { border: 1px solid #bbb; padding: 4px; font-size: 10pt; vertical-align: top; }
  .items tr { page-break-inside: avoid; }
  thead { display: table-header-group; }
  .c { text-align: center; }
  .n { text-align: center; font-family: monospace; white-space: nowrap; direction: ltr; unicode-bidi: isolate; }
  .ltr { direction: ltr; unicode-bidi: isolate; }
  .b { font-weight: 800; }
  .name { font-weight: 600; }
  .sub { font-size: 8pt; color: #555; font-weight: 400; }
  .bottom { display: flex; justify-content: space-between; gap: 16px; margin-top: 12px; page-break-inside: avoid; }
  .note { flex: 1; font-size: 9.5pt; border: 1px dashed #999; padding: 6px 8px; min-height: 40px; }
  .totals { width: 46%; }
  .totals td { padding: 3px 6px; border-bottom: 1px solid #ddd; }
  .totals .grand td { border-top: 2px solid #000; border-bottom: none; font-size: 13pt; font-weight: 800; padding-top: 6px; }
  .sign { display: flex; justify-content: space-between; margin-top: 36px; font-size: 9.5pt; page-break-inside: avoid; }
  .sign div { width: 40%; border-top: 1px solid #000; padding-top: 4px; text-align: center; }
</style>
</head>
<body>
  <div class="top">
    <div class="shop">${esc(shopName)}</div>
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
</body>
</html>`;
}

export function printPurchaseInvoice(inv: PurchaseInvoice, shopName: string, lang: 'ar' | 'en') {
  printHtmlDocument(buildPurchaseInvoiceHtml(inv, shopName, lang));
}
