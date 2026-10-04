import { Product, Invoice, SystemSettings, ReturnRecord, WasteRecord, ExpenseRecord } from '../types';
import { Printer, TrendingUp, DollarSign, Minus, ClipboardList, Hourglass, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { printElementViaIFrame } from '../lib/print';
import React from 'react';
import { costOfGoodsSold } from '../lib/operatingCost';

interface PrintReportModalProps {
  SYS_DATE: string;
  products: Product[];
  settings: SystemSettings;
  invoices: Invoice[];
  returns: ReturnRecord[];
  waste: WasteRecord[];
  expenses: ExpenseRecord[];
  theme: "light" | "dark";
  printReportType: "dashboard" | "pl" | "expenses" | "stock_audit" | "expiry_report" | "returns_report" | "waste_report" | "reorder_report";
  setPrintReportType: React.Dispatch<React.SetStateAction<"dashboard" | "pl" | "expenses" | "stock_audit" | "expiry_report" | "returns_report" | "waste_report" | "reorder_report">>;
  stockAuditReportLoc: "warehouse" | "shop" | "combined";
  totalSalesUSD: number;
  topSoldProductsList: { name: string; qty: number; amt: number; }[];
}

export function PrintReportModal({
  SYS_DATE,
  products,
  settings,
  invoices,
  returns,
  waste,
  expenses,
  theme,
  printReportType,
  setPrintReportType,
  stockAuditReportLoc,
  totalSalesUSD,
  topSoldProductsList,
}: PrintReportModalProps) {
  // Safe accounting values computed dynamically
  // Cost of goods sold: purchase cost plus the products' operating cost, shown apart
  const cogs = costOfGoodsSold(invoices, products);
  const totalCOGS = cogs.total;

  const grossProfit = totalSalesUSD - totalCOGS;
  const totalWasteLoss = waste.reduce((sum, item) => sum + (item.estimatedLossUSD || 0), 0);
  const totalExpensesUSD = expenses.reduce((sum, item) => sum + item.amountUSD, 0);
  const netProfit = grossProfit - totalWasteLoss - totalExpensesUSD;

  const getPrintReportQty = (p: Product) => {
    if (stockAuditReportLoc === 'warehouse') return p.warehouseQuantity || 0;
    if (stockAuditReportLoc === 'shop') return p.quantity;
    return p.quantity + (p.warehouseQuantity || 0); // combined mode
  };

  const invCostValue = products.reduce((sum, p) => {
    const cost = p.costPriceUSD !== undefined && p.costPriceUSD !== null
      ? p.costPriceUSD 
      : (p.priceWholesale !== undefined && p.priceWholesale !== null
        ? p.priceWholesale 
        : p.priceUSD * 0.75);
    return sum + (getPrintReportQty(p) * cost);
  }, 0);

  const invRetailValue = products.reduce((sum, p) => sum + (getPrintReportQty(p) * p.priceUSD), 0);
  const totalItemsCount = products.reduce((sum, p) => sum + getPrintReportQty(p), 0);

  let reportTitle = "";
  if (printReportType === 'dashboard') reportTitle = "تقرير حركة المبيعات وحالة البيع بالتجزئة";
  else if (printReportType === 'pl') reportTitle = "قائمة الأرباح والخسائر والمطابقة المالية";
  else if (printReportType === 'expenses') reportTitle = "كشف المصاريف التشغيلية والدفتر اليومي";
  else if (printReportType === 'stock_audit') reportTitle = "تقرير جرد وتقييم مخازن السلع";
  else if (printReportType === 'expiry_report') reportTitle = "بيان وتاريخ صلاحية العناصر ومخاطر الهدر";
  else if (printReportType === 'returns_report') reportTitle = "سجل وفهرس مرتجعات المبيعات المستلمة";
  else if (printReportType === 'waste_report') reportTitle = "تقرير المفقودات والتوالف والهالك من البضاعة";
  else if (printReportType === 'reorder_report') reportTitle = "تقرير السلع الناقصة وتنبيهات إعادة الطلب";

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xs flex flex-col z-50 overflow-y-auto animate-fade-in p-2 md:p-6" id="report-print-modal-container">
      {/* Dynamic style block to completely control printing of reports */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          html, body, html.dark, html.dark body, #root, #main-system {
            background: white !important;
            background-color: white !important;
            color: black !important;
            font-family: 'Cairo', system-ui, sans-serif !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #report-print-modal-container, #report-print-modal-container * {
            color: black !important;
            background: white !important;
            background-color: white !important;
            text-shadow: none !important;
            box-shadow: none !important;
          }
          #main-system {
            display: block !important;
          }
          #main-system > *:not(#report-print-modal-container) {
            display: none !important;
          }
          #report-print-modal-container {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 10mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          /* Print optimized table grids */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 11px !important;
            color: black !important;
          }
          th, td {
            border: 1px solid #000000 !important;
            padding: 6px 8px !important;
            color: black !important;
          }
          th {
            background-color: #f3f4f6 !important;
            color: black !important;
            font-weight: bold !important;
          }
          /* Ensure graphs or panels are page-break safe */
          .page-break-before {
            page-break-before: always !important;
          }
        }
      ` }} />

      {/* CONTROL BAR (no-print) */}
      <div className="no-print bg-slate-800 text-white rounded-2xl p-4 mb-6 shadow-xl border border-slate-700 max-w-5xl w-full mx-auto flex flex-col gap-4 text-right">
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="space-y-0.5">
            <h3 className="font-extrabold text-base text-amber-400 flex items-center justify-end gap-2">
              <span>لوحة طباعة وسحب التقارير الإدارية والمالية</span>
              <Printer className="w-5 h-5" />
            </h3>
            <p className="text-slate-300 text-[11px]">يمكنك التبديل بين مختلف تقارير الدكان ومراجعة معاينتها قبل إرسالها للطباعة أو حفظها كـ PDF.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                printElementViaIFrame('report-paper-sheet-content', `
                  body {
                    background: white !important;
                    color: black !important;
                    font-family: 'Cairo', system-ui, sans-serif !important;
                    padding: 10mm !important;
                  }
                  #report-paper-sheet-content {
                    background: white !important;
                    color: black !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    border: none !important;
                  }
                  table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    font-size: 11px !important;
                    color: black !important;
                  }
                  th, td {
                    border: 1px solid #cbd5e1 !important;
                    padding: 6px 8px !important;
                    color: black !important;
                  }
                  th {
                    background-color: #f3f4f6 !important;
                    font-weight: bold !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                  @page {
                    size: A4 portrait;
                    margin: 10mm;
                  }
                `, false); // Will trigger silent background spooling if directSilentPrint is enabled
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2 px-5 rounded-xl transition flex items-center gap-2 cursor-pointer text-xs shadow-md shadow-emerald-950/20"
            >
              <Printer className="w-4 h-4" />
              <span>{settings.directSilentPrint !== false ? 'طباعة صامتة فورية (تلقائي) ⚡' : 'بدء الطباعة أو تصدير PDF 🖨️ / 📄'}</span>
            </button>

            {settings.directSilentPrint !== false && (
              <button
                type="button"
                onClick={() => {
                  printElementViaIFrame('report-paper-sheet-content', `
                    body {
                      background: white !important;
                      color: black !important;
                      font-family: 'Cairo', system-ui, sans-serif !important;
                      padding: 10mm !important;
                    }
                    #report-paper-sheet-content {
                      background: white !important;
                      color: black !important;
                      width: 100% !important;
                      max-width: 100% !important;
                      padding: 0 !important;
                      margin: 0 !important;
                      box-shadow: none !important;
                      border: none !important;
                    }
                    table {
                      width: 100% !important;
                      border-collapse: collapse !important;
                      font-size: 11px !important;
                      color: black !important;
                    }
                    th, td {
                      border: 1px solid #cbd5e1 !important;
                      padding: 6px 8px !important;
                      color: black !important;
                    }
                    th {
                      background-color: #f3f4f6 !important;
                      font-weight: bold !important;
                    }
                    .no-print {
                      display: none !important;
                    }
                    @page {
                      size: A4 portrait;
                      margin: 10mm;
                    }
                  `, true); // Force manual print
                }}
                className="bg-slate-700 hover:bg-slate-650 text-slate-200 font-bold py-2 px-3 rounded-xl transition flex items-center gap-1 cursor-pointer text-xs border border-slate-600"
                title="فتح حوار طباعة المتصفح اليدوية للتقرير"
              >
                <span>طباعة يدوية / حفظ PDF 📄</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setPrintReportType(null)}
              className="bg-slate-750 hover:bg-slate-700 text-slate-300 font-bold py-2 px-4 rounded-xl transition text-xs cursor-pointer border border-slate-700"
            >
              إغلاق المعاينة ❌
            </button>
          </div>
        </div>

        {/* Quick Tabs inside printer */}
        <div className="border-t border-slate-700 pt-3">
          <div className="text-[10px] text-slate-400 font-bold mb-2">اختر التقرير المراد معاينته وطباعته الآن:</div>
          <div className="flex flex-wrap gap-1.5 justify-start font-sans">
            <button 
              onClick={() => setPrintReportType('dashboard')} 
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${printReportType === 'dashboard' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950'}` : 'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>📈 المبيعات والبيع</span>
            </button>
            <button 
              onClick={() => setPrintReportType('pl')} 
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${printReportType === 'pl' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950'}` : 'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>⚖️ الأرباح والخسائر</span>
            </button>
            <button 
              onClick={() => setPrintReportType('expenses')} 
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${printReportType === 'expenses' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950'}` : 'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}
            >
              <Minus className="w-3.5 h-3.5" />
              <span>💸 المصاريف ({expenses.length})</span>
            </button>
            <button 
              onClick={() => setPrintReportType('stock_audit')} 
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${printReportType === 'stock_audit' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950'}` : 'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>📋 جرد وقيمة المخازن</span>
            </button>
            <button 
              onClick={() => setPrintReportType('expiry_report')} 
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${printReportType === 'expiry_report' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950'}` : 'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}
            >
              <Hourglass className="w-3.5 h-3.5" />
              <span>⏳ صلاحية المنتجات</span>
            </button>
            <button 
              onClick={() => setPrintReportType('returns_report')} 
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${printReportType === 'returns_report' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950'}` : 'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>🔄 المرتجعات ({returns.length})</span>
            </button>
            <button 
              onClick={() => setPrintReportType('waste_report')} 
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${printReportType === 'waste_report' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950'}` : 'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>🗑️ التوالف ({waste.length})</span>
            </button>
            <button 
              onClick={() => setPrintReportType('reorder_report')} 
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${printReportType === 'reorder_report' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950'}` : 'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>⚠️ النواقص والمطلوب</span>
            </button>
          </div>
        </div>
      </div>

      {/* PAPER SHEETS PREVIEW SCROLL (Optimized high-contrast letter styling) */}
      <div id="report-paper-sheet-content" className="flex-1 max-w-4xl w-full mx-auto bg-white text-slate-950 shadow-2xl rounded-2xl md:rounded-3xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-8 md:p-12 space-y-8 text-right overflow-y-auto" style={{ direction: 'rtl' }}>

          {/* PAPER HEADER BOUNDARIES */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
            <div className="space-y-1">
              <h1 className="text-xl font-extrabold text-slate-900">{settings.shopName}</h1>
              <p className="text-slate-500 text-xs font-medium">المركز المحاسبي وإدارة السوبر ماركت وتجارة التجزئة</p>
              <p className="text-slate-400 text-[10px] font-mono leading-none">تاريخ السحب: {new Date(SYS_DATE).toLocaleDateString('ar-LB')} | {new Date(SYS_DATE).toLocaleTimeString('ar-LB')}</p>
            </div>
            <div className="text-left space-y-1">
              <div className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded">تقرير رسمي معتمد</div>
              <div className="text-[10px] text-slate-500">معدل الصرف: 1$ = {settings.exchangeRate.toLocaleString()} L.L</div>
            </div>
          </div>

          {/* REPORT TITLE DESCRIPTION */}
          <div className="text-center py-2 bg-slate-100 rounded-xl border border-slate-200">
            <h2 className="text-base font-extrabold text-slate-950 tracking-tight">📜 {reportTitle}</h2>
            <p className="text-slate-500 text-[10px] mt-1 font-medium">سجل تفصيلي لأداء المعاملات وحالة حسابات المحل التجاري وعلاقته بالجرود والمخازن.</p>
          </div>

          {/* DYNAMIC REPORT CONTENT RENDERING */}
          {printReportType === 'dashboard' && (() => {
            const dailySalesRaw: { 
              [date: string]: { 
                usd: number; 
                lbp: number; 
                count: number; 
                totalItems: number; 
              } 
            } = {};

            const monthlySalesRaw: {
              [month: string]: {
                usd: number;
                lbp: number;
                count: number;
                totalItems: number;
              }
            } = {};

            const categorySalesRaw: {
              [category: string]: {
                usd: number;
                qty: number;
                count: number;
              }
            } = {};

            invoices.forEach(inv => {
              const dateStr = inv.date;
              const monthStr = inv.date.substring(0, 7);

              // Daily
              if (!dailySalesRaw[dateStr]) {
                dailySalesRaw[dateStr] = { usd: 0, lbp: 0, count: 0, totalItems: 0 };
              }
              dailySalesRaw[dateStr].usd += inv.totalUSD;
              dailySalesRaw[dateStr].lbp += inv.totalLBP;
              dailySalesRaw[dateStr].count += 1;

              // Monthly
              if (!monthlySalesRaw[monthStr]) {
                monthlySalesRaw[monthStr] = { usd: 0, lbp: 0, count: 0, totalItems: 0 };
              }
              monthlySalesRaw[monthStr].usd += inv.totalUSD;
              monthlySalesRaw[monthStr].lbp += inv.totalLBP;
              monthlySalesRaw[monthStr].count += 1;

              const itemsCount = inv.items.reduce((acc, it) => acc + it.quantity, 0);
              dailySalesRaw[dateStr].totalItems += itemsCount;
              monthlySalesRaw[monthStr].totalItems += itemsCount;

              // Categories
              inv.items.forEach(item => {
                const matchingProd = products.find(p => p.id === item.productId);
                const catName = matchingProd?.category || 'عام';
                if (!categorySalesRaw[catName]) {
                  categorySalesRaw[catName] = { usd: 0, qty: 0, count: 0 };
                }
                categorySalesRaw[catName].usd += item.totalUSD;
                categorySalesRaw[catName].qty += item.quantity;
                categorySalesRaw[catName].count += 1;
              });
            });

            const dailySalesReportList = Object.entries(dailySalesRaw).map(([date, details]) => ({
              date,
              ...details,
            })).sort((a, b) => b.date.localeCompare(a.date));

            const monthlySalesReportList = Object.entries(monthlySalesRaw).map(([month, details]) => ({
              month,
              ...details,
            })).sort((a, b) => b.month.localeCompare(a.month));

            const categorySalesReportList = Object.entries(categorySalesRaw).map(([category, details]) => ({
              category,
              ...details,
            })).sort((a, b) => b.usd - a.usd);

            return (
              <div className="space-y-6">
                {/* Summary Tab */}
                <div className="grid grid-cols-3 gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50 text-right">
                  <div className="text-center space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold block">صافي الإيرادات الكلية ($ / L.L)</span>
                    <div className="text-sm font-black text-emerald-800">{totalSalesUSD.toFixed(2)} $</div>
                    <div className="text-[9px] text-slate-500 font-bold">{(totalSalesUSD * settings.exchangeRate).toLocaleString()} ل.ل</div>
                  </div>
                  <div className="text-center border-x border-slate-200 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold block">عدد الفواتير الصادرة</span>
                    <div className="text-sm font-black text-slate-900">{invoices.length} فواتير</div>
                    <div className="text-[9px] text-slate-400">منجزة بالكامل في الـ POS</div>
                  </div>
                  <div className="text-center space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold block">متوسط حجم الطلب / المبيع</span>
                    <div className="text-sm font-black text-slate-950">{(totalSalesUSD / (invoices.length || 1)).toFixed(2)} $</div>
                    <div className="text-[9px] text-slate-400">تقريبية حسب الفواتير</div>
                  </div>
                </div>

                {/* DAILY SALES PRINT */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <h4 className="font-extrabold text-xs text-slate-900 border-b pb-1.5 flex items-center justify-start gap-1">
                    <span>📅 كشف المبيعات والعمليات اليومية بالتفصيل</span>
                  </h4>
                  <table className="w-full text-right" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b text-[11px]">
                        <th className="p-2 border">التاريخ اليومي</th>
                        <th className="p-2 border text-center">عدد الفواتير المنفذة</th>
                        <th className="p-2 border text-center">إجمالي القطع المباعة</th>
                        <th className="p-2 border text-left">قيمة الدخل ($)</th>
                        <th className="p-2 border text-left">قيمة الدخل (L.L)</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px]">
                      {dailySalesReportList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-2 text-center text-slate-400">لا توفر بيانات لليوم.</td>
                        </tr>
                      ) : (
                        dailySalesReportList.slice(0, 31).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 border font-mono font-bold">{row.date}</td>
                            <td className="p-2 border text-center font-bold">{row.count} فواتير</td>
                            <td className="p-2 border text-center">{row.totalItems} قطعة</td>
                            <td className="p-2 border text-left font-mono font-bold text-slate-900">{row.usd.toFixed(2)}$</td>
                            <td className="p-2 border text-left font-mono text-emerald-800">{Math.ceil(row.lbp).toLocaleString()} ل.ل</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* MONTHLY AND CATEGORY SALES PRINT SECTION */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 page-break-before">
                  {/* Monthly */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                    <h4 className="font-extrabold text-xs text-slate-900 border-b pb-1.5">
                      <span>📆 البيان المقارن للمبيعات الشهرية</span>
                    </h4>
                    <table className="w-full text-right text-[10px]" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr className="bg-slate-50 text-slate-700">
                          <th className="p-2 border font-bold">الشهر الـ مستهدف</th>
                          <th className="p-2 border font-bold text-center">العمليات</th>
                          <th className="p-2 border font-bold text-left">الإيراد ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlySalesReportList.slice(0, 12).map((row, idx) => (
                          <tr key={idx}>
                            <td className="p-2 border font-bold">{row.month}</td>
                            <td className="p-2 border text-center">{row.count} عمليات</td>
                            <td className="p-2 border text-left font-mono font-black text-blue-900">{row.usd.toFixed(1)}$</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Category contribution */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                    <h4 className="font-extrabold text-xs text-slate-900 border-b pb-1.5">
                      <span>مساهمة تصنيفات وفئات السلع</span>
                    </h4>
                    <table className="w-full text-right text-[10px]" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr className="bg-slate-50 text-slate-700">
                          <th className="p-2 border font-bold">سمة الفئة</th>
                          <th className="p-2 border font-bold text-center">القطع المباعة</th>
                          <th className="p-2 border font-bold text-left">إجمالي المبيع ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categorySalesReportList.map((row, idx) => (
                          <tr key={idx}>
                            <td className="p-2 border font-bold text-slate-800">{row.category}</td>
                            <td className="p-2 border text-center">{row.qty} قطع</td>
                            <td className="p-2 border text-left font-mono font-bold text-emerald-800">{row.usd.toFixed(1)}$</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 space-y-3 page-break-before">
                  <h4 className="font-extrabold text-xs text-slate-900 border-b pb-1.5 flex items-center justify-start gap-1">
                    <span>🏆 الأصناف والمنتجات الأكثر طلباً ومبيعاً بالتعداد</span>
                  </h4>
                  <table className="w-full text-right text-[11px]" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="p-2 border font-bold text-center">#</th>
                        <th className="p-2 border font-bold">اسم المنتج الصنف</th>
                        <th className="p-2 border font-bold text-center">الكمية الكلية المباعة</th>
                        <th className="p-2 border font-bold text-left">قيمة الدخل المحقق ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topSoldProductsList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-400 text-xs">لا توجد عمليات بيع مسجلة مسبقاً لهذا التقرير.</td>
                        </tr>
                      ) : (
                        topSoldProductsList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 border text-center font-bold text-slate-500">{idx + 1}</td>
                            <td className="p-2 border font-bold text-slate-900">{item.name}</td>
                            <td className="p-2 border text-center font-bold">{item.qty} وحدة</td>
                            <td className="p-2 border text-left font-mono font-bold text-emerald-700">{item.amt.toFixed(2)} $</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 space-y-3 page-break-before">
                  <h4 className="font-extrabold text-xs text-slate-900 border-b pb-1.5">📋 سجل وقيود المبيعات الأخيرة المنجزة بالتسلسل</h4>
                  <table className="w-full text-right text-[10px]" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="p-2 border font-bold">رقم الفاتورة</th>
                        <th className="p-2 border font-bold">التاريخ والوقت يومياً</th>
                        <th className="p-2 border font-bold text-center">طريقة الدفع</th>
                        <th className="p-2 border font-bold text-center">الكاشير المسؤول</th>
                        <th className="p-2 border font-bold text-left">مجموع القيمة ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-400 text-xs">لا يوجد أي مبيعات مقيدة بالنظام.</td>
                        </tr>
                      ) : (
                        invoices.slice(-15).reverse().map((inv, idx) => (
                          <tr key={idx}>
                            <td className="p-2 border font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                            <td className="p-2 border text-slate-500 text-xs">{inv.date} | {inv.time}</td>
                            <td className="p-2 border text-center text-xs">{inv.paymentMethod === 'cash' ? 'كاش (Cash)' : inv.paymentMethod === 'debt' ? 'آجل (دين)' : 'بطاقة دفع'}</td>
                            <td className="p-2 border text-center text-slate-600 text-xs">{inv.cashier}</td>
                            <td className="p-2 border text-left font-mono font-bold text-blue-850">{inv.totalUSD.toFixed(2)} $</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {printReportType === 'pl' && (
            <div className="space-y-6">
              <div className="border-2 border-slate-900 rounded-xl p-5 space-y-4 bg-slate-50">
                <h3 className="text-xs font-bold text-slate-400 mb-2 border-b pb-1">ميزان حساب الأرباح والخسائر للنشاط التجاري</h3>
                <div className="flex justify-between items-center text-xs pb-1 border-b border-dashed border-slate-300">
                  <span className="font-bold text-slate-700">إجمالي ايرادات البيع بالتجزئة (مبيعات دكان):</span>
                  <span className="font-mono font-bold text-emerald-700">+{totalSalesUSD.toFixed(2)} $</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-1 border-b border-dashed border-slate-300">
                  <span className="font-bold text-slate-700">تكلفة البضاعة المقدرة الأصلي (COGS):</span>
                  <span className="font-mono font-bold text-rose-700">-{cogs.purchase.toFixed(2)} $</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-1 border-b border-dashed border-slate-300">
                  <span className="font-bold text-slate-700">الكلفة التشغيلية للأصناف المباعة:</span>
                  <span className="font-mono font-bold text-rose-700">-{cogs.operating.toFixed(2)} $</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2 rounded bg-emerald-50 border border-emerald-100">
                  <span className="font-extrabold text-[#1D9E75]">إجمالي الربح الإجمالي للنشاط (Gross Profit):</span>
                  <span className="font-mono font-black text-[#1D9E75]">+{grossProfit.toFixed(2)} $</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-1 border-b border-dashed border-slate-300">
                  <span className="font-bold text-slate-500">خسائر التوالف والأضرار الموثقة (Waste Loss):</span>
                  <span className="font-mono font-bold text-slate-800">-{totalWasteLoss.toFixed(2)} $</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-1 border-b border-dashed border-slate-300">
                  <span className="font-bold text-slate-500">إجمالي المصاريف العامة والبنود المدفوعة:</span>
                  <span className="font-mono font-bold text-slate-800">-{totalExpensesUSD.toFixed(2)} $</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 p-2 rounded bg-slate-900 text-white font-black">
                  <span className="text-amber-400 font-extrabold">صافي الإيرادات والأرباح الصافية (Net Profit):</span>
                  <span className="font-mono font-extrabold text-amber-400 text-base">{netProfit.toFixed(2)} $</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="font-extrabold text-xs text-slate-900 border-b pb-1">📊 رأس المال وعلاقة السيولة بجرودات المخازن</h4>
                <p className="text-[10px] text-slate-400">تحليلات الأصول الاستثمارية للسلع المتاحة حالياً على رفوف صالة العرض وفي المستودعات:</p>

                <div className="grid grid-cols-2 gap-4 text-center mt-2">
                  <div className="p-3 border rounded-xl bg-slate-50 text-xs">
                    <span className="text-slate-500 font-bold block mb-1">صافي قيمة رأس المال الميت بسعر التكلفة</span>
                    <span className="text-base font-mono font-black text-slate-950">{invCostValue.toFixed(2)} $</span>
                    <span className="text-[10px] text-slate-400 block">{(invCostValue * settings.exchangeRate).toLocaleString()} ل.ل</span>
                  </div>
                  <div className="p-3 border rounded-xl bg-slate-50 text-xs">
                    <span className="text-slate-500 font-bold block mb-1">القوة الاستثمارية المتوقعة عند المبيع بالتجزئة</span>
                    <span className="text-base font-mono font-black text-emerald-800">{invRetailValue.toFixed(2)} $</span>
                    <span className="text-[10px] text-slate-400 block">{(invRetailValue * settings.exchangeRate).toLocaleString()} ل.ل</span>
                  </div>
                </div>

                <div className="text-center bg-amber-50 text-amber-950 p-2.5 rounded-xl border border-amber-200 text-xs font-bold">
                  الأرباح المعقدة المتوقع جنيها فور إفراغ الرفوف: <span className="font-mono font-black text-emerald-900">{(invRetailValue - invCostValue).toFixed(2)} $</span>
                </div>
              </div>
            </div>
          )}

          {printReportType === 'expenses' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-center text-xs border border-slate-200 rounded-xl p-4 bg-slate-50">
                <div>
                  <div className="text-slate-500 font-bold mb-1">المصاريف الكلية الصادرة</div>
                  <div className="text-base font-mono font-black text-rose-700">-{totalExpensesUSD.toFixed(2)} $</div>
                  <div className="text-[10px] text-slate-400">{(totalExpensesUSD * settings.exchangeRate).toLocaleString()} ل.ل</div>
                </div>
                <div className="border-r border-slate-200">
                  <div className="text-slate-500 font-bold mb-1">عدد قيود الصرف المسجلة</div>
                  <div className="text-base font-black text-slate-800">{expenses.length} سند صرف نثري</div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="font-extrabold text-xs text-slate-900 border-b pb-1.5">📓 قائمة قيود المصاريف المسجلة بالدورية الحالية</h4>
                {expenses.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">لا يوجد مصاريف مسجلة أو مقيدة بصندوق الدورية الحالية.</div>
                ) : (
                  <table className="w-full text-right" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="p-2 border font-bold">التاريخ</th>
                        <th className="p-2 border font-bold">الفئة / التصنيف</th>
                        <th className="p-2 border font-bold text-center">المسؤول</th>
                        <th className="p-2 border font-bold">الوصف والبيان تفصيلاً</th>
                        <th className="p-2 border font-bold text-left">مجموع السند ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((exp, idx) => (
                        <tr key={idx}>
                          <td className="p-2 border font-mono text-xs">{exp.date}</td>
                          <td className="p-2 border font-bold text-rose-900">{exp.category}</td>
                          <td className="p-2 border text-center text-slate-650">المدير العام</td>
                          <td className="p-2 border text-slate-600 font-sans text-xs">{exp.title}</td>
                          <td className="p-2 border text-left font-mono font-bold text-red-650">-{exp.amountUSD.toFixed(2)} $</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {printReportType === 'stock_audit' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50 text-center text-xs">
                <div>
                  <div className="text-slate-400 font-bold mb-0.5">عدد السلع المسجلة</div>
                  <div className="text-xs font-black text-slate-800">{products.length} صنف متاح</div>
                </div>
                <div className="border-x">
                  <div className="text-slate-400 font-bold mb-0.5">إجمالي كمية القطع بالجرود</div>
                  <div className="text-xs font-black text-slate-800">{totalItemsCount} قطعة</div>
                </div>
                <div>
                  <div className="text-slate-400 font-bold mb-0.5">القيمة الكلية للسيولة المستثمرة</div>
                  <div className="text-xs font-mono font-bold text-emerald-800">{invCostValue.toFixed(2)} $</div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="font-extrabold text-xs text-slate-900 border-b pb-1.5">📦 كشف الجرد الشامل وتقدير قيمة مخزون الأصناف</h4>
                <table className="w-full text-right text-[10px]" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="p-1.5 border font-bold">الباركود</th>
                      <th className="p-1.5 border font-bold">اسم الصنف ودليل التعريف</th>
                      <th className="p-1.5 border font-bold">الفئة</th>
                      <th className="p-1.5 border font-bold text-center">الكمية</th>
                      <th className="p-1.5 border font-bold text-center">سعر التكلفة</th>
                      <th className="p-1.5 border font-bold text-center">سعر المبيع</th>
                      <th className="p-1.5 border font-bold text-left">قيمة التكلفة الكلية</th>
                      <th className="p-1.5 border font-bold text-left">قيمة المبيع الكلية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, idx) => {
                      const cost = p.costPriceUSD !== undefined && p.costPriceUSD !== null
                        ? p.costPriceUSD 
                        : (p.priceWholesale !== undefined && p.priceWholesale !== null
                          ? p.priceWholesale 
                          : p.priceUSD * 0.75);
                      const qty = getPrintReportQty(p);
                      return (
                        <tr key={idx} className={qty <= 0 ? 'bg-rose-50' : ''}>
                          <td className="p-1.5 border font-mono text-slate-500">{p.barcode}</td>
                          <td className="p-1.5 border font-bold text-slate-900">{p.name}</td>
                          <td className="p-1.5 border text-slate-650">{p.category}</td>
                          <td className="p-1.5 border text-center font-bold text-xs">{qty}</td>
                          <td className="p-1.5 border text-center font-mono">{cost.toFixed(2)}$</td>
                          <td className="p-1.5 border text-center font-mono">{p.priceUSD.toFixed(2)}$</td>
                          <td className="p-1.5 border text-left font-mono">{(qty * cost).toFixed(2)}$</td>
                          <td className="p-1.5 border text-left font-mono font-semibold text-emerald-700">{(qty * p.priceUSD).toFixed(2)}$</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {printReportType === 'expiry_report' && (
            <div className="space-y-6">
              {(() => {
                const expiredList = products.filter(p => p.expiryDate && new Date(p.expiryDate) < new Date(SYS_DATE));
                const nearExpiredList = products.filter(p => {
                  if (!p.expiryDate) return false;
                  const exDate = new Date(p.expiryDate);
                  const curr = new Date(SYS_DATE);
                  if (exDate < curr) return false;
                  const diffTime = exDate.getTime() - curr.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  return diffDays <= 30;
                });

                return (
                  <>
                    <div className="grid grid-cols-2 gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50 text-center text-xs">
                      <div>
                        <div className="text-red-700 font-bold mb-0.5">المنتهية الصلاحية بالجرود</div>
                        <div className="text-base font-black text-red-600">{expiredList.length} أصناف منتهية</div>
                      </div>
                      <div className="border-r">
                        <div className="text-amber-800 font-bold mb-0.5">تقترب للانتهاء قريباً (أقل من 30 يوماً)</div>
                        <div className="text-base font-black text-amber-600">{nearExpiredList.length} أصناف قريبة</div>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                      <h4 className="font-extrabold text-xs text-red-700 border-b pb-1.5">🚫 سلع وتواريخ الأصناف المنتهية (يجب تلفها وسحبها فوراً)</h4>
                      {expiredList.length === 0 ? (
                        <div className="text-center py-6 text-emerald-800 font-bold text-xs">ممتاز! لا يوجد أي أصناف منتهية الصلاحية بالمخازن والرفوف حالياً.</div>
                      ) : (
                        <table className="w-full text-right text-xs" style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr className="bg-red-50 text-red-950">
                              <th className="p-2 border font-bold">الباركود</th>
                              <th className="p-2 border font-bold">اسم المنتج الصنف وتاريخ التسجيل</th>
                              <th className="p-2 border font-bold text-center">الكمية المقيدة</th>
                              <th className="p-2 border font-bold text-center">تاريخ انتهاء الصلاحية</th>
                              <th className="p-2 border font-bold text-left">خسارة رأس المال المفترضة ($)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {expiredList.map((p, idx) => {
                              const cost = p.costPriceUSD !== undefined && p.costPriceUSD !== null ? p.costPriceUSD : p.priceUSD * 0.75;
                              return (
                                <tr key={idx} className="bg-red-50/20 text-red-950">
                                  <td className="p-2 border font-mono text-slate-500">{p.barcode}</td>
                                  <td className="p-2 border font-bold text-slate-900">{p.name}</td>
                                  <td className="p-2 border text-center font-bold text-red-650">{p.quantity} قطع</td>
                                  <td className="p-2 border text-center font-mono font-extrabold text-red-600">{p.expiryDate}</td>
                                  <td className="p-2 border text-left font-mono font-bold text-rose-700">{(p.quantity * cost).toFixed(2)}$</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>

                    <div className="border border-slate-200 rounded-xl p-4 space-y-3 page-break-before">
                      <h4 className="font-extrabold text-xs text-amber-800 border-b pb-1.5">⏳ مواد توشك على الانتهاء قريباً (خلال الثلاثين يوماً المقبلة)</h4>
                      {nearExpiredList.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs">لا توجد مواد توشك على الانتهاء خلال الثلاثين يوماً القادمة.</div>
                      ) : (
                        <table className="w-full text-right text-xs" style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr className="bg-amber-50 text-amber-950">
                              <th className="p-2 border font-bold">الباركود</th>
                              <th className="p-2 border font-bold">اسم الصنف المعرض للانتهاء</th>
                              <th className="p-2 border font-bold text-center">الكمية الحالية</th>
                              <th className="p-2 border font-bold text-center">تاريخ انتهاء الصلاحية</th>
                              <th className="p-2 border font-bold text-center">الأيام المتبقية التقريبية</th>
                            </tr>
                          </thead>
                          <tbody>
                            {nearExpiredList.map((p, idx) => {
                              const exDate = new Date(p.expiryDate!);
                              const curr = new Date(SYS_DATE);
                              const diffTime = exDate.getTime() - curr.getTime();
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              return (
                                <tr key={idx}>
                                  <td className="p-2 border font-mono text-slate-500">{p.barcode}</td>
                                  <td className="p-2 border font-bold text-slate-900">{p.name}</td>
                                  <td className="p-2 border text-center font-bold">{p.quantity}</td>
                                  <td className="p-2 border text-center font-mono font-bold text-amber-700">{p.expiryDate}</td>
                                  <td className="p-2 border text-center font-black text-amber-600 bg-amber-50/25">{diffDays} يوم متبقي</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {printReportType === 'returns_report' && (
            <div className="space-y-6">
              {(() => {
                const totalRefunds = returns.reduce((sum, r) => sum + r.refundAmountUSD, 0);
                return (
                  <>
                    <div className="grid grid-cols-2 gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50 text-center text-xs">
                      <div>
                        <div className="text-slate-500 font-bold mb-0.5">إجمالي المبالغ والتعويضات المعادة</div>
                        <div className="text-base font-mono font-black text-rose-700">{totalRefunds.toFixed(2)} $</div>
                        <div className="text-[10px] text-slate-400">{(totalRefunds * settings.exchangeRate).toLocaleString()} ل.ل</div>
                      </div>
                      <div className="border-r">
                        <div className="text-slate-500 font-bold mb-0.5">عدد حركات الارتجاع الموثقة بالـ POS</div>
                        <div className="text-base font-black text-slate-900">{returns.length} عمليات مرتجع</div>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                      <h4 className="font-extrabold text-xs text-slate-900 border-b pb-1.5">🔄 قائمة تفصيلية بالمرتجبات المستلمة من العملاء</h4>
                      {returns.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs">لا يوجد حركات مرتجع موثقة لهذا التقرير حالياً.</div>
                      ) : (
                        <table className="w-full text-right text-xs" style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr className="bg-slate-100 text-slate-700">
                              <th className="p-2 border font-bold">رقم الفاتورة الأصلي</th>
                              <th className="p-2 border font-bold">اسم المنتج الصنف المسترد</th>
                              <th className="p-2 border font-bold">تاريخ وساعة الإرجاع</th>
                              <th className="p-2 border font-bold text-center">الكمية المعادة</th>
                              <th className="p-2 border font-bold">سبب الإرجاع المدون</th>
                              <th className="p-2 border font-bold text-left">المستقطعات المالية للمسترد ($)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {returns.map((r, idx) => (
                              <tr key={idx}>
                                <td className="p-2 border font-mono text-slate-500 text-xs">{r.invoiceNumber || 'إرجاع يدوي'}</td>
                                <td className="p-2 border font-bold text-slate-900">{r.productName}</td>
                                <td className="p-2 border text-slate-500 text-xs">{r.date}</td>
                                <td className="p-2 border text-center font-bold">{r.quantity} قطع</td>
                                <td className="p-2 border text-xs text-slate-650 font-sans">{r.reason || 'تلف طفيف / تغيير خيار عابر'}</td>
                                <td className="p-2 border text-left font-mono font-bold text-blue-800">{r.refundAmountUSD.toFixed(2)} $</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {printReportType === 'waste_report' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50 text-center text-xs">
                <div>
                  <div className="text-rose-700 font-bold mb-0.5">اجمال خسائر استبعاد التالف بسعر التكلفة</div>
                  <div className="text-base font-mono font-black text-rose-750">{totalWasteLoss.toFixed(2)} $</div>
                  <div className="text-[10px] text-slate-450">{(totalWasteLoss * settings.exchangeRate).toLocaleString()} ل.ل</div>
                </div>
                <div className="border-r border-slate-200">
                  <div className="text-slate-500 font-bold mb-0.5">عدد قيود الصرف المستبعدة للهدر</div>
                  <div className="text-base font-black text-slate-900">{waste.length} عملية تلف بضائع</div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="font-extrabold text-xs text-slate-900 border-b pb-1.5">🗑️ سجل حركات التلاف والتسريب للسلع المدمرة بالتأريخ</h4>
                {waste.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">لا يوجد بضائع تالفة مقيدة لحساب الدورية الحالية.</div>
                ) : (
                  <table className="w-full text-right text-xs" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="p-2 border font-bold">التاريخ والتوقيت</th>
                        <th className="p-2 border font-bold">اسم المنتج الصنف التالف</th>
                        <th className="p-2 border font-bold text-center">الكمية المسحوبة من الرف</th>
                        <th className="p-2 border font-bold">شرح مسبب التلف (البيان)</th>
                        <th className="p-2 border font-bold text-left">قيمة الخسارة بسعر التكلفة ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waste.map((w, idx) => (
                        <tr key={idx}>
                          <td className="p-2 border font-mono text-slate-500 text-xs">{w.date}</td>
                          <td className="p-2 border font-bold text-slate-900">{w.productName}</td>
                          <td className="p-2 border text-center font-bold text-rose-900">{w.quantity} قطعة</td>
                          <td className="p-2 border text-slate-600 font-sans text-xs">{w.note || 'سوء تخزين / تضرر الغلاف / كسر'}</td>
                          <td className="p-2 border text-left font-mono font-bold text-rose-700">{(w.estimatedLossUSD || 0).toFixed(2)} $</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {printReportType === 'reorder_report' && (
            <div className="space-y-6">
              {(() => {
                const depletedList = products.filter(p => p.quantity <= settings.lowStockThreshold);
                return (
                  <>
                    <div className="border border-slate-200 rounded-xl p-4 bg-amber-50 text-center text-xs">
                      <h3 className="text-amber-900 font-bold mb-0.5">إحصاء السلع النافذة أو التي وصلت لحد إعادة الطلب الحرج</h3>
                      <div className="text-sm font-black text-amber-950 mt-1">يوجد عدد ({depletedList.length}) أصناف حرجة تحتاج لتعبئة المخازن فوراً.</div>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                      <h4 className="font-extrabold text-xs text-slate-900 border-b pb-1.5">⚠️ قائمة النواقص وحال السلع ذات المستويات الضعيفة</h4>
                      {depletedList.length === 0 ? (
                        <div className="text-center py-6 text-emerald-800 font-bold text-xs">مبارك بنجاح! جميع منتجات الدكان بمستويات مخزونات كافية ولا سلع ناقصة حاليا.</div>
                      ) : (
                        <table className="w-full text-right text-xs" style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr className="bg-amber-50 text-amber-950">
                              <th className="p-2 border font-bold">الباركود</th>
                              <th className="p-2 border font-bold">اسم المنتج الصنف الناقص</th>
                              <th className="p-2 border font-bold">الفئة تنظيم</th>
                              <th className="p-2 border font-bold text-center">الكمية الحالية</th>
                              <th className="p-2 border font-bold text-center">الحد الأدنى لطلب التوريد</th>
                              <th className="p-2 border font-bold text-center font-bold">تقييم النقص الحركي لـ POS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {depletedList.map((p, idx) => (
                              <tr key={idx} className={p.quantity <= 0 ? 'bg-red-50 text-red-950 hover:bg-red-100' : 'hover:bg-slate-50'}>
                                <td className="p-2 border font-mono text-slate-500">{p.barcode}</td>
                                <td className="p-2 border font-bold text-slate-900">{p.name}</td>
                                <td className="p-2 border text-slate-600 text-xs">{p.category}</td>
                                <td className="p-2 border text-center font-black text-rose-800">{p.quantity} قطع</td>
                                <td className="p-2 border text-center text-slate-500 font-mono">{settings.lowStockThreshold} قطع</td>
                                <td className="p-2 border text-center font-bold">
                                  {p.quantity <= 0 ? (
                                    <span className="text-red-700 bg-red-100 font-extrabold text-[9px] px-2 py-0.5 rounded border border-red-200">نفاد تام 🚫</span>
                                  ) : (
                                    <span className="text-amber-700 bg-amber-100 font-bold text-[9px] px-2 py-0.5 rounded border border-amber-200">مستوى ضعيف ⚠️</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* SIGNATURE AREA IN FOOTER WRAPPERS */}
          <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between items-center text-xs text-slate-400 font-sans">
            <div>
              <p className="font-bold text-slate-800">توقيع محاسب / كاشير المحل:</p>
              <p className="mt-4 border-b border-dashed border-slate-450 w-32"></p>
            </div>
            <div className="text-left font-serif text-[10px]">
              <p>{settings.shopName} - نظام محاسبة التجزئة POS</p>
              <p>مبني وموثق وفق الميزانيات والسيولة.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
