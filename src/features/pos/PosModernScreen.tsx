import type { PosRegister } from './usePosRegister';
import { Plus, Edit, X, ShoppingCart, Trash2, Minus, Printer, Monitor, Gift, AlertTriangle, Scan, Keyboard, Search, Tag, ArrowLeft } from 'lucide-react';
import { useStoredState } from '../../lib/storage';
import { Customer, Product, Category, CartItem, SystemSettings, Promotion, CartSession } from '../../types';
import { handleMathBlur, handleMathKeyDown } from '../../mathEvaluator';
import { getGridColsStyle, getCardStyle } from './posGrid';
import React, { useState } from 'react';

interface PosModernScreenProps {
  /** Cart, sessions and checkout state from usePosRegister. */
  register: PosRegister;
  SYS_DATE: string;
  syncWriteToCloud: (collectionName: string, docId: string, data: any, isDelete?: boolean) => Promise<void>;
  lang: "ar" | "en";
  products: Product[];
  categories: Category[];
  settings: SystemSettings;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  promotions: Promotion[];
  isBarcodeKeyboardOpen: boolean;
  setIsBarcodeKeyboardOpen: React.Dispatch<React.SetStateAction<boolean>>;
  keyboardTarget: "search" | "barcode";
  setKeyboardTarget: React.Dispatch<React.SetStateAction<"search" | "barcode">>;
  setTheme: React.Dispatch<React.SetStateAction<"light" | "dark">>;
  setPosLayoutMode: React.Dispatch<React.SetStateAction<"modern" | "terminal">>;
  setExpiryWarningModal: React.Dispatch<React.SetStateAction<Product>>;
  setShowQuickAddCustomerModal: React.Dispatch<React.SetStateAction<boolean>>;
  setQuickAddCustomerName: React.Dispatch<React.SetStateAction<string>>;
  setQuickAddCustomerPhone: React.Dispatch<React.SetStateAction<string>>;
  setQuickAddCustomerType: React.Dispatch<React.SetStateAction<"retail" | "wholesale">>;
  setQuickAddCustomerDebtLimit: React.Dispatch<React.SetStateAction<string>>;
  showCustomerDropdown: boolean;
  setShowCustomerDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  sortedCategoriesBySales: Category[];
  processedProducts: { isExpired: boolean; isNearExpiry: boolean; lastSoldDate: string; daysSinceLastSale: number; isStagnant: boolean; id: string; name: string; barcode: string; barcodes?: string[]; category: string; priceUSD: number; priceLBP?: number; quantity: number; warehouseQuantity?: number; expiryDate: string; sku?: string; priceWholesale?: number; minWholesaleQty?: number; costPriceUSD?: number; image?: string; isWeighed?: boolean; plu?: string; }[];
  showToast: (type: "success" | "error" | "warning", message: string) => void;
  hardwarePrinterType: "system" | "usb" | "serial";
  openCashDrawer: () => Promise<void>;
  renderVirtualKeyboard: () => React.JSX.Element;
}

export function PosModernScreen({
  register,
  SYS_DATE,
  syncWriteToCloud,
  lang,
  products,
  categories,
  settings,
  customers,
  setCustomers,
  promotions,
  isBarcodeKeyboardOpen,
  setIsBarcodeKeyboardOpen,
  keyboardTarget,
  setKeyboardTarget,
  setTheme,
  setPosLayoutMode,
  setExpiryWarningModal,
  setShowQuickAddCustomerModal,
  setQuickAddCustomerName,
  setQuickAddCustomerPhone,
  setQuickAddCustomerType,
  setQuickAddCustomerDebtLimit,
  showCustomerDropdown,
  setShowCustomerDropdown,
  sortedCategoriesBySales,
  processedProducts,
  showToast,
  hardwarePrinterType,
  openCashDrawer,
  renderVirtualKeyboard,
}: PosModernScreenProps) {
  const {
    cart,
    barcodeInput,
    setBarcodeInput,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    discountInput,
    setDiscountInput,
    paidUSDInput,
    setPaidUSDInput,
    paidLBPInput,
    setPaidLBPInput,
    paymentMethod,
    setPaymentMethod,
    posSaleType,
    setPosSaleType,
    selectedCustomerId,
    setSelectedCustomerId,
    sessions,
    activeSessionId,
    editingSessionId,
    setEditingSessionId,
    editingLabelValue,
    setEditingLabelValue,
    switchSession,
    addNewSession,
    deleteSession,
    startRenameSession,
    saveRenameSession,
    handleBarcodeSubmit,
    addToCart,
    handleProductClick,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    getProductDisplayPrice,
    cartSubtotalUSD,
    cartTotalUSD,
    cartTotalLBP,
    changeUSD,
    changeLBP,
    handleCheckout,
  } = register;
  // Remembered on this device so the panel stays collapsed across tab switches
  const [showLowStockPOSPanel, setShowLowStockPOSPanel] = useStoredState<boolean>('pos_show_low_stock_panel', true);
  const [categoryPage, setCategoryPage] = useState<number>(0);
  const [categoriesPerPage, setCategoriesPerPage] = useState<number>(() => {
    const saved = localStorage.getItem('pos_categories_per_page');
    return saved ? parseInt(saved, 10) : 10;
  });
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');

  return (
    <div className={`flex-1 h-full min-h-0 flex flex-col ${lang === 'ar' ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-4 overflow-hidden`} id="tab-pos-register">

      {/* Left Column: Cart & Totals */}
      <div className="w-full lg:w-[32%] lg:min-w-[400px] lg:max-w-[480px] bg-white rounded-xl border border-slate-200 p-4.5 flex flex-col h-full min-h-0" id="pos-left-checkout">

        {/* --- CHROME-LIKE MULTI-BILL SESSIONS & SUSPENSION PANEL --- */}
        <div className="bg-[#01002e] border border-[#d4af37]/30 p-3 rounded-2xl mb-4 space-y-2 text-right shadow-md">
          <div className="flex justify-between items-center gap-2">
            <span className="text-[11px] font-black text-[#d4af37] uppercase tracking-wider">
              ✨ {lang === 'ar' ? 'الفواتير النشطة والمعلقة (البيع لعدة زبائن):' : 'Active & Suspended Bills (Multi-Client Tab):'}
            </span>
            <button
              type="button"
              onClick={() => addNewSession()}
              className="bg-[#d4af37] hover:bg-[#c29d2c] text-[#01002e] font-black px-2.5 py-1 rounded-lg border border-[#b89524] text-[10.5px] flex items-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'فاتورة جديدة (F2)' : 'New client (F2)'}</span>
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-[#d4af37]/25 scrollbar-track-transparent">
            {sessions.map((sess) => {
              const isActive = sess.id === activeSessionId;
              const cartItemsCount = sess.cart.reduce((sum, item) => sum + item.quantity, 0);
              const cartItemsPriceUSD = sess.cart.reduce((sum, item) => {
                const isWholesaleMode = sess.posSaleType === 'wholesale';
                const qualifiesByQty = item.quantity >= (item.product.minWholesaleQty || 5);
                const unitPrice = (isWholesaleMode || qualifiesByQty) ? (item.product.priceWholesale || item.product.priceUSD * 0.9) : item.product.priceUSD;
                return sum + (unitPrice * item.quantity);
              }, 0);

              const isSessEditing = editingSessionId === sess.id;

              return (
                <div
                  key={sess.id}
                  onClick={() => !isSessEditing && switchSession(sess.id)}
                  className={`relative select-none text-xs rounded-xl pr-3 pl-2 py-2 flex items-center gap-2.5 shrink-0 transition-all border cursor-pointer ${
                    isActive
                      ? 'bg-[#d4af37] text-[#01002e] border-[#b89524] font-black shadow-md'
                      : 'bg-[#01002e]/65 text-[#d4af37]/80 hover:bg-[#01002e]/85 hover:text-[#d4af37] border-[#d4af37]/25'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isSessEditing ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingLabelValue}
                        onChange={(e) => setEditingLabelValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRenameSession(sess.id);
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                        onBlur={() => saveRenameSession(sess.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-24 bg-white text-slate-850 font-black px-1.5 py-0.5 rounded text-[10px] text-right border-0 focus:ring-1 focus:ring-emerald-500 text-ellipsis outline-none"
                      />
                    ) : (
                      <span className="max-w-[100px] truncate leading-none">
                        {sess.label}
                      </span>
                    )}

                    {/* Cart Item Badge and Money Badge for this session */}
                    {cartItemsCount > 0 ? (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black leading-none ${
                        isActive ? 'bg-[#01002e] text-[#d4af37] animate-pulse' : 'bg-[#d4af37]/20 text-[#d4af37]'
                      }`}>
                        {cartItemsCount} - {cartItemsPriceUSD.toFixed(1)}$
                      </span>
                    ) : (
                      <span className="text-[9px] text-[#d4af37]/50 font-bold leading-none">{lang === 'ar' ? '(فارغة)' : '(empty)'}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Rename pen icon */}
                    {!isSessEditing && (
                      <button
                        type="button"
                        onClick={(e) => startRenameSession(sess, e)}
                        title={lang === 'ar' ? 'تعديل الاسم أو تعليق الفاتورة' : 'Suspend note / edit label'}
                        className={`p-0.5 rounded transition ${
                          isActive ? 'text-[#01002e]/70 hover:text-[#01002e] hover:bg-[#01002e]/10' : 'text-[#d4af37]/60 hover:text-[#d4af37] hover:bg-[#d4af37]/10'
                        }`}
                      >
                        <Edit className="w-3.5 h-3.5 hover:scale-105" />
                      </button>
                    )}

                    {/* Delete close icon, only show if we have > 1 session */}
                    {sessions.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => deleteSession(sess.id, e)}
                        title={lang === 'ar' ? 'إغلاق وحذف الفاتورة' : 'Close and delete session'}
                        className={`p-0.5 rounded transition ${
                          isActive ? 'text-[#01002e]/70 hover:text-rose-700 hover:bg-[#01002e]/10' : 'text-[#d4af37]/60 hover:text-rose-400 hover:bg-[#d4af37]/10'
                        }`}
                      >
                        <X className="w-3.5 h-3.5 hover:scale-105" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
          <span className="bg-slate-100 px-2.5 py-1 rounded-md font-mono font-bold text-xs">
            {cart.reduce((sum, i) => sum + i.quantity, 0)} {lang === 'ar' ? 'صنف' : 'items'}
          </span>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#1D9E75]" />
            <span>{lang === 'ar' ? 'سلة المبيعات الحالية' : 'Current Sales Cart'}</span>
          </h3>
        </div>

        {/* --- NEW ADDITION: WHOLESALE VS RETAIL SELECTION --- */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3 space-y-2 text-right">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700">🛒 {lang === 'ar' ? 'تسعير المعاملة :' : 'Cart Pricing Mode:'}</span>
            <div className="grid grid-cols-2 gap-1 w-40">
              <button
                type="button"
                onClick={() => {
                  setPosSaleType('retail');
                  showToast('success', lang === 'ar' ? 'تم اختيار تسعير المفرّق' : 'Retail pricing selected');
                }}
                className={`py-1 rounded font-bold text-[10px] border transition ${posSaleType === 'retail' ? 'bg-[#1D9E75] text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}`}
              >
                {lang === 'ar' ? 'مفرّق' : 'Retail'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPosSaleType('wholesale');
                  showToast('warning', lang === 'ar' ? 'تم اختيار تسعير الجملة' : 'Wholesale pricing selected');
                }}
                className={`py-1 rounded font-bold text-[10px] border transition ${posSaleType === 'wholesale' ? 'bg-[#D4AF37] text-slate-950 border-yellow-600' : 'bg-white text-slate-600 border-slate-200'}`}
              >
                {lang === 'ar' ? 'جملة' : 'Wholesale'}
              </button>
            </div>
          </div>

          {/* --- CUSTOMER SELECTOR FOR LOYALTY & DEBT --- */}
          <div className="space-y-1 hidden">
            <div className="flex justify-between items-center mb-0.5">
              <label className="block text-[11px] font-bold text-slate-500 text-right">
                👤 {lang === 'ar' ? 'اسم الزبون لربط الولاء والديون:' : 'Link Customer Account:'}
              </label>
              <button
                type="button"
                onClick={() => {
                  setQuickAddCustomerName('');
                  setQuickAddCustomerPhone('');
                  setQuickAddCustomerType('retail');
                  setQuickAddCustomerDebtLimit('1000');
                  setShowQuickAddCustomerModal(true);
                }}
                className="text-[10.5px] font-black text-[#1D9E75] hover:text-[#158060] flex items-center gap-0.5 cursor-pointer hover:underline"
                title={lang === 'ar' ? 'تسجيل زبون سريع بدون مغادرة شاشة البيع' : 'Quick register customer without leaving checkout'}
              >
                ➕ {lang === 'ar' ? 'إضافة زبون سريع' : 'Quick Register'}
              </button>
            </div>
            <div className="relative font-sans" id="searchable-customer-container">
              {/* Search / Select wrapper */}
              <div className="flex gap-1">
                {selectedCustomerId ? (
                  // If customer is selected, show a clearable pill or badge
                  <div className="w-full bg-emerald-50 border border-emerald-150 rounded-lg py-1 px-2 text-xs flex justify-between items-center text-right font-bold text-emerald-850">
                    <span className="flex items-center gap-1">
                      <span>👤 {customers.find(c => c.id === selectedCustomerId)?.name}</span>
                      <span className="text-[9.5px] text-emerald-600 font-black mr-1.5 ml-1.5 bg-emerald-100/60 px-1.5 py-0.5 rounded-md">
                        {customers.find(c => c.id === selectedCustomerId)?.type === 'wholesale' ? (lang === 'ar' ? 'جملة' : 'Whls') : (lang === 'ar' ? 'مفرق' : 'Rtl')}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId('');
                        setCustomerSearchQuery('');
                        showToast('success', lang === 'ar' ? '🧹 تم إلغاء ربط حساب الزبون (تحول لزبون كاش مجهول)' : 'Customer unlinked (reset to cash checkout)');
                      }}
                      className="text-slate-400 hover:text-rose-600 font-extrabold cursor-pointer bg-white hover:bg-rose-50 w-5 h-5 rounded-md flex items-center justify-center transition border border-slate-200 hover:border-rose-250 text-[10px]"
                      title={lang === 'ar' ? 'إلغاء الربط' : 'Clear Link'}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  // If no customer is selected, show search input
                  <div className="w-full relative">
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onChange={e => {
                        setCustomerSearchQuery(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder={lang === 'ar' ? '🔍 ابحث باسم الزبون أو الهاتف أو اكتب اسم جديد للتسجيل...' : '🔍 Search customer name/phone or write to add...'}
                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pr-8 pl-2 text-xs focus:ring-1 focus:ring-[#1D9E75] focus:border-[#1D9E75] focus:outline-none text-right font-medium placeholder-slate-400"
                    />
                    {customerSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCustomerSearchQuery('')}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-605 text-[10px] bg-slate-100 hover:bg-slate-200 w-4 h-4 rounded-full flex items-center justify-center cursor-pointer font-sans"
                      >
                        ✕
                      </button>
                    )}
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">👤</span>
                  </div>
                )}
              </div>

              {/* Dropdown search suggestions */}
              {!selectedCustomerId && showCustomerDropdown && (
                <div className="absolute z-40 right-0 left-0 mt-1 max-h-56 bg-white border border-slate-200 rounded-xl shadow-xl overflow-y-auto divide-y divide-slate-100 scrollbar-thin text-right">
                  <div className="bg-slate-50/70 p-2 flex justify-between items-center text-[10px] text-slate-400 font-bold border-b border-slate-100 flex-row-reverse">
                    <span>{lang === 'ar' ? '🔍 نتائج البحث وقائمة الزبائن' : 'Search Results & Customers'}</span>
                    <button
                      type="button"
                      onClick={() => setShowCustomerDropdown(false)}
                      className="text-slate-450 hover:text-slate-705 bg-slate-200/55 hover:bg-slate-200/80 px-1.5 rounded text-[9.5px] cursor-pointer font-extrabold"
                    >
                      {lang === 'ar' ? 'إغلاق ✕' : 'Close ✕'}
                    </button>
                  </div>

                  {/* Matching registered customers */}
                  {(() => {
                    const query = customerSearchQuery.trim().toLowerCase();
                    const matches = customers.filter(c => 
                      c.name.toLowerCase().includes(query) || 
                      (c.phone && c.phone.includes(query))
                    );

                    return (
                      <>
                        {matches.map(cust => (
                          <button
                            key={cust.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomerId(cust.id);
                              setCustomerSearchQuery('');
                              setShowCustomerDropdown(false);
                              showToast('success', lang === 'ar' ? `تم ربط حساب الزبون [${cust.name}] بالمعاملة` : `Customer [${cust.name}] session linked`);
                            }}
                            className="w-full text-right hover:bg-[#1D9E75]/5 py-2 px-3 block text-xs transition cursor-pointer text-slate-700"
                          >
                            <div className="flex justify-between items-center flex-row-reverse">
                              <span className="font-bold text-slate-800">{cust.name}</span>
                              <span className="text-[10px] text-slate-450 font-mono">
                                {cust.phone && cust.phone !== 'N/A' && `📞 ${cust.phone} | `}
                                {cust.type === 'wholesale' ? (lang === 'ar' ? 'جملة' : 'Whls') : (lang === 'ar' ? 'مفرق' : 'Rtl')}
                              </span>
                            </div>
                          </button>
                        ))}

                        {matches.length === 0 && (
                          <div className="py-3 px-4 text-center text-slate-400 text-[11px] font-medium leading-relaxed">
                            {lang === 'ar' ? '❌ لا يوجد زبائن مسجلين يطابقون بحثك.' : '❌ No matching customers found.'}
                          </div>
                        )}

                        {/* Inline creation option if query is written and is not an exact match */}
                        {query.length > 0 && !customers.some(c => c.name.toLowerCase() === query) && (
                          <div className="p-2 bg-emerald-50/40 border-t border-emerald-100">
                            <button
                              type="button"
                              onClick={() => {
                                // Auto register inline
                                const newCust: Customer = {
                                  id: `cust-${Date.now()}`,
                                  name: customerSearchQuery.trim(),
                                  phone: 'N/A',
                                  type: 'retail',
                                  loyaltyPoints: 0,
                                  creditBalance: 0,
                                  debtLimit: 1000
                                };
                                const updated = [...customers, newCust];
                                setCustomers(updated);
                                localStorage.setItem('pos_customers', JSON.stringify(updated));
                                syncWriteToCloud('customers', newCust.id, newCust);

                                setSelectedCustomerId(newCust.id);
                                setCustomerSearchQuery('');
                                setShowCustomerDropdown(false);
                                showToast('success', lang === 'ar' 
                                  ? `🆕 تم تسجيل الزبون الجديد [${newCust.name}] وربطه بالفاتورة على الفور!` 
                                  : `🆕 Registered and selected Customer: ${newCust.name}!`);
                              }}
                              className="w-full bg-[#1D9E75] hover:bg-emerald-600 text-white font-extrabold py-2 px-3 rounded-lg text-xs transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5 flex-row-reverse"
                            >
                              <span>➕ {lang === 'ar' ? `تسجيل [${customerSearchQuery}] كزبون جديد فوراً` : `Register [${customerSearchQuery}] as new customer`}</span>
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {selectedCustomerId && (() => {
              const cust = customers.find(c => c.id === selectedCustomerId);
              if (!cust) return null;
              return (
                <div className="bg-white border border-slate-200/80 p-2 rounded-lg text-[10px] text-slate-500 flex justify-between items-center flex-row-reverse mt-1">
                  <div>
                    🌟 <span className="font-bold text-slate-700">{cust.loyaltyPoints}</span> {lang === 'ar' ? 'نقطة' : 'pts'}
                  </div>
                  <div>
                    🔴 {lang === 'ar' ? 'الدين الحالي:' : 'Debt:'} <span className="font-extrabold text-red-600 font-mono">{cust.creditBalance.toFixed(2)} $</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Cart Items list */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin pl-1" id="cart-items-list">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
              <ShoppingCart className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-sm">سلة المبيعات فارغة.</p>
              <p className="text-xs text-slate-400 mt-1">امسح باركود المنتج أو اضغط على صنف لإضافته.</p>
            </div>
          ) : (
            cart.map(item => (
              <div 
                key={item.product.id}
                className="bg-slate-50 hover:bg-slate-100/75 p-4 sm:p-3.5 rounded-xl border border-slate-100 flex items-center gap-3 transition group"
                id={`cart-item-${item.product.id}`}
              >
                <button 
                  onClick={() => removeFromCart(item.product.id)}
                  className="hover:bg-rose-50 p-2 rounded text-slate-400 hover:text-rose-600 transition opacity-100 sm:opacity-0 group-hover:opacity-100 shrink-0 cursor-pointer"
                  title="إزالة"
                >
                  <Trash2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </button>

                <div className="flex-1 text-right min-w-0 flex items-center gap-2 justify-end">
                  <div className="text-right truncate flex-1">
                    <h4 className="font-extrabold text-slate-800 text-sm sm:text-base truncate">{item.product.name}</h4>
                    <span className="text-xs sm:text-sm font-semibold font-mono text-slate-400">
                      {getProductDisplayPrice(item.product, item.quantity).toFixed(2)} $ / صنف
                    </span>
                  </div>
                  {item.product.image && (
                    <img 
                      src={item.product.image} 
                      alt={item.product.name} 
                      className="w-10 h-10 object-cover rounded-lg border border-slate-150 shrink-0" 
                      referrerPolicy="no-referrer" 
                    />
                  )}
                </div>

                {/* Qty edit section */}
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => updateCartQuantity(item.product.id, -1)}
                    className="bg-white border border-slate-200 text-slate-600 w-8 h-8 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-sm sm:text-base hover:bg-slate-100 transition active:scale-95 shrink-0 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5 sm:w-4 h-4" />
                  </button>
                  <span className="font-black text-slate-800 text-sm sm:text-base w-8 text-center font-mono shrink-0">
                    {item.quantity}
                  </span>
                  <button 
                    onClick={() => updateCartQuantity(item.product.id, 1)}
                    className="bg-white border border-slate-200 text-slate-600 w-8 h-8 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-sm sm:text-base hover:bg-slate-100 transition active:scale-95 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 sm:w-4 h-4" />
                  </button>
                </div>

                <div className="text-left font-black text-sm sm:text-base text-[#1D9E75] w-20 shrink-0 font-mono">
                  {(getProductDisplayPrice(item.product, item.quantity) * item.quantity).toFixed(2)} $
                </div>
              </div>
            ))
          )}
        </div>

        {/* Calculations summary panel */}
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5 bg-slate-50/50 -mx-5 -mb-5 p-5 rounded-b-2xl">
          {cart.length > 0 && (
            <div className="flex justify-between items-center text-sm text-slate-500">
              <span>{lang === 'ar' ? 'المجموع الجزئي:' : 'Subtotal:'}</span>
              <span className="font-mono font-semibold">{cartSubtotalUSD.toFixed(2)} $</span>
            </div>
          )}

          <div className="flex justify-between items-center text-sm text-slate-500 gap-4">
            <span>{lang === 'ar' ? 'خصم نقدي مباشر ($):' : 'Direct cash discount ($):'}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 font-mono">$</span>
              <input 
                type="number" 
                value={discountInput}
                onChange={e => setDiscountInput(e.target.value)}
                className="w-16 bg-white border border-slate-200 rounded py-1 px-1.5 text-center text-right text-xs focus:ring-1 focus:ring-emerald-500"
                min="0"
              />
            </div>
          </div>

          {/* Highlighted Total USD & LBP */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
            <span className="font-extrabold text-slate-800">{lang === 'ar' ? 'المطلوب الكلي ($):' : 'Total Amount ($):'}</span>
            <span className="text-xl font-black font-mono text-rose-600">
              {cartTotalUSD.toFixed(2)} $
            </span>
          </div>

          <div className="flex justify-between items-center pb-2">
            <span className="text-xs font-bold text-slate-500 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/60">
              {lang === 'ar' ? 'المجموع بـ ليرة' : 'Total LBP'}
            </span>
            <span className="text-base font-extrabold font-mono text-[#1D9E75]">
              {Math.ceil(cartTotalLBP).toLocaleString()} ل.ل
            </span>
          </div>

          {/* Cash received calculator */}
          <div className="bg-[#EAF6ED]/60 border border-emerald-100 rounded-xl p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-slate-500 mb-1 text-right">المدفوع دولار ($):</label>
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={paidUSDInput}
                  onChange={e => setPaidUSDInput(e.target.value)}
                  onBlur={e => handleMathBlur(e.target.value, setPaidUSDInput)}
                  onKeyDown={e => handleMathKeyDown(e, e.currentTarget.value, setPaidUSDInput)}
                  className="w-full bg-white border border-emerald-200 rounded-lg py-1 px-1.5 text-center font-mono font-bold"
                  placeholder="مثال: =50*3 أو 20"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1 text-right">أو المدفوع ليرة:</label>
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={paidLBPInput}
                  onChange={e => setPaidLBPInput(e.target.value)}
                  onBlur={e => handleMathBlur(e.target.value, setPaidLBPInput)}
                  onKeyDown={e => handleMathKeyDown(e, e.currentTarget.value, setPaidLBPInput)}
                  className="w-full bg-white border border-emerald-200 rounded-lg py-1 px-1.5 text-center font-mono font-bold"
                  placeholder="مثال: =100000*4"
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-600 pt-1.5 border-t border-emerald-100/60">
              <span>{lang === 'ar' ? 'الباقي المرتجع للزبون:' : 'Change Return Amount:'}</span>
              <div className="text-left font-mono font-bold text-[#1D9E75]">
                {changeUSD > 0 ? `${changeUSD.toFixed(2)} $ / ${Math.ceil(changeLBP).toLocaleString()} L.L` : '0.00 $'}
              </div>
            </div>
          </div>

          {/* Payment profile options */}
          <div className="grid grid-cols-4 gap-1 text-[10px] sm:text-xs">
            <button 
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`py-2 rounded-lg font-bold border transition ${paymentMethod === 'cash' ? 'bg-[#d4af37] text-[#01002e] border-[#b89524]' : 'bg-[#01002e] text-[#d4af37] border-[#d4af37]/35 hover:bg-[#01002e]/80'}`}
            >
              {lang === 'ar' ? 'كاش' : 'Cash'}
            </button>
            <button 
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`py-2 rounded-lg font-bold border transition ${paymentMethod === 'card' ? 'bg-[#d4af37] text-[#01002e] border-[#b89524]' : 'bg-[#01002e] text-[#d4af37] border-[#d4af37]/35 hover:bg-[#01002e]/80'}`}
            >
              {lang === 'ar' ? 'بطاقة' : 'Card'}
            </button>
            <button 
              type="button"
              onClick={() => setPaymentMethod('transfer')}
              className={`py-2 rounded-lg font-bold border transition ${paymentMethod === 'transfer' ? 'bg-[#d4af37] text-[#01002e] border-[#b89524]' : 'bg-[#01002e] text-[#d4af37] border-[#d4af37]/35 hover:bg-[#01002e]/80'}`}
            >
              {lang === 'ar' ? 'تحويل' : 'Trsf'}
            </button>
            <button 
              type="button"
              onClick={() => {
                if (!selectedCustomerId) {
                  showToast('error', lang === 'ar' ? 'يجب اختيار زبون أولاً لتمكين البيع بالآجل!' : 'Select customer for debt!');
                  return;
                }
                setPaymentMethod('debt');
              }}
              className={`py-2 rounded-lg font-bold border transition ${paymentMethod === 'debt' ? 'bg-[#d4af37] text-[#01002e] border-[#b89524]' : (!selectedCustomerId ? 'opacity-30 cursor-not-allowed bg-[#01002e] text-[#d4af37]/50 border-transparent' : 'bg-[#01002e] text-[#d4af37] border-[#d4af37]/35 hover:bg-[#01002e]/80')}`}
            >
              {lang === 'ar' ? 'آجل/دين' : 'Debt'}
            </button>
          </div>

          {/* Big Checkout F1 trigger */}
          <button 
            onClick={() => handleCheckout()}
            className="w-full bg-[#1D9E75] hover:bg-[#15805e] text-white font-extrabold py-3.5 rounded-xl transition shadow-lg shadow-emerald-700/15 text-sm flex items-center justify-center gap-2 shrink-0 active:scale-[0.98] cursor-pointer"
          >
            <Printer className="w-5 h-5" />
            <span>حفظ الفاتورة وحساب الكاشير (F1)</span>
          </button>

          {/* Cash Drawer Direct Opening Trigger Button and connection state badge */}
          <div className="flex gap-1.5 w-full">
            <button
              type="button"
              onClick={openCashDrawer}
              className="flex-1 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-extrabold py-2.5 rounded-xl transition shadow-md active:translate-y-px text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              💵 فتح درج الكاش المباشر
            </button>
            {hardwarePrinterType !== 'system' ? (
              <div className="bg-emerald-50 dark:bg-emerald-950 text-emerald-750 dark:text-emerald-300 text-[10px] font-mono font-extrabold px-2.5 rounded-xl flex items-center justify-center border border-emerald-250">
                {hardwarePrinterType.toUpperCase()} متصل
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-medium px-2 rounded-xl flex items-center justify-center border border-slate-205">
                طابعة نظام 🖥️
              </div>
            )}
          </div>

          <button 
            onClick={clearCart}
            className="w-full text-slate-400 hover:text-rose-600 py-1.5 rounded transition text-xs font-semibold"
          >
            إلغاء السلة                   </button>
        </div>
      </div>

      {/* Right Column: Catalog, search, scanner */}
      <div className="flex-grow flex-1 h-full flex flex-col overflow-hidden gap-4 w-full max-w-none" id="pos-right-catalog" style={{ flexGrow: 1 }}>

        {/* 🖥️ DYNAMIC LAYOUT SWITCHER BANNER 🖥️ */}
        <div className="bg-[#1D9E75]/10 border border-[#1D9E75]/35 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-right font-sans shrink-0 animate-in fade-in duration-200 select-none">
          <div className="flex items-center gap-2 flex-row-reverse">
            <span className="text-lg">🖥️</span>
            <div className="text-right">
              <h4 className="text-xs font-black text-slate-800">
                {lang === 'ar' ? 'هل تفضل واجهة المبيعات باللمس؟' : 'Prefer the fast Touch POS interface?'}
              </h4>
              <p className="text-[10px] text-slate-500 font-medium">
                {lang === 'ar' ? 'تصميم مخصص لشاشات الكاشير الكبيرة واللمس لتسريع البيع اليومي' : 'Optimized for large cashier monitors and touch tablets to speed up checkouts'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setPosLayoutMode('terminal');
              setTheme('dark');
              showToast('success', lang === 'ar' ? '🖥️ تم تفعيل واجهة الكاشير باللمس' : 'Switched to Touch Terminal interface');
            }}
            className="bg-[#1D9E75] hover:bg-emerald-600 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
          >
            <Monitor className="w-4 h-4" />
            <span>{lang === 'ar' ? 'الانتقال لشاشة اللمس الكاشير' : 'Switch to Touch Screen'}</span>
          </button>
        </div>

        {/* 🎁 PROMINENT BUNDLE COMBOS AT HEADER/TOP OF THE PAGE 🎁 */}
        {(() => {
          const activeBundles = promotions.filter(p => p.active && p.type === 'bundle');
          if (activeBundles.length === 0) return null;

          return (
            <div className="bg-[#01002e] border border-[#d4af37]/30 p-4.5 rounded-2xl space-y-3 font-sans shadow-md" id="head-bundle-promos">
              <div className="flex items-center justify-between flex-row-reverse">
                <div className="flex items-center gap-1.5 flex-row-reverse text-[#d4af37] font-extrabold text-xs sm:text-sm">
                  <Gift className="w-5 h-5 text-[#d4af37] animate-pulse shrink-0" />
                  <span>عروض وحزم الكومبو الكبرى المفعّلة اليوم (أضف بضغطة زر أو امسح الباركود)</span>
                </div>
                <span className="text-[10px] bg-[#d4af37] text-[#01002e] font-black px-2 py-0.5 rounded-full animate-bounce shrink-0">
                  {activeBundles.length} عرض فعّال
                </span>
              </div>

              {/* Horizontal scroll of bundle combo cards */}
              <div className="flex flex-row-reverse gap-3 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-[#d4af37]/25 scrollbar-track-transparent">
                {activeBundles.map(promo => {
                  const virtualProduct: Product = {
                    id: `bundle-${promo.id}`,
                    name: promo.name || "عرض حزمة",
                    barcode: promo.barcode || `bundle-${promo.id}`,
                    category: 'bundles',
                    priceUSD: promo.value,
                    quantity: 99999,
                    expiryDate: promo.endDate || SYS_DATE,
                  };

                  return (
                    <div 
                      key={promo.id}
                      onClick={() => {
                        addToCart(virtualProduct);
                        showToast('success', `تمت إضافة العرض [${promo.name}] إلى سلة المبيعات بنجاح.`);
                      }}
                      className="w-72 shrink-0 bg-[#d4af37] border border-[#b89524] hover:bg-[#c29d2c] rounded-xl p-3 text-right flex flex-col justify-between hover:shadow-md hover:translate-y-[-1px] transition-all cursor-pointer select-none text-[#01002e]"
                      title="اضغط للإضافة الفورية للسلة"
                    >
                      <div>
                        <div className="flex justify-between items-center gap-2 mb-1 border-b border-[#01002e]/15 pb-1.5 flex-row-reverse">
                          <h4 className="font-extrabold text-[#01002e] text-xs leading-tight truncate">
                            {promo.name}
                          </h4>
                          <span className="text-[11px] font-black font-mono text-[#01002e] shrink-0">
                            {promo.value.toFixed(2)}$
                          </span>
                        </div>

                        <div className="space-y-1 text-right mt-1.5">
                          <div className="text-[9px] text-[#01002e]/70 font-bold">مكونات الحزمة المدمجة:</div>
                          <div className="flex flex-wrap gap-1 justify-end">
                            {promo.bundleProducts?.map((bItem, idx) => {
                              const pName = products.find(p => p.id === bItem.productId)?.name || 'صنف مجهول';
                              return (
                                <span key={idx} className="bg-[#01002e]/10 border border-[#01002e]/15 text-[#01002e] text-[9px] px-1.5 py-0.5 rounded font-black">
                                  {pName} <strong className="text-[#01002e] font-mono">(x{bItem.quantity})</strong>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-[#01002e]/10 mt-2.5 pt-2 flex-row-reverse">
                        {promo.barcode ? (
                          <div className="flex items-center gap-1 text-[9px] text-[#01002e]/70 font-mono">
                            <strong>📟 باركود:</strong>
                            <span className="bg-[#01002e]/10 text-[#01002e] px-1 rounded font-bold">{promo.barcode}</span>
                          </div>
                        ) : (
                          <span />
                        )}

                        <span className="text-[9.5px] text-[#01002e] font-black flex items-center gap-0.5">
                          🛒 إضافة سريعة ◀
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Visual Alert Panel for Low Stock Items */}
        {(() => {
          const depletedProducts = processedProducts.filter(p => p.quantity <= settings.lowStockThreshold);
          if (depletedProducts.length === 0) return null;

          return (
            <div className="bg-[#01002e] border border-[#d4af37]/30 p-4 rounded-2xl space-y-3 shadow-md font-sans">
              <div className="flex items-center justify-between flex-row-reverse">
                <div className="flex items-center gap-2 flex-row-reverse text-[#d4af37] font-extrabold text-sm">
                  <AlertTriangle className="w-5 h-5 text-[#d4af37] shrink-0 animate-bounce" />
                  <span>🚨 تنبيه النواقص وإعادة الطلب ({depletedProducts.length} أصناف تحت حد الطلب)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      let txt = `📋 قائمة نواقص مخزون المتجر - حد الطلب (${settings.lowStockThreshold} قطع):\n`;
                      txt += `====================================\n`;
                      depletedProducts.forEach((p, idx) => {
                        txt += `${idx + 1}. ${p.name} [الباركود: ${p.barcode}] -> المتوفر حالياً: ${p.quantity} قطع\n`;
                      });
                      txt += `====================================\n`;
                      navigator.clipboard.writeText(txt).then(() => {
                        showToast('success', 'تم نسخ قائمة النواقص بالكامل إلى الحافظة! جاهزة للإرسال للمورد بنجاح.');
                      }).catch(() => {
                        showToast('error', 'فشل النسخ تلقائياً');
                      });
                    }}
                    className="bg-[#d4af37] hover:bg-[#c29d2c] text-[#01002e] border border-[#b89524] px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer flex items-center gap-1"
                    title="نسخ للمورد"
                  >
                    <span>نسخ قائمة النواقص 📋</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLowStockPOSPanel(!showLowStockPOSPanel)}
                    className="bg-[#01002e] hover:bg-[#d4af37]/10 text-[#fff200] border border-[#d4af37]/40 px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer"
                  >
                    {showLowStockPOSPanel ? '✖ إخفاء التفاصيل' : '👁 عرض التفاصيل'}
                  </button>
                </div>
              </div>

              {showLowStockPOSPanel && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-right">
                  {depletedProducts.map(p => (
                    <div
                      key={p.id}
                      className="bg-[#01002e]/70 border border-[#d4af37]/20 p-2.5 rounded-xl flex items-center justify-between text-xs hover:border-[#d4af37]/50 transition-all font-sans text-right"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (p.isExpired) {
                            setExpiryWarningModal(p);
                            return;
                          }
                          handleProductClick(p);
                          showToast('success', `تمت إضافة [${p.name}] لسلة البيع`);
                        }}
                        className="bg-[#d4af37] hover:bg-[#c29d2c] text-[#01002e] border border-[#b89524] px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer transition flex items-center gap-1 shrink-0 ml-2 animate-pulse"
                      >
                        <span>صرف/بيع 🛒</span>
                      </button>

                      <div className="min-w-0 flex-1 truncate">
                        <h5 className="font-extrabold text-white truncate">{p.name}</h5>
                        <div className="flex gap-2 justify-end text-[10px] text-[#d4af37]/75 font-medium">
                          <span className="font-mono">{p.barcode}</span>
                          <span>•</span>
                          <span>الحد: {settings.lowStockThreshold}</span>
                          <span>•</span>
                          <span className="text-red-400 font-mono font-black">المتاح: {p.quantity} قطع</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Search, Filter Bar & Simulated Scanner */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
          {/* Realtime Scan simulator */}
          <form onSubmit={handleBarcodeSubmit} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full flex items-center gap-2">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 pr-10 text-right font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:bg-white"
                  placeholder="📟 محاكاة مسح باركود بالماسح (مثلاً اكتب 1111 أو 2222 واضغط Enter)"
                />
                <Scan className="absolute left-3.5 top-3.5 text-slate-400 w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setKeyboardTarget('barcode');
                  setIsBarcodeKeyboardOpen(prev => (keyboardTarget === 'barcode' ? !prev : true));
                }}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                  isBarcodeKeyboardOpen && keyboardTarget === 'barcode'
                    ? 'bg-[#1D9E75] border-[#1D9E75] text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-250'
                }`}
                title="لوحة المفاتيح الافتراضية"
              >
                <Keyboard className="w-5 h-5" />
              </button>
            </div>
            <button 
              type="submit"
              className="w-full sm:w-auto bg-[#1D9E75] hover:bg-[#15805e] text-white font-bold px-6 py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>قراءة الباركود ⚡</span>
            </button>
          </form>

          {/* Render the virtual keyboard if open */}
          {isBarcodeKeyboardOpen && (
            <div className="transition-all animate-fadeIn mb-2">
              {renderVirtualKeyboard()}
            </div>
          )}

          {/* Title and Search query item */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-50">
            <div className="flex items-center gap-2 w-full sm:w-72">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 pr-9 text-right text-xs focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                  placeholder="ابحث بالاسم..."
                />
                <Search className="absolute right-3.5 top-2.5 text-slate-400 w-4 h-4" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setKeyboardTarget('search');
                  setIsBarcodeKeyboardOpen(prev => (keyboardTarget === 'search' ? !prev : true));
                }}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                  isBarcodeKeyboardOpen && keyboardTarget === 'search'
                    ? 'bg-[#1D9E75] border-[#1D9E75] text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-650 border-slate-250'
                }`}
                title="لوحة المفاتيح الافتراضية"
              >
                <Keyboard className="w-4 h-4" />
              </button>
            </div>

            {/* Filter by Category list - Replaced with a styled dropdown select (droplist) as per user request */}
            <div className="flex flex-wrap items-center gap-2.5 justify-end w-full sm:w-auto">
              {/* Pinned Promotions Button to keep it fixed & quick-accessed on the first page */}
              <button
                type="button"
                onClick={() => setSelectedCategory('bundles')}
                className="bg-amber-50 border border-amber-250 hover:bg-amber-100 text-amber-900 font-black px-3.5 py-2 rounded-xl text-[11px] flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                title={lang === 'ar' ? 'انتقال فوري لقسم العروض والمجموعات الموفرة' : 'View Promo Combos Direct'}
              >
                <Tag className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
                <span>{lang === 'ar' ? 'قسم العروض والخصومات الكبرى' : 'Offers & Promos'}</span>
              </button>

              <span className="text-xs text-slate-500 font-extrabold font-sans hidden md:inline">|</span>

              <span className="text-xs text-slate-500 font-extrabold font-sans hidden sm:inline">{lang === 'ar' ? 'تصنيف وعرض المواد حسب القسم:' : 'Filter category:'}</span>
              <select 
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 font-extrabold rounded-xl py-2 px-3 pr-8 text-xs text-right cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1D9E75] min-w-[200px]"
              >
                <option value="all">{lang === 'ar' ? 'الكل (القائمة الرئيسية)' : 'All Categories'}</option>
                {sortedCategoriesBySales.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
                <option value="bundles">{lang === 'ar' ? 'عروض الحزم والمجموعات (Combos)' : 'Bundle Combo Offers'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable grid area */}
        <div className="flex-1 overflow-y-auto pr-1 pl-1 min-h-0 text-right" id="pos-scrollable-grid">
          {/* Dynamic Catalog Area: Categories Grid vs Products Grid */}
        {selectedCategory === 'all' && searchQuery.trim() === '' ? (
          // 📂 CATEGORIES GRID (الشاشة الرئيسية للفئات بالتصفح الموزع على صفحات)
          (() => {
            const totalPages = Math.ceil((categories.length + 1) / categoriesPerPage);
            const currentPageIndex = Math.min(categoryPage, totalPages - 1 >= 0 ? totalPages - 1 : 0);

            // Combine standard categories and the dynamic bundle card into a single lists array (Pinned Bundle Card First)
            const combinedList = [
              { type: 'bundle-card', data: null, id: 'cat-bundles-promo-card' },
              ...sortedCategoriesBySales.map(cat => ({ type: 'category', data: cat, id: cat.id }))
            ];

            const startIndex = currentPageIndex * categoriesPerPage;
            const paginatedItems = combinedList.slice(startIndex, startIndex + categoriesPerPage);

            return (
              <div className="space-y-4 min-h-full flex flex-col">
                <div className="text-right pb-2 border-b border-slate-100 flex items-center justify-between flex-row-reverse">
                  <h3 className="text-sm font-extrabold text-slate-700 flex items-center gap-1.5 font-sans">
                    <span>{lang === 'ar' ? 'الأقسام والفئات الرئيسية للمتجر:' : 'Main Store Departments:'}</span>
                  </h3>
                  <span className="text-[11px] text-[#1D9E75] font-black font-sans">
                    {lang === 'ar' ? `الصفحة ${currentPageIndex + 1} من أصل ${totalPages}` : `Page ${currentPageIndex + 1} of ${totalPages}`}
                  </span>
                </div>

                {/* 🏷️ Horizontal Quick Promos & Offers Row (سطر العروض إلى جانب لائحة الأقسام) */}
                {promotions.length > 0 && (
                  <div className="bg-[#01002e] border border-[#d4af37]/30 rounded-2xl p-3 font-sans shadow-md" id="pos-promos-row-departments">
                    <div className="flex items-center gap-1.5 flex-row-reverse mb-2 text-[#d4af37] font-black text-xs">
                      <Tag className="w-4 h-4 text-[#d4af37] shrink-0" />
                      <span>{lang === 'ar' ? 'عروض وتنزيلات اليوم (اضغط للإضافة الفورية):' : "Active Promo Deals & Quick Offers:"}</span>
                    </div>
                    <div className="flex flex-row-reverse gap-2.5 overflow-x-auto pb-1 scrollbar-hidden">
                      {promotions.map(promo => {
                        const isTargetProduct = promo.productId ? products.find(p => p.id === promo.productId) : null;
                        let promoLabel = promo.name || (lang === 'ar' ? 'حملة ترويجية' : 'Promo Deal');
                        if (promo.type === 'percentage') {
                          promoLabel = lang === 'ar' 
                            ? `خصم %${promo.value} على [${isTargetProduct?.name || 'المنتج'}]`
                            : `Discount %${promo.value} on [${isTargetProduct?.name || 'Product'}]`;
                        } else if (promo.type === 'bxgy') {
                          promoLabel = lang === 'ar'
                            ? `اشترِ ${promo.buyX} واحصل على ${promo.getY} مجاناً من [${isTargetProduct?.name || 'المنتج'}]`
                            : `Buy ${promo.buyX} Get ${promo.getY} Free on [${isTargetProduct?.name || 'Product'}]`;
                        }

                        return (
                          <button
                            key={promo.id}
                            type="button"
                            onClick={() => {
                              if (promo.type === 'bundle') {
                                const virtualProduct: Product = {
                                  id: `bundle-${promo.id}`,
                                  name: promo.name || "عرض حزمة",
                                  barcode: promo.barcode || `bundle-${promo.id}`,
                                  category: 'bundles',
                                  priceUSD: promo.value,
                                  quantity: 99999,
                                  expiryDate: promo.endDate || SYS_DATE,
                                };
                                addToCart(virtualProduct);
                                showToast('success', lang === 'ar' ? `تمت إضافة عرض الحزمة [${promo.name}]` : `Added [${promo.name}] bundle`);
                              } else if (promo.productId) {
                                const prod = products.find(p => p.id === promo.productId);
                                if (prod) {
                                  handleProductClick(prod);
                                  showToast('success', lang === 'ar' ? `🛒 تمت إضافة المنتج المشمول بالعرض: ${prod.name}` : `🛒 Added promotional item: ${prod.name}`);
                                } else {
                                  showToast('warning', lang === 'ar' ? 'المنتج غير متوفر حالياً بالسيستم' : 'Product info not found');
                                }
                              }
                            }}
                            className="shrink-0 bg-[#d4af37] hover:bg-[#c29d2c] border border-[#b89524] rounded-xl px-3.5 py-2 text-right flex items-center gap-2 hover:shadow-md hover:translate-y-[-0.5px] transition-all cursor-pointer text-xs font-black text-[#01002e] flex-row-reverse shadow-xs"
                          >
                            <span className="w-2 h-2 rounded-full bg-[#01002e] animate-pulse shrink-0"></span>
                            <span className="truncate max-w-[280px]">{promoLabel}</span>
                            <span className="text-[10px] font-black font-mono bg-[#01002e]/15 text-[#01002e] px-1.5 py-0.5 rounded shrink-0">
                              {promo.type === 'bundle' ? (lang === 'ar' ? 'حزمة الكومبو' : 'Combo') : promo.type === 'bxgy' ? 'BXGY' : (lang === 'ar' ? 'خصومات' : 'Sale')}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid gap-4" style={getGridColsStyle(settings.posGridSize || 'auto')} id="pos-grid-categories">
                  {paginatedItems.map(item => {
                    if (item.type === 'category') {
                      const cat = item.data as Category;
                      const count = processedProducts.filter(p => p.category === cat.id).length;
                      const cardStyle = getCardStyle(settings.posGridSize || 'auto');
                      return (
                        <div 
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`rounded-2xl border text-center transition-all flex flex-col justify-center items-center cursor-pointer hover:border-[#1D9E75] hover:shadow-lg bg-white border-slate-205 hover:-translate-y-1 ${cardStyle.cardHeight} ${cardStyle.padding}`}
                        >
                          <div className="mt-1">
                            <h4 className={`${cardStyle.titleFont} text-slate-800 font-sans`}>
                              {cat.name}
                            </h4>
                            <span className={`text-[#1D9E75] font-bold block mt-1 ${cardStyle.labelFont}`}>
                              {lang === 'ar' ? `(${count} صنف)` : `(${count} items)`}
                            </span>
                          </div>
                        </div>
                      );
                    } else {
                      const cardStyle = getCardStyle(settings.posGridSize || 'auto');
                      return (
                        <div 
                          key="cat-bundles-promo-card"
                          onClick={() => setSelectedCategory('bundles')}
                          className={`rounded-2xl border text-center transition-all flex flex-col justify-center items-center cursor-pointer border-amber-300 hover:border-[#1D9E75] hover:shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 hover:-translate-y-1 ${cardStyle.cardHeight} ${cardStyle.padding}`}
                        >
                          <div className="mt-1">
                            <h4 className={`${cardStyle.titleFont} text-amber-900 font-extrabold font-sans`}>
                              {lang === 'ar' ? 'عروض المجموعات والحزم' : 'Promotions & Combo Packs'}
                            </h4>
                            <span className={`text-orange-600 bg-orange-100 font-extrabold text-[10px] px-2 py-0.5 rounded-full inline-block mt-1`}>
                              {promotions.filter(p => p.active && p.type === 'bundle').length} {lang === 'ar' ? 'فعّال حالياً' : 'Active Offers'}
                            </span>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>

                {/* Limit controller selector & Pagination footer controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-slate-50 border border-slate-200/60 p-3 rounded-2xl">
                  {/* Limit Selector */}
                  <div className="flex items-center gap-2 flex-row-reverse text-right">
                    <label className="text-xs font-bold text-slate-600">
                      {lang === 'ar' ? 'عدد الأقسام بالصفحة الواحدة:' : 'Departments per page:'}
                    </label>
                    <select
                      value={categoriesPerPage}
                      onChange={e => {
                        const newval = parseInt(e.target.value, 10);
                        setCategoriesPerPage(newval);
                        localStorage.setItem('pos_categories_per_page', newval.toString());
                        setCategoryPage(0); // reset page to 0 on change
                        showToast('success', lang === 'ar' ? `📋 عدد الأقسام الحالي بالصفحة: ${newval}` : `📋 Page limit updated to ${newval}`);
                      }}
                      className="bg-white border border-slate-205 rounded-lg text-xs font-black font-sans px-2.5 py-1 text-center cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1D9E75] min-w-[75px]"
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="15">15</option>
                      <option value="20">20</option>
                      <option value="30">30</option>
                      <option value="50">50</option>
                    </select>
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 ? (
                    <div className="flex items-center gap-3 flex-row-reverse" id="categories-pagination-controls">
                      <button
                        type="button"
                        disabled={currentPageIndex >= totalPages - 1}
                        onClick={() => {
                          setCategoryPage(prev => prev + 1);
                          showToast('success', lang === 'ar' ? 'تم عرض الصفحة التالية 🗄️' : 'Next page shown 🗄️');
                        }}
                        className={`px-3 py-1 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                          currentPageIndex >= totalPages - 1
                            ? 'bg-slate-100 text-slate-350 border-slate-100 cursor-not-allowed'
                            : 'bg-white text-slate-700 border-slate-205 hover:bg-slate-50'
                        }`}
                      >
                        <span>{lang === 'ar' ? 'الصفحة التالية ◀' : 'Next ◀'}</span>
                      </button>

                      <span className="text-xs font-extrabold text-slate-600 font-sans px-2">
                        {currentPageIndex + 1} / {totalPages}
                      </span>

                      <button
                        type="button"
                        disabled={currentPageIndex === 0}
                        onClick={() => {
                          setCategoryPage(prev => Math.max(0, prev - 1));
                          showToast('success', lang === 'ar' ? 'تم الرجوع لصفحة سابقة 🗄️' : 'Previous page shown 🗄️');
                        }}
                        className={`px-3 py-1 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                          currentPageIndex === 0
                            ? 'bg-slate-100 text-slate-350 border-slate-100 cursor-not-allowed'
                            : 'bg-white text-slate-700 border-slate-205 hover:bg-slate-50'
                        }`}
                      >
                        <span>{lang === 'ar' ? '▶ الصفحة السابقة' : '▶ Prev'}</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold font-sans">
                      {lang === 'ar' ? 'جميع الأقسام معروضة بصفحة واحدة بالتفصيل 📦' : 'All departments shown on a single page 📦'}
                    </span>
                  )}
                </div>
              </div>
            );
          })()
        ) : (
          // 🧴 PRODUCTS GRID WITHIN SELECTED CATEGORY / SEARCH ACTIVE
          <div className="space-y-4 min-h-full flex flex-col">
            {/* Category Header and Navigation Back Button */}
            {selectedCategory !== 'all' && (
              <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl flex items-center justify-between flex-row-reverse text-right">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 font-sans">
                  {selectedCategory === 'bundles' ? (
                    <>
                      <Gift className="w-5 h-5 text-amber-600" />
                      <span>{lang === 'ar' ? 'أنت الآن في قسم:' : 'Department:'}</span>
                      <span className="underline font-black text-amber-900">{lang === 'ar' ? 'عروض الحزم والمجموعات الكومبو التوفيرية' : 'Promo Combos & Bundles'}</span>
                    </>
                  ) : (
                    <>
                      <span>{lang === 'ar' ? 'أنت الآن في قسم:' : 'Department:'}</span>
                      <span className="underline font-black">{categories.find(c => c.id === selectedCategory)?.name}</span>
                    </>
                  )}
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className="bg-[#1D9E75] hover:bg-[#15805e] text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 transition-all flex-row-reverse"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'الرجوع للأقسام' : 'Back to Departments'}</span>
                </button>
              </div>
            )}

            {searchQuery.trim() !== '' && (
              <div className="bg-blue-50 border border-blue-150 p-2.5 rounded-xl flex items-center justify-between flex-row-reverse text-right">
                <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5 font-sans">
                  <span>🔍</span>
                  <span>{lang === 'ar' ? `نتائج البحث عن: "${searchQuery}"` : `Search results for: "${searchQuery}"`}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-blue-600 hover:text-blue-800 text-xs font-bold underline cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء البحث ❌' : 'Clear search ❌'}
                </button>
              </div>
            )}

            <div className="grid gap-4" style={getGridColsStyle(settings.posGridSize || 'auto')} id="pos-grid-items">
              {selectedCategory === 'bundles' ? (
                promotions
                  .filter(promo => promo.active && promo.type === 'bundle')
                  .filter(promo => !searchQuery || (promo.name && promo.name.includes(searchQuery)))
                  .map(promo => {
                    const computedPriceLBP = promo.value * settings.exchangeRate;
                    const cardStyle = getCardStyle(settings.posGridSize || 'auto');

                    const virtualProduct: Product = {
                      id: `bundle-${promo.id}`,
                      name: promo.name || "عرض حزمة",
                      barcode: `bundle-${promo.id}`,
                      category: 'bundles',
                      priceUSD: promo.value,
                      quantity: 99999,
                      expiryDate: promo.endDate || SYS_DATE,
                    };

                    return (
                      <div 
                        key={promo.id}
                        onClick={() => addToCart(virtualProduct)}
                        className={`rounded-2xl border text-right transition-all flex flex-col justify-between ${cardStyle.cardHeight} ${cardStyle.padding} border-amber-300 hover:border-amber-500 hover:shadow-md cursor-pointer hover:-translate-y-0.5 bg-gradient-to-br from-amber-50/20 to-orange-50/20`}
                        id={`bundle-card-${promo.id}`}
                      >
                        <div>
                          <div className="flex justify-between items-center gap-1 mb-1.5">
                            <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0">
                              عرض حزمة الكومبو
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 font-mono bg-slate-50 px-1 py-0.5 rounded truncate" title={promo.id}>
                              {promo.startDate} ↩ {promo.endDate}
                            </span>
                          </div>

                          <h4 className={`font-sans font-extrabold line-clamp-2 ${cardStyle.titleFont} text-slate-800`}>
                            {promo.name}
                          </h4>

                          <div className="mt-1.5 text-[10px] text-slate-500 bg-amber-50/20 p-2 rounded-lg border border-amber-100/30">
                            <div className="font-bold text-amber-800 mb-1">📦 مكونات الحزمة:</div>
                            <div className="space-y-0.5">
                              {promo.bundleProducts?.map((comp, cIdx) => {
                                const originalProd = products.find(p => p.id === comp.productId);
                                return (
                                  <div key={cIdx} className="flex justify-between items-center text-[9px]">
                                    <span>({comp.quantity}x) {originalProd?.name || 'صنف مجهول'}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 pt-1.5 border-t border-amber-100/50 flex flex-col">
                          <span className={`text-[#1D9E75] font-mono ${cardStyle.priceFont}`}>
                            {promo.value.toFixed(2)} $
                          </span>
                          <span className={`${cardStyle.labelFont} font-bold text-slate-400 truncate`}>
                            {Math.ceil(computedPriceLBP).toLocaleString()} ل.ل
                          </span>
                        </div>
                      </div>
                    );
                  })
              ) : (
                processedProducts
                  .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
                  .filter(p => !searchQuery || p.name.includes(searchQuery) || p.barcode.includes(searchQuery) || (p.barcodes && p.barcodes.some(b => b.includes(searchQuery))))
                  .map(item => {
                    const computedPriceLBP = item.priceUSD * settings.exchangeRate;
                    const cardStyle = getCardStyle(settings.posGridSize || 'auto');

                    return (
                      <div 
                        key={item.id}
                        onClick={() => addToCart(item)}
                        className={`rounded-2xl border text-right transition-all flex flex-col justify-between ${cardStyle.cardHeight} ${cardStyle.padding} ${
                          item.isExpired 
                            ? 'bg-rose-50 border-rose-200/80 cursor-not-allowed ring-2 ring-rose-500/10 opacity-75' 
                            : 'bg-white border-slate-200 hover:border-[#1D9E75] hover:shadow-md cursor-pointer hover:-translate-y-0.5'
                        }`}
                        id={`product-card-${item.id}`}
                      >
                        <div>
                          <div className="flex justify-between items-center gap-1 mb-1.5">
                            {/* EXPIRED BLOCK TAG */}
                            {item.isExpired ? (
                              <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0">
                                منتهي ❌
                              </span>
                            ) : item.isNearExpiry ? (
                              <span className="bg-amber-100 border border-amber-200 text-amber-800 text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                                صلاحية ⏳
                              </span>
                            ) : item.quantity <= settings.lowStockThreshold ? (
                              <span className="bg-orange-50 border border-orange-100 text-orange-700 text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                                منخفض ⚠️
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-400 font-mono bg-slate-50 px-1 py-0.5 rounded truncate max-w-[100px]" title={item.barcode}>
                                {item.barcode}
                              </span>
                            )}

                            {/* Small Category Indicator if not filtered */}
                            {selectedCategory === 'all' && (
                              <span className="text-[9px] font-extrabold text-[#1D9E75] bg-[#1D9E75]/10 px-1.5 py-0.5 rounded shrink-0 max-w-[80px] truncate" title={categories.find(c => c.id === item.category)?.name}>
                                {categories.find(c => c.id === item.category)?.name}
                              </span>
                            )}
                          </div>

                          {item.image && (
                            <div className="w-full h-16 sm:h-20 mb-1.5 overflow-hidden rounded-xl border border-slate-150/50 bg-slate-100 flex items-center justify-center">
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          )}

                          <h4 className={`font-sans font-extrabold line-clamp-2 ${cardStyle.titleFont} ${item.isExpired ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                            {item.name}
                          </h4>
                        </div>

                        <div className="mt-1 pt-1 border-t border-slate-50 flex flex-col">
                          <span className={`text-[#1D9E75] font-mono ${cardStyle.priceFont}`}>
                            {item.priceUSD.toFixed(2)} $
                          </span>
                          <span className={`${cardStyle.labelFont} font-bold text-slate-400 truncate`}>
                            {Math.ceil(computedPriceLBP).toLocaleString()} ل.ل
                          </span>
                          {(settings.posGridSize === 'auto' || settings.posGridSize === '3x3' || settings.posGridSize === '4x4') && (
                            <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                              الرف: <span className={`font-mono ${item.quantity <= 5 ? 'text-red-500 font-bold' : ''}`}>{item.quantity}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}

              {/* No results block */}
              {selectedCategory === 'bundles' ? (
                promotions.filter(promo => promo.active && promo.type === 'bundle').length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200 justify-center">
                    😞 {lang === 'ar' ? 'لا توجد عروض مجمعة نشطة حالياً.' : 'No active bundle offers available right now.'}
                  </div>
                )
              ) : (
                processedProducts
                  .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
                  .filter(p => !searchQuery || p.name.includes(searchQuery) || p.barcode.includes(searchQuery) || (p.barcodes && p.barcodes.some(b => b.includes(searchQuery)))).length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      😞 {lang === 'ar' ? 'عفواً! لم يتم العثور على أي منتج مطابق في هذا القسم.' : 'No items found matching the filter.'}
                    </div>
                )
              )}
            </div>
          </div>
        )}
        </div>
      </div>

    </div>
  );
}
