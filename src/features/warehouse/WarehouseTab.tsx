import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Check, 
  Search, 
  FileText, 
  Truck, 
  Layers, 
  DollarSign, 
  Calendar, 
  ShoppingBag, 
  ArrowLeftRight, 
  ArrowUpRight,
  Clock, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle,
  X,
  Database,
  Archive,
  ArrowRightLeft
} from 'lucide-react';
import { Product, WarehouseTransfer, Category } from '../../types';

interface WarehouseTabProps {
  products: Product[];
  setProducts: (prods: Product[]) => void;
  categories: Category[];
  lang: 'ar' | 'en';
  showToast: (type: 'success' | 'error' | 'warning', message: string) => void;
  sysDate: string;
}

export function WarehouseTab({
  products,
  setProducts,
  categories,
  lang,
  showToast,
  sysDate
}: WarehouseTabProps) {
  const isAr = lang === 'ar';

  // Resizable column states
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    name: 240,
    barcode: 120,
    category: 120,
    storeQty: 140,
    shopQty: 140,
    priceSELL: 120,
    transfer: 120,
  });

  const startResize = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = colWidths[colKey];
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const isRtl = document.dir === 'rtl';
      const adjustedDelta = isRtl ? -deltaX : deltaX;
      setColWidths(prev => ({
        ...prev,
        [colKey]: Math.max(50, startWidth + adjustedDelta)
      }));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);

  // State
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'pull' | 'history'>('stock');
  const [transfers, setTransfers] = useState<WarehouseTransfer[]>([]);
  
  // Stock listings states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Pull Stock form states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [pullQty, setPullQty] = useState<string>('1');
  const [pullNote, setPullNote] = useState<string>('');
  
  // Auto-complete dropdown during search
  const [prodSearchQuery, setProdSearchQuery] = useState<string>('');
  const [showProdDropdown, setShowProdDropdown] = useState<boolean>(false);

  // Load transfers from localStorage
  useEffect(() => {
    const storedTransfers = localStorage.getItem('pos_warehouse_transfers');
    if (storedTransfers) {
      try {
        setTransfers(JSON.parse(storedTransfers));
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  // Reset pagination when search query or category filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  // Save transfers helper
  const saveTransfers = (updatedList: WarehouseTransfer[]) => {
    setTransfers(updatedList);
    localStorage.setItem('pos_warehouse_transfers', JSON.stringify(updatedList));
  };

  // Perform transfer action
  const handlePerformTransfer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedProduct) {
      showToast('error', isAr ? 'الرجاء اختيار صنف من القائمة أولاً!' : 'Please select a product first!');
      return;
    }

    const qtyNum = parseInt(pullQty) || 0;
    if (qtyNum <= 0) {
      showToast('error', isAr ? 'الرجاء إدخال كمية صحيحة أكبر من الصفر لنقلها!' : 'Please enter a valid transfer quantity!');
      return;
    }

    const wQty = selectedProduct.warehouseQuantity || 0;
    if (qtyNum > wQty) {
      showToast('error', isAr 
        ? `عفواً! الكمية المطلوبة تزيد عن المتوفر في المستودع حالياً (${wQty} قطعة متبقية).`
        : `Insufficient stock in warehouse! Only ${wQty} pieces available.`
      );
      return;
    }

    // 1. Create Transfer Record
    const n = new Date();
    const timeStr = n.toTimeString().split(' ')[0].substring(0, 5);
    const newTransfer: WarehouseTransfer = {
      id: `transfer-${Date.now()}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      barcode: selectedProduct.barcode,
      quantity: qtyNum,
      date: sysDate,
      time: timeStr,
      note: pullNote.trim() || undefined
    };

    // 2. Update Master Products
    const updatedProducts = products.map(p => {
      if (p.id === selectedProduct.id) {
        const currentWarehouse = p.warehouseQuantity || 0;
        return {
          ...p,
          warehouseQuantity: Math.max(0, currentWarehouse - qtyNum),
          quantity: p.quantity + qtyNum // shift quantity to retail shop
        };
      }
      return p;
    });

    setProducts(updatedProducts);
    localStorage.setItem('pos_products', JSON.stringify(updatedProducts));

    // Save transfer log
    const updatedTransfers = [newTransfer, ...transfers];
    saveTransfers(updatedTransfers);

    // Reset Form
    setSelectedProduct(null);
    setProdSearchQuery('');
    setPullQty('1');
    setPullNote('');
    
    showToast('success', isAr 
      ? `تم تحويل [${qtyNum}] قطعة من [${newTransfer.productName}] إلى المحل بنجاح 🚚!`
      : `Successfully transferred [${qtyNum}] pcs of [${newTransfer.productName}] to the shop shelves!`
    );

    setActiveSubTab('stock'); // Return to directory view
  };

  // Quick pull handler directly from the stock table
  const handleQuickPullSelect = (prod: Product) => {
    setSelectedProduct(prod);
    setProdSearchQuery(prod.name);
    setPullQty('1');
    setPullNote(isAr ? 'سحب سريع مفرّد من المستودع' : 'Quick single item pull');
    setActiveSubTab('pull');
  };

  // Warehouse stats
  const totalSkuInWarehouse = products.filter(p => (p.warehouseQuantity || 0) > 0).length;
  const totalPhysicalItemsInWarehouse = products.reduce((sum, p) => sum + (p.warehouseQuantity || 0), 0);
  const totalWarehouseValueUSD = products.reduce((sum, p) => {
    const cost = p.costPriceUSD || (p.priceUSD * 0.7);
    return sum + ((p.warehouseQuantity || 0) * cost);
  }, 0);

  // Filtered store listing
  const filteredProducts = products.filter(p => {
    const matchesSearch = searchQuery.trim() === '' || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.barcode.includes(searchQuery.trim()) || 
      (p.barcodes && p.barcodes.some(b => b.includes(searchQuery.trim())));
    
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6" id="tab-warehouse-manager">
      
      {/* 1. Header with custom icon and context branding */}
      <div className="bg-gradient-to-l from-indigo-700 to-[#4F46E5] text-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-right">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2.5 justify-end">
            <span className="bg-white/20 p-2 rounded-xl">
              <Archive className="w-6 h-6 text-yellow-300 animate-pulse" />
            </span>
            {isAr ? 'إدارة المستودع والتحويلات المخزنية' : 'Warehouse Inventory & Stock Transfer'}
          </h2>
          <p className="text-xs text-indigo-100 font-sans mt-2 max-w-xl">
            {isAr 
              ? 'صندوق الفصل المتطور بين المحل ومستودع السوبرماركت الاحتياطي. يمكنك تنظيم شراء البضائع مباشرة للمستودع، ومطالعة أرصدتها، وسحب وتحويل البضائع دفعة واحدة لرفوف العرض والصرف في السوبرماركت.'
              : 'Enterprise-grade separation of main wholesale storeroom and retail floor. Organize direct warehouse purchases, audit stockpiles, and transfer packages instantly to shelves.'}
          </p>
        </div>
        
        {/* Toggle subtabs */}
        <div className="bg-white/10 p-1.5 rounded-xl border border-white/15 flex items-center gap-1">
          <button 
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1 ${activeSubTab === 'history' ? 'bg-white text-indigo-900' : 'text-white hover:bg-white/10'}`}
          >
            {isAr ? 'سجل التحويلات 📑' : 'Transfers Log 📑'}
          </button>
          <button 
            onClick={() => setActiveSubTab('pull')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1 ${activeSubTab === 'pull' ? 'bg-white text-indigo-900' : 'text-white hover:bg-white/10'}`}
          >
            {isAr ? 'سحب بضاعة للمحل 🚚' : 'Pull to Shelf 🚚'}
          </button>
          <button 
            onClick={() => setActiveSubTab('stock')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1 ${activeSubTab === 'stock' ? 'bg-white text-indigo-900' : 'text-white hover:bg-white/10'}`}
          >
            {isAr ? 'جرود وبضائع المخزن 📦' : 'Warehouse Stock 📦'}
          </button>
        </div>
      </div>

      {/* 2. STATS HEADERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-right flex items-center justify-between shadow-sm">
          <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'أصناف مختلفة بالمستودع (SKUs)' : 'Warehouse Unique SKUs'}</span>
            <span className="text-xl font-black text-slate-800 font-mono">{totalSkuInWarehouse} {isAr ? 'أصناف' : 'items'}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-right flex items-center justify-between shadow-sm">
          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'إجمالي القطع في المستودع' : 'Total Storeroom Units'}</span>
            <span className="text-xl font-black text-emerald-700 font-mono">{totalPhysicalItemsInWarehouse.toLocaleString()} {isAr ? 'قطعة' : 'units'}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-right flex items-center justify-between shadow-sm">
          <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'القيمة التقريبية بأسعار التكلفة ($)' : 'Estimated Wholesale Value'}</span>
            <span className="text-xl font-black text-amber-700 font-mono">{totalWarehouseValueUSD.toFixed(2)} $</span>
          </div>
        </div>
      </div>

      {/* SUBTAB: STOCK DIRECTORY */}
      {activeSubTab === 'stock' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b pb-4 text-right">
            <div>
              <h3 className="font-extrabold text-[#111827] text-sm">{isAr ? 'دليل وجردة البضائع المودعة بالمستودع' : 'Warehouse Stock Records'}</h3>
              <p className="text-slate-400 text-[11px] mt-0.5">{isAr ? 'مقارنة الكميات المتوفرة في المستودعات بالبضائع المعدة للبيع المباشر على الأرفف.' : 'Visual audits comparing storeroom packaging against shelf units available for sale.'}</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 font-sans">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 text-right shrink-0"
              >
                <option value="all">{isAr ? 'كل الفئات والتصنيفات' : 'All Categories'}</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={isAr ? 'ابحث باسم البضاعة أو بالباركد...' : 'Search by product or code...'}
                  className="bg-slate-50 border border-slate-200 rounded-xl py-2 pl-3 pr-9 text-xs text-right font-sans w-full"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right table-fixed min-w-[750px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold text-xs border-b border-slate-200">
                  {/* Column 1: اسم الصنف (Enters first, so appears on right in RTL) */}
                  <th className="p-3 relative group select-none" style={{ width: colWidths.name }}>
                    <span>{isAr ? 'اسم الصنف' : 'Product name'}</span>
                    <div 
                      onMouseDown={(e) => startResize('name', e)}
                      className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize group-hover:bg-indigo-300 bg-transparent transition-all z-20"
                      title={isAr ? 'اسحب لتعديل عرض العمود' : 'Drag to resize'}
                    />
                  </th>

                  {/* Column 2: الباركود */}
                  <th className="p-3 text-center font-mono w-40 relative group select-none" style={{ width: colWidths.barcode }}>
                    <span>{isAr ? 'الباركود' : 'Barcode'}</span>
                    <div 
                      onMouseDown={(e) => startResize('barcode', e)}
                      className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize group-hover:bg-indigo-300 bg-transparent transition-all z-20"
                      title={isAr ? 'اسحب لتعديل عرض العمود' : 'Drag to resize'}
                    />
                  </th>

                  {/* Column 3: الفئة */}
                  <th className="p-3 relative group select-none" style={{ width: colWidths.category }}>
                    <span>{isAr ? 'الفئة' : 'Category'}</span>
                    <div 
                      onMouseDown={(e) => startResize('category', e)}
                      className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize group-hover:bg-indigo-300 bg-transparent transition-all z-20"
                      title={isAr ? 'اسحب لتعديل عرض العمود' : 'Drag to resize'}
                    />
                  </th>

                  {/* Column 4: المخزون بالمستودع */}
                  <th className="p-3 text-center relative group select-none" style={{ width: colWidths.storeQty }}>
                    <span>{isAr ? 'المخزون بالمستودع 📦' : 'In Storeroom 📦'}</span>
                    <div 
                      onMouseDown={(e) => startResize('storeQty', e)}
                      className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize group-hover:bg-indigo-300 bg-transparent transition-all z-20"
                      title={isAr ? 'اسحب لتعديل عرض العمود' : 'Drag to resize'}
                    />
                  </th>

                  {/* Column 5: المخزون بالمحل */}
                  <th className="p-3 text-center relative group select-none" style={{ width: colWidths.shopQty }}>
                    <span>{isAr ? 'المخزون بالمحل 🏪' : 'In Shop shelves 🏪'}</span>
                    <div 
                      onMouseDown={(e) => startResize('shopQty', e)}
                      className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize group-hover:bg-indigo-300 bg-transparent transition-all z-20"
                      title={isAr ? 'اسحب لتعديل عرض العمود' : 'Drag to resize'}
                    />
                  </th>

                  {/* Column 6: سعر البيع مفرق */}
                  <th className="p-3 text-center relative group select-none" style={{ width: colWidths.priceSELL }}>
                    <span>{isAr ? 'سعر البيع مفرق ($)' : 'Retail selling ($)'}</span>
                    <div 
                      onMouseDown={(e) => startResize('priceSELL', e)}
                      className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize group-hover:bg-indigo-300 bg-transparent transition-all z-20"
                      title={isAr ? 'اسحب لتعديل عرض العمود' : 'Drag to resize'}
                    />
                  </th>

                  {/* Column 7: التحويل للمحل (renders on far left in RTL) */}
                  <th className="p-3 text-center w-36 relative group select-none" style={{ width: colWidths.transfer }}>
                    <span>{isAr ? 'التحويل للمحل' : 'Transfer action'}</span>
                    <div 
                      onMouseDown={(e) => startResize('transfer', e)}
                      className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize group-hover:bg-indigo-300 bg-transparent transition-all z-20"
                      title={isAr ? 'اسحب لتعديل عرض العمود' : 'Drag to resize'}
                    />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans text-xs">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-slate-400 font-bold">
                      {isAr ? 'عفواً! لم يتم العثور على سلع مودعة مطابقة لبحثك في المستودع.' : 'No items matching stored inventory filters.'}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(p => {
                    const storeSt = p.warehouseQuantity || 0;
                    const shopSt = p.quantity || 0;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition font-medium">
                        
                        {/* Column 1: اسم الصنف */}
                        <td className="p-3 font-extrabold text-slate-900 truncate" title={p.name}>
                          {p.name}
                        </td>

                        {/* Column 2: الباركود */}
                        <td className="p-3 text-center font-mono font-bold text-slate-500 bg-slate-50/30 truncate" title={p.barcode}>
                          {p.barcode}
                        </td>

                        {/* Column 3: الفئة */}
                        <td className="p-3 text-slate-500 font-bold truncate">
                          {p.category}
                        </td>

                        {/* Column 4: المخزون بالمستودع */}
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded font-black font-mono text-xs ${storeSt > 0 ? 'bg-indigo-50 text-indigo-800' : 'bg-slate-100 text-slate-400'}`}>
                            {storeSt} {isAr ? 'قطع' : 'pcs'}
                          </span>
                        </td>

                        {/* Column 5: المخزون بالمحل */}
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded font-black font-mono text-xs ${shopSt > 10 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                            {shopSt} {isAr ? 'قطع' : 'pcs'}
                          </span>
                        </td>

                        {/* Column 6: سعر البيع مفرق */}
                        <td className="p-3 text-center font-mono font-black text-slate-800">
                          {p.priceUSD.toFixed(2)} $
                        </td>

                        {/* Column 7: التحويل للمحل */}
                        <td className="p-3 text-center">
                          {storeSt > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleQuickPullSelect(p)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black px-3 py-1.5 rounded-lg border border-indigo-150 text-[10px] flex items-center gap-1 mx-auto cursor-pointer transition"
                            >
                              <span>🚚 {isAr ? 'سحب للمحل' : 'Pull to shelf'}</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-normal italic">— {isAr ? 'فارغ' : 'Empty'}</span>
                          )}
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* TABLE PAGINATION CONTROLS */}
          {filteredProducts.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-sans border border-slate-150">
              {/* Left Side: Records details */}
              <div className="text-right font-medium">
                {isAr ? (
                  <span>
                    الآن يعرض <span className="font-extrabold text-slate-900">{Math.min(filteredProducts.length, (currentPage - 1) * itemsPerPage + 1)}</span> إلى{' '}
                    <span className="font-extrabold text-slate-900">{Math.min(filteredProducts.length, currentPage * itemsPerPage)}</span> من أصل{' '}
                    <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">{filteredProducts.length}</span> صنف مستودع متاح
                  </span>
                ) : (
                  <span>
                    Showing <span className="font-bold">{Math.min(filteredProducts.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
                    <span className="font-bold">{Math.min(filteredProducts.length, currentPage * itemsPerPage)}</span> of{' '}
                    <span className="font-bold">{filteredProducts.length}</span> warehouse items
                  </span>
                )}
              </div>

              {/* Middle Side: Control Pagination Buttons */}
              <div className="flex items-center gap-1.5 flex-row-reverse">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
                >
                  {isAr ? 'السابق ⏪' : '⏪ Prev'}
                </button>

                {(() => {
                  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
                  const pages = [];
                  const startPage = Math.max(1, currentPage - 2);
                  const endPage = Math.min(totalPages, startPage + 4);
                  
                  // Render page buttons
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCurrentPage(i)}
                        className={`w-7.5 h-7.5 rounded-lg font-black transition cursor-pointer flex items-center justify-center text-xs ${
                          currentPage === i 
                            ? 'bg-indigo-650 text-white shadow-xs' 
                            : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-705'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }
                  return pages;
                })()}

                <button
                  type="button"
                  disabled={currentPage === Math.ceil(filteredProducts.length / itemsPerPage)}
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredProducts.length / itemsPerPage), prev + 1))}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
                >
                  {isAr ? 'التالي ⏩' : 'Next ⏩'}
                </button>
              </div>

              {/* Right Side: Page sizes list selection */}
              <div className="flex items-center gap-2 flex-row-reverse">
                <span className="font-bold">{isAr ? 'عدد الأسطر بالفهرس:' : 'Rows density:'}</span>
                <select
                  value={itemsPerPage}
                  onChange={e => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-lg py-1 px-2.5 font-bold cursor-pointer text-slate-700 font-sans focus:outline-none"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={55}>55</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB: PERFORM BULK OR SINGLE TRANSFER FORM */}
      {activeSubTab === 'pull' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-2xl mx-auto text-right font-sans">
          
          <h3 className="font-extrabold text-slate-800 text-base border-b pb-3 flex items-center justify-end gap-2 text-right">
            <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
            {isAr ? 'طلب تحويل وسحب بضاعة من المستودع إلى أرفف المحل' : 'Transfer goods from Warehouse to Retail Shop'}
          </h3>

          <form onSubmit={handlePerformTransfer} className="space-y-5 mt-4">
            
            {/* Auto-complete scanner search bar for pulling product */}
            <div className="space-y-1 relative">
              <label className="block text-slate-700 font-black text-xs">{isAr ? '١. ابحث عن الصنف أو امسح الباركود لسحبه من المخزن:' : '1. Scan code or search product to extract from storeroom:'}</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={prodSearchQuery}
                  onChange={e => {
                    setProdSearchQuery(e.target.value);
                    setShowProdDropdown(true);
                  }}
                  onFocus={() => setShowProdDropdown(true)}
                  placeholder={isAr ? '🔎 اكتب اسم الصنف أو باركود القطعة المطروحة للتخرين...' : '🔎 Scanner search...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-3 pr-10 text-xs font-sans text-right"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              </div>

              {/* SEARCH AUTO-COMPLETE PANELS FOR PULL STOCK TYPE */}
              {showProdDropdown && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto text-right divide-y divide-slate-100">
                  <div className="p-2 flex items-center justify-between bg-slate-50 text-[10px] text-slate-400">
                    <button 
                      type="button"
                      onClick={() => setShowProdDropdown(false)}
                      className="text-rose-500 font-extrabold hover:underline"
                    >
                      {isAr ? 'إغلاق القائمة ✕' : 'Close ✕'}
                    </button>
                    <span>{isAr ? 'اختر صنفاً لسحبه من المستودع:' : 'Select component to move:'}</span>
                  </div>

                  {products
                    .filter(p => {
                      if (!prodSearchQuery) return true;
                      const s = prodSearchQuery.toLowerCase().trim();
                      return p.name.toLowerCase().includes(s) || p.barcode.includes(s) || (p.barcodes && p.barcodes.some(b => b.includes(s)));
                    })
                    .map(p => {
                      const wSt = p.warehouseQuantity || 0;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedProduct(p);
                            setProdSearchQuery(p.name);
                            setShowProdDropdown(false);
                          }}
                          className="w-full p-2.5 hover:bg-slate-50 transition flex items-center justify-between text-xs gap-3 text-right"
                        >
                          <div className="flex items-center gap-2">
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-mono font-black">
                              {wSt} {isAr ? 'بالمستودع' : 'in storeroom'}
                            </span>
                            <span className="text-slate-400 font-mono text-[9px]">{p.barcode}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block text-right">{p.name}</span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Selected Product Card Summary Info */}
            {selectedProduct && (
              <div className="bg-indigo-50/50 border border-indigo-150 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                
                {/* Visual storage indicators */}
                <div className="grid grid-cols-2 gap-3 text-center shrink-0 w-full sm:w-auto">
                  <div className="bg-white px-3 py-2 rounded-lg border border-indigo-100">
                    <span className="text-[9px] text-slate-400 font-bold block">{isAr ? 'المحل (الأرفف) حالياً:' : 'Present Shelf:'}</span>
                    <span className="text-xs font-black font-mono text-[#1D9E75]">{selectedProduct.quantity} قطعة</span>
                  </div>
                  <div className="bg-indigo-600 px-3 py-2 rounded-lg text-white">
                    <span className="text-[9px] text-indigo-200 font-bold block">{isAr ? 'المستودع حالياً:' : 'Storeroom:'}</span>
                    <span className="text-xs font-black font-mono text-yellow-300">{(selectedProduct.warehouseQuantity || 0)} قطعة</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-black text-slate-800 text-xs bg-indigo-100/60 text-indigo-800 px-2 py-0.5 rounded inline-block mb-1">
                    {selectedProduct.category}
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-sm">{selectedProduct.name}</h4>
                  <span className="text-[10px] text-slate-500 font-mono italic block mt-0.5">باركد: {selectedProduct.barcode}</span>
                </div>

              </div>
            )}

            {/* Qty and Note details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-550 font-bold text-xs mb-1">{isAr ? '٣. ملاحظات أو سبب السحب (اختياري):' : '3. Internal shift note / reason:'}</label>
                <input
                  type="text"
                  value={pullNote}
                  onChange={e => setPullNote(e.target.value)}
                  placeholder={isAr ? 'مثال: سحب لتعبئة الرف الفارغ' : 'e.g., refilling front stand'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-right"
                />
              </div>

              <div>
                <label className="block text-slate-550 font-bold text-xs mb-1">{isAr ? '٢. الكمية المراد تحويلها للمحل (قطعة):' : '2. Quantity to transfer (units):'}</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={pullQty}
                  onChange={e => setPullQty(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 p-3 text-center font-mono font-black text-slate-900 text-sm"
                  placeholder="1"
                />
              </div>
            </div>

            <div className="border-t pt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedProduct(null);
                  setProdSearchQuery('');
                  setActiveSubTab('stock');
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold transition"
              >
                {isAr ? 'أغلاق وإلغاء' : 'Cancel'}
              </button>
              
              <button
                type="submit"
                disabled={!selectedProduct}
                className={`px-6 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedProduct 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-650/20' 
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                {isAr ? 'ترحيل عملية السحب والتحويل مخزنياً مفرّق 🚚' : 'Save & Execute Transfer 🚚'}
              </button>
            </div>

          </form>

        </div>
      )}

      {/* SUBTAB: HISTORY LOGS */}
      {activeSubTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="border-b pb-3 text-right">
            <h3 className="font-extrabold text-slate-800 text-sm">{isAr ? 'سجل العمليات والتحويلات المكتملة بالتسلسل' : 'Past Transfer Historical Records'}</h3>
            <p className="text-slate-400 text-[11px] mt-0.5">{isAr ? 'توثيق دقيق لكافة عمليات سحب السلع من المستودع وتأمينها على الأرفف.' : 'Historical details of stock shift receipts triggered.'}</p>
          </div>

          <div className="overflow-x-auto text-right">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold text-xs border-b">
                  <th className="p-3">{isAr ? 'الملاحظة والسبب' : 'Note/Reason'}</th>
                  <th className="p-3 text-center">{isAr ? 'الكمية المحولة' : 'Transferred qty'}</th>
                  <th className="p-3 text-center">{isAr ? 'التاريخ والوقت' : 'Date & Time'}</th>
                  <th className="p-3 text-center">{isAr ? 'الباركود' : 'Barcode'}</th>
                  <th className="p-3">{isAr ? 'اسم المنتج الصنف' : 'Product name'}</th>
                  <th className="p-3 text-center w-8">#</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-105 font-sans text-xs">
                {transfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-slate-400 font-bold">
                      {isAr ? 'سجل تحويل وسحب البضائع فارغ تماماً!' : 'No historical transfers recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  transfers.map((t, idx) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      
                      <td className="p-3 text-slate-500 text-[11px] max-w-xs truncate" title={t.note}>
                        {t.note || <span className="text-slate-300 italic">—</span>}
                      </td>

                      <td className="p-3 text-center">
                        <span className="bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded font-black font-mono">
                          {t.quantity} {isAr ? 'وحدة' : 'units'}
                        </span>
                      </td>

                      <td className="p-3 text-center text-slate-500 font-bold">
                        {t.date} <span className="text-[10px] text-slate-400">| {t.time}</span>
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-slate-500">
                        {t.barcode}
                      </td>

                      <td className="p-3 font-semibold text-slate-800">
                        {t.productName}
                      </td>

                      <td className="p-3 text-center text-slate-400 font-bold">
                        {idx + 1}
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
