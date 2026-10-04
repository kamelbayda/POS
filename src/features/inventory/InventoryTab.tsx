import React, { useEffect, useState } from 'react';
import { AlertTriangle, Download, Edit, EyeOff, Plus, Printer, Trash2, Upload } from 'lucide-react';
import { Category, Product, ProcessedProduct, SystemSettings, User } from '../../types';
import { ColumnSelector } from '../../components/ColumnSelector';
import { useResizableColumns } from '../../hooks/useResizableColumns';
import { handleMathBlur, handleMathKeyDown } from '../../mathEvaluator';
import { withOperatingCost } from '../../lib/operatingCost';

interface InventoryTabProps {
  products: Product[];
  processedProducts: ProcessedProduct[];
  categories: Category[];
  settings: SystemSettings;
  currentUser: User;
  today: string;
  stagnantDaysThreshold: number;
  setStagnantDaysThreshold: (days: number) => void;
  lang: 'ar' | 'en';
  showToast: (type: 'success' | 'error' | 'warning', message: string) => void;
  /** Saves the full products list; `changed` is the product to mirror to the cloud. */
  onProductsChange: (updated: Product[], changed: Product) => void;
  onDeleteProduct: (id: string, name: string) => void;
  onOpenImport: () => void;
  onPrintBarcodeLabel: (product: Product) => void;
  onAddCategory: () => void;
}

export function InventoryTab({
  products,
  processedProducts,
  categories,
  settings,
  currentUser,
  today,
  stagnantDaysThreshold,
  setStagnantDaysThreshold,
  lang,
  showToast,
  onProductsChange,
  onDeleteProduct,
  onOpenImport,
  onPrintBarcodeLabel,
  onAddCategory,
}: InventoryTabProps) {
  const [invCurrentPage, setInvCurrentPage] = useState<number>(1);
  const [invItemsPerPage, setInvItemsPerPage] = useState<number>(20);

  // Column filtering state for Excel-like column header filtering
  const [colFilters, setColFilters] = useState<{ [key: string]: string }>({
    name: '',
    barcode: '',
    category: '',
    cost: '',
    profit: '',
    price_usd: '',
    price_lbp: '',
    qty_shop: '',
    qty_wh: '',
    last_sale: '',
    expiry: '',
  });

  // Custom search and category creation states
  const [inventorySearchQuery, setInventorySearchQuery] = useState<string>('');
  
  // Custom states for column visibility & interactivity
  const [visibleInvCols, setVisibleInvCols] = useState<{ [key: string]: boolean }>({
    name: true,
    barcode: true,
    category: true,
    cost: true,
    profit: true,
    price_usd: true,
    price_lbp: true,
    qty_shop: true,
    qty_wh: true,
    last_sale: false,
    expiry: true,
    actions: true,
  });

  const invColumns = [
    { key: 'name', label: lang === 'ar' ? 'اسم المنتج' : 'Product Name' },
    { key: 'barcode', label: lang === 'ar' ? 'الباركود' : 'Barcode' },
    { key: 'category', label: lang === 'ar' ? 'الفئة' : 'Category' },
    { key: 'cost', label: lang === 'ar' ? 'التكلفة ($)' : 'Cost ($)' },
    { key: 'profit', label: lang === 'ar' ? 'هامش الربح (%)' : 'Margin (%)' },
    { key: 'price_usd', label: lang === 'ar' ? 'سعر البيع ($)' : 'Price ($)' },
    { key: 'price_lbp', label: lang === 'ar' ? 'السعر بالليرة' : 'Price LBP' },
    { key: 'qty_shop', label: lang === 'ar' ? 'الكمية بالمحل' : 'Shop Qty' },
    { key: 'qty_wh', label: lang === 'ar' ? 'الكمية بالمستودع' : 'WH Qty' },
    { key: 'last_sale', label: lang === 'ar' ? 'آخر بيع / ركود' : 'Last Sale' },
    { key: 'expiry', label: lang === 'ar' ? 'الصلاحية' : 'Expiry' },
    { key: 'actions', label: lang === 'ar' ? 'الإجراءات' : 'Actions' }
  ];

  // Excel-like column resizing for the inventory table
  const { colWidths, handleResizeStart } = useResizableColumns({
    name: 240,
    barcode: 150,
    category: 120,
    cost: 110,
    profit: 100,
    price_usd: 100,
    price_lbp: 120,
    qty_shop: 140,
    qty_wh: 140,
    last_sale: 140,
    expiry: 140,
    actions: 120,
  }, lang);

  const [showStagnantOnly, setShowStagnantOnly] = useState<boolean>(false);
  const [selectedInventoryCategory, setSelectedInventoryCategory] = useState<string>('');

  // --- ADD / EDIT PRODUCT STATES ---
  const [newProdName, setNewProdName] = useState<string>('');
  const [newProdBarcode, setNewProdBarcode] = useState<string>('');
  const [newProdExtraBarcodes, setNewProdExtraBarcodes] = useState<string[]>([]);
  const [extraBarcodeTemp, setExtraBarcodeTemp] = useState<string>('');
  const [newProdCategory, setNewProdCategory] = useState<string>('dairy');
  const [newProdPriceUSD, setNewProdPriceUSD] = useState<string>('');
  const [newProdPriceWholesale, setNewProdPriceWholesale] = useState<string>('');
  const [newProdCostPriceUSD, setNewProdCostPriceUSD] = useState<string>('');
  const [newProdOpCostUSD, setNewProdOpCostUSD] = useState<string>('');
  const [newProdOpCostPct, setNewProdOpCostPct] = useState<string>('');
  const [newProdMinWholesaleQty, setNewProdMinWholesaleQty] = useState<string>('5');
  const [newProdSku, setNewProdSku] = useState<string>('');
  const [newProdQuantity, setNewProdQuantity] = useState<string>('10');
  const [newProdExpiry, setNewProdExpiry] = useState<string>(today);
  const [newProdImage, setNewProdImage] = useState<string | undefined>(undefined);
  const [newProdIsWeighed, setNewProdIsWeighed] = useState<boolean>(false);
  const [newProdPlu, setNewProdPlu] = useState<string>('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductFormExpanded, setIsProductFormExpanded] = useState<boolean>(false);

  const [customMarginVal, setCustomMarginVal] = useState<string>('');
  const [customMarkupVal, setCustomMarkupVal] = useState<string>('');

  const numPrice = parseFloat(newProdPriceUSD) || 0;
  const formOpCost = { operatingCostUSD: parseFloat(newProdOpCostUSD) || 0, operatingCostPercent: parseFloat(newProdOpCostPct) || 0 };
  const numBaseCost = parseFloat(newProdCostPriceUSD) || 0;
  // Margins and prices in the form use the full cost: purchase cost + operating cost
  const numCost = withOperatingCost(formOpCost, numBaseCost);
  const hasOpCost = formOpCost.operatingCostUSD > 0 || formOpCost.operatingCostPercent > 0;
  const rawProfit = numPrice - numCost;
  const currentMargin = numPrice > 0 ? (rawProfit / numPrice) * 100 : 0;
  const currentMarkup = numCost > 0 ? (rawProfit / numCost) * 100 : 0;

  // Reset inventory page when filters change
  useEffect(() => {
    setInvCurrentPage(1);
  }, [inventorySearchQuery, selectedInventoryCategory, showStagnantOnly]);

  // --- SAVE / EDIT PRODUCTS FOR INVENTORY ---
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newProdName.trim();
    const barcode = newProdBarcode.trim();
    const price = parseFloat(newProdPriceUSD);
    const qty = parseFloat(newProdQuantity);
    const priceW = parseFloat(newProdPriceWholesale) || (price * 0.9);
    const cost = parseFloat(newProdCostPriceUSD) || (price * 0.75);
    const minWQty = parseFloat(newProdMinWholesaleQty) || 5;
    const sku = newProdSku.trim() || `SKU-${barcode.slice(-4)}`;
    
    if (!name || !barcode || isNaN(price) || isNaN(qty) || !newProdExpiry) {
      showToast('error', 'الرجاء تعبئة كل خلايا نموذج المنتجات بشكل صحيح!');
      return;
    }

    // Validate barcode & extra barcodes uniqueness
    const allBarcodesToValidate = [barcode, ...newProdExtraBarcodes].map(b => b.trim()).filter(Boolean);
    const duplicatedProduct = products.find(p => {
      if (editingProduct && p.id === editingProduct.id) return false;
      const otherBarcodes = [p.barcode, ...(p.barcodes || [])].map(b => b.trim()).filter(Boolean);
      return allBarcodesToValidate.some(b => otherBarcodes.includes(b));
    });

    if (duplicatedProduct) {
      showToast('error', `عفواً! أحد الباركودات المدخلة مستعمل مسبقاً للصنف [${duplicatedProduct.name}].`);
      return;
    }

    if (editingProduct) {
      // Edit
      const updated = products.map(p => {
        if (p.id === editingProduct.id) {
          return {
            ...p,
            name,
            barcode,
            barcodes: newProdExtraBarcodes,
            category: newProdCategory,
            priceUSD: price,
            quantity: qty,
            expiryDate: newProdExpiry,
            priceWholesale: priceW,
            minWholesaleQty: minWQty,
            sku,
            costPriceUSD: cost,
            operatingCostUSD: formOpCost.operatingCostUSD || undefined,
            operatingCostPercent: formOpCost.operatingCostPercent || undefined,
            image: newProdImage,
            isWeighed: newProdIsWeighed,
            plu: newProdPlu.trim(),
          };
        }
        return p;
      });
      const freshProd = updated.find(p => p.id === editingProduct.id)!;
      onProductsChange(updated, freshProd);
      showToast('success', `تم تعديل الصنف [${name}] بنجاح في قاعدة البيانات.`);
      setEditingProduct(null);
    } else {
      // Add
      const newP: Product = {
        id: `prod-${Date.now()}`,
        name,
        barcode,
        barcodes: newProdExtraBarcodes,
        category: newProdCategory,
        priceUSD: price,
        quantity: qty,
        expiryDate: newProdExpiry,
        priceWholesale: priceW,
        minWholesaleQty: minWQty,
        sku,
        costPriceUSD: cost,
        operatingCostUSD: formOpCost.operatingCostUSD || undefined,
        operatingCostPercent: formOpCost.operatingCostPercent || undefined,
        image: newProdImage,
        isWeighed: newProdIsWeighed,
        plu: newProdPlu.trim(),
      };

      onProductsChange([newP, ...products], newP);
      showToast('success', `تم إضافة الصنف الجديد [${name}] للمحل بنجاح!`);
    }

    // Reset Form
    setNewProdName('');
    setNewProdBarcode('');
    setNewProdExtraBarcodes([]);
    setExtraBarcodeTemp('');
    setNewProdPriceUSD('');
    setNewProdPriceWholesale('');
    setNewProdCostPriceUSD('');
    setNewProdOpCostUSD('');
    setNewProdOpCostPct('');
    setNewProdMinWholesaleQty('5');
    setNewProdSku('');
    setNewProdQuantity('10');
    setNewProdExpiry(today);
    setNewProdImage(undefined);
    setNewProdIsWeighed(false);
    setNewProdPlu('');
    setIsProductFormExpanded(false);
  };

  const handleEditProductButton = (p: Product) => {
    setEditingProduct(p);
    setIsProductFormExpanded(true);
    setNewProdName(p.name);
    setNewProdBarcode(p.barcode);
    setNewProdExtraBarcodes(p.barcodes || []);
    setExtraBarcodeTemp('');
    setNewProdCategory(p.category);
    setNewProdPriceUSD(p.priceUSD.toString());
    setNewProdPriceWholesale(p.priceWholesale ? p.priceWholesale.toString() : (p.priceUSD * 0.9).toFixed(2));
    setNewProdCostPriceUSD(p.costPriceUSD ? p.costPriceUSD.toString() : (p.priceUSD * 0.75).toFixed(2));
    setNewProdOpCostUSD(p.operatingCostUSD ? p.operatingCostUSD.toString() : '');
    setNewProdOpCostPct(p.operatingCostPercent ? p.operatingCostPercent.toString() : '');
    setNewProdMinWholesaleQty(p.minWholesaleQty ? p.minWholesaleQty.toString() : '5');
    setNewProdSku(p.sku || '');
    setNewProdQuantity(p.quantity.toString());
    setNewProdExpiry(p.expiryDate);
    setNewProdImage(p.image);
    setNewProdIsWeighed(!!p.isWeighed);
    setNewProdPlu(p.plu || '');
    // Smooth scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- EXCEL/CSV EXPORT GENERATOR ---
  const generateCSVExportStr = () => {
    const headers = ["اسم المنتج", "الباركود", "الفئة", "السعر بالدولار ($)", "كمية المخزن الحالي", "تاريخ الصلاحية"];
    const rows = products.map(p => [
      p.name,
      p.barcode,
      categories.find(c => c.id === p.category)?.name || p.category,
      p.priceUSD.toString(),
      p.quantity.toString(),
      p.expiryDate
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `جردة_مخازن_${settings.shopName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'تم تجميع وتصدير ملف جردة المخازن كـ Excel CSV بنجاح!');
  };
  return (
    <div className="space-y-6" id="tab-inventory-manager">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <button 
              onClick={generateCSVExportStr}
              className="bg-[#1D9E75] text-white hover:bg-emerald-600 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border-none"
            >
              <Download className="w-4 h-4" />
              <span>تصدير جردة Excel (CSV)</span>
            </button>
            {currentUser.role === 'admin' && (
              <button 
                type="button"
                onClick={() => {
                  onOpenImport();
                }}
                className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border-none"
              >
                <Upload className="w-4 h-4" />
                <span>استيراد الأصناف من Excel 📥</span>
              </button>
            )}
            {currentUser.role === 'admin' && (
              <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                إجمالي الأصناف: {products.length}
              </span>
            )}
          </div>
          <h3 className="font-bold text-slate-800 text-lg">📦 إدارة مخازن السوبرماركت ومستويات الأسعار</h3>
        </div>

        {/* --- COMPUTE AND ALERT PRODUCTS WITH LOW MARGINS (< 5%) --- */}
        {currentUser.role === 'admin' && (() => {
          const lowMarginProds = products.filter(p => {
            const finalCost = withOperatingCost(p, p.costPriceUSD || (p.priceWholesale ? p.priceWholesale * 0.95 : p.priceUSD * 0.75));
            const profitAmount = p.priceUSD - finalCost;
            const marginPercent = p.priceUSD > 0 ? (profitAmount / p.priceUSD) * 100 : 0;
            return marginPercent < 5;
          });

          if (lowMarginProds.length === 0) return null;

          return (
            <div className="bg-red-50/90 border border-red-200/80 p-4 rounded-xl text-right font-sans mb-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5 flex-row-reverse text-right">
                <div className="p-2.5 bg-red-100 rounded-xl text-red-600 shrink-0">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-extrabold text-red-950 text-xs sm:text-sm">⚠️ تحذير: أصناف ذات هامش ربح منخفض للغاية (أقل من 5%)</h4>
                  <p className="text-[11px] text-red-700 font-bold mt-0.5 leading-relaxed">
                    هناك ({lowMarginProds.length}) سلع في متجرك تقترب أسعار بيعها من سعر تكلفة شرائها أو تقل عنه. تم تمييز هذه الأصناف وتلوينها باللون الأحمر مع حواف تنبيهية حمراء في الجدول العام لتسهيل تعديلها.
                  </p>
                </div>
              </div>
              <span className="bg-red-600 text-white font-black text-[10px] px-3 py-1.5 rounded-xl shrink-0 self-start sm:self-center animate-bounce">
                🚨 {lowMarginProds.length} أصناف حرجة
              </span>
            </div>
          );
        })()}

        {/* --- COMPUTE AND ALERT PRODUCTS NOT SOLD FOR LONG PERIOD --- */}
        {(() => {
          const stagnantProds = processedProducts.filter(p => p.isStagnant);
          if (stagnantProds.length === 0) return null;

          return (
            <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl text-right font-sans mb-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5 flex-row-reverse text-right">
                <div className="p-2.5 bg-slate-200 text-slate-600 rounded-xl shrink-0">
                  <EyeOff className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm">📉 تنبيه: بضائع راكدة لم يتم بيعها منذ {stagnantDaysThreshold} يوماً أو أكثر</h4>
                  <p className="text-[11px] text-slate-500 font-bold mt-0.5 leading-relaxed">
                    هناك ({stagnantProds.length}) سلع في متجرك راكدة لم يُسجّل لها أي حركة بيع خلال {stagnantDaysThreshold} يوماً الماضية. تم تمييز هذه الأصناف وتلوينها باللون الرمادي لتسهيل اتخاذ قرار بشأن ترويجها، أو عمل عروض حسم (Promotions).
                  </p>
                </div>
              </div>
              <span className="bg-slate-500 text-white font-black text-[10px] px-3 py-1.5 rounded-xl shrink-0 self-start sm:self-center">
                📢 {stagnantProds.length} أصناف راكدة
              </span>
            </div>
          );
        })()}

        {/* Collapsible toggle button */}
        {currentUser.role === 'admin' && (
          <div className="flex justify-start mb-5 pb-4 border-b border-slate-100 flex-row-reverse">
            <button
              type="button"
              onClick={() => {
                setIsProductFormExpanded(!isProductFormExpanded);
                if (!isProductFormExpanded) {
                  setEditingProduct(null);
                }
              }}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition duration-150 flex items-center gap-2 cursor-pointer shadow-xs border ${
                isProductFormExpanded 
                  ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100' 
                  : 'bg-[#1D9E75] border-transparent text-white hover:bg-emerald-600'
              }`}
            >
              {isProductFormExpanded ? '▲ إغلاق نموذج الإضافة / التعديل (تصغير العرض)' : '➕ إدراج وإضافة صنف جديد بالرف والمسجل'}
            </button>
          </div>
        )}

        {/* FORM FOR ADD / EDIT - MOVED FROM CARD */}
        {currentUser.role === 'admin' ? (
          isProductFormExpanded && (
            <form onSubmit={handleSaveProduct} className="bg-slate-50 hover:bg-slate-50 rounded-xl p-5 border border-slate-150 mb-6 space-y-4">
            <h4 className="font-bold text-[#1D9E75] text-sm pb-1.5 border-b border-slate-200 flex items-center gap-2">
              <Plus className="w-5 h-5 flex-shrink-0" />
              <span>{editingProduct ? `تعديل صنف: [ ${editingProduct.name} ]` : 'إدراج صنف جديد بالرف والمسجل'}</span>
              <span className="mr-auto bg-sky-50 text-sky-700 border border-sky-100 rounded-lg px-2 py-0.5 text-[10px] font-black flex items-center gap-1 select-none">
                🧮 خلايا تفاعلية: اكتب `=4/2` للحساب التلقائي
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-9 gap-3 text-right">
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-slate-600 mb-1 text-xs font-bold">اسم الصنف / المنتج:</label>
                <input 
                  type="text" 
                  value={newProdName}
                  onChange={e => setNewProdName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-right focus:ring-1 focus:ring-emerald-500"
                  placeholder="مثلاً: بيبسي عائلي 2 لتر"
                  required
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-slate-600 text-xs font-bold">الباركود:</label>
                  <button
                    type="button"
                    onClick={() => {
                      let rand = '';
                      do {
                        rand = '29' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
                      } while (products.some(p => p.barcode === rand));
                      setNewProdBarcode(rand);
                      showToast('success', lang === 'ar' ? 'تم توليد باركود فريد بنجاح! ⚡' : 'Unique random barcode generated successfully!');
                    }}
                    className="text-amber-700 hover:text-amber-800 text-[10px] font-bold cursor-pointer bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 select-none animate-pulse"
                    title="توليد باركود عشوائي فريد ومناسب للنظام"
                  >
                    ⚡ توليد تلقائي
                  </button>
                </div>
                <input 
                  type="text" 
                  value={newProdBarcode}
                  onChange={e => setNewProdBarcode(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-center font-mono focus:ring-1 focus:ring-emerald-500"
                  placeholder="مثلاً: 1010"
                  required
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-slate-600 text-xs font-bold">الفئة:</label>
                  <button
                    type="button"
                    onClick={() => onAddCategory()}
                    className="text-emerald-600 hover:text-emerald-700 text-[10px] font-bold cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200"
                    title="إضافة فئة جديدة"
                  >
                    + إضافة جديدة
                  </button>
                </div>
                <select 
                  value={newProdCategory}
                  onChange={e => setNewProdCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-right focus:ring-1 focus:ring-emerald-500 font-bold"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1 text-xs font-bold">السعر مفرّق ($):</label>
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={newProdPriceUSD}
                  onChange={e => setNewProdPriceUSD(e.target.value)}
                  onBlur={e => handleMathBlur(e.target.value, setNewProdPriceUSD)}
                  onKeyDown={e => handleMathKeyDown(e, e.currentTarget.value, setNewProdPriceUSD)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-center font-mono focus:ring-1 focus:ring-emerald-500"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 text-xs font-bold">سعر الجملة ($):</label>
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={newProdPriceWholesale}
                  onChange={e => setNewProdPriceWholesale(e.target.value)}
                  onBlur={e => handleMathBlur(e.target.value, setNewProdPriceWholesale)}
                  onKeyDown={e => handleMathKeyDown(e, e.currentTarget.value, setNewProdPriceWholesale)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-center font-mono focus:ring-1 focus:ring-emerald-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-emerald-800 mb-1 text-xs font-black">سعر التكلفة / رأس المال ($):</label>
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={newProdCostPriceUSD}
                  onChange={e => {
                    const costVal = e.target.value;
                    setNewProdCostPriceUSD(costVal);
                    const costNum = parseFloat(costVal);
                    if (!isNaN(costNum) && costNum > 0) {
                      const margin = settings.defaultMarginPercent !== undefined ? settings.defaultMarginPercent : 15;
                      const calculatedPrice = withOperatingCost(formOpCost, costNum) * (1 + margin / 100);
                      setNewProdPriceUSD(calculatedPrice.toFixed(2));
                      setNewProdPriceWholesale((calculatedPrice * 0.9).toFixed(2));
                    }
                  }}
                  onBlur={e => {
                    handleMathBlur(e.target.value, setNewProdCostPriceUSD, (res) => {
                      const margin = settings.defaultMarginPercent !== undefined ? settings.defaultMarginPercent : 15;
                      const calculatedPrice = withOperatingCost(formOpCost, res) * (1 + margin / 100);
                      setNewProdPriceUSD(calculatedPrice.toFixed(2));
                      setNewProdPriceWholesale((calculatedPrice * 0.9).toFixed(2));
                    });
                  }}
                  onKeyDown={e => {
                    handleMathKeyDown(e, e.currentTarget.value, setNewProdCostPriceUSD, (res) => {
                      const margin = settings.defaultMarginPercent !== undefined ? settings.defaultMarginPercent : 15;
                      const calculatedPrice = withOperatingCost(formOpCost, res) * (1 + margin / 100);
                      setNewProdPriceUSD(calculatedPrice.toFixed(2));
                      setNewProdPriceWholesale((calculatedPrice * 0.9).toFixed(2));
                    });
                  }}
                  className="w-full bg-emerald-50/50 border border-emerald-200 rounded-lg py-2 px-3 text-sm text-center font-mono focus:ring-1 focus:ring-emerald-500 font-bold text-emerald-900"
                  placeholder="مثلاً: 0.75"
                />
              </div>
              <div>
                <label className="block text-orange-800 mb-1 text-xs font-black" title="نقل، تبريد، تغليف... بتنضاف عالكلفة بحساب الربح">كلفة تشغيلية للقطعة ($):</label>
                <input
                  type="text"
                  inputMode="decimal"
                  id="prod-opcost-usd"
                  value={newProdOpCostUSD}
                  onChange={e => setNewProdOpCostUSD(e.target.value)}
                  onBlur={e => handleMathBlur(e.target.value, setNewProdOpCostUSD)}
                  onKeyDown={e => handleMathKeyDown(e, e.currentTarget.value, setNewProdOpCostUSD)}
                  className="w-full bg-orange-50/50 border border-orange-200 rounded-lg py-2 px-3 text-sm text-center font-mono focus:ring-1 focus:ring-orange-400 font-bold text-orange-900"
                  placeholder="مثلاً: 0.10"
                />
              </div>
              <div>
                <label className="block text-orange-800 mb-1 text-xs font-black" title="نسبة من سعر التكلفة">أو كلفة تشغيلية (% من التكلفة):</label>
                <input
                  type="text"
                  inputMode="decimal"
                  id="prod-opcost-pct"
                  value={newProdOpCostPct}
                  onChange={e => setNewProdOpCostPct(e.target.value)}
                  onBlur={e => handleMathBlur(e.target.value, setNewProdOpCostPct)}
                  onKeyDown={e => handleMathKeyDown(e, e.currentTarget.value, setNewProdOpCostPct)}
                  className="w-full bg-orange-50/50 border border-orange-200 rounded-lg py-2 px-3 text-sm text-center font-mono focus:ring-1 focus:ring-orange-400 font-bold text-orange-900"
                  placeholder="مثلاً: 5"
                />
                {hasOpCost && numBaseCost > 0 && (
                  <span className="block text-[10px] text-orange-700 font-bold mt-0.5" id="prod-full-cost">
                    الكلفة الكاملة: {numCost.toFixed(2)} $
                  </span>
                )}
              </div>
              <div>
                <label className="block text-slate-600 mb-1 text-xs font-bold">حد أدنى للجملة:</label>
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={newProdMinWholesaleQty}
                  onChange={e => setNewProdMinWholesaleQty(e.target.value)}
                  onBlur={e => handleMathBlur(e.target.value, setNewProdMinWholesaleQty)}
                  onKeyDown={e => handleMathKeyDown(e, e.currentTarget.value, setNewProdMinWholesaleQty)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-center font-mono focus:ring-1 focus:ring-emerald-500"
                  placeholder="5"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 text-xs font-bold">رمز SKU:</label>
                <input 
                  type="text" 
                  value={newProdSku}
                  onChange={e => setNewProdSku(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-center font-mono focus:ring-1 focus:ring-emerald-500"
                  placeholder="SKU-XXXX"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 text-xs font-bold">الكمية المتاحة:</label>
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={newProdQuantity}
                  onChange={e => setNewProdQuantity(e.target.value)}
                  onBlur={e => handleMathBlur(e.target.value, setNewProdQuantity)}
                  onKeyDown={e => handleMathKeyDown(e, e.currentTarget.value, setNewProdQuantity)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-center font-mono focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* --- ELECTRONIC SCALE CONFIGURATION --- */}
              <div className="col-span-1 sm:col-span-1 xl:col-span-2">
                <label className="block text-amber-800 mb-1 text-xs font-black">⚖️ ميزان إلكتروني؟</label>
                <button
                  type="button"
                  onClick={() => {
                    const val = !newProdIsWeighed;
                    setNewProdIsWeighed(val);
                    if (val && !newProdPlu) {
                      // Auto generate a 5-digit PLU based on barcode or random if not present
                      const cleanBar = newProdBarcode.replace(/[^0-9]/g, '');
                      const genPlu = cleanBar.length >= 5 ? cleanBar.slice(0, 5) : ('00000' + Math.floor(Math.random() * 100000)).slice(-5);
                      setNewProdPlu(genPlu);
                    }
                  }}
                  className={`w-full text-xs font-black py-2 px-2.5 rounded-lg border transition flex items-center justify-center gap-1 cursor-pointer h-9 ${
                    newProdIsWeighed 
                      ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <span>⚖️</span>
                  <span>{newProdIsWeighed ? 'موزون (سعر لكل كغ)' : 'بيع عادي (بالقطعة)'}</span>
                </button>
              </div>

              <div className="col-span-1 sm:col-span-1 xl:col-span-2">
                <label className="block text-slate-600 mb-1 text-xs font-bold">رمز الميزان (PLU):</label>
                <input 
                  type="text" 
                  maxLength={5}
                  value={newProdPlu}
                  onChange={e => {
                    const cleaned = e.target.value.replace(/[^0-9]/g, '');
                    setNewProdPlu(cleaned);
                  }}
                  disabled={!newProdIsWeighed}
                  className={`w-full border rounded-lg py-2 px-3 text-sm text-center font-mono font-bold focus:ring-1 focus:ring-emerald-500 h-9 ${
                    newProdIsWeighed ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                  placeholder="مثلاً: 00105"
                />
              </div>

              {/* --- MULTIPLE BARCODES EDITOR AND VIEWER --- */}
              <div className="col-span-1 sm:col-span-3 xl:col-span-9 bg-slate-100 p-3 rounded-lg border border-slate-200">
                <label className="block text-slate-700 text-xs font-bold mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    📊 الباركودات الإضافية (البديلة):
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    (يمكنك إضافة أكثر من باركود للصنف للتسهيل في نقطة البيع)
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={extraBarcodeTemp}
                    onChange={e => setExtraBarcodeTemp(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const b = extraBarcodeTemp.trim();
                        if (!b) return;
                        if (b === newProdBarcode) {
                          showToast('warning', 'هذا هو الباركود الأساسي للمنتج بالفعل!');
                          return;
                        }
                        if (newProdExtraBarcodes.includes(b)) {
                          showToast('warning', 'الباركود مضاف مسبقاً في القائمة البديلة.');
                          return;
                        }
                        setNewProdExtraBarcodes([...newProdExtraBarcodes, b]);
                        setExtraBarcodeTemp('');
                        showToast('success', 'تم ربط الباركود الإضافي!');
                      }
                    }}
                    className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-mono focus:ring-1 focus:ring-emerald-500 flex-1 text-center"
                    placeholder="اكتب الباركود البديل ثم اضغط إضافة أو Enter..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const b = extraBarcodeTemp.trim();
                      if (!b) return;
                      if (b === newProdBarcode) {
                        showToast('warning', 'هذا هو الباركود الأساسي للمنتج بالفعل!');
                        return;
                      }
                      if (newProdExtraBarcodes.includes(b)) {
                        showToast('warning', 'الباركود مضاف مسبقاً في القائمة البديلة.');
                        return;
                      }
                      setNewProdExtraBarcodes([...newProdExtraBarcodes, b]);
                      setExtraBarcodeTemp('');
                      showToast('success', 'تم ربط الباركود الإضافي!');
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                  >
                    + إضافة باركود
                  </button>
                </div>
                {newProdExtraBarcodes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {newProdExtraBarcodes.map((bc, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-xs font-mono font-semibold px-2 py-0.5 rounded-md border border-emerald-200">
                        {bc}
                        <button
                          type="button"
                          onClick={() => setNewProdExtraBarcodes(newProdExtraBarcodes.filter(x => x !== bc))}
                          className="hover:bg-emerald-200 text-emerald-600 rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px] font-bold cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* --- DYNAMIC PRICING MARGIN ASSISTANT --- */}
            <div className="bg-emerald-50/40 border border-emerald-100 p-4 rounded-xl text-right font-sans space-y-3.5">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-emerald-100 pb-2.5">
                <div className="text-xs font-black text-emerald-950 flex items-center justify-start gap-1 flex-row-reverse">
                  <span>💰 آلة احتساب السعر التلقائي والتسعير بهامش الأرباح:</span>
                </div>
                
                {/* Preset Actions */}
                <div className="flex flex-col gap-2">
                  {/* Margins */}
                  <div className="flex flex-wrap items-center justify-end gap-1.5 flex-row-reverse text-xs">
                    <span className="text-slate-600 font-bold ml-1 text-[11px]">حدد هامش ربح (خصم من البيع Margin):</span>
                    {[5, 10, 15, 20, 25, 30, 40, 50].map(m => (
                      <button
                        key={`m-${m}`}
                        type="button"
                        onClick={() => {
                          if (numCost > 0) {
                            const targetPrice = numCost / (1 - m / 100);
                            setNewProdPriceUSD(targetPrice.toFixed(2));
                            setNewProdPriceWholesale((targetPrice * 0.9).toFixed(2));
                            showToast('success', `تم تحديد السعر بهامش ربح %${m} من سعر المبيع مفرّق! ⚡`);
                          } else {
                            showToast('error', 'عفواً! يرجى إدخال سعر التكلفة / رأس المال أولاً ليتم الحساب بناءً عليه.');
                          }
                        }}
                        className="px-2 py-0.5 bg-white hover:bg-emerald-100 text-emerald-800 font-black rounded-lg border border-slate-200 hover:border-emerald-300 transition-all text-[10px] cursor-pointer"
                      >
                        %{m}
                      </button>
                    ))}
                  </div>
                  
                  {/* Markups */}
                  <div className="flex flex-wrap items-center justify-end gap-1.5 flex-row-reverse text-xs">
                    <span className="text-slate-600 font-bold ml-1 text-[11px]">أو حدد زيادة مئوية (فوق التكلفة Markup):</span>
                    {[10, 20, 30, 45, 60, 80, 100].map(mk => (
                      <button
                        key={`mk-${mk}`}
                        type="button"
                        onClick={() => {
                          if (numCost > 0) {
                            const targetPrice = numCost * (1 + mk / 100);
                            setNewProdPriceUSD(targetPrice.toFixed(2));
                            setNewProdPriceWholesale((targetPrice * 0.9).toFixed(2));
                            showToast('success', `تم تحديد السعر بزيادة %${mk} فوق سعر التكلفة! ⚡`);
                          } else {
                            showToast('error', 'عفواً! يرجى إدخال سعر التكلفة / رأس المال أولاً ليتم الحساب بناءً عليه.');
                          }
                        }}
                        className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-black rounded-lg border border-indigo-100 hover:border-indigo-200 transition-all text-[10px] cursor-pointer"
                      >
                        %{mk}
                      </button>
                    ))}
                  </div>

                  {/* Manual Input Row */}
                  <div className="flex flex-wrap items-center justify-end gap-3 flex-row-reverse border-t border-emerald-100/50 pt-2.5 mt-1.5 text-xs">
                    <span className="text-slate-700 font-extrabold text-[11px] ml-1">تحديد مخصَّص يدويّاً:</span>
                    
                    {/* Margin Input */}
                    <div className="flex items-center gap-1.5 flex-row-reverse">
                      <span className="text-[10px] text-slate-500 font-bold">هامش ربح مبيع %:</span>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          max="99"
                          placeholder="مثال: 12"
                          value={customMarginVal}
                          onChange={e => setCustomMarginVal(e.target.value)}
                          className="w-16 text-center bg-white border border-slate-250 focus:outline-none focus:ring-1 focus:ring-emerald-500 py-0.5 px-1.5 rounded-lg text-[10px] font-bold font-sans"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const m = parseFloat(customMarginVal);
                          if (isNaN(m) || m < 0 || m >= 100) {
                            showToast('error', 'عفواً! يرجى إدخال نسبة هامش ربح مبيع صحيحة بين 0 و 99.');
                            return;
                          }
                          if (numCost > 0) {
                            const targetPrice = numCost / (1 - m / 100);
                            setNewProdPriceUSD(targetPrice.toFixed(2));
                            setNewProdPriceWholesale((targetPrice * 0.9).toFixed(2));
                            showToast('success', `تم احتساب سعر البيع بنجاح بناءً على هامش ربح يدوي %${m}! ⚡`);
                          } else {
                            showToast('error', 'عفواً! يرجى إدخال سعر التكلفة / رأس المال أولاً ليتم الحساب بناءً عليه.');
                          }
                        }}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-[10px] cursor-pointer transition-colors"
                      >
                        تطبيق الهامش ⚡
                      </button>
                    </div>

                    <span className="text-slate-300">|</span>

                    {/* Markup Input */}
                    <div className="flex items-center gap-1.5 flex-row-reverse">
                      <span className="text-[10px] text-slate-500 font-bold">زيادة فوق التكلفة %:</span>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          placeholder="مثال: 25"
                          value={customMarkupVal}
                          onChange={e => setCustomMarkupVal(e.target.value)}
                          className="w-16 text-center bg-white border border-slate-250 focus:outline-none focus:ring-1 focus:ring-indigo-500 py-0.5 px-1.5 rounded-lg text-[10px] font-bold font-sans"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const mk = parseFloat(customMarkupVal);
                          if (isNaN(mk) || mk < 0) {
                            showToast('error', 'عفواً! يرجى إدخال نسبة زيادة فوق التكلفة صحيحة أكبر من الصفر.');
                            return;
                          }
                          if (numCost > 0) {
                            const targetPrice = numCost * (1 + mk / 100);
                            setNewProdPriceUSD(targetPrice.toFixed(2));
                            setNewProdPriceWholesale((targetPrice * 0.9).toFixed(2));
                            showToast('success', `تم احتساب سعر البيع بنجاح بزيادة يدوية %${mk} فوق التكلفة! ⚡`);
                          } else {
                            showToast('error', 'عفواً! يرجى إدخال سعر التكلفة / رأس المال أولاً ليتم الحساب بناءً عليه.');
                          }
                        }}
                        className="px-2 py-1 bg-[#1d9e75] hover:bg-[#15805e] text-white font-extrabold rounded-lg text-[10px] cursor-pointer transition-colors"
                      >
                        تطبيق الزيادة ⚡
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analysis indicators */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="bg-white p-2 border border-emerald-50 rounded-lg">
                  <span className="block text-[10px] text-slate-400 font-bold">{hasOpCost ? 'الكلفة الكاملة (مع التشغيلية)' : 'سعر التكلفة المدخل'}</span>
                  <span className="text-xs font-mono font-black text-slate-800">{numCost > 0 ? `${numCost.toFixed(2)} $` : '0.00 $'}</span>
                </div>
                <div className="bg-white p-2 border border-emerald-50 rounded-lg">
                  <span className="block text-[10px] text-slate-400 font-bold">سعر البيع المفرّد الحالي</span>
                  <span className="text-xs font-mono font-black text-[#1D9E75]">{numPrice > 0 ? `${numPrice.toFixed(2)} $` : '0.00 $'}</span>
                </div>
                <div className="bg-white p-2 border border-emerald-50 rounded-lg">
                  <span className="block text-[10px] text-slate-400 font-bold">صافي الربح المالي بالقطعة</span>
                  <span className={`text-xs font-mono font-black ${rawProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {rawProfit.toFixed(2)} $
                  </span>
                </div>
                <div className="bg-white p-2 border border-emerald-50 rounded-lg">
                  <span className="block text-[10px] text-slate-400 font-bold">النسب المحسوبة للربحية</span>
                  <div className="flex items-center justify-center gap-1.5 mt-0.5">
                    <span className={`text-[9px] font-black px-1 rounded ${currentMargin >= 5 ? 'bg-emerald-50 text-emerald-850' : 'bg-red-50 text-red-700'}`} title="حصة الربح المئوية من سعر المبيع">
                      من المبيع: {currentMargin.toFixed(1)}%
                    </span>
                    <span className="text-slate-350">|</span>
                    <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 px-1 rounded" title="نسبة الزيادة فوق رأس المال">
                      فوق التكلفة: {currentMarkup.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="w-full sm:w-64 text-right">
                <label className="block text-slate-600 mb-1 text-xs font-bold">تاريخ الإنتهاء (YYYY-MM-DD):</label>
                <input 
                  type="date" 
                  value={newProdExpiry}
                  onChange={e => setNewProdExpiry(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-center font-mono focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
              
              <div className="w-full sm:w-auto flex-1 text-right">
                <label className="block text-slate-600 mb-1 text-xs font-bold">صورة المنتج (اختياري):</label>
                <div className="flex items-center gap-2 flex-row-reverse justify-end">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setNewProdImage(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                    id="prod-image-file-input"
                  />
                  <label 
                    htmlFor="prod-image-file-input"
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-bold py-1.5 px-3 rounded-lg cursor-pointer transition select-none flex items-center gap-1.5"
                  >
                    📁 {newProdImage ? 'تغيير الصورة' : 'اختر صورة للمنتج'}
                  </label>
                  {newProdImage && (
                    <div className="relative group">
                      <img src={newProdImage} alt="Product" className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-sm" referrerPolicy="no-referrer" />
                      <button 
                        type="button" 
                        onClick={() => setNewProdImage(undefined)}
                        className="absolute -top-1.5 -left-1.5 bg-rose-600 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center text-[10px] hover:bg-rose-700 shadow font-black"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto pt-4 sm:pt-0">
                <button 
                  type="submit"
                  className="flex-1 sm:flex-initial bg-[#1D9E75] hover:bg-[#15805e] text-white font-bold px-6 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  {editingProduct ? 'تحديث الصنف ✔️' : 'إضافة لحساب المحل 💾'}
                </button>
                {editingProduct && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingProduct(null);
                      setNewProdName('');
                      setNewProdBarcode('');
                      setNewProdPriceUSD('');
                      setNewProdPriceWholesale('');
                      setNewProdMinWholesaleQty('5');
                      setNewProdSku('');
                      setNewProdQuantity('10');
                    }}
                    className="bg-slate-200 text-slate-700 hover:bg-slate-300 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                  >
                    إلغاء التعديل
                  </button>
                )}
              </div>
            </div>
            </form>
          )
        ) : (
          <div className="bg-blue-50 border border-blue-100 text-blue-800 text-xs rounded-xl p-3 mb-6 text-right">
            💡 حساب الكاشير: يمكنك معاينة الأصناف والكميات المتوفرة وتصديرها، بينما يحظر عليك تعديل أو إضافة المنتجات.
          </div>
        )}

        {/* Search and stagnation controls row */}
        <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl mb-5 text-right font-sans">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            
            {/* Search Field */}
            <div className="space-y-1">
              <label className="block text-slate-755 text-[11px] font-black">🔍 البحث في الرفوف:</label>
              <input
                type="text"
                placeholder="ابحث باسم المنتج، الباركود، الفئة المحددة، أو كود SKU..."
                value={inventorySearchQuery}
                onChange={e => setInventorySearchQuery(e.target.value)}
                className="w-full text-right bg-white border border-slate-200 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#1D9E75] font-sans"
              />
            </div>

            {/* Category Dropdown Filter */}
            <div className="space-y-1">
              <label id="category-filter-label" className="block text-slate-755 text-[11px] font-black">📂 تصفية حسب الفئة:</label>
              <select
                aria-labelledby="category-filter-label"
                value={selectedInventoryCategory}
                onChange={e => setSelectedInventoryCategory(e.target.value)}
                className="w-full text-right bg-white border border-slate-200 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#1D9E75] cursor-pointer font-sans"
              >
                <option value="">كل الفئات</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Stale/Stagnate Threshold Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between flex-row-reverse text-[11px] font-black text-slate-750">
                <span>⏳ حد فترة الركود (أيام عدم البيع):</span>
                <span className="font-mono bg-slate-200 text-slate-800 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                  {stagnantDaysThreshold} يوم
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="5"
                  max="180"
                  step="5"
                  value={stagnantDaysThreshold}
                  onChange={e => setStagnantDaysThreshold(Number(e.target.value))}
                  className="w-full accent-slate-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Toggle Switch Checkbox */}
            <div className="flex items-center justify-end h-auto md:h-9 border-t md:border-t-0 border-slate-150 pt-2 md:pt-0">
              <label className="inline-flex items-center gap-3.5 cursor-pointer flex-row-reverse select-none">
                <input
                  type="checkbox"
                  checked={showStagnantOnly}
                  onChange={e => setShowStagnantOnly(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="relative w-10 h-5.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-slate-500" />
                <span className="text-xs font-black text-slate-700">
                  📦 عرض الأصناف الراكدة فقط ({stagnantDaysThreshold}+ يوم)
                </span>
              </label>
            </div>

          </div>
        </div>

        {/* Table Customization and Control Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 bg-slate-50 border border-slate-150 p-3 rounded-2xl">
          <div className="flex items-center gap-2.5 flex-row-reverse">
            <span className="text-xs font-extrabold text-slate-700">
              {lang === 'ar' ? '⚙️ تخصيص عرض أعمدة الجدول الجاري:' : '⚙️ Customize displayed columns:'}
            </span>
            <ColumnSelector
              columns={invColumns}
              visibleCols={visibleInvCols}
              onChange={(key) => setVisibleInvCols(prev => ({ ...prev, [key]: !prev[key] }))}
              lang={lang}
              id="inventory-col-selector-dedicated"
            />
          </div>
          <div className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5 flex-row-reverse">
            <span>💡 {lang === 'ar' ? 'اسحب حواف العناوين لتكبير وتصغير الأعمدة يدويّاً حسب رغبتك' : 'Drag cell edges to resize columns dynamically'}</span>
          </div>
        </div>

        {/* Table list */}
        <div 
          className="overflow-y-auto scrollbar-thin max-h-[580px] border border-slate-200 rounded-2xl shadow-xs" 
          id="inventory-data-table"
          style={{ width: '100%', display: 'block' }}
        >
          <div style={{ width: '100%', overflowX: 'auto', display: 'block', position: 'relative' }}>
            <table 
              className="border-collapse text-right text-xs table-fixed" 
              style={{ minWidth: '1200px', width: '100%' }}
              role="grid" 
              aria-label="Inventory Table"
            >
            <colgroup>
              {visibleInvCols.name !== false && <col style={{ width: colWidths.name }} />}
              {visibleInvCols.barcode !== false && <col style={{ width: colWidths.barcode }} />}
              {visibleInvCols.category !== false && <col style={{ width: colWidths.category }} />}
              {(currentUser.role === 'admin' || currentUser.role === 'accountant') && (
                <>
                  {visibleInvCols.cost !== false && <col style={{ width: colWidths.cost }} />}
                  {visibleInvCols.profit !== false && <col style={{ width: colWidths.profit }} />}
                </>
              )}
              {visibleInvCols.price_usd !== false && <col style={{ width: colWidths.price_usd }} />}
              {visibleInvCols.price_lbp !== false && <col style={{ width: colWidths.price_lbp }} />}
              {visibleInvCols.qty_shop !== false && <col style={{ width: colWidths.qty_shop }} />}
              {visibleInvCols.qty_wh !== false && <col style={{ width: colWidths.qty_wh }} />}
              {visibleInvCols.last_sale !== false && <col style={{ width: colWidths.last_sale }} />}
              {visibleInvCols.expiry !== false && <col style={{ width: colWidths.expiry }} />}
              {visibleInvCols.actions !== false && <col style={{ width: colWidths.actions }} />}
            </colgroup>
            <thead className="sticky top-0 bg-slate-50 z-20 shadow-xs">
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                {/* 1. Name */}
                {visibleInvCols.name !== false && (
                  <th className="p-3 relative group text-right select-none whitespace-nowrap" style={{ width: colWidths.name }}>
                    <div className="flex flex-col gap-1">
                      <span className="font-extrabold">{lang === 'ar' ? 'اسم المنتج' : 'Product Name'}</span>
                      <input
                        type="text"
                        value={colFilters.name}
                        onChange={e => {
                          setColFilters(prev => ({ ...prev, name: e.target.value }));
                          setInvCurrentPage(1);
                        }}
                        onPointerDown={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                        placeholder={lang === 'ar' ? '🔍 تصفية...' : '🔍 Filter...'}
                        className="w-full py-1 px-2 text-[10px] bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none rounded-lg font-sans font-bold text-slate-700 text-right"
                      />
                    </div>
                    <div 
                      onPointerDown={e => handleResizeStart(e, 'name')} 
                      className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-300 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                    />
                  </th>
                )}

                {/* 2. Barcode */}
                {visibleInvCols.barcode !== false && (
                  <th className="p-3 relative group text-right select-none whitespace-nowrap" style={{ width: colWidths.barcode }}>
                    <div className="flex flex-col gap-1">
                      <span className="font-extrabold">{lang === 'ar' ? 'الباركود' : 'Barcode'}</span>
                      <input
                        type="text"
                        value={colFilters.barcode}
                        onChange={e => {
                          setColFilters(prev => ({ ...prev, barcode: e.target.value }));
                          setInvCurrentPage(1);
                        }}
                        onPointerDown={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                        placeholder={lang === 'ar' ? '🔍 تصفية...' : '🔍 Filter...'}
                        className="w-full py-1 px-2 text-[10px] bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none rounded-lg font-sans font-bold text-slate-700 text-right"
                      />
                    </div>
                    <div 
                      onPointerDown={e => handleResizeStart(e, 'barcode')} 
                      className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-300 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                    />
                  </th>
                )}

                {/* 3. Category */}
                {visibleInvCols.category !== false && (
                  <th className="p-3 relative group text-right select-none whitespace-nowrap" style={{ width: colWidths.category }}>
                    <div className="flex flex-col gap-1">
                      <span className="font-extrabold">{lang === 'ar' ? 'الفئة' : 'Category'}</span>
                      <input
                        type="text"
                        value={colFilters.category}
                        onChange={e => {
                          setColFilters(prev => ({ ...prev, category: e.target.value }));
                          setInvCurrentPage(1);
                        }}
                        onPointerDown={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                        placeholder={lang === 'ar' ? '🔍 تصفية...' : '🔍 Filter...'}
                        className="w-full py-1 px-2 text-[10px] bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none rounded-lg font-sans font-bold text-slate-700 text-right"
                      />
                    </div>
                    <div 
                      onPointerDown={e => handleResizeStart(e, 'category')} 
                      className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-300 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                    />
                  </th>
                )}

                {/* 4 & 5. Admin columns */}
                {(currentUser.role === 'admin' || currentUser.role === 'accountant') && (
                  <>
                    {visibleInvCols.cost !== false && (
                      <th className="p-3 relative group text-right select-none whitespace-nowrap" style={{ width: colWidths.cost }}>
                        <div className="flex flex-col gap-1">
                          <span className="font-extrabold">{lang === 'ar' ? 'التكلفة / رأس المال ($)' : 'Cost Price ($)'}</span>
                          <input
                            type="text"
                            value={colFilters.cost}
                            onChange={e => {
                              setColFilters(prev => ({ ...prev, cost: e.target.value }));
                              setInvCurrentPage(1);
                            }}
                            onPointerDown={e => e.stopPropagation()}
                            onMouseDown={e => e.stopPropagation()}
                            placeholder={lang === 'ar' ? '🔍 تصفية...' : '🔍 Filter...'}
                            className="w-full py-1 px-2 text-[10px] bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none rounded-lg font-sans font-bold text-slate-700 text-right"
                          />
                        </div>
                        <div 
                          onPointerDown={e => handleResizeStart(e, 'cost')} 
                          className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-300 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                        />
                      </th>
                    )}
                    {visibleInvCols.profit !== false && (
                      <th className="p-3 relative group text-center select-none whitespace-nowrap" style={{ width: colWidths.profit }}>
                        <div className="flex flex-col gap-1">
                          <span className="font-extrabold">{lang === 'ar' ? 'هامش الربح (%)' : 'Margin (%)'}</span>
                          <input
                            type="text"
                            value={colFilters.profit}
                            onChange={e => {
                              setColFilters(prev => ({ ...prev, profit: e.target.value }));
                              setInvCurrentPage(1);
                            }}
                            onPointerDown={e => e.stopPropagation()}
                            onMouseDown={e => e.stopPropagation()}
                            placeholder={lang === 'ar' ? '🔍 ...' : '🔍 ...'}
                            className="w-full py-1 px-2 text-[10px] bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none rounded-lg font-sans font-bold text-slate-700 text-center"
                          />
                        </div>
                        <div 
                          onPointerDown={e => handleResizeStart(e, 'profit')} 
                          className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-300 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                        />
                      </th>
                    )}
                  </>
                )}

                {/* 6. Sale Price USD */}
                {visibleInvCols.price_usd !== false && (
                  <th className="p-3 relative group text-right select-none whitespace-nowrap" style={{ width: colWidths.price_usd }}>
                    <div className="flex flex-col gap-1">
                      <span className="font-extrabold">{lang === 'ar' ? 'سعر البيع ($)' : 'Price ($)'}</span>
                      <input
                        type="text"
                        value={colFilters.price_usd}
                        onChange={e => {
                          setColFilters(prev => ({ ...prev, price_usd: e.target.value }));
                          setInvCurrentPage(1);
                        }}
                        onPointerDown={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                        placeholder={lang === 'ar' ? '🔍 تصفية...' : '🔍 Filter...'}
                        className="w-full py-1 px-2 text-[10px] bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none rounded-lg font-sans font-bold text-slate-700 text-right"
                      />
                    </div>
                    <div 
                      onPointerDown={e => handleResizeStart(e, 'price_usd')} 
                      className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-300 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                    />
                  </th>
                )}

                {/* 7. LBP Price */}
                {visibleInvCols.price_lbp !== false && (
                  <th className="p-3 relative group text-right select-none whitespace-nowrap" style={{ width: colWidths.price_lbp }}>
                    <div className="flex flex-col gap-1">
                      <span className="font-extrabold">{lang === 'ar' ? 'السعر بالليرة' : 'Price LBP'}</span>
                      <input
                        type="text"
                        value={colFilters.price_lbp}
                        onChange={e => {
                          setColFilters(prev => ({ ...prev, price_lbp: e.target.value }));
                          setInvCurrentPage(1);
                        }}
                        onPointerDown={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                        placeholder={lang === 'ar' ? '🔍 تصفية...' : '🔍 Filter...'}
                        className="w-full py-1 px-2 text-[10px] bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none rounded-lg font-sans font-bold text-slate-700 text-right"
                      />
                    </div>
                    <div 
                      onPointerDown={e => handleResizeStart(e, 'price_lbp')} 
                      className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-300 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                    />
                  </th>
                )}

                {/* 8. Qty Shop */}
                {visibleInvCols.qty_shop !== false && (
                  <th className="p-3 relative group text-center select-none whitespace-nowrap" style={{ width: colWidths.qty_shop }}>
                    <div className="flex flex-col gap-1">
                      <span className="font-extrabold">{lang === 'ar' ? 'الكمية بالمحل 🏪' : 'Qty Shop 🏪'}</span>
                      <input
                        type="text"
                        value={colFilters.qty_shop}
                        onChange={e => {
                          setColFilters(prev => ({ ...prev, qty_shop: e.target.value }));
                          setInvCurrentPage(1);
                        }}
                        onPointerDown={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                        placeholder={lang === 'ar' ? '🔍 ...' : '🔍 ...'}
                        className="w-full py-1 px-2 text-[10px] bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none rounded-lg font-sans font-bold text-slate-700 text-center"
                      />
                    </div>
                    <div 
                      onPointerDown={e => handleResizeStart(e, 'qty_shop')} 
                      className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-300 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                    />
                  </th>
                )}

                {/* 9. Qty Warehouse */}
                {visibleInvCols.qty_wh !== false && (
                  <th className="p-3 relative group text-center select-none whitespace-nowrap" style={{ width: colWidths.qty_wh }}>
                    <div className="flex flex-col gap-1">
                      <span className="font-extrabold">{lang === 'ar' ? 'الكمية بالمستودع 📦' : 'Qty Wh 📦'}</span>
                      <input
                        type="text"
                        value={colFilters.qty_wh}
                        onChange={e => {
                          setColFilters(prev => ({ ...prev, qty_wh: e.target.value }));
                          setInvCurrentPage(1);
                        }}
                        onPointerDown={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                        placeholder={lang === 'ar' ? '🔍 ...' : '🔍 ...'}
                        className="w-full py-1 px-2 text-[10px] bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none rounded-lg font-sans font-bold text-slate-700 text-center"
                      />
                    </div>
                    <div 
                      onPointerDown={e => handleResizeStart(e, 'qty_wh')} 
                      className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-300 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                    />
                  </th>
                )}

                {/* 10. Last Sold / Stagnant */}
                {visibleInvCols.last_sale !== false && (
                  <th className="p-3 relative group text-center select-none whitespace-nowrap" style={{ width: colWidths.last_sale }}>
                    <div className="flex flex-col gap-1">
                      <span className="font-extrabold">{lang === 'ar' ? 'آخر بيع / ركود' : 'Last Sale'}</span>
                      <input
                        type="text"
                        value={colFilters.last_sale}
                        onChange={e => {
                          setColFilters(prev => ({ ...prev, last_sale: e.target.value }));
                          setInvCurrentPage(1);
                        }}
                        onPointerDown={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                        placeholder={lang === 'ar' ? '🔍 ...' : '🔍 ...'}
                        className="w-full py-1 px-2 text-[10px] bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none rounded-lg font-sans font-bold text-slate-700 text-center"
                      />
                    </div>
                    <div 
                      onPointerDown={e => handleResizeStart(e, 'last_sale')} 
                      className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-300 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                    />
                  </th>
                )}

                {/* 11. Expiry Date */}
                {visibleInvCols.expiry !== false && (
                  <th className="p-3 relative group text-right select-none whitespace-nowrap" style={{ width: colWidths.expiry }}>
                    <div className="flex flex-col gap-1">
                      <span className="font-extrabold">{lang === 'ar' ? 'الصلاحية' : 'Expiry'}</span>
                      <input
                        type="text"
                        value={colFilters.expiry}
                        onChange={e => {
                          setColFilters(prev => ({ ...prev, expiry: e.target.value }));
                          setInvCurrentPage(1);
                        }}
                        onPointerDown={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                        placeholder={lang === 'ar' ? '🔍 تصفية...' : '🔍 Filter...'}
                        className="w-full py-1 px-2 text-[10px] bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none rounded-lg font-sans font-bold text-slate-700 text-right"
                      />
                    </div>
                    <div 
                      onPointerDown={e => handleResizeStart(e, 'expiry')} 
                      className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-300 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                    />
                  </th>
                )}

                {/* 12. Actions */}
                {visibleInvCols.actions !== false && (
                  <th className="p-3 relative group text-center select-none whitespace-nowrap" style={{ width: colWidths.actions }}>
                    <div className="flex flex-col gap-1">
                      <span className="font-extrabold">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</span>
                      <button
                        onClick={() => {
                          setColFilters({
                            name: '',
                            barcode: '',
                            category: '',
                            cost: '',
                            profit: '',
                            price_usd: '',
                            price_lbp: '',
                            qty_shop: '',
                            qty_wh: '',
                            last_sale: '',
                            expiry: '',
                          });
                          setInventorySearchQuery('');
                          setInvCurrentPage(1);
                        }}
                        title={lang === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
                        className="w-full py-1 px-1 text-[10px] bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-200 rounded-lg text-slate-600 font-sans font-bold text-center leading-none inline-flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        🧹 {lang === 'ar' ? 'مسح' : 'Clear'}
                      </button>
                    </div>
                    <div 
                      onPointerDown={e => handleResizeStart(e, 'actions')} 
                      className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-300 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                    />
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {(() => {
                const filteredInventoryProducts = processedProducts.filter(p => {
                  const q = inventorySearchQuery.toLowerCase().trim();
                  const categoryName = categories.find(c => c.id === p.category)?.name || p.category;
                  const matchesQuery = !q ? true : (
                    p.name.toLowerCase().includes(q) ||
                    p.barcode.toLowerCase().includes(q) ||
                    (p.barcodes && p.barcodes.some(b => b.toLowerCase().includes(q))) ||
                    categoryName.toLowerCase().includes(q) ||
                    (p.sku && p.sku.toLowerCase().includes(q))
                  );
                  
                  const matchesCategory = !selectedInventoryCategory ? true : p.category === selectedInventoryCategory;
                  let isMatched = matchesQuery && matchesCategory;
                  
                  if (showStagnantOnly) {
                    isMatched = isMatched && p.isStagnant;
                  }

                  if (!isMatched) return false;

                  // Column-specific header filters (case-insensitive)
                  const computedPriceLBP = p.priceUSD * settings.exchangeRate;
                  const finalCost = withOperatingCost(p, p.costPriceUSD || (p.priceWholesale ? p.priceWholesale * 0.95 : p.priceUSD * 0.75));
                  const profitAmount = p.priceUSD - finalCost;
                  const marginPercent = p.priceUSD > 0 ? (profitAmount / p.priceUSD) * 100 : 0;

                  if (colFilters.name && !p.name.toLowerCase().includes(colFilters.name.toLowerCase().trim())) {
                    return false;
                  }
                  if (colFilters.barcode && !p.barcode.toLowerCase().includes(colFilters.barcode.toLowerCase().trim()) && !(p.barcodes && p.barcodes.some(b => b.toLowerCase().includes(colFilters.barcode.toLowerCase().trim())))) {
                    return false;
                  }
                  if (colFilters.category && !categoryName.toLowerCase().includes(colFilters.category.toLowerCase().trim())) {
                    return false;
                  }
                  if (currentUser.role === 'admin' && colFilters.cost && !finalCost.toFixed(2).includes(colFilters.cost.trim())) {
                    return false;
                  }
                  if (currentUser.role === 'admin' && colFilters.profit && !marginPercent.toFixed(1).includes(colFilters.profit.trim())) {
                    return false;
                  }
                  if (colFilters.price_usd && !p.priceUSD.toFixed(2).includes(colFilters.price_usd.trim())) {
                    return false;
                  }
                  const computedLbpVal = Math.ceil(computedPriceLBP).toString();
                  if (colFilters.price_lbp && !computedLbpVal.includes(colFilters.price_lbp.trim())) {
                    return false;
                  }
                  const quantityStr = p.quantity.toString();
                  if (colFilters.qty_shop && !quantityStr.includes(colFilters.qty_shop.trim())) {
                    return false;
                  }
                  const warehouseQtyStr = (p.warehouseQuantity || 0).toString();
                  if (colFilters.qty_wh && !warehouseQtyStr.includes(colFilters.qty_wh.trim())) {
                    return false;
                  }
                  const daysSoldVal = p.daysSinceLastSale !== null ? `منذ ${p.daysSinceLastSale} يوم` : 'لم يبع بعد';
                  const lastSoldDateVal = p.lastSoldDate || '';
                  if (colFilters.last_sale && !daysSoldVal.toLowerCase().includes(colFilters.last_sale.toLowerCase().trim()) && !lastSoldDateVal.toLowerCase().includes(colFilters.last_sale.toLowerCase().trim())) {
                    return false;
                  }
                  const expiryDateVal = p.expiryDate || '';
                  if (colFilters.expiry && !expiryDateVal.toLowerCase().includes(colFilters.expiry.toLowerCase().trim())) {
                    return false;
                  }

                  return true;
                });

                if (filteredInventoryProducts.length === 0) {
                  const activeColsCount = Object.keys(visibleInvCols).filter(k => {
                    if (visibleInvCols[k] === false) return false;
                    if ((k === 'cost' || k === 'profit') && currentUser.role !== 'admin') return false;
                    return true;
                  }).length;
                  return (
                    <tr>
                      <td colSpan={activeColsCount} className="p-8 text-center text-slate-400 font-sans">
                        لا توجد أصناف تطابق عبارة البحث الحالية في الرفوف.
                      </td>
                    </tr>
                  );
                }

                // Determine page bounds
                const totalRows = filteredInventoryProducts.length;
                const maxPages = Math.ceil(totalRows / invItemsPerPage) || 1;
                const activePage = Math.min(invCurrentPage, maxPages);
                const startIndex = (activePage - 1) * invItemsPerPage;
                const paginatedProducts = filteredInventoryProducts.slice(startIndex, startIndex + invItemsPerPage);

                return paginatedProducts.map(p => {
                  const computedPriceLBP = p.priceUSD * settings.exchangeRate;
                  const finalCost = withOperatingCost(p, p.costPriceUSD || (p.priceWholesale ? p.priceWholesale * 0.95 : p.priceUSD * 0.75));
                  const profitAmount = p.priceUSD - finalCost;
                  const marginPercent = p.priceUSD > 0 ? (profitAmount / p.priceUSD) * 100 : 0;
                  const isLowMargin = currentUser.role === 'admin' && marginPercent < 5;

                  // Class settings based on product alarms
                  let rowClass = 'hover:bg-slate-50 transition-colors';
                  if (p.isExpired) {
                    rowClass = 'bg-red-50/50 text-red-900 border-r-4 border-red-500 hover:bg-red-100/50';
                  } else if (p.isStagnant) {
                    rowClass = 'bg-slate-100 text-slate-500 border-r-4 border-slate-400 opacity-80 hover:opacity-100 hover:bg-slate-150';
                  } else if (isLowMargin) {
                    rowClass = 'bg-red-50 text-red-950 border-r-4 border-red-500 hover:bg-red-100/30';
                  } else if (p.isNearExpiry || p.quantity <= settings.lowStockThreshold) {
                    rowClass = 'bg-amber-50/50 text-amber-900 hover:bg-amber-100/30';
                  }
                  
                  return (
                    <tr 
                      key={p.id}
                      className={rowClass}
                    >
                      {/* 1. Product Name */}
                      {visibleInvCols.name !== false && (
                        <td className="p-3 font-extrabold text-slate-800 text-right overflow-hidden text-ellipsis whitespace-nowrap" title={p.name}>
                          <div className="flex items-center gap-2 flex-row-reverse justify-start">
                            {p.image && (
                              <img 
                                src={p.image} 
                                alt={p.name} 
                                className="w-7 h-7 object-cover rounded-md border border-slate-200 shrink-0" 
                                referrerPolicy="no-referrer" 
                              />
                            )}
                            <span className="truncate">{p.name}</span>
                          </div>
                        </td>
                      )}

                      {/* 2. Barcode */}
                      {visibleInvCols.barcode !== false && (
                        <td className="p-3 font-mono font-semibold text-slate-600 text-right overflow-hidden text-ellipsis whitespace-nowrap" title={p.barcode}>
                          {p.barcode}
                        </td>
                      )}

                      {/* 3. Category */}
                      {visibleInvCols.category !== false && (
                        <td className="p-3 text-slate-500 font-bold overflow-hidden text-ellipsis whitespace-nowrap" title={categories.find(c => c.id === p.category)?.name || p.category}>
                          {categories.find(c => c.id === p.category)?.name || p.category}
                        </td>
                      )}

                      {/* 4. Admin Cost */}
                      {(currentUser.role === 'admin' || currentUser.role === 'accountant') && visibleInvCols.cost !== false && (
                        <td className="p-3 font-mono font-bold text-amber-700 bg-amber-50/30 overflow-hidden text-ellipsis whitespace-nowrap">
                          {finalCost.toFixed(2)} $
                        </td>
                      )}

                      {/* 5. Admin Profit Margin */}
                      {(currentUser.role === 'admin' || currentUser.role === 'accountant') && visibleInvCols.profit !== false && (
                        <td className="p-3 text-center font-mono font-extrabold overflow-hidden text-ellipsis whitespace-nowrap">
                          {isLowMargin ? (
                            <span className="text-red-700 bg-red-100/80 px-2 py-0.5 rounded text-[10px] font-black inline-flex items-center gap-0.5">
                              🚨 {marginPercent.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-black">
                              {marginPercent.toFixed(1)}%
                            </span>
                          )}
                        </td>
                      )}

                      {/* 6. Sale Price USD */}
                      {visibleInvCols.price_usd !== false && (
                        <td className="p-3 font-mono font-extrabold text-[#1D9E75] overflow-hidden text-ellipsis whitespace-nowrap">
                          {p.priceUSD.toFixed(2)} $
                        </td>
                      )}

                      {/* 7. LBP Price */}
                      {visibleInvCols.price_lbp !== false && (
                        <td className="p-3 font-mono font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                          {Math.ceil(computedPriceLBP).toLocaleString()} ل.ل
                        </td>
                      )}

                      {/* 8. Qty in Shop */}
                      {visibleInvCols.qty_shop !== false && (
                        <td className="p-3 text-center font-mono font-extrabold overflow-hidden text-ellipsis whitespace-nowrap">
                          {p.quantity <= settings.lowStockThreshold ? (
                            <span className="text-red-700 bg-red-100/50 px-2 py-0.5 rounded text-[11px] font-bold">
                              {p.quantity} (🚨 منخفض!)
                            </span>
                          ) : (
                            p.quantity
                          )}{' '}
                          قطعة
                        </td>
                      )}

                      {/* 9. Qty in Warehouse */}
                      {visibleInvCols.qty_wh !== false && (
                        <td className="p-3 text-center font-mono font-black text-indigo-700 bg-indigo-50/30 overflow-hidden text-ellipsis whitespace-nowrap">
                          {p.warehouseQuantity || 0} قطعة
                        </td>
                      )}

                      {/* 10. Last Sold Speed */}
                      {visibleInvCols.last_sale !== false && (
                        <td className="p-3 text-center font-sans overflow-hidden text-ellipsis whitespace-nowrap">
                          {p.daysSinceLastSale !== null ? (
                            <div className="flex flex-col items-center justify-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                p.isStagnant ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                منذ {p.daysSinceLastSale} يوم
                              </span>
                              <span className="text-[9px] text-slate-400 mt-0.5 font-mono">{p.lastSoldDate}</span>
                            </div>
                          ) : (
                            <span className="bg-slate-200 text-slate-500 px-2 py-0.5 rounded text-[10px] font-black">
                              لم يُبَع بعد ⚠️
                            </span>
                          )}
                        </td>
                      )}

                      {/* 11. Expiry Date */}
                      {visibleInvCols.expiry !== false && (
                        <td className="p-3 font-mono font-bold text-right overflow-hidden text-ellipsis whitespace-nowrap">
                          {p.isExpired ? (
                            <span className="text-red-600 bg-red-100 px-2 py-0.5 rounded text-[10px] font-black">
                              منتهي صلاحية ❌ ({p.expiryDate})
                            </span>
                          ) : p.isNearExpiry ? (
                            <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[10px] font-black">
                              قريب الإنتهاء ⏳ ({p.expiryDate})
                            </span>
                          ) : (
                            p.expiryDate
                          )}
                        </td>
                      )}

                      {/* 12. Actions */}
                      {visibleInvCols.actions !== false && (
                        <td className="p-3 space-x-1 space-x-reverse flex items-center justify-center overflow-visible">
                          {currentUser.role === 'admin' && (
                            <button 
                              onClick={() => handleEditProductButton(p)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-[#1D9E75] p-1.5 rounded transition inline-flex items-center justify-center cursor-pointer"
                              title="تعديل"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              onPrintBarcodeLabel(p);
                            }}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-600 p-1.5 rounded transition inline-flex items-center justify-center cursor-pointer"
                            title="انشاء وطباعة ملصق الباركود (Label)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {currentUser.role === 'admin' && (
                            <button 
                              onClick={() => onDeleteProduct(p.id, p.name)}
                              className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded transition inline-flex items-center justify-center cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
          </div>
        </div>

        {/* Pagination Controls */}
        {(() => {
          const filteredCountArray = processedProducts.filter(p => {
            const q = inventorySearchQuery.toLowerCase().trim();
            const categoryName = categories.find(c => c.id === p.category)?.name || p.category;
            const matchesQuery = !q ? true : (
              p.name.toLowerCase().includes(q) ||
              p.barcode.toLowerCase().includes(q) ||
              (p.barcodes && p.barcodes.some(b => b.toLowerCase().includes(q))) ||
              categoryName.toLowerCase().includes(q) ||
              (p.sku && p.sku.toLowerCase().includes(q))
            );
            
            const matchesCategory = !selectedInventoryCategory ? true : p.category === selectedInventoryCategory;
            let isMatched = matchesQuery && matchesCategory;
            
            if (showStagnantOnly) {
              isMatched = isMatched && p.isStagnant;
            }

            if (!isMatched) return false;

            // Column-specific header filters (case-insensitive)
            const computedPriceLBP = p.priceUSD * settings.exchangeRate;
            const finalCost = withOperatingCost(p, p.costPriceUSD || (p.priceWholesale ? p.priceWholesale * 0.95 : p.priceUSD * 0.75));
            const profitAmount = p.priceUSD - finalCost;
            const marginPercent = p.priceUSD > 0 ? (profitAmount / p.priceUSD) * 100 : 0;

            if (colFilters.name && !p.name.toLowerCase().includes(colFilters.name.toLowerCase().trim())) {
              return false;
            }
            if (colFilters.barcode && !p.barcode.toLowerCase().includes(colFilters.barcode.toLowerCase().trim()) && !(p.barcodes && p.barcodes.some(b => b.toLowerCase().includes(colFilters.barcode.toLowerCase().trim())))) {
              return false;
            }
            if (colFilters.category && !categoryName.toLowerCase().includes(colFilters.category.toLowerCase().trim())) {
              return false;
            }
            if (currentUser.role === 'admin' && colFilters.cost && !finalCost.toFixed(2).includes(colFilters.cost.trim())) {
              return false;
            }
            if (currentUser.role === 'admin' && colFilters.profit && !marginPercent.toFixed(1).includes(colFilters.profit.trim())) {
              return false;
            }
            if (colFilters.price_usd && !p.priceUSD.toFixed(2).includes(colFilters.price_usd.trim())) {
              return false;
            }
            const computedLbpVal = Math.ceil(computedPriceLBP).toString();
            if (colFilters.price_lbp && !computedLbpVal.includes(colFilters.price_lbp.trim())) {
              return false;
            }
            const quantityStr = p.quantity.toString();
            if (colFilters.qty_shop && !quantityStr.includes(colFilters.qty_shop.trim())) {
              return false;
            }
            const warehouseQtyStr = (p.warehouseQuantity || 0).toString();
            if (colFilters.qty_wh && !warehouseQtyStr.includes(colFilters.qty_wh.trim())) {
              return false;
            }
            const daysSoldVal = p.daysSinceLastSale !== null ? `منذ ${p.daysSinceLastSale} يوم` : 'لم يبع بعد';
            const lastSoldDateVal = p.lastSoldDate || '';
            if (colFilters.last_sale && !daysSoldVal.toLowerCase().includes(colFilters.last_sale.toLowerCase().trim()) && !lastSoldDateVal.toLowerCase().includes(colFilters.last_sale.toLowerCase().trim())) {
              return false;
            }
            const expiryDateVal = p.expiryDate || '';
            if (colFilters.expiry && !expiryDateVal.toLowerCase().includes(colFilters.expiry.toLowerCase().trim())) {
              return false;
            }

            return true;
          });

          const totalRows = filteredCountArray.length;
          if (totalRows <= 0) return null;

          const maxPages = Math.ceil(totalRows / invItemsPerPage) || 1;
          const activePage = Math.min(invCurrentPage, maxPages);
          const startIndex = (activePage - 1) * invItemsPerPage;
          const endIndex = Math.min(startIndex + invItemsPerPage, totalRows);

          // Page generation logic
          const range = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => start + i);
          let pages: (number | string)[] = [];
          if (maxPages <= 7) {
            pages = range(1, maxPages);
          } else {
            if (activePage <= 4) {
              pages = [...range(1, 5), '...', maxPages];
            } else if (activePage >= maxPages - 3) {
              pages = [1, '...', ...range(maxPages - 4, maxPages)];
            } else {
              pages = [1, '...', activePage - 1, activePage, activePage + 1, '...', maxPages];
            }
          }

          return (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-5 pt-4 border-t border-slate-100 font-sans">
              {/* Left: pagination page buttons */}
              <div className="flex items-center gap-1 flex-row-reverse">
                <button
                  type="button"
                  disabled={activePage === 1}
                  onClick={() => setInvCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white transition cursor-pointer"
                >
                  {lang === 'ar' ? 'السابق ⬅️' : '⬅️ Prev'}
                </button>
                
                {pages.map((p, idx) => {
                  if (p === '...') {
                    return <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 font-bold text-xs">...</span>;
                  }
                  return (
                    <button
                      key={`page-${p}`}
                      type="button"
                      onClick={() => setInvCurrentPage(p as number)}
                      className={`px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                        activePage === p
                          ? 'bg-[#1D9E75] text-white shadow-xs'
                          : 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={activePage === maxPages}
                  onClick={() => setInvCurrentPage(prev => Math.min(prev + 1, maxPages))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white transition cursor-pointer"
                >
                  {lang === 'ar' ? '➡️ التالي' : 'Next ➡️'}
                </button>
              </div>

              {/* Right: Select items per page and show count */}
              <div className="flex items-center gap-3 text-xs font-black text-slate-500 flex-row-reverse text-right">
                <span>
                  {lang === 'ar'
                    ? `عرض ${startIndex + 1} - ${endIndex} من أصل ${totalRows} صنف`
                    : `Showing ${startIndex + 1} - ${endIndex} of ${totalRows} items`}
                </span>
                
                <div className="flex items-center gap-1.5">
                  <select
                    value={invItemsPerPage}
                    onChange={e => {
                      setInvItemsPerPage(Number(e.target.value));
                      setInvCurrentPage(1);
                    }}
                    className="bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs font-black focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>{lang === 'ar' ? 'لكل صفحة:' : 'per page:'}</span>
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
