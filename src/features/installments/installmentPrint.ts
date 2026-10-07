import { InstallmentPlan, SystemSettings } from '../../types';
import { printInPage } from '../../lib/print';
import { remainingOf } from '../../lib/installments';

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** A4 instalment agreement with the monthly schedule and what was paid so far. */
export function printInstallmentPlan(p: InstallmentPlan, settings: SystemSettings) {
  const css = `@page { size: A4; margin: 14mm; }
  #in-page-print-root { font-family: 'Cairo', Tahoma, sans-serif !important; color: #000; font-size: 11pt; }
  #in-page-print-root h1 { font-size: 17pt; margin: 0; }
  #in-page-print-root .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px; }
  #in-page-print-root .ltr { direction: ltr; unicode-bidi: isolate; }
  #in-page-print-root table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  #in-page-print-root th, #in-page-print-root td { border: 1px solid #000; padding: 4px 6px; text-align: center; font-size: 10pt; }
  #in-page-print-root th { background: #eee; }
  #in-page-print-root .info td { border: none; text-align: right; padding: 2px 4px; }
  #in-page-print-root .info td.k { font-weight: 700; width: 22%; }
  #in-page-print-root .decl { font-size: 9.5pt; margin-top: 10px; line-height: 1.7; }
  #in-page-print-root .sign { margin-top: 36px; display: flex; justify-content: space-between; }
  #in-page-print-root .sign div { width: 28%; border-top: 1px solid #000; text-align: center; padding-top: 3px; font-size: 10pt; }`;
  const rows = p.schedule.map((d, i) => `<tr><td>${i + 1}</td><td class="ltr">${esc(d.dueDate)}</td><td class="ltr">${d.amountUSD.toFixed(2)} $</td><td class="ltr">${d.paidUSD > 0 ? d.paidUSD.toFixed(2) + ' $' : ''}</td><td class="ltr">${esc(d.paidDate || '')}</td><td></td></tr>`).join('');
  const markup = p.totalUSD - (p.priceUSD - p.downPaymentUSD);
  const body = `<div dir="rtl">
    <div class="head">
      <div><h1>${esc(settings.shopName)}</h1>${settings.phone ? `<div>هاتف: <span class="ltr">${esc(settings.phone)}</span></div>` : ''}${settings.address ? `<div>${esc(settings.address)}</div>` : ''}</div>
      <div style="text-align:left"><div style="font-size:14pt;font-weight:800">عقد بيع بالتقسيط</div><div class="ltr" style="font-size:13pt;font-weight:800">${esc(p.number)}</div><div class="ltr">${esc(p.date)}</div></div>
    </div>
    <table class="info">
      <tr><td class="k">الزبون</td><td>${esc(p.customerName)}</td><td class="k">التلفون</td><td class="ltr">${esc(p.customerPhone)}</td></tr>
      ${p.guarantorName ? `<tr><td class="k">الكفيل</td><td>${esc(p.guarantorName)}</td><td class="k">تلفون الكفيل</td><td class="ltr">${esc(p.guarantorPhone || '')}</td></tr>` : ''}
      <tr><td class="k">البضاعة</td><td colspan="3">${esc(p.description)}</td></tr>
      <tr><td class="k">السعر</td><td class="ltr">${p.priceUSD.toFixed(2)} $</td><td class="k">الدفعة الأولى</td><td class="ltr">${p.downPaymentUSD.toFixed(2)} $</td></tr>
      ${markup > 0.001 ? `<tr><td class="k">زيادة التقسيط</td><td class="ltr">${markup.toFixed(2)} $ (${p.markupPercent}%)</td><td></td><td></td></tr>` : ''}
      <tr><td class="k">المبلغ المقسّط</td><td class="ltr">${p.totalUSD.toFixed(2)} $</td><td class="k">عدد الأقساط</td><td>${p.months} أشهر</td></tr>
      <tr><td class="k">الباقي حالياً</td><td class="ltr"><b>${remainingOf(p).toFixed(2)} $</b></td><td></td><td></td></tr>
    </table>
    <table><thead><tr><th>#</th><th>تاريخ الاستحقاق</th><th>القسط</th><th>المدفوع</th><th>تاريخ الدفع</th><th>توقيع</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="decl">يتعهّد الزبون${p.guarantorName ? ' والكفيل متضامنين' : ''} بدفع الأقساط المذكورة أعلاه في مواعيدها، وفي حال التأخّر عن دفع قسطين متتاليين يحقّ للمحل المطالبة بكامل المبلغ المتبقّي دفعة واحدة. تبقى البضاعة ملكاً للمحل حتى سداد كامل الثمن.</div>
    <div class="sign"><div>توقيع الزبون</div>${p.guarantorName ? '<div>توقيع الكفيل</div>' : ''}<div>توقيع المحل</div></div>
  </div>`;
  printInPage(body, css);
}
