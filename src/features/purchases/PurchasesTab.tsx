import React, { useState } from 'react';
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
  User, 
  ArrowLeftRight, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle,
  X,
  Printer,
  Camera,
  Sparkles,
  Cpu,
  Upload
} from 'lucide-react';
import { Product, PurchaseInvoice, PurchaseItem, Category } from '../../types';
import { handleMathBlur, handleMathKeyDown } from '../../mathEvaluator';
import * as storage from '../../lib/storage';

import { VAT_PRESETS, lineGross, lineDiscount, lineTax, lineTotal, landedCost, bonusFor, sumLines } from './purchaseMath';
import { printPurchaseInvoice } from './purchaseInvoicePrint';

interface PurchasesTabProps {
  products: Product[];
  setProducts: (prods: Product[]) => void;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  purchaseInvoices: PurchaseInvoice[];
  setPurchaseInvoices: (invoices: PurchaseInvoice[]) => void;
  lang: 'ar' | 'en';
  showToast: (type: 'success' | 'error' | 'warning', message: string) => void;
  sysDate: string;
}

export function PurchasesTab({
  products,
  setProducts,
  categories,
  setCategories,
  purchaseInvoices,
  setPurchaseInvoices,
  lang,
  showToast,
  sysDate
}: PurchasesTabProps) {
  const isAr = lang === 'ar';

  // Refs for tracking live video streams
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  // Section Toggle: 'new' or 'ledger'
  const [subTab, setSubTab] = useState<'new' | 'ledger'>('new');

  // --- NEW PURCHASE INVOICE STATE ---
  const [supplierName, setSupplierName] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>(() => `PUR-${Math.floor(100000 + Math.random() * 900000)}`);
  const [invoiceDate, setInvoiceDate] = useState<string>(sysDate);
  const [note, setNote] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid');
  const [purchaseDestination, setPurchaseDestination] = useState<'shop' | 'warehouse'>('shop');

  // Selected items draft
  const [draftItems, setDraftItems] = useState<Array<{
    product: Product;
    qty: number;
    costPriceUSD: number;
    newPriceUSD: number;
    newPriceWholesale: number;
    expiryDate: string;
    taxRate: number;
    discountPercent: number;
    freeQty: number;
    bonusEvery: number; // "for every bonusEvery bought, bonusFree free"; 0 = no bonus
    bonusFree: number;
  }>>([]);

  // Product Selector search states
  const [prodSearchQuery, setProdSearchQuery] = useState<string>('');
  const [showProdDropdown, setShowProdDropdown] = useState<boolean>(false);

  // Quick New Product state inside Purchase Invoice
  const [showQuickAddForm, setShowQuickAddForm] = useState<boolean>(false);
  const [newProdName, setNewProdName] = useState<string>('');
  const [newProdBarcode, setNewProdBarcode] = useState<string>('');
  const [newProdCategory, setNewProdCategory] = useState<string>(categories[0]?.name || 'معلبات');
  const [newProdCost, setNewProdCost] = useState<string>('');
  const [newProdSellRetail, setNewProdSellRetail] = useState<string>('');
  const [newProdSellWholesale, setNewProdSellWholesale] = useState<string>('');
  const [newProdExpiry, setNewProdExpiry] = useState<string>('');
  const [newProdTaxRate, setNewProdTaxRate] = useState<string>('0');
  const [newProdQty, setNewProdQty] = useState<string>('');
  const [newProdDiscount, setNewProdDiscount] = useState<string>('');
  const [newProdBonusEvery, setNewProdBonusEvery] = useState<string>('');
  const [newProdBonusFree, setNewProdBonusFree] = useState<string>('');

  const [quickMarginVal, setQuickMarginVal] = useState<string>('');
  const [quickMarkupVal, setQuickMarkupVal] = useState<string>('');
  const [draftMarginInputs, setDraftMarginInputs] = useState<{[productId: string]: string}>({});
  const [draftMarkupInputs, setDraftMarkupInputs] = useState<{[productId: string]: string}>({});
  const [transportationCost, setTransportationCost] = useState<string>('0');

  // Category Creation Inline State
  const [showInlineCategoryInput, setShowInlineCategoryInput] = useState<boolean>(false);
  const [inlineCategoryName, setInlineCategoryName] = useState<string>('');

  const handleCreateCategoryInline = () => {
    const name = inlineCategoryName.trim();
    if (!name) {
      showToast('error', isAr ? 'الرجاء كتابة اسم الفئة الجديدة!' : 'Please enter category name!');
      return;
    }
    const cleanId = name.toLowerCase().replace(/\s+/g, '-');
    if (categories.some(c => c.id === cleanId || c.name.toLowerCase() === name.toLowerCase())) {
      showToast('warning', isAr ? 'التصنيف موجود أو مضاف مسبقاً!' : 'Category already exists!');
      return;
    }
    const newCat = { id: cleanId, name, emoji: '🏷️' };
    const updated = [...categories, newCat];
    setCategories(updated);
    storage.setJSON('pos_categories', updated);
    setNewProdCategory(name); // select it automatically
    setInlineCategoryName('');
    setShowInlineCategoryInput(false);
    showToast('success', isAr ? `تمت إضافة فئة [${name}] وتفعيلها بنجاح!` : `Category [${name}] created!`);
  };

  // Ledger Filter States
  const [ledgerSearch, setLedgerSearch] = useState<string>('');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [activePrintPurchase, setActivePrintPurchase] = useState<PurchaseInvoice | null>(null);

  // --- AUTOMATED INVOICE CAMERA SCANNER STATES ---
  const [showInvoiceScannerModal, setShowInvoiceScannerModal] = useState<boolean>(false);
  const [isScanningActive, setIsScanningActive] = useState<boolean>(false);
  const [scanningProgress, setScanningProgress] = useState<number>(0);
  const [scanningStepName, setScanningStepName] = useState<string>('');

  // Monitor voice scanner modal state to start/stop the webcam feed safely
  React.useEffect(() => {
    if (showInvoiceScannerModal) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
          .then(stream => {
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          })
          .catch(err => {
            console.warn("Camera access denied or unavailable", err);
          });
      }
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [showInvoiceScannerModal]);

  // --- ACTIONS ---

  // The received quantity must be typed for every line, so focus it as soon as a line is added
  const focusDraftQty = (productId: string) =>
    setTimeout(() => {
      const el = document.getElementById(`draft-qty-${productId}`) as HTMLInputElement | null;
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el?.focus();
    }, 50);

  // Add selected product to draft list
  const handleAddProductToDraft = (prod: Product) => {
    // Check if ready in list
    const exists = draftItems.find(item => item.product.id === prod.id);
    if (exists) {
      showToast('warning', isAr ? 'هذا الصنف مضاف بالفعل لقائمة الإدخال!' : 'Product already in current list!');
      return;
    }

    // The line starts from the supplier's last unit price (before discount and VAT). Older
    // products only have the stored cost, which includes the VAT of the last purchase.
    const lastTaxRate = prod.purchaseTaxRate || 0;
    const defaultCost = prod.lastPurchaseCostUSD !== undefined
      ? prod.lastPurchaseCostUSD
      : prod.costPriceUSD !== undefined && prod.costPriceUSD !== null
      ? Number((prod.costPriceUSD / (1 + lastTaxRate / 100)).toFixed(2))
      : (prod.priceWholesale !== undefined && prod.priceWholesale !== null
        ? prod.priceWholesale 
        : Number((prod.priceUSD * 0.75).toFixed(2)));

    const defaultWholesale = prod.priceWholesale !== undefined && prod.priceWholesale !== null
      ? prod.priceWholesale
      : Number((prod.priceUSD * 0.85).toFixed(2));

    setDraftItems(prev => [ // newest line on top
      {
        product: prod,
        qty: 0, // typed by the user: the received quantity from the supplier invoice
        costPriceUSD: defaultCost,
        newPriceUSD: prod.priceUSD,
        newPriceWholesale: defaultWholesale,
        expiryDate: prod.expiryDate || '',
        taxRate: lastTaxRate,
        discountPercent: prod.purchaseDiscountPercent || 0,
        freeQty: 0,
        bonusEvery: prod.bonusEvery || 0,
        bonusFree: prod.bonusFree || 0
      },
      ...prev
    ]);

    setProdSearchQuery('');
    setShowProdDropdown(false);
    focusDraftQty(prod.id);
    showToast('success', isAr ? `تمت إضافة [${prod.name}]. اكتب الكمية المستلمة.` : `Added [${prod.name}]. Enter the received quantity.`);
  };

  // Handle Quick Add New Product to catalog directly
  const handleQuickAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const quickQty = parseFloat(newProdQty) || 0;
    if (quickQty <= 0) {
      showToast('error', isAr ? 'الرجاء كتابة الكمية المستلمة من هذا الصنف!' : 'Please enter the received quantity!');
      document.getElementById('quick-add-qty')?.focus();
      return;
    }
    if (!newProdName || !newProdBarcode) {
      showToast('error', isAr ? 'الرجاء ملء اسم الصنف الجديد والباركود!' : 'Name and Barcode are required!');
      return;
    }

    // Check barcode duplication
    const duplicate = products.find(p => p.barcode.trim() === newProdBarcode.trim() || (p.barcodes && p.barcodes.includes(newProdBarcode.trim())));
    if (duplicate) {
      showToast('error', isAr ? `البومة أو الباركود [${newProdBarcode}] مستعمل مسبقاً لصنف آخر!` : `Barcode already exists for ${duplicate.name}!`);
      return;
    }

    const costNum = parseFloat(newProdCost) || 0;
    const quickTaxRate = Math.max(0, parseFloat(newProdTaxRate) || 0);
    const quickDiscount = Math.min(100, Math.max(0, parseFloat(newProdDiscount) || 0));
    const quickBonusEvery = Math.max(0, parseInt(newProdBonusEvery) || 0);
    const quickBonusFree = Math.max(0, parseInt(newProdBonusFree) || 0);
    const quickLine = { qty: quickQty, costPriceUSD: costNum, taxRate: quickTaxRate, discountPercent: quickDiscount, freeQty: bonusFor(quickQty, quickBonusEvery, quickBonusFree) };
    const sellRetailNum = parseFloat(newProdSellRetail) || 0;
    const sellWholesaleNum = parseFloat(newProdSellWholesale) || sellRetailNum * 0.9;

    const newProd: Product = {
      id: `prod-${Date.now()}`,
      name: newProdName,
      barcode: newProdBarcode,
      category: newProdCategory,
      priceUSD: sellRetailNum,
      quantity: 0, // starts at zero, will be updated via the invoice submission
      expiryDate: newProdExpiry || sysDate,
      costPriceUSD: Number(landedCost(quickLine).toFixed(2)), // real unit cost, like saved invoices
      priceWholesale: sellWholesaleNum,
      purchaseTaxRate: quickTaxRate,
      lastPurchaseCostUSD: costNum,
      purchaseDiscountPercent: quickDiscount,
      bonusEvery: quickBonusEvery,
      bonusFree: quickBonusFree
    };

    // Append to master products list
    const updatedProductsList = [...products, newProd];
    setProducts(updatedProductsList);
    storage.setJSON('pos_products', updatedProductsList);

    // Automatically put into the draft invoice items
    setDraftItems(prev => [ // newest line on top
      {
        product: newProd,
        qty: quickQty,
        costPriceUSD: costNum,
        newPriceUSD: sellRetailNum,
        newPriceWholesale: sellWholesaleNum,
        expiryDate: newProdExpiry || sysDate,
        taxRate: quickTaxRate,
        discountPercent: quickDiscount,
        freeQty: quickLine.freeQty,
        bonusEvery: quickBonusEvery,
        bonusFree: quickBonusFree
      },
      ...prev
    ]);

    // Reset Form
    setNewProdName('');
    setNewProdBarcode('');
    setNewProdCost('');
    setNewProdSellRetail('');
    setNewProdSellWholesale('');
    setNewProdExpiry('');
    setNewProdTaxRate('0');
    setNewProdQty('');
    setNewProdDiscount('');
    setNewProdBonusEvery('');
    setNewProdBonusFree('');
    setShowQuickAddForm(false);

    showToast('success', isAr ? `رائع! تم تسجيل [${newProd.name}] في النظام وإدراجه بالفاتورة.` : `Product [${newProd.name}] registered and added to draft invoice.`);
  };

  // Update item field in draft items list
  const handleUpdateDraftField = (index: number, field: string, val: any) => {
    setDraftItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const next = { ...item, [field]: val };
      // A bonus rule fills in the free units from the bought quantity
      if ((field === 'qty' || field === 'bonusEvery' || field === 'bonusFree') && next.bonusEvery > 0 && next.bonusFree > 0) {
        next.freeQty = bonusFor(next.qty, next.bonusEvery, next.bonusFree);
      }
      return next;
    }));
  };

  // Remove item from draft
  const handleRemoveFromDraft = (index: number) => {
    setDraftItems(prev => prev.filter((_, i) => i !== index));
  };

  // Distribute transportation/delivery cost proportionally onto the items in the invoice draft
  const handleDistributeTransportationCost = () => {
    const costAmount = parseFloat(transportationCost) || 0;
    if (costAmount <= 0) {
      showToast('error', isAr ? 'يرجى إدخال تكلفة شحن/مواصلات صالحة (أكبر من 0) أولاً لتوزيعها!' : 'Please enter a valid transportation cost (> 0) to distribute!');
      return;
    }
    if (draftItems.length === 0) {
      showToast('error', isAr ? 'لا توجد سلع في المسودة لتوزيع تكلفة الشحن عليها!' : 'No items in the draft to distribute the cost on!');
      return;
    }

    const totalQty = draftItems.reduce((acc, item) => acc + item.qty, 0);
    if (totalQty === 0) return;

    const totalItemsCost = draftItems.reduce((acc, d) => acc + (d.qty * d.costPriceUSD), 0);

    if (totalItemsCost === 0) {
      const addedCostPerUnit = costAmount / totalQty;
      const updatedDraft = draftItems.map(item => ({
        ...item,
        costPriceUSD: Number((item.costPriceUSD + addedCostPerUnit).toFixed(2))
      }));
      setDraftItems(updatedDraft);
    } else {
      const updatedDraft = draftItems.map(item => {
        const itemLineTotalCost = item.qty * item.costPriceUSD;
        const itemLineShare = (itemLineTotalCost / totalItemsCost) * costAmount;
        const addedCostPerUnit = itemLineShare / item.qty;
        return {
          ...item,
          costPriceUSD: Number((item.costPriceUSD + addedCostPerUnit).toFixed(2))
        };
      });
      setDraftItems(updatedDraft);
    }

    setTransportationCost('0');
    showToast('success', isAr 
      ? `تم توزيع تكلفة المواصلات (${costAmount.toFixed(2)}$) بنجاح كأعباء إضافية على أسعار رأس مال السلع بالتناسب! 🚚` 
      : `Successfully distributed transportation cost ($${costAmount.toFixed(2)}) proportionally onto item cost prices! 🚚`
    );
  };

  // Submit and Save the whole purchase invoice
  const handleSavePurchaseInvoice = () => {
    if (draftItems.length === 0) {
      showToast('error', isAr ? 'لا توجد أصناف في فاتورة الشراء لحفظها!' : 'Invoice cannot be empty!');
      return;
    }
    if (!supplierName.trim()) {
      showToast('error', isAr ? 'يرجى كتابة اسم المورّد أو الشركة الموزعة لتوثيق الفاتورة.' : 'Supplier name is required!');
      return;
    }
    const missingQty = draftItems.find(d => !(d.qty > 0));
    if (missingQty) {
      showToast('error', isAr ? `حدد الكمية المستلمة للصنف [${missingQty.product.name}] حتى تنضاف للمخزن.` : `Enter the received quantity for [${missingQty.product.name}].`);
      focusDraftQty(missingQty.product.id);
      return;
    }

    // 1. Generate items for ledger storage
    // Lines are shown newest first; store them in the order they were entered
    const invoiceItemsToSave: PurchaseItem[] = [...draftItems].reverse().map(d => ({
      id: `pur-item-${Date.now()}-${Math.random()}`,
      productId: d.product.id,
      productName: d.product.name,
      qty: d.qty,
      costPriceUSD: d.costPriceUSD,
      newPriceUSD: d.newPriceUSD,
      newPriceWholesale: d.newPriceWholesale,
      expiryDate: d.expiryDate,
      taxRate: d.taxRate,
      discountPercent: d.discountPercent,
      freeQty: d.freeQty
    }));

    const totalTax = sumLines(draftItems, lineTax);
    const totalDiscount = sumLines(draftItems, lineDiscount);
    const transCostNum = parseFloat(transportationCost) || 0;
    const totalInvoiceAmount = sumLines(draftItems, lineTotal) + transCostNum;

    const newPurchaseInvoice: PurchaseInvoice = {
      id: `pur-inv-${Date.now()}`,
      invoiceNumber: invoiceNumber,
      supplierName: supplierName.trim(),
      date: invoiceDate,
      items: invoiceItemsToSave,
      totalAmountUSD: Number(totalInvoiceAmount.toFixed(2)),
      paymentStatus: paymentStatus,
      note: note.trim(),
      destination: purchaseDestination,
      transportationCostUSD: transCostNum,
      taxUSD: Number(totalTax.toFixed(2)),
      discountUSD: Number(totalDiscount.toFixed(2))
    };

    // 2. Update Master Products: increments stock quantities (to shop or warehouse), set new cost prices, retail prices, wholesale prices, and expiry dates!
    const updatedProducts = products.map(prod => {
      const draftVal = draftItems.find(d => d.product.id === prod.id);
      if (draftVal) {
        const isToWarehouse = purchaseDestination === 'warehouse';
        const received = draftVal.qty + (draftVal.freeQty || 0); // bonus units go on the shelf too
        return {
          ...prod,
          quantity: isToWarehouse ? prod.quantity : (prod.quantity + received), // add to retail shop if not to warehouse
          warehouseQuantity: isToWarehouse ? ((prod.warehouseQuantity || 0) + received) : (prod.warehouseQuantity || 0), // add to warehouse if selected
          costPriceUSD: Number(landedCost(draftVal).toFixed(2)), // real unit cost: after discount, VAT included, spread over free units
          purchaseTaxRate: draftVal.taxRate,
          lastPurchaseCostUSD: draftVal.costPriceUSD,
          purchaseDiscountPercent: draftVal.discountPercent,
          bonusEvery: draftVal.bonusEvery,
          bonusFree: draftVal.bonusFree,
          priceUSD: draftVal.newPriceUSD, // update retail price as requested
          priceWholesale: draftVal.newPriceWholesale, // update wholesale selling price
          expiryDate: draftVal.expiryDate || prod.expiryDate // update expiry date
        };
      }
      return prod;
    });

    // Save master products
    setProducts(updatedProducts);
    storage.setJSON('pos_products', updatedProducts);

    // 3. Save purchase invoice to purchase ledger
    const updatedLedger = [newPurchaseInvoice, ...purchaseInvoices];
    setPurchaseInvoices(updatedLedger);
    storage.setJSON('pos_purchases', updatedLedger);

    // Clear draft state
    setSupplierName('');
    setInvoiceNumber(`PUR-${Math.floor(100000 + Math.random() * 900000)}`);
    setNote('');
    setDraftItems([]);
    setTransportationCost('0');
    setSubTab('ledger'); // switch to ledger to view past submissions

    showToast('success', isAr 
      ? `تم ترحيل الفاتورة بنجاح! تم استلام البضائع وتخزينها في [${purchaseDestination === 'warehouse' ? 'المستودع/المخزن 📦' : 'المحل مباشرة 🏪'}] وتحديث أسعار لـ ${invoiceItemsToSave.length} أصناف.`
      : `Purchase invoice verified! Stock quantities increased in [${purchaseDestination === 'warehouse' ? 'Warehouse 📦' : 'Shop shelves 🏪'}] and selling prices adjusted for ${invoiceItemsToSave.length} products.`
    );
  };

  // --- AUTOMATED INVOICE CAMERA/OCR CORE EMULATED PROCESS ---
  const handleExecuteInvoiceScan = (scannedItemsList: Array<{ barcode: string; qty: number; costPriceUSD: number }>, parsedSupplier: string, customInvRef?: string) => {
    setIsScanningActive(true);
    setScanningProgress(5);
    setScanningStepName(isAr ? "🔌 تشغيل مستشعرات الرؤية الحاسوبية وتثبيت الكاميرا..." : "Initializing computer vision & activating camera focus...");

    const steps = [
      { prg: 25, label: isAr ? "📐 تحديد حواف الفاتورة الورقية وقص وتصحيح الزوايا..." : "Detecting invoice boundaries, cropping and leveling perspectives..." },
      { prg: 55, label: isAr ? "👁️ مسح الأسطر واستخراج الباركود وكميات السلع (AI OCR)..." : "Scanning lines, resolving product barcodes and package quantities (AI OCR)..." },
      { prg: 80, label: isAr ? "⚙️ مطابقة السلع المستخرجة مع قاعدة بيانات المخزن وتطبيق هامش الربح..." : "Matching extracted items against system master catalog & applying profit margin..." },
      { prg: 100, label: isAr ? "✅ نجاح المسح! يتم ترحيل قائمة المشتريات للنموذج..." : "Scan completed successfully!" }
    ];

    let currentStepIdx = 0;
    
    const interval = setInterval(() => {
      if (currentStepIdx < steps.length) {
        const step = steps[currentStepIdx];
        setScanningProgress(step.prg);
        setScanningStepName(step.label);
        currentStepIdx++;
      } else {
        clearInterval(interval);
        
        // Finalize: Populate Purchase fields
        setSupplierName(parsedSupplier);
        if (customInvRef) {
          setInvoiceNumber(customInvRef);
        } else {
          setInvoiceNumber(`PUR-SCAN-${Math.floor(100000 + Math.random() * 900000)}`);
        }

        // Read dynamic profit margin from system settings
        const storedSettings = storage.getItem('pos_settings');
        const defaultMargin = storedSettings ? JSON.parse(storedSettings).defaultMarginPercent || 15 : 15;

        // Map scanned items list to draftItems
        const matchedDrafts: Array<{
          product: Product;
          qty: number;
          costPriceUSD: number;
          newPriceUSD: number;
          newPriceWholesale: number;
          expiryDate: string;
          taxRate: number;
          discountPercent: number;
          freeQty: number;
          bonusEvery: number;
          bonusFree: number;
        }> = [];

        scannedItemsList.forEach(item => {
          const matchedProd = products.find(p => p.barcode === item.barcode || (p.barcodes && p.barcodes.includes(item.barcode)));
          if (matchedProd) {
            // Apply default margin to new price as per setting!
            const calculatedPriceRetail = parseFloat((item.costPriceUSD * (1 + defaultMargin / 100)).toFixed(2));
            const calculatedPriceWholesale = parseFloat((calculatedPriceRetail * 0.9).toFixed(2));

            matchedDrafts.push({
              product: matchedProd,
              qty: item.qty,
              costPriceUSD: item.costPriceUSD,
              newPriceUSD: calculatedPriceRetail,
              newPriceWholesale: calculatedPriceWholesale,
              expiryDate: matchedProd.expiryDate || sysDate,
              taxRate: matchedProd.purchaseTaxRate || 0,
              discountPercent: matchedProd.purchaseDiscountPercent || 0,
              freeQty: bonusFor(item.qty, matchedProd.bonusEvery, matchedProd.bonusFree),
              bonusEvery: matchedProd.bonusEvery || 0,
              bonusFree: matchedProd.bonusFree || 0
            });
          }
        });

        if (matchedDrafts.length > 0) {
          // Merge or overwrite draft items
          setDraftItems(prev => {
            const preserved = prev.filter(p => !matchedDrafts.some(md => md.product.id === p.product.id));
            return [...matchedDrafts.reverse(), ...preserved]; // newest on top, like manual adds
          });
          
          showToast('success', isAr 
            ? `📸 تم المسح والتعرف تلقائياً على (${matchedDrafts.length}) أصناف وإدراجها بالفاتورة بهامش ربح ${defaultMargin}%.`
            : `📸 Scan complete! Successfully identified (${matchedDrafts.length}) variants in system index with ${defaultMargin}% default margin.`);
        } else {
          showToast('warning', isAr 
            ? "⚠️ تم مسح الفاتورة ولكن لم تتطابق الباركودات المقروءة مع أي أصناف مسجلة بالرفوف حالياً! يرجى إضافة أصناف تسكّن هذه الرموز." 
            : "⚠️ Scanned successfully but barcodes do not match our system. Please check barcodes!");
        }

        // Close state
        setIsScanningActive(false);
        setShowInvoiceScannerModal(false);
        setScanningProgress(0);
        setScanningStepName('');
      }
    }, 600);
  };

  // Aggregated Stats
  const totalProcurementExpensesUSD = purchaseInvoices.reduce((sum, inv) => sum + inv.totalAmountUSD, 0);
  const totalProcurementItemsCount = purchaseInvoices.reduce((sum, inv) => sum + inv.items.reduce((acc, i) => acc + i.qty, 0), 0);
  const uniqueSuppliersCount = Array.from(new Set(purchaseInvoices.map(inv => inv.supplierName.trim().toLowerCase()))).length;

  // Filtered Ledger list
  const filteredLedger = purchaseInvoices.filter(inv => {
    if (!ledgerSearch) return true;
    const s = ledgerSearch.toLowerCase().trim();
    return (
      inv.supplierName.toLowerCase().includes(s) ||
      inv.invoiceNumber.toLowerCase().includes(s) ||
      (inv.note && inv.note.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6" id="tab-purchases-manager">
      {/* 1. Header with custom icon and title representing corporate quality */}
      <div className="bg-gradient-to-l from-emerald-600 to-[#1D9E75] text-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-right">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2.5 justify-end">
            <span className="bg-white/20 p-2 rounded-xl">
              <Truck className="w-6 h-6 text-yellow-300" />
            </span>
            {isAr ? 'فاتورة شراء بضائع وتحديث الأسعار' : 'Inventory Procurement & Purchase Invoices'}
          </h2>
          <p className="text-xs text-emerald-100 font-sans mt-2 max-w-xl">
            {isAr 
              ? 'صندوق إدخال البضائع والطلبيات الجديدة للمخزن. عند حفظ الفاتورة، سيتم إضافة كميتها تلقائياً للمخازن وتحديث أسعار التكلفة وسعر البيع للرف في النظام مباشرة.'
              : 'Supply room system. Adding items increases current quantities on floor, archives purchasing costs, and instantly edits checkout prices.'}
          </p>
        </div>
        
        {/* Toggle subtabs */}
        <div className="bg-white/10 p-1.5 rounded-xl border border-white/10 flex items-center gap-1">
          <button 
            onClick={() => setSubTab('ledger')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${subTab === 'ledger' ? 'bg-white text-emerald-800' : 'text-white hover:bg-white/10'}`}
          >
            {isAr ? 'سجل الفواتير والموردين 📑' : 'Ledger Records 📑'}
          </button>
          <button 
            onClick={() => setSubTab('new')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${subTab === 'new' ? 'bg-white text-emerald-800' : 'text-white hover:bg-white/10'}`}
          >
            {isAr ? 'إدخال فاتورة شراء جديدة 📤' : 'New Supply Receipt 📤'}
          </button>
        </div>
      </div>

      {/* SUBTAB: NEW INVOICE ENTRY SECTION */}
      {subTab === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-right">
          
          {/* LEFT SIDE/FIRST COLUMN: INVOICE META/HEADER */}
          <div className="space-y-6 lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
              <h3 className="font-extrabold text-slate-800 text-sm border-b pb-2 flex items-center justify-end gap-2 text-right">
                <FileText className="w-4 h-4 text-[#1D9E75]" />
                {isAr ? 'بيانات فاتورة الشراء وتفاصيل الاستلام' : 'Invoice Metadata'}
              </h3>

              {/* AUTOMATED AI PAPER INVOICE CAMERA SCANNER TRIGGER */}
              <button
                type="button"
                onClick={() => setShowInvoiceScannerModal(true)}
                className="w-full bg-gradient-to-r from-indigo-700 to-indigo-600 hover:from-indigo-800 hover:to-indigo-750 text-white py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-md shadow-indigo-500/15 border border-indigo-500/30 relative overflow-hidden"
              >
                <Camera className="w-4.5 h-4.5 text-yellow-300 animate-bounce shrink-0" />
                <span>📷 {isAr ? 'مسح فاتورة المورد الورقية بالكاميرا (AI)' : 'Camera OCR / AI Invoice Scanner'}</span>
                <span className="bg-white/15 text-[9px] px-1.5 py-0.5 rounded-full font-extrabold">NEW</span>
              </button>

              <div className="space-y-3 font-sans text-xs">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">{isAr ? 'رقم الفاتورة (الـ POS أو الموزع):' : 'Invoice Reference ID:'}</label>
                  <input 
                    type="text" 
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-center text-slate-800 font-extrabold"
                    placeholder="رقم الفاتورة"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">{isAr ? 'اسم المورّد / الموزّع (مطلوب):' : 'Supplier Name (Required):'}</label>
                  <input 
                    type="text" 
                    value={supplierName}
                    onChange={e => setSupplierName(e.target.value)}
                    list="suppliers-list-datalist"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center text-slate-800 font-bold text-xs"
                    placeholder={isAr ? 'مثال: شركة نستله أو الموزع طارق...' : 'e.g. Nestle Dist, Tariq, etc.'}
                  />
                  <datalist id="suppliers-list-datalist">
                    <option value="شركة الموزع العام للغذائيات" />
                    <option value="نستله لبنان للتوزيع" />
                    <option value="مؤسسة الهدى للألبان والأجبان" />
                    <option value="شركة الأندلس لمواد التنظيف" />
                    <option value="سوبر فارم للتجارة" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">{isAr ? 'تاريخ الفاتورة:' : 'Invoice Date:'}</label>
                  <input 
                    type="date" 
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center font-mono text-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">{isAr ? 'حالة الدفع للموزّع:' : 'Payment Terms:'}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setPaymentStatus('paid')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition border ${paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-400 font-black' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-transparent'}`}
                    >
                      {isAr ? 'تم الدفع (كاش/نقداً)' : 'Paid Cash'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setPaymentStatus('pending')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition border ${paymentStatus === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-400 font-black animate-pulse' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-transparent'}`}
                    >
                      {isAr ? 'ذمم/آجل (على الحساب)' : 'Pending/Credit'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-black mb-1 flex items-center justify-end gap-1">
                    <span>📦</span>
                    <span>{isAr ? 'وجهة تخزين السلع المستلمة:' : 'Storage/Refill Destination:'}</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      type="button"
                      onClick={() => setPurchaseDestination('shop')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition border flex items-center justify-center gap-1.5 cursor-pointer ${purchaseDestination === 'shop' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'}`}
                    >
                      <span>🏪</span>
                      <span>{isAr ? 'المحل مباشرة' : 'Direct to Shop'}</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setPurchaseDestination('warehouse')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition border flex items-center justify-center gap-1.5 cursor-pointer ${purchaseDestination === 'warehouse' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'}`}
                    >
                      <span>📦</span>
                      <span>{isAr ? 'المستودع / المخزن' : 'Warehouse'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">{isAr ? 'ملاحظات إضافية على التموين:' : 'Internal Stock Note:'}</label>
                  <textarea 
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 placeholder-slate-400"
                    placeholder={isAr ? 'ملاحظات حول طريقة الاستلام أو خصومات إضافية...' : 'e.g. Received by storekeeper'}
                  />
                </div>

                {/* Transportation / Delivery Expenses */}
                <div className="bg-emerald-50/20 p-3 bg-[#EAF7FA]/20 border border-emerald-100/50 rounded-xl space-y-2 text-right">
                  <label className="block text-slate-700 font-black text-xs flex items-center justify-end gap-1.5">
                    <span>🚚</span>
                    <span>{isAr ? 'تكاليف المواصلات / الشحن ($):' : 'Transportation / Shipment Cost ($):'}</span>
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="number"
                      step="0.01"
                      min="0"
                      value={transportationCost}
                      onChange={e => setTransportationCost(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-center text-slate-800 font-bold text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      placeholder="0.00"
                    />
                    <button
                      type="button"
                      onClick={handleDistributeTransportationCost}
                      disabled={draftItems.length === 0 || (parseFloat(transportationCost) || 0) <= 0}
                      className={`px-3 text-[10px] font-black rounded-lg transition shrink-0 cursor-pointer ${
                        draftItems.length > 0 && (parseFloat(transportationCost) || 0) > 0
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 transform active:scale-95 shadow-xs'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      }`}
                      title={isAr ? 'توزيع وزيادة تكلفة المواصلات على رأس مال المنتجات بالتناسب تلقائياً' : 'Distribute delivery cost proportionally inside items cost prices'}
                    >
                      {isAr ? 'توزيع تناسبي 🚚' : 'Amortize 🚚'}
                    </button>
                  </div>
                  <span className="text-[9px] text-slate-550 block leading-relaxed">
                    {isAr 
                      ? '💡 اضغط "توزيع تناسبي" لزيادة كلفة السلع تلقائياً بناءً على وزنها من تكلفة النقل الإجمالية، أو اتركها لإضافتها لدفتر الفواتير.' 
                      : '💡 Toggle "Amortize" to add transport expenses on top of unit costs, or leave it to record strictly on the ledger.'}
                  </span>
                </div>
              </div>

              {/* Total Invoice Draft Calculation Card */}
              {(() => {
                const totalItemsCost = sumLines(draftItems, lineGross);
                const totalDiscount = sumLines(draftItems, lineDiscount);
                const totalTax = sumLines(draftItems, lineTax);
                const totalFree = draftItems.reduce((acc, d) => acc + (d.freeQty || 0), 0);
                const transCostNum = parseFloat(transportationCost) || 0;
                const grandTotalCost = totalItemsCost - totalDiscount + totalTax + transCostNum;

                return (
                  <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-2 border border-slate-800 text-right font-sans">
                    <div className="flex justify-between border-b border-slate-800 pb-1.5 text-xs text-slate-400">
                      <span className="font-mono">{totalItemsCost.toFixed(2)} $</span>
                      <span>{isAr ? 'إجمالي السلع:' : 'Items Total:'}</span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className="flex justify-between border-b border-slate-800 pb-1.5 text-xs text-emerald-300" id="purchase-draft-discount">
                        <span className="font-mono">- {totalDiscount.toFixed(2)} $</span>
                        <span>{isAr ? 'الحسم:' : 'Discount:'}</span>
                      </div>
                    )}
                    {totalFree > 0 && (
                      <div className="flex justify-between border-b border-slate-800 pb-1.5 text-xs text-sky-300" id="purchase-draft-free">
                        <span className="font-mono">{totalFree}</span>
                        <span>{isAr ? '🎁 بضاعة مجانية (بونص):' : '🎁 Free bonus units:'}</span>
                      </div>
                    )}
                    {totalTax > 0 && (
                      <div className="flex justify-between border-b border-slate-800 pb-1.5 text-xs text-amber-300" id="purchase-draft-vat">
                        <span className="font-mono">+ {totalTax.toFixed(2)} $</span>
                        <span>{isAr ? 'الضريبة (TVA):' : 'VAT:'}</span>
                      </div>
                    )}
                    {transCostNum > 0 && (
                      <div className="flex justify-between border-b border-slate-800 pb-1.5 text-xs text-slate-400">
                        <span className="font-mono">+ {transCostNum.toFixed(2)} $</span>
                        <span>{isAr ? 'تكاليف المواصلات:' : 'Transportation:'}</span>
                      </div>
                    )}
                    <div className="pt-1">
                      <span className="text-[10px] text-slate-400 font-semibold block">{isAr ? 'إجمالي الفاتورة النهائي:' : 'Grand Invoice Total:'}</span>
                      <span className="text-2xl font-black font-mono text-yellow-400 block">
                        {grandTotalCost.toFixed(2)} $
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block font-normal">
                      {isAr ? 'بالعملة اللبنانية تقريباً:' : 'Approximately in LBP:'}{' '}
                      <span className="font-mono text-emerald-400 font-bold">
                        {(grandTotalCost * 89000).toLocaleString()} ل.ل
                      </span>
                    </span>
                  </div>
                );
              })()}

              <button
                onClick={handleSavePurchaseInvoice}
                disabled={draftItems.length === 0}
                className={`w-full py-3 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                  draftItems.length > 0 
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-700/20' 
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                {isAr ? 'ترحيل الفاتورة وتحديث مخازن المحل 📥' : 'Save Invoice & Refill Stocks 📥'}
              </button>
            </div>
          </div>

          {/* RIGHT SIDE/TWO COLUMNS: DRAFT PRODUCTS LIST & ADD-PRODUCT SEARCH BAR */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Selector/Search Engine for adding products inside the invoice */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 relative">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-500" />
                  {isAr ? 'أدرج بضاعة للشراء والتسعير' : 'Add Stock Items To List'}
                </h3>

                {/* Quick Add Form Trigger Toggle */}
                <button
                  type="button"
                  onClick={() => setShowQuickAddForm(!showQuickAddForm)}
                  className="bg-indigo-50 border border-indigo-150 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 self-end cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isAr ? 'إدخال صنف جديد كلياً غير موجود سريعاً 🆕' : 'Catalog New Product 🆕'}
                </button>
              </div>

              {/* QUICK NEW ITEM MASTER CREATION CARD (HIDDEN BY DEFAULT) */}
              {showQuickAddForm && (
                <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl text-right animate-fadeIn">
                  <form onSubmit={handleQuickAddProduct} className="space-y-3 font-sans">
                    <h4 className="text-xs font-black text-indigo-800 border-b border-indigo-100 pb-1.5">{isAr ? '🆕 تسجيل صنف جديد في سجلات السوبرماركت مباشرة' : 'New Catalog Record'}</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-500 font-bold mb-1 text-[11px]">{isAr ? 'الاسم التجاري للصنف:' : 'Name:'}</label>
                        <input 
                          type="text" 
                          required
                          value={newProdName}
                          onChange={e => setNewProdName(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-sans text-right"
                          placeholder="مثال: شوكولا كادبوري 200غ"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 font-bold mb-1 text-[11px]">{isAr ? 'الباركود الكامل (رقم الاسكنر):' : 'Barcode:'}</label>
                        <input 
                          type="text" 
                          required
                          value={newProdBarcode}
                          onChange={e => setNewProdBarcode(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-center font-mono"
                          placeholder="الباركود"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setShowInlineCategoryInput(!showInlineCategoryInput)}
                            className="text-xs text-indigo-650 hover:underline font-bold"
                          >
                            {showInlineCategoryInput ? (isAr ? 'إلغاء ✖' : 'Cancel ✖') : (isAr ? '➕ فئة جديدة' : '➕ New Category')}
                          </button>
                          <label className="block text-slate-500 font-bold">{isAr ? 'القسم / فئة البقالة:' : 'Category:'}</label>
                        </div>
                        
                        {showInlineCategoryInput ? (
                          <div className="flex gap-1.5 items-center">
                            <button
                              type="button"
                              onClick={handleCreateCategoryInline}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-2 rounded-lg text-xs font-black transition cursor-pointer shrink-0"
                            >
                              {isAr ? 'حفظ' : 'Add'}
                            </button>
                            <input
                              type="text"
                              value={inlineCategoryName}
                              onChange={e => setInlineCategoryName(e.target.value)}
                              placeholder={isAr ? 'اسم القسم الجديد...' : 'New Category...'}
                              className="w-full bg-white border border-indigo-200 rounded-lg p-2 text-xs font-sans text-right"
                            />
                          </div>
                        ) : (
                          <select 
                            value={newProdCategory}
                            onChange={e => setNewProdCategory(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-right font-sans hover:border-slate-350 transition"
                          >
                            {categories.map(c => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                      <div>
                        <label className="block text-rose-600 font-black mb-1 text-[11px]" htmlFor="quick-add-qty">{isAr ? 'الكمية المستلمة 📥:' : 'Received Qty 📥:'}</label>
                        <input
                          id="quick-add-qty"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          required
                          value={newProdQty}
                          onChange={e => setNewProdQty(e.target.value)}
                          className="w-full bg-white border-2 border-rose-300 focus:border-emerald-500 rounded-lg p-2 text-xs text-center font-mono font-black"
                          placeholder={isAr ? 'مثال: 24' : 'e.g. 24'}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 font-bold mb-1 text-[11px]">{isAr ? 'سعر كلفة الشراء ($):' : 'Cost Price ($):'}</label>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          required
                          value={newProdCost}
                          onChange={e => setNewProdCost(e.target.value)}
                          onBlur={e => handleMathBlur(e.target.value, setNewProdCost)}
                          onKeyDown={e => handleMathKeyDown(e, e.currentTarget.value, setNewProdCost)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-center font-mono"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 font-bold mb-1 text-[11px]">{isAr ? 'الضريبة TVA (%):' : 'VAT (%):'}</label>
                        <div className="flex gap-1">
                          <input
                            id="quick-add-vat"
                            type="number"
                            step="0.01"
                            min="0"
                            value={newProdTaxRate}
                            onChange={e => setNewProdTaxRate(e.target.value)}
                            className="w-full min-w-0 bg-white border border-slate-200 rounded-lg p-2 text-xs text-center font-mono"
                          />
                          {VAT_PRESETS.filter(r => r > 0).map(r => (
                            <button
                              key={`quick-vat-${r}`}
                              type="button"
                              onClick={() => setNewProdTaxRate(parseFloat(newProdTaxRate) === r ? '0' : String(r))}
                              className={`px-2 rounded-lg border text-[10px] font-black cursor-pointer shrink-0 ${parseFloat(newProdTaxRate) === r ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-400'}`}
                            >
                              {r}%
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-500 font-bold mb-1 text-[11px]">{isAr ? 'سعر البيع مفرق للرف ($):' : 'Retail Price ($):'}</label>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          required
                          value={newProdSellRetail}
                          onChange={e => setNewProdSellRetail(e.target.value)}
                          onBlur={e => handleMathBlur(e.target.value, setNewProdSellRetail)}
                          onKeyDown={e => handleMathKeyDown(e, e.currentTarget.value, setNewProdSellRetail)}
                          className="w-full bg-white border border-indigo-200 rounded-lg p-2 text-xs text-center font-mono font-bold text-indigo-700"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 font-bold mb-1 text-[11px]">{isAr ? 'سعر البيع جملة ($):' : 'Wholesale Price ($):'}</label>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          value={newProdSellWholesale}
                          onChange={e => setNewProdSellWholesale(e.target.value)}
                          onBlur={e => handleMathBlur(e.target.value, setNewProdSellWholesale)}
                          onKeyDown={e => handleMathKeyDown(e, e.currentTarget.value, setNewProdSellWholesale)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-center font-mono"
                          placeholder="أو يترك تلقائي"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 font-bold mb-1 text-[11px]">{isAr ? 'تاريخ انتهاء الصلاحية:' : 'Expiry Date:'}</label>
                        <input 
                          type="date" 
                          value={newProdExpiry}
                          onChange={e => setNewProdExpiry(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-center font-mono"
                        />
                      </div>
                    </div>

                    {/* Supplier discount and bonus for the new item */}
                    <div className="flex flex-wrap items-end gap-3 text-xs bg-white/70 border border-slate-200 rounded-lg p-2.5">
                      <div className="w-32">
                        <label className="block text-slate-500 font-bold mb-1 text-[11px]" htmlFor="quick-add-discount">{isAr ? 'حسم المورّد (%):' : 'Discount (%):'}</label>
                        <input
                          id="quick-add-discount"
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          placeholder="0"
                          value={newProdDiscount}
                          onChange={e => setNewProdDiscount(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-center font-mono font-bold text-emerald-700"
                        />
                      </div>
                      <div className="flex items-end gap-1.5">
                        <div>
                          <label className="block text-slate-500 font-bold mb-1 text-[11px]" htmlFor="quick-add-bonus-every">{isAr ? '🎁 بونص: كل' : '🎁 Bonus: every'}</label>
                          <input
                            id="quick-add-bonus-every"
                            type="number"
                            min="0"
                            placeholder="12"
                            value={newProdBonusEvery}
                            onChange={e => setNewProdBonusEvery(e.target.value)}
                            className="w-16 bg-white border border-slate-200 rounded-lg p-2 text-center font-mono font-bold"
                          />
                        </div>
                        <span className="pb-2.5 text-slate-500 font-bold">{isAr ? 'بيطلع' : 'get'}</span>
                        <input
                          id="quick-add-bonus-free"
                          type="number"
                          min="0"
                          placeholder="1"
                          value={newProdBonusFree}
                          onChange={e => setNewProdBonusFree(e.target.value)}
                          className="w-14 bg-white border border-slate-200 rounded-lg p-2 text-center font-mono font-bold"
                          aria-label={isAr ? 'الكمية المجانية لكل دفعة' : 'Free units per batch'}
                        />
                        <span className="pb-2.5 text-slate-500 font-bold">{isAr ? 'مجاناً' : 'free'}</span>
                      </div>
                      {(() => {
                        const free = bonusFor(parseFloat(newProdQty) || 0, parseInt(newProdBonusEvery) || 0, parseInt(newProdBonusFree) || 0);
                        return free > 0 ? (
                          <span className="text-[11px] font-black bg-sky-100 text-sky-800 border border-sky-200 px-2 py-1 rounded mb-1">
                            🎁 {isAr ? `+${free} مجاناً على هالكمية` : `+${free} free on this quantity`}
                          </span>
                        ) : null;
                      })()}
                    </div>

                    {/* --- DYNAMIC PRICING MARGIN ASSISTANT FOR QUICK NEW PRODUCT --- */}
                    {(() => {
                      const qQty = parseFloat(newProdQty) || 0;
                      const qCost = landedCost({ // real unit cost: after discount, VAT included, spread over free units
                        qty: qQty,
                        costPriceUSD: parseFloat(newProdCost) || 0,
                        taxRate: Math.max(0, parseFloat(newProdTaxRate) || 0),
                        discountPercent: Math.min(100, Math.max(0, parseFloat(newProdDiscount) || 0)),
                        freeQty: bonusFor(qQty, parseInt(newProdBonusEvery) || 0, parseInt(newProdBonusFree) || 0),
                      });
                      const qPrice = parseFloat(newProdSellRetail) || 0;
                      const qProfit = qPrice - qCost;
                      const qMargin = qPrice > 0 ? (qProfit / qPrice) * 100 : 0;
                      const qMarkup = qCost > 0 ? (qProfit / qCost) * 100 : 0;

                      return (
                        <div className="bg-emerald-50/40 border border-emerald-100 p-4 rounded-xl text-right font-sans space-y-3.5 mt-3">
                          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-emerald-100 pb-2.5 w-full">
                            <div className="text-xs font-black text-emerald-950 flex items-center justify-start gap-1 flex-row-reverse">
                              <span>💰 احتساب السعر التلقائي بهامش الربح:</span>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              {/* Presets */}
                              <div className="flex flex-wrap items-center justify-end gap-1.5 flex-row-reverse text-xs">
                                <span className="text-slate-650 font-bold ml-1 text-[10px]">هامش ربح مبيع (Margin):</span>
                                {[5, 10, 15, 20, 25, 30, 40, 50].map(m => (
                                  <button
                                    key={`q-m-${m}`}
                                    type="button"
                                    onClick={() => {
                                      if (qCost > 0) {
                                        const targetPrice = qCost / (1 - m / 100);
                                        setNewProdSellRetail(targetPrice.toFixed(2));
                                        setNewProdSellWholesale((targetPrice * 0.9).toFixed(2));
                                        showToast('success', `تم احتساب سعر المبيع بهامش ربح %${m}! ⚡`);
                                      } else {
                                        showToast('error', 'يرجى إدخال سعر كلفة الشراء أولاً لتشغيل الحاسبة بشكل صحيح.');
                                      }
                                    }}
                                    className="px-2 py-0.5 bg-white hover:bg-emerald-100 text-emerald-800 font-bold rounded border border-slate-200 hover:border-emerald-300 transition-all text-[9.5px] cursor-pointer"
                                  >
                                    %{m}
                                  </button>
                                ))}
                              </div>

                              <div className="flex flex-wrap items-center justify-end gap-1.5 flex-row-reverse text-xs">
                                <span className="text-slate-655 font-bold ml-1 text-[10px]">زيادة فوق التكلفة (Markup):</span>
                                {[10, 20, 30, 45, 60, 80, 100].map(mk => (
                                  <button
                                    key={`q-mk-${mk}`}
                                    type="button"
                                    onClick={() => {
                                      if (qCost > 0) {
                                        const targetPrice = qCost * (1 + mk / 100);
                                        setNewProdSellRetail(targetPrice.toFixed(2));
                                        setNewProdSellWholesale((targetPrice * 0.9).toFixed(2));
                                        showToast('success', `تم احتساب سعر المبيع بزيادة %${mk} فوق التكلفة! ⚡`);
                                      } else {
                                        showToast('error', 'يرجى إدخال سعر كلفة الشراء أولاً.');
                                      }
                                    }}
                                    className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold rounded border border-indigo-100 hover:border-indigo-200 transition-all text-[9.5px] cursor-pointer"
                                  >
                                    %{mk}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Manual Input inline in purchase tab */}
                          <div className="flex flex-wrap items-center justify-end gap-3 flex-row-reverse border-t border-emerald-100/50 pt-2.5 text-xs">
                            <span className="text-slate-700 font-extrabold text-[10px] ml-1">تحديد يدوي مخصص:</span>
                            
                            <div className="flex items-center gap-1.5 flex-row-reverse">
                              <span className="text-[9px] text-slate-500 font-bold">هامش ربح مبيع %:</span>
                              <input
                                type="number"
                                min="0"
                                max="99"
                                placeholder="مثال: 12"
                                value={quickMarginVal}
                                onChange={e => setQuickMarginVal(e.target.value)}
                                className="w-14 text-center bg-white border border-slate-200 focus:ring-1 focus:ring-emerald-500 py-0.5 px-1 rounded text-[10px] font-bold font-sans"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const m = parseFloat(quickMarginVal);
                                  if (isNaN(m) || m < 0 || m >= 100) {
                                    showToast('error', 'يرجى إدخال رقم هامش مبيع صحيح بين 0 و 99.');
                                    return;
                                  }
                                  if (qCost > 0) {
                                    const targetPrice = qCost / (1 - m / 100);
                                    setNewProdSellRetail(targetPrice.toFixed(2));
                                    setNewProdSellWholesale((targetPrice * 0.9).toFixed(2));
                                    showToast('success', `تم احتساب سعر المبيع بهامش ربح يدوي %${m}! ⚡`);
                                  } else {
                                    showToast('error', 'يرجى إدخال سعر كلفة الشراء أولاً لتشغيل الحاسبة.');
                                  }
                                }}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded text-[9px] cursor-pointer"
                              >
                                تطبيق هامش ⚡
                              </button>
                            </div>

                            <span className="text-slate-300">|</span>

                            <div className="flex items-center gap-1.5 flex-row-reverse">
                              <span className="text-[9px] text-slate-500 font-bold">زيادة فوق التكلفة %:</span>
                              <input
                                type="number"
                                min="0"
                                placeholder="مثال: 25"
                                value={quickMarkupVal}
                                onChange={e => setQuickMarkupVal(e.target.value)}
                                className="w-14 text-center bg-white border border-slate-200 focus:ring-1 focus:ring-indigo-500 py-0.5 px-1 rounded text-[10px] font-bold font-sans"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const mk = parseFloat(quickMarkupVal);
                                  if (isNaN(mk) || mk < 0) {
                                    showToast('error', 'يرجى إدخال نسبة مئوية صحيحة للزيادة أكبر من الصفر.');
                                    return;
                                  }
                                  if (qCost > 0) {
                                    const targetPrice = qCost * (1 + mk / 100);
                                    setNewProdSellRetail(targetPrice.toFixed(2));
                                    setNewProdSellWholesale((targetPrice * 0.9).toFixed(2));
                                    showToast('success', `تم احتساب سعر المبيع بزيادة يدوية %${mk}! ⚡`);
                                  } else {
                                    showToast('error', 'يرجى إدخال سعر كلفة الشراء أولاً.');
                                  }
                                }}
                                className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded text-[9px] cursor-pointer"
                              >
                                تطبيق زيادة ⚡
                              </button>
                            </div>
                          </div>

                          {/* Live Math analysis */}
                          <div className="grid grid-cols-4 gap-2 text-center text-[10px] pt-1.5 border-t border-dashed border-emerald-100">
                            <div className="bg-white/70 p-1.5 rounded">
                              <span className="text-slate-400 block">الكلفة المدخلة</span>
                              <span className="font-mono font-black text-slate-700">{qCost.toFixed(2)} $</span>
                            </div>
                            <div className="bg-white/70 p-1.5 rounded">
                              <span className="text-slate-400 block">سعر البيع المقترح</span>
                              <span className="font-mono font-black text-emerald-850">{qPrice.toFixed(2)} $</span>
                            </div>
                            <div className="bg-white/70 p-1.5 rounded">
                              <span className="text-slate-400 block">صافي الربح ($)</span>
                              <span className="font-mono font-black text-slate-800">{qProfit.toFixed(2)} $</span>
                            </div>
                            <div className="bg-white/70 p-1.5 rounded text-left">
                              <span className="text-slate-400 block">النسبة الفعلية للربحية</span>
                              <span className="font-bold text-indigo-850 block">من المبيع: {qMargin.toFixed(1)}% | فوق الكلفة: {qMarkup.toFixed(1)}%</span>
                            </div>
                          </div>

                        </div>
                      );
                    })()}

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowQuickAddForm(false)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                      >
                        {isAr ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-1.5 rounded-lg text-xs font-black transition shadow-xs"
                      >
                        {isAr ? 'حفظ الصنف وإدراجه بالفاتورة' : 'Save and Insert'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Product search box */}
              <div className="relative">
                <input 
                  type="text" 
                  value={prodSearchQuery}
                  onChange={e => {
                    setProdSearchQuery(e.target.value);
                    setShowProdDropdown(true);
                  }}
                  onFocus={() => setShowProdDropdown(true)}
                  placeholder={isAr ? '🔎 ابحث باسم الصنف أو بالباركود لإدراجه في فواتير الشراء للتسعير... (أو انقر لعرض الكل)' : '🔎 Scan or search master products index...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-3 pr-10 text-xs font-sans text-right placeholder-slate-400"
                />
                <Search className="w-4.5 h-4.5 text-slate-400 absolute right-3.5 top-3.5" />

                {/* DROPDOWN MATCHED ITEMS LIST */}
                {showProdDropdown && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto text-right divide-y divide-slate-100">
                    <div className="p-2 flex items-center justify-between bg-slate-50 text-[10px] text-slate-400">
                      <button 
                        onClick={() => setShowProdDropdown(false)}
                        className="text-rose-500 font-extrabold hover:underline"
                      >
                        {isAr ? 'إغلاق القائمة ✕' : 'Close ✕'}
                      </button>
                      <span>{isAr ? 'اختر صنفاً متاحاً لإدراجه في فاتورة الشراء:' : 'Select product to put on receipt:'}</span>
                    </div>

                    {products
                      .filter(p => {
                        if (!prodSearchQuery) return true;
                        const s = prodSearchQuery.toLowerCase().trim();
                        return p.name.toLowerCase().includes(s) || p.barcode.includes(s) || (p.barcodes && p.barcodes.some(b => b.includes(s)));
                      })
                      .map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleAddProductToDraft(p)}
                          className="w-full p-3 hover:bg-emerald-50 transition flex items-center justify-between text-xs gap-3 font-sans cursor-pointer text-right"
                        >
                          <div className="flex items-center gap-2">
                            <span className="bg-emerald-50 text-emerald-705 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                              🏪 {p.quantity} {isAr ? 'بالمحل' : 'in shop'}
                            </span>
                            <span className="bg-indigo-50 text-indigo-705 border border-indigo-100 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                              📦 {p.warehouseQuantity || 0} {isAr ? 'بالمستودع' : 'in WH'}
                            </span>
                            <span className="text-slate-400 font-mono text-[10px]">{p.barcode}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-800 block">{p.name}</span>
                            <span className="text-[10px] text-slate-400 bg-slate-50 px-1 py-0.2 rounded font-sans">{p.category}</span>
                          </div>
                        </button>
                      ))}

                    {products.filter(p => {
                      if (!prodSearchQuery) return true;
                      const s = prodSearchQuery.toLowerCase().trim();
                      return p.name.toLowerCase().includes(s) || p.barcode.includes(s) || (p.barcodes && p.barcodes.some(b => b.includes(s)));
                    }).length === 0 && (
                      <div className="p-6 text-center text-slate-400 text-xs font-semibold space-y-2">
                        <p>{isAr ? 'عفواً! لم يتم العثور على أي صنف مطابق للبحث حالياً.' : 'No catalog items match your query.'}</p>
                        <button
                          onClick={() => {
                            setNewProdBarcode(prodSearchQuery.trim());
                            setNewProdName(prodSearchQuery);
                            setShowQuickAddForm(true);
                            setShowProdDropdown(false);
                          }}
                          className="text-[#1D9E75] font-extrabold text-xs underline block mx-auto hover:text-emerald-700 font-sans"
                        >
                          {isAr ? 'انقر هنا لتسجيل هذا الصنف سريعاً بالأرفف 🆕' : 'Quick register this query 🆕'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 2. DRAFT ITEMS TABLE */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="bg-[#1D9E75]/10 text-[#1D9E75] px-3 py-1 rounded-lg text-xs font-extrabold font-mono">
                  {draftItems.length} {isAr ? 'أصناف مختلفة' : 'variants listed'}
                </span>
                <h4 className="font-bold text-slate-800 text-sm">{isAr ? 'قائمة الفواتير والأسعار المدخلة' : 'Purchase Receipt Items Details'}</h4>
              </div>

              {draftItems.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-sans space-y-3">
                  <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <Truck className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-bold">{isAr ? 'لم تقم بإدراج أي أصناف في فاتورة الشراء هذه حتى الآن!' : 'Procurement scratchpad is empty. Use the box above to add products.'}</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">{isAr ? 'يرجى كتابة اسم الصنف في محرك البحث بالأعلى أو تمرير باركود الاستلام لإدخاله فورياً وقيد الكميات.' : 'Type any stock item inside scanner search or click toggle to construct a new catalog item directly.'}</p>
                </div>
              ) : (
                <div className="space-y-4 font-sans text-right">
                  {draftItems.map((item, idx) => {
                    return (
                      <div key={item.product.id} className={`bg-slate-50 border rounded-xl p-4 space-y-3 transition relative ${item.qty > 0 ? 'border-slate-150 hover:border-slate-300' : 'border-rose-300'}`}>
                        
                        {/* Title and Category block */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 pb-2">
                          
                          {/* Row actions */}
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-emerald-600' font-extrabold text-xs bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded">
                              {isAr ? 'المجموع:' : 'Sub:'} <span className="font-black">{lineTotal(item).toFixed(2)}$</span>
                              {item.discountPercent > 0 && <span className="text-[9px] font-bold text-emerald-700 mr-1">{isAr ? `بعد حسم ${item.discountPercent}%` : `after ${item.discountPercent}% off`}</span>}
                              {item.taxRate > 0 && <span className="text-[9px] font-bold text-amber-700 mr-1">{isAr ? `شامل ضريبة ${item.taxRate}%` : `incl. ${item.taxRate}% VAT`}</span>}
                            </span>
                            {item.freeQty > 0 && (
                              <span className="text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-200 px-2 py-1 rounded">
                                🎁 {isAr ? `+${item.freeQty} مجاناً` : `+${item.freeQty} free`}
                              </span>
                            )}
                            <button
                              onClick={() => handleRemoveFromDraft(idx)}
                              className="text-rose-500 hover:text-white hover:bg-rose-500 p-1 rounded-lg transition"
                              title={isAr ? 'بعد من الفاتورة' : 'Remove item'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Brand Info */}
                          <div className="font-sans text-right">
                            <span className="font-black text-slate-800 text-sm block">{draftItems.length - idx}. {item.product.name}</span>
                            <div className="flex items-center gap-2 mt-0.5 justify-end">
                              <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-semibold font-mono">{item.product.barcode}</span>
                              <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-semibold">{item.product.category}</span>
                              <span className="text-[10px] bg-amber-50 border border-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black font-mono">
                                {isAr ? 'متوفر حالياً بالرف:' : 'In-stock currently:'} {item.product.quantity}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Editable properties: Inputs */}
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 font-sans text-xs">
                          
                          {/* 1. Qty to buy */}
                          <div>
                            <label className={`block font-bold mb-1 text-[10px] ${item.qty > 0 ? 'text-slate-500' : 'text-rose-600'}`} htmlFor={`draft-qty-${item.product.id}`}>{isAr ? 'الكمية المستلمة 📥 (مطلوب):' : 'Received Qty 📥 (required):'}</label>
                            <input
                              id={`draft-qty-${item.product.id}`}
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="any"
                              required
                              placeholder={isAr ? 'الكمية' : 'Qty'}
                              value={item.qty > 0 ? item.qty : ''}
                              onChange={e => handleUpdateDraftField(idx, 'qty', Math.max(0, parseFloat(e.target.value) || 0))}
                              className={`w-full rounded-lg p-1.5 text-center font-mono font-black text-slate-800 border-2 ${item.qty > 0 ? 'bg-white border-slate-200' : 'bg-rose-50 border-rose-400'}`}
                            />
                          </div>

                          {/* 2. Cost Price */}
                          <div>
                            <label className="block text-slate-500 font-bold mb-1 text-[10px]">{isAr ? 'سعر التكلفة الجديد ($):' : 'Unit Cost Price ($):'}</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              id={`draft-cost-${item.product.id}`}
                              value={item.costPriceUSD}
                              onChange={e => handleUpdateDraftField(idx, 'costPriceUSD', Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-center font-mono font-bold text-slate-700"
                            />
                          </div>

                          {/* 2b. VAT charged by the supplier */}
                          <div>
                            <label className="block text-slate-500 font-bold mb-1 text-[10px]">{isAr ? 'الضريبة TVA (%):' : 'VAT (%):'}</label>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.taxRate}
                                onChange={e => handleUpdateDraftField(idx, 'taxRate', Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-full min-w-0 bg-white border border-slate-200 rounded-lg p-1.5 text-center font-mono font-bold text-slate-700"
                                aria-label={isAr ? 'نسبة الضريبة' : 'VAT rate'}
                              />
                              {VAT_PRESETS.filter(r => r > 0).map(r => (
                                <button
                                  key={`vat-${idx}-${r}`}
                                  type="button"
                                  onClick={() => handleUpdateDraftField(idx, 'taxRate', item.taxRate === r ? 0 : r)}
                                  className={`px-1.5 rounded-lg border text-[10px] font-black cursor-pointer shrink-0 ${item.taxRate === r ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-400'}`}
                                >
                                  {r}%
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 3. Retail Sell Price */}
                          <div>
                            <label className="block text-slate-600 font-black mb-1 text-[10px] text-[#1D9E75]">{isAr ? 'سعر البيع مفرّق الجديد ($):' : 'New Retail Sell ($):'}</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              value={item.newPriceUSD}
                              onChange={e => handleUpdateDraftField(idx, 'newPriceUSD', Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-full bg-emerald-50 border border-emerald-200 rounded-lg p-1.5 text-center font-mono font-black text-emerald-800"
                            />
                          </div>

                          {/* 4. Wholesale Sell Price */}
                          <div>
                            <label className="block text-slate-500 font-bold mb-1 text-[10px]">{isAr ? 'سعر الجملة الجديد ($):' : 'New Wholesale Sell ($):'}</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.newPriceWholesale}
                              onChange={e => handleUpdateDraftField(idx, 'newPriceWholesale', Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-center font-mono"
                            />
                          </div>

                          {/* 5. Expiry update date */}
                          <div className="col-span-2 sm:col-span-1">
                            <label className="block text-slate-500 font-bold mb-1 text-[10px]">{isAr ? 'تاريخ الصلاحية الجديد:' : 'New Batch Expiry:'}</label>
                            <input
                              type="date"
                              value={item.expiryDate}
                              onChange={e => handleUpdateDraftField(idx, 'expiryDate', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-center font-mono text-slate-700"
                            />
                          </div>

                        </div>

                        {/* Supplier discount and bonus (free units) */}
                        <div className="flex flex-wrap items-end gap-3 font-sans text-xs bg-white/60 border border-slate-150 rounded-lg p-2.5">
                          <div className="w-28">
                            <label className="block text-slate-500 font-bold mb-1 text-[10px]" htmlFor={`draft-discount-${item.product.id}`}>{isAr ? 'حسم المورّد (%):' : 'Discount (%):'}</label>
                            <input
                              id={`draft-discount-${item.product.id}`}
                              type="number"
                              min="0"
                              max="100"
                              step="any"
                              placeholder="0"
                              value={item.discountPercent || ''}
                              onChange={e => handleUpdateDraftField(idx, 'discountPercent', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                              className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-center font-mono font-bold text-emerald-700"
                            />
                          </div>
                          <div className="flex items-end gap-1.5">
                            <div>
                              <label className="block text-slate-500 font-bold mb-1 text-[10px]">{isAr ? '🎁 بونص: كل' : '🎁 Bonus: every'}</label>
                              <input
                                id={`draft-bonus-every-${item.product.id}`}
                                type="number"
                                min="0"
                                placeholder="12"
                                value={item.bonusEvery || ''}
                                onChange={e => handleUpdateDraftField(idx, 'bonusEvery', Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-16 bg-white border border-slate-200 rounded-lg p-1.5 text-center font-mono font-bold"
                              />
                            </div>
                            <span className="pb-2 text-slate-500 font-bold">{isAr ? 'بيطلع' : 'get'}</span>
                            <input
                              id={`draft-bonus-free-${item.product.id}`}
                              type="number"
                              min="0"
                              placeholder="1"
                              value={item.bonusFree || ''}
                              onChange={e => handleUpdateDraftField(idx, 'bonusFree', Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-14 bg-white border border-slate-200 rounded-lg p-1.5 text-center font-mono font-bold"
                            />
                            <span className="pb-2 text-slate-500 font-bold">{isAr ? 'مجاناً' : 'free'}</span>
                          </div>
                          <div className="w-28">
                            <label className="block text-sky-700 font-bold mb-1 text-[10px]" htmlFor={`draft-free-${item.product.id}`}>{isAr ? 'الكمية المجانية:' : 'Free units:'}</label>
                            <input
                              id={`draft-free-${item.product.id}`}
                              type="number"
                              min="0"
                              step="any"
                              placeholder="0"
                              value={item.freeQty || ''}
                              onChange={e => handleUpdateDraftField(idx, 'freeQty', Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-full bg-sky-50 border border-sky-200 rounded-lg p-1.5 text-center font-mono font-black text-sky-800"
                            />
                          </div>
                          {(item.freeQty > 0 || item.discountPercent > 0) && item.qty > 0 && (
                            <span className="text-[10px] text-slate-500 font-semibold pb-2">
                              {isAr
                                ? `بينضاف للمخزن ${item.qty + item.freeQty} • كلفة القطعة الفعلية ${landedCost(item).toFixed(3)}$`
                                : `${item.qty + item.freeQty} into stock • real unit cost ${landedCost(item).toFixed(3)}$`}
                            </span>
                          )}
                        </div>

                        {/* --- INLINE DYNAMIC PRICING MARGIN ASSISTANT FOR DRAFT ITEM --- */}
                        {(() => {
                          const dCost = landedCost(item); // margins on the real cost, VAT included
                          const dPrice = item.newPriceUSD;
                          const dProfit = dPrice - dCost;
                          const dMargin = dPrice > 0 ? (dProfit / dPrice) * 100 : 0;
                          const dMarkup = dCost > 0 ? (dProfit / dCost) * 100 : 0;

                          const marginInputVal = draftMarginInputs[item.product.id] || '';
                          const markupInputVal = draftMarkupInputs[item.product.id] || '';

                          return (
                            <div className="bg-emerald-50/20 border border-emerald-50/70 p-3 rounded-lg text-right font-sans space-y-2.5 mt-2.5">
                              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 border-b border-emerald-50/60 pb-2">
                                <div className="text-[10px] font-extrabold text-emerald-950 flex items-center justify-start gap-1 flex-row-reverse">
                                  <span>⚙️ حاسبة وبدائل هوامش هذا الصنف:</span>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                  {/* Presets */}
                                  <div className="flex flex-wrap items-center justify-end gap-1 flex-row-reverse text-[11px]">
                                    <span className="text-slate-500 font-semibold ml-1 text-[9px]">{isAr ? 'هامش ربح مبيع (Margin):' : 'Margin Presets:'}</span>
                                    {[5, 10, 15, 20, 25, 30, 40, 50].map(m => (
                                      <button
                                        key={`item-m-${idx}-${m}`}
                                        type="button"
                                        onClick={() => {
                                          if (dCost > 0) {
                                            const targetPrice = dCost / (1 - m / 100);
                                            handleUpdateDraftField(idx, 'newPriceUSD', parseFloat(targetPrice.toFixed(2)));
                                            handleUpdateDraftField(idx, 'newPriceWholesale', parseFloat((targetPrice * 0.9).toFixed(2)));
                                            showToast('success', isAr ? `تم تعيين البيع مفرق بهامش %${m}!` : `Retail set at %${m} margin!`);
                                          } else {
                                            showToast('error', isAr ? 'يرجى تحديد كلفة شراء الصنف أولاً!' : 'Please enter item cost first!');
                                          }
                                        }}
                                        className="px-1.5 py-0.5 bg-white hover:bg-emerald-50 text-emerald-800 font-bold rounded border border-slate-150 hover:border-emerald-250 transition-all text-[8.5px] cursor-pointer"
                                      >
                                        %{m}
                                      </button>
                                    ))}
                                  </div>

                                  <div className="flex flex-wrap items-center justify-end gap-1 flex-row-reverse text-[11px]">
                                    <span className="text-slate-500 font-semibold ml-1 text-[9px]">{isAr ? 'زيادة عن التكلفة (Markup):' : 'Markup Presets:'}</span>
                                    {[10, 20, 30, 45, 60, 80, 100].map(mk => (
                                      <button
                                        key={`item-mk-${idx}-${mk}`}
                                        type="button"
                                        onClick={() => {
                                          if (dCost > 0) {
                                            const targetPrice = dCost * (1 + mk / 100);
                                            handleUpdateDraftField(idx, 'newPriceUSD', parseFloat(targetPrice.toFixed(2)));
                                            handleUpdateDraftField(idx, 'newPriceWholesale', parseFloat((targetPrice * 0.9).toFixed(2)));
                                            showToast('success', isAr ? `تم تعيين البيع بزيادة %${mk}!` : `Retail set at %${mk} markup!`);
                                          } else {
                                            showToast('error', isAr ? 'يرجى تحديد كلفة شراء الصنف أولاً!' : 'Please enter item cost first!');
                                          }
                                        }}
                                        className="px-1.5 py-0.5 bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-800 font-bold rounded border border-indigo-100 hover:border-indigo-150 transition-all text-[8.5px] cursor-pointer"
                                      >
                                        %{mk}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Custom Inline Inputs */}
                              <div className="flex flex-wrap items-center justify-end gap-2.5 flex-row-reverse border-t border-emerald-50/30 pt-2 text-[11px]">
                                <span className="text-slate-600 font-extrabold text-[9px] ml-1">{isAr ? 'يدوي مخصص:' : 'Manual:'}</span>

                                <div className="flex items-center gap-1 flex-row-reverse">
                                  <span className="text-[8px] text-slate-400">{isAr ? 'هامش مبيع %:' : 'Margin %:'}</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="99"
                                    placeholder="15"
                                    value={marginInputVal}
                                    onChange={e => setDraftMarginInputs(prev => ({ ...prev, [item.product.id]: e.target.value }))}
                                    className="w-10 text-center bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 py-0.5 px-1 rounded text-[9px] font-bold font-sans"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const m = parseFloat(marginInputVal);
                                      if (isNaN(m) || m < 0 || m >= 100) {
                                        showToast('error', isAr ? 'أدخل نسبة صحيحة بين 0 و 99' : 'Enter margin between 0 and 99');
                                        return;
                                      }
                                      if (dCost > 0) {
                                        const targetPrice = dCost / (1 - m / 100);
                                        handleUpdateDraftField(idx, 'newPriceUSD', parseFloat(targetPrice.toFixed(2)));
                                        handleUpdateDraftField(idx, 'newPriceWholesale', parseFloat((targetPrice * 0.9).toFixed(2)));
                                        showToast('success', isAr ? `هامش مبيع %${m} يدوي` : `Applied manual %${m} margin`);
                                      } else {
                                        showToast('error', isAr ? 'أدخل سعر الكلفة أولاً' : 'Enter cost first');
                                      }
                                    }}
                                    className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded text-[8px] cursor-pointer"
                                  >
                                    {isAr ? 'تطبيق' : 'Apply'}
                                  </button>
                                </div>

                                <span className="text-slate-200">|</span>

                                <div className="flex items-center gap-1 flex-row-reverse">
                                  <span className="text-[8px] text-slate-400">{isAr ? 'زيادة كلفة %:' : 'Markup %:'}</span>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="20"
                                    value={markupInputVal}
                                    onChange={e => setDraftMarkupInputs(prev => ({ ...prev, [item.product.id]: e.target.value }))}
                                    className="w-10 text-center bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 py-0.5 px-1 rounded text-[9px] font-bold font-sans"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const mk = parseFloat(markupInputVal);
                                      if (isNaN(mk) || mk < 0) {
                                        showToast('error', isAr ? 'أدخل زيادة صحيحة' : 'Enter correct markup percentage');
                                        return;
                                      }
                                      if (dCost > 0) {
                                        const targetPrice = dCost * (1 + mk / 100);
                                        handleUpdateDraftField(idx, 'newPriceUSD', parseFloat(targetPrice.toFixed(2)));
                                        handleUpdateDraftField(idx, 'newPriceWholesale', parseFloat((targetPrice * 0.9).toFixed(2)));
                                        showToast('success', isAr ? `زيادة %${mk} يدوية` : `Applied manual %${mk} markup`);
                                      } else {
                                        showToast('error', isAr ? 'أدخل سعر الكلفة أولاً' : 'Enter cost first');
                                      }
                                    }}
                                    className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded text-[8px] cursor-pointer"
                                  >
                                    {isAr ? 'تطبيق' : 'Apply'}
                                  </button>
                                </div>
                              </div>

                              {/* Yield metrics summary feedback */}
                              <div className="grid grid-cols-4 gap-1.5 text-center text-[9px] pt-1.5 border-t border-dashed border-emerald-100">
                                <div>
                                  <span className="text-slate-400 block">{isAr ? 'الكلفة:' : 'Cost:'}</span>
                                  <strong className="font-mono text-slate-700">{dCost.toFixed(2)} $</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 block">{isAr ? 'المبيع مفرق المقترح:' : 'Suggested Retail:'}</span>
                                  <strong className="font-mono text-emerald-700">{dPrice.toFixed(2)} $</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 block">{isAr ? 'صافي الربح القطعة:' : 'Net Profit:'}</span>
                                  <strong className={`font-mono ${dProfit >= 0 ? 'text-emerald-700' : 'text-red-650'}`}>{dProfit.toFixed(2)} $</strong>
                                </div>
                                <div className="text-left">
                                  <span className="text-slate-400 block">{isAr ? 'العائد الفعلي:' : 'Current Margins:'}</span>
                                  <span className="font-bold text-slate-800 block">
                                    {isAr ? `هامش: ${dMargin.toFixed(1)}%` : `Margin: ${dMargin.toFixed(1)}%`}
                                  </span>
                                  <span className="text-[8px] text-slate-500 font-medium block">
                                    {isAr ? `زيادة: ${dMarkup.toFixed(1)}%` : `Markup: ${dMarkup.toFixed(1)}%`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* SUBTAB: LEDGER RECORD BOOK VIEW */}
      {subTab === 'ledger' && (
        <div className="space-y-6 text-right font-sans">
          
          {/* STATS HEADERS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 text-right flex items-center justify-between shadow-sm">
              <div className="bg-emerald-50 text-[#1D9E75] p-3 rounded-xl border border-emerald-100">
                <DollarSign className="w-8 h-8" />
              </div>
              <div>
                <span className="block text-xs text-slate-400 font-bold mb-0.5">{isAr ? 'إجمالي فواتير المشتريات والتموين' : 'Purchase Sourcing Costs'}</span>
                <span className="text-xl font-bold font-mono text-slate-800">{totalProcurementExpensesUSD.toFixed(2)} $</span>
                <span className="block text-[10px] font-mono text-slate-400">{(totalProcurementExpensesUSD * 89000).toLocaleString() + ' ل.ل'}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 text-right flex items-center justify-between shadow-sm">
              <div className="bg-amber-50 text-amber-700 p-3 rounded-xl border border-amber-100">
                <Layers className="w-8 h-8" />
              </div>
              <div>
                <span className="block text-xs text-slate-400 font-bold mb-0.5">{isAr ? 'إجمالي كمية البضائع المستلمة' : 'Refilled Products Qty'}</span>
                <span className="text-xl font-bold font-mono text-slate-800">{totalProcurementItemsCount} {isAr ? 'قطعة' : 'individual items'}</span>
                <span className="block text-[10px] text-slate-400">{isAr ? 'جاهزة وموزعة على الرفوف' : 'refilled in master catalog'}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 text-right flex items-center justify-between shadow-sm">
              <div className="bg-indigo-50 text-indigo-700 p-3 rounded-xl border border-indigo-100">
                <Truck className="w-8 h-8" />
              </div>
              <div>
                <span className="block text-xs text-slate-400 font-bold mb-0.5">{isAr ? 'عدد شركات الموردين المتعامَلة' : 'Suppliers & Distribution Channels'}</span>
                <span className="text-xl font-bold text-slate-800 font-mono">{uniqueSuppliersCount} {isAr ? 'مورّدين' : 'suppliers listed'}</span>
                <span className="block text-[10px] text-slate-400">{isAr ? 'من الفواتير السابقة والحالية' : 'historical unique suppliers'}</span>
              </div>
            </div>
          </div>

          {/* LEDGER FILTER ACTION ROW */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1D9E75]" />
              {isAr ? 'مستندات تسليم وإدخال البضاعة والأسعار' : 'Procurement Invoices Archive'}
            </h3>

            <div className="relative w-full md:w-80">
              <input 
                type="text" 
                value={ledgerSearch}
                onChange={e => setLedgerSearch(e.target.value)}
                placeholder={isAr ? 'بحث باسم المورد أو رقم الفاتورة...' : 'Search by supplier, invoice code...'}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-9 text-xs text-right placeholder-slate-400"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            </div>
          </div>

          {/* PREVIOUS PURCHASES RECORDS ACCORDION TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto text-xs">
              <table className="w-full border-collapse text-right">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                    <th className="p-3 text-center w-24">{isAr ? 'التفاصيل' : 'Breakdown'}</th>
                    <th className="p-3 text-center">{isAr ? 'الملاحظة' : 'Supplying Note'}</th>
                    <th className="p-3 text-center">{isAr ? 'الحالة الماليّة' : 'Settlement'}</th>
                    <th className="p-3 text-center">{isAr ? 'إجمالي الفاتورة ($)' : 'Purchase Cost ($)'}</th>
                    <th className="p-3 text-center">{isAr ? 'عدد الأصناف' : 'Variants Count'}</th>
                    <th className="p-3 text-center">{isAr ? 'تاريخ الشراء' : 'Purchase Date'}</th>
                    <th className="p-3">{isAr ? 'الشركة المورّدة' : 'Supplier Distributor'}</th>
                    <th className="p-3">{isAr ? 'رقم الفاتورة' : 'Invoice number'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center p-8 text-slate-400 font-bold">
                        {isAr ? 'سجل المشتريات فارغ! لا توجد فواتير تموين مسجلة مطابقة لبحثك.' : 'No procurement registers found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map(inv => {
                      const isExpanded = expandedInvoiceId === inv.id;
                      const totalQty = inv.items.reduce((acc, i) => acc + i.qty, 0);

                      return (
                        <React.Fragment key={inv.id}>
                          <tr className="hover:bg-slate-50/50 transition">
                            
                            {/* Toggle detailed products and prices in accordion */}
                            <td className="p-3 text-center">
                              <button
                                onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                                className="bg-slate-100 font-extrabold hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-[10px] transition flex items-center justify-center gap-1 mx-auto cursor-pointer"
                              >
                                {isAr ? 'المعاينة' : 'Details'}
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            </td>

                            <td className="p-3 text-center text-slate-400 max-w-xs truncate" title={inv.note}>
                              {inv.note ? inv.note : <span className="text-slate-300 font-normal">—</span>}
                            </td>

                            <td className="p-3 text-center">
                              {inv.paymentStatus === 'paid' ? (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                  {isAr ? 'مدفوع نقداً' : 'Cash Paid'}
                                </span>
                              ) : (
                                <span className="bg-rose-50 text-rose-700 border border-rose-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                                  {isAr ? 'دين بالآجل' : 'On Credit'}
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-center font-mono font-black text-[#1D9E75]">
                              {inv.totalAmountUSD.toFixed(2)} $
                            </td>

                            <td className="p-3 text-center font-bold text-slate-600">
                              {inv.items.length} {isAr ? 'أصناف' : 'items'} <span className="text-[10px] font-normal text-slate-400">({totalQty} قطعة كلي)</span>
                            </td>

                            <td className="p-3 text-center font-mono font-bold text-slate-600">
                              {inv.date}
                            </td>

                            <td className="p-3 font-bold text-slate-800">
                              <div>{inv.supplierName}</div>
                              {inv.destination === 'warehouse' ? (
                                <span className="inline-block bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded text-[9px] font-black mt-1 font-sans">
                                  📦 المستودع/المخزن
                                </span>
                              ) : (
                                <span className="inline-block bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-black mt-1 font-sans">
                                  🏪 رفوف المحل
                                </span>
                              )}
                            </td>

                            <td className="p-3 font-mono text-slate-500 font-semibold">
                              {inv.invoiceNumber}
                            </td>

                          </tr>

                          {/* EXPANDED ACCORDION VIEW DETAILS FOR RECORD */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={8} className="bg-slate-50/70 p-4 border-t border-b border-slate-200 font-sans">
                                <div className="bg-white rounded-xl border border-slate-200/80 p-4 space-y-3 shadow-inner">
                                  <h4 className="font-bold text-slate-800 text-xs border-b pb-1.5 flex items-center justify-between">
                                    <button
                                      type="button"
                                      onClick={() => setActivePrintPurchase(inv)}
                                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black px-3 py-1.5 rounded-lg border border-emerald-100 text-[10px] flex items-center gap-1.5 transition cursor-pointer"
                                    >
                                      <span>طباعة وتصدير كـ PDF 📠/📄</span>
                                    </button>
                                    <div className="flex items-center gap-2">
                                      <span>{inv.supplierName}</span>
                                      <span>←</span>
                                      <span className="font-extrabold text-blue-700 text-[11px]">{isAr ? `الأصناف المدرجة في الفاتورة رقم [${inv.invoiceNumber}]` : `Breakdown for ${inv.invoiceNumber}`}</span>
                                    </div>
                                  </h4>

                                  <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-right text-[11px]">
                                      <thead>
                                        <tr className="border-b border-slate-100 text-slate-400 font-bold bg-slate-50">
                                          <th className="p-2 text-center">{isAr ? 'تاريخ الصلاحية الجديد' : 'Expiry set'}</th>
                                          <th className="p-2 text-center text-[#1D9E75]">{isAr ? 'سعر البيع مفرق الجديد ($)' : 'New Ret. Price ($)'}</th>
                                          <th className="p-2 text-center">{isAr ? 'سعر الشراء تكلفة ($)' : 'Unit Cost ($)'}</th>
                                          <th className="p-2 text-center">{isAr ? 'إجمالي تكلفة الصنف ($)' : 'Procurement cost ($)'}</th>
                                          <th className="p-2 text-center">{isAr ? 'الكمية المشتراة' : 'Purchased Qty'}</th>
                                          <th className="p-2 text-right">{isAr ? 'اسم المنتج' : 'Product name'}</th>
                                          <th className="p-2 text-center w-8">#</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {inv.items.map((i, sIdx) => {
                                          return (
                                            <tr key={i.id} className="hover:bg-slate-50">
                                              
                                              <td className="p-2 text-center font-mono text-slate-600 font-bold">
                                                {i.expiryDate ? i.expiryDate : <span className="text-slate-300">—</span>}
                                              </td>

                                              <td className="p-2 text-center font-mono text-emerald-700 font-black">
                                                {i.newPriceUSD.toFixed(2)} $
                                              </td>

                                              <td className="p-2 text-center font-mono text-slate-600 font-bold">
                                                {i.costPriceUSD.toFixed(2)} $
                                                {(i.discountPercent || 0) > 0 && <span className="block text-[9px] text-emerald-700">-{i.discountPercent}% {isAr ? 'حسم' : 'off'}</span>}
                                                {(i.taxRate || 0) > 0 && <span className="block text-[9px] text-amber-700">+{i.taxRate}% TVA</span>}
                                              </td>

                                              <td className="p-2 text-center font-mono text-slate-500 font-semibold bg-emerald-50/20">
                                                {lineTotal(i).toFixed(2)} $
                                              </td>

                                              <td className="p-2 text-center font-mono font-bold text-slate-800">
                                                {i.qty} {isAr ? 'قطعة' : 'pcs'}
                                                {(i.freeQty || 0) > 0 && <span className="block text-[9px] text-sky-700">🎁 +{i.freeQty} {isAr ? 'مجاناً' : 'free'}</span>}
                                              </td>

                                              <td className="p-2 text-right font-bold text-slate-800">
                                                {i.productName}
                                              </td>

                                              <td className="p-2 text-center text-slate-400 font-mono font-bold">
                                                {sIdx + 1}
                                              </td>

                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Subtotals & transportation cost & total */}
                                  <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between text-xs bg-slate-50/50 p-3 rounded-lg gap-3">
                                    <div className="flex gap-4 items-center">
                                      <span className="text-slate-500 font-bold">
                                        {isAr ? 'الإجمالي العام للفاتورة:' : 'Grand Total:'}{' '}
                                        <span className="font-mono font-black text-emerald-700 text-sm">
                                          {inv.totalAmountUSD.toFixed(2)} $
                                        </span>
                                      </span>
                                    </div>
                                    <div className="flex gap-4 items-center flex-row-reverse flex-wrap">
                                      {(inv.discountUSD || 0) > 0 && (
                                        <span className="inline-flex items-center gap-1 font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded">
                                          {isAr ? 'الحسم: ' : 'Discount: '}
                                          <strong className="font-mono text-emerald-900">-{(inv.discountUSD || 0).toFixed(2)} $</strong>
                                        </span>
                                      )}
                                      {(inv.taxUSD || 0) > 0 && (
                                        <span className="inline-flex items-center gap-1 font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded">
                                          {isAr ? 'الضريبة (TVA): ' : 'VAT: '}
                                          <strong className="font-mono text-amber-900">{(inv.taxUSD || 0).toFixed(2)} $</strong>
                                        </span>
                                      )}
                                      {inv.transportationCostUSD !== undefined && inv.transportationCostUSD > 0 && (
                                        <span className="inline-flex items-center gap-1 text-slate-600 font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded">
                                          🚚 {isAr ? `تكاليف المواصلات والشحن: ` : `Transportation Cost: `}
                                          <strong className="font-mono text-amber-900">{inv.transportationCostUSD.toFixed(2)} $</strong>
                                        </span>
                                      )}
                                      <span className="text-slate-500 font-medium">
                                        {isAr ? 'قيمة السلع الثنائية:' : 'Items cost:'}{' '}
                                        <strong className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                                          {(inv.totalAmountUSD - (inv.transportationCostUSD || 0) - (inv.taxUSD || 0)).toFixed(2)} $
                                        </strong>
                                      </span>
                                    </div>
                                  </div>

                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* PROCUREMENT BILL VIEW MODAL FOR PRINT & PDF */}
      {activePrintPurchase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans no-print text-right text-slate-800" id="print-purchase-modal">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden border border-slate-100"
          >
            <button 
              onClick={() => setActivePrintPurchase(null)}
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-650 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex-1 overflow-y-auto space-y-6 pr-1 text-right" id="purchase-invoice-print-area">
              {/* Header Info */}
              <div className="border-b pb-4 text-center mt-4">
                <h3 className="text-xl font-black text-slate-800">سند استلام بضائع وفاتورة شراء</h3>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Procurement Order & Goods Received Note</p>
                <div className="flex justify-between items-center mt-4 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-150 text-xs gap-3">
                  <div className="text-right">
                    <span className="text-slate-500 block">رقم الفاتورة المعتمد</span>
                    <span className="font-mono font-bold text-slate-900 mt-0.5 block">{activePrintPurchase.invoiceNumber}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block">تاريخ الشراء والتدوين</span>
                    <span className="font-mono font-bold text-slate-900 mt-0.5 block">{activePrintPurchase.date}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block">الشركة الموردة</span>
                    <span className="font-bold text-blue-700 mt-0.5 block">{activePrintPurchase.supplierName}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-2 border-r-2 border-indigo-500 pr-2">الأصناف والسلع التي تم توريدها للمستودع:</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px]">
                        <th className="p-3 text-center">{isAr ? 'الصلاحية' : 'Expiry'}</th>
                        <th className="p-3 text-center">{isAr ? 'سعر البيع الجديد' : 'New Price'}</th>
                        <th className="p-3 text-center">{isAr ? 'سعر الكلفة' : 'Cost Cost'}</th>
                        <th className="p-3 text-center">{isAr ? 'الكمية المستلمة' : 'Supplied Qty'}</th>
                        <th className="p-3 pr-4">{isAr ? 'اسم المنتج' : 'Product Target'}</th>
                        <th className="p-3 text-center w-8">#</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activePrintPurchase.items.map((it, idx) => (
                        <tr key={it.id} className="hover:bg-slate-50/50">
                          <td className="p-3 text-center font-mono font-semibold text-slate-600">
                            {it.expiryDate || <span className="text-slate-300">—</span>}
                          </td>
                          <td className="p-3 text-center font-mono font-extrabold text-emerald-600">
                            {it.newPriceUSD.toFixed(1)} $
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-slate-700">
                            {it.costPriceUSD.toFixed(1)} $
                            {(it.discountPercent || 0) > 0 && <span className="block text-[9px] text-emerald-700">-{it.discountPercent}% {isAr ? 'حسم' : 'off'}</span>}
                            {(it.taxRate || 0) > 0 && <span className="block text-[9px] text-amber-700">+{it.taxRate}% TVA</span>}
                          </td>
                          <td className="p-3 text-center font-mono font-black text-slate-850">
                            {it.qty} {isAr ? 'قطع' : 'pcs'}
                            {(it.freeQty || 0) > 0 && <span className="block text-[9px] text-sky-700">🎁 +{it.freeQty} {isAr ? 'مجاناً' : 'free'}</span>}
                          </td>
                          <td className="p-3 pr-4 font-bold text-slate-800">
                            {it.productName}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-slate-400">
                            {idx + 1}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Invoice Summary Card */}
              {(() => {
                const transCost = activePrintPurchase.transportationCostUSD || 0;
                const taxCost = activePrintPurchase.taxUSD || 0;
                const discountCost = activePrintPurchase.discountUSD || 0;
                const itemsCost = activePrintPurchase.totalAmountUSD - transCost - taxCost + discountCost; // before discount

                return (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap justify-between items-center text-xs gap-4">
                    <div className="text-right">
                      <span className="text-slate-400 block">{isAr ? 'ملاحظة الفاتورة المرفقة' : 'Supplier Attached Note'}</span>
                      <span className="text-slate-700 font-medium block mt-0.5">{activePrintPurchase.note || '—'}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-slate-400 block">{isAr ? 'طريقة تسوية الاستحقاق' : 'Financial Status'}</span>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1 ${activePrintPurchase.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                        {activePrintPurchase.paymentStatus === 'paid' ? (isAr ? 'مدفوع نقداً بالكامل' : 'Paid in cash') : (isAr ? 'دين بالآجل على الحساب' : 'On Credit')}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 text-right font-sans text-[11px] bg-slate-100/50 p-2.5 rounded-lg border border-slate-200">
                      <div className="flex justify-between gap-6">
                        <span className="font-mono text-slate-700">{itemsCost.toFixed(2)} $</span>
                        <span className="text-slate-500">{isAr ? 'قيمة السلع:' : 'Items Value:'}</span>
                      </div>
                      {discountCost > 0 && (
                        <div className="flex justify-between gap-6 border-t border-slate-200/50 pt-1">
                          <span className="font-mono text-emerald-700">-{discountCost.toFixed(2)} $</span>
                          <span className="text-slate-500">{isAr ? 'الحسم:' : 'Discount:'}</span>
                        </div>
                      )}
                      {taxCost > 0 && (
                        <div className="flex justify-between gap-6 border-t border-slate-200/50 pt-1">
                          <span className="font-mono text-amber-800">+{taxCost.toFixed(2)} $</span>
                          <span className="text-slate-500">{isAr ? 'الضريبة (TVA):' : 'VAT:'}</span>
                        </div>
                      )}
                      {transCost > 0 && (
                        <div className="flex justify-between gap-6 border-t border-slate-200/50 pt-1">
                          <span className="font-mono text-amber-800">+{transCost.toFixed(2)} $</span>
                          <span className="text-slate-500">🚚 {isAr ? 'المواصلات والشحن:' : 'Transportation:'}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-left bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl">
                      <span className="text-emerald-700 font-bold block text-[10px]">{isAr ? 'إجمالي المدفوعات للمورد' : 'Disbursement Total'}</span>
                      <span className="text-lg font-black font-mono text-emerald-600 block mt-0.5">{activePrintPurchase.totalAmountUSD.toFixed(2)} $</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Print trigger and exit buttons */}
            <div className="flex gap-2 text-xs font-sans border-t pt-4 mt-4 select-none">
              <button 
                onClick={() => {
                  let shop = { name: '', logo: undefined as string | undefined };
                  try {
                    const st = JSON.parse(storage.getItem('pos_settings') || '{}');
                    shop = { name: st.shopName || '', logo: st.shopLogo || st.receiptLogoBase64 || undefined };
                  } catch {}
                  printPurchaseInvoice(activePrintPurchase, shop, lang);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة أو سحب كـ PDF 🖨/📄</span>
              </button>
              <button 
                onClick={() => setActivePrintPurchase(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3.5 rounded-xl transition cursor-pointer"
              >
                إغلاق نافذة المعاينة
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 2. SMART INVOICE CAMERA SCANNER MODAL OVERLAY */}
      {showInvoiceScannerModal && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-right space-y-5 flex flex-col justify-between"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b dark:border-slate-800 pb-4">
              <button 
                type="button"
                onClick={() => setShowInvoiceScannerModal(false)}
                className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-2.5 flex-row-reverse text-[#1D9E75] font-extrabold text-sm sm:text-base">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <Camera className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-slate-900 dark:text-white font-black">{isAr ? 'ماسح باركود الفواتير الذكي وعين الكاميرا' : 'Smart Camera Barcode Invoice OCR'}</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium font-sans">{isAr ? 'استخرج السلع، الكميات، والتكاليف من فواتير الموردين تلقائياً' : 'Automated procurement intake using advanced scanning mechanics'}</p>
                </div>
              </div>
            </div>

            {/* Scanning active processing animation */}
            {isScanningActive ? (
              <div className="p-10 flex flex-col items-center justify-center space-y-6 text-center font-sans">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <div className="absolute inset-0 border-4 border-dashed border-indigo-600 rounded-full animate-[spin_10s_linear_infinite]" />
                  <div className="absolute inset-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-full flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                  </div>
                  <div className="absolute -top-1 -left-1 text-yellow-500">✨</div>
                </div>

                <div className="space-y-2 max-w-md">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white font-sans">{isAr ? 'معالجة صورة الفاتورة برؤية الآلة...' : 'Executing OCR reading passes on paper matrix...'}</h4>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-extrabold font-sans animate-pulse">{scanningStepName}</p>
                </div>

                {/* Progress bar */}
                <div className="w-full max-w-sm bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-300"
                    style={{ width: `${scanningProgress}%` }}
                  />
                </div>
                <span className="font-mono text-xs font-black text-slate-500">{scanningProgress}%</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
                
                {/* Visual Viewfinder representation column */}
                <div className="space-y-4">
                  <div className="bg-slate-950 rounded-2xl aspect-video sm:aspect-square relative overflow-hidden flex flex-col items-center justify-center border border-slate-800 text-center text-xs group">
                    
                    {/* Cam view or canvas holding video feed */}
                    <video 
                      ref={videoRef}
                      autoPlay 
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover opacity-85"
                    />

                    {/* Camera scan framing box */}
                    <div className="absolute inset-8 border border-dashed border-emerald-400/60 rounded-xl flex items-center justify-center pointer-events-none select-none">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                      
                      {/* Scan red laser line animates up and down */}
                      <div className="w-full bg-red-500/80 h-0.5 shadow-[0_0_10px_2px_rgba(239,68,68,0.8)] absolute left-0 right-0 animate-[bounce_3s_infinite_linear]" />
                    </div>

                    {/* Camera feedback text indicator if stream is inactive */}
                    <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10px] font-sans flex items-center gap-1.5 text-emerald-400 z-10 pointer-events-none">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping animate-pulse" />
                      <span className="font-mono font-black tracking-widest text-[9px] text-[#1D9E75]">LENS OVERLAY</span>
                    </div>

                    <div className="p-4 z-10 text-slate-400 font-sans pointer-events-none select-none max-w-xs transition duration-300 group-hover:opacity-10 opacity-70">
                      <Camera className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                      <p className="font-bold text-[10px] text-slate-300">{isAr ? 'عدسة الكاميرا نشطة الآن' : 'Webcam module ready'}</p>
                      <p className="text-[9px] text-slate-500 mt-1">{isAr ? 'ضع الفاتورة أمام الكاميرا لمسحها أو اضغط على عينة جاهزة من اليسار للتجربة فوراً' : 'Face invoice towards camera lens or click a fast preset to simulated OCR'}</p>
                    </div>
                  </div>

                  {/* Drag-n-drop Upload trigger zone alternative */}
                  <div className="bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-250 dark:border-slate-800 p-4 rounded-xl text-center relative hover:bg-slate-100 dark:hover:bg-slate-800/80 transition">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const sampleUploadItems = [
                            { barcode: '1111', qty: 12, costPriceUSD: 11.00 },
                            { barcode: '4444', qty: 30, costPriceUSD: 0.70 },
                            { barcode: '1212', qty: 15, costPriceUSD: 7.20 }
                          ];
                          handleExecuteInvoiceScan(sampleUploadItems, 'شركة الموزع العام للغذائيات', `SCN-${Math.floor(100000 + Math.random() * 900000)}`);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload className="w-5 h-5 text-indigo-500 mx-auto mb-1.5 animate-bounce" />
                    <span className="font-sans block text-slate-500 font-extrabold text-[11px]">{isAr ? 'عوضاً عن الكاميرا، ارفع ملف صورة الفاتورة 📁' : 'Or drag and drop document image here 📁'}</span>
                    <span className="text-[10px] block text-slate-400 mt-1">{isAr ? 'بصيغة PNG, JPG أو مصورة مسبقاً' : 'PNG, JPEG, or pre-scanned receipt formats'}</span>
                  </div>
                </div>

                {/* Left column: Choose from Preset items and templates for rapid demonstration click */}
                <div className="space-y-4 font-sans text-right">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block font-bold mb-2">
                    {isAr ? '💡 للتجريب السريع، انقر على نموذج فاتورة مورّد جاهز لتشغيل محاكي الذكاء الاصطناعي:' : '💡 Quick Testing: click a supplier receipt preset to execute simulated OCR parsing:'}
                  </span>

                  <div className="space-y-3">
                    
                    {/* Template 1 */}
                    <button
                      type="button"
                      onClick={() => {
                        const items = [
                          { barcode: '1111', qty: 24, costPriceUSD: 10.50 },
                          { barcode: '2222', qty: 15, costPriceUSD: 2.90 },
                          { barcode: '3333', qty: 30, costPriceUSD: 4.50 }
                        ];
                        handleExecuteInvoiceScan(items, 'مؤسسة الهدى للألبان والأجبان', 'INV-HOD-9401');
                      }}
                      className="w-full text-right bg-slate-50 dark:bg-slate-800/40 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 border border-slate-205 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-900 rounded-xl p-3 px-3.5 transition flex flex-col gap-2 cursor-pointer group hover:scale-[1.01]"
                    >
                      <div className="flex items-center justify-between w-full flex-row-reverse">
                        <span className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded text-[9px] font-black">{isAr ? 'مواد مبردة ألبان' : 'Chilled Dairy'}</span>
                        <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 group-hover:text-emerald-800 dark:group-hover:text-[#1D9E75] flex items-center gap-1">
                          <span>🏢 مؤسسة الهدى للألبان والأجبان</span>
                        </h5>
                      </div>
                      
                      <div className="flex justify-between text-[10px] text-slate-400 w-full font-mono flex-row-reverse">
                        <span>رقم الفاتورة: #INV-HOD-9401</span>
                        <span className="font-sans text-slate-500 font-bold">{isAr ? 'عدد السلع: 3 أصناف مختلفة' : 'Variants: 3 items'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-150/50 dark:bg-slate-800 p-1.5 rounded-lg w-full text-right font-sans leading-relaxed">
                        {isAr ? '🛒 حليب نيدو مجفف [24 قطعة] • لبنة بلدية [15 قطعة] • قشقوان عكاوي [30 قطعة]' : '🛒 Nido dairy, Labneh wholesale container packs'}
                      </div>
                    </button>

                    {/* Template 2 */}
                    <button
                      type="button"
                      onClick={() => {
                        const items = [
                          { barcode: '6666', qty: 72, costPriceUSD: 1.05 },
                          { barcode: '7777', qty: 48, costPriceUSD: 0.75 }
                        ];
                        handleExecuteInvoiceScan(items, 'بيبسي لبنان للتوزيع', 'INV-PEP-3029');
                      }}
                      className="w-full text-right bg-slate-50 dark:bg-slate-800/40 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 border border-slate-205 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-900 rounded-xl p-3 px-3.5 transition flex flex-col gap-2 cursor-pointer group hover:scale-[1.01]"
                    >
                      <div className="flex items-center justify-between w-full flex-row-reverse">
                        <span className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded text-[9px] font-black">{isAr ? 'مرطبات ومشروبات' : 'Beverages'}</span>
                        <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 group-hover:text-emerald-800 dark:group-hover:text-[#1D9E75] flex items-center gap-1">
                          <span>🥤 بيبسي لبنان للتوزيع والوكيل</span>
                        </h5>
                      </div>
                      
                      <div className="flex justify-between text-[10px] text-slate-400 w-full font-mono flex-row-reverse">
                        <span>رقم الفاتورة: #INV-PEP-3029</span>
                        <span className="font-sans text-slate-500 font-bold">{isAr ? 'عدد السلع: صنفين كبيرين' : 'Variants: 2 items'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-150/50 dark:bg-slate-800 p-1.5 rounded-lg w-full text-right font-sans leading-relaxed">
                        {isAr ? '🛒 بيبسي عائلي 2.25 لتر [72 قطعة] • عصير راني تفاح [48 قطعة]' : '🛒 Pepsi family sizes, Rani apple juice packs'}
                      </div>
                    </button>

                    {/* Template 3 */}
                    <button
                      type="button"
                      onClick={() => {
                        const items = [
                          { barcode: '8888', qty: 36, costPriceUSD: 2.15 },
                          { barcode: '9999', qty: 120, costPriceUSD: 0.50 },
                          { barcode: '1122', qty: 18, costPriceUSD: 5.80 }
                        ];
                        handleExecuteInvoiceScan(items, 'شركة الموزع العام للغذائيات', 'INV-GEN-5541');
                      }}
                      className="w-full text-right bg-slate-50 dark:bg-slate-800/40 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 border border-slate-205 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-900 rounded-xl p-3 px-3.5 transition flex flex-col gap-2 cursor-pointer group hover:scale-[1.01]"
                    >
                      <div className="flex items-center justify-between w-full flex-row-reverse">
                        <span className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded text-[9px] font-black">{isAr ? 'معلبات ومواد جافة' : 'Dry Goods'}</span>
                        <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 group-hover:text-emerald-800 dark:group-hover:text-[#1D9E75] flex items-center gap-1">
                          <span>📦 شركة الموزع العام للغذائيات</span>
                        </h5>
                      </div>
                      
                      <div className="flex justify-between text-[10px] text-slate-400 w-full font-mono flex-row-reverse">
                        <span>رقم الفاتورة: #INV-GEN-5541</span>
                        <span className="font-sans text-slate-500 font-bold">{isAr ? 'عدد السلع: 3 أصناف أساسية' : 'Variants: 3 items'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-150/50 dark:bg-slate-800 p-1.5 rounded-lg w-full text-right font-sans leading-relaxed">
                        {isAr ? '🛒 حلاوة طحينية [36 قطعة] • سردين فيله حار [120 علبة] • أرز بسمتي هندي ممتاز [18 كيس]' : '🛒 Halawa 400g, Sardines, India rice bags'}
                      </div>
                    </button>

                  </div>
                </div>

              </div>
            )}

            {/* Modal Footer warning & controls */}
            <div className="flex items-center justify-between border-t dark:border-slate-800 pt-4 text-xs select-none">
              <span className="text-[10px] text-slate-400 font-semibold block text-right">
                {isAr ? '💡 يتم تطبيق نسبة هامش الربح الافتراضي تلقائياً لتسعير المنتجات فور استخلاص التكلفة من الكاميرا.' : '📌 Margin calculations computed dynamically from dynamic settings.'}
              </span>
              <button 
                type="button"
                onClick={() => setShowInvoiceScannerModal(false)}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-xl transition font-black cursor-pointer"
              >
                {isAr ? 'إلغاء وإغلاق ✕' : 'Cancel & Close ✕'}
              </button>
            </div>

          </motion.div>
        </div>
      )}

    </div>
  );
}
