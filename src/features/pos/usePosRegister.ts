import React, { useState, useEffect } from 'react';
import { CartItem, CartSession, Product, Invoice, User, SystemSettings, Promotion, Customer } from '../../types';
import { auth } from '../../firebase';

export interface UsePosRegisterDeps {
  SYS_DATE: string;
  syncWriteToCloud: (collectionName: string, docId: string, data: any, isDelete?: boolean) => Promise<void>;
  lang: "ar" | "en";
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  settings: SystemSettings;
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  promotions: Promotion[];
  activeTab: string;
  currentUser: User;
  setIsCustomerModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setModalCustomerSearch: React.Dispatch<React.SetStateAction<string>>;
  setIsAddingNewCustomerInModal: React.Dispatch<React.SetStateAction<boolean>>;
  setNewCustName: React.Dispatch<React.SetStateAction<string>>;
  setNewCustPhone: React.Dispatch<React.SetStateAction<string>>;
  setNewCustType: React.Dispatch<React.SetStateAction<"retail" | "wholesale">>;
  setNewCustLimit: React.Dispatch<React.SetStateAction<number>>;
  posLayoutMode: "modern" | "terminal";
  setShowInvoiceReceipt: React.Dispatch<React.SetStateAction<Invoice>>;
  setExpiryWarningModal: React.Dispatch<React.SetStateAction<Product>>;
  isActivated: boolean;
  setShowPurchaseContactModal: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedScaleProduct: React.Dispatch<React.SetStateAction<Product>>;
  setSimulatedWeight: React.Dispatch<React.SetStateAction<number>>;
  setIsScaleSimulatorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  processedProducts: { isExpired: boolean; isNearExpiry: boolean; lastSoldDate: string; daysSinceLastSale: number; isStagnant: boolean; id: string; name: string; barcode: string; barcodes?: string[]; category: string; priceUSD: number; priceLBP?: number; quantity: number; warehouseQuantity?: number; expiryDate: string; sku?: string; priceWholesale?: number; minWholesaleQty?: number; costPriceUSD?: number; image?: string; isWeighed?: boolean; plu?: string; }[];
  showToast: (type: "success" | "error" | "warning", message: string) => void;
  hardwarePrinterType: "system" | "usb" | "serial";
  openCashDrawer: () => Promise<void>;
}

export function usePosRegister({
  SYS_DATE,
  syncWriteToCloud,
  lang,
  products,
  setProducts,
  settings,
  invoices,
  setInvoices,
  customers,
  setCustomers,
  promotions,
  activeTab,
  currentUser,
  setIsCustomerModalOpen,
  setModalCustomerSearch,
  setIsAddingNewCustomerInModal,
  setNewCustName,
  setNewCustPhone,
  setNewCustType,
  setNewCustLimit,
  posLayoutMode,
  setShowInvoiceReceipt,
  setExpiryWarningModal,
  isActivated,
  setShowPurchaseContactModal,
  setSelectedScaleProduct,
  setSimulatedWeight,
  setIsScaleSimulatorOpen,
  processedProducts,
  showToast,
  hardwarePrinterType,
  openCashDrawer,
}: UsePosRegisterDeps) {
  // --- POS CART STATES ---
  const [cart, setCart] = useState<CartItem[]>([]);

  const [barcodeInput, setBarcodeInput] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [discountInput, setDiscountInput] = useState<string>('0');

  // --- TOUCH KEYPAD & FINANCIAL DISCOUNT STATES ---
  const [taxRate, setTaxRate] = useState<number>(0);

  const [deliveryUSD, setDeliveryUSD] = useState<number>(0);

  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState<boolean>(false);

  const [isNumpadOpen, setIsNumpadOpen] = useState<boolean>(false);

  const [numpadValue, setNumpadValue] = useState<string>('');

  const [numpadTitle, setNumpadTitle] = useState<string>('');

  const [numpadOnSave, setNumpadOnSave] = useState<{ fn: (val: string) => void }>({ fn: () => {} });

  const [paidUSDInput, setPaidUSDInput] = useState<string>('');

  const [paidLBPInput, setPaidLBPInput] = useState<string>('');

  const [isTouchPaymentModalOpen, setIsTouchPaymentModalOpen] = useState<boolean>(false);

  const [touchPaymentActiveField, setTouchPaymentActiveField] = useState<'usd' | 'lbp' | 'discount'>('usd');

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'debt'>('cash');

  const [posSaleType, setPosSaleType] = useState<'retail' | 'wholesale'>('retail');

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  const [voidedCartItemIds, setVoidedCartItemIds] = useState<string[]>([]);

  const [noteInput, setNoteInput] = useState<string>('');

  // --- MULTI-SESSION / BILL SUSPENSION STATES ---
  const [sessions, setSessions] = useState<CartSession[]>(() => {
    try {
      const saved = localStorage.getItem('pos_cart_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading sessions:', e);
    }
    return [
      {
        id: 'session-default',
        label: 'الفاتورة الرئيسية',
        cart: [],
        discountInput: '0',
        paidUSDInput: '',
        paidLBPInput: '',
        paymentMethod: 'cash',
        posSaleType: 'retail',
        selectedCustomerId: '',
        voidedCartItemIds: [],
        noteInput: ''
      }
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return localStorage.getItem('pos_active_session_id') || 'session-default';
  });

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  const [editingLabelValue, setEditingLabelValue] = useState<string>('');

  // Sync sessions list to localStorage on change
  useEffect(() => {
    localStorage.setItem('pos_cart_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Sync activeSessionId to localStorage on change
  useEffect(() => {
    localStorage.setItem('pos_active_session_id', activeSessionId);
  }, [activeSessionId]);

  // Synchronize dynamic active fields of currently active cart inputs to the active session item
  useEffect(() => {
    if (!activeSessionId) return;
    setSessions(prev => {
      const existing = prev.find(s => s.id === activeSessionId);
      if (!existing) return prev;
      
      if (
        existing.cart === cart &&
        existing.discountInput === discountInput &&
        existing.paidUSDInput === paidUSDInput &&
        existing.paidLBPInput === paidLBPInput &&
        existing.paymentMethod === paymentMethod &&
        existing.posSaleType === posSaleType &&
        existing.selectedCustomerId === selectedCustomerId &&
        existing.noteInput === noteInput &&
        JSON.stringify(existing.voidedCartItemIds || []) === JSON.stringify(voidedCartItemIds)
      ) {
        return prev;
      }
      
      return prev.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            cart,
            discountInput,
            paidUSDInput,
            paidLBPInput,
            paymentMethod,
            posSaleType,
            selectedCustomerId,
            voidedCartItemIds,
            noteInput
          };
        }
        return s;
      });
    });
  }, [cart, discountInput, paidUSDInput, paidLBPInput, paymentMethod, posSaleType, selectedCustomerId, voidedCartItemIds, noteInput, activeSessionId]);

  // Operations to manage multi-client carts
  const switchSession = (toId: string) => {
    const target = sessions.find(s => s.id === toId);
    if (target) {
      setCart(target.cart);
      setDiscountInput(target.discountInput);
      setPaidUSDInput(target.paidUSDInput);
      setPaidLBPInput(target.paidLBPInput);
      setPaymentMethod(target.paymentMethod);
      setPosSaleType(target.posSaleType);
      setSelectedCustomerId(target.selectedCustomerId);
      setVoidedCartItemIds(target.voidedCartItemIds || []);
      setNoteInput(target.noteInput || '');
      setActiveSessionId(toId);
      showToast('success', lang === 'ar' ? `🔄 تم الانتقال إلى: ${target.label}` : `🔄 Switched to: ${target.label}`);
    }
  };

  const addNewSession = (customLabel?: string) => {
    const newId = `session-${Date.now()}`;
    const nextNum = sessions.length + 1;
    const label = customLabel || (lang === 'ar' ? `فاتورة جديدة ${nextNum}` : `New Bill ${nextNum}`);
    
    const newSess: CartSession = {
      id: newId,
      label,
      cart: [],
      discountInput: '0',
      paidUSDInput: '',
      paidLBPInput: '',
      paymentMethod: 'cash',
      posSaleType: 'retail',
      selectedCustomerId: '',
      voidedCartItemIds: [],
      noteInput: ''
    };
    
    // Reset active bindings to clear cart cleanly
    setCart([]);
    setDiscountInput('0');
    setPaidUSDInput('');
    setPaidLBPInput('');
    setPaymentMethod('cash');
    setPosSaleType('retail');
    setSelectedCustomerId('');
    setVoidedCartItemIds([]);
    setNoteInput('');
    
    setSessions(prev => [...prev, newSess]);
    setActiveSessionId(newId);
    
    showToast('success', lang === 'ar' ? `➕ تم فتح فاتورة مبيعات جديدة: ${label}` : `➕ Opened new transaction: ${label}`);
  };

  const deleteSession = (sessionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (sessions.length <= 1) {
      showToast('warning', lang === 'ar' ? '⚠️ يجب إبقاء فاتورة نشطة واحدة على الأقل في النظام!' : '⚠️ Must keep at least one active bill session!');
      return;
    }
    
    const remaining = sessions.filter(s => s.id !== sessionId);
    const wasActive = sessionId === activeSessionId;
    
    setSessions(remaining);
    
    if (wasActive) {
      const target = remaining[0];
      setCart(target.cart);
      setDiscountInput(target.discountInput);
      setPaidUSDInput(target.paidUSDInput);
      setPaidLBPInput(target.paidLBPInput);
      setPaymentMethod(target.paymentMethod);
      setPosSaleType(target.posSaleType);
      setSelectedCustomerId(target.selectedCustomerId);
      setActiveSessionId(target.id);
    }
    
    showToast('success', lang === 'ar' ? '🗑️ تم إغلاق وحذف الفاتورة بنجاح.' : '🗑️ Bill session closed successfully.');
  };

  const startRenameSession = (session: CartSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingLabelValue(session.label);
  };

  const saveRenameSession = (sessionId: string) => {
    if (editingLabelValue.trim() !== '') {
      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          return { ...s, label: editingLabelValue.trim() };
        }
        return s;
      }));
    }
    setEditingSessionId(null);
  };

  // Keyboard shortcut listener for F1 checkout and F2 new suspended session
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'pos') return;
      
      if (e.key === 'F1') {
        e.preventDefault();
        if (posLayoutMode === 'terminal') {
          openTouchPayment('cash');
        } else {
          handleCheckout();
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        addNewSession();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, discountInput, paidUSDInput, paidLBPInput, paymentMethod, settings, currentUser, activeTab, sessions, activeSessionId, posLayoutMode]);

  // --- BARCODE SCAN EXECUTION ---
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = barcodeInput.trim();
    if (!barcode) return;

    // Check if matching active bundle promotion barcode
    const matchedPromo = promotions.find(p => p.active && p.type === 'bundle' && p.barcode === barcode);
    if (matchedPromo) {
      const virtualProduct: Product = {
        id: `bundle-${matchedPromo.id}`,
        name: matchedPromo.name || "عرض حزمة",
        barcode: matchedPromo.barcode || `bundle-${matchedPromo.id}`,
        category: 'bundles',
        priceUSD: matchedPromo.value,
        quantity: 99999,
        expiryDate: matchedPromo.endDate || SYS_DATE,
      };
      addToCart(virtualProduct);
      setBarcodeInput('');
      showToast('success', `تم التعرّف على عرض الحزمة [${matchedPromo.name}] بالباركود وإضافته بنجاح!`);
      return;
    }

    // --- ELECTRONIC SCALE BARCODE PARSER ---
    // Standard retail scale barcode format: 13 digits (EAN-13)
    // Starting with 20 to 25 or 27 to 29 (common supermarket prefixes for weight labels)
    const isScaleBarcode = barcode.length === 13 && /^(2[0-5]|2[7-9])\d{11}$/.test(barcode);
    if (isScaleBarcode) {
      const scalePrefix = barcode.slice(0, 2);
      const scalePlu = barcode.slice(2, 7);
      const weightGrams = parseInt(barcode.slice(7, 12), 10);
      const weightKg = weightGrams / 1000;

      const matchedWeighed = processedProducts.find(p => p.isWeighed && p.plu === scalePlu);
      if (matchedWeighed) {
        if (matchedWeighed.isExpired) {
          setExpiryWarningModal(matchedWeighed);
          setBarcodeInput('');
          return;
        }

        addToCart(matchedWeighed, weightKg);
        setBarcodeInput('');
        showToast(
          'success',
          lang === 'ar'
            ? `⚖️ [ميزان] تم إدخال [${matchedWeighed.name}] بوزن: ${weightKg.toFixed(3)} كغم`
            : `⚖️ [Scale] Added [${matchedWeighed.name}] weight: ${weightKg.toFixed(3)} Kg`
        );
        return;
      }
    }

    const matched = processedProducts.find(p => p.barcode === barcode || (p.barcodes && p.barcodes.includes(barcode)));
    if (!matched) {
      showToast('error', `عفواً! الباركود [${barcode}] غير معرف في قاعدة البيانات.`);
      setBarcodeInput('');
      return;
    }

    if (matched.isExpired) {
      setExpiryWarningModal(matched);
      setBarcodeInput('');
      return;
    }

    addToCart(matched);
    setBarcodeInput('');
  };

  // --- ADD TO CART UTILITY ---
  const addToCart = (product: Product, customQty?: number) => {
    // Check if food is expired directly
    const expiryDate = new Date(product.expiryDate);
    const currentDate = new Date(SYS_DATE);
    if (expiryDate < currentDate) {
      setExpiryWarningModal(product);
      return;
    }

    // Find if already in cart
    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    const currentQtyInCart = existingIndex !== -1 ? cart[existingIndex].quantity : 0;

    if (customQty !== undefined) {
      if (currentQtyInCart + customQty > product.quantity) {
        showToast('warning', lang === 'ar' 
          ? `المخزون غير كافٍ! المتاح من [${product.name}] هو ${product.quantity} فقط.` 
          : `Stock is insufficient! Only ${product.quantity} is available.`);
        return;
      }
      if (existingIndex !== -1) {
        const updated = [...cart];
        updated[existingIndex].quantity += customQty;
        setCart(updated);
      } else {
        setCart([...cart, { product, quantity: customQty }]);
      }
      return;
    }

    if (settings.requireQtyPrompt) {
      setNumpadTitle(
        lang === 'ar'
          ? `أدخل كمية البيع لـ: [${product.name}]`
          : `Enter quantity for: [${product.name}]`
      );
      setNumpadValue("1");
      setNumpadOnSave({
        fn: (valStr: string) => {
          const num = parseFloat(valStr);
          if (isNaN(num) || num <= 0) {
            showToast('error', lang === 'ar' ? 'الرجاء إدخال كمية رقمية صحيحة أكبر من صفر!' : 'Please enter a valid positive quantity!');
            return;
          }
          if (currentQtyInCart + num > product.quantity) {
            showToast('warning', lang === 'ar' 
              ? `المخزون غير كافٍ! المتاح في السوبرماركت من [${product.name}] هو ${product.quantity} فقط.` 
              : `Stock is insufficient! Only ${product.quantity} is available.`);
            return;
          }
          
          if (existingIndex !== -1) {
            const updated = [...cart];
            updated[existingIndex].quantity += num;
            setCart(updated);
          } else {
            setCart(prevCart => {
              const idx = prevCart.findIndex(item => item.product.id === product.id);
              if (idx !== -1) {
                const u = [...prevCart];
                u[idx].quantity += num;
                return u;
              }
              return [...prevCart, { product, quantity: num }];
            });
          }
          showToast('success', lang === 'ar' ? `✔️ تم إضافة ${num} من [${product.name}] بنجاح!` : `✔️ Added ${num} of [${product.name}]!`);
        }
      });
      setIsNumpadOpen(true);
      return;
    }

    let qtyToAdd = 1;
    if (currentQtyInCart + qtyToAdd > product.quantity) {
      showToast('warning', `المخزون غير كافٍ! المتاح في السوبرماركت من [${product.name}] هو ${product.quantity} فقط.`);
      return;
    }

    if (existingIndex !== -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += qtyToAdd;
      setCart(updated);
    } else {
      setCart([...cart, { product, quantity: qtyToAdd }]);
    }
  };

  // --- PRODUCT CLICK HANDLER FOR SCALE INTERCEPTION ---
  const handleProductClick = (product: Product) => {
    if (product.isWeighed) {
      setSelectedScaleProduct(product);
      setSimulatedWeight(1.250); // Standard starting weight: 1.250 kg
      setIsScaleSimulatorOpen(true);
    } else {
      addToCart(product);
    }
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    const existingIndex = cart.findIndex(item => item.product.id === productId);
    if (existingIndex === -1) return;

    const item = cart[existingIndex];
    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      // Remove
      setCart(cart.filter(item => item.product.id !== productId));
      return;
    }

    if (newQty > item.product.quantity) {
      showToast('warning', `تنبيه المخازن: الكمية الكلية المتوفرة بالرف هي ${item.product.quantity} فقط.`);
      return;
    }

    const updated = [...cart];
    updated[existingIndex].quantity = newQty;
    setCart(updated);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountInput('0');
    setPaidUSDInput('');
    setPaidLBPInput('');
    setNoteInput('');
    setVoidedCartItemIds([]);
    setDeliveryUSD(0); // Also reset delivery cost on clearCart
    
    // Clear the active session details as well
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          cart: [],
          discountInput: '0',
          paidUSDInput: '',
          paidLBPInput: '',
          paymentMethod: 'cash',
          posSaleType: 'retail',
          selectedCustomerId: '',
          voidedCartItemIds: [],
          noteInput: ''
        };
      }
      return s;
    }));
  };

  const triggerCustomerSearch = () => {
    setIsCustomerModalOpen(true);
    setModalCustomerSearch('');
    setIsAddingNewCustomerInModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustType('retail');
    setNewCustLimit(1000);
  };

  // Scroll cart list automatically whenever an item is added, changed, or session switches
  useEffect(() => {
    if (cart.length > 0) {
      const timer = setTimeout(() => {
        const scroller = document.getElementById('terminal-cart-scroller');
        if (scroller) {
          scroller.scrollTo({
            top: scroller.scrollHeight,
            behavior: 'smooth'
          });
        }
        const cartList = document.getElementById('cart-items-list');
        if (cartList) {
          cartList.scrollTo({
            top: cartList.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [cart, activeSessionId]);

  // --- CALCULATE CART MATHS ---
  const getProductDisplayPrice = (product: Product, quantity: number = 1): number => {
    // If it's a bundle promo virtual product, return its price directly
    if (product.id.startsWith('bundle-')) {
      return product.priceUSD;
    }

    const isWholesaleMode = posSaleType === 'wholesale';
    const customer = customers.find(c => c.id === selectedCustomerId);
    const isWholesaleCustomer = customer?.type === 'wholesale';
    const qualifiesByQty = quantity >= (product.minWholesaleQty || 5);
    
    let basePrice = product.priceUSD;
    if (isWholesaleMode || isWholesaleCustomer || qualifiesByQty) {
      basePrice = product.priceWholesale || (product.priceUSD * 0.9);
    }

    // Check for active single-product promotion
    const activeDiscountPromo = promotions.find(promo => {
      if (!promo.active) return false;
      if (promo.productId !== product.id) return false;
      if (promo.startDate && SYS_DATE < promo.startDate) return false;
      if (promo.endDate && SYS_DATE > promo.endDate) return false;
      return true;
    });

    if (activeDiscountPromo) {
      if (activeDiscountPromo.discountType === 'fixed') {
        return Math.max(0, basePrice - activeDiscountPromo.value);
      } else {
        const factor = (100 - activeDiscountPromo.value) / 100;
        return basePrice * factor;
      }
    }

    return basePrice;
  };

  const getCalculatedDiscountUSD = (subtotal: number, input: string): number => {
    const trimmed = (input || '').trim().replace(/,/g, '');
    if (!trimmed || trimmed === '0') return 0;
    
    // Percentage discount
    if (trimmed.endsWith('%')) {
      const val = parseFloat(trimmed.slice(0, -1)) || 0;
      return (subtotal * val) / 100;
    }
    if (trimmed.startsWith('%')) {
      const val = parseFloat(trimmed.slice(1)) || 0;
      return (subtotal * val) / 100;
    }
    
    // Check if it's LBP discount (e.g. ended with "lbp", "l.l", "ل.ل" or value >= 500)
    const isLBP = trimmed.toLowerCase().endsWith('lbp') || 
                  trimmed.toLowerCase().endsWith('l.l') || 
                  trimmed.endsWith('ل.ل') ||
                  parseFloat(trimmed) >= 500;
                  
    if (isLBP) {
      const numericPart = trimmed.replace(/[a-zA-Z\sأ-ي.]/g, '');
      const valLBP = parseFloat(numericPart) || 0;
      return valLBP / settings.exchangeRate;
    }
    
    // Standard USD discount
    return parseFloat(trimmed) || 0;
  };

  const cartSubtotalUSD = cart.reduce((sum, item) => sum + (getProductDisplayPrice(item.product, item.quantity) * item.quantity), 0);

  const discountUSD = getCalculatedDiscountUSD(cartSubtotalUSD, discountInput);

  const cartTotalUSDBeforeTaxAndLoc = Math.max(0, cartSubtotalUSD - discountUSD);

  const cartTaxUSD = cartTotalUSDBeforeTaxAndLoc * (taxRate / 100);

  const cartTotalUSD = cartTotalUSDBeforeTaxAndLoc + cartTaxUSD + deliveryUSD;

  const cartTotalLBP = cartTotalUSD * settings.exchangeRate;

  // Change calculations (dual currency)
  const paidUSD = parseFloat(paidUSDInput) || 0;

  const paidLBP = parseFloat(paidLBPInput) || 0;

  const totalPaidEquivalentUSD = paidUSD + (paidLBP / settings.exchangeRate);

  const changeUSD = Math.max(0, totalPaidEquivalentUSD - cartTotalUSD);

  const changeLBP = changeUSD * settings.exchangeRate;

  // --- SAVE BILL & CHECKOUT (F1) ---
  const handleCheckout = (overrideMethod?: 'cash' | 'card' | 'transfer' | 'debt') => {
    const activePaymentMethod = overrideMethod || paymentMethod;
    // Check if trial is expired
    if (!isActivated && invoices.length >= 15) {
      showToast('error', lang === 'ar' 
        ? '🚨 انتهت الفترة التجريبية للنظام (الحد الأقصى 15 فاتورة)! تم فتح نموذج التواصل لتفعيل الاشتراك السنوي.' 
        : '🚨 System Trial period expired (Max 15 invoices)! Opening contact form for annual subscription.'
      );
      setShowPurchaseContactModal(true);
      return;
    }

    if (cart.length === 0) {
      showToast('warning', 'السلة فارغة حالياً! الرجاء إدراج أصناف مبيعات أولاً.');
      return;
    }

    if (activePaymentMethod === 'debt' && !selectedCustomerId) {
      showToast('error', 'عفواً! الدفع بالآجل (دين) يتطلب تحديد اسم زبون من القائمة أولاً لتسجيل الدين عليه.');
      return;
    }

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${(invoices.length + 1).toString().padStart(4, '0')}`;
    const invoiceBarcode = `TXN-${now.getTime().toString().slice(-8)}`;

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      date: SYS_DATE,
      time: timeStr,
      items: cart.map(item => {
        const unitPrice = getProductDisplayPrice(item.product, item.quantity);
        return {
          productId: item.product.id,
          productName: item.product.name,
          priceUSD: unitPrice,
          quantity: item.quantity,
          totalUSD: unitPrice * item.quantity,
          priceType: posSaleType,
          discountApplied: item.product.priceUSD > unitPrice ? (item.product.priceUSD - unitPrice) : 0
        };
      }),
      subtotalUSD: cartSubtotalUSD,
      discountUSD,
      totalUSD: cartTotalUSD,
      totalLBP: cartTotalLBP,
      paymentMethod: activePaymentMethod,
      cashier: currentUser?.name || "كاشير السوبرماركت",
      exchangeRate: settings.exchangeRate,
      paidAmountUSD: paidUSD,
      paidAmountLBP: paidLBP,
      changeAmountUSD: changeUSD,
      changeAmountLBP: changeLBP,
      barcode: invoiceBarcode,
      saleType: posSaleType,
      customerId: selectedCustomerId || undefined,
      note: noteInput || undefined,
      taxRate: taxRate,
      taxUSD: cartTaxUSD,
      deliveryUSD: deliveryUSD
    };

    // 1. Decrement product inventories & prevent selling expired
    const updatedProducts = products.map(p => {
      let qtyToSubtract = 0;
      cart.forEach(item => {
        if (item.product.id.startsWith('bundle-')) {
          const promoId = item.product.id.replace('bundle-', '');
          const promo = promotions.find(pr => pr.id === promoId);
          if (promo?.bundleProducts) {
            const componentItem = promo.bundleProducts.find(cp => cp.productId === p.id);
            if (componentItem) {
              qtyToSubtract += componentItem.quantity * item.quantity;
            }
          }
        } else {
          if (item.product.id === p.id) {
            qtyToSubtract += item.quantity;
          }
        }
      });

      if (qtyToSubtract > 0) {
        return {
          ...p,
          quantity: Math.max(0, p.quantity - qtyToSubtract)
        };
      }
      return p;
    });

    // 2. Update Customer Loyalty and Debts if selected
    if (selectedCustomerId) {
      const updatedCustomers = customers.map(c => {
        if (c.id === selectedCustomerId) {
          const addedPoints = Math.floor(cartTotalUSD * 10);
          const addedDebt = activePaymentMethod === 'debt' ? cartTotalUSD : 0;
          return {
            ...c,
            loyaltyPoints: c.loyaltyPoints + addedPoints,
            creditBalance: c.creditBalance + addedDebt
          };
        }
        return c;
      });
      setCustomers(updatedCustomers);
      localStorage.setItem('pos_customers', JSON.stringify(updatedCustomers));
      
      // Update customer on Firebase Cloud if online/logged-in
      if (auth.currentUser) {
        const uCust = updatedCustomers.find(c => c.id === selectedCustomerId);
        if (uCust) syncWriteToCloud('customers', uCust.id, uCust);
      }
      
      const customerName = customers.find(c => c.id === selectedCustomerId)?.name;
      if (activePaymentMethod === 'debt') {
        showToast('warning', `تم تسجيل دين بقيمة ${cartTotalUSD.toFixed(2)}$ لحساب الزبون [${customerName}].`);
      } else {
        showToast('success', `تم منح الزبون [${customerName}] ما يقارب ${Math.floor(cartTotalUSD * 10)} نقطة ولاء إضافية 🌟`);
      }
    }

    setProducts(updatedProducts);
    localStorage.setItem('pos_products', JSON.stringify(updatedProducts));

    const updatedInvoices = [newInvoice, ...invoices];
    setInvoices(updatedInvoices);
    localStorage.setItem('pos_invoices', JSON.stringify(updatedInvoices));

    // Firebase Cloud Sync write-through
    if (auth.currentUser) {
      syncWriteToCloud('invoices', newInvoice.id, newInvoice);
      updatedProducts.forEach(prod => {
        const originalProd = products.find(p => p.id === prod.id);
        if (originalProd && originalProd.quantity !== prod.quantity) {
          syncWriteToCloud('products', prod.id, prod);
        }
      });
    }

    // Show thermal print mockup popup
    setShowInvoiceReceipt(newInvoice);

    // Auto-trigger direct raw hardware cash drawer kick if USB or Serial printer style is active (equivalent to Odoo)
    if (hardwarePrinterType === 'usb' || hardwarePrinterType === 'serial') {
      setTimeout(() => {
        openCashDrawer();
      }, 250);
    }
    
    // Clear cart & variables
    clearCart();
    setSelectedCustomerId('');
    setPosSaleType('retail');
    showToast('success', `تم تفريغ السلة وحفظ الفاتورة رقم ${invoiceNumber} بنجاح!`);
  };

  const openTouchPayment = (method: 'cash' | 'card' | 'transfer' | 'debt' = 'cash') => {
    const activeCart = cart.filter(i => !voidedCartItemIds.includes(i.product.id));
    if (activeCart.length === 0) {
      showToast('warning', lang === 'ar' ? 'السلة فارغة حالياً! الرجاء إدراج أصناف مبيعات أولاً.' : 'Register empty');
      return;
    }
    setPaymentMethod(method);
    setPaidUSDInput('');
    setPaidLBPInput('');
    setTouchPaymentActiveField('usd');
    setIsTouchPaymentModalOpen(true);
  };

  // Physical keyboard listener for virtual numpads (Touch payment & touch numpad modals)
  useEffect(() => {
    const handleNumpadPhysicalKeyDown = (e: KeyboardEvent) => {
      // 1. If Numpad Modal is Open
      if (isNumpadOpen) {
        // If focused element is an input or textarea, ignore to let standard typing work
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          return;
        }

        // Handle numeric and navigation keys
        if (e.key >= '0' && e.key <= '9') {
          e.preventDefault();
          setNumpadValue(prev => (prev === '0' || prev === '') ? e.key : prev + e.key);
        } else if (e.key === '.') {
          e.preventDefault();
          setNumpadValue(prev => {
            const str = prev || '0';
            if (str.includes('.')) return str;
            return str + '.';
          });
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          setNumpadValue(prev => {
            const str = prev || '0';
            if (str.length <= 1) return '';
            return str.slice(0, -1);
          });
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setIsNumpadOpen(false);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          numpadOnSave.fn(numpadValue);
          setIsNumpadOpen(false);
        }
        return;
      }

      // 2. If Touch Payment (Cash Settlement) Modal is Open
      if (isTouchPaymentModalOpen) {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          return;
        }

        if (e.key >= '0' && e.key <= '9') {
          e.preventDefault();
          if (touchPaymentActiveField === 'usd') {
            setPaidUSDInput(prev => (prev === '0' || prev === '') ? e.key : prev + e.key);
          } else if (touchPaymentActiveField === 'lbp') {
            setPaidLBPInput(prev => (prev === '0' || prev === '') ? e.key : prev + e.key);
          } else if (touchPaymentActiveField === 'discount') {
            setDiscountInput(prev => (prev === '0' || prev === '') ? e.key : prev + e.key);
          }
        } else if (e.key === '.') {
          e.preventDefault();
          if (touchPaymentActiveField === 'usd') {
            setPaidUSDInput(prev => prev.includes('.') ? prev : (prev === '' ? '0.' : prev + '.'));
          } else if (touchPaymentActiveField === 'lbp') {
            setPaidLBPInput(prev => prev.includes('.') ? prev : (prev === '' ? '0.' : prev + '.'));
          } else if (touchPaymentActiveField === 'discount') {
            setDiscountInput(prev => prev.includes('.') ? prev : (prev === '' ? '0.' : prev + '.'));
          }
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          if (touchPaymentActiveField === 'usd') {
            setPaidUSDInput(prev => prev ? prev.slice(0, -1) : '');
          } else if (touchPaymentActiveField === 'lbp') {
            setPaidLBPInput(prev => prev ? prev.slice(0, -1) : '');
          } else if (touchPaymentActiveField === 'discount') {
            setDiscountInput(prev => prev ? prev.slice(0, -1) : '');
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setIsTouchPaymentModalOpen(false);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const paidUSDVal = parseFloat(paidUSDInput) || 0;
          const paidLBPVal = parseFloat(paidLBPInput) || 0;
          const totalPaidEquivalentUSDVal = paidUSDVal + (paidLBPVal / settings.exchangeRate);
          const isChangeSatisfied = totalPaidEquivalentUSDVal >= cartTotalUSD;

          if (!isChangeSatisfied && paymentMethod !== 'debt') {
            if (confirm(lang === 'ar' ? '⚠️ المبلغ غير كامل بعد لتسجيل عملية بيع مالي كاش! هل ترغب في المحاسبة على أي حال وترك الباقي ديناً؟' : 'Underpaid amount. Sell anyway?')) {
              setIsTouchPaymentModalOpen(false);
              handleCheckout();
            }
          } else {
            setIsTouchPaymentModalOpen(false);
            handleCheckout();
          }
        }
      }
    };

    window.addEventListener('keydown', handleNumpadPhysicalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleNumpadPhysicalKeyDown);
    };
  }, [
    isNumpadOpen,
    isTouchPaymentModalOpen,
    touchPaymentActiveField,
    numpadValue,
    numpadOnSave,
    paidUSDInput,
    paidLBPInput,
    discountInput,
    cartTotalUSD,
    cartTotalLBP,
    paymentMethod,
    settings,
    lang,
    handleCheckout
  ]);

  return {
    cart,
    setCart,
    barcodeInput,
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
    isDiscountModalOpen,
    setIsDiscountModalOpen,
    isNumpadOpen,
    setIsNumpadOpen,
    numpadValue,
    setNumpadValue,
    numpadTitle,
    setNumpadTitle,
    numpadOnSave,
    setNumpadOnSave,
    paidUSDInput,
    setPaidUSDInput,
    paidLBPInput,
    setPaidLBPInput,
    isTouchPaymentModalOpen,
    setIsTouchPaymentModalOpen,
    touchPaymentActiveField,
    setTouchPaymentActiveField,
    paymentMethod,
    setPaymentMethod,
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
    triggerCustomerSearch,
    getProductDisplayPrice,
    getCalculatedDiscountUSD,
    cartSubtotalUSD,
    cartTotalUSD,
    cartTotalLBP,
    changeUSD,
    changeLBP,
    handleCheckout,
    openTouchPayment,
  };
}
