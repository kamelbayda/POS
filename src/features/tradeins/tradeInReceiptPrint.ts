import { SystemSettings, TradeIn } from '../../types';
import { printInPage } from '../../lib/print';

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const CONDITION: Record<TradeIn['condition'], string> = { excellent: 'ممتاز', good: 'جيد', fair: 'مقبول' };

/** 80mm purchase receipt for a used phone, with the seller's ownership declaration. */
export function printTradeInReceipt(t: TradeIn, settings: SystemSettings) {
  const row = (k: string, v: string) => (v ? `<tr><td class="k">${k}</td><td>${v}</td></tr>` : '');
  const css = `@page { size: 80mm auto; margin: 3mm; }
  #in-page-print-root { font-family: 'Cairo', Tahoma, sans-serif !important; color: #000; width: 72mm; font-size: 10pt; }
  #in-page-print-root .c { text-align: center; }
  #in-page-print-root h1 { font-size: 13pt; margin: 0; font-weight: 800; }
  #in-page-print-root .no { font-size: 15pt; font-weight: 800; border: 2px solid #000; border-radius: 6px; padding: 2px 0; margin: 6px 0; }
  #in-page-print-root table { width: 100%; border-collapse: collapse; }
  #in-page-print-root td { padding: 2px 0; vertical-align: top; font-size: 9.5pt; }
  #in-page-print-root td.k { color: #333; white-space: nowrap; padding-left: 6px; font-weight: 700; }
  #in-page-print-root .ltr { direction: ltr; unicode-bidi: isolate; }
  #in-page-print-root hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  #in-page-print-root .big { font-size: 13pt; font-weight: 800; }
  #in-page-print-root .decl { font-size: 8.5pt; }
  #in-page-print-root .sign { margin-top: 20px; display: flex; justify-content: space-between; font-size: 8.5pt; }
  #in-page-print-root .sign div { width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 2px; }`;
  const body = `<div dir="rtl">
    <div class="c"><h1>${esc(settings.shopName)}</h1>
      ${settings.phone ? `<div>هاتف: <span class="ltr">${esc(settings.phone)}</span></div>` : ''}
      <div>سند شراء جهاز مستعمل</div>
      <div class="no ltr">${esc(t.number)}</div>
    </div>
    <table>
      ${row('التاريخ', `<span class="ltr">${esc(t.date)}</span>`)}
      ${row('البائع', esc(t.sellerName))}
      ${row('التلفون', `<span class="ltr">${esc(t.sellerPhone)}</span>`)}
      ${row('رقم الهوية', `<span class="ltr">${esc(t.sellerIdNumber)}</span>`)}
      ${row('الجهاز', esc(t.device))}
      ${row('IMEI', `<span class="ltr">${esc(t.imei)}</span>`)}
      ${row('الحالة', CONDITION[t.condition] + (t.batteryHealth ? ` · بطارية ${t.batteryHealth}%` : ''))}
      ${row('ملاحظات', esc(t.notes || ''))}
    </table>
    <hr>
    <table>${row('قيمة الجهاز', `<span class="big ltr">${t.pricePaidUSD.toFixed(2)} $</span>`)}${row('الدفع', t.payment === 'cash' ? 'نقداً' : t.payment === 'exchange' ? 'مقايضة بجهاز من المحل' : 'رصيد على حساب الزبون')}</table>
    ${t.exchange ? `<hr><table>
      ${row('استلم', esc(t.exchange.productName))}
      ${t.exchange.imei ? row('IMEI', `<span class="ltr">${esc(t.exchange.imei)}</span>`) : ''}
      ${row('سعر الجديد', `<span class="ltr">${t.exchange.priceUSD.toFixed(2)} $</span>`)}
      ${t.exchange.differenceUSD > 0
        ? row('الزبون دفع فرق', `<span class="big ltr">${t.exchange.differenceUSD.toFixed(2)} $</span> ${t.exchange.differenceMethod === 'debt' ? '(دين على الحساب)' : '(كاش)'}`)
        : t.exchange.differenceUSD < 0
          ? row('المحل دفع فرق', `<span class="big ltr">${(-t.exchange.differenceUSD).toFixed(2)} $</span> (كاش)`)
          : row('الفرق', 'لا يوجد')}
      ${row('فاتورة البيع', `<span class="ltr">${esc(t.exchange.invoiceNumber)}</span>`)}
    </table>` : ''}
    <hr>
    <div class="decl">أنا الموقّع أدناه أقرّ بأنّ الجهاز المذكور ملكي الشخصي، وغير مسروق أو مرهون أو مقفول على أي حساب، وأتحمّل كامل المسؤولية القانونية بخلاف ذلك، وقد استلمت قيمته المذكورة أعلاه.</div>
    <div class="sign"><div>توقيع البائع</div><div>توقيع المحل</div></div>
  </div>`;
  printInPage(body, css);
}
