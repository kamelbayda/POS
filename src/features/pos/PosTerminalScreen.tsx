import type { PosRegister } from './usePosRegister';
import { ShoppingCart, Globe, Sun, Moon, Maximize, Menu, Monitor, X, Plus, CreditCard, User, DollarSign, MessageSquare, Save, Trash2, Search, Pin, ScanBarcode, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product, Category, CartItem, SystemSettings, Promotion, Customer, CartSession } from '../../types';
import React, { useState } from 'react';
import { BeeCashMark, BeeCashWordmark } from '../../components/BeeCashLogo';
import { matchesProductSearch } from '../../lib/productSearch';
import * as storage from '../../lib/storage';
import { categoryIdOf } from '../../lib/categories';

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
  /** Phone shops: service tiles on the till home open these sections. */
  businessType?: 'supermarket' | 'phones';
  onOpenTab?: (tab: string) => void;
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
  businessType,
  onOpenTab,
}: PosTerminalScreenProps) {
  // Till home tiles the cashier pinned stay first, in the order they were pinned (per shop, per device)
  const [pinnedTiles, setPinnedTiles] = storage.useStoredState<string[]>('pos_pinned_tiles', []);
  const togglePin = (id: string) => setPinnedTiles(pinnedTiles.includes(id) ? pinnedTiles.filter(t => t !== id) : [...pinnedTiles, id]);
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
    scanCode,
    handleProductClick,
    clearCart,
    triggerCustomerSearch,
    getCalculatedDiscountUSD,
    handleCheckout,
    openTouchPayment,
  } = register;
  const [selectedCartItemId, setSelectedCartItemId] = useState<string | null>(null);

  const ar = lang === 'ar';
  const unitPriceOf = (item: CartItem) => {
    const qualifiesByQty = item.quantity >= (item.product.minWholesaleQty || 5);
    return (posSaleType === 'wholesale' || qualifiesByQty) ? (item.product.priceWholesale || item.product.priceUSD * 0.9) : item.product.priceUSD;
  };
  const clearWholeBill = () => {
    if (cart.length === 0) return;
    executeWithAdminAuth(ar ? 'تصفير سلة المبيعات' : 'Clear Sales Register', () => {
      if (confirm(ar ? 'تأكيد إفراغ سلة المبيعات بالكامل؟' : 'Clear entire sales register?')) {
        clearCart();
        setVoidedCartItemIds([]);
        setSelectedCartItemId(null);
      }
    });
  };
  const askNumber = (title: string, value: string, fn: (val: string) => void) => {
    setNumpadValue(value);
    setNumpadTitle(title);
    setNumpadOnSave({ fn });
    setIsNumpadOpen(true);
  };

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="till flex-1 h-full min-h-0 flex flex-col w-full font-sans overflow-hidden select-none no-print" id="tab-pos-terminal">

      {/* Top bar: shop, time and price mode on one side, screen controls on the other */}
      <div className="till-bar px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <BeeCashMark className="w-9 h-9 shrink-0" />
          <div>
            <div className="till-shop leading-tight">{settings.shopName}</div>
            <div className="text-[11px] till-muted font-semibold">
              {new Date().toLocaleDateString(ar ? 'ar-LB' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' '}
              {new Date().toLocaleTimeString(ar ? 'ar-LB' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <span className="till-sep hidden sm:block" />
          {/* Retail / wholesale */}
          <div className="flex items-center gap-1" role="group" aria-label={ar ? 'نوع السعر' : 'Price tier'}>
            {(['retail', 'wholesale'] as const).map(t => (
              <button key={t} type="button"
                onClick={() => {
                  if (posSaleType === t) return;
                  setPosSaleType(t);
                  showToast('success', ar ? `صار التسعير ${t === 'wholesale' ? 'بالجملة' : 'بالمفرّق'}` : `Pricing: ${t === 'wholesale' ? 'wholesale' : 'retail'}`);
                }}
                className={`till-btn ${posSaleType === t ? 'is-on' : ''}`}>
                {t === 'retail' ? (ar ? 'مفرّق' : 'Retail') : (ar ? 'جملة' : 'Wholesale')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className="till-btn till-btn-quiet"
            onClick={() => { const sd = document.getElementById('sidebar-navigation'); if (sd) sd.classList.toggle('hidden'); }}
            title={ar ? 'إظهار أو إخفاء القائمة الجانبية' : 'Show or hide the side menu'}>
            <Menu /><span>{ar ? 'القائمة' : 'Menu'}</span>
          </button>
          <button type="button" className="till-btn till-btn-quiet"
            onClick={() => { setPosLayoutMode('modern'); setTheme('light'); showToast('success', ar ? 'رجعت للشاشة العادية' : 'Back to the standard screen'); }}>
            <Monitor /><span>{ar ? 'الشاشة العادية' : 'Standard screen'}</span>
          </button>
          <button type="button" className="till-btn till-btn-quiet" onClick={toggleFullScreen} title={ar ? 'ملء الشاشة' : 'Fullscreen'}>
            <Maximize /><span className="hidden lg:inline">{ar ? 'ملء الشاشة' : 'Fullscreen'}</span>
          </button>
          <button type="button" className="till-btn till-btn-quiet"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? (ar ? 'وضع نهاري' : 'Light mode') : (ar ? 'وضع ليلي' : 'Dark mode')}>
            {theme === 'dark' ? <Sun /> : <Moon />}<span className="hidden lg:inline">{theme === 'dark' ? (ar ? 'نهاري' : 'Light') : (ar ? 'ليلي' : 'Dark')}</span>
          </button>
          <button type="button" className="till-btn till-btn-quiet" onClick={() => setLang(ar ? 'en' : 'ar')}>
            <Globe /><span>{ar ? 'English' : 'العربية'}</span>
          </button>
          <button type="button" onClick={handleLogout} className="till-btn till-btn-danger" id="btn-terminal-logout">
            {ar ? 'تسجيل الخروج' : 'Log out'}
          </button>
        </div>
      </div>

      {/* Receipt on one side, catalogue on the other */}
      <div className={`flex-1 flex flex-col ${ar ? 'md:flex-row-reverse' : 'md:flex-row'} overflow-y-auto md:overflow-hidden w-full min-h-0`} id="terminal-body-wrapper">

        {/* THE RECEIPT */}
        <div className={`till-receipt w-full md:w-[42%] md:min-w-[300px] lg:w-[34%] lg:min-w-[380px] lg:max-w-[480px] flex flex-col h-[88vh] md:h-full min-h-0 shrink-0 order-2 md:order-none ${ar ? 'border-l' : 'border-r'}`} style={{ borderColor: 'var(--till-line)' }}>

          {/* Open bills */}
          <div className="till-tabs flex items-end gap-1 px-2 pt-2 overflow-x-auto shrink-0">
            {sessions.map((sess, idx) => {
              const isActive = sess.id === activeSessionId;
              return (
                <button key={sess.id} type="button" onClick={() => switchSession(sess.id)} className={`till-tab ${isActive ? 'is-active' : ''}`}>
                  {sess.label ? sess.label : (ar ? `زبون ${idx + 1}` : `Customer ${idx + 1}`)}
                  {sess.cart.length > 0 && <span className="till-count">{sess.cart.length}</span>}
                </button>
              );
            })}
            <button type="button"
              onClick={() => { addNewSession(); showToast('success', ar ? 'فُتحت فاتورة جديدة لزبون آخر' : 'New bill opened for another customer'); }}
              className="till-tab inline-flex items-center gap-1" title={ar ? 'فاتورة جديدة لزبون آخر' : 'New bill for another customer'}>
              <Plus className="w-3.5 h-3.5" /><span>{ar ? 'فاتورة' : 'Bill'}</span>
            </button>
          </div>

          {/* Selected line actions */}
          {selectedCartItemId && (() => {
            const item = cart.find(i => i.product.id === selectedCartItemId);
            const isVoided = voidedCartItemIds.includes(selectedCartItemId);
            return (
              <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--till-line)', background: 'var(--till-sunken)' }}>
                <span className="text-xs font-bold truncate flex-1">{item?.product.name}</span>
                <button type="button" className="till-btn"
                  onClick={() => askNumber(ar ? `كمية ${item?.product.name}` : `Quantity of ${item?.product.name}`, item ? item.quantity.toString() : '1', (val) => {
                    const q = parseFloat(val);
                    if (!isNaN(q) && q > 0) {
                      setCart(prev => prev.map(i => i.product.id === selectedCartItemId ? { ...i, quantity: q } : i));
                      if (isVoided) setVoidedCartItemIds(prev => prev.filter(id => id !== selectedCartItemId));
                      showToast('success', ar ? 'تعدّلت الكمية' : 'Quantity changed');
                    } else {
                      showToast('warning', ar ? 'اكتب كمية أكبر من صفر' : 'Enter a quantity above zero');
                    }
                  })}>
                  {ar ? 'الكمية' : 'Quantity'}
                </button>
                <button type="button" className="till-btn till-btn-danger"
                  onClick={() => {
                    if (isVoided) {
                      setCart(prev => prev.filter(i => i.product.id !== selectedCartItemId));
                      setVoidedCartItemIds(prev => prev.filter(id => id !== selectedCartItemId));
                      setSelectedCartItemId(null);
                      showToast('success', ar ? 'انمسح الصنف من الفاتورة' : 'Item removed from the bill');
                    } else {
                      setVoidedCartItemIds(prev => [...prev, selectedCartItemId]);
                      showToast('warning', ar ? 'انشطب الصنف. اضغط "مسح نهائي" لتشيلو' : 'Item voided. Tap "Remove" to take it off');
                    }
                  }}>
                  <X />{isVoided ? (ar ? 'مسح نهائي' : 'Remove') : (ar ? 'إلغاء الصنف' : 'Void item')}
                </button>
              </div>
            );
          })()}

          {/* Lines */}
          <div className="flex-1 overflow-y-auto select-none" id="terminal-cart-scroller">
            {cart.length === 0 ? (
              <div className="till-empty h-full flex flex-col items-center justify-center gap-3 p-10 text-center">
                <ShoppingCart className="w-9 h-9 opacity-40" />
                <span>{ar ? 'الفاتورة فاضية. اضغط على صنف أو امسح الباركود.' : 'The bill is empty. Tap an item or scan a barcode.'}</span>
              </div>
            ) : (
              cart.map(item => {
                const isSelected = selectedCartItemId === item.product.id;
                const isVoided = voidedCartItemIds.includes(item.product.id);
                const unitPrice = unitPriceOf(item);
                return (
                  <div key={item.product.id}
                    onClick={() => setSelectedCartItemId(isSelected ? null : item.product.id)}
                    className={`till-line flex items-start gap-3 ${isSelected ? 'is-selected' : ''} ${isVoided ? 'is-void' : ''}`}>
                    {item.product.image && (
                      <img src={item.product.image} alt="" className="w-9 h-9 object-cover rounded-md shrink-0" referrerPolicy="no-referrer" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="till-line-name truncate">{item.product.name}</div>
                      <div className="till-line-meta">
                        <span dir="ltr">{item.quantity} × ${unitPrice.toFixed(2)}</span>{isVoided ? (ar ? '، ملغي' : ', voided') : ''}
                      </div>
                      {(item.serials || []).length > 0 && (
                        <div className="till-line-meta" dir="ltr" data-cart-serials>{(item.serials || []).join(', ')}</div>
                      )}
                    </div>
                    <div className="till-line-total shrink-0">${(unitPrice * item.quantity).toFixed(2)}</div>
                  </div>
                );
              })
            )}
          </div>

          {/* Totals and payment */}
          {(() => {
            const activeCart = cart.filter(i => !voidedCartItemIds.includes(i.product.id));
            const subtotal = activeCart.reduce((sum, item) => sum + unitPriceOf(item) * item.quantity, 0);
            const disc = getCalculatedDiscountUSD(subtotal, discountInput);
            const subtotalAfterDiscount = Math.max(0, subtotal - disc);
            const computedTaxUSD = subtotalAfterDiscount * (taxRate / 100);
            const grandFinalUSD = subtotalAfterDiscount + computedTaxUSD + deliveryUSD;
            const grandFinalLBP = Math.round(grandFinalUSD * settings.exchangeRate);
            const itemsCount = activeCart.reduce((n, i) => n + i.quantity, 0);

            return (
              <div className="p-3 space-y-2.5 shrink-0" style={{ borderTop: '1px solid var(--till-line)' }}>

                {selectedCustomerId && (
                  <div className="flex items-center justify-between gap-2 text-sm font-bold px-1">
                    <span className="flex items-center gap-1.5 min-w-0"><User className="w-4 h-4 shrink-0 till-muted" /><span className="truncate">{customers.find(c => c.id === selectedCustomerId)?.name || (ar ? 'زبون' : 'Customer')}</span></span>
                    <button type="button" className="till-btn till-btn-quiet" style={{ height: 28 }}
                      onClick={() => { setSelectedCustomerId(null); showToast('warning', ar ? 'انفصل الزبون عن الفاتورة' : 'Customer removed from the bill'); }}
                      aria-label={ar ? 'إزالة الزبون' : 'Remove customer'}>
                      <X />
                    </button>
                  </div>
                )}

                {/* Discount, VAT and delivery */}
                <div className="flex gap-1.5">
                  <button type="button" className="till-adjust"
                    onClick={() => askNumber(ar ? 'خصم على الفاتورة ($)' : 'Discount on the bill ($)', discountInput, (val) => setDiscountInput(val))}>
                    <span>{ar ? 'خصم' : 'Discount'}</span><span>${disc.toFixed(2)}</span>
                  </button>
                  <button type="button" className="till-adjust"
                    onClick={() => askNumber(ar ? 'نسبة الضريبة (%)' : 'Tax rate (%)', taxRate.toString(), (val) => {
                      const rate = parseFloat(val);
                      setTaxRate(isNaN(rate) || rate < 0 ? 0 : rate);
                    })}>
                    <span>{ar ? `ضريبة ${taxRate}%` : `Tax ${taxRate}%`}</span><span>${computedTaxUSD.toFixed(2)}</span>
                  </button>
                  <button type="button" className="till-adjust"
                    onClick={() => askNumber(ar ? 'كلفة التوصيل ($)' : 'Delivery fee ($)', deliveryUSD.toString(), (val) => {
                      const fee = parseFloat(val);
                      setDeliveryUSD(isNaN(fee) || fee < 0 ? 0 : fee);
                    })}>
                    <span>{ar ? 'توصيل' : 'Delivery'}</span><span>${deliveryUSD.toFixed(2)}</span>
                  </button>
                </div>

                {/* The register display */}
                <div className="till-display" id="terminal-total-display">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="till-display-label">{ar ? `المجموع (${itemsCount} ${itemsCount === 1 ? 'قطعة' : 'قطع'})` : `Total (${itemsCount} ${itemsCount === 1 ? 'piece' : 'pieces'})`}</span>
                    <span className="till-display-lbp" dir="ltr">{grandFinalLBP.toLocaleString()} {ar ? 'ل.ل' : 'LBP'}</span>
                  </div>
                  <div className="till-display-usd mt-2" dir="ltr" style={{ textAlign: ar ? 'right' : 'left' }}>${grandFinalUSD.toFixed(2)}</div>
                </div>

                <button type="button" className="till-pay" onClick={() => openTouchPayment('cash')}>
                  <CreditCard className="w-5 h-5" />
                  <span>{ar ? 'دفع' : 'Pay'}</span>
                  <kbd>F10</kbd>
                </button>

                <div className="grid grid-cols-3 gap-1.5">
                  <button type="button" className="till-btn" onClick={triggerCustomerSearch}><User /><span>{ar ? 'زبون' : 'Customer'}</span></button>
                  <button type="button" className="till-btn" onClick={openCashDrawer}><DollarSign /><span>{ar ? 'فتح الدرج' : 'Drawer'}</span></button>
                  <button type="button" className={`till-btn ${noteInput ? 'is-on' : ''}`}
                    onClick={() => {
                      const r = prompt(ar ? 'ملاحظة على الفاتورة:' : 'Note on the bill:', noteInput);
                      if (r !== null) setNoteInput(r);
                    }}>
                    <MessageSquare /><span>{ar ? 'ملاحظة' : 'Note'}</span>
                  </button>
                  <button type="button" className="till-btn col-span-2" onClick={() => handleCheckout()}><Save /><span>{ar ? 'حفظ بدون طباعة' : 'Save without printing'}</span></button>
                  <button type="button" className="till-btn till-btn-danger" onClick={clearWholeBill} disabled={cart.length === 0}><Trash2 /><span>{ar ? 'تصفير' : 'Clear'}</span></button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* THE CATALOGUE */}
        <div className="flex-grow flex-1 basis-auto md:basis-0 h-[75vh] md:h-full shrink-0 md:shrink flex flex-col p-3 gap-3 overflow-hidden max-w-none w-full" style={{ flexGrow: 1 }}>

          {/* Search, scan and categories */}
          <div className="flex flex-col sm:flex-row items-stretch gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 till-muted pointer-events-none" style={{ insetInlineStart: 14 }} />
              <input
                id="terminal-product-search-input"
                type="text"
                placeholder={ar ? 'ابحث باسم الصنف أو امسح الباركود' : 'Search by name or scan a barcode'}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setTerminalProductPage(0); }}
                onKeyDown={(e) => {
                  // a scanner (or Enter) with a barcode or IMEI in the search box adds that item
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    e.preventDefault();
                    if (scanCode(searchQuery, { quietMiss: true })) { setSearchQuery(''); setTerminalProductPage(0); }
                  }
                }}
                className="till-input w-full"
                style={{ paddingInlineStart: 40, paddingInlineEnd: 12 }}
              />
            </div>
            <button type="button" className="till-icon-btn" title={ar ? 'إدخال باركود بالأرقام' : 'Type a barcode'}
              onClick={() => askNumber(ar ? 'الباركود أو رقم الصنف' : 'Barcode or item number', '', (bar) => { if (bar) scanCode(bar); })}>
              <ScanBarcode />
            </button>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setTerminalProductPage(0); }}
              className="till-select sm:w-56 px-3"
              aria-label={ar ? 'القسم' : 'Category'}
            >
              <option value="all">{ar ? 'الأقسام' : 'Categories'}</option>
              <option value="everything">{ar ? 'كل الأصناف' : 'All items'}</option>
              {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>

          {/* Offers */}
          {promotions.length > 0 && (
            <div className="flex gap-2 overflow-x-auto shrink-0 pb-0.5" id="terminal-promos-row" aria-label={ar ? 'العروض' : 'Offers'}>
              {promotions.map(promo => {
                const target = promo.productId ? products.find(p => p.id === promo.productId) : null;
                const label = target?.name || promo.name
                  || (promo.type === 'percentage' ? (ar ? 'خصم' : 'Discount') : promo.type === 'bxgy' ? (ar ? 'اشترِ واحصل' : 'Buy and get') : (ar ? 'عرض' : 'Offer'));
                const badge = promo.type === 'percentage' ? `-${promo.value}%` : promo.type === 'bxgy' ? (ar ? `${promo.buyX}+${promo.getY} مجاناً` : `${promo.buyX}+${promo.getY} free`) : `$${promo.value}`;
                return (
                  <button key={promo.id} type="button" className="till-chip"
                    onClick={() => {
                      if (promo.type === 'bundle') {
                        const virtualProduct: Product = {
                          id: `bundle-${promo.id}`,
                          name: promo.name || 'عرض حزمة',
                          barcode: promo.barcode || `bundle-${promo.id}`,
                          category: 'bundles',
                          priceUSD: promo.value,
                          quantity: 99999,
                          expiryDate: promo.endDate || SYS_DATE,
                        };
                        addToCart(virtualProduct);
                      } else if (promo.productId) {
                        const prod = products.find(p => p.id === promo.productId);
                        if (prod) handleProductClick(prod);
                        else showToast('warning', ar ? 'صنف العرض مش موجود بالمخزن' : 'The offer’s item is not in stock');
                      }
                    }}>
                    <span className="truncate max-w-[200px]">{label}</span>
                    <b dir={promo.type === 'bxgy' && ar ? 'rtl' : 'ltr'}>{badge}</b>
                  </button>
                );
              })}
            </div>
          )}

          {(() => {
            // Home shows the categories; a search always looks through every category
            const query = searchQuery.trim();
            const showCategoryHome = !query && selectedCategory === 'all';
            const filtered = processedProducts
              .filter(p => query || selectedCategory === 'all' || selectedCategory === 'everything' || categoryIdOf(p.category, categories) === selectedCategory || (selectedCategory === 'promotions' && p.priceWholesale))
              .filter(p => matchesProductSearch(p, query));
            const openCategory = (id: string) => { setSelectedCategory(id); setTerminalProductPage(0); };

            const itemsPerPage = terminalItemsPerPage;
            const pagesCount = Math.ceil(filtered.length / itemsPerPage) || 1;
            const currentPage = Math.min(terminalProductPage, pagesCount - 1);
            const pageSlice = filtered.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

            return (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden" id="terminal-grid-wrapper">

                {!showCategoryHome && (
                  <div className="flex items-center gap-3 mb-2 shrink-0" id="terminal-browse-bar">
                    <button type="button" id="btn-terminal-categories-home" className="till-btn"
                      onClick={() => { setSearchQuery(''); openCategory('all'); }}>
                      {ar ? <ArrowRight /> : <ArrowLeft />}<span>{ar ? 'الأقسام' : 'Categories'}</span>
                    </button>
                    <span className="text-base font-extrabold truncate">
                      {query
                        ? (ar ? `نتائج «${query}»` : `Results for “${query}”`)
                        : selectedCategory === 'everything'
                          ? (ar ? 'كل الأصناف' : 'All items')
                          : categories.find(c => c.id === selectedCategory)?.name || ''}
                    </span>
                    <span className="text-sm till-muted font-semibold">{filtered.length}</span>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto select-none" id="terminal-grid-panel">
                  {showCategoryHome ? (
                    <div className="grid gap-2.5" id="terminal-category-tiles" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 180px), 1fr))' }}>
                      {(() => {
                        type Tile = { id: string; title: string; sub: string; service?: boolean; open: () => void };
                        const items = ar ? 'صنف' : 'items';
                        const tiles: Tile[] = [
                          { id: 'everything', title: ar ? 'كل الأصناف' : 'All items', sub: `${processedProducts.length} ${items}`, open: () => openCategory('everything') },
                          ...categories.map(cat => ({
                            id: cat.id, title: cat.name,
                            sub: `${processedProducts.filter(p => categoryIdOf(p.category, categories) === cat.id).length} ${items}`,
                            open: () => openCategory(cat.id),
                          })),
                          ...(businessType === 'phones' && onOpenTab ? [
                            { id: 'svc:repairs', title: ar ? 'التصليح' : 'Repairs', sub: ar ? 'استلام وتسليم أجهزة' : 'Intake & delivery', service: true, open: () => onOpenTab('repairs') },
                            { id: 'svc:tradeins', title: ar ? 'شرا مستعمل' : 'Buy used', sub: ar ? 'شرا جهاز من زبون' : 'Buy a phone', service: true, open: () => onOpenTab('tradeins') },
                            { id: 'svc:topups', title: ar ? 'التشريج' : 'Top-ups', sub: 'Alfa, Touch', service: true, open: () => onOpenTab('topups') },
                            { id: 'svc:installments', title: ar ? 'التقسيط' : 'Instalments', sub: ar ? 'خطط وأقساط' : 'Plans & dues', service: true, open: () => onOpenTab('installments') },
                          ] : []),
                        ];
                        const pinned = pinnedTiles.map(id => tiles.find(t => t.id === id)).filter((t): t is Tile => !!t);
                        const ordered = [...pinned, ...tiles.filter(t => !pinnedTiles.includes(t.id))];
                        return ordered.map(t => {
                          const isPinned = pinnedTiles.includes(t.id);
                          return (
                            <div key={t.id} data-category-tile={t.id} onClick={t.open} role="button" tabIndex={0}
                              onKeyDown={e => { if (e.key === 'Enter') t.open(); }}
                              className={`till-tile ${t.service ? 'is-service' : ''} ${isPinned ? 'is-pinned' : ''}`}>
                              <button type="button" data-pin-tile={t.id}
                                onClick={e => { e.stopPropagation(); togglePin(t.id); }}
                                title={isPinned ? (ar ? 'إلغاء التثبيت' : 'Unpin') : (ar ? 'تثبيت بالأول' : 'Pin first')}
                                className={`till-pin ${isPinned ? 'is-on' : ''}`}>
                                <Pin className="w-3.5 h-3.5" />
                              </button>
                              <span className="till-tile-name">{t.title}</span>
                              <span className="till-tile-count">{t.sub}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="till-empty flex flex-col items-center justify-center gap-3 p-14 text-center">
                      <span>{query ? (ar ? `ما في صنف اسمو أو باركودو «${query}».` : `No item matches “${query}”.`) : (ar ? 'ما في أصناف بهالقسم بعد.' : 'No items in this category yet.')}</span>
                    </div>
                  ) : (
                    <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 170px), 1fr))' }}>
                      {pageSlice.map((prod) => {
                        const isOut = prod.quantity <= 0;
                        const isLow = !isOut && prod.quantity < 5;
                        return (
                          <div key={prod.id} role="button" tabIndex={0}
                            onClick={() => {
                              if (!isOut) handleProductClick(prod);
                              else showToast('error', ar ? 'هالصنف خلص من المخزن' : 'This item is out of stock');
                            }}
                            onKeyDown={e => { if (e.key === 'Enter' && !isOut) handleProductClick(prod); }}
                            className={`till-card ${isOut ? 'is-out' : ''}`}>
                            {prod.image && (
                              <img src={prod.image} alt="" className="w-full h-16 object-cover rounded-md" referrerPolicy="no-referrer" />
                            )}
                            <div className="till-card-name" title={prod.name}>{prod.name}</div>
                            <div className="mt-auto">
                              <div className="till-card-price" dir="ltr" style={{ textAlign: ar ? 'right' : 'left' }}>${prod.priceUSD.toFixed(2)}</div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="till-card-lbp" dir="ltr">{Math.round(prod.priceUSD * settings.exchangeRate).toLocaleString()} {ar ? 'ل.ل' : 'LBP'}</span>
                                <span className={`till-card-stock ${isOut ? 'is-out' : isLow ? 'is-low' : ''}`}>
                                  {isOut ? (ar ? 'خلص' : 'Out') : isLow ? (ar ? `باقي ${prod.quantity}` : `${prod.quantity} left`) : (ar ? `متوفر ${prod.quantity}` : `${prod.quantity} in stock`)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Pages */}
                <div className={`flex items-center justify-between gap-2 shrink-0 mt-2 ${showCategoryHome || pagesCount < 2 && filtered.length <= 6 ? 'hidden' : ''}`}>
                  <div className="flex items-center gap-1.5">
                    <button type="button" className="till-icon-btn" disabled={currentPage === 0} style={{ opacity: currentPage === 0 ? .35 : 1 }}
                      onClick={() => setTerminalProductPage(p => Math.max(0, p - 1))} aria-label={ar ? 'الصفحة السابقة' : 'Previous page'}>
                      {ar ? <ChevronRight /> : <ChevronLeft />}
                    </button>
                    <span className="text-sm font-bold px-2">{currentPage + 1} / {pagesCount}</span>
                    <button type="button" className="till-icon-btn" disabled={currentPage === pagesCount - 1} style={{ opacity: currentPage === pagesCount - 1 ? .35 : 1 }}
                      onClick={() => setTerminalProductPage(p => Math.min(pagesCount - 1, p + 1))} aria-label={ar ? 'الصفحة التالية' : 'Next page'}>
                      {ar ? <ChevronLeft /> : <ChevronRight />}
                    </button>
                  </div>
                  <label className="flex items-center gap-2 text-xs till-muted font-semibold">
                    <span>{ar ? 'بالصفحة' : 'Per page'}</span>
                    <select value={terminalItemsPerPage}
                      onChange={(e) => { setTerminalItemsPerPage(parseInt(e.target.value)); setTerminalProductPage(0); }}
                      className="till-select px-2" style={{ height: 36 }}>
                      {[8, 12, 16, 20, 24, 32, 48].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            );
          })()}

        </div>

      </div>

    </div>
  );
}
