import { RepairTicket, SystemSettings } from '../../types';
import { printInPage } from '../../lib/print';

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** 80mm repair ticket for the customer: keep it to collect the device. */
export function printRepairTicket(t: RepairTicket, settings: SystemSettings) {
  const row = (k: string, v: string) => (v ? `<tr><td class="k">${k}</td><td>${v}</td></tr>` : '');
  const money = (n: number) => `<span class="ltr">${n.toFixed(2)} $</span>`;
  const css = `@page { size: 80mm auto; margin: 3mm; }
  #in-page-print-root { font-family: 'Cairo', Tahoma, sans-serif !important; color: #000; width: 72mm; font-size: 10pt; }
  #in-page-print-root .c { text-align: center; }
  #in-page-print-root h1 { font-size: 13pt; margin: 0; font-weight: 800; }
  #in-page-print-root .no { font-size: 18pt; font-weight: 800; letter-spacing: 1px; border: 2px solid #000; border-radius: 6px; padding: 2px 0; margin: 6px 0; }
  #in-page-print-root table { width: 100%; border-collapse: collapse; }
  #in-page-print-root td { padding: 2px 0; vertical-align: top; font-size: 9.5pt; }
  #in-page-print-root td.k { color: #333; white-space: nowrap; padding-left: 6px; font-weight: 700; }
  #in-page-print-root .ltr { direction: ltr; unicode-bidi: isolate; }
  #in-page-print-root hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  #in-page-print-root .terms { font-size: 8pt; color: #222; }
  #in-page-print-root .sign { margin-top: 18px; display: flex; justify-content: space-between; font-size: 8.5pt; }
  #in-page-print-root .sign div { width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 2px; }`;
  const body = `<div dir="rtl">
    <div class="c"><h1>${esc(settings.shopName)}</h1>
      ${settings.phone ? `<div>هاتف: <span class="ltr">${esc(settings.phone)}</span></div>` : ''}
      <div>إيصال استلام جهاز للتصليح</div>
      <div class="no ltr">${esc(t.ticketNumber)}</div>
    </div>
    <table>
      ${row('التاريخ', `<span class="ltr">${esc(t.date)}</span>`)}
      ${row('الزبون', esc(t.customerName))}
      ${row('التلفون', `<span class="ltr">${esc(t.customerPhone)}</span>`)}
      ${row('الجهاز', esc(t.device))}
      ${row('IMEI', t.imei ? `<span class="ltr">${esc(t.imei)}</span>` : '')}
      ${row('العطل', esc(t.problem))}
      ${row('مع الجهاز', esc(t.accessories || ''))}
      ${row('الموعد المتوقع', t.expectedDate ? `<span class="ltr">${esc(t.expectedDate)}</span>` : '')}
    </table>
    <hr>
    <table>
      ${row('الكلفة التقريبية', money(t.estimateUSD))}
      ${t.depositUSD > 0 ? row('العربون المدفوع', money(t.depositUSD)) : ''}
    </table>
    <hr>
    <div class="terms">احتفظ بهالإيصال لتستلم جهازك. المحل مش مسؤول عن الأجهزة يلي ما بتنستلم خلال 30 يوم من تاريخ الجهوزية. الكلفة النهائية ممكن تختلف بعد الفحص، ومنتصل فيك قبل أي تصليح إضافي.</div>
    <div class="sign"><div>توقيع الزبون</div><div>توقيع المحل</div></div>
  </div>`;
  printInPage(body, css);
}
