import React, { useEffect, useState } from 'react';
import { Product, StockCountItem } from '../../types';
import { ColumnSelector } from '../../components/ColumnSelector';
import { useResizableColumns } from '../../hooks/useResizableColumns';
import * as storage from '../../lib/storage';

type Location = 'shop' | 'warehouse';

interface StockCountTabProps {
  products: Product[];
  setProducts: (products: Product[]) => void;
  lang: 'ar' | 'en';
  showToast: (type: 'success' | 'error' | 'warning', message: string) => void;
}

const buildCountSheet = (products: Product[], location: Location): StockCountItem[] =>
  products.map(p => {
    const sysStock = location === 'warehouse' ? (p.warehouseQuantity || 0) : p.quantity;
    return {
      productId: p.id,
      name: p.name,
      barcode: p.barcode,
      category: p.category,
      priceUSD: p.priceUSD,
      systemStock: sysStock,
      actualStock: sysStock, // default to match
      difference: 0,
      expiryDate: p.expiryDate
    };
  });

export function StockCountTab({ products, setProducts, lang, showToast }: StockCountTabProps) {
  const [stockCountLocation, setStockCountLocation] = useState<Location>('shop');
  const [stockCounts, setStockCounts] = useState<StockCountItem[]>([]);
  const [onlyShowCountDiffs, setOnlyShowCountDiffs] = useState<boolean>(false);
  const [stockCountSearchQuery, setStockCountSearchQuery] = useState<string>('');
  const [visibleStockCols, setVisibleStockCols] = useState<{ [key: string]: boolean }>({
    val_diff: true,
    qty_diff: true,
    actual_qty: true,
    system_qty: true,
    price: true,
    barcode: true,
    name: true,
  });
  const { colWidths, handleResizeStart } = useResizableColumns({
    val_diff: 130,
    qty_diff: 110,
    actual_qty: 150,
    system_qty: 140,
    price: 110,
    barcode: 150,
    name: 240,
  }, lang);

  const stockColumns = [
    { key: 'val_diff', label: lang === 'ar' ? 'فروقات القيمة ($)' : 'Value Diff ($)' },
    { key: 'qty_diff', label: lang === 'ar' ? 'فروق عدد الكمية' : 'Qty Diff' },
    { key: 'actual_qty', label: lang === 'ar' ? 'الكمية الواقعية بالجرد' : 'Actual Qty' },
    { key: 'system_qty', label: lang === 'ar' ? 'الكمية بالنظام حالياً' : 'System Qty' },
    { key: 'price', label: lang === 'ar' ? 'سعر الصنف' : 'Item Price' },
    { key: 'barcode', label: lang === 'ar' ? 'الباركود' : 'Barcode' },
    { key: 'name', label: lang === 'ar' ? 'اسم الصنف المعني' : 'Item Name' },
  ];

  // Start a fresh count sheet whenever the products or the counted location change
  useEffect(() => {
    setStockCounts(buildCountSheet(products, stockCountLocation));
  }, [products, stockCountLocation]);

  const updateActualStockCountVal = (productId: string, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    setStockCounts(stockCounts.map(item =>
      item.productId === productId
        ? { ...item, actualStock: val, difference: val - item.systemStock }
        : item
    ));
  };

  const applyStockCountReconciliation = () => {
    const diffItems = stockCounts.filter(item => item.difference !== 0);
    if (diffItems.length === 0) {
      showToast('warning', 'لا توجد فروقات بين الكميات الفعلية والجرد الحالي بالنظام لإجراء التسوية!');
      return;
    }

    const locationLabel = stockCountLocation === 'warehouse' ? 'المستودع/المخزن 📦' : 'المحل/أرفف العرض 🏪';
    if (window.confirm(`جردة التسوية (${locationLabel}): هل أنت متأكد من تعديل مستويات المخزون بالنظام لـ (${diffItems.length}) منتجات متغيرة لمطابقة أعداد الجرد الفعلي؟`)) {
      const updatedProducts = products.map(p => {
        const countItem = stockCounts.find(item => item.productId === p.id);
        if (!countItem) return p;
        return stockCountLocation === 'warehouse'
          ? { ...p, warehouseQuantity: countItem.actualStock }
          : { ...p, quantity: countItem.actualStock };
      });

      setProducts(updatedProducts);
      storage.setJSON('pos_products', updatedProducts);
      showToast('success', `رائع! تم تحديث جردة الكميات الفعلية لـ [${locationLabel}] وترحيل التغييرات إلى قاعدة البيانات.`);
      // The count sheet is rebuilt by the effect above once products update
    }
  };

  return (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 select-none">
                <input 
                  type="checkbox" 
                  checked={onlyShowCountDiffs}
                  onChange={e => setOnlyShowCountDiffs(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>عرض المنتجات التي فيها اختلافات جرد عينية فقط</span>
              </label>
            </div>
            <div className="text-right">
              <h3 className="font-bold text-slate-800 text-lg">📋 مطابقة جردة المخازن الفعلية والتسوية</h3>
              <span className="text-[11px] font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-sm mt-1 inline-block">
                الجرد الحالي مستهدف لـ: {stockCountLocation === 'warehouse' ? '📦 المستودع والمخزن الاحتياطي' : '🏪 رفوف ومبيعات المحل'}
              </span>
            </div>
          </div>

          {/* Location selector for separate inventory auditing */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-right">
            <div className="order-last sm:order-first">
              <h4 className="font-extrabold text-[#111827] text-sm">📍 حدد مكان ومجال الجرد ومطابقة المخزون المادي حالياً:</h4>
              <p className="text-slate-400 text-[11px] mt-0.5">يمكنك جرد كميات رفوف المحل منفصلة تماماً عن بضائع الكمية المتبقية في المستودع والمخزن.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setStockCountLocation('shop')}
                className={`py-2 px-3 rounded-xl text-xs font-black transition border flex items-center justify-center gap-2 cursor-pointer ${stockCountLocation === 'shop' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'}`}
              >
                <span>🏪</span>
                <span>جرد رفوف المحل</span>
              </button>
              <button
                type="button"
                onClick={() => setStockCountLocation('warehouse')}
                className={`py-2 px-3 rounded-xl text-xs font-black transition border flex items-center justify-center gap-2 cursor-pointer ${stockCountLocation === 'warehouse' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'}`}
              >
                <span>📦</span>
                <span>جرد المستودع والاحتياط</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed mb-6 text-right">
            💡 قم بعد وإحصاء المنتجات في المكان المحدد وتعبئتها في خانة <span className="font-bold text-teal-600">"الكمية الواقعية بالجرد"</span> لملاحظة الفروقات تلقائياً. عند إنهاء المطابقة، اضغط على زر التسوية بالأسفل للتطبيق بشكل فوري.
          </p>

          <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch mb-4 text-right">
            <div className="flex-1 max-w-sm relative md:mr-auto">
              <label className="block text-slate-700 text-xs font-bold mb-1.5 flex items-center justify-start gap-1 flex-row-reverse">
                <span>البحث المباشر في جرود ومطابقات المخازن الأسبوعية:</span>
              </label>
              <input
                type="text"
                placeholder="ابحث باسم المنتج أو الباركود المسجل بالجرد..."
                value={stockCountSearchQuery}
                onChange={e => setStockCountSearchQuery(e.target.value)}
                className="w-full text-right bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
              />
            </div>
            <div className="flex items-end justify-start md:justify-end">
              <ColumnSelector
                columns={stockColumns}
                visibleCols={visibleStockCols}
                onChange={(key) => setVisibleStockCols(prev => ({ ...prev, [key]: !prev[key] }))}
                lang={lang}
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-150 rounded-2xl" id="stock-counting-grid">
            <table 
              className="w-full border-collapse text-right text-xs table-fixed min-w-full"
              style={{
                minWidth: Object.entries(visibleStockCols)
                  .filter(([_, visible]) => visible)
                  .reduce((sum, [colKey, _]) => sum + (colWidths[colKey] || 120), 0) + 'px'
              }}
              role="grid" 
              aria-label="Stock Counting Grid"
            >
              <colgroup>
                {visibleStockCols.val_diff !== false && <col style={{ width: colWidths.val_diff }} />}
                {visibleStockCols.qty_diff !== false && <col style={{ width: colWidths.qty_diff }} />}
                {visibleStockCols.actual_qty !== false && <col style={{ width: colWidths.actual_qty }} />}
                {visibleStockCols.system_qty !== false && <col style={{ width: colWidths.system_qty }} />}
                {visibleStockCols.price !== false && <col style={{ width: colWidths.price }} />}
                {visibleStockCols.barcode !== false && <col style={{ width: colWidths.barcode }} />}
                {visibleStockCols.name !== false && <col style={{ width: colWidths.name }} />}
              </colgroup>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  {visibleStockCols.val_diff !== false && (
                    <th className="p-3 relative group select-none text-right font-extrabold" style={{ width: colWidths.val_diff }}>
                      <span>فروقات القيمة ($)</span>
                      <div 
                        onPointerDown={e => handleResizeStart(e, 'val_diff')} 
                        className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-100 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                      />
                    </th>
                  )}
                  {visibleStockCols.qty_diff !== false && (
                    <th className="p-3 relative group select-none text-right font-extrabold" style={{ width: colWidths.qty_diff }}>
                      <span>فروق عدد الكمية</span>
                      <div 
                        onPointerDown={e => handleResizeStart(e, 'qty_diff')} 
                        className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-100 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                      />
                    </th>
                  )}
                  {visibleStockCols.actual_qty !== false && (
                    <th className="p-3 relative group select-none text-center font-extrabold" style={{ width: colWidths.actual_qty }}>
                      <span>الكمية الواقعية بالجرد</span>
                      <div 
                        onPointerDown={e => handleResizeStart(e, 'actual_qty')} 
                        className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-100 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                      />
                    </th>
                  )}
                  {visibleStockCols.system_qty !== false && (
                    <th className="p-3 relative group select-none text-right font-extrabold" style={{ width: colWidths.system_qty }}>
                      <span>الكمية بالنظام حالياً</span>
                      <div 
                        onPointerDown={e => handleResizeStart(e, 'system_qty')} 
                        className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-100 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                      />
                    </th>
                  )}
                  {visibleStockCols.price !== false && (
                    <th className="p-3 relative group select-none text-right font-extrabold" style={{ width: colWidths.price }}>
                      <span>سعر الصنف</span>
                      <div 
                        onPointerDown={e => handleResizeStart(e, 'price')} 
                        className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-100 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                      />
                    </th>
                  )}
                  {visibleStockCols.barcode !== false && (
                    <th className="p-3 relative group select-none text-right font-extrabold" style={{ width: colWidths.barcode }}>
                      <span>باركود</span>
                      <div 
                        onPointerDown={e => handleResizeStart(e, 'barcode')} 
                        className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-100 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                      />
                    </th>
                  )}
                  {visibleStockCols.name !== false && (
                    <th className="p-3 relative group select-none text-right font-extrabold" style={{ width: colWidths.name }}>
                      <span>اسم الصنف المعني</span>
                      <div 
                        onPointerDown={e => handleResizeStart(e, 'name')} 
                        className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 bg-slate-100 hover:bg-[#1D9E75] cursor-col-resize active:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100 hover:w-1.5 z-10`} 
                      />
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {(() => {
                  const list = stockCounts
                    .filter(item => !onlyShowCountDiffs || item.difference !== 0)
                    .filter(item => {
                      const q = stockCountSearchQuery.toLowerCase().trim();
                      if (!q) return true;
                      const prod = products.find(p => p.id === item.productId);
                      return (
                        item.name.toLowerCase().includes(q) ||
                        item.barcode.toLowerCase().includes(q) ||
                        (prod && prod.barcodes && prod.barcodes.some(b => b.toLowerCase().includes(q)))
                      );
                    });

                  if (list.length === 0) {
                    const visibleCount = Object.values(visibleStockCols).filter(Boolean).length;
                    return (
                      <tr>
                        <td colSpan={visibleCount} className="p-8 text-center text-slate-400 font-sans">
                          لا توجد بنود مطابقة للبحث أو للفلتر المحدد بالجرد.
                        </td>
                      </tr>
                    );
                  }

                  return list.map(item => {
                    const diffValUSD = item.difference * item.priceUSD;
                    return (
                      <tr 
                        key={item.productId}
                        className={`transition-all duration-150 border-b border-slate-100 ${
                          item.difference < 0 
                            ? 'bg-red-50 border-r-4 border-red-500 text-red-950 font-medium hover:bg-red-100/80' 
                            : item.difference > 0 
                              ? 'bg-emerald-50 border-r-4 border-emerald-500 text-emerald-950 font-medium hover:bg-emerald-100/80' 
                              : 'bg-white border-r-4 border-transparent hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        {visibleStockCols.val_diff !== false && (
                          <td className={`p-3 font-mono font-bold ${item.difference < 0 ? 'text-red-600' : item.difference > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {item.difference !== 0 ? `${diffValUSD > 0 ? '+' : ''}${diffValUSD.toFixed(2)} $` : '0.00 $'}
                          </td>
                        )}
                        {visibleStockCols.qty_diff !== false && (
                          <td className={`p-3 font-mono font-black ${item.difference < 0 ? 'text-red-600' : item.difference > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {item.difference !== 0 ? `${item.difference > 0 ? '+' : ''}${item.difference}` : 'مطابق ✓'}
                          </td>
                        )}
                        {visibleStockCols.actual_qty !== false && (
                          <td className="p-2 text-center">
                            <input 
                              type="number"
                              value={item.actualStock === 0 && item.systemStock !== 0 ? '' : item.actualStock}
                              placeholder="0"
                              onChange={e => updateActualStockCountVal(item.productId, e.target.value)}
                              className="w-20 bg-white border border-slate-200 rounded py-1 px-1.5 text-center font-mono font-extrabold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                        )}
                        {visibleStockCols.system_qty !== false && (
                          <td className="p-3 font-mono font-bold text-slate-500">{item.systemStock}</td>
                        )}
                        {visibleStockCols.price !== false && (
                          <td className="p-3 font-mono font-semibold">{item.priceUSD.toFixed(2)} $</td>
                        )}
                        {visibleStockCols.barcode !== false && (
                          <td className="p-3 font-mono text-slate-400 break-all select-all text-[11px] leading-normal whitespace-normal text-right" title={item.barcode}>
                            {item.barcode ? item.barcode.split('|').join(' | ') : '—'}
                          </td>
                        )}
                        {visibleStockCols.name !== false && (
                          <td className="p-3 font-bold text-slate-800">{item.name}</td>
                        )}
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* Summary bar for stock reconcile */}
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm font-sans" id="stock-counting-summary">
            <div className="text-right">
              <div className="font-bold text-slate-700">الملخص المالي لفروقات الجرد:</div>
              <div className="text-xs text-slate-400 mt-0.5">يُحسب التباين العيني بقيمة سعر الصنف الكلي.</div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-center bg-white px-4 py-2 rounded-xl border">
                <span className="block text-xs text-slate-400">المنتجات ذات فروق</span>
                <span className="text-sm font-black text-rose-500">
                  {stockCounts.filter(i => i.difference !== 0).length} صنف
                </span>
              </div>
              <div className="text-center bg-white px-4 py-2 rounded-xl border">
                <span className="block text-xs text-slate-400">قيمة فروق الجرد</span>
                <span className={`text-sm font-black ${
                  stockCounts.reduce((s, i) => s + (i.difference * i.priceUSD), 0) < 0 ? 'text-red-500' : 'text-emerald-600'
                }`}>
                  {stockCounts.reduce((s, i) => s + (i.difference * i.priceUSD), 0).toFixed(2)} $
                </span>
              </div>

              <button 
                onClick={applyStockCountReconciliation}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-3 rounded-xl transition shadow-md shrink-0 cursor-pointer text-xs"
              >
                ✅ ترحيل جرد {stockCountLocation === 'warehouse' ? 'المستودع 📦' : 'المحل 🏪'} والتسوية الفعلية
              </button>
            </div>
          </div>

        </div>
  );
}
