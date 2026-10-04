import React, { useState } from 'react';
import { AlertTriangle, Calendar, Check, CheckCircle2, DollarSign, FileText, Globe, Hourglass, Layers, Printer, RefreshCw, Search, ShieldAlert, ShoppingBag, Trash2, TrendingUp } from 'lucide-react';
import { ExpenseRecord, Invoice, Product, Promotion, ReturnRecord, SystemSettings, WasteRecord } from '../../types';
import { withOperatingCost } from '../../lib/operatingCost';

export type ReportType = 'dashboard' | 'pl' | 'expenses' | 'stock_audit' | 'expiry_report' | 'returns_report' | 'waste_report' | 'reorder_report';
export type StockAuditLocation = 'shop' | 'warehouse' | 'combined';

interface ReportsTabProps {
  products: Product[];
  invoices: Invoice[];
  returns: ReturnRecord[];
  waste: WasteRecord[];
  promotions: Promotion[];
  expenses: ExpenseRecord[];
  settings: SystemSettings;
  theme: 'light' | 'dark';
  today: string;
  lang: 'ar' | 'en';
  showToast: (type: 'success' | 'error' | 'warning', message: string) => void;
  totalSalesUSD: number;
  totalSalesLBP: number;
  topSoldProductsList: { name: string; qty: number; amt: number }[];
  /** Shared with the printable report, so it lives in App.tsx. */
  stockAuditReportLoc: StockAuditLocation;
  setStockAuditReportLoc: (loc: StockAuditLocation) => void;
  onExpensesChange: (updated: ExpenseRecord[]) => void;
  /** Returns true when the promotion was created. */
  onAddStagnantPromotion: (productId: string, value: number, discountType: 'percentage' | 'fixed', durationDays: number) => boolean;
  onQuickWaste: (productId: string, qty: number, reason: 'expired' | 'damaged_on_shelf') => void;
  onPrintReport: (type: ReportType) => void;
}

export function ReportsTab({
  products,
  invoices,
  returns,
  waste,
  promotions,
  expenses,
  settings,
  theme,
  today,
  lang,
  showToast,
  totalSalesUSD,
  totalSalesLBP,
  topSoldProductsList,
  stockAuditReportLoc,
  setStockAuditReportLoc,
  onExpensesChange,
  onAddStagnantPromotion,
  onQuickWaste,
  onPrintReport,
}: ReportsTabProps) {
  const [reportsSubTab, setReportsSubTab] = useState<'dashboard' | 'pl' | 'expenses' | 'stock_audit' | 'expiry_report' | 'returns_report' | 'waste_report' | 'reorder_report'>('dashboard');
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'daily' | 'monthly' | 'bestsellers' | 'categories'>('overview');
  const [stagnantPromoProduct, setStagnantPromoProduct] = useState<string | null>(null);
  const [stagnantPromoValue, setStagnantPromoValue] = useState<string>('20');
  const [stagnantPromoType, setStagnantPromoType] = useState<'percentage' | 'fixed'>('percentage');
  const [stagnantPromoDurationDays, setStagnantPromoDurationDays] = useState<number>(30);
  const [expiryReportFilter, setExpiryReportFilter] = useState<'all' | 'expired' | 'near_expiry' | 'safe'>('all');
  const [expirySearchQuery, setExpirySearchQuery] = useState<string>('');
  const [returnsSearchQuery, setReturnsSearchQuery] = useState<string>('');
  const [wasteSearchQuery, setWasteSearchQuery] = useState<string>('');
  const [reorderSearchQuery, setReorderSearchQuery] = useState<string>('');
  // --- EXPENSE FORM STATES ---
  const [newExpTitle, setNewExpTitle] = useState<string>('');
  const [newExpCategory, setNewExpCategory] = useState<'rent' | 'electricity' | 'salaries' | 'generator' | 'other'>('other');
  const [newExpAmount, setNewExpAmount] = useState<string>('');
  const [newExpDate, setNewExpDate] = useState<string>(today);

  // --- EXPENSE LEDGER HANDLERS ---
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newExpTitle.trim();
    const amount = parseFloat(newExpAmount);
    if (!title || isNaN(amount) || !newExpDate) {
      showToast('error', 'الرجاء ملء كافة الخلايا لإدخال المصروف!');
      return;
    }
    const newExp: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      title,
      category: newExpCategory,
      amountUSD: amount,
      date: newExpDate
    };
    onExpensesChange([newExp, ...expenses]);
    showToast('success', `تم تسجيل المصروف [${title}] بقيمة ${amount}$ بنجاح.`);
    setNewExpTitle('');
    setNewExpAmount('');
    setNewExpCategory('other');
    setNewExpDate(today);
  };

  const handleDeleteExpense = (id: string, title: string) => {
    if (window.confirm(`حذف مصروف: هل أنت متأكد من حذف المصروف "${title}"؟`)) {
      onExpensesChange(expenses.filter(exp => exp.id !== id));
      showToast('success', `تم حذف المصروف [${title}] من سجلات المحل.`);
    }
  };

  // Daily Sales calculation for custom SVG graph projection
  const salesByDate: { [key: string]: number } = {};
  invoices.forEach(inv => {
    salesByDate[inv.date] = (salesByDate[inv.date] || 0) + inv.totalUSD;
  });

  const sortedDatesForChart = Object.keys(salesByDate).sort().slice(-7);
  const chartPoints = sortedDatesForChart.map(date => ({
    date,
    val: salesByDate[date]
  }));

  // Compute Accounting values
  const totalCOGS = invoices.reduce((sum, inv) => {
    const invCOGS = inv.items.reduce((itemSum, item) => {
      const prod = products.find(p => p.id === item.productId);
      const baseCost = prod?.costPriceUSD !== undefined && prod?.costPriceUSD !== null
        ? prod.costPriceUSD 
        : (prod?.priceWholesale !== undefined && prod?.priceWholesale !== null
          ? prod.priceWholesale 
          : item.priceUSD * 0.75);
      // Cost of goods sold includes the product's operating cost
      const cost = prod ? withOperatingCost(prod, baseCost) : baseCost;
      return itemSum + (cost * item.quantity);
    }, 0);
    return sum + invCOGS;
  }, 0);

  const grossProfit = totalSalesUSD - totalCOGS;
  const totalWasteLoss = waste.reduce((sum, item) => sum + (item.estimatedLossUSD || 0), 0);
  const totalExpensesUSD = expenses.reduce((sum, item) => sum + item.amountUSD, 0);
  const netProfit = grossProfit - totalWasteLoss - totalExpensesUSD;

  // Helper to get product stock quantity according to audit location setup
  const getReportQty = (p: Product) => {
    if (stockAuditReportLoc === 'warehouse') return p.warehouseQuantity || 0;
    if (stockAuditReportLoc === 'shop') return p.quantity;
    return p.quantity + (p.warehouseQuantity || 0); // combined mode
  };

  // Inventory Valuations
  const invCostValue = products.reduce((sum, p) => {
    const cost = p.costPriceUSD !== undefined && p.costPriceUSD !== null
      ? p.costPriceUSD 
      : (p.priceWholesale !== undefined && p.priceWholesale !== null
        ? p.priceWholesale 
        : p.priceUSD * 0.75);
    return sum + (getReportQty(p) * cost);
  }, 0);

  const invRetailValue = products.reduce((sum, p) => sum + (getReportQty(p) * p.priceUSD), 0);
  const invPotentialProfit = invRetailValue - invCostValue;

  return (
    <div className="space-y-6 text-right">
      
      {/* Upper Header and Navigation */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-right space-y-1.5 order-last md:order-first w-full md:w-auto">
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 justify-end sm:justify-start">
            <h3 className="font-extrabold text-lg text-emerald-400">📊 المركز المحاسبي والمالي المتكامل</h3>
            <button
              type="button"
              onClick={() => onPrintReport(reportsSubTab)}
              className={`bg-amber-500 hover:bg-amber-400 ${theme === 'dark' ? 'text-white' : 'text-slate-950'} font-bold px-3.5 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md border border-amber-400 font-sans cursor-pointer`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة هذا التقرير 🖨️</span>
            </button>
          </div>
          <p className="text-slate-300 text-xs">حسابات الأرباح والخسائر، قيود المصاريف التشغيلية، ومطابقة وتقدير قيمة مخزون المحل.</p>
        </div>
        <div className="bg-slate-800 p-1 rounded-xl flex flex-wrap items-center gap-1.5 font-sans">
          <button 
            onClick={() => setReportsSubTab('dashboard')} 
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${reportsSubTab === 'dashboard' ? 'bg-[#1D9E75] text-white' : 'text-slate-300 hover:text-white'}`}
          >
            📈 المبيعات والبيع
          </button>
          <button 
            onClick={() => setReportsSubTab('pl')} 
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${reportsSubTab === 'pl' ? 'bg-[#1D9E75] text-white' : 'text-slate-300 hover:text-white'}`}
          >
            ⚖️ الأرباح والخسائر والمحاسبة
          </button>
          <button 
            onClick={() => setReportsSubTab('expenses')} 
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${reportsSubTab === 'expenses' ? 'bg-[#1D9E75] text-white' : 'text-slate-300 hover:text-white'}`}
          >
            💸 المصاريف ({expenses.length})
          </button>
          <button 
            onClick={() => setReportsSubTab('stock_audit')} 
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${reportsSubTab === 'stock_audit' ? 'bg-[#1D9E75] text-white' : 'text-slate-300 hover:text-white'}`}
          >
            📋 جرد وقيمة المخازن
          </button>
          <button 
            onClick={() => setReportsSubTab('expiry_report')} 
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${reportsSubTab === 'expiry_report' ? 'bg-[#1D9E75] text-white' : 'text-slate-300 hover:text-white'}`}
          >
            ⏳ تقرير صلاحية المنتجات
          </button>
          <button 
            onClick={() => setReportsSubTab('returns_report')} 
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${reportsSubTab === 'returns_report' ? 'bg-[#1D9E75] text-white' : 'text-slate-300 hover:text-white'}`}
          >
            🔄 تقرير المرتجعات ({returns.length})
          </button>
          <button 
            onClick={() => setReportsSubTab('waste_report')} 
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${reportsSubTab === 'waste_report' ? 'bg-[#1D9E75] text-white' : 'text-slate-300 hover:text-white'}`}
          >
            🗑️ تقرير التوالف ({waste.length})
          </button>
          <button 
            onClick={() => setReportsSubTab('reorder_report')} 
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${reportsSubTab === 'reorder_report' ? 'bg-[#1D9E75] text-white' : 'text-slate-350 hover:text-white'}`}
          >
            ⚠️ النواقص وحد الطلب ({products.filter(p => p.quantity <= settings.lowStockThreshold).length})
          </button>
        </div>
      </div>

      {/* SUBTAB CONTENT: 1. DASHBOARD */}
      {reportsSubTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in" id="reports-dashboard-panel">
          {/* Stats grids */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5" id="reports-widgets">
            
            <div className="bg-white rounded-2xl border border-slate-200 p-5 text-right flex items-center justify-between">
              <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
                <DollarSign className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-bold mb-1">صافي الإيرادات بالدولار ($)</span>
                <span className="text-2xl font-black font-mono text-blue-600">{totalSalesUSD.toFixed(2)} $</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 text-right flex items-center justify-between">
              <div className="bg-emerald-50 text-[#1D9E75] p-3 rounded-xl">
                <Globe className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-bold mb-1">صافي الإيرادات بالليرة (L.L)</span>
                <span className="text-xl font-black font-mono text-emerald-600">
                  {Math.ceil(totalSalesLBP).toLocaleString()} ل.ل
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 text-right flex items-center justify-between">
              <div className="bg-slate-50 text-slate-600 p-3 rounded-xl">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-bold mb-1">عدد عمليات البيع الكلية</span>
                <span className="text-2xl font-black font-mono text-slate-800">{invoices.length} فواتير</span>
              </div>
            </div>

          </div>

          {/* SMART ALERTS PANEL: Products unsold for 90+ days */}
          {(() => {
            const lastSoldMap: { [productId: string]: string } = {};
            invoices.forEach(inv => {
              const invDateStr = inv.date;
              if (inv.items && Array.isArray(inv.items)) {
                inv.items.forEach(item => {
                  if (item.productId) {
                    const currentLast = lastSoldMap[item.productId];
                    if (!currentLast || invDateStr > currentLast) {
                      lastSoldMap[item.productId] = invDateStr;
                    }
                  }
                });
              }
            });

            const now = new Date();
            const stagnantProds = products.filter(prod => {
              // Only care about products currently in stock
              if (prod.quantity <= 0) return false;
              
              const lastSoldStr = lastSoldMap[prod.id];
              if (!lastSoldStr) {
                return true; // Never sold is considered stagnant
              }
              
              const lastSoldDate = new Date(lastSoldStr);
              const diffTime = Math.abs(now.getTime() - lastSoldDate.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return diffDays >= 90;
            }).map(prod => {
              const lastSoldStr = lastSoldMap[prod.id];
              let daysStagnant = 999;
              if (lastSoldStr) {
                const lastSoldDate = new Date(lastSoldStr);
                const diffTime = Math.abs(now.getTime() - lastSoldDate.getTime());
                daysStagnant = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              }
              return {
                ...prod,
                lastSoldDate: lastSoldStr || null,
                daysStagnant
              };
            }).sort((a, b) => b.daysStagnant - a.daysStagnant);

            if (stagnantProds.length === 0) {
              return (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 text-right flex items-center gap-4 animate-fade-in">
                  <div className="bg-emerald-100 text-[#1D9E75] p-3 rounded-full">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-800 text-sm">
                      {lang === 'ar' ? 'ممتاز! لا توجد أصناف راكدة' : 'Excellent! No stagnant items'}
                    </h4>
                    <p className="text-xs text-emerald-600 mt-1">
                      {lang === 'ar' ? 'تم بيع جميع الأصناف النشطة في المستودع خلال الـ 90 يوماً الماضية.' : 'All active inventory items have been sold at least once in the last 90 days.'}
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div className="bg-amber-50/40 border border-amber-200/60 rounded-2xl p-5 text-right space-y-4 animate-fade-in" id="reports-stagnant-alerts">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/30">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-amber-100 text-amber-700 p-2 rounded-xl">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                        <span>{lang === 'ar' ? 'لوحة التنبيهات الذكية: أصناف راكدة (لم تُبع منذ +90 يوماً)' : 'Smart Alerts: Stagnant Stock (No sales for 90+ days)'}</span>
                        <span className="bg-amber-200/70 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-black font-mono">
                          {stagnantProds.length} {lang === 'ar' ? 'منتجات' : 'items'}
                        </span>
                      </h4>
                      <p className="text-xs text-amber-700 mt-0.5">
                        {lang === 'ar' ? 'هذه الأصناف متراكمة ولم تسجل حركة بيع. يُنصح بعمل خصم ترويجي سريع لتسييل البضائع وتفادي التلف.' : 'These items are stagnant and have not registered any sales. Launching a discount is recommended to liquidate stock.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stagnantProds.slice(0, 4).map(prod => {
                    const isDiscountFormOpen = stagnantPromoProduct === prod.id;
                    // Find if there is already an active promotion for this product
                    const hasPromo = promotions.some(p => p.active && p.productId === prod.id);

                    return (
                      <div key={prod.id} className="bg-white border border-slate-200 hover:border-amber-200 rounded-xl p-4 transition-all flex flex-col justify-between space-y-3 shadow-xs">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-800 text-xs sm:text-sm">{prod.name}</span>
                              {hasPromo && (
                                <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black px-1.5 py-0.5 rounded-md border border-emerald-100">
                                  {lang === 'ar' ? 'مشمول بخصم حالي' : 'Has active promo'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              <span>
                                {lang === 'ar' ? 'الكمية المتوفرة:' : 'In Stock:'}{' '}
                                <strong className="text-slate-700">{prod.quantity}</strong>
                              </span>
                              <span>•</span>
                              <span>
                                {lang === 'ar' ? 'السعر الحالي:' : 'Price:'}{' '}
                                <strong className="text-slate-700 font-mono">${prod.priceUSD}</strong>
                              </span>
                            </div>
                            <div className="text-[11px] font-medium text-amber-800 flex items-center gap-1">
                              <span>⏳</span>
                              <span>
                                {prod.lastSoldDate 
                                  ? `${lang === 'ar' ? 'آخر عملية بيع:' : 'Last sold:'} ${prod.lastSoldDate} (${prod.daysStagnant} ${lang === 'ar' ? 'يوم مضى' : 'days ago'})`
                                  : (lang === 'ar' ? 'لم تُبع مطلقاً في النظام منذ إضافتها!' : 'Never sold in the system!')
                                }
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Inline Campaign Creator */}
                        {isDiscountFormOpen ? (
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 space-y-3 text-right">
                            <div className="text-xs font-black text-slate-700 border-b border-slate-200/50 pb-1 flex justify-between items-center">
                              <span>⚙️ {lang === 'ar' ? 'تخصيص الخصم ' : 'Customize Quick Discount'}</span>
                              <button 
                                type="button"
                                onClick={() => setStagnantPromoProduct(null)}
                                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                              >
                                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                  {lang === 'ar' ? 'قيمة الخصم:' : 'Discount Value:'}
                                </label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="1"
                                    max={stagnantPromoType === 'percentage' ? '100' : '1000'}
                                    value={stagnantPromoValue}
                                    onChange={(e) => setStagnantPromoValue(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono text-center font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#1D9E75]"
                                  />
                                  <select
                                    value={stagnantPromoType}
                                    onChange={(e) => {
                                      setStagnantPromoType(e.target.value as 'percentage' | 'fixed');
                                      setStagnantPromoValue(e.target.value === 'percentage' ? '25' : '1');
                                    }}
                                    className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700"
                                  >
                                    <option value="percentage">%</option>
                                    <option value="fixed">$</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                  {lang === 'ar' ? 'مدة الحملة باليوم:' : 'Duration (Days):'}
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="365"
                                  value={stagnantPromoDurationDays}
                                  onChange={(e) => setStagnantPromoDurationDays(parseInt(e.target.value) || 30)}
                                  className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono text-center font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#1D9E75]"
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (onAddStagnantPromotion(prod.id, parseFloat(stagnantPromoValue) || 0, stagnantPromoType, stagnantPromoDurationDays)) {
                                  setStagnantPromoProduct(null);
                                }
                              }}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>⚡ {lang === 'ar' ? 'تفعيل وإطلاق الحملة الآن' : 'Launch Campaign Now'}</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setStagnantPromoProduct(prod.id);
                              setStagnantPromoValue('25');
                              setStagnantPromoType('percentage');
                              setStagnantPromoDurationDays(30);
                            }}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>⚡ {lang === 'ar' ? 'إطلاق حملة خصم ترويجية' : 'Launch Discount Promo'}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {stagnantProds.length > 4 && (
                  <p className="text-[10px] text-slate-450 text-center font-medium mt-1">
                    {lang === 'ar' 
                      ? `+ يوجد ${stagnantProds.length - 4} منتجات راكدة أخرى تتطلب تدخلاً ترويجياً سريعاً.` 
                      : `+ There are ${stagnantProds.length - 4} other stagnant items requiring promotional focus.`}
                  </p>
                )}
              </div>
            );
          })()}

          {/* Interactive Sub-dashboard navigation switcher */}
          <div className="bg-slate-100 border border-slate-200 p-1.5 rounded-xl flex flex-wrap items-center gap-1.5 shrink-0 font-sans" style={{ direction: 'rtl' }}>
            <button
              type="button"
              onClick={() => setDashboardTab('overview')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${dashboardTab === 'overview' ? 'bg-[#1D9E75] text-white shadow-xs' : 'text-slate-600 hover:text-slate-850'}`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>📈 التحليلات الإجمالية</span>
            </button>
            <button
              type="button"
              onClick={() => setDashboardTab('daily')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${dashboardTab === 'daily' ? 'bg-[#1D9E75] text-white shadow-xs' : 'text-slate-600 hover:text-slate-850'}`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>📅 التقرير اليومي للمبيعات</span>
            </button>
            <button
              type="button"
              onClick={() => setDashboardTab('monthly')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${dashboardTab === 'monthly' ? 'bg-[#1D9E75] text-white shadow-xs' : 'text-slate-600 hover:text-slate-850'}`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>📆 التقرير الشهري المقارن</span>
            </button>
            <button
              type="button"
              onClick={() => setDashboardTab('bestsellers')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${dashboardTab === 'bestsellers' ? 'bg-[#1D9E75] text-white shadow-xs' : 'text-slate-600 hover:text-slate-850'}`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>الأكثر مبيعاً بالمستودع</span>
            </button>
            <button
              type="button"
              onClick={() => setDashboardTab('categories')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${dashboardTab === 'categories' ? 'bg-[#1D9E75] text-white shadow-xs' : 'text-slate-600 hover:text-slate-850'}`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>مبيعات الفئات والتصنيفات</span>
            </button>
          </div>

          {/* RENDER BY SELECTIVE SUBTAB */}
          {dashboardTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" id="dashboard-tab-overview">
              {/* SVG Chart */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 text-right space-y-4">
                <h4 className="font-bold text-slate-800 text-sm">📈 أداء المبيعات اليومية للأسبوع المنصرم</h4>
                
                {chartPoints.length === 0 ? (
                  <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
                    لا تتوفر مبيعات سابقة لإسقاط الرسم الإحصائي عليها.
                  </div>
                ) : (
                  <div className="relative pt-6">
                    <svg className="w-full h-44" viewBox="0 0 400 150">
                      {/* Grid Lines */}
                      <line x1="30" y1="20" x2="380" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="30" y1="65" x2="380" y2="65" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="30" y1="110" x2="380" y2="110" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="30" y1="130" x2="380" y2="130" stroke="#94a3b8" strokeWidth="1.5" />

                      {/* Line connecting points */}
                      {(() => {
                        const maxVal = Math.max(...chartPoints.map(p => p.val)) || 1;
                        const widthStep = 340 / Math.max(1, chartPoints.length - 1);
                        
                        const pathData = chartPoints.map((p, i) => {
                          const x = 30 + (i * widthStep);
                          const y = 130 - ((p.val / maxVal) * 100);
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(' ');

                        return (
                          <g>
                            <path 
                              d={pathData} 
                              fill="none" 
                              stroke="#1D9E75" 
                              strokeWidth="2.5" 
                              strokeLinecap="round"
                            />
                          </g>
                        );
                      })()}

                      {/* Dots and Labels */}
                      {(() => {
                        const maxVal = Math.max(...chartPoints.map(p => p.val)) || 1;
                        const widthStep = 340 / Math.max(1, chartPoints.length - 1);
                        
                        return chartPoints.map((p, i) => {
                          const x = 30 + (i * widthStep);
                          const y = 130 - ((p.val / maxVal) * 100);
                          return (
                            <g key={i}>
                              <circle cx={x} cy={y} r="4" fill="#1D9E75" />
                              <text x={x} y={y - 8} textAnchor="middle" fill="#115e45" fontSize="8" fontWeight="bold" fontFamily="monospace">
                                {p.val.toFixed(0)}$
                              </text>
                              <text x={x} y="142" textAnchor="middle" fill="#64748b" fontSize="7" fontWeight="bold">
                                {p.date.slice(5)}
                              </text>
                            </g>
                          );
                        });
                      })()}
                    </svg>
                  </div>
                )}
              </div>

              {/* Top Products */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 text-right space-y-4">
                <h4 className="font-bold text-slate-800 text-sm">🏆 الأصناف الأكثر بيعاً وطلباً بالمحل (موجز خمسة)</h4>
                
                <div className="space-y-3">
                  {topSoldProductsList.length === 0 ? (
                    <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
                      لا تتوفر مبيعات منجزة حتى الآن.
                    </div>
                  ) : (
                    topSoldProductsList.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-4 p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="font-mono bg-[#1D9E75] text-white text-xs px-2.5 py-1 rounded-lg font-bold">
                          بيعت كمية: {item.qty}
                        </span>
                        <div className="text-right">
                          <span className="font-extrabold text-slate-800 text-xs block">{item.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">الإيراد المباشر: {item.amt.toFixed(2)} $</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* DAILY SALES REPORT VIEW */}
          {dashboardTab === 'daily' && (() => {
            const dailySalesRaw: { 
              [date: string]: { 
                usd: number; 
                lbp: number; 
                count: number; 
                cash: number;
                card: number;
                transfer: number;
                debt: number;
                totalItems: number; 
              } 
            } = {};

            invoices.forEach(inv => {
              const dateStr = inv.date;
              if (!dailySalesRaw[dateStr]) {
                dailySalesRaw[dateStr] = { 
                  usd: 0, 
                  lbp: 0, 
                  count: 0, 
                  cash: 0,
                  card: 0,
                  transfer: 0,
                  debt: 0,
                  totalItems: 0 
                };
              }
              dailySalesRaw[dateStr].usd += inv.totalUSD;
              dailySalesRaw[dateStr].lbp += inv.totalLBP;
              dailySalesRaw[dateStr].count += 1;
              
              if (inv.paymentMethod === 'cash') dailySalesRaw[dateStr].cash += inv.totalUSD;
              else if (inv.paymentMethod === 'card') dailySalesRaw[dateStr].card += inv.totalUSD;
              else if (inv.paymentMethod === 'transfer') dailySalesRaw[dateStr].transfer += inv.totalUSD;
              else if (inv.paymentMethod === 'debt') dailySalesRaw[dateStr].debt += inv.totalUSD;

              const itemsCount = inv.items.reduce((acc, it) => acc + it.quantity, 0);
              dailySalesRaw[dateStr].totalItems += itemsCount;
            });

            const dailySalesReportList = Object.entries(dailySalesRaw).map(([date, details]) => ({
              date,
              ...details,
            })).sort((a, b) => b.date.localeCompare(a.date));

            if (dailySalesReportList.length === 0) {
              return (
                <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-12 text-center text-slate-400">
                  لا توجد فواتير مبيعات مسجلة حتى الآن لحساب التقارير اليومية.
                </div>
              );
            }

            const avgTickets = dailySalesReportList.reduce((acc, current) => acc + (current.usd / current.count), 0) / dailySalesReportList.length;

            return (
              <div className="space-y-5 animate-fade-in" id="daily-sales-report-content">
                {/* Daily Metadata Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100 p-4 text-right">
                    <span className="text-[10px] text-slate-400 font-bold block">معدل البيع لليوم الواحد</span>
                    <span className="text-xl font-black font-mono text-indigo-700 block mt-1">
                      {(totalSalesUSD / dailySalesReportList.length || 0).toFixed(2)} $
                    </span>
                  </div>
                  <div className="bg-gradient-to-br from-[#1D9E75]/10 to-white rounded-xl border border-emerald-100 p-4 text-right">
                    <span className="text-[10px] text-slate-400 font-bold block">متوسط قيمة السلة (الفاتورة الفرعية)</span>
                    <span className="text-xl font-black font-mono text-[#1D9E75] block mt-1">
                      {(avgTickets || 0).toFixed(2)} $
                    </span>
                  </div>
                  <div className="bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-100 p-4 text-right">
                    <span className="text-[10px] text-slate-400 font-bold block">الأيام النشطة للبيع بالتقرير</span>
                    <span className="text-xl font-black font-mono text-cyan-700 block mt-1">
                      {dailySalesReportList.length} أيام بيع
                    </span>
                  </div>
                </div>

                {/* Daily Sales table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 text-xs flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-mono">آخر تحديث: {new Date().toLocaleDateString('ar-LB')}</span>
                    <span>📅 كشف المبيعات اليومية التفصيلي للمتجر</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">بروتوكول وطرق الدفع (بالدولار)</th>
                          <th className="p-3">إجمالي الإيرادات (بالليرة L.L)</th>
                          <th className="p-3">إجمالي الإيرادات ($)</th>
                          <th className="p-3">إجمالي القطع المباعة</th>
                          <th className="p-3">عدد الفواتير المنفذة</th>
                          <th className="p-3">اليوم والتاريخ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {dailySalesReportList.map((row) => {
                          return (
                            <tr key={row.date} className="hover:bg-slate-50 transition">
                              <td className="p-3">
                                <div className="flex flex-wrap gap-1.5 justify-start">
                                  {row.cash > 0 && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-mono font-bold text-[10px]">كاش: {row.cash.toFixed(1)}$</span>}
                                  {row.card > 0 && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-mono font-bold text-[10px]">بطاقة: {row.card.toFixed(1)}$</span>}
                                  {row.transfer > 0 && <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-mono font-bold text-[10px]">حوالة: {row.transfer.toFixed(1)}$</span>}
                                  {row.debt > 0 && <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-md font-mono font-bold text-[10px]">آجل: {row.debt.toFixed(1)}$</span>}
                                </div>
                              </td>
                              <td className="p-3 font-mono font-bold text-[#1D9E75]">{Math.ceil(row.lbp).toLocaleString()} ل.ل</td>
                              <td className="p-3 font-mono font-bold text-slate-800">{row.usd.toFixed(2)} $</td>
                              <td className="p-3 font-mono text-slate-500 font-bold">{row.totalItems} سلع</td>
                              <td className="p-3 font-mono text-slate-800 font-black">{row.count} فواتير</td>
                              <td className="p-3 font-bold text-slate-700 font-mono text-xs">{row.date}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* MONTHLY SALES REPORT VIEW */}
          {dashboardTab === 'monthly' && (() => {
            const monthlySalesRaw: {
              [month: string]: {
                usd: number;
                lbp: number;
                count: number;
                totalItems: number;
              }
            } = {};

            invoices.forEach(inv => {
              const monthStr = inv.date.substring(0, 7); // 'YYYY-MM'
              if (!monthlySalesRaw[monthStr]) {
                monthlySalesRaw[monthStr] = {
                  usd: 0,
                  lbp: 0,
                  count: 0,
                  totalItems: 0
                };
              }
              monthlySalesRaw[monthStr].usd += inv.totalUSD;
              monthlySalesRaw[monthStr].lbp += inv.totalLBP;
              monthlySalesRaw[monthStr].count += 1;
              const itemsCount = inv.items.reduce((acc, it) => acc + it.quantity, 0);
              monthlySalesRaw[monthStr].totalItems += itemsCount;
            });

            const monthlySalesReportList = Object.entries(monthlySalesRaw).map(([month, details]) => ({
              month,
              ...details,
            })).sort((a, b) => b.month.localeCompare(a.month));

            if (monthlySalesReportList.length === 0) {
              return (
                <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-12 text-center text-slate-400">
                  لا توجد فواتير مبيعات مسجلة لحساب التقارير الشهرية.
                </div>
              );
            }

            return (
              <div className="space-y-5 animate-fade-in" id="monthly-sales-report-content">
                {/* Monthly Sales table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 text-xs flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-mono">سعر الصرف المعتمد: {settings.exchangeRate.toLocaleString()} ل.ل</span>
                    <span>📆 كشف تقارير المبيعات الشهرية المقارنة والتحليلات</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">معدل البيع لكل فاتورة</th>
                          <th className="p-3">إجمالي المبيعات بالليرة (L.L)</th>
                          <th className="p-3">إجمالي المبيعات بالدولار ($)</th>
                          <th className="p-3">إجمالي كمية القطع المباعة</th>
                          <th className="p-3">إجمالي العمليات المنفذة</th>
                          <th className="p-3">الشهر المستهدف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium font-mono text-slate-700">
                        {monthlySalesReportList.map((row) => {
                          return (
                            <tr key={row.month} className="hover:bg-slate-50 transition">
                              <td className="p-3 font-bold text-blue-600 font-sans font-mono">{(row.usd / row.count).toFixed(2)} $</td>
                              <td className="p-3 font-bold text-[#1D9E75]">{Math.ceil(row.lbp).toLocaleString()} L.L</td>
                              <td className="p-3 font-black text-slate-800">{row.usd.toFixed(2)} $</td>
                              <td className="p-3 font-sans font-bold">{row.totalItems} سلعة</td>
                              <td className="p-3 font-sans font-bold text-slate-500">{row.count} فواتير</td>
                              <td className="p-3 font-bold text-slate-800 font-sans">{row.month}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* BEST SELLERS VIEW */}
          {dashboardTab === 'bestsellers' && (() => {
            const productSalesMapExtended: { [key: string]: { name: string; barcode: string; category: string; qty: number; amt: number } } = {};
            invoices.forEach(inv => {
              inv.items.forEach(item => {
                if (!productSalesMapExtended[item.productId]) {
                  const matchingProd = products.find(p => p.id === item.productId);
                  productSalesMapExtended[item.productId] = { 
                    name: item.productName, 
                    barcode: matchingProd?.barcode || '',
                    category: matchingProd?.category || 'عام',
                    qty: 0, 
                    amt: 0 
                  };
                }
                productSalesMapExtended[item.productId].qty += item.quantity;
                productSalesMapExtended[item.productId].amt += item.totalUSD;
              });
            });

            const allSoldProductsSorted = Object.values(productSalesMapExtended)
              .sort((a, b) => b.qty - a.qty);

            if (allSoldProductsSorted.length === 0) {
              return (
                <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-12 text-center text-slate-400">
                  لا تتوافر أي عمليات بيع مسجلة حالياً لتصنيف المنتجات الأكثر مبيعاً بالتحديد.
                </div>
              );
            }

            const maxQtySold = Math.max(...allSoldProductsSorted.map(p => p.qty)) || 1;

            return (
              <div className="space-y-4 animate-fade-in" id="best-selling-products-tab">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-center border-b border-slate-100 pb-3 gap-2">
                    <span className="text-xs text-slate-400 font-bold text-left">مرتبة ترتيباً تنازلياً حسب كمية المواد المفرغة والمباعة</span>
                    <h4 className="font-bold text-slate-800 text-sm">🏆 الأصناف وقائمة المنتجات الأكثر مبيعاً وطلباً بالمحل</h4>
                  </div>

                  <div className="space-y-3.5">
                    {allSoldProductsSorted.map((item, idx) => {
                      const percentOfMax = (item.qty / maxQtySold) * 100;
                      return (
                        <div key={idx} className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2 text-right">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div className="flex items-center gap-2 ltr">
                              <span className="bg-[#1D9E75] text-white text-xs font-black px-2.5 py-1 rounded-lg">
                                الكمية المباعة: {item.qty} وحدة
                              </span>
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                                العائد: {item.amt.toFixed(2)} $
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-slate-850 text-xs sm:text-sm block">
                                {idx + 1}. {item.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                باركود: {item.barcode} | الفئة: {item.category}
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar of sales contribution */}
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                              style={{ width: `${percentOfMax}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* CATEGORY SALES REPORT VIEW */}
          {dashboardTab === 'categories' && (() => {
            const categorySalesRaw: {
              [category: string]: {
                usd: number;
                lbp: number;
                qty: number;
                count: number;
              }
            } = {};

            invoices.forEach(inv => {
              inv.items.forEach(item => {
                const matchingProd = products.find(p => p.id === item.productId);
                const catName = matchingProd?.category || 'عام';
                
                if (!categorySalesRaw[catName]) {
                  categorySalesRaw[catName] = { usd: 0, lbp: 0, qty: 0, count: 0 };
                }
                categorySalesRaw[catName].usd += item.totalUSD;
                categorySalesRaw[catName].lbp += item.totalUSD * inv.exchangeRate;
                categorySalesRaw[catName].qty += item.quantity;
                categorySalesRaw[catName].count += 1;
              });
            });

            const categorySalesReportList = Object.entries(categorySalesRaw).map(([category, details]) => ({
              category,
              ...details,
            })).sort((a, b) => b.usd - a.usd);

            if (categorySalesReportList.length === 0) {
              return (
                <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-12 text-center text-slate-400">
                  لا تتوافر فواتير مبيعات مسجلة لحساب مساهمة تصنيفات المتجر.
                </div>
              );
            }

            const totalCategoryRevenueUSD = categorySalesReportList.reduce((sum, item) => sum + item.usd, 0) || 1;

            return (
              <div className="space-y-4 animate-fade-in" id="category-sales-report-tab">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                  <div className="border-b border-slate-100 pb-3 text-right">
                    <h4 className="font-bold text-slate-800 text-sm">مبيعات المحل الموزعة بحسب تصنيفات وفئات السلع</h4>
                    <p className="text-[10px] text-slate-400 mt-1">توضح هذه القائمة نسبة كل تصنيف عيني من إجمالي المساهمة والأرباح المحققة</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categorySalesReportList.map((row, idx) => {
                      const percentageShare = (row.usd / totalCategoryRevenueUSD) * 100;
                      return (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-right flex flex-col justify-between space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-xs font-black text-[#1D9E75] bg-emerald-50 px-2 py-1 rounded-lg">
                              {percentageShare.toFixed(1)}% من المبيعات
                            </span>
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className="font-extrabold text-slate-800 text-xs sm:text-sm">{row.category}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center text-[10px] sm:text-xs">
                            <div className="bg-white rounded-lg p-1.5 border">
                              <span className="block text-slate-400 text-[9px]">مرات التكرار</span>
                              <span className="font-extrabold text-slate-700 font-mono">{row.count}</span>
                            </div>
                            <div className="bg-white rounded-lg p-1.5 border">
                              <span className="block text-slate-400 text-[9px]">القطع المباعة</span>
                              <span className="font-extrabold text-slate-700 font-mono">{row.qty}</span>
                            </div>
                            <div className="bg-white rounded-lg p-1.5 border">
                              <span className="block text-slate-400 text-[9px]">القيمة الإجمالية</span>
                              <span className="font-black text-[#1D9E75] font-mono">{row.usd.toFixed(1)}$</span>
                            </div>
                          </div>

                          {/* Simple visualization bar */}
                          <div className="w-full bg-slate-200 rounded-full h-1.5 font-sans">
                            <div 
                              className="bg-[#1D9E75] h-1.5 rounded-full" 
                              style={{ width: `${percentageShare}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      )}

      {/* SUBTAB CONTENT: 2. PROFIT & LOSS (P&L) */}
      {reportsSubTab === 'pl' && (
        <div className="space-y-6">
          
          {/* P&L Main Cards summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div className="bg-white rounded-2xl border border-slate-200 p-5 text-right">
              <span className="text-[10px] text-slate-400 uppercase font-black block">إجمالي مبيعات المتجر</span>
              <span className="text-2xl font-black font-mono text-slate-800 block mt-1">+{totalSalesUSD.toFixed(2)} $</span>
              <span className="text-[10px] text-slate-500 font-mono block">إجمالي المقبوضات وصافي الفواتير</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 text-right">
              <span className="text-[10px] text-red-500 uppercase font-black block">تكلفة السلع المباعة (COGS)</span>
              <span className="text-2xl font-black font-mono text-red-600 block mt-1">-{totalCOGS.toFixed(2)} $</span>
              <span className="text-[10px] text-slate-500 font-mono block">تكلفة المنتجات بسعر الشراء الفعلي</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 text-right">
              <span className="text-[10px] text-rose-500 uppercase font-black block">خسائر التوالف والأعباء ومصاريف أخرى</span>
              <span className="text-2xl font-black font-mono text-rose-700 block mt-1">
                -{(totalWasteLoss + totalExpensesUSD).toFixed(2)} $
              </span>
              <span className="text-[10px] text-slate-400 font-mono block">توالف: {totalWasteLoss.toFixed(1)}$ | مصاريف: {totalExpensesUSD.toFixed(1)}$</span>
            </div>

            <div className={`rounded-2xl border p-5 text-right ${netProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
              <span className={`text-[10px] uppercase font-black block ${netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                صافي الأرباح التشغيلية للمحل
              </span>
              <span className={`text-2xl font-black font-mono block mt-1 ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {netProfit.toFixed(2)} $
              </span>
              <span className="text-[10px] block font-semibold text-slate-500">
                يعادل: {Math.ceil(netProfit * settings.exchangeRate).toLocaleString()} ل.ل
              </span>
            </div>

          </div>

          {/* Traditional Ledger Presentation */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-slate-50 border-b border-slate-200 p-4 font-bold text-slate-700 text-sm">
              ⚖️ جدول كشف أرباح وخسائر النشاط المحاسبي التفصيلي
            </div>
            
            <div className="p-6 font-sans text-right space-y-4">
              
              <div className="space-y-2 max-w-2xl mx-auto">
                
                {/* Row 1: Sales */}
                <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                  <span className="font-bold text-slate-700">1. إجمالي الإيرادات (المبيعات)</span>
                  <span className="font-mono font-bold text-emerald-600">+{totalSalesUSD.toFixed(2)} $</span>
                </div>

                {/* Row 2: COGS */}
                <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                  <div className="text-right">
                    <span className="font-bold text-slate-700">2. تكلفة بضاعة البيع بسعر التكلفة (COGS)</span>
                    <span className="block text-[10px] text-slate-400">تُحتسب من سعر رأس مال المنتجات المباعة</span>
                  </div>
                  <span className="font-mono font-bold text-rose-600">-{totalCOGS.toFixed(2)} $</span>
                </div>

                {/* Row 3: Gross profit */}
                <div className="flex justify-between items-center py-3 border-b-2 border-slate-200 text-sm uppercase bg-slate-50 px-3 rounded-lg">
                  <span className="font-black text-slate-800">3. إجمالي الربح الهامشي (Gross Profit)</span>
                  <span className="font-mono font-black text-emerald-700">+{grossProfit.toFixed(2)} $</span>
                </div>

                {/* Row 4: Waste loss */}
                <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                  <div className="text-right">
                    <span className="font-bold text-slate-700">4. بضائع توالف من الجرود (المتلفة/المعطوبة)</span>
                    <span className="block text-[10px] text-slate-400">الخسائر المترتبة على سلع منتهية أو مكسورة</span>
                  </div>
                  <span className="font-mono font-bold text-rose-600">-{totalWasteLoss.toFixed(2)} $</span>
                </div>

                {/* Row 5: Operating Expenses */}
                <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                  <div className="text-right">
                    <span className="font-bold text-slate-700">5. المصاريف التشغيلية المسجلة (Expenses)</span>
                    <span className="block text-[10px] text-slate-400">تشمل اشتراكات المولد والإيجار ورواتب العمال والأمور الأخرى</span>
                  </div>
                  <span className="font-mono font-bold text-rose-600">-{totalExpensesUSD.toFixed(2)} $</span>
                </div>

                {/* Final: Net profit */}
                <div className={`flex justify-between items-center py-4 text-base font-black px-4 rounded-xl shadow-inner mt-4 ${netProfit >= 0 ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'}`}>
                  <span>⚖️ صافي الربح أو الخسارة الفعلي (Net Operational Profit)</span>
                  <span className="font-mono text-lg">{netProfit.toFixed(2)} $</span>
                </div>

              </div>

              <p className="text-[10px] text-center text-slate-400 mt-6 max-w-xl mx-auto italic">
                ملاحظة: هذا الكشف يتم تحديثه تلقائياً استناداً إلى عمليات البيع في الكاشير، وأوزان المنتجات التالفة التي يتم إدخالها، وتعديل قيم المصاريف التشغيلية وسعر التكلفة لكل منتج.
              </p>

            </div>
          </div>

        </div>
      )}

      {/* SUBTAB CONTENT: 3. EXPENSES */}
      {reportsSubTab === 'expenses' && (
        <div className="space-y-6">
          
          {/* Summary and Expense adding form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Form Section */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <h4 className="font-bold text-slate-800 text-sm flex items-center justify-end gap-1.5 border-b pb-2">
                <span>➕ تسجيل وصرف قيد جديد</span>
              </h4>
              
              <form onSubmit={handleAddExpense} className="space-y-3 text-right">
                <div>
                  <label className="block text-slate-600 mb-1 text-xs font-bold">بيان وصنف المصروف:</label>
                  <input 
                    type="text"
                    value={newExpTitle}
                    onChange={e => setNewExpTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-emerald-500 text-right"
                    placeholder="مثلاً: راتب عامل الدليفري الأسبوعي"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 text-xs font-bold">الفئة:</label>
                    <select 
                      value={newExpCategory}
                      onChange={e => setNewExpCategory(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="rent">إيجار المحل</option>
                      <option value="electricity">كهرباء لبنان</option>
                      <option value="salaries">رواتب وأجور</option>
                      <option value="generator">اشتراك مولد</option>
                      <option value="other">مصاريف عامة أخرى</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 text-xs font-bold">القيمة بالدولار ($):</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={newExpAmount}
                      onChange={e => setNewExpAmount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-emerald-500 text-center font-mono font-bold"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 text-xs font-bold">التاريخ تاريخ الصرف:</label>
                  <input 
                    type="text"
                    value={newExpDate}
                    onChange={e => setNewExpDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-emerald-500 text-center font-mono"
                    placeholder="YYYY-MM-DD"
                    required
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#1D9E75] hover:bg-emerald-600 text-white font-extrabold py-2 rounded-xl text-xs transition mt-2 cursor-pointer"
                >
                  ✅ ترحيل قيد المصروف للبيان مالي
                </button>
              </form>
            </div>

            {/* Expense List Section */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-[10px] font-mono font-black">
                  إجمالي المصاريف: {totalExpensesUSD.toFixed(2)}$
                </span>
                <h4 className="font-bold text-slate-800 text-sm">💸 سجل قيود ومصاريف المتجر التشغيلية</h4>
              </div>

              {expenses.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
                  لا تتوفر أي مصاريف مسجلة أو مدفوعة حالياً.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold">
                        <th className="p-3">الإجراء</th>
                        <th className="p-3">المصروف بالليرة L.L</th>
                        <th className="p-3">قيمة المصروف ($)</th>
                        <th className="p-3">التاريخ</th>
                        <th className="p-3">التصنيف</th>
                        <th className="p-3">تفصيل المصروف (البيان)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {expenses.map(exp => (
                        <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 select-none">
                            <button 
                              onClick={() => handleDeleteExpense(exp.id, exp.title)}
                              className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-[10px] font-semibold transition cursor-pointer"
                            >
                              حذف القيد
                            </button>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-600">
                            {Math.ceil(exp.amountUSD * settings.exchangeRate).toLocaleString()} ل.ل
                          </td>
                          <td className="p-3 font-mono font-extrabold text-rose-600">{exp.amountUSD.toFixed(2)} $</td>
                          <td className="p-3 font-mono text-slate-500">{exp.date}</td>
                          <td className="p-3">
                            <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                              {exp.category === 'rent' ? 'إيجار المحل' :
                               exp.category === 'electricity' ? 'كهرباء الدولة' :
                               exp.category === 'salaries' ? 'معاشات عمال' :
                               exp.category === 'generator' ? 'مولد كهرباء' : 'مصاريف تشغيلية'}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-800">{exp.title}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* SUBTAB CONTENT: 4. STOCK RECONCILE AND VALUATION AUDITING */}
      {reportsSubTab === 'stock_audit' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Location selector for separate inventory reports */}
          <div className="bg-slate-50 border border-slate-205 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-right">
            <div className="order-last sm:order-first">
              <h4 className="font-extrabold text-slate-800 text-sm">📍 تقسيم ونطاق جرد وتقييم مخازن السلع:</h4>
              <p className="text-slate-400 text-[11px] mt-0.5">يمكنك فصل تقرير وتقييم سلع أرفف المحل المعروضة عن بضائع الكمية والاحتياطي المتبقية في المستوع الاحتياطي.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setStockAuditReportLoc('shop')}
                className={`py-2 px-3.5 rounded-xl text-xs font-black transition border flex items-center justify-center gap-1.5 cursor-pointer ${stockAuditReportLoc === 'shop' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'}`}
              >
                <span>🏪 رفوف المحل</span>
              </button>
              <button
                type="button"
                onClick={() => setStockAuditReportLoc('warehouse')}
                className={`py-2 px-3.5 rounded-xl text-xs font-black transition border flex items-center justify-center gap-1.5 cursor-pointer ${stockAuditReportLoc === 'warehouse' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'}`}
              >
                <span>📦 المستودع والاحتياط</span>
              </button>
              <button
                type="button"
                onClick={() => setStockAuditReportLoc('combined')}
                className={`py-2 px-3.5 rounded-xl text-xs font-black transition border flex items-center justify-center gap-1.5 cursor-pointer ${stockAuditReportLoc === 'combined' ? 'bg-slate-850 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'}`}
              >
                <span>🌀 جرد موحد (الكل)</span>
              </button>
            </div>
          </div>

          {/* Valuations stats metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            <div className="bg-white rounded-2xl border border-slate-200 p-5 text-right flex items-center justify-between shadow-sm">
              <div className="bg-amber-50 text-amber-700 p-3 rounded-xl border border-amber-100">
                <Layers className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-bold mb-1">إجمالي رأس مال البضاعة ({stockAuditReportLoc === 'warehouse' ? '📦 مستودع' : stockAuditReportLoc === 'shop' ? '🏪 محل' : '🌀 موحد'})</span>
                <span className="text-2xl font-black font-mono text-amber-800">{invCostValue.toFixed(2)} $</span>
                <span className="text-[10px] block text-slate-400">قيمة الأصناف الحالية بسعر التكلفة الكامل</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 text-right flex items-center justify-between shadow-sm">
              <div className="bg-emerald-50 text-[#1D9E75] p-3 rounded-xl border border-emerald-100">
                <DollarSign className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-bold mb-1">إجمالي القيمة البيعية مفرّق ({stockAuditReportLoc === 'warehouse' ? '📦 مستودع' : stockAuditReportLoc === 'shop' ? '🏪 محل' : '🌀 موحد'})</span>
                <span className="text-2xl font-black font-mono text-[#1D9E75]">{invRetailValue.toFixed(2)} $</span>
                <span className="text-[10px] block text-slate-400">القيمة المتوقعة إذا بيعت بالكامل مفرّق</span>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-150 rounded-2xl p-5 text-right flex items-center justify-between shadow-sm">
              <div className="bg-emerald-100 text-emerald-800 p-3 rounded-xl">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-bold mb-1">هامش الأرباح الكامن ({stockAuditReportLoc === 'warehouse' ? 'مستودع' : stockAuditReportLoc === 'shop' ? 'محل' : 'موحد'})</span>
                <span className="text-2xl font-black font-mono text-emerald-800">+{invPotentialProfit.toFixed(2)} $</span>
                <span className="text-[10px] block text-emerald-600">هامش الربح التشغيلي الإجمالي بالبضاعة</span>
              </div>
            </div>

          </div>

          {/* Cost list table list */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h4 className="font-bold text-slate-800 text-sm border-b pb-2 text-right">تفصيل تسعير وهوامش ربح الأصناف الفردية في المخازن والرفوف</h4>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                    <th className="p-3">تقدير الربح الإجمالي الكلي الممكن</th>
                    <th className="p-3">هامش ربح القطعة الواحدة ($)</th>
                    <th className="p-3">سعر البيع مفرّق</th>
                    <th className="p-3">سعر رأس مال التكلفة</th>
                    <th className="p-3 text-center">الالكمية المتوفرة</th>
                    <th className="p-3">الباركود</th>
                    <th className="p-3">اسم الصنف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {products.map(p => {
                    const cost = p.costPriceUSD !== undefined && p.costPriceUSD !== null
                      ? p.costPriceUSD 
                      : (p.priceWholesale !== undefined && p.priceWholesale !== null
                        ? p.priceWholesale 
                        : p.priceUSD * 0.75);
                    const unitMargin = p.priceUSD - cost;
                    const qty = getReportQty(p);
                    const totalPotentialMargin = unitMargin * qty;
                    
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-extrabold text-emerald-600">
                          {totalPotentialMargin > 0 ? `+${totalPotentialMargin.toFixed(2)} $` : '0.00 $'}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-600">
                          {unitMargin.toFixed(2)} $ ({(unitMargin / (cost || 1) * 100).toFixed(0)}%)
                        </td>
                        <td className="p-3 font-mono text-slate-600">{p.priceUSD.toFixed(2)} $</td>
                        <td className="p-3 font-mono text-amber-700 font-semibold">{cost.toFixed(2)} $</td>
                        <td className="p-3 font-mono font-bold text-slate-500 text-center">{qty}</td>
                        <td className="p-3 font-mono text-slate-500">{p.barcode}</td>
                        <td className="p-3 font-bold text-slate-800">{p.name}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SUBTAB CONTENT: 5. DETAILED PRODUCTS EXPIRATION MANAGEMENT REPORT */}
      {reportsSubTab === 'expiry_report' && (
        <div className="space-y-6 animate-fadeIn">
          {(() => {
            const getDaysDiff = (expiryStr: string) => {
              if (!expiryStr) return 9999;
              const expiry = new Date(expiryStr);
              const current = new Date(today);
              const diffTime = expiry.getTime() - current.getTime();
              return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            };

            // Filter and Map products with their daysDiff
            const productsWithExpiry = products.map(p => {
              const daysDiff = p.expiryDate ? getDaysDiff(p.expiryDate) : 9999;
              return { ...p, daysDiff };
            });

            // Aggregate lists
            const expiredProducts = productsWithExpiry.filter(p => p.expiryDate && p.daysDiff < 0 && p.quantity > 0);
            const nearExpiryProducts = productsWithExpiry.filter(p => p.expiryDate && p.daysDiff >= 0 && p.daysDiff <= 90 && p.quantity > 0);
            const safeProducts = productsWithExpiry.filter(p => !p.expiryDate || (p.daysDiff > 90 && p.quantity > 0));

            // Filter list based on selected state and query
            const filteredList = productsWithExpiry.filter(p => {
              // Filter by expiry sub-status
              if (expiryReportFilter === 'expired') {
                if (!p.expiryDate || p.daysDiff >= 0 || p.quantity <= 0) return false;
              } else if (expiryReportFilter === 'near_expiry') {
                if (!p.expiryDate || p.daysDiff < 0 || p.daysDiff > 90 || p.quantity <= 0) return false;
              } else if (expiryReportFilter === 'safe') {
                if (p.expiryDate && p.daysDiff <= 90 && p.quantity > 0) return false;
              }

              // Filter by search query
              if (expirySearchQuery) {
                const q = expirySearchQuery.toLowerCase().trim();
                return (
                  p.name.toLowerCase().includes(q) ||
                  p.barcode.toLowerCase().includes(q) ||
                  (p.barcodes && p.barcodes.some(b => b.toLowerCase().includes(q)))
                );
              }
              return true;
            });

            // Sort filteredList: Expired and soonest first, then products without expiry dates at the bottom
            filteredList.sort((a, b) => {
              if (!a.expiryDate && !b.expiryDate) return a.name.localeCompare(b.name);
              if (!a.expiryDate) return 1;
              if (!b.expiryDate) return -1;
              return a.daysDiff - b.daysDiff;
            });

            return (
              <div className="space-y-6 text-right">
                {/* 1. Alerts & Warning Banners */}
                {expiredProducts.length > 0 && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-right">
                      <div className="bg-rose-100 p-2 rounded-lg text-rose-600 animate-pulse">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-extrabold text-sm">تنبيه بوجود منتجات منتهية الصلاحية على الرفوف!</div>
                        <p className="text-xs text-rose-700 font-sans mt-0.5">من فضلك قم بإتلاف البضائع منتهية الصلاحية فورياً لمنع تفشي أي مشاكل صحية وحفاظاً على ثقة زبائن المحل.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpiryReportFilter('expired')}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                    >
                      🔍 عرض منتهية الصلاحية فقط ({expiredProducts.length})
                    </button>
                  </div>
                )}

                {expiredProducts.length === 0 && nearExpiryProducts.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-right">
                      <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                        <Hourglass className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">أصناف شارفت على الانتهاء (في غضون 3 أشهر)</div>
                        <p className="text-xs text-amber-700 font-sans mt-0.5">يُوصى بعمل حملة تنزيلات للمنتجات قريبة الانتهاء (مثلاً عروض BXGY أو دمج مع أصناف أخرى) للتصرف بها بسرعة.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpiryReportFilter('near_expiry')}
                      className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                    >
                      عرض قريبة الانتهاء ({nearExpiryProducts.length})
                    </button>
                  </div>
                )}

                {/* 2. Overview widgets */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  
                  <button
                    onClick={() => setExpiryReportFilter('expired')}
                    className={`p-4 rounded-xl border text-right transition flex items-center justify-between shadow-sm cursor-pointer ${
                      expiryReportFilter === 'expired' ? 'bg-rose-50 border-rose-400 ring-1 ring-rose-400' : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg text-rose-600 ${expiredProducts.length > 0 ? 'bg-rose-100' : 'bg-slate-100'}`}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-xs text-slate-400 font-semibold mb-0.5">منتهية الصلاحية 🔴</span>
                      <span className="text-xl font-bold font-mono text-rose-600">{expiredProducts.length} صنف</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setExpiryReportFilter('near_expiry')}
                    className={`p-4 rounded-xl border text-right transition flex items-center justify-between shadow-sm cursor-pointer ${
                      expiryReportFilter === 'near_expiry' ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400' : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg text-amber-600 ${nearExpiryProducts.length > 0 ? 'bg-amber-100' : 'bg-slate-100'}`}>
                      <Hourglass className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-xs text-slate-400 font-semibold mb-0.5">قريبة الانتهاء 🟡</span>
                      <span className="text-xl font-bold font-mono text-amber-600">{nearExpiryProducts.length} صنف</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setExpiryReportFilter('all')}
                    className={`p-4 rounded-xl border text-right transition flex items-center justify-between shadow-sm cursor-pointer ${
                      expiryReportFilter === 'all' ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400' : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-lg">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-xs text-slate-400 font-semibold mb-0.5">إجمالي منتجات البقالة الكلي 🟢</span>
                      <span className="text-xl font-bold font-mono text-emerald-600">{products.filter(p => p.quantity > 0).length} صنف</span>
                    </div>
                  </button>

                </div>

                {/* 3. Search and Quick Status Filter Row */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="relative w-full md:w-80">
                    <input 
                      type="text"
                      value={expirySearchQuery}
                      onChange={e => setExpirySearchQuery(e.target.value)}
                      placeholder="بحث باسم المنتج أو الباركود..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-9 text-xs font-sans text-right placeholder-slate-400"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className="text-xs text-slate-400 font-bold ml-2">فلترة حسب الحالة:</span>
                    <button
                      onClick={() => setExpiryReportFilter('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-sans font-bold transition border ${expiryReportFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}
                    >
                      الكل ({products.length})
                    </button>
                    <button
                      onClick={() => setExpiryReportFilter('expired')}
                      className={`px-3 py-1 rounded-lg text-xs font-sans font-bold transition flex items-center gap-1.5 border border-rose-100 ${expiryReportFilter === 'expired' ? 'bg-rose-600 text-white' : 'bg-rose-50 hover:bg-rose-100 text-rose-700'}`}
                    >
                      منتهية 🔴 ({expiredProducts.length})
                    </button>
                    <button
                      onClick={() => setExpiryReportFilter('near_expiry')}
                      className={`px-3 py-1 rounded-lg text-xs font-sans font-bold transition flex items-center gap-1.5 border border-amber-100 ${expiryReportFilter === 'near_expiry' ? 'bg-amber-500 text-white' : 'bg-amber-50 hover:bg-amber-100 text-amber-700'}`}
                    >
                      قريبة الانتهاء 🟡 ({nearExpiryProducts.length})
                    </button>
                    <button
                      onClick={() => setExpiryReportFilter('safe')}
                      className={`px-3 py-1 rounded-lg text-xs font-sans font-bold transition flex items-center gap-1.5 border border-emerald-100 ${expiryReportFilter === 'safe' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'}`}
                    >
                      آمنة 🟢 ({safeProducts.length})
                    </button>
                  </div>
                </div>

                {/* 4. The Reports Table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto font-sans">
                    <table className="w-full border-collapse text-right text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                          <th className="p-3 text-center w-40">تسجيل وتنزيل التوالف (إجراء سريع)</th>
                          <th className="p-3 text-center">حالة الصلاحية</th>
                          <th className="p-3 text-center">أيام متبقية / مضت</th>
                          <th className="p-3 text-center">تاريخ الصلاحية</th>
                          <th className="p-3 text-center">الكمية الحالية بالرف</th>
                          <th className="p-3">الباركود</th>
                          <th className="p-3 text-right">اسم المنتج</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {filteredList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center p-8 text-slate-400 font-bold">لا يوجد نتائج للفلترة الحالية للمنتجات وصلاحياتها.</td>
                          </tr>
                        ) : (
                          filteredList.map(p => {
                            let badgeClass = "bg-slate-100 text-slate-600";
                            let statusName = "غير محدد";
                            let daysMessage = "لا يوجد تاريخ";
                            
                            if (p.expiryDate) {
                              if (p.daysDiff < 0) {
                                badgeClass = "bg-rose-50 border border-rose-200 text-rose-700 font-black";
                                statusName = "منتهية الصلاحية 🔴";
                                daysMessage = `منذ ${Math.abs(p.daysDiff)} يوم`;
                              } else if (p.daysDiff === 0) {
                                badgeClass = "bg-amber-100 border border-amber-300 text-amber-800 font-black animate-pulse";
                                statusName = "تنتهي اليوم ⚠️";
                                daysMessage = "اليوم!";
                              } else if (p.daysDiff <= 90) {
                                badgeClass = "bg-amber-50 border border-amber-200 text-amber-700 font-bold";
                                statusName = "قريبة الانتهاء 🟡";
                                daysMessage = `متبقي ${p.daysDiff} يوم`;
                              } else {
                                badgeClass = "bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold";
                                statusName = "صالحة وسليمة 🟢";
                                daysMessage = `متبقي ${p.daysDiff} يوم`;
                              }
                            }

                            return (
                              <tr key={p.id} className="hover:bg-slate-50/50 transition">
                                
                                {/* Quick waste write-off workflow inline */}
                                <td className="p-3 text-center">
                                  {p.quantity > 0 ? (
                                    <div className="flex items-center gap-1.5 justify-center">
                                      <input 
                                        type="number"
                                        min="1"
                                        max={p.quantity}
                                        defaultValue="1"
                                        id={`qty-waste-input-${p.id}`}
                                        className="w-12 bg-slate-50 border border-slate-200 rounded text-center font-mono font-bold text-xs py-1 text-slate-800"
                                        title="الكمية المراد إتلافها وإخراجها من مخزون النظام"
                                      />
                                      <button 
                                        onClick={() => {
                                          const inputEl = document.getElementById(`qty-waste-input-${p.id}`) as HTMLInputElement;
                                          const qty = parseInt(inputEl?.value || '1');
                                          if (window.confirm(`هل أنت متأكد من تسجيل إخراج وإتلاف عدد (${qty}) قطعة من الصنف [${p.name}] بقيمة التكلفة؟`)) {
                                            onQuickWaste(p.id, qty, p.daysDiff < 0 ? 'expired' : 'damaged_on_shelf');
                                            if (inputEl) inputEl.value = '1';
                                          }
                                        }}
                                        className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold px-2 py-1 rounded text-[10px] transition cursor-pointer"
                                      >
                                        إتلاف 🗑️
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[10px] block text-center">منتهي (0 قطعة)</span>
                                  )}
                                </td>

                                <td className="p-3 text-center">
                                  <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] ${badgeClass}`}>
                                    {statusName}
                                  </span>
                                </td>

                                <td className="p-3 text-center font-mono font-bold">
                                  <span className={p.daysDiff < 0 ? 'text-rose-600' : p.daysDiff <= 90 ? 'text-amber-500' : 'text-slate-400'}>
                                    {daysMessage}
                                  </span>
                                </td>

                                <td className="p-3 text-center font-mono font-black text-slate-700">
                                  {p.expiryDate ? p.expiryDate : <span className="text-slate-300 font-normal">—</span>}
                                </td>

                                <td className="p-3 text-center font-mono font-bold text-slate-600">
                                  {p.quantity === 0 ? <span className="text-red-500 font-extrabold">منفذ (0)</span> : p.quantity}
                                </td>

                                <td className="p-3 font-mono text-slate-400">{p.barcode}</td>

                                <td className="p-3 font-bold text-slate-800 text-sm text-right">
                                  {p.name}
                                </td>

                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* SUBTAB CONTENT: 6. RETURNS DETAILED REPORT */}
      {reportsSubTab === 'returns_report' && (
        <div className="space-y-6 animate-fadeIn">
          {(() => {
            const totalRefundedUSD = returns.reduce((sum, r) => sum + (r.refundAmountUSD || 0), 0);
            const totalRefundedLBP = totalRefundedUSD * settings.exchangeRate;
            const totalItemsReturned = returns.reduce((sum, r) => sum + (r.qty || r.quantity || 0), 0);
            
            // Filtered returns list based on keyboard query
            const query = returnsSearchQuery.trim().toLowerCase();
            const filteredReturns = returns.filter(r => {
              if (!query) return true;
              const productName = r.productName || '';
              const invNum = r.invoiceNumber || '';
              const reasonText = r.reason || '';
              return productName.toLowerCase().includes(query) || invNum.toLowerCase().includes(query) || reasonText.toLowerCase().includes(query);
            });

            return (
              <div className="space-y-6 text-right">
                {/* Summary Widgets */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 text-right flex items-center justify-between">
                    <div className="bg-amber-50 text-amber-600 p-3 rounded-xl justify-center items-center flex">
                      <RefreshCw className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-bold mb-1">
                        {lang === 'ar' ? 'إجمالي المبالغ المسترجعة ($)' : 'Total Refunded ($)'}
                      </span>
                      <span className="text-2xl font-black font-mono text-amber-600">
                        {totalRefundedUSD.toFixed(2)} $
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 text-right flex items-center justify-between">
                    <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl justify-center items-center flex">
                      <Globe className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-bold mb-1">
                        {lang === 'ar' ? 'إجمالي المسترجع بالليرة (L.L)' : 'Total Refunded (L.L)'}
                      </span>
                      <span className="text-xl font-black font-mono text-emerald-650">
                        {Math.ceil(totalRefundedLBP).toLocaleString()} ل.ل
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 text-right flex items-center justify-between">
                    <div className="bg-blue-50 text-blue-600 p-3 rounded-xl justify-center items-center flex">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-bold mb-1">
                        {lang === 'ar' ? 'عدد السلع المرتجعة' : 'Returned Items Count'}
                      </span>
                      <span className="text-2xl font-black font-mono text-blue-600">
                        {totalItemsReturned} {lang === 'ar' ? 'وحدة / قطعة' : 'items'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Search and interactive visual table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <span>🔄 {lang === 'ar' ? 'سجل العمليات المرتجعة المسجلة بالكامل' : 'Registered Claims & Returns'}</span>
                    </h4>
                    <div className="relative w-full sm:w-80">
                      <input
                        type="text"
                        placeholder={lang === 'ar' ? 'ابحث باسم الصنف أو رقم الفاتورة...' : 'Search item or invoice...'}
                        value={returnsSearchQuery}
                        onChange={(e) => setReturnsSearchQuery(e.target.value)}
                        className="w-full bg-white text-slate-800 border border-slate-300 rounded-xl py-2 pl-4 pr-10 text-xs text-right focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase">
                          <th className="p-3 text-center">{lang === 'ar' ? 'التفاصيل / السبب' : 'Reason / Details'}</th>
                          <th className="p-3 text-center">{lang === 'ar' ? 'التسوية' : 'Refund Method'}</th>
                          <th className="p-3 text-center">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                          <th className="p-3 text-center">{lang === 'ar' ? 'المبلغ المسترد' : 'Refund Amount'}</th>
                          <th className="p-3 text-center">{lang === 'ar' ? 'الكمية المسترجعة' : 'Returned Qty'}</th>
                          <th className="p-3 text-center">{lang === 'ar' ? 'رقم الفاتورة' : 'Invoice Number'}</th>
                          <th className="p-3 text-right">{lang === 'ar' ? 'المنتج / الصنف' : 'Product Name'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredReturns.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400">
                              {lang === 'ar' ? 'لا توجد بيانات مرتجعة تطابق بحثك حالياً.' : 'No return records found matching search.'}
                            </td>
                          </tr>
                        ) : (
                          filteredReturns.map((ret, idx) => {
                            return (
                              <tr key={idx} className="hover:bg-slate-50/80 transition font-sans">
                                <td className="p-3 text-center">
                                  <span className="inline-block bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                                    {ret.reason === 'damaged' || ret.reason?.includes('عطب') 
                                      ? (lang === 'ar' ? '⚠️ بضاعة معطوبة / تالفة' : 'Damaged Goods') 
                                      : ret.reason === 'customer_change' 
                                        ? (lang === 'ar' ? '👤 رغبة الزبون' : 'Customer Preference')
                                        : (ret.reason || '—')}
                                  </span>
                                </td>
                                <td className="p-3 text-center font-bold">
                                  <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] uppercase font-black ${
                                    ret.action === 'cash' || ret.refundMethod === 'cash'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                      : 'bg-blue-50 text-blue-700 border border-blue-100'
                                  }`}>
                                    {ret.action === 'cash' || ret.refundMethod === 'cash' 
                                      ? (lang === 'ar' ? '💵 كاش نقدي' : 'Cash') 
                                      : ret.action === 'swap' 
                                        ? (lang === 'ar' ? '🔁 تبديل السلعة' : 'Swap') 
                                        : (lang === 'ar' ? '💳 رصيد حساب / آجل' : 'Store Credit')}
                                  </span>
                                </td>
                                <td className="p-3 text-center font-mono font-bold text-slate-500">
                                  {ret.date}
                                </td>
                                <td className="p-3 text-center font-mono font-black text-rose-600">
                                  {(ret.refundAmountUSD || 0).toFixed(2)} $
                                  <span className="block text-[9px] text-slate-400 font-bold">
                                    {~~((ret.refundAmountUSD || 0) * settings.exchangeRate).toLocaleString()} ل.ل
                                  </span>
                                </td>
                                <td className="p-3 text-center font-mono font-extrabold text-[#1D9E75]">
                                  {ret.qty || ret.quantity || 1}
                                </td>
                                <td className="p-3 text-center font-mono font-bold text-slate-600">
                                  {ret.invoiceNumber || ret.invoiceId || '—'}
                                </td>
                                <td className="p-3 text-right font-black text-slate-800 text-xs text-right">
                                  {ret.productName || (products.find(p => p.id === ret.productId)?.name) || (lang === 'ar' ? 'منتج غير معرف' : 'Deleted Item')}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* SUBTAB CONTENT: 7. WASTE / DEFECTS DETAILED REPORT */}
      {reportsSubTab === 'waste_report' && (
        <div className="space-y-6 animate-fadeIn">
          {(() => {
            const totalLossUSD = waste.reduce((sum, w) => sum + (w.estimatedLossUSD || w.cost || 0), 0);
            const totalLossLBP = totalLossUSD * settings.exchangeRate;
            const totalItemsWasted = waste.reduce((sum, w) => sum + (w.qty || w.quantity || 0), 0);

            // Filter based on search query
            const query = wasteSearchQuery.trim().toLowerCase();
            const filteredWaste = waste.filter(w => {
              if (!query) return true;
              const productName = w.productName || '';
              const noteStr = w.note || '';
              const reasonStr = w.reason || '';
              return productName.toLowerCase().includes(query) || noteStr.toLowerCase().includes(query) || reasonStr.toLowerCase().includes(query);
            });

            return (
              <div className="space-y-6 text-right">
                {/* Statistics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="bg-rose-50/50 rounded-2xl border border-rose-200 p-5 text-right flex items-center justify-between">
                    <div className="bg-rose-100 text-rose-600 p-3 rounded-xl justify-center items-center flex">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-xs text-rose-800 block font-bold mb-1">
                        {lang === 'ar' ? 'قيمة الخسائر والتبديد ($)' : 'Est. Loss Value ($)'}
                      </span>
                      <span className="text-2xl font-black font-mono text-rose-600">
                        {totalLossUSD.toFixed(2)} $
                      </span>
                    </div>
                  </div>

                  <div className="bg-rose-50/50 rounded-2xl border border-rose-200 p-5 text-right flex items-center justify-between">
                    <div className="bg-rose-100 text-rose-700 p-3 rounded-xl justify-center items-center flex">
                      <Globe className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-xs text-rose-800 block font-bold mb-1">
                        {lang === 'ar' ? 'إجمالي الخسارة بالليرة اللبنانية' : 'Est. Loss Value (L.L)'}
                      </span>
                      <span className="text-xl font-black font-mono text-rose-700">
                        {Math.ceil(totalLossLBP).toLocaleString()} ل.ل
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 text-right flex items-center justify-between">
                    <div className="bg-slate-50 text-slate-600 p-3 rounded-xl justify-center items-center flex">
                      <Trash2 className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-bold mb-1">
                        {lang === 'ar' ? 'الكمية التالفة الإجمالية' : 'Total Items Wasted'}
                      </span>
                      <span className="text-2xl font-black font-mono text-slate-800 font-extrabold">
                        {totalItemsWasted} {lang === 'ar' ? 'وحدة / قطعة' : 'items'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Waste Table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <span>🗑️ {lang === 'ar' ? 'قائمة الجرود التالفة والهدر المسجل بالمخزن' : 'Waste & Spoiled Items Register'}</span>
                    </h4>
                    <div className="relative w-full sm:w-80">
                      <input
                        type="text"
                        placeholder={lang === 'ar' ? 'ابحث باسم المنتج التالف أو الملاحظات...' : 'Search spoiled item...'}
                        value={wasteSearchQuery}
                        onChange={(e) => setWasteSearchQuery(e.target.value)}
                        className="w-full bg-white text-slate-800 border border-slate-300 rounded-xl py-2 pl-4 pr-10 text-xs text-right focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase">
                          <th className="p-3 text-right">{lang === 'ar' ? 'ملاحظة تشغيلية' : 'Operational Note'}</th>
                          <th className="p-3 text-center">{lang === 'ar' ? 'التعويض' : 'Comp. Status'}</th>
                          <th className="p-3 text-center">{lang === 'ar' ? 'تاريخ التلف' : 'Date Spoiled'}</th>
                          <th className="p-3 text-center">{lang === 'ar' ? 'سبب التلف' : 'Spolication Reason'}</th>
                          <th className="p-3 text-center">{lang === 'ar' ? 'تكلفة الخسارة' : 'Estimated Cost'}</th>
                          <th className="p-3 text-center">{lang === 'ar' ? 'الكمية التالفة' : 'Wasted Qty'}</th>
                          <th className="p-3 text-right">{lang === 'ar' ? 'المنتج / الصنف' : 'Product Name'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredWaste.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400 col-span-7">
                              {lang === 'ar' ? 'لا توجد سلع تالفة مطابقة لبحثك.' : 'No spoiled items match search criteria.'}
                            </td>
                          </tr>
                        ) : (
                          filteredWaste.map((w, idx) => {
                            return (
                              <tr key={idx} className="hover:bg-slate-50/80 transition font-sans">
                                <td className="p-3 text-right text-slate-500 font-medium italic text-right">
                                  {w.note || '—'}
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] uppercase font-black ${
                                    w.compensationStatus === 'compensated' 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                      : 'bg-rose-50 text-rose-700 border border-rose-100'
                                  }`}>
                                    {w.compensationStatus === 'compensated' 
                                      ? (lang === 'ar' ? '✔️ معوض من الموزع' : 'Compensated') 
                                      : (lang === 'ar' ? '🛑 خسارة على المحل' : 'Total loss')}
                                  </span>
                                </td>
                                <td className="p-3 text-center font-mono font-bold text-slate-500">
                                  {w.date}
                                </td>
                                <td className="p-3 text-center">
                                  <span className="inline-block bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                                    {w.reason === 'expired' || w.type === 'expired'
                                      ? (lang === 'ar' ? '⏳ انتهاء الصلاحية' : 'Expired product')
                                      : w.reason === 'theft_loss'
                                        ? (lang === 'ar' ? '👥 سرقة وضياع' : 'Theft or loss')
                                        : (lang === 'ar' ? '📦 مكسور / تلف الرفوف' : 'Damaged / broken')}
                                  </span>
                                </td>
                                <td className="p-3 text-center font-mono font-black text-rose-600">
                                  {(w.estimatedLossUSD || w.cost || 0).toFixed(2)} $
                                  <span className="block text-[9px] text-slate-400 font-bold">
                                    {~~((w.estimatedLossUSD || w.cost || 0) * settings.exchangeRate).toLocaleString()} ل.ل
                                  </span>
                                </td>
                                <td className="p-3 text-center font-mono font-extrabold text-slate-800">
                                  {w.qty || w.quantity || 1}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* SUBTAB CONTENT: 8. MINIMUM REORDER LEVEL ALERTER REPORT */}
      {reportsSubTab === 'reorder_report' && (
        <div className="space-y-6 animate-fadeIn">
          {(() => {
            const lowStockItems = products.filter(p => p.quantity <= settings.lowStockThreshold);
            const totalOutofStock = lowStockItems.filter(p => p.quantity === 0).length;
            
            // Estimate needed order amount (restock each low item to 2 times threshold as standard)
            const estRestockCost = lowStockItems.reduce((sum, p) => {
              const target = settings.lowStockThreshold * 2;
              const neededQuantity = Math.max(0, target - p.quantity);
              const itemCost = p.costPriceUSD || (p.priceWholesale || p.priceUSD * 0.75);
              return sum + (neededQuantity * itemCost);
            }, 0);

            // Filter by search query
            const query = reorderSearchQuery.trim().toLowerCase();
            const filteredReorders = lowStockItems.filter(p => {
              if (!query) return true;
              return (
                p.name.toLowerCase().includes(query) ||
                p.barcode.toLowerCase().includes(query) ||
                (p.barcodes && p.barcodes.some(b => b.toLowerCase().includes(query))) ||
                p.category.toLowerCase().includes(query)
              );
            });

            return (
              <div className="space-y-6 text-right">
                {/* Summary Info Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="bg-amber-50/50 rounded-2xl border border-amber-200 p-5 text-right flex items-center justify-between">
                    <div className="bg-amber-100 text-amber-700 p-3 rounded-xl justify-center items-center flex">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-xs text-amber-800 block font-bold mb-1">
                        {lang === 'ar' ? 'سلع بلغت حد النفاذ والطلب' : 'Low Stock Items (<= threshold)'}
                      </span>
                      <span className="text-2xl font-black font-mono text-amber-700 font-extrabold">
                        {lowStockItems.length} {lang === 'ar' ? 'أصناف عاجلة' : 'products'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-rose-50/60 rounded-2xl border border-rose-200 p-5 text-right flex items-center justify-between">
                    <div className="bg-rose-100 text-rose-700 p-3 rounded-xl justify-center items-center flex">
                      <ShieldAlert className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-xs text-rose-800 block font-bold mb-1">
                        {lang === 'ar' ? 'منتجات نفذت تماماً (رصيد 0)' : 'Completely Out of Stock'}
                      </span>
                      <span className="text-2xl font-black font-mono text-rose-600 font-extrabold">
                        {totalOutofStock} {lang === 'ar' ? 'منتجات فارغة' : 'items'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 text-right flex items-center justify-between font-sans">
                    <div className="bg-[#1D9E75]/10 text-[#1D9E75] p-3 rounded-xl justify-center items-center flex">
                      <DollarSign className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-bold mb-1">
                        {lang === 'ar' ? 'تمويل الطلبية المقترحة بالتكلفة' : 'Est Restock Order Cost'}
                      </span>
                      <span className="text-xl font-black font-mono text-emerald-600">
                        {estRestockCost.toFixed(2)} $
                        <span className="block text-[9.5px] text-slate-400 font-bold">
                          {~~(estRestockCost * settings.exchangeRate).toLocaleString()} ل.ل
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interactive Reorder Advice List */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-right">
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span>⚠️ {lang === 'ar' ? 'قائمة النواقص وتوصيات إعادة الطلب الحرجة' : 'Low Stock Warning & Ordering Advice'}</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {lang === 'ar' 
                          ? `الأصناف التي يقل رصيدها الحالي أو يطابق حد الطلب العام المحدد والبالغ: ${settings.lowStockThreshold} وحدات.`
                          : `Items that have stock level smaller than or equal to general warning threshold: ${settings.lowStockThreshold} units.`}
                      </p>
                    </div>
                    <div className="relative w-full sm:w-80">
                      <input
                        type="text"
                        placeholder={lang === 'ar' ? 'ابحث بنواقص المنتجات...' : 'Search critical stock...'}
                        value={reorderSearchQuery}
                        onChange={(e) => setReorderSearchQuery(e.target.value)}
                        className="w-full bg-white text-slate-800 border border-slate-300 rounded-xl py-2 pl-4 pr-10 text-xs text-right focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase">
                          <th className="p-3 text-center">{lang === 'ar' ? 'التكلفة المقدرة' : 'Est. Reorder Cost'}</th>
                          <th className="p-3 text-center">{lang === 'ar' ? 'توصية إعادة المخزن' : 'Suggested Restock'}</th>
                          <th className="p-3 text-center">{lang === 'ar' ? 'حالة التنبيه' : 'Alert Status'}</th>
                          <th className="p-3 text-center">{lang === 'ar' ? 'حد الأمان' : 'Saftey Threshold'}</th>
                          <th className="p-3 text-center">{lang === 'ar' ? 'المخزون الحالي' : 'Stock Level'}</th>
                          <th className="p-3 text-center">{lang === 'ar' ? 'سعر التكلفة للوحدة' : 'Unit Cost'}</th>
                          <th className="p-3 text-center">{lang === 'ar' ? 'الرمز (SKU)' : 'SKU'}</th>
                          <th className="p-3 text-right">{lang === 'ar' ? 'المنتج / الصنف' : 'Product Name'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredReorders.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400 col-span-8">
                              {lang === 'ar' ? 'كل منتجات مخزنك آمنة وفوق حد الطلب حالياً! 🎉' : 'Amazing! All products are well stocked above limits.'}
                            </td>
                          </tr>
                        ) : (
                          filteredReorders.map((p, idx) => {
                            const cost = p.costPriceUSD || (p.priceWholesale || p.priceUSD * 0.75);
                            const restockTarget = settings.lowStockThreshold * 2;
                            const suggestQty = Math.max(0, restockTarget - p.quantity);
                            const suggestCostSum = suggestQty * cost;

                            return (
                              <tr key={idx} className="hover:bg-slate-50/80 transition font-sans">
                                <td className="p-3 text-center font-mono font-black text-[#1D9E75]">
                                  {suggestCostSum.toFixed(2)} $
                                  <span className="block text-[9px] text-[#1D9E75] font-bold">
                                    {~~(suggestCostSum * settings.exchangeRate).toLocaleString()} ل.ل
                                  </span>
                                </td>
                                <td className="p-3 text-center font-bold">
                                  <span className="text-[#1D9E75] font-black font-mono bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded text-[10px]">
                                    + {suggestQty} {lang === 'ar' ? 'وحدة مقترحة' : 'units'}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                                    p.quantity === 0
                                      ? 'bg-rose-50 text-rose-700 border border-rose-100 animate-pulse'
                                      : 'bg-amber-50 text-amber-700 border border-amber-100'
                                  }`}>
                                    {p.quantity === 0 
                                      ? (lang === 'ar' ? '🚨 نفذ بالكامل' : 'Out of Stock') 
                                      : (lang === 'ar' ? '⚠️ رصيد منخفض' : 'Low Stock')}
                                  </span>
                                </td>
                                <td className="p-3 text-center font-mono font-bold text-slate-500">
                                  {settings.lowStockThreshold}
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`font-mono font-black text-sm ${p.quantity === 0 ? 'text-rose-600 font-extrabold' : 'text-amber-600'}`}>
                                    {p.quantity}
                                  </span>
                                </td>
                                <td className="p-3 text-center font-mono text-slate-500 font-bold">
                                  {cost.toFixed(2)} $
                                </td>
                                <td className="p-3 text-center font-mono text-slate-400">
                                  {p.sku || p.barcode.slice(0, 8)}
                                </td>
                                <td className="p-3 text-right font-black text-slate-800 text-xs text-right">
                                  {p.name}
                                  <span className="block text-[8.5px] text-slate-400 font-semibold">{p.category}</span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

    </div>
  );
}
