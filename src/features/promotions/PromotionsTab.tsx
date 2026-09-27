import React, { useState } from 'react';
import { DollarSign, Gift, Tag, Trash2 } from 'lucide-react';
import { Product, Promotion } from '../../types';
import { toISODate, addDays } from '../../lib/date';

export type PromotionChange = { id: string; data: Promotion | null };

interface PromotionsTabProps {
  products: Product[];
  promotions: Promotion[];
  /** Saves the full promotions list; `change` is the single record to mirror to the cloud (null data = deleted). */
  onPromotionsChange: (updated: Promotion[], change: PromotionChange) => void;
  today: string;
  lang: 'ar' | 'en';
  showToast: (type: 'success' | 'error' | 'warning', message: string) => void;
}

export function PromotionsTab({ products, promotions, onPromotionsChange, today, lang, showToast }: PromotionsTabProps) {
  const [promoType, setPromoType] = useState<'percentage' | 'bundle'>('percentage');
  const [promoValue, setPromoValue] = useState<string>('10');
  const [promoDiscountType, setPromoDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [promoProductId, setPromoProductId] = useState<string>('');
  const [promoName, setPromoName] = useState<string>('');
  const [promoBarcode, setPromoBarcode] = useState<string>('');
  const [promoStartDate, setPromoStartDate] = useState<string>(today);
  const [promoEndDate, setPromoEndDate] = useState<string>(() => toISODate(addDays(new Date(), 30)));
  const [bundleProductsList, setBundleProductsList] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [bundleTempProductId, setBundleTempProductId] = useState<string>('');
  const [bundleTempQty, setBundleTempQty] = useState<string>('1');

  const handleAddPromotionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (promoType === 'percentage') {
      if (!promoProductId) {
        showToast('error', 'الرجاء اختيار المنتج أولاً لتطبيق التخفيض عليه!');
        return;
      }
      const val = parseFloat(promoValue) || 0;
      if (val <= 0) {
        showToast('error', 'قيمة الخصم يجب أن تكون أكبر من صفر!');
        return;
      }
      
      const newPromo: Promotion = {
        id: `promo-${Date.now()}`,
        type: 'percentage',
        value: val,
        discountType: promoDiscountType,
        productId: promoProductId,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        startDate: promoStartDate,
        endDate: promoEndDate,
        active: true
      };
      
      onPromotionsChange([newPromo, ...promotions], { id: newPromo.id, data: newPromo });
      
      const targetProdName = products.find(p => p.id === promoProductId)?.name || '';
      showToast('success', `تم تفريز وتفعيل عرض تخفيض جديد على [${targetProdName}] بقيمة ${val}${promoDiscountType === 'percentage' ? '%' : '$'}.`);
      
      // Reset
      setPromoProductId('');
      setPromoValue('10');
    } else {
      // BUNDLE COMBO
      if (!promoName.trim()) {
        showToast('error', 'الرجاء إدخال اسم أو عنوان جذاب لعرض الحزمة (مثلاً: كيلو لبن مع ربطة خبز)!');
        return;
      }
      if (bundleProductsList.length < 2) {
        showToast('error', 'عرض الحزمة يتطلب دمج صنفين على الأقل من أصناف المحل السلعية!');
        return;
      }
      const val = parseFloat(promoValue) || 0;
      if (val <= 0) {
        showToast('error', 'سعر البيع الخاص بالحزمة يجب أن يكون أكبر من صفر!');
        return;
      }
      
      const finalBarcode = promoBarcode.trim() || `BNDL-${Math.floor(100000 + Math.random() * 90000)}`;
      
      const newPromo: Promotion = {
        id: `promo-${Date.now()}`,
        type: 'bundle',
        value: val,
        name: promoName.trim(),
        barcode: finalBarcode,
        bundleProducts: bundleProductsList,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        startDate: promoStartDate,
        endDate: promoEndDate,
        active: true
      };
      
      onPromotionsChange([newPromo, ...promotions], { id: newPromo.id, data: newPromo });
      
      showToast('success', `تم حفظ وتفعيل عرض الحزمة المجمعة الكومبو [${promoName}] بباركود [${finalBarcode}] وسعر مخصص ${val}$.`);
      
      // Reset
      setPromoName('');
      setPromoBarcode('');
      setPromoValue('10');
      setBundleProductsList([]);
    }
  };

  const handleDeletePromotion = (id: string, name: string) => {
    if (window.confirm(`هل أنت متأكد من رغبتك في إلغاء وحذف العرض الترويجي "${name}"؟`)) {
      onPromotionsChange(promotions.filter(p => p.id !== id), { id, data: null });
      showToast('success', `تم حذف العرض [${name}] نهائياً من السيستم.`);
    }
  };

  const handleTogglePromotionActive = (id: string) => {
    const target = promotions.find(p => p.id === id);
    if (!target) return;
    const payload = { ...target, active: !target.active };
    onPromotionsChange(promotions.map(p => (p.id === id ? payload : p)), { id, data: payload });
    showToast('success', 'تم تعديل حالة تفعيل العرض بنجاح.');
  };

  return (
    <div className="space-y-6 text-right font-sans" id="tab-promotions-section">
      {/* Main Banner Heading */}
      <div className="bg-gradient-to-l from-amber-500 to-orange-600 text-white p-6 rounded-3xl shadow-sm flex flex-col md:flex-row-reverse justify-between items-center gap-4">
        <div className="flex items-center gap-3 flex-row-reverse">
          <div className="p-3 bg-white/20 rounded-2xl animate-pulse">
            <Tag className="w-8 h-8 text-amber-100" />
          </div>
          <div>
            <h2 className="text-xl font-black">إدارة العروض والخصومات والكومبو الكبرى</h2>
            <p className="text-xs text-amber-50 mt-1">تفريز مبيعات مجمّعة (Bundle Combos) وتخفيضات محددة المدة لمضاعفة عمليات البيع وحركة الزبائن</p>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="bg-white/10 text-white text-[10px] font-mono px-3 py-1.5 rounded-full font-bold">
            توقيت السيستم اليوم: {today}
          </span>
        </div>
      </div>

      {/* Statistics Panel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between flex-row-reverse">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block">إجمالي العروض بالسيستم</span>
            <span className="text-xl font-black font-mono text-slate-800">{promotions.length}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between flex-row-reverse">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block">الخصومات المباشرة الفعّالة</span>
            <span className="text-xl font-black font-mono text-emerald-700">
              {promotions.filter(p => p.active && p.type === 'percentage').length}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between flex-row-reverse">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block">عروض كومبو الحزم النشطة</span>
            <span className="text-xl font-black font-mono text-amber-700">
              {promotions.filter(p => p.active && p.type === 'bundle').length}
            </span>
          </div>
        </div>
      </div>

      {/* Core Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 1. LEFT COLUMN: CREATE PROMO FORM */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-150/80 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-[#1D9E75] pb-2 border-b border-slate-100 flex items-center gap-1.5 flex-row-reverse">
            <span>➕</span>
            <span>تصميم وإطلاق عرض ترويجي جديد</span>
          </h3>

          {/* Offer Type Switcher buttons */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setPromoType('percentage');
                setPromoValue('10');
              }}
              className={`py-2 text-xs font-black rounded-lg transition-all ${promoType === 'percentage' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              خصم مباشر على منتج
            </button>
            <button
              type="button"
              onClick={() => {
                setPromoType('bundle');
                setPromoValue('5.50');
              }}
              className={`py-2 text-xs font-black rounded-lg transition-all ${promoType === 'bundle' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              كومبو حزمة مجمعة
            </button>
          </div>

          <form onSubmit={handleAddPromotionSubmit} className="space-y-4">
            
            {/* Dynamic Inputs based on selected promo Type */}
            {promoType === 'percentage' ? (
              <>
                {/* Target product selection */}
                <div className="space-y-1">
                  <label className="block text-slate-600 text-xs font-bold">اختر صنف البضاعة المستهدف:</label>
                  <select
                    value={promoProductId}
                    onChange={e => setPromoProductId(e.target.value)}
                    className="w-full text-right bg-white border border-slate-200 py-2.5 px-3 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                  >
                    <option value="">اختر المنتج من مستودع المحل...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (المتوفر رف: {p.quantity} | {p.priceUSD.toFixed(2)}$)</option>
                    ))}
                  </select>
                </div>

                {/* Discount type toggle */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-slate-600 text-xs font-bold">آلية الخصم:</label>
                    <select
                      value={promoDiscountType}
                      onChange={e => setPromoDiscountType(e.target.value as 'percentage' | 'fixed')}
                      className="w-full text-right bg-white border border-slate-200 py-2.5 px-3 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                    >
                      <option value="percentage">نسبة مئوية (%)</option>
                      <option value="fixed">قيمة نقدية ثابتة ($)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-600 text-xs font-bold">مقدار التخفيض المطلوب:</label>
                    <input
                      type="number"
                      step="any"
                      value={promoValue}
                      onChange={e => setPromoValue(e.target.value)}
                      placeholder={promoDiscountType === 'percentage' ? "% 15" : "1.25 $"}
                      className="w-full text-right bg-white border border-slate-200 py-2 px-3 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* BUNDLE COMBO CONFIG */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-slate-600 text-xs font-bold">اسم الحزمة الجذّاب للزبون:</label>
                    <input
                      type="text"
                      value={promoName}
                      onChange={e => setPromoName(e.target.value)}
                      placeholder="مثلا: كيلو لبن مع ربطة خبز بسعر تنافسي"
                      className="w-full text-right bg-white border border-slate-200 py-2.5 px-3 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-600 text-xs font-bold">📟 باركود الحزمة المخصص (أو اتركه لإنشاء تلقائي):</label>
                    <input
                      type="text"
                      value={promoBarcode}
                      onChange={e => setPromoBarcode(e.target.value)}
                      placeholder="مثلاً: 9988 أو bndl-combo-1"
                      className="w-full text-right bg-white border border-slate-200 py-2.5 px-3 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                    />
                  </div>
                </div>

                {/* SELECTING COMPONENT PRODUCTS */}
                <div className="border border-amber-100 bg-amber-50/10 p-3 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1 flex-row-reverse w-full text-right">
                    <span>📦</span>
                    <span>إضافة مكونات إلى الحزمة:</span>
                  </span>

                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-7 space-y-0.5 text-right">
                      <span className="text-[9px] text-slate-400 font-bold block">اختر صنف المكون:</span>
                      <select
                        value={bundleTempProductId}
                        onChange={e => setBundleTempProductId(e.target.value)}
                        className="w-full text-right bg-white border border-slate-200 py-1.5 px-2 rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-[#1D9E75]"
                      >
                        <option value="">اختر الصنف...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.priceUSD.toFixed(2)}$)</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-3 space-y-0.5 text-right">
                      <span className="text-[9px] text-slate-400 font-bold block">الكمية:</span>
                      <input
                        type="number"
                        min="1"
                        value={bundleTempQty}
                        onChange={e => setBundleTempQty(e.target.value)}
                        className="w-full text-center bg-white border border-slate-200 py-1 px-2 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-[#1D9E75]"
                      />
                    </div>

                    <div className="col-span-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!bundleTempProductId) {
                            showToast('error', 'رجاء اختر منتجاً أولاً لإضافتة للحزمة.');
                            return;
                          }
                          const prId = bundleTempProductId;
                          const qty = parseInt(bundleTempQty) || 1;
                          // Avoid duplicates
                          if (bundleProductsList.some(cp => cp.productId === prId)) {
                            showToast('warning', 'هذا الصنف مضاف بالفعل مسبقاً لمكونات الحزمة!');
                            return;
                          }
                          setBundleProductsList([...bundleProductsList, { productId: prId, quantity: qty }]);
                          setBundleTempProductId('');
                          setBundleTempQty('1');
                        }}
                        className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Render current list components inside bundle */}
                  <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                    {bundleProductsList.length === 0 ? (
                      <span className="text-[10px] text-slate-400 block text-center py-1">قائمة المكونات فارغة حالياً. أضف بضائع أعلاه.</span>
                    ) : (
                      <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                        {bundleProductsList.map((comp, cIdx) => {
                          const refPr = products.find(p => p.id === comp.productId);
                          return (
                            <div key={cIdx} className="flex justify-between items-center bg-white p-1.5 rounded-lg border border-slate-100 flex-row-reverse text-right">
                              <div className="flex items-center gap-1 flex-row-reverse text-[11px] font-bold text-slate-700 font-sans">
                                <span>{refPr?.name || 'صنف مجهول'}</span>
                                <span className="text-[10px] text-amber-600 font-mono">({comp.quantity}x)</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setBundleProductsList(bundleProductsList.filter(item => item.productId !== comp.productId));
                                }}
                                className="text-red-500 hover:text-red-700 text-[10px] font-bold"
                              >
                                حذف ❌
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Special selling price for complete bundle block */}
                <div className="space-y-1">
                  <label className="block text-slate-600 text-xs font-bold">سعر البيع الاجمالي المميز للكومبو ($):</label>
                  <input
                    type="number"
                    step="any"
                    value={promoValue}
                    onChange={e => setPromoValue(e.target.value)}
                    placeholder="سعر الحزمة النهائي"
                    className="w-full text-right bg-white border border-slate-200 py-2.5 px-3 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                  />
                </div>
              </>
            )}

            {/* Start Date & End Date Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 text-right">
                <label className="block text-slate-600 text-xs font-bold">تاريخ نهاية العرض:</label>
                <input
                  type="date"
                  value={promoEndDate}
                  onChange={e => setPromoEndDate(e.target.value)}
                  className="w-full text-right bg-white border border-slate-200 py-2 px-3 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                />
              </div>

              <div className="space-y-1 text-right">
                <label className="block text-slate-600 text-xs font-bold">تاريخ بدء الفعالية:</label>
                <input
                  type="date"
                  value={promoStartDate}
                  onChange={e => setPromoStartDate(e.target.value)}
                  className="w-full text-right bg-white border border-slate-200 py-2 px-3 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                />
              </div>
            </div>

            {/* Launch Promotional Campaign Button */}
            <button
              type="submit"
              className="w-full py-3 bg-[#1D9E75] hover:bg-[#15805e] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-700/5 mt-2"
            >
              إطلاق وتثبيت تفعيل العرض فوراً
            </button>

          </form>
        </div>

        {/* 2. RIGHT COLUMN: PROMOTIONS AND OFFERS LIST/TABLE */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-150/80 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-700 pb-2 border-b border-slate-100 flex items-center justify-between flex-row-reverse text-right">
              <span className="text-[#1D9E75]">العروض والتنزيلات الحالية المدرجة بالسيستم</span>
              <span className="text-[10px] text-slate-400">التحديث محلي وتلقائي السحاب</span>
            </h3>

            <div className="space-y-3.5 mt-4 max-h-[500px] overflow-y-auto pr-1">
              {promotions.length === 0 ? (
                <div className="py-12 text-center text-slate-450 font-bold text-xs bg-slate-50 border border-dashed border-slate-250 rounded-2xl justify-center">
                  لا توجد حملات مبيعات نشطة حالياً. ابدأ بإضافة عرض في القائمة الجانبية لتنشيط التنزيلات!
                </div>
              ) : (
                promotions.map(promo => {
                  const targetProdName = products.find(p => p.id === promo.productId)?.name || 'صنف غير مالي مفقود';
                  return (
                    <div
                      key={promo.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row-reverse md:items-center justify-between gap-4 text-right ${
                        promo.active 
                          ? 'bg-gradient-to-l from-white to-emerald-50/10 border-emerald-100 hover:shadow-md' 
                          : 'bg-slate-50 border-slate-200 opacity-75'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-row-reverse text-right">
                          {promo.type === 'bundle' ? (
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-1.5 flex-row-reverse text-right">
                                <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">عرض كومبو مشترك</span>
                                <span className="font-extrabold text-[#111] text-xs font-sans">{promo.name}</span>
                              </div>
                              {promo.barcode && (
                                <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-600 border border-amber-200/50 px-2 py-0.5 rounded flex items-center gap-1 flex-row-reverse">
                                  <span>باركود:</span>
                                  <span className="font-black">{promo.barcode}</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <>
                              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">تخفيض صنف فردي</span>
                              <span className="font-extrabold text-[#111] text-xs font-sans">{targetProdName}</span>
                            </>
                          )}
                        </div>

                        <div className="text-[10px] text-slate-400 flex items-center gap-2 flex-row-reverse">
                          <span>فترة العرض: </span>
                          <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">{promo.startDate}</span>
                          <span>إلى</span>
                          <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">{promo.endDate}</span>
                        </div>
                        
                        {promo.type === 'bundle' && (
                          <div className="p-2 bg-amber-50/20 border border-amber-100/30 rounded-xl mt-1.5 text-[9px] text-slate-500 font-sans">
                            <div className="font-bold text-amber-900 border-b border-amber-100/30 pb-1 mb-1 text-right">محتوى العرض المدمج:</div>
                            <div className="space-y-0.5">
                              {promo.bundleProducts?.map((bItem, idx) => {
                                const pName = products.find(p => p.id === bItem.productId)?.name || 'صنف مفقود';
                                return (
                                  <div key={idx} className="flex justify-between flex-row-reverse text-[9px]">
                                    <span>{pName}</span>
                                    <span className="font-bold text-amber-800">x {bItem.quantity}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between md:flex-col md:items-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                        <div>
                          {promo.type === 'bundle' ? (
                            <div className="text-right">
                              <span className="text-[9px] text-slate-400 font-bold block">سعر العرض الإجمالي:</span>
                              <span className="text-sm font-black font-mono text-emerald-600">{promo.value.toFixed(2)}$</span>
                            </div>
                          ) : (
                            <div className="text-right">
                              <span className="text-[9px] text-slate-400 font-bold block">قيمة الخصم:</span>
                              <span className="text-sm font-black font-mono text-red-500">
                                -{promo.value}{promo.discountType === 'percentage' ? '%' : '$'}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Delete Offer button */}
                          <button
                            type="button"
                            onClick={() => handleDeletePromotion(promo.id, promo.name || targetProdName)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg text-xs cursor-pointer transition-all border border-rose-100"
                            title="حذف العرض"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active status switch button */}
                          <button
                            type="button"
                            onClick={() => handleTogglePromotionActive(promo.id)}
                            className={`px-2.5 py-1 rounded-full text-[9px] font-black transition-all cursor-pointer border ${
                              promo.active 
                                ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm' 
                                : 'bg-slate-200 border-slate-300 text-slate-600 shadow-none'
                            }`}
                          >
                            {promo.active ? 'نشط ومفعّل 🟢' : 'معطّل ومغلق 🔴'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
