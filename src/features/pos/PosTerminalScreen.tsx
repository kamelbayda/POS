import type { PosRegister } from './usePosRegister';
import { ShoppingCart, Globe, Sun, Moon, Maximize, Menu, Monitor, X, Plus, Check, Lock, Percent, Truck, CreditCard, User, DollarSign, MessageSquare, Save, Trash2, Tag, Search, Home } from 'lucide-react';
import { Product, Category, CartItem, SystemSettings, Promotion, Customer, CartSession } from '../../types';
import React, { useState } from 'react';
import { BeeCashMark, BeeCashWordmark } from '../../components/BeeCashLogo';

interface PosTerminalScreenProps {
  /** Cart, sessions and checkout state from usePosRegister. */
  register: PosRegister;
  SYS_DATE: string;
  lang: "ar" | "en";
  setLang: React.Dispatch<React.SetStateAction<"ar" | "en">>;
  toggleFullScreen: () => void;
  products: Product[];
  categories: Category[];
  settings: SystemSettings;
  customers: Customer[];
  promotions: Promotion[];
  theme: "light" | "dark";
  setTheme: React.Dispatch<React.SetStateAction<"light" | "dark">>;
  setPosLayoutMode: React.Dispatch<React.SetStateAction<"modern" | "terminal">>;
  terminalProductPage: number;
  setTerminalProductPage: React.Dispatch<React.SetStateAction<number>>;
  terminalItemsPerPage: number;
  setTerminalItemsPerPage: React.Dispatch<React.SetStateAction<number>>;
  executeWithAdminAuth: (title: string, action: () => void) => void;
  processedProducts: { isExpired: boolean; isNearExpiry: boolean; lastSoldDate: string; daysSinceLastSale: number; isStagnant: boolean; id: string; name: string; barcode: string; barcodes?: string[]; category: string; priceUSD: number; priceLBP?: number; quantity: number; warehouseQuantity?: number; expiryDate: string; sku?: string; priceWholesale?: number; minWholesaleQty?: number; costPriceUSD?: number; image?: string; isWeighed?: boolean; plu?: string; }[];
  showToast: (type: "success" | "error" | "warning", message: string) => void;
  openCashDrawer: () => Promise<void>;
  /** Signs the current user out (back to the login screen). */
  handleLogout: () => void;
}

export function PosTerminalScreen({
  register,
  SYS_DATE,
  lang,
  setLang,
  toggleFullScreen,
  products,
  categories,
  settings,
  customers,
  promotions,
  theme,
  setTheme,
  setPosLayoutMode,
  terminalProductPage,
  setTerminalProductPage,
  terminalItemsPerPage,
  setTerminalItemsPerPage,
  executeWithAdminAuth,
  processedProducts,
  showToast,
  openCashDrawer,
  handleLogout,
}: PosTerminalScreenProps) {
  const {
    cart,
    setCart,
    setBarcodeInput,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    discountInput,
    setDiscountInput,
    taxRate,
    setTaxRate,
    deliveryUSD,
    setDeliveryUSD,
    setIsNumpadOpen,
    setNumpadValue,
    setNumpadTitle,
    setNumpadOnSave,
    paidUSDInput,
    paidLBPInput,
    posSaleType,
    setPosSaleType,
    selectedCustomerId,
    setSelectedCustomerId,
    voidedCartItemIds,
    setVoidedCartItemIds,
    noteInput,
    setNoteInput,
    sessions,
    activeSessionId,
    switchSession,
    addNewSession,
    addToCart,
    handleProductClick,
    clearCart,
    triggerCustomerSearch,
    getCalculatedDiscountUSD,
    handleCheckout,
    openTouchPayment,
  } = register;
  const [selectedCartItemId, setSelectedCartItemId] = useState<string | null>(null);

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`flex-1 h-full min-h-0 flex flex-col w-full font-sans overflow-hidden select-none no-print ${theme === 'dark' ? 'bg-[#121213] text-stone-100' : 'bg-slate-50 text-slate-800'}`} id="tab-pos-terminal">

      {/* Terminal Quick Actions Top Bar */}
      <div className={`px-4 py-2.5 flex flex-col md:flex-row-reverse items-center justify-between gap-3 select-none shrink-0 border-b ${theme === 'dark' ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-slate-200'}`}>

        {/* Store Brand, Clock, and Price Mode */}
        <div className="flex flex-wrap items-center gap-3 flex-row-reverse">
          <BeeCashMark className="w-9 h-9 shrink-0" />
          <div className="text-right">
            <h2 className="text-sm font-black text-slate-900 dark:text-white leading-tight">{settings.shopName}</h2>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              <BeeCashWordmark onDark={theme === 'dark'} />
            </p>
          </div>

          <span className="text-slate-300 dark:text-stone-800 self-center hidden sm:inline">|</span>

          {/* Digital Clock */}
          <div className="text-right font-mono text-xs font-black text-slate-600 dark:text-stone-300 flex items-center gap-1 flex-row-reverse">
            <span>🕒</span>
            <span>{new Date().toLocaleDateString(lang === 'ar' ? 'ar-LB' : 'en-US', { day: 'numeric', month: 'short' })}</span>
            <span>-</span>
            <span>{new Date().toLocaleTimeString(lang === 'ar' ? 'ar-LB' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
          </div>

          <span className="text-slate-300 dark:text-stone-800 self-center hidden sm:inline">|</span>

          {/* Retail/Wholesale Toggle */}
          <button 
            onClick={() => {
              const nextType = posSaleType === 'retail' ? 'wholesale' : 'retail';
              setPosSaleType(nextType);
              showToast('success', lang === 'ar' 
                ? `ℹ️ تم التحويل للتسعير بالـ ${nextType === 'wholesale' ? 'جملة' : 'مفرّق'}` 
                : `Switched pricing tier to ${nextType === 'wholesale' ? 'Wholesale' : 'Retail'}`);
            }}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition cursor-pointer flex items-center gap-1.5 border ${posSaleType === 'wholesale' ? 'bg-amber-100 text-amber-800 border-amber-350 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-[#2C2C2E] dark:text-stone-300 dark:border-stone-750'}`}
          >
            <span>{posSaleType === 'wholesale' ? (lang === 'ar' ? 'سعر الجملة' : 'Wholesale') : (lang === 'ar' ? 'سعر المفرّق' : 'Retail')}</span>
          </button>

          {/* Network/Status indicator */}
          <span className="text-slate-300 dark:text-stone-800 self-center hidden sm:inline">|</span>
          <div className="flex items-center gap-1 text-[10px] font-bold text-[#1D9E75] flex-row-reverse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{lang === 'ar' ? 'متصل بالشبكة' : 'Online / Live'}</span>
          </div>
        </div>

        {/* Left side (Action Controls) */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Toggle Sidebar Navigation */}
          <button 
            onClick={() => {
              const sd = document.getElementById('sidebar-navigation');
              if (sd) sd.classList.toggle('hidden');
            }}
            className={`p-2 px-3 rounded-xl transition cursor-pointer text-xs font-bold border flex items-center gap-1.5 flex-row-reverse ${theme === 'dark' ? 'bg-[#2C2C2E] border-stone-750 text-stone-300 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs'}`}
            title={lang === 'ar' ? 'تبديل القائمة الجانبية للنظام' : 'Toggle primary dashboard sidebar'}
          >
            <Menu className="w-3.5 h-3.5 text-stone-400" />
            <span>{lang === 'ar' ? 'القائمة' : 'Menu'}</span>
          </button>

          {/* Exit fullscreen block, let people toggle layout easily in-place */}
          <button 
            onClick={() => {
              setPosLayoutMode('modern');
              setTheme('light');
              showToast('success', lang === 'ar' ? 'تم العودة للشاشة العادية' : 'Returned to Standard POS screen');
            }}
            className="p-2 px-4 rounded-xl transition cursor-pointer text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5 shadow-md flex-row-reverse"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'الانتقال للشاشة العادية' : 'Switch to Standard Screen'}</span>
          </button>

          {/* Fullscreen Toggle */}
          <button 
            onClick={toggleFullScreen}
            className={`p-2 px-3 rounded-xl transition cursor-pointer text-xs font-bold border flex items-center gap-1.5 flex-row-reverse ${theme === 'dark' ? 'bg-[#2C2C2E] border-stone-750 text-stone-350 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs'}`}
            title={lang === 'ar' ? 'تبديل ملء الشاشة' : 'Toggle Fullscreen'}
          >
            <Maximize className="w-3.5 h-3.5 text-stone-400" />
            <span>{lang === 'ar' ? 'ملء الشاشة' : 'Fullscreen'}</span>
          </button>

          {/* Theme Switch */}
          <button 
            onClick={() => {
              const nextTheme = theme === 'dark' ? 'light' : 'dark';
              setTheme(nextTheme);
              showToast('success', lang === 'ar' ? '✓ تم تغيير المظهر المفضل' : `Theme changed to ${nextTheme}`);
            }}
            className={`p-2 px-3 rounded-xl transition cursor-pointer text-xs font-bold border flex items-center gap-1.5 flex-row-reverse ${theme === 'dark' ? 'bg-[#2C2C2E] border-stone-750 text-stone-300 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs'}`}
            title={lang === 'ar' ? 'تبديل المظهر الليلي/النهاري' : 'Toggle Dark/Light Mode'}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-stone-400" />}
            <span>{theme === 'dark' ? (lang === 'ar' ? 'وضع نهاري' : 'Light') : (lang === 'ar' ? 'وضع ليلي' : 'Dark')}</span>
          </button>

          {/* Language switch */}
          <button 
            onClick={() => {
              const nextLang = lang === 'ar' ? 'en' : 'ar';
              setLang(nextLang);
              showToast('success', nextLang === 'ar' ? 'تم تحويل الواجهة للغة العربية' : 'Language switched to English');
            }}
            className={`p-2 px-3 rounded-xl transition cursor-pointer text-xs font-bold border flex items-center gap-1.5 flex-row-reverse ${theme === 'dark' ? 'bg-[#2C2C2E] border-stone-750 text-stone-350 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs'}`}
            title={lang === 'ar' ? 'تغيير لغة الواجهة' : 'Switch System Language'}
          >
            <Globe className="w-3.5 h-3.5 text-stone-400" />
            <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
          </button>

          <button
            onClick={handleLogout}
            className={`p-2 px-3 rounded-xl transition cursor-pointer text-xs font-black border ${theme === 'dark' ? 'bg-rose-950/40 border-rose-900 text-rose-300 hover:bg-rose-900/60' : 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100'}`}
            id="btn-terminal-logout"
          >
            {lang === 'ar' ? 'تسجيل الخروج 👋' : 'Logout 👋'}
          </button>

        </div>
      </div>

      {/* Main Subdivided Content Workspace */}
      <div className={`flex-1 flex flex-col ${lang === 'ar' ? 'md:flex-row-reverse' : 'md:flex-row'} overflow-y-auto md:overflow-hidden w-full min-h-0`} id="terminal-body-wrapper">

        {/* LEFT DIVISION: Cart list, void indicators, Totals Summary (Proportional responsive width) */}
        <div className={`w-full md:w-[42%] md:min-w-[300px] lg:w-[32%] lg:min-w-[400px] lg:max-w-[480px] flex flex-col h-[88vh] md:h-full min-h-0 text-right shrink-0 order-2 md:order-none ${theme === 'dark' ? 'bg-[#141416]' : 'bg-white shadow-md'} ${lang === 'ar' ? (theme === 'dark' ? 'border-l border-[#242426]' : 'border-l border-slate-200') : (theme === 'dark' ? 'border-r border-[#242426]' : 'border-r border-slate-200')}`}>

          {/* Cart Header tool controls */}
          <div className={`p-3 flex items-center justify-between gap-2 shrink-0 border-b ${theme === 'dark' ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-1.5 flex-row-reverse">
              {/* Delete Selected or All */}
              <button 
                onClick={() => {
                  if (selectedCartItemId) {
                    if (voidedCartItemIds.includes(selectedCartItemId)) {
                      setCart(prev => prev.filter(i => i.product.id !== selectedCartItemId));
                      setVoidedCartItemIds(prev => prev.filter(id => id !== selectedCartItemId));
                      setSelectedCartItemId(null);
                      showToast('success', lang === 'ar' ? 'تم مسح الصنف الملغي نهائياً!' : 'Item deleted permanently!');
                    } else {
                      setVoidedCartItemIds(prev => [...prev, selectedCartItemId]);
                      showToast('warning', lang === 'ar' ? '🚨 تم إلغاء الصنف (مشطوب أحمر)' : '🚨 Item voided (red cross)');
                    }
                  } else {
                    if (cart.length > 0) {
                      executeWithAdminAuth(lang === 'ar' ? 'تصفير سلة المبيعات' : 'Clear Sales Register', () => {
                        if (confirm(lang === 'ar' ? 'تأكيد إفراغ سلة المبيعات بالكامل؟' : 'Clear entire sales register?')) {
                          clearCart();
                          setVoidedCartItemIds([]);
                          setSelectedCartItemId(null);
                        }
                      });
                    }
                  }
                }}
                className="bg-[#D32F2F] hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 focus:outline-none"
              >
                <X className="w-3.5 h-3.5" />
                <span>{selectedCartItemId ? (voidedCartItemIds.includes(selectedCartItemId) ? (lang === 'ar' ? 'مسح نهائي' : 'Erase') : (lang === 'ar' ? 'إلغاء صنف' : 'Void Item')) : (lang === 'ar' ? 'تصفير السلة' : 'Clear Bill')}</span>
              </button>

              {/* Multiply/Quantity set */}
              <button 
                onClick={() => {
                  if (selectedCartItemId) {
                    const item = cart.find(i => i.product.id === selectedCartItemId);
                    const currentQty = item ? item.quantity.toString() : '1';

                    setNumpadValue(currentQty);
                    setNumpadTitle(lang === 'ar' ? `تعديل كمية الصنف: ${item?.product.name}` : `Update item quantity: ${item?.product.name}`);
                    setNumpadOnSave({
                      fn: (val) => {
                        const q = parseFloat(val);
                        if (!isNaN(q) && q > 0) {
                          setCart(prev => prev.map(i => i.product.id === selectedCartItemId ? { ...i, quantity: q } : i));
                          if (voidedCartItemIds.includes(selectedCartItemId)) {
                            setVoidedCartItemIds(prev => prev.filter(id => id !== selectedCartItemId));
                          }
                          showToast('success', lang === 'ar' ? 'تم تعديل الكمية بنجاح' : 'Quantity adjusted');
                        } else {
                          showToast('warning', lang === 'ar' ? 'الرجاء إدخال كمية رقمية صحيحة أكبر من صفر' : 'Please enter a valid positive quantity number');
                        }
                      }
                    });
                    setIsNumpadOpen(true);
                  } else {
                    showToast('warning', lang === 'ar' ? 'الرجاء اختيار صنف من قائمة المبيعات أولاً' : 'Select a sales item row first');
                  }
                }}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${theme === 'dark' ? 'bg-[#2C2C2E] hover:bg-zinc-700 text-stone-250' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'}`}
              >
                {lang === 'ar' ? 'الكمية' : 'Quantity'}
              </button>
            </div>

            {/* Left numeric buffer display / Barcode representation */}
            <div className={`border px-3 py-2 rounded-xl font-mono font-bold text-xs tracking-wider shrink-0 min-w-[120px] text-center mb-0 ${theme === 'dark' ? 'bg-[#121213] border-stone-800 text-emerald-400' : 'bg-slate-50 border-slate-200 text-emerald-605 shadow-inner'}`}>
              PLU: {selectedCartItemId ? cart.find(i => i.product.id === selectedCartItemId)?.product.barcode || '1174' : '1174'}
            </div>
          </div>

          {/* Active Register Multi-client tabs strip at the left panel top */}
          <div className={`flex gap-1.5 px-3 py-1.5 border-b overflow-x-auto select-none flex-row-reverse shrink-0 items-center ${theme === 'dark' ? 'bg-[#18181A] border-stone-850' : 'bg-slate-100 border-slate-250'}`}>
            {/* "+" New Session Button right next to sessions */}
            <button 
              onClick={() => {
                addNewSession();
                showToast('success', lang === 'ar' ? 'تم فتح فاتورة معلقة جديدة لزبون آخر' : 'Opened a new suspended client ticket');
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-1 cursor-pointer shrink-0"
              title={lang === 'ar' ? 'فتح زبون/فاتورة معلقة جديدة' : 'Add new suspended sale'}
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'ar' ? 'فاتورة' : 'Sale'}</span>
            </button>

            {sessions.map((sess, idx) => {
              const isActive = sess.id === activeSessionId;
              const hasItems = sess.cart.length > 0;
              return (
                <button
                  key={sess.id}
                  onClick={() => switchSession(sess.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${isActive ? 'bg-[#1D9E75] text-white' : (theme === 'dark' ? 'bg-[#252529] text-stone-400 hover:bg-[#2C2C30]' : 'bg-slate-200 text-slate-600 hover:bg-slate-250 border border-slate-300')}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 inline-block animate-pulse" />
                  <span>{sess.label ? sess.label : (lang === 'ar' ? `زبون #${idx+1}` : `Client #${idx+1}`)}</span>
                  {hasItems && <span className={`text-[9px] px-1.5 rounded-full font-bold ml-1 ${theme === 'dark' ? 'bg-[#121213] text-white' : 'bg-slate-100 text-slate-800'}`}>{sess.cart.length}</span>}
                </button>
              );
            })}
          </div>

          {/* Scrollable Cart items list */}
          <div className="flex-1 overflow-y-auto space-y-0.5 p-2 scrollbar-thin select-none" id="terminal-cart-scroller">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-stone-500 font-bold h-full">
                <ShoppingCart className="w-12 h-12 text-stone-600 mb-3 animate-bounce shadow-sm" />
                <span className="text-xs">{lang === 'ar' ? 'سلة المبيعات فارغة. انقر على المنتجات بالتصنيف لتسجيل المبيعات 🛍️' : 'Cash register empty. Tap products to build invoice.'}</span>
              </div>
            ) : (
              cart.map((item, idx) => {
                const isSelected = selectedCartItemId === item.product.id;
                const isVoided = voidedCartItemIds.includes(item.product.id);
                const isWholesaleMode = posSaleType === 'wholesale';
                const qualifiesByQty = item.quantity >= (item.product.minWholesaleQty || 5);
                const unitPrice = (isWholesaleMode || qualifiesByQty) ? (item.product.priceWholesale || item.product.priceUSD * 0.9) : item.product.priceUSD;

                return (
                  <div 
                    key={item.product.id}
                    onClick={() => setSelectedCartItemId(isSelected ? null : item.product.id)}
                    className={`p-3 rounded-xl cursor-pointer transition flex items-center justify-between gap-3 text-right group-item select-none border-b border-stone-850/40 ${
                      isSelected 
                        ? 'bg-[#0284C7] text-white' 
                        : isVoided 
                        ? 'bg-red-950/40 opacity-60 text-red-500/90' 
                        : theme === 'dark' ? 'bg-transparent hover:bg-[#1E1E20] text-stone-250 border border-transparent hover:border-stone-800' : 'bg-transparent hover:bg-slate-50 text-slate-700 border border-transparent hover:border-slate-200'
                    }`}
                  >

                    {/* Quantity and multipliers at left / right */}
                    <div className="flex items-center gap-2 flex-row-reverse">
                      {/* Quantity number in bold bubble */}
                      <span className={`text-sm font-black font-mono tracking-wide px-2 border rounded-md ${isSelected ? 'bg-sky-750 text-white border-sky-400' : isVoided ? 'bg-stone-900 text-stone-500 border-stone-800' : theme === 'dark' ? 'bg-[#2D2D31] text-stone-100 border-[#3D3D45]' : 'bg-slate-100 text-slate-800 border-slate-300'}`}>
                        x{item.quantity}
                      </span>
                    </div>

                    {/* Center Product Title/PLU block */}
                    <div className="flex-1 min-w-0 pr-1 text-right font-sans flex items-center justify-end gap-2">
                      <div className="truncate flex-1">
                        <div className="flex items-center gap-1.5 justify-end">
                          {isVoided ? (
                            <span className="text-[10px] bg-red-650 text-white font-extrabold px-1 rounded uppercase tracking-wider shrink-0 select-none">
                              {lang === 'ar' ? 'ملغي' : 'VOID'}
                            </span>
                          ) : isSelected ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 animate-pulse" />
                          ) : (
                            <span className="w-1 h-1 rounded-full bg-sky-500 shrink-0" />
                          )}

                          <span className={`text-xs text-right font-extrabold truncate block ${isVoided ? 'line-through text-red-500' : isSelected ? 'text-white font-black' : theme === 'dark' ? 'text-stone-100' : 'text-slate-800'}`}>
                            {item.product.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 justify-end mt-1 text-[10px] font-mono select-none">
                          <span className={isSelected ? 'text-sky-200' : theme === 'dark' ? 'text-stone-400 font-bold' : 'text-slate-500 font-bold'}>
                            ${(unitPrice * item.quantity).toFixed(2)}
                          </span>
                          <span className={theme === 'dark' ? 'text-stone-700' : 'text-slate-300'}>|</span>
                          <span className={isSelected ? 'text-sky-200' : theme === 'dark' ? 'text-stone-400' : 'text-slate-500'}>
                            ${unitPrice.toFixed(2)}
                          </span>
                          <span className={`${theme === 'dark' ? 'text-stone-555' : 'text-slate-400'} font-bold`}># {idx+1}</span>
                        </div>
                      </div>
                      {item.product.image && (
                        <img 
                          src={item.product.image} 
                          alt={item.product.name} 
                          className="w-8 h-8 object-cover rounded-lg border border-stone-800/20 shrink-0" 
                          referrerPolicy="no-referrer" 
                        />
                      )}
                    </div>

                    {/* Leftmost icon indicators */}
                    <div className="shrink-0 flex items-center justify-center">
                      {isVoided ? (
                        <X className="w-4 h-4 text-red-500 shrink-0" />
                      ) : isSelected ? (
                        <Check className="w-4 h-4 text-white shrink-0" />
                      ) : (
                        <Lock className={`w-3.5 h-3.5 shrink-0 ${theme === 'dark' ? 'text-stone-600' : 'text-slate-350'}`} />
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* Calculations Pricing Footer summary */}
          {(() => {
            const activeCart = cart.filter(i => !voidedCartItemIds.includes(i.product.id));
            const subtotal = activeCart.reduce((sum, item) => {
              const isWholesaleMode = posSaleType === 'wholesale';
              const qualifiesByQty = item.quantity >= (item.product.minWholesaleQty || 5);
              const unitPrice = (isWholesaleMode || qualifiesByQty) ? (item.product.priceWholesale || item.product.priceUSD * 0.9) : item.product.priceUSD;
              return sum + (unitPrice * item.quantity);
            }, 0);
            const disc = getCalculatedDiscountUSD(subtotal, discountInput);
            const subtotalAfterDiscount = Math.max(0, subtotal - disc);
            const computedTaxUSD = subtotalAfterDiscount * (taxRate / 100);
            const grandFinalUSD = subtotalAfterDiscount + computedTaxUSD + deliveryUSD;
            const grandFinalLBP = Math.round(grandFinalUSD * settings.exchangeRate);

            const paidUSDVal = parseFloat(paidUSDInput) || 0;
            const paidLBPVal = parseFloat(paidLBPInput) || 0;
            const totalPaidEquivalentUSDVal = paidUSDVal + (paidLBPVal / settings.exchangeRate);
            const isChangeSatisfied = totalPaidEquivalentUSDVal >= grandFinalUSD;
            const changeUSDVal = totalPaidEquivalentUSDVal > grandFinalUSD ? (totalPaidEquivalentUSDVal - grandFinalUSD) : 0;
            const changeLBPVal = changeUSDVal * settings.exchangeRate;

            return (
              <div className={`border-t p-3.5 space-y-3 shrink-0 text-right font-sans transition-colors duration-150 ${theme === 'dark' ? 'bg-[#1C1C1E] border-stone-850' : 'bg-white border-slate-200 shadow-md'}`}>

                {/* Selected Customer indicator (if any) */}
                {selectedCustomerId && (
                  <div className={`p-2 py-1.5 rounded-xl text-xs text-center font-bold flex items-center justify-between gap-1 border ${theme === 'dark' ? 'bg-amber-950/20 border-amber-900/40 text-amber-300' : 'bg-amber-50 border-amber-250 text-amber-800'}`}>
                    <div className="flex items-center gap-1.5 flex-row-reverse">
                      <span>🔗</span>
                      <span>{lang === 'ar' ? 'الزبون:' : 'Customer:'} {customers.find(c => c.id === selectedCustomerId)?.name || 'زبون محدد'}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(null);
                        showToast('warning', lang === 'ar' ? 'تم إلغاء ربط الزبون' : 'Customer unlinked');
                      }}
                      className="text-red-500 hover:text-red-700 font-bold text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Interactive adjustment badges (Discount, Tax, Delivery) in a single compact row */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">

                  {/* Discount adjustment */}
                  <div 
                    onClick={() => {
                      setNumpadValue(discountInput);
                      setNumpadTitle(lang === 'ar' ? 'خصم مالي مباشر ($):' : 'Direct cash discount ($):');
                      setNumpadOnSave({
                        fn: (val) => setDiscountInput(val)
                      });
                      setIsNumpadOpen(true);
                    }}
                    className={`flex items-center gap-1 cursor-pointer rounded-xl px-2.5 py-1.5 border hover:ring-1 hover:ring-emerald-500 transition ${theme === 'dark' ? 'bg-[#121213] border-stone-800 text-stone-300' : 'bg-slate-50 border-slate-200 text-slate-700 shadow-inner'}`}
                  >
                    <span>{lang === 'ar' ? 'الخصم:' : 'Discount:'}</span>
                    <span className="font-mono font-black text-rose-500">$ {disc.toFixed(2)}</span>
                  </div>

                  {/* Tax Adjustment */}
                  <div 
                    onClick={() => {
                      setNumpadValue(taxRate.toString());
                      setNumpadTitle(lang === 'ar' ? 'تحديد وتعديل نسبة الضريبة المئوية (%):' : 'Determine Tax Rate percentage (%):');
                      setNumpadOnSave({
                        fn: (val) => {
                          const rate = parseFloat(val);
                          setTaxRate(isNaN(rate) || rate < 0 ? 0 : rate);
                          showToast('success', lang === 'ar' ? `✓ تم تغيير نسبة الضريبة لـ ${val}%` : `Tax rate changed to ${val}%`);
                        }
                      });
                      setIsNumpadOpen(true);
                    }}
                    className={`flex items-center gap-1 cursor-pointer rounded-xl px-2.5 py-1.5 border hover:ring-1 hover:ring-emerald-500 transition ${theme === 'dark' ? 'bg-[#121213] border-stone-800 text-stone-300' : 'bg-slate-50 border-slate-200 text-slate-700 shadow-inner'}`}
                  >
                    <Percent className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>{lang === 'ar' ? 'الضريبة:' : 'Tax:'} ({taxRate}%)</span>
                    <span className="font-mono font-black">$ {computedTaxUSD.toFixed(2)}</span>
                  </div>

                  {/* Delivery Adjustment */}
                  <div 
                    onClick={() => {
                      setNumpadValue(deliveryUSD.toString());
                      setNumpadTitle(lang === 'ar' ? 'تحديد قيمة قيد الدليفري التوصيل ($):' : 'Enter delivery charge USD ($):');
                      setNumpadOnSave({
                        fn: (val) => {
                          const fee = parseFloat(val);
                          setDeliveryUSD(isNaN(fee) || fee < 0 ? 0 : fee);
                          showToast('success', lang === 'ar' ? `🛵 تم تعيين خدمة الديلفري بقيمة: $${val}` : `Delivery fee updated to $${val}`);
                        }
                      });
                      setIsNumpadOpen(true);
                    }}
                    className={`flex items-center gap-1 cursor-pointer rounded-xl px-2.5 py-1.5 border hover:ring-1 hover:ring-emerald-500 transition ${theme === 'dark' ? 'bg-[#121213] border-stone-800 text-stone-300' : 'bg-slate-50 border-slate-200 text-slate-700 shadow-inner'}`}
                  >
                    <Truck className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>{lang === 'ar' ? 'التوصيل:' : 'Delivery:'}</span>
                    <span className="font-mono font-black">$ {deliveryUSD.toFixed(2)}</span>
                  </div>

                </div>

                {/* Grand Totals Block (Vibrant, Clear) */}
                <div className={`p-3 rounded-2xl flex items-center justify-between gap-4 border ${theme === 'dark' ? 'bg-[#121213] border-stone-800/80 text-white' : 'bg-emerald-50/50 border-emerald-100 text-slate-900'}`}>
                  <div className="text-right">
                    <span className="text-[10px] block font-bold text-slate-400 dark:text-stone-500 uppercase tracking-wider">{lang === 'ar' ? 'المجموع الكلي دولار' : 'Grand Total (USD)'}</span>
                    <span className="text-xl font-black font-mono tracking-tight text-rose-500">
                      $ {grandFinalUSD.toFixed(2)}
                    </span>
                  </div>

                  <div className="text-left">
                    <span className="text-[10px] block font-bold text-slate-400 dark:text-stone-500 uppercase tracking-wider">{lang === 'ar' ? 'المجموع بـ ليرة' : 'Grand Total (LBP)'}</span>
                    <span className="text-xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                      {grandFinalLBP.toLocaleString()} ل.ل
                    </span>
                  </div>
                </div>

                {/* Order Checkout, Cash Drawer and Cancel Buttons Row */}
                <div className="space-y-2 pt-1.5">

                  {/* PRIMARY PAYMENT ACTION (F10) */}
                  <button
                    type="button"
                    onClick={() => {
                      openTouchPayment('cash');
                    }}
                    className="w-full bg-[#1D9E75] hover:bg-[#15805e] active:scale-[0.98] text-white font-black py-3 px-4 rounded-2xl transition shadow-lg shadow-emerald-500/10 text-sm text-center flex items-center justify-center gap-2 cursor-pointer h-12 leading-none"
                  >
                    <CreditCard className="w-4 h-4 shrink-0 animate-pulse" />
                    <span>{lang === 'ar' ? 'دفع وتسجيل الفاتورة [F10]' : 'Quick Checkout & Payment [F10]'}</span>
                  </button>

                  {/* Secondary helper buttons */}
                  <div className="grid grid-cols-3 gap-1.5 w-full">

                    {/* Link Customer */}
                    <button
                      type="button"
                      onClick={triggerCustomerSearch}
                      className={`font-bold py-2 rounded-xl transition border flex items-center justify-center gap-1 cursor-pointer text-[10.5px] h-9 shrink-0 ${theme === 'dark' ? 'bg-[#2C2C2E] border-stone-750 text-stone-300 hover:text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-205 text-slate-700'}`}
                    >
                      <User className="w-3.5 h-3.5 shrink-0" />
                      <span>{lang === 'ar' ? 'ربط زبون' : 'Add Cust'}</span>
                    </button>

                    {/* Open Cash Drawer */}
                    <button
                      type="button"
                      onClick={openCashDrawer}
                      className={`font-bold py-2 rounded-xl transition border flex items-center justify-center gap-1 cursor-pointer text-[10.5px] h-9 shrink-0 ${theme === 'dark' ? 'bg-[#2C2C2E] border-stone-750 text-stone-300 hover:text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-205 text-slate-700'}`}
                    >
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{lang === 'ar' ? 'درج كاش' : 'Drawer'}</span>
                    </button>

                    {/* Comment/Note */}
                    <button
                      type="button"
                      onClick={() => {
                        const r = prompt(lang === 'ar' ? 'أدخل ملاحظة قصيرة لبيان الفاتورة:' : 'Enter statement comment:', noteInput);
                        if (r !== null) {
                          setNoteInput(r);
                          showToast('success', lang === 'ar' ? `📝 تم تسجيل الملاحظة: ${r}` : `Invoice comment: ${r}`);
                        }
                      }}
                      className={`font-bold py-2 rounded-xl transition border flex items-center justify-center gap-1 cursor-pointer text-[10.5px] h-9 shrink-0 ${theme === 'dark' ? 'bg-[#2C2C2E] border-stone-750 text-stone-300 hover:text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-205 text-slate-700'}`}
                    >
                      <MessageSquare className={`w-3.5 h-3.5 ${noteInput ? 'text-amber-500' : 'text-slate-400'}`} />
                      <span>{noteInput ? (lang === 'ar' ? 'ملاحظة ✓' : 'Note ✓') : (lang === 'ar' ? 'ملاحظة' : 'Comment')}</span>
                    </button>

                  </div>

                  {/* Quick Cash Sale direct bypass */}
                  <div className="grid grid-cols-2 gap-1.5 w-full pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        // Direct Cash pay bypasses modal with cash method
                        handleCheckout();
                      }}
                      className="bg-sky-600 hover:bg-sky-750 text-white font-bold py-2 rounded-xl transition text-[10px] h-8 flex items-center justify-center gap-1 cursor-pointer shrink-0"
                    >
                      <Save className="w-3.5 h-3.5 shrink-0" />
                      <span>{lang === 'ar' ? 'حفظ بدون طباعة' : 'Save (No Print)'}</span>
                    </button>

                    <button 
                      type="button"
                      onClick={() => {
                        executeWithAdminAuth(lang === 'ar' ? 'تصفير سلة المبيعات' : 'Clear Sales Register', () => {
                          if (confirm(lang === 'ar' ? 'تأكيد إفراغ سلة المبيعات بالكامل؟' : 'Clear entire sales register?')) {
                            clearCart();
                            setVoidedCartItemIds([]);
                            setSelectedCartItemId(null);
                          }
                        });
                      }}
                      className="bg-red-600/10 hover:bg-red-600/20 text-red-600 border border-red-200/40 dark:border-red-900/40 font-bold py-2 rounded-xl transition text-[10px] h-8 flex items-center justify-center gap-1 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{lang === 'ar' ? 'تصفير السلة' : 'Clear Bill'}</span>
                    </button>
                  </div>

                </div>

              </div>
            );
          })()}

        </div>

        {/* RIGHT DIVISION: Product search, fast categories quick-actions, and product square-cards grid (Width: 60% - 62%) */}
        <div className={`flex-grow flex-1 basis-auto md:basis-0 h-[75vh] md:h-full shrink-0 md:shrink flex flex-col p-3 overflow-hidden text-right font-sans transition-colors duration-150 max-w-none w-full ${theme === 'dark' ? 'bg-[#111112] text-stone-100' : 'bg-slate-100 text-slate-800'}`} style={{ flexGrow: 1 }}>

          {/* Category filters, Search input, virtual keyboard layout */}
          <div className={`flex flex-col sm:flex-row items-center gap-2 p-2 rounded-xl border justify-between shrink-0 mb-3 select-none flex-row-reverse transition-colors duration-150 ${theme === 'dark' ? 'bg-[#1C1C1E] border-stone-850' : 'bg-white border-slate-250 shadow-xs'}`}>

            {/* Left Quick categories keys switcher */}
            <div className="flex items-center gap-1 flex-row-reverse shrink-0">
              <button 
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setTerminalProductPage(0);
                }}
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm transition cursor-pointer ${
                  selectedCategory === 'all' 
                    ? 'bg-[#1D9E75] text-white shadow-md shadow-emerald-500/10' 
                    : (theme === 'dark' ? 'bg-[#2C2C2E] text-stone-400 hover:bg-stone-750' : 'bg-slate-200 text-slate-700 hover:bg-slate-300')
                }`}
                title={lang === 'ar' ? 'عرض جميع الأصناف' : 'All categories'}
              >
                *
              </button>

              {/* Interactive Barcode simulated button */}
              <button 
                type="button"
                onClick={() => {
                  setNumpadValue('');
                  setNumpadTitle(lang === 'ar' ? 'أدخل الباركود أو رقم الصنف (PLU) للمحاكاة:' : 'Simulate scan: Enter barcode or PLU code:');
                  setNumpadOnSave({
                    fn: (bar) => {
                      if (bar) {
                        const trimmedBar = bar.trim();
                        setBarcodeInput(trimmedBar);
                        const p = products.find(prod => prod.barcode === trimmedBar || (prod.barcodes && prod.barcodes.includes(trimmedBar)));
                        if (p) {
                          addToCart(p);
                          showToast('success', `${lang === 'ar' ? 'تم جلب الصنف لـ السلة:' : 'Scanned item:'} ${p.name}`);
                        } else {
                          showToast('error', lang === 'ar' ? 'خطأ! لم يتم العثور على باركود صنف مطابق' : 'Barcode not found!');
                        }
                      }
                    }
                  });
                  setIsNumpadOpen(true);
                }}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition cursor-pointer ${
                  theme === 'dark' ? 'bg-[#2C2C2E] hover:bg-stone-750 text-stone-400' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
                title={lang === 'ar' ? 'محاكاة قارئ الباركود البصري' : 'Simulate barcode scan'}
              >
                ||||
              </button>

              {/* Blue Price tag / promos filters */}
              <button 
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                  setTerminalProductPage(0);
                  showToast('success', lang === 'ar' ? 'تم إعادة تهيئة الفلترة بالكامل' : 'Filters rebooted');
                }}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition cursor-pointer font-sans ${
                  theme === 'dark' ? 'bg-[#2C2C2E] hover:bg-[#3D3D43] text-sky-450' : 'bg-slate-200 hover:bg-slate-300 text-sky-600'
                }`}
                title={lang === 'ar' ? 'تصفير وعرض كافة الأصناف' : 'Reset and display all'}
              >
                <Tag className="w-4 h-4 text-sky-450" />
              </button>
            </div>

            {/* Right core products search box with keyboard icon */}
            <div className="relative w-full sm:w-72 select-none shrink-0 text-right">
              <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none select-none">
                <Search className="w-4 h-4 text-stone-500" />
              </span>
              <input 
                id="terminal-product-search-input"
                type="text"
                placeholder={lang === 'ar' ? 'ابحث باسم المنتج أو الباركود... [F1]' : 'Search catalog products...'}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setTerminalProductPage(0);
                }}
                className={`w-full border rounded-xl py-2 pr-9 pl-9 text-xs text-right font-extrabold focus:outline-none focus:ring-1 ${
                  theme === 'dark' 
                    ? 'bg-[#121213] border-stone-800 text-stone-250 focus:border-sky-500 focus:ring-sky-500' 
                    : 'bg-white border-slate-300 text-slate-850 focus:border-emerald-500 focus:ring-emerald-500 shadow-inner'
                }`}
              />
              <span 
                onClick={() => {
                  const val = prompt(lang === 'ar' ? 'أدخل مصطلح البحث للوحة الافتراضية:' : 'Enter virtual keyboard search term:', searchQuery);
                  if (val !== null) {
                    setSearchQuery(val);
                    setTerminalProductPage(0);
                  }
                }}
                className={`absolute inset-y-0 left-3 flex items-center font-mono text-[9px] font-bold select-none cursor-pointer ${
                  theme === 'dark' ? 'text-stone-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'
                }`}
                title="Virtual Keyboard"
              >
                ⌨️
              </span>
            </div>

            {/* Category selectors dropdown on right */}
            <div className="flex-1 text-right select-none w-full sm:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setTerminalProductPage(0);
                }}
                className={`w-full sm:w-52 border rounded-xl py-2 px-3 text-xs text-right font-bold focus:outline-none cursor-pointer ${
                  theme === 'dark' 
                    ? 'bg-[#121213] border-stone-800 text-stone-300' 
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="all" className={theme === 'dark' ? 'bg-[#121213] text-stone-100' : 'bg-white text-slate-800'}>{lang === 'ar' ? 'جميع الأقسام والأصناف' : 'All categories'}</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id} className={theme === 'dark' ? 'bg-[#121213] text-stone-100' : 'bg-white text-slate-800'}>{c.name}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Horizontal Quick Promos & Offers Row for Terminal */}
          {promotions.length > 0 && (
            <div className="bg-[#020069] border border-[#d4af37]/30 rounded-xl p-2.5 mb-2 text-right select-none shadow-md" id="terminal-promos-row">
              <div className="flex items-center gap-1.5 flex-row-reverse mb-1.5 text-[#d4af37] font-black text-[11px]">
                <span className="w-1.5 h-1.5 bg-[#d4af37] rounded-full animate-ping"></span>
                <span>{lang === 'ar' ? 'العروض النشطة اليوم (اضغط للإضافة مباشرة):' : "Active Promo Deals (Tap to Add):"}</span>
              </div>
              <div className="flex flex-row-reverse gap-2 overflow-x-auto pb-0.5 scrollbar-thin">
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
                      className="shrink-0 bg-[#d4af37] hover:bg-[#c29d2c] border border-[#b89524] rounded-lg px-2.5 py-1 text-right flex items-center gap-1.5 hover:shadow-md transition-all cursor-pointer text-[10.5px] font-black text-[#020069] flex-row-reverse"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#020069] animate-pulse shrink-0"></span>
                      <span className="truncate max-w-[200px]">{promoLabel}</span>
                      <span className="text-[9px] font-black font-sans bg-[#020069]/15 text-[#020069] px-1.5 py-0.5 rounded shrink-0">
                        {promo.type === 'percentage' ? `-%${promo.value}` : promo.type === 'bxgy' ? `${promo.buyX}+${promo.getY}` : `$${promo.value}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {(() => {
            const filtered = processedProducts
              .filter(p => selectedCategory === 'all' || p.category === selectedCategory || (selectedCategory === 'promotions' && p.priceWholesale))
              .filter(p => !searchQuery || p.name.includes(searchQuery) || p.barcode.includes(searchQuery) || (p.barcodes && p.barcodes.some(b => b.includes(searchQuery))));

            const itemsPerPage = terminalItemsPerPage;
            const pagesCount = Math.ceil(filtered.length / itemsPerPage) || 1;
            const currentPage = Math.min(terminalProductPage, pagesCount - 1);
            const pageSlice = filtered.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

            return (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden" id="terminal-grid-wrapper">

                {/* Scrollable grid container for products */}
                <div className="flex-1 overflow-y-auto pr-1 select-none" id="terminal-grid-panel">
                  {filtered.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center p-14 font-bold rounded-2xl border border-dashed my-4 ${theme === 'dark' ? 'text-stone-500 bg-[#151517] border-stone-850' : 'text-slate-400 bg-slate-50 border-slate-200'}`}>
                      😞 {lang === 'ar' ? 'عفواً! لم يتم العثور على أي منتج مطابق في المتجر.' : 'No terminal items matched.'}
                    </div>
                  ) : (
                    <div className="grid gap-4 py-1 font-sans" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 185px), 1fr))' }}>
                      {pageSlice.map((prod) => {
                        const isOut = prod.quantity <= 0;
                        return (
                          <div
                            key={prod.id}
                            onClick={() => {
                              if (!isOut) {
                                handleProductClick(prod);
                              } else {
                                showToast('error', lang === 'ar' ? 'عفواً! هذا الصنف نافذ تماماً من المخزن!' : 'Item out of stock!');
                              }
                            }}
                            className={`col-span-1 border select-none cursor-pointer rounded-xl p-3 text-center transition-all duration-150 flex flex-col justify-between h-36 hover:-translate-y-0.5 active:scale-95 ${
                              theme === 'dark' 
                                ? 'border-[#2B2B2F] bg-[#1E1E20] hover:border-sky-500 text-stone-100' 
                                : 'border-slate-300 bg-white hover:border-emerald-500 hover:bg-emerald-50/20 text-slate-800 shadow-xs'
                            } ${isOut ? 'opacity-40 border-stone-900 bg-[#121213] cursor-not-allowed' : ''}`}
                          >

                            {/* Out indicator */}
                            <div className="h-4 flex items-center justify-between flex-row-reverse text-[9px] sm:text-[10px]">
                              {isOut ? (
                                <span className="bg-red-650 text-white font-extrabold px-1.5 py-0.5 rounded select-none">
                                  {lang === 'ar' ? 'نافذ' : 'OUT'}
                                </span>
                              ) : prod.quantity < 5 ? (
                                <span className="bg-yellow-650 text-stone-950 font-black px-1.5 py-0.5 rounded animate-pulse select-none">
                                  {lang === 'ar' ? 'محدود' : 'LOW'}
                                </span>
                              ) : (
                                <span className="text-stone-500 font-bold">Qty: {prod.quantity}</span>
                              )}
                              <span className="text-stone-500 font-mono tracking-wider">#{prod.barcode.slice(-4)}</span>
                            </div>

                            {prod.image && (
                              <div className="w-full h-11 my-1 overflow-hidden rounded-lg border border-stone-800/10 bg-stone-900/5 flex items-center justify-center">
                                <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                            )}

                            {/* Name block - Made compact with slightly smaller text and bounding box */}
                            <div className={`font-black text-xs sm:text-sm leading-tight line-clamp-2 py-1 px-0.5 text-ellipsis overflow-hidden ${prod.image ? 'h-8' : 'h-12'}`} title={prod.name}>
                              {prod.name}
                            </div>

                            {/* Price and pricing tag */}
                            <div className={`flex items-center justify-between border-t pt-1 flex-row-reverse font-sans ${theme === 'dark' ? 'border-stone-850' : 'border-slate-100'}`}>
                              <span className={`text-xs sm:text-sm font-black font-mono ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                ${prod.priceUSD.toFixed(2)}
                              </span>
                              <span className="text-[10px] font-black text-[#1D9E75] font-mono">
                                {Math.round(prod.priceUSD * settings.exchangeRate).toLocaleString()} L.L
                              </span>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Pagination footer bar at bottom with interactive items-per-page selector */}
                <div className={`border p-2 text-xs rounded-xl flex items-center justify-between flex-row-reverse select-none shrink-0 mt-3 font-sans ${theme === 'dark' ? 'bg-[#1C1C1E] border-stone-850' : 'bg-white border-slate-300 shadow-xs'}`}>

                  {/* Page navigation indicators */}
                  <span className={`font-extrabold font-mono select-none ${theme === 'dark' ? 'text-stone-400' : 'text-slate-600'}`}>
                    {lang === 'ar' ? 'الصفحة' : 'Page'} <span className={theme === 'dark' ? 'text-stone-100 font-black' : 'text-slate-900 font-black'}>{currentPage + 1}</span> / {pagesCount}
                  </span>

                  {/* Items per page selector */}
                  <div className="flex items-center gap-1.5 flex-row-reverse font-bold select-none text-[10.5px]">
                    <span className={theme === 'dark' ? 'text-stone-400' : 'text-slate-600'}>{lang === 'ar' ? 'عرض بالصفحة:' : 'Show per page:'}</span>
                    <select
                      value={terminalItemsPerPage}
                      onChange={(e) => {
                        setTerminalItemsPerPage(parseInt(e.target.value));
                        setTerminalProductPage(0);
                      }}
                      className={`rounded-lg px-2 py-1 text-xs font-black cursor-pointer focus:outline-none ${theme === 'dark' ? 'bg-[#121213] text-stone-250 border-stone-800' : 'bg-slate-50 text-slate-800 border-slate-300'}`}
                    >
                      <option value="6">6</option>
                      <option value="8">8</option>
                      <option value="12">12</option>
                      <option value="16">16</option>
                      <option value="20">20</option>
                      <option value="24">24</option>
                      <option value="32">32</option>
                      <option value="48">48</option>
                    </select>
                  </div>

                  {/* Home back and fast arrows */}
                  <div className="flex items-center gap-1 flex-row-reverse select-none">

                    {/* First page */}
                    <button 
                      type="button"
                      onClick={() => setTerminalProductPage(0)}
                      disabled={currentPage === 0}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition disabled:opacity-30 cursor-pointer text-[10px] font-black ${
                        theme === 'dark' 
                          ? 'bg-[#2C2C2E] text-stone-250 hover:bg-stone-750 disabled:hover:bg-[#2C2C2E]' 
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:hover:bg-slate-200'
                      }`}
                    >
                      |&lt;
                    </button>

                    {/* Previous page */}
                    <button 
                      type="button"
                      onClick={() => setTerminalProductPage(p => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition disabled:opacity-30 cursor-pointer text-[10px] font-black ${
                        theme === 'dark' 
                          ? 'bg-[#2C2C2E] text-stone-250 hover:bg-stone-750 disabled:hover:bg-[#2C2C2E]' 
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:hover:bg-slate-200'
                      }`}
                    >
                      &lt;
                    </button>

                    {/* Home Category button */}
                    <button 
                      type="button"
                      onClick={() => {
                        setSelectedCategory('all');
                        setSearchQuery('');
                        setTerminalProductPage(0);
                        showToast('success', lang === 'ar' ? '🏠 تم العودة للرئيسية وتفريغ البحث' : 'Reset category catalog');
                      }}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center transition cursor-pointer ${
                        theme === 'dark' 
                          ? 'bg-[#222] border-stone-800 text-stone-300 hover:text-white' 
                          : 'bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300'
                      }`}
                      title="Home"
                    >
                      <Home className="w-4 h-4" />
                    </button>

                    {/* Next page */}
                    <button 
                      type="button"
                      onClick={() => setTerminalProductPage(p => Math.min(pagesCount - 1, p + 1))}
                      disabled={currentPage === pagesCount - 1}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition disabled:opacity-30 cursor-pointer text-[10px] font-black ${
                        theme === 'dark' 
                          ? 'bg-[#2C2C2E] text-stone-250 hover:bg-stone-750 disabled:hover:bg-[#2C2C2E]' 
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:hover:bg-slate-200'
                      }`}
                    >
                      &gt;
                    </button>

                    {/* Last page */}
                    <button 
                      type="button"
                      onClick={() => setTerminalProductPage(pagesCount - 1)}
                      disabled={currentPage === pagesCount - 1}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition disabled:opacity-30 cursor-pointer text-[10px] font-black ${
                        theme === 'dark' 
                          ? 'bg-[#2C2C2E] text-stone-250 hover:bg-stone-750 disabled:hover:bg-[#2C2C2E]' 
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:hover:bg-slate-200'
                      }`}
                    >
                      &gt;|
                    </button>

                  </div>

                </div>
              </div>
            );
          })()}

        </div>

      </div>

    </div>
  );
}
