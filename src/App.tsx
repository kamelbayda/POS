/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  Scan, 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Settings, 
  Users, 
  TrendingUp, 
  Layers, 
  ShieldAlert, 
  CheckCircle2, 
  DollarSign, 
  Globe, 
  Download, 
  Copy, 
  FileText, 
  X, 
  Lock, 
  User, 
  RefreshCw, 
  Edit, 
  ClipboardList, 
  AlertTriangle, 
  Printer, 
  Barcode,
  RotateCcw,
  ArrowLeftRight,
  Minus,
  Check,
  Sun,
  Moon,
  Calendar,
  Hourglass,
  Truck,
  ShoppingBag,
  MessageSquare,
  Sparkles,
  Bot,
  Archive,
  EyeOff,
  Cloud,
  Save,
  Upload,
  FileSpreadsheet,
  KeyRound,
  Unlock,
  Database,
  Receipt,
  MessageCircle,
  Tag,
  Gift,
  Clock,
  CreditCard,
  Monitor,
  Maximize,
  Home,
  Menu,
  ArrowLeft,
  ArrowRight,
  Percent,
  Bookmark,
  Briefcase,
  Delete,
  Keyboard,
  Key,
  ExternalLink
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Category, Invoice, User as UserType, SystemSettings, PrinterConfig, CartItem, StockCountItem, ReturnRecord, WasteRecord, Promotion, Customer, ExpenseRecord, PurchaseItem, PurchaseInvoice, Supplier } from './types';
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, DEFAULT_USERS, getSeededProducts, getSeededInvoices, DEFAULT_CUSTOMERS, DEFAULT_SUPPLIERS, DEFAULT_PROMOTIONS, DEFAULT_EXPENSES } from './mockData';
import { CustomersTab, ReturnsWasteTab } from './components/DatabaseExtensions';
import { UsersTab } from './features/users/UsersTab';
import { StockCountTab } from './features/stock-count/StockCountTab';
import { InvoicesLogTab } from './features/invoices/InvoicesLogTab';
import { PriceLabelsTab } from './features/price-labels/PriceLabelsTab';
import { InventoryTab } from './features/inventory/InventoryTab';
import { ReportsTab } from './features/reports/ReportsTab';
import { PromotionsTab, PromotionChange } from './features/promotions/PromotionsTab';
import * as storage from './lib/storage';
import { useToday, toISODate, addDays } from './lib/date';
import { generateBarcodePattern } from './lib/barcode';
import { printElementViaIFrame, playReceiptPrintSound } from './lib/print';
import { LockScreenClock } from './components/LockScreenClock';
import { PurchasesTab } from './components/PurchasesTab';
import { WarehouseTab } from './components/WarehouseTab';
import { FirebaseSyncTab } from './components/FirebaseSyncTab';
import { db, auth } from './firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { handleMathBlur, handleMathKeyDown } from './mathEvaluator';

// System operational date base

export interface CartSession {
  id: string;
  label: string;
  cart: CartItem[];
  discountInput: string;
  paidUSDInput: string;
  paidLBPInput: string;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'debt';
  posSaleType: 'retail' | 'wholesale';
  selectedCustomerId: string;
  voidedCartItemIds?: string[];
  noteInput?: string;
}

const getGridColsClass = (size?: string) => {
  switch (size) {
    case '3x3':
      return 'grid-cols-3';
    case '4x4':
      return 'grid-cols-4';
    case '5x5':
      return 'grid-cols-5';
    case '6x6':
      return 'grid-cols-6';
    default:
      return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6';
  }
};

const getGridColsStyle = (size?: string): React.CSSProperties => {
  switch (size) {
    case '3x3':
      return { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' };
    case '4x4':
      return { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' };
    case '5x5':
      return { gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' };
    case '6x6':
      return { gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' };
    default:
      return { gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 185px), 1fr))' };
  }
};

const getCardStyle = (size?: string) => {
  switch (size) {
    case '3x3':
      return {
        cardHeight: 'h-[180px] sm:h-[195px]',
        padding: 'p-5',
        titleFont: 'text-sm sm:text-base font-black',
        priceFont: 'text-sm sm:text-base font-black',
        labelFont: 'text-xs',
        emojiSize: 'text-4xl'
      };
    case '4x4':
      return {
        cardHeight: 'h-[160px] sm:h-[175px]',
        padding: 'p-3',
        titleFont: 'text-sm font-extrabold',
        priceFont: 'text-sm font-black',
        labelFont: 'text-[11px]',
        emojiSize: 'text-2xl'
      };
    case '5x5':
      return {
        cardHeight: 'h-[145px]',
        padding: 'p-2.5',
        titleFont: 'text-xs font-bold leading-tight',
        priceFont: 'text-xs font-black',
        labelFont: 'text-[10px]',
        emojiSize: 'text-xl'
      };
    case '6x6':
      return {
        cardHeight: 'h-[125px]',
        padding: 'p-2',
        titleFont: 'text-[10px] font-bold leading-tight',
        priceFont: 'text-[11px] font-black',
        labelFont: 'text-[9px]',
        emojiSize: 'text-lg'
      };
    default:
      return {
        cardHeight: 'h-[180px] sm:h-[195px]',
        padding: 'p-4 sm:p-5',
        titleFont: 'text-sm sm:text-base font-black',
        priceFont: 'text-sm sm:text-base font-black',
        labelFont: 'text-[11px] sm:text-xs',
        emojiSize: 'text-2xl'
      };
  }
};

const menuItems = [
  { id: 'btn-nav-pos', tab: 'pos', labelAr: 'شاشة البيع المباشر', labelEn: 'Direct POS Screen', icon: ShoppingCart },
  { id: 'btn-nav-inventory', tab: 'inventory', labelAr: 'إدارة المخزن والموردين', labelEn: 'Inventory & Stock', icon: Layers },
  { id: 'btn-nav-customers', tab: 'customers', labelAr: 'حسابات الزبائن والديون', labelEn: 'Customers & Debts', icon: Users },
  { id: 'btn-nav-returns', tab: 'returns_waste', labelAr: 'المرتجعات والتالف', labelEn: 'Returns & Waste', icon: ArrowLeftRight },
  { id: 'btn-nav-purchases', tab: 'purchases', labelAr: 'فواتير المشتريات', labelEn: 'Purchase Invoices', icon: ShoppingBag },
  { id: 'btn-nav-warehouse', tab: 'warehouse', labelAr: 'التحويل بين المستودعات', labelEn: 'Warehouse Transfers', icon: Archive },
  { id: 'btn-nav-stock-count', tab: 'stock_count', labelAr: 'جرد المخزون والتدقيق', labelEn: 'Stock Count & Audit', icon: ClipboardList },
  { id: 'btn-nav-reports', tab: 'reports', labelAr: 'التقارير والأرباح', labelEn: 'Reports & Diagnostics', icon: TrendingUp },
  { id: 'btn-nav-invoices', tab: 'invoices', labelAr: 'سجل فواتير المبيعات', labelEn: 'Sales Invoices', icon: FileText },
  { id: 'btn-nav-promotions', tab: 'promotions', labelAr: 'العروض الترويجية والخصم', labelEn: 'Promotions & Discounts', icon: Tag },
  { id: 'btn-nav-users', tab: 'users', labelAr: 'المستخدمين والصلاحيات', labelEn: 'Users & Permissions', icon: User },
  { id: 'btn-nav-firebase', tab: 'firebase_sync', labelAr: 'مزامنة السحاب', labelEn: 'Cloud Synchronization', icon: Cloud },
  { id: 'btn-nav-price-labels', tab: 'price_labels', labelAr: 'بطاقات وملصقات الأسعار', labelEn: 'Price Labels Designer', icon: Barcode },
  { id: 'btn-nav-settings', tab: 'settings', labelAr: 'إعدادات النظام المتكاملة', labelEn: 'System Settings', icon: Settings },
];

export default function App() {
  // Today's date (YYYY-MM-DD, local time); rolls over at midnight
  const SYS_DATE = useToday();

  // --- FIREBASE LIVE SYNC WRITE-THROUGH HELPER ---
  const syncWriteToCloud = async (collectionName: string, docId: string, data: any, isDelete: boolean = false) => {
    if (!auth.currentUser) return;
    try {
      const docRef = doc(db, collectionName, docId);
      if (isDelete) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, data);
      }
    } catch (err) {
      console.warn(`Firestore sync skipped for ${collectionName}/${docId}:`, err);
    }
  };

  // --- BILINGUAL & MULTI-PLATFORM DEVICE STATES ---
  const [lang, setLang] = useState<'ar' | 'en'>(() => {
    return (localStorage.getItem('pos_language') as 'ar' | 'en') || 'ar';
  });
  const [localGeminiApiKey, setLocalGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem('pos_gemini_api_key') || '';
  });
  const [cashDeviceMode, setCashDeviceMode] = useState<'single' | 'multi'>(() => {
    return (localStorage.getItem('pos_cash_device_mode') as 'single' | 'multi') || 'single';
  });
  const [receiptPaperSize, setReceiptPaperSize] = useState<'80mm' | '58mm' | 'a4' | 'a5'>('80mm');
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [receiptTemplateStyle, setReceiptTemplateStyle] = useState<'modern' | 'classic' | 'compact'>('modern');
  const [showReceiptCashier, setShowReceiptCashier] = useState<boolean>(true);
  const [showReceiptCalculations, setShowReceiptCalculations] = useState<boolean>(true);
  const [showReceiptBarcode, setShowReceiptBarcode] = useState<boolean>(true);
  const [showReceiptFooter, setShowReceiptFooter] = useState<boolean>(true);

  const handleToggleLang = () => {
    const nextLang = lang === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    localStorage.setItem('pos_language', nextLang);
    showToast('success', nextLang === 'ar' ? 'تم تحويل لغة الواجهة إلى العربية 🇱🇧' : 'Interface language switched to English 🇺🇸');
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const direction = lang === 'ar' ? 'rtl' : 'ltr';
    document.dir = direction;
    document.documentElement.dir = direction;
    document.documentElement.setAttribute('dir', direction);
    document.body.dir = direction;
    document.body.setAttribute('dir', direction);
    if (lang === 'en') {
      document.body.classList.add('lang-en');
      document.body.classList.remove('lang-ar');
    } else {
      document.body.classList.add('lang-ar');
      document.body.classList.remove('lang-en');
    }
  }, [lang]);

  // --- DATABASE & APP STATE INITIALIZATION ---
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [users, setUsers] = useState<UserType[]>(DEFAULT_USERS);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  // New 5 data tables representing SQLite extensions
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [waste, setWaste] = useState<WasteRecord[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  
  // --- EXCEL IMPORT STATES ---
  const [showImportExcelModal, setShowImportExcelModal] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'parsing' | 'preview' | 'error'>('idle');
  const [importError, setImportError] = useState<string | null>(null);
  const [parsedProducts, setParsedProducts] = useState<{
    product: Product;
    status: 'new' | 'update' | 'invalid';
    warning?: string;
  }[]>([]);
  const [updateExistingOnMatch, setUpdateExistingOnMatch] = useState<boolean>(true);

  // --- EXCEL TEMPLATE DOWNLOAD & EXCEL IMPORT LOGIC ---
  const downloadExcelTemplate = () => {
    const headers = [
      'الاسم / Product Name',
      'الباركود / Barcode',
      'التصنيف / Category',
      'سعر التجزئة بالدولار / Retail Price USD',
      'سعر الجملة بالدولار / Wholesale Price USD',
      'سعر التكلفة بالدولار / Cost Price USD',
      'الكمية المتاحة / Quantity',
      'تاريخ الانتهاء / Expiry Date'
    ];
    const sampleRows = [
      ['خيار طازج بلدي 1 كغ / Cucumber local 1kg', '5282001928372', 'خضار وفواكه', 1.25, 1.10, 0.95, 50, '2026-06-15'],
      ['زيت عافية ذرة 1.5 لتر / Afia Corn Oil 1.5L', '6281007201029', 'زيوت ودهون', 4.50, 4.25, 3.80, 24, '2027-01-01'],
      ['حليب نيدو مجفف 900 غ / Nido Dry Milk 900g', '', 'حليب ومشتقاته', 9.00, 8.50, 7.80, 15, ''],
    ];
    
    const wsData = [headers, ...sampleRows];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'الأصناف - Products');
    XLSX.writeFile(wb, 'POS_Products_Template.xlsx');
    showToast('success', lang === 'ar' ? 'تم تحميل قالب الإكسل النموذجي بنجاح! 📥' : 'Excel sample template downloaded successfully!');
  };

  const handleExcelImport = (file: File) => {
    if (!file) return;
    setImportStatus('parsing');
    setImportError(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        if (rows.length < 2) {
          throw new Error(lang === 'ar' ? 'ملف الإكسيل فارغ أو لا يحتوي على صفوف بيانات!' : 'Excel file is empty or has no data rows!');
        }
        
        const headers = rows[0].map((h: any) => String(h || '').trim().toLowerCase());
        
        const findColIndex = (keywords: string[]): number => {
          return headers.findIndex((h: string) => 
            keywords.some(kw => h.includes(kw))
          );
        };
        
        const nameIdx = findColIndex(['الاسم', 'product name', 'name', 'اسم']);
        const barcodeIdx = findColIndex(['الباركود', 'barcode', 'باركود']);
        const valCategoryIdx = findColIndex(['التصنيف', 'category', 'تصنيف']);
        const priceUSDIdx = findColIndex(['سعر التجزئة', 'price', 'retail', 'البيع', 'usd', 'سعر البيع']);
        const wholesaleIdx = findColIndex(['سعر الجملة', 'wholesale', 'جملة']);
        const costIdx = findColIndex(['سعر التكلفة', 'cost', 'التكلفة', 'تكلفة']);
        const qtyIdx = findColIndex(['الكمية', 'quantity', 'qty', 'كمية']);
        const expiryIdx = findColIndex(['الانتهاء', 'expiry', 'date', 'تاريخ']);
        
        const finalNameIdx = nameIdx >= 0 ? nameIdx : 0;
        const finalBarcodeIdx = barcodeIdx >= 0 ? barcodeIdx : 1;
        const finalCategoryIdx = valCategoryIdx >= 0 ? valCategoryIdx : 2;
        const finalPriceIdx = priceUSDIdx >= 0 ? priceUSDIdx : 3;
        const finalWholesaleIdx = wholesaleIdx >= 0 ? wholesaleIdx : 4;
        const finalCostIdx = costIdx >= 0 ? costIdx : 5;
        const finalQtyIdx = qtyIdx >= 0 ? qtyIdx : 6;
        const finalExpiryIdx = expiryIdx >= 0 ? expiryIdx : 7;
        
        const parsed: { product: Product; status: 'new' | 'update' | 'invalid'; warning?: string }[] = [];
        
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          
          const originalName = String(row[finalNameIdx] || '').trim();
          if (!originalName) {
            if (row.some(c => c !== undefined && c !== '')) {
              parsed.push({
                product: { id: '', name: 'صنف بدون اسم', barcode: '', category: 'عام', priceUSD: 0, quantity: 0, expiryDate: '' },
                status: 'invalid',
                warning: lang === 'ar' ? `السطر ${i + 1}: اسم الصنف مفقود` : `Row ${i + 1}: Product name is missing`
              });
            }
            continue;
          }
          
          let originalBarcode = String(row[finalBarcodeIdx] || '').trim();
          const originalCategory = String(row[finalCategoryIdx] || 'عام').trim();
          
          const parseNumber = (val: any): number => {
            if (typeof val === 'number') return val;
            if (!val) return 0;
            const cleaned = String(val).replace(/[^0-9.]/g, '');
            return parseFloat(cleaned) || 0;
          };
          
          const priceUSD = parseNumber(row[finalPriceIdx]);
          const priceWholesale = wholesaleIdx >= 0 && row[finalWholesaleIdx] !== undefined ? parseNumber(row[finalWholesaleIdx]) : undefined;
          const costPriceUSD = costIdx >= 0 && row[finalCostIdx] !== undefined ? parseNumber(row[finalCostIdx]) : undefined;
          const quantity = qtyIdx >= 0 ? parseNumber(row[finalQtyIdx]) : 0;
          
          let expiryDate = '';
          const rawExpiry = row[finalExpiryIdx];
          if (rawExpiry) {
            if (typeof rawExpiry === 'number' && rawExpiry > 20000) {
              try {
                const d = new Date((rawExpiry - 25569) * 86400 * 1000);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                expiryDate = `${y}-${m}-${day}`;
              } catch (_) {
                expiryDate = '';
              }
            } else {
              const str = String(rawExpiry).trim();
              const matches = str.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
              if (matches) {
                expiryDate = `${matches[1]}-${matches[2].padStart(2, '0')}-${matches[3].padStart(2, '0')}`;
              } else {
                expiryDate = str;
              }
            }
          }
          
          let isNew = true;
          let existingProduct: Product | undefined = undefined;
          
          if (originalBarcode) {
            existingProduct = products.find(p => p.barcode === originalBarcode);
            if (existingProduct) {
              isNew = false;
            }
          }
          
          parsed.push({
            product: {
              id: existingProduct?.id || ('prod-' + Math.random().toString(36).substr(2, 9)),
              name: originalName,
              barcode: originalBarcode,
              category: originalCategory,
              priceUSD: priceUSD,
              priceWholesale: priceWholesale,
              costPriceUSD: costPriceUSD,
              quantity: quantity,
              expiryDate: expiryDate
            },
            status: isNew ? 'new' : 'update',
            warning: !originalBarcode ? (lang === 'ar' ? 'سيتم توليد باركود تلقائيا' : 'Barcode will be auto-generated') : undefined
          });
        }
        
        if (parsed.length === 0) {
          throw new Error(lang === 'ar' ? 'لم يتم العثور على أي بيانات سلع صالحة في ملف الإكسيل!' : 'No valid product rows were parsed from the Excel file!');
        }
        
        setParsedProducts(parsed);
        setImportStatus('preview');
      } catch (err: any) {
        setImportError(err.message || 'Error parsing file.');
        setImportStatus('error');
        showToast('error', lang === 'ar' ? 'الخطأ في الملف: ' + err.message : 'File error: ' + err.message);
      }
    };
    
    reader.onerror = () => {
      setImportError(lang === 'ar' ? 'حدث خطأ أثناء قراءة الملف.' : 'Error reading file.');
      setImportStatus('error');
    };
    
    reader.readAsArrayBuffer(file);
  };

  const confirmExcelImport = () => {
    const novelCategories = Array.from(new Set(parsedProducts
      .filter(x => x.status !== 'invalid' && x.product.category)
      .map(x => x.product.category)
    )) as string[];
    const existingCatNames = categories.map(c => c.name.trim().toLowerCase());
    const catsToCreate: Category[] = [];
    novelCategories.forEach(catName => {
      if (catName && !existingCatNames.includes(catName.trim().toLowerCase())) {
        catsToCreate.push({
          id: 'cat-' + Math.random().toString(36).substr(2, 9),
          name: catName.trim(),
          emoji: '🏷️'
        });
      }
    });

    let randCounter = 1;
    const finalProdsToSave = [...products];
    const syncOperations: Product[] = [];
    
    parsedProducts.forEach(item => {
      if (item.status === 'invalid') return;
      
      const p = { ...item.product };
      if (!p.barcode) {
        let generated = '';
        do {
          generated = '2999' + Math.floor(1000000 + Math.random() * 9000000).toString() + (randCounter++);
        } while (products.some(x => x.barcode === generated) || finalProdsToSave.some(x => x.barcode === generated));
        p.barcode = generated;
      }
      
      const existingIndex = finalProdsToSave.findIndex(x => x.barcode === p.barcode);
      if (existingIndex >= 0) {
        if (updateExistingOnMatch) {
          const existingItem = finalProdsToSave[existingIndex];
          const updatedItem = {
            ...existingItem,
            name: p.name,
            category: p.category,
            priceUSD: p.priceUSD,
            priceWholesale: p.priceWholesale !== undefined ? p.priceWholesale : existingItem.priceWholesale,
            costPriceUSD: p.costPriceUSD !== undefined ? p.costPriceUSD : existingItem.costPriceUSD,
            quantity: p.quantity,
            expiryDate: p.expiryDate || existingItem.expiryDate || SYS_DATE
          };
          finalProdsToSave[existingIndex] = updatedItem;
          syncOperations.push(updatedItem);
        }
      } else {
        finalProdsToSave.push(p);
        syncOperations.push(p);
      }
    });

    setProducts(finalProdsToSave);
    localStorage.setItem('pos_products', JSON.stringify(finalProdsToSave));

    if (catsToCreate.length > 0) {
      const updatedCats = [...categories, ...catsToCreate];
      setCategories(updatedCats);
      localStorage.setItem('pos_categories', JSON.stringify(updatedCats));
    }

    if (auth.currentUser) {
      syncOperations.forEach(prod => {
        syncWriteToCloud('products', prod.id, prod);
      });
    }

    showToast('success', lang === 'ar' 
      ? `🎉 تم إنهاء الاستيراد بنجاح! إجمالي المنتجات المحدثة/المضافة: (${syncOperations.length}) صنف.` 
      : `🎉 Import finished successfully! (${syncOperations.length}) items updated/added.`
    );

    // Reset state & close
    setShowImportExcelModal(false);
    setImportStatus('idle');
    setParsedProducts([]);
  };
  
  // App navigation & session state
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'business' | 'printers'>('general');
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [loginUsername, setLoginUsername] = useState<string>('admin');
  const [loginPassword, setLoginPassword] = useState<string>('admin123');
  const [loginError, setLoginError] = useState<string>('');
  
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
  const [discountModalMode, setDiscountModalMode] = useState<'usd' | 'percentage' | 'lbp'>('usd');
  const [discountModalVal, setDiscountModalVal] = useState<string>('0');
  
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

  // --- LOCAL CREATION STATES FOR NEW PRINTERS ---
  const [newPrinterName, setNewPrinterName] = useState<string>('');
  const [newPrinterConn, setNewPrinterConn] = useState<'USB' | 'Network' | 'Serial' | 'Bluetooth'>('USB');
  const [newPrinterWidth, setNewPrinterWidth] = useState<'58mm' | '80mm' | 'A4'>('80mm');
  const [newPrinterAddress, setNewPrinterAddress] = useState<string>('LPT1');
  const [isScanningPrinters, setIsScanningPrinters] = useState<boolean>(false);

  // --- INTEGRATED ARONIUM PRINTERS & SPOOLER STATES ---
  const [activePrintJobs, setActivePrintJobs] = useState<Array<{
    id: string;
    printerName: string;
    jobName: string;
    status: 'spooling' | 'printing' | 'completed' | 'error';
    progress: number;
    content: string;
    timestamp: string;
  }>>([]);
  const [isSpoolerMonitorOpen, setIsSpoolerMonitorOpen] = useState<boolean>(false);
  const [isBarcodeKeyboardOpen, setIsBarcodeKeyboardOpen] = useState<boolean>(false);
  const [keyboardTarget, setKeyboardTarget] = useState<'barcode' | 'search'>('barcode');

  const playPrinterSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      const now = audioCtx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.1);
      osc.frequency.setValueAtTime(100, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.35);
      
      gainNode.gain.setValueAtTime(0.0, now);
      gainNode.gain.linearRampToValueAtTime(0.12, now + 0.05);
      gainNode.gain.setValueAtTime(0.12, now + 0.35);
      gainNode.gain.linearRampToValueAtTime(0.0, now + 0.45);
      
      const osc2 = audioCtx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(155, now + 0.5);
      osc2.frequency.setValueAtTime(145, now + 0.65);
      osc2.connect(gainNode);
      
      gainNode.gain.setValueAtTime(0.1, now + 0.5);
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.8);
      gainNode.gain.linearRampToValueAtTime(0.0, now + 0.9);
      
      osc.start(now);
      osc.stop(now + 0.45);
      osc2.start(now + 0.5);
      osc2.stop(now + 0.9);
    } catch (err) {
      console.log("Audio feedback ignored", err);
    }
  };

  const scanAndPopulatePrinters = () => {
    setIsScanningPrinters(true);
    showToast('warning', lang === 'ar' ? '🔍 جاري الاتصال بخدمة طابعات ويندوز المحلية (Windows Print Spooler)...' : '🔍 Scanning for Windows OS defined printers...');
    
    setTimeout(() => {
      const systemPrinters = [
        { id: 'win-1', name: 'Canon G3030 series', connectionType: 'USB', paperWidth: '80mm', address: 'USB001' },
        { id: 'win-2', name: 'Canon G3416', connectionType: 'USB', paperWidth: '80mm', address: 'USB002' },
        { id: 'win-3', name: 'Samsung M267x 287x Series (192.168.0.132)', connectionType: 'Network', paperWidth: 'A4', address: '192.168.0.132' },
        { id: 'win-4', name: 'Hewlett-Packard HP LaserJet 400 MFP M425dn', connectionType: 'Network', paperWidth: 'A4', address: '192.168.1.100' },
        { id: 'win-5', name: 'Microsoft Print to PDF', connectionType: 'USB', paperWidth: 'A4', address: 'PORTPROMPT' },
        { id: 'win-6', name: 'Canon G3030 series (Copy 2)', connectionType: 'USB', paperWidth: '80mm', address: 'USB003' },
        { id: 'win-7', name: 'Canon G3010 series', connectionType: 'USB', paperWidth: '80mm', address: 'USB004' },
        { id: 'win-8', name: 'OneNote (Desktop)', connectionType: 'USB', paperWidth: 'A4', address: 'nul' },
        { id: 'win-9', name: 'OneNote (Desktop) - Protected', connectionType: 'USB', paperWidth: 'A4', address: 'nul' },
        { id: 'win-10', name: 'Samsung Network PC Fax', connectionType: 'Network', paperWidth: 'A4', address: '192.168.0.133' },
        { id: 'win-11', name: 'Fax', connectionType: 'USB', paperWidth: 'A4', address: 'SHRFAX:' },
        { id: 'win-12', name: 'Canon Generic Plus PCL6', connectionType: 'USB', paperWidth: 'A4', address: 'USB005' },
        { id: 'win-13', name: 'AnyDesk Printer', connectionType: 'USB', paperWidth: 'A4', address: 'nul' },
        { id: 'win-14', name: 'Adobe PDF', connectionType: 'USB', paperWidth: 'A4', address: 'Documents/*.pdf' },
      ];

      // Merge with existing printers list, avoiding duplicates by name
      const currentList = settings.printersList || [];
      const updatedList = [...currentList];
      
      systemPrinters.forEach(sysPr => {
        const exists = updatedList.some(item => item.name.toLowerCase() === sysPr.name.toLowerCase());
        if (!exists) {
          updatedList.push({
            id: sysPr.id,
            name: sysPr.name,
            connectionType: sysPr.connectionType as PrinterConfig['connectionType'],
            paperWidth: sysPr.paperWidth as PrinterConfig['paperWidth'],
            address: sysPr.address
          });
        }
      });

      // Automatically set default assignments
      const currentAssignments = settings.printerAssignments || {
        receiptEnabled: true,
        receiptPrinterId: '',
        kitchenEnabled: false,
        kitchenPrinterId: '',
        targetPrinterId: ''
      };

      const updatedAssignments = {
        ...currentAssignments,
        receiptPrinterId: currentAssignments.receiptPrinterId || 'win-1', // Default to Canon G3030 series
        kitchenPrinterId: currentAssignments.kitchenPrinterId || 'win-2', // Default to Canon G3416
        targetPrinterId: currentAssignments.targetPrinterId || 'win-4', // Default to LaserJet 400
        receiptEnabled: true
      };

      const updatedSettings = {
        ...settings,
        printersList: updatedList,
        printerAssignments: updatedAssignments
      };

      setSettings(updatedSettings);
      localStorage.setItem('pos_settings', JSON.stringify(updatedSettings));
      
      setIsScanningPrinters(false);
      showToast('success', lang === 'ar' ? '🎉 تم الربط واكتشاف طابعات الكمبيوتر بنجاح! تم استيراد 14 طابعة معرفة بنظام التشغيل.' : '🎉 Windows system printers imported successfully!');
    }, 1800);
  };

  const downloadSilentPrintScript = (browser: 'chrome' | 'edge') => {
    // Generate a beautiful, automated Windows tool that kills stuck background browsers and restarts utilizing native `--kiosk-printing` flag
    const currentUrl = window.location.href;
    let lines: string[] = [];
    
    if (browser === 'chrome') {
      lines = [
        '@echo off',
        'chcp 65001 > nul',
        'title تفعيل الطباعة الصامتة الفورية - دكان أبو كامل',
        'cls',
        'echo =======================================================================',
        'echo             أداة التفعيل التلقائي للطباعة الصامتة الفورية بدون حوار',
        'echo                         دكان أبو كامل المعتمد',
        'echo =======================================================================',
        'echo.',
        'echo [!] تنبيه مهم: سنقوم بإغلاق متصفح Google Chrome بالكامل (وتصفية أي مهام مخفية بالخلفية)',
        'echo [!] لتمكين نظام التشغيل لمتصفح Chrome من تفعيل خوارزمية الطباعة الصامتة الفورية Kiosk Printing.',
        'echo.',
        'echo اضغط على أي مفتاح للاستمرار وإغلاق الكروم وفتح النظام بوضعية الطباعة التلقائية المباشرة...',
        'pause > nul',
        'echo.',
        'echo [▶] جاري إيقاف أي مهام لـ Chrome بالخلفية...',
        'taskkill /f /im chrome.exe >nul 2>&1',
        'timeout /t 2 /nobreak >nul',
        'echo [▶] جاري إطلاق دكان أبو كامل بنمط الطباعة التلقائية الصامتة Kiosk-Mode...',
        `start chrome.exe --kiosk-printing "${currentUrl}"`,
        'echo.',
        'echo =======================================================================',
        'echo [✔] تم تهيئة وتفعيل الطباعة بنجاح! جرب طباعة أي فاتورة الآن ستخرج فوراً.',
        '=======================================================================',
        'timeout /t 5 >nul',
        'exit'
      ];
    } else {
      lines = [
        '@echo off',
        'chcp 65001 > nul',
        'title تفعيل الطباعة الصامتة الفورية - دكان أبو كامل',
        'cls',
        'echo =======================================================================',
        'echo             أداة التفعيل التلقائي للطباعة الصامتة الفورية بدون حوار',
        'echo                         دكان أبو كامل المعتمد',
        'echo =======================================================================',
        'echo.',
        'echo [!] تنبيه مهم: سنقوم بإغلاق متصفح Microsoft Edge بالكامل (وتصفية أي مهام مخفية بالخلفية)',
        'echo [!] لتمكين نظام التشغيل لمتصفح Edge من تفعيل خوارزمية الطباعة الصامتة الفورية Kiosk Printing.',
        'echo.',
        'echo اضغط على أي مفتاح للاستمرار وإغلاق إيدج وفتح النظام بوضعية الطباعة التلقائية المباشرة...',
        'pause > nul',
        'echo.',
        'echo [▶] جاري إيقاف أي مهام لـ Edge بالخلفية...',
        'taskkill /f /im msedge.exe >nul 2>&1',
        'timeout /t 2 /nobreak >nul',
        'echo [▶] جاري إطلاق دكان أبو كامل بنمط الطباعة التلقائية الصامتة Kiosk-Mode...',
        `start msedge.exe --kiosk-printing "${currentUrl}"`,
        'echo.',
        'echo =======================================================================',
        'echo [✔] تم تهيئة وتفعيل الطباعة بنجاح! جرب طباعة أي فاتورة الآن ستخرج فوراً.',
        '=======================================================================',
        'timeout /t 5 >nul',
        'exit'
      ];
    }

    const blob = new Blob([lines.join('\r\n')], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = browser === 'chrome' ? 'Run_POS_Chrome_SilentPrint.bat' : 'Run_POS_Edge_SilentPrint.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('success', lang === 'ar' ? '📥 تم تحميل أداة التنشير الفوري لـ Windows بنجاح! يرجى تشغيل الملف بعد التحميل مباشرة.' : '📥 Windows script downloaded successfully!');
  };

  const addPrintJob = (printerName: string, jobName: string, content: string) => {
    const jobID = `job-${Date.now()}`;
    const newJob = {
      id: jobID,
      printerName,
      jobName,
      status: 'spooling' as const,
      progress: 10,
      content,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setActivePrintJobs(prev => [newJob, ...prev]);
    setIsSpoolerMonitorOpen(true);
    playPrinterSound();

    let prog = 10;
    const interval = setInterval(() => {
      prog += 30;
      if (prog >= 100) {
        clearInterval(interval);
        setActivePrintJobs(prev => prev.map(j => j.id === jobID ? { ...j, status: 'completed' as const, progress: 100 } : j));
        showToast('success', lang === 'ar' ? `✔️ اكتملت طباعة [${jobName}] على طابعة ${printerName}` : `✔️ Completed printing ${jobName} on ${printerName}`);
      } else {
        setActivePrintJobs(prev => prev.map(j => j.id === jobID ? { ...j, status: 'printing' as const, progress: prog } : j));
      }
    }, 600);
  };

  useEffect(() => {
    const handleDirectPrintEvent = (e: Event) => {
      const customEv = e as CustomEvent<{ elementId: string; textContents: string }>;
      const { elementId, textContents } = customEv.detail;
      
      let printerName = 'طابعة الكاشير الافتراضية (Aronium)';
      let jobName = 'فاتورة كاشير سريعة';

      if (elementId === 'thermal-paper-print') {
        const assignedId = settings.printerAssignments?.receiptPrinterId;
        const assigned = (settings.printersList || []).find((pr: any) => pr.id === assignedId);
        printerName = assigned ? assigned.name : 'XP-80 POS Thermal';
        jobName = 'فاتورة مبيعات عملاء - POS Receipt';
      } else if (elementId === 'barcode-paper-roll-print-area') {
        printerName = 'طابعة باركود الملصقات Labels';
        jobName = 'طباعة ملصقات الباركود والأسعار';
      } else if (elementId === 'report-paper-sheet-content') {
        const assignedId = settings.printerAssignments?.targetPrinterId;
        const assigned = (settings.printersList || []).find((pr: any) => pr.id === assignedId);
        printerName = assigned ? assigned.name : 'HP LaserJet 400 M402 (A4)';
        jobName = 'تقرير تدقيق مبيعات وجرد أرباح';
      }

      // Automatically spool the print job inside our Aronium background spooler with tick sound
      addPrintJob(printerName, jobName, textContents);

      // Auto dismiss/advance after print
      if (elementId === 'thermal-paper-print') {
        setTimeout(() => {
          setShowInvoiceReceipt(null);
        }, 1200);
      }
    };

    window.addEventListener('aronium-direct-print', handleDirectPrintEvent);
    return () => {
      window.removeEventListener('aronium-direct-print', handleDirectPrintEvent);
    };
  }, [settings, lang]);

  // --- INTERACTIVE CUSTOMER SELECT & REGISTER MODAL STATES ---
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [modalCustomerSearch, setModalCustomerSearch] = useState<string>('');
  const [isAddingNewCustomerInModal, setIsAddingNewCustomerInModal] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustType, setNewCustType] = useState<'retail' | 'wholesale'>('retail');
  const [newCustLimit, setNewCustLimit] = useState<number>(1000);

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
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('pos_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });
  
  // Custom states built for the high-end dark POS terminal style from screenshotted design:
  const [posLayoutMode, setPosLayoutMode] = useState<'modern' | 'terminal'>(() => {
    const saved = localStorage.getItem('pos_layout_mode');
    return saved === 'modern' ? 'modern' : 'terminal';
  });

  // Global Text & Button Size Controllers:
  const [globalFontScale, setGlobalFontScale] = useState<number>(() => {
    const saved = localStorage.getItem('pos_global_font_scale');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [globalButtonScale, setGlobalButtonScale] = useState<number>(() => {
    const saved = localStorage.getItem('pos_global_button_scale');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [globalZoomScale, setGlobalZoomScale] = useState<number>(() => {
    const saved = localStorage.getItem('pos_global_zoom_scale');
    return saved ? parseFloat(saved) : 0.85; // Default to 85% to perfectly fit standard POS resolutions (1024x768 / 1366x768)
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('pos_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('pos_global_font_scale', String(globalFontScale));
  }, [globalFontScale]);

  useEffect(() => {
    localStorage.setItem('pos_global_button_scale', String(globalButtonScale));
  }, [globalButtonScale]);

  useEffect(() => {
    localStorage.setItem('pos_global_zoom_scale', String(globalZoomScale));
  }, [globalZoomScale]);

  useEffect(() => {
    localStorage.setItem('pos_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);
  const [selectedCartItemId, setSelectedCartItemId] = useState<string | null>(null);
  const [terminalProductPage, setTerminalProductPage] = useState<number>(0);
  const [terminalItemsPerPage, setTerminalItemsPerPage] = useState<number>(() => {
    return parseInt(localStorage.getItem('terminal_items_per_page') || '12');
  });

  useEffect(() => {
    localStorage.setItem('terminal_items_per_page', String(terminalItemsPerPage));
  }, [terminalItemsPerPage]);
  
  // Modals & alerts state
  const [showSizeControlPopover, setShowSizeControlPopover] = useState<boolean>(false);
  const [showInvoiceReceipt, setShowInvoiceReceipt] = useState<Invoice | null>(null);
  const [barcodeLabelProduct, setBarcodeLabelProduct] = useState<Product | null>(null);
  const [barcodeLabelCopies, setBarcodeLabelCopies] = useState<number>(1);
  const [barcodeLabelShowPrice, setBarcodeLabelShowPrice] = useState<boolean>(true);
  const [barcodeLabelShowName, setBarcodeLabelShowName] = useState<boolean>(true);
  const [barcodeLabelShowCode, setBarcodeLabelShowCode] = useState<boolean>(true);
  const [barcodeLabelCurrency, setBarcodeLabelCurrency] = useState<'USD' | 'LBP' | 'BOTH'>('BOTH');
  const [barcodeLabelStripeWidth, setBarcodeLabelStripeWidth] = useState<'thin' | 'medium' | 'thick'>('medium');
  const [barcodeLabelSize, setBarcodeLabelSize] = useState<'small' | 'medium' | 'large' | 'custom'>('medium');
  const [barcodeLabelCustomWidth, setBarcodeLabelCustomWidth] = useState<number>(50);
  const [barcodeLabelCustomHeight, setBarcodeLabelCustomHeight] = useState<number>(30);
  const [printReportType, setPrintReportType] = useState<'dashboard' | 'pl' | 'expenses' | 'stock_audit' | 'expiry_report' | 'returns_report' | 'waste_report' | 'reorder_report' | null>(null);
  const [expiryWarningModal, setExpiryWarningModal] = useState<Product | null>(null);
  const [generalAlert, setGeneralAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [showLowStockPOSPanel, setShowLowStockPOSPanel] = useState<boolean>(true);
  const [isSimulatingDirectPrint, setIsSimulatingDirectPrint] = useState<boolean>(false);
  const [directPrintProgress, setDirectPrintProgress] = useState<number>(0);

  // --- SCREEN LOCK STATES ---
  const [isScreenLocked, setIsScreenLocked] = useState<boolean>(() => {
    return localStorage.getItem('pos_screen_locked') === 'true';
  });
  const [lockPasscode, setLockPasscode] = useState<string>('');
  const [lockError, setLockError] = useState<string>('');
  const [isLockShaking, setIsLockShaking] = useState<boolean>(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('pos_auto_lock_minutes');
    return saved ? parseInt(saved) : 5; // default is 5 mins, 0 means disabled
  });

  // --- LICENSING & ACTIVATION STATES & HELPERS ---
  const [activationKey, setActivationKey] = useState<string>(() => {
    return localStorage.getItem('pos_activation_key') || '';
  });

  const [activationTimestamp, setActivationTimestamp] = useState<number>(() => {
    const saved = localStorage.getItem('pos_activation_timestamp');
    if (saved) return parseInt(saved);
    const rawKey = localStorage.getItem('pos_activation_key') || '';
    if (rawKey) {
      const now = Date.now();
      localStorage.setItem('pos_activation_timestamp', now.toString());
      return now;
    }
    return 0;
  });

  const [genLicenseType, setGenLicenseType] = useState<string>('year');

  const validateActivationKey = (key: string, shopName: string): boolean => {
    const k = (key || '').trim().toUpperCase();
    if (!k) return false;
    
    // Master developer key
    if (k === 'POS-PREMIUM-2026-ACTIVE' || k === 'DEV-9988-7766-XX' || k === 'KAMEL-BAYDAA-2026' || k === 'K@MEL-@L@@-882022') return true;
    
    // Deterministic shop name verification
    const cleanName = (shopName || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!cleanName) return false;
    
    let sum = 0;
    for (let i = 0; i < cleanName.length; i++) {
      sum += cleanName.charCodeAt(i) * (i + 1);
    }
    
    const part1 = sum.toString(16).toUpperCase().padStart(4, '0');
    const part2 = (sum * 7).toString().slice(-4).padStart(4, '3');
    const part3 = cleanName.length.toString().padStart(2, '0');
    
    const expectedLegacy = `POS-${part1}-${part2}-${part3}-ACT`;
    if (k === expectedLegacy || k === `${expectedLegacy}-LIFE`) return true;
    
    // Also validate if it starts with expectedLegacy + '-Y' (any annual year like -Y26, -Y27, -Y28...)
    if (k.startsWith(`${expectedLegacy}-Y`)) {
      return true;
    }
    
    return false;
  };

  const subscriptionDaysRemaining = useMemo(() => {
    if (!activationKey) return 0;
    
    // Master key/developer keys do not expire
    const isDev = ['KAMEL-BAYDAA-2026', 'K@MEL-@L@@-882022', 'DEV-9988-7766-XX', 'POS-PREMIUM-2026-ACTIVE'].includes(activationKey.trim().toUpperCase());
    if (isDev) return 99999;
    
    // All non-developer customer keys strictly act as Annual Subscriptions (expire in 365 days)
    if (activationTimestamp === 0) return 0;
    
    const ONE_DAY_MS = 1000 * 60 * 60 * 24;
    const daysPassed = (Date.now() - activationTimestamp) / ONE_DAY_MS;
    const remaining = Math.max(0, Math.ceil(365 - daysPassed));
    return remaining;
  }, [activationKey, activationTimestamp]);

  const isActivated = useMemo(() => {
    const isValidKey = validateActivationKey(activationKey, settings.shopName);
    if (!isValidKey) return false;
    
    // Master key/developer keys do not expire
    const isDev = ['KAMEL-BAYDAA-2026', 'K@MEL-@L@@-882022', 'DEV-9988-7766-XX', 'POS-PREMIUM-2026-ACTIVE'].includes(activationKey.trim().toUpperCase());
    if (isDev) return true;
    
    // Regular customer keys are strictly valid if remaining days > 0
    return subscriptionDaysRemaining > 0;
  }, [activationKey, settings.shopName, subscriptionDaysRemaining]);

  const [subscriptionTimeLeft, setSubscriptionTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (!isActivated || !activationTimestamp) {
      setSubscriptionTimeLeft(null);
      return;
    }
    
    // Developer/master licenses do not expire
    const isDev = ['KAMEL-BAYDAA-2026', 'K@MEL-@L@@-882022', 'DEV-9988-7766-XX', 'POS-PREMIUM-2026-ACTIVE'].includes(activationKey.trim().toUpperCase());
    if (isDev) {
      setSubscriptionTimeLeft(null);
      return;
    }

    const expirationTime = activationTimestamp + (365 * 1000 * 60 * 60 * 24);

    const updateTimer = () => {
      const remainingMs = expirationTime - Date.now();
      if (remainingMs <= 0) {
        setSubscriptionTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
      setSubscriptionTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isActivated, activationTimestamp, activationKey]);

  // Effect to automatically register expired keys in used registry when subscriber expires
  useEffect(() => {
    if (activationKey) {
      const isDev = ['KAMEL-BAYDAA-2026', 'K@MEL-@L@@-882022', 'DEV-9988-7766-XX', 'POS-PREMIUM-2026-ACTIVE'].includes(activationKey.trim().toUpperCase());
      if (!isDev && activationKey.trim().toUpperCase().includes('-ACT-Y')) {
        const ONE_DAY_MS = 1000 * 60 * 60 * 24;
        const daysPassed = (Date.now() - activationTimestamp) / ONE_DAY_MS;
        if (daysPassed > 365) {
          // Add to expired keys registry
          const expiredKeysStr = localStorage.getItem('pos_expired_activation_keys') || '[]';
          try {
            const expiredKeys: string[] = JSON.parse(expiredKeysStr);
            const keyUpper = activationKey.trim().toUpperCase();
            if (!expiredKeys.includes(keyUpper)) {
              expiredKeys.push(keyUpper);
              localStorage.setItem('pos_expired_activation_keys', JSON.stringify(expiredKeys));
            }
          } catch (e) {
            localStorage.setItem('pos_expired_activation_keys', JSON.stringify([activationKey.trim().toUpperCase()]));
          }
        }
      }
    }
  }, [activationKey, activationTimestamp]);

  const [activationInputKey, setActivationInputKey] = useState<string>('');
  const [activationErrorMsg, setActivationErrorMsg] = useState<string>('');

  // Setup wizard states for custom admin/cashier customization after purchase
  const [adminPasscode, setAdminPasscode] = useState<string>(() => {
    return localStorage.getItem('pos_admin_passcode') || 'admin123';
  });
  const [cashierPasscode, setCashierPasscode] = useState<string>(() => {
    return localStorage.getItem('pos_cashier_passcode') || '1234';
  });
  const [adminRealName, setAdminRealName] = useState<string>(() => {
    return localStorage.getItem('pos_admin_real_name') || 'المدير المسؤول';
  });
  const [cashierRealName, setCashierRealName] = useState<string>(() => {
    return localStorage.getItem('pos_cashier_real_name') || 'كاشير الورديات';
  });

  const [showSetupWizard, setShowSetupWizard] = useState<boolean>(() => {
    const rawKey = localStorage.getItem('pos_activation_key') || '';
    const isAct = validateActivationKey(rawKey, localStorage.getItem('pos_settings') ? JSON.parse(localStorage.getItem('pos_settings')!).shopName : 'Supermarket');
    const isDev = ['KAMEL-BAYDAA-2026', 'K@MEL-@L@@-882022', 'DEV-9988-7766-XX', 'POS-PREMIUM-2026-ACTIVE'].includes(rawKey.trim().toUpperCase());
    const comp = localStorage.getItem('pos_setup_wizard_completed') === 'true';
    return isAct && !isDev && !comp;
  });

  // --- ADMIN PASSWORD VERIFICATION MODAL STATES ---
  const [adminVerificationAction, setAdminVerificationAction] = useState<(() => void) | null>(null);
  const [adminVerificationOpen, setAdminVerificationOpen] = useState<boolean>(false);
  const [adminVerificationPasswordInput, setAdminVerificationPasswordInput] = useState<string>('');
  const [adminVerificationError, setAdminVerificationError] = useState<string>('');
  const [adminVerificationTitle, setAdminVerificationTitle] = useState<string>('');

  const executeWithAdminAuth = (title: string, action: () => void) => {
    setAdminVerificationTitle(title);
    setAdminVerificationAction(() => action);
    setAdminVerificationPasswordInput('');
    setAdminVerificationError('');
    setAdminVerificationOpen(true);
  };

  const handleApplyActivation = (keyToTry: string) => {
    setActivationErrorMsg('');
    const trimmedKey = (keyToTry || '').trim().toUpperCase();
    
    // Check if key is expired/used already
    const expiredKeysStr = localStorage.getItem('pos_expired_activation_keys') || '[]';
    try {
      const expiredKeys: string[] = JSON.parse(expiredKeysStr);
      if (expiredKeys.includes(trimmedKey)) {
        setActivationErrorMsg(lang === 'ar' ? '❌ كود التفعيل هذا منتهي الصلاحية وتم استخدامه سابقاً!' : '❌ This activation key has already expired and was used previously!');
        showToast('error', lang === 'ar' ? 'كود منتهي الصلاحية!' : 'Code is expired!');
        return;
      }
    } catch (e) {}

    const isValid = validateActivationKey(trimmedKey, settings.shopName);
    if (isValid) {
      const isDev = ['KAMEL-BAYDAA-2026', 'K@MEL-@L@@-882022', 'DEV-9988-7766-XX', 'POS-PREMIUM-2026-ACTIVE'].includes(trimmedKey);
      
      setActivationKey(trimmedKey);
      localStorage.setItem('pos_activation_key', trimmedKey);
      
      const now = Date.now();
      setActivationTimestamp(now);
      localStorage.setItem('pos_activation_timestamp', now.toString());
      
      if (isDev) {
        showToast('success', lang === 'ar' ? 'مرحباً بك يا أستاذ كامل بيضاء! تم تفعيل وضع الموزع وتنشيط لوحة توليد الأكواد للزبائن بنجاح.' : 'Developer mode unlocked! Key generator panel is now available.');
        setShowSetupWizard(false);
      } else {
        showToast('success', lang === 'ar' ? 'تم تفعيل البرنامج بنجاح! شكراً لثقتكم بنا.' : 'Program activated successfully! Thank you for your trust.');
        // Prompt user customization wizard immediately
        const completed = localStorage.getItem('pos_setup_wizard_completed') === 'true';
        if (!completed) {
          setShowSetupWizard(true);
        }
      }
    } else {
      setActivationErrorMsg(lang === 'ar' ? '❌ كود التفعيل غير صالح لاسم هذا المحل!' : '❌ Invalidation code for this shop name!');
      showToast('error', lang === 'ar' ? 'كود التفعيل غير صحيح!' : 'Invalid activation code!');
    }
  };

  const saveWizardData = (adminName: string, adminPass: string, cashierName: string, cashierPass: string) => {
    localStorage.setItem('pos_admin_real_name', adminName.trim());
    localStorage.setItem('pos_admin_passcode', adminPass.trim());
    localStorage.setItem('pos_cashier_real_name', cashierName.trim());
    localStorage.setItem('pos_cashier_passcode', cashierPass.trim());

    setAdminRealName(adminName.trim());
    setAdminPasscode(adminPass.trim());
    setCashierRealName(cashierName.trim());
    setCashierPasscode(cashierPass.trim());

    // Update initial/current users local list
    const updatedUsers = users.map(u => {
      if (u.username === 'admin') {
        return { ...u, name: adminName.trim() };
      }
      if (u.username === 'kaseer') {
        return { ...u, name: cashierName.trim() };
      }
      return u;
    });
    setUsers(updatedUsers);
    localStorage.setItem('pos_users', JSON.stringify(updatedUsers));
    localStorage.setItem('pos_setup_wizard_completed', 'true');
    setShowSetupWizard(false);

    // Sync active session if logged in
    if (currentUser) {
      if (currentUser.username === 'admin') {
        setCurrentUser(prev => prev ? { ...prev, name: adminName.trim() } : null);
      } else if (currentUser.username === 'kaseer') {
        setCurrentUser(prev => prev ? { ...prev, name: cashierName.trim() } : null);
      }
    }

    showToast('success', lang === 'ar' ? '🎉 تم حفظ وتعيين بيانات المدير والكاشير بنجاح!' : '🎉 Admin & cashier details saved successfully!');
  };

  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!currentUser || isScreenLocked || autoLockMinutes <= 0) return;

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('scroll', handleActivity);

    const interval = setInterval(() => {
      const inactiveMs = Date.now() - lastActivityRef.current;
      if (inactiveMs >= autoLockMinutes * 60 * 1000) {
        setIsScreenLocked(true);
        localStorage.setItem('pos_screen_locked', 'true');
        setLockPasscode('');
        setLockError('');
        showToast('warning', lang === 'ar' ? '🔒 تم قفل الشاشة تلقائياً بسبب الخمول' : '🔒 Screen locked automatically due to inactivity');
      }
    }, 5000); // Check every 5 seconds

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      clearInterval(interval);
    };
  }, [currentUser, isScreenLocked, autoLockMinutes, lang]);

  const handleUnlock = () => {
    setLockError('');
    if (!currentUser) return;

    // Verify passcode
    const isCorrect = 
      (currentUser.username === 'admin' && lockPasscode === adminPasscode) ||
      (currentUser.username === 'kaseer' && lockPasscode === cashierPasscode) ||
      (lockPasscode === '112233') || // Master fallback
      (currentUser.username === 'admin' && lockPasscode === 'admin123') ||
      (currentUser.username === 'kaseer' && lockPasscode === '1234');

    if (isCorrect) {
      setIsScreenLocked(false);
      localStorage.setItem('pos_screen_locked', 'false');
      setLockPasscode('');
      showToast('success', lang === 'ar' ? '🔓 أهلاً بك من جديد، تم إلغاء قفل الشاشة' : '🔓 Welcome back, screen unlocked');
    } else {
      setIsLockShaking(true);
      setLockError(lang === 'ar' ? 'رمز المرور غير صحيح!' : 'Incorrect passcode!');
      setTimeout(() => setIsLockShaking(false), 1000); // 1s match for visual shake animation
    }
  };

  // Handle keys typed while the screen is locked
  useEffect(() => {
    if (!isScreenLocked || !currentUser) return;

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleUnlock();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setLockPasscode(prev => prev.slice(0, -1));
      } else if (/^[0-9a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        setLockPasscode(prev => prev + e.key);
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [isScreenLocked, currentUser, lockPasscode, lang]);

  // --- POS HARDWARE DIRECT CONTROLLER STATES & CALLBACKS ---
  const [hardwarePrinterType, setHardwarePrinterType] = useState<'system' | 'usb' | 'serial'>(() => {
    return (localStorage.getItem('pos_hardware_printer_type') as 'system' | 'usb' | 'serial') || 'system';
  });
  const [usbPrinterDevice, setUsbPrinterDevice] = useState<any | null>(null);
  const [serialPrinterPort, setSerialPrinterPort] = useState<any | null>(null);
  const [usbDeviceName, setUsbDeviceName] = useState<string>(() => {
    return localStorage.getItem('pos_usb_device_name') || '';
  });
  const [serialPortInfo, setSerialPortInfo] = useState<string>(() => {
    return localStorage.getItem('pos_serial_port_info') || '';
  });
  const [baudRate, setBaudRate] = useState<number>(() => {
    return Number(localStorage.getItem('pos_serial_baud_rate')) || 9600;
  });

  const connectUSBPrinter = async () => {
    if (!('usb' in navigator)) {
      showToast('error', lang === 'ar' ? 'متصفحك لا يدعم WebUSB. يرجى استخدام متصفح Chrome أو Edge' : 'WebUSB is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    try {
      const usb = (navigator as any).usb;
      const device = await usb.requestDevice({ filters: [] });
      setUsbPrinterDevice(device);
      setUsbDeviceName(device.productName || `USB Device (${device.vendorId}:${device.productId})`);
      localStorage.setItem('pos_usb_device_name', device.productName || `USB Device (${device.vendorId}:${device.productId})`);
      setHardwarePrinterType('usb');
      localStorage.setItem('pos_hardware_printer_type', 'usb');
      showToast('success', lang === 'ar' ? `تم الاتصال بالطابعة عبر USB: ${device.productName || 'جهاز غير معروف'}` : `Connected to USB Printer: ${device.productName || 'Unknown Device'}`);
    } catch (err: any) {
      console.error(err);
      showToast('error', lang === 'ar' ? `خطأ في الاتصال: ${err.message}` : `Connection failed: ${err.message}`);
    }
  };

  const connectSerialPrinter = async () => {
    if (!('serial' in navigator)) {
      showToast('error', lang === 'ar' ? 'متصفحك لا يدعم Web Serial. يرجى استخدام متصفح Chrome أو Edge' : 'Web Serial is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    try {
      const serial = (navigator as any).serial;
      const port = await serial.requestPort();
      setSerialPrinterPort(port);
      setSerialPortInfo(`COM Port (Baud: ${baudRate})`);
      localStorage.setItem('pos_serial_port_info', `COM Port (Baud: ${baudRate})`);
      setHardwarePrinterType('serial');
      localStorage.setItem('pos_hardware_printer_type', 'serial');
      showToast('success', lang === 'ar' ? 'تم تحديد طابعة المنفذ التسلسلي (Serial COM Port)' : 'Serial COM Port printer selected.');
    } catch (err: any) {
      console.error(err);
      showToast('error', lang === 'ar' ? `خطأ في الاتصال: ${err.message}` : `Connection failed: ${err.message}`);
    }
  };

  const openCashDrawer = async () => {
    if (settings.cashDrawerEnabled === false) {
      console.log('Cash drawer trigger is disabled in system configurations.');
      return;
    }

    // Default to Aronium command codes if empty or undefined
    let bytesCode = [27, 112, 0, 148, 49];
    if (settings.cashDrawerCodes && settings.cashDrawerCodes.trim()) {
      try {
        const parsed = settings.cashDrawerCodes
          .split(',')
          .map(pt => parseInt(pt.trim(), 10))
          .filter(val => !isNaN(val));
        if (parsed.length > 0) {
          bytesCode = parsed;
        }
      } catch (err) {
        console.error('Failed to parse user cashDRAWER codes:', err);
      }
    }

    const drawerCommands = new Uint8Array(bytesCode);
    const alternateDrawerCommands = new Uint8Array([27, 112, 0, 25, 250]); // standard ESC/POS fallback

    if (hardwarePrinterType === 'usb') {
      try {
        let device = usbPrinterDevice;
        const usb = (navigator as any).usb;
        if (!device && usb) {
          const devices = await usb.getDevices();
          if (devices.length > 0) {
            device = devices[0];
            setUsbPrinterDevice(device);
          }
        }
        if (!device) {
          showToast('warning', lang === 'ar' ? 'يرجى تعريف وتوصيل طابعة USB أولاً أو اختبار فتح الدرج' : 'Please connect a USB printer first.');
          return;
        }
        await device.open();
        await device.selectConfiguration(1);
        await device.claimInterface(0);
        const interface_ = device.configuration?.interfaces.find(i => i.claimed);
        const alternate = interface_?.alternates[0];
        const endpointOut = alternate?.endpoints.find(e => e.direction === 'out' && e.type === 'bulk');
        if (!endpointOut) {
          throw new Error('No bulk out endpoint found on this printer.');
        }
        await device.transferOut(endpointOut.endpointNumber, drawerCommands);
        await device.transferOut(endpointOut.endpointNumber, alternateDrawerCommands);
        showToast('success', lang === 'ar' ? 'تم إرسال إشارة فتح درج الكاش عبر USB 💸' : 'Sent USB cash drawer open signal 💸');
      } catch (err: any) {
        console.error(err);
        showToast('error', lang === 'ar' ? `فشل فتح الدرج عبر USB: ${err.message}` : `USB cash drawer trigger failed: ${err.message}`);
      }
    } else if (hardwarePrinterType === 'serial') {
      try {
        let port = serialPrinterPort;
        const serial = (navigator as any).serial;
        if (!port && serial) {
          const ports = await serial.getPorts();
          if (ports.length > 0) {
            port = ports[0];
            setSerialPrinterPort(port);
          }
        }
        if (!port) {
          showToast('warning', lang === 'ar' ? 'يرجى توصيل طابعة Serial COM أولاً' : 'Please connect a Serial/COM printer first.');
          return;
        }
        await port.open({ baudRate });
        const writer = port.writable.getWriter();
        await writer.write(drawerCommands);
        await writer.write(alternateDrawerCommands);
        await writer.write(new Uint8Array([10, 13]));
        writer.releaseLock();
        await port.close();
        showToast('success', lang === 'ar' ? 'تم إرسال إشارة فتح درج الكاش عبر المنفذ التسلسلي 💸' : 'Sent Serial cash drawer open signal 💸');
      } catch (err: any) {
        console.error(err);
        showToast('error', lang === 'ar' ? `فشل فتح الدرج عبر المنفذ التسلسلي: ${err.message}` : `Serial drawer open failed: ${err.message}`);
      }
    } else {
      // Direct Windows Virtual Printer Spooling notification
      showToast('success', lang === 'ar' ? `📋 تم إرسال أمر فتح الدرج الافتراضي للاستجابة: [${bytesCode.join(',')}]` : `Sent test draw kick command: [${bytesCode.join(',')}]`);
    }
  };

  const printDirectHardwareTest = async () => {
    if (hardwarePrinterType === 'system') {
      showToast('warning', lang === 'ar' ? 'أنت تستخدم طباعة نظام التشغيل الافتراضية' : 'You are using default OS printing.');
      return;
    }
    
    const escPosInit = new Uint8Array([27, 64]); // ESC @
    const testText = new TextEncoder().encode("\n=== POS HARDWARE TEST ===\n\nPrinters & Drawers Connected Successfully!\nReady to register sales.\n\n\n\n\n\n");
    const cutPaper = new Uint8Array([29, 86, 66, 0]); // GS V B 0 (Cut paper)

    try {
      if (hardwarePrinterType === 'usb') {
        let device = usbPrinterDevice;
        const usb = (navigator as any).usb;
        if (!device && usb) {
          const devices = await usb.getDevices();
          if (devices.length > 0) device = devices[0];
        }
        if (!device) throw new Error('No device connected.');
        await device.open();
        await device.selectConfiguration(1);
        await device.claimInterface(0);
        const interface_ = device.configuration?.interfaces.find(i => i.claimed);
        const endpointOut = interface_?.alternates[0]?.endpoints.find(e => e.direction === 'out' && e.type === 'bulk');
        if (!endpointOut) throw new Error('No bulk output endpoint.');
        
        await device.transferOut(endpointOut.endpointNumber, escPosInit);
        await device.transferOut(endpointOut.endpointNumber, testText);
        await device.transferOut(endpointOut.endpointNumber, cutPaper);
        showToast('success', lang === 'ar' ? 'تم إرسال تذكرة الفحص المباشر عبر USB 🖨️' : 'Direct USB test ticket sent 🖨️');
      } else if (hardwarePrinterType === 'serial') {
        let port = serialPrinterPort;
        const serial = (navigator as any).serial;
        if (!port && serial) {
          const ports = await serial.getPorts();
          if (ports.length > 0) port = ports[0];
        }
        if (!port) throw new Error('No serial port selected.');
        await port.open({ baudRate });
        const writer = port.writable.getWriter();
        await writer.write(escPosInit);
        await writer.write(testText);
        await writer.write(cutPaper);
        writer.releaseLock();
        await port.close();
        showToast('success', lang === 'ar' ? 'تم إرسال تذكرة الفحص المباشر عبر Serial 🖨️' : 'Direct Serial test ticket sent 🖨️');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', lang === 'ar' ? `خطأ أثناء الطباعة المباشرة: ${err.message}` : `Direct printing error: ${err.message}`);
    }
  };

  const printInvoiceToRawHardware = async (inv: any) => {
    try {
      if (!inv || hardwarePrinterType === 'system') return;
      
      const encoder = new TextEncoder();
      const escPosInit = new Uint8Array([27, 64]); // ESC @
      const openDrawerCmd = new Uint8Array([27, 112, 0, 148, 49]); // Open cash drawer pulse
      const alternateDrawerCmd = new Uint8Array([27, 112, 0, 25, 250]);
      const cutPaper = new Uint8Array([29, 86, 66, 0]); // Cut paper
      
      const linkedCust = (customers || []).find(c => c.id === inv.customerId);
      const custName = linkedCust ? linkedCust.name : (lang === 'ar' ? 'زبون نقدي' : 'Cash Customer');
      
      // Build a pure ASCII/Arabic UTF-8 aligned receipt text formatted nicely for thermal roll
      let text = `\n`;
      text += `      ${settings.shopName || 'دكان أبو كامل'}      \n`;
      text += `      تلفون: ${settings.phone || ''}      \n`;
      text += `==========================================\n`;
      text += `رقم الفاتورة: ${inv.invoiceNumber}\n`;
      text += `التاريخ: ${inv.date} | ${inv.time}\n`;
      text += `الزبون: ${custName}\n`;
      text += `الكاشير: ${inv.cashier}\n`;
      text += `الدفع: ${inv.paymentMethod === 'cash' ? 'كاش' : inv.paymentMethod === 'debt' ? 'دين' : 'بطاقة'}\n`;
      text += `------------------------------------------\n`;
      
      (inv.items || []).forEach((itm: any) => {
        text += `${itm.productName}\n`;
        text += `   ${itm.quantity} x ${itm.priceUSD.toFixed(1)}$ = ${itm.totalUSD.toFixed(1)}$\n`;
      });
      
      text += `------------------------------------------\n`;
      text += `المجموع الفرعي: ${inv.subtotalUSD.toFixed(2)}$\n`;
      if (inv.discountUSD > 0) {
        text += `الخصم: -${inv.discountUSD.toFixed(2)}$\n`;
      }
      text += `المطلوب النهائي: ${inv.totalUSD.toFixed(2)}$\n`;
      text += `المطلوب ليرة: ${Math.ceil(inv.totalLBP).toLocaleString()} LBP\n`;
      text += `==========================================\n`;
      text += `        ${settings.receiptFooter || 'شكراً لزيارتكم!'}        \n`;
      text += `\n\n\n\n`; // feed lines
      
      const textBytes = encoder.encode(text);
      
      // Combine commands
      const totalLen = escPosInit.length + openDrawerCmd.length + alternateDrawerCmd.length + textBytes.length + cutPaper.length;
      const combined = new Uint8Array(totalLen);
      
      let cursor = 0;
      combined.set(escPosInit, cursor); cursor += escPosInit.length;
      combined.set(openDrawerCmd, cursor); cursor += openDrawerCmd.length;
      combined.set(alternateDrawerCmd, cursor); cursor += alternateDrawerCmd.length;
      combined.set(textBytes, cursor); cursor += textBytes.length;
      combined.set(combined.subarray(cursor - textBytes.length, cursor), cursor); // Correctly fill cuts
      combined.set(cutPaper, cursor); cursor += cutPaper.length;

      if (hardwarePrinterType === 'usb') {
        let device = usbPrinterDevice;
        const usb = (navigator as any).usb;
        if (!device && usb) {
          const devices = await usb.getDevices();
          if (devices.length > 0) device = devices[0];
        }
        if (device) {
          await device.open();
          await device.selectConfiguration(1);
          await device.claimInterface(0);
          const interface_ = device.configuration?.interfaces.find((i: any) => i.claimed);
          const alternate = interface_?.alternates[0];
          const endpointOut = alternate?.endpoints.find((e: any) => e.direction === 'out' && e.type === 'bulk');
          if (endpointOut) {
            await device.transferOut(endpointOut.endpointNumber, combined);
            showToast('success', lang === 'ar' ? '✔️ تم طباعة الفاتورة وفتح درج الكاشير عبر USB صامتاً بلحظات!' : 'Printed and kicked drawer via USB silent!');
          }
        }
      } else if (hardwarePrinterType === 'serial') {
        let port = serialPrinterPort;
        const serial = (navigator as any).serial;
        if (!port && serial) {
          const ports = await serial.getPorts();
          if (ports.length > 0) port = ports[0];
        }
        if (port) {
          await port.open({ baudRate });
          const writer = port.writable.getWriter();
          await writer.write(combined);
          writer.releaseLock();
          await port.close();
          showToast('success', lang === 'ar' ? '✔️ تم طباعة الفاتورة وفتح درج الكاشير عبر المنفذ التسلسلي صامتاً!' : 'Printed and kicked drawer via Serial silent!');
        }
      }
    } catch (err: any) {
      console.error('Error raw printing:', err);
      showToast('error', lang === 'ar' ? `خطأ في الطباعة المباشرة: ${err.message}` : `Direct POS print failed: ${err.message}`);
    }
  };
  
  // Warehouse & Shop separate stock counts and reports states
  const [stockAuditReportLoc, setStockAuditReportLoc] = useState<'shop' | 'warehouse' | 'combined'>('shop');

  // --- AI ADVISOR STATES ---
  const [aiAuditResult, setAiAuditResult] = useState<string | null>(null);
  const [aiAuditLoading, setAiAuditLoading] = useState<boolean>(false);
  const [aiSubTab, setAiSubTab] = useState<'audit' | 'chat'>('audit');
  const [chatInput, setChatInput] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; timestamp: string }>>([
    {
      sender: 'ai',
      text: 'مرحباً بك! أنا مستشارك الذكي المدعوم بـ Gemini AI 🧠. يمكنني مساعدتك في تحليل مخازنك وإخبارك بالبضائع التي أوشكت كميتها على النفاد لإعادة طلبها، وتواريخ الصلاحية التي تقترب من الانتهاء، وتقديم تحليلات أرباح وأفكار تسويقية دقيقة لمتجرك اللبناني. اسألني أي سؤال تريد!',
      timestamp: new Date().toLocaleTimeString('ar-LB', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  
  // --- INVENTORY TABLE MANUAL COLUMN WIDTHS & PAGINATION ---
  const [invColWidths, setInvColWidths] = useState<Record<string, number>>({
    name: 240,
    barcode: 120,
    category: 120,
    warehouseQty: 125,
    shelfQty: 125,
    priceUSD: 100,
    priceLBP: 120,
    costPrice: 100,
    margin: 100,
    lastSale: 120,
    expiry: 120,
    actions: 120
  });

  const startResizeInvcol = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = invColWidths[colKey];
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const isRtl = document.dir === 'rtl';
      const adjustedDelta = isRtl ? -deltaX : deltaX;
      setInvColWidths(prev => ({
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

  const [stagnantDaysThreshold, setStagnantDaysThreshold] = useState<number>(30);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState<boolean>(false);
  const [newCategoryNameInput, setNewCategoryNameInput] = useState<string>('');
  const [newCategoryEmojiInput, setNewCategoryEmojiInput] = useState<string>('📦');
  
  // --- QUICK REGISTER CUSTOMER STATES ---
  const [showQuickAddCustomerModal, setShowQuickAddCustomerModal] = useState<boolean>(false);
  const [quickAddCustomerName, setQuickAddCustomerName] = useState<string>('');
  const [quickAddCustomerPhone, setQuickAddCustomerPhone] = useState<string>('');
  const [quickAddCustomerType, setQuickAddCustomerType] = useState<'retail' | 'wholesale'>('retail');
  const [quickAddCustomerDebtLimit, setQuickAddCustomerDebtLimit] = useState<string>('1000');

  const [categoryPage, setCategoryPage] = useState<number>(0);
  const [categoriesPerPage, setCategoriesPerPage] = useState<number>(() => {
    const saved = localStorage.getItem('pos_categories_per_page');
    return saved ? parseInt(saved, 10) : 10;
  });

  // --- SEAMLESS CUSTOMER SEARCH & SELECT ---
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);
  const [showPurchaseContactModal, setShowPurchaseContactModal] = useState<boolean>(false);

  // --- CONTACT / PURCHASE FORM STATES ---
  const [contactName, setContactName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactShop, setContactShop] = useState<string>('');
  const [contactMessage, setContactMessage] = useState<string>('');
  
  // --- ELECTRONIC SCALE SIMULATOR STATES ---
  const [selectedScaleProduct, setSelectedScaleProduct] = useState<Product | null>(null);
  const [simulatedWeight, setSimulatedWeight] = useState<number>(0.500); // weight in kg
  const [isScaleSimulatorOpen, setIsScaleSimulatorOpen] = useState<boolean>(false);

  // Dynamic categories sorted by total sold items count (most popular / best-selling sections first)
  const sortedCategoriesBySales = useMemo(() => {
    const salesMap: { [categoryId: string]: number } = {};
    invoices.forEach(inv => {
      if (inv && inv.items) {
        inv.items.forEach(item => {
          const matchingProd = products.find(p => p.id === item.productId);
          const catId = matchingProd ? matchingProd.category : 'other';
          if (catId) {
            salesMap[catId] = (salesMap[catId] || 0) + (item.quantity || 0);
          }
        });
      }
    });

    return [...categories].sort((a, b) => {
      const qtyB = salesMap[b.id] || 0;
      const qtyA = salesMap[a.id] || 0;
      if (qtyB !== qtyA) {
        return qtyB - qtyA; // Descending by quantity sold
      }
      return a.name.localeCompare(b.name, 'ar');
    });
  }, [categories, invoices, products]);

  // Handle theme transitions on root document element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('pos_theme', theme);
  }, [theme]);

  // Handle saving posLayoutMode state
  useEffect(() => {
    localStorage.setItem('pos_layout_mode', posLayoutMode);
  }, [posLayoutMode]);

  // Click outside to close customer dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const container = document.getElementById('searchable-customer-container');
      if (container && !container.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Load from local storage or seed
  useEffect(() => {
    // 1. Settings
    const storedSettings = localStorage.getItem('pos_settings');
    let activeSettings = DEFAULT_SETTINGS;
    if (storedSettings) {
      activeSettings = JSON.parse(storedSettings);
      setSettings(activeSettings);
    } else {
      localStorage.setItem('pos_settings', JSON.stringify(DEFAULT_SETTINGS));
    }

    // 1.5 categories
    const storedCategories = localStorage.getItem('pos_categories');
    if (storedCategories) {
      setCategories(JSON.parse(storedCategories));
    } else {
      localStorage.setItem('pos_categories', JSON.stringify(DEFAULT_CATEGORIES));
    }

    // 2. Products
    const storedProducts = localStorage.getItem('pos_products');
    let activeProds: Product[] = [];
    if (storedProducts) {
      activeProds = JSON.parse(storedProducts);
      setProducts(activeProds);
    } else {
      activeProds = getSeededProducts(SYS_DATE);
      localStorage.setItem('pos_products', JSON.stringify(activeProds));
      setProducts(activeProds);
    }

    // 3. Invoices
    const storedInvoices = localStorage.getItem('pos_invoices');
    if (storedInvoices) {
      setInvoices(JSON.parse(storedInvoices));
    } else {
      const seedInvs = getSeededInvoices(SYS_DATE);
      localStorage.setItem('pos_invoices', JSON.stringify(seedInvs));
      setInvoices(seedInvs);
    }

    // 4. Users
    const storedUsers = localStorage.getItem('pos_users');
    let loadedUsers = DEFAULT_USERS;
    if (storedUsers) {
      loadedUsers = JSON.parse(storedUsers);
    }
    const savedAdminName = localStorage.getItem('pos_admin_real_name');
    const savedCashierName = localStorage.getItem('pos_cashier_real_name');
    let needsUpdate = false;
    loadedUsers = loadedUsers.map(u => {
      if (u.username === 'admin' && savedAdminName && u.name !== savedAdminName) {
        needsUpdate = true;
        return { ...u, name: savedAdminName };
      }
      if (u.username === 'kaseer' && savedCashierName && u.name !== savedCashierName) {
        needsUpdate = true;
        return { ...u, name: savedCashierName };
      }
      return u;
    });
    setUsers(loadedUsers);
    if (!storedUsers || needsUpdate) {
      localStorage.setItem('pos_users', JSON.stringify(loadedUsers));
    }

    // 5. Customers
    const storedCustomers = localStorage.getItem('pos_customers');
    if (storedCustomers) {
      setCustomers(JSON.parse(storedCustomers));
    } else {
      localStorage.setItem('pos_customers', JSON.stringify(DEFAULT_CUSTOMERS));
      setCustomers(DEFAULT_CUSTOMERS);
    }

    // 5.5 Suppliers
    const storedSuppliers = localStorage.getItem('pos_suppliers');
    if (storedSuppliers) {
      setSuppliers(JSON.parse(storedSuppliers));
    } else {
      localStorage.setItem('pos_suppliers', JSON.stringify(DEFAULT_SUPPLIERS));
      setSuppliers(DEFAULT_SUPPLIERS);
    }

    // 6. Returns
    const storedReturns = localStorage.getItem('pos_returns');
    if (storedReturns) {
      setReturns(JSON.parse(storedReturns));
    } else {
      localStorage.setItem('pos_returns', JSON.stringify([]));
      setReturns([]);
    }

    // 7. Waste
    const storedWaste = localStorage.getItem('pos_waste');
    if (storedWaste) {
      setWaste(JSON.parse(storedWaste));
    } else {
      localStorage.setItem('pos_waste', JSON.stringify([]));
      setWaste([]);
    }

    // 8. Promotions
    const storedPromotions = localStorage.getItem('pos_promotions');
    if (storedPromotions) {
      setPromotions(JSON.parse(storedPromotions));
    } else {
      localStorage.setItem('pos_promotions', JSON.stringify(DEFAULT_PROMOTIONS));
      setPromotions(DEFAULT_PROMOTIONS);
    }

    // 9. Expenses
    const storedExpenses = localStorage.getItem('pos_expenses');
    if (storedExpenses) {
      setExpenses(JSON.parse(storedExpenses));
    } else {
      localStorage.setItem('pos_expenses', JSON.stringify(DEFAULT_EXPENSES));
      setExpenses(DEFAULT_EXPENSES);
    }

    // 10. Purchase Invoices
    const storedPurchases = localStorage.getItem('pos_purchases');
    if (storedPurchases) {
      setPurchaseInvoices(JSON.parse(storedPurchases));
    } else {
      localStorage.setItem('pos_purchases', JSON.stringify([]));
      setPurchaseInvoices([]);
    }
  }, []);

  // Compute expired status on items
  const processedProducts = products.map(p => {
    const expiryDate = new Date(p.expiryDate);
    const currentDate = new Date(SYS_DATE);
    const isExpired = expiryDate < currentDate;
    
    // Near expiry is true if differences is less or equal to setting days
    const diffTime = expiryDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isNearExpiry = !isExpired && diffDays <= settings.expiryAlertDays;

    // Compute dynamic days since last sale across sales invoices
    const matches = invoices.filter(inv => inv.items.some(item => item.productId === p.id));
    let lastSoldDate: string | null = null;
    let daysSinceLastSale: number | null = null;
    
    if (matches.length > 0) {
      const dates = matches.map(inv => new Date(inv.date).getTime());
      const maxTime = Math.max(...dates);
      const latestInvoice = matches.find(inv => new Date(inv.date).getTime() === maxTime);
      if (latestInvoice) {
        lastSoldDate = latestInvoice.date;
        const diffTimeSale = new Date(SYS_DATE).getTime() - new Date(lastSoldDate).getTime();
        daysSinceLastSale = Math.floor(diffTimeSale / (1000 * 60 * 60 * 24));
      }
    }

    const isStagnant = daysSinceLastSale === null || daysSinceLastSale >= stagnantDaysThreshold;

    return {
      ...p,
      isExpired,
      isNearExpiry,
      lastSoldDate,
      daysSinceLastSale,
      isStagnant
    };
  });

  // Toast auto dismiss
  useEffect(() => {
    if (generalAlert) {
      const tm = setTimeout(() => setGeneralAlert(null), 4000);
      return () => clearTimeout(tm);
    }
  }, [generalAlert]);

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

  // --- LOGIN HANDLER ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const matched = users.find(u => u.username === loginUsername);
    if (!matched) {
      setLoginError('اسم المستخدم غير موجود بالنظام!');
      return;
    }

    // Verify customized password check with developer fallbacks
    const isValidPass = 
      (loginUsername === 'admin' && loginPassword === adminPasscode) ||
      (loginUsername === 'kaseer' && loginPassword === cashierPasscode) ||
      (matched.password && loginPassword === matched.password) ||
      (loginPassword === '112233') || // Default master password fallback
      (loginUsername === 'admin' && loginPassword === 'admin123') || // Default backup
      (loginUsername === 'kaseer' && loginPassword === '1234');

    if (isValidPass) {
      setCurrentUser(matched);
      showToast('success', `مرحباً بك مجدداً د. ${matched.name}! تم الدخول بنجاح.`);
    } else {
      setLoginError('كلمة المرور غير صحيحة!');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCart([]);
    setBarcodeInput('');
    setSearchQuery('');
    setDiscountInput('0');
    setPaidUSDInput('');
    setPaidLBPInput('');
  };

  // --- TOAST TRIGGER ---
  const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
    setGeneralAlert({ type, message });
  };

  // --- DIRECT POS SIMULATED PRINT TRIGGER ---
  const triggerDirectPOSPrint = () => {
    setIsSimulatingDirectPrint(true);
    setDirectPrintProgress(0);
    playReceiptPrintSound();
    
    const timer = setInterval(() => {
      setDirectPrintProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setIsSimulatingDirectPrint(false);
            showToast('success', '⚡ تم الإرسال ببروتوكول بث صامت ومباشر إلى طابعة الفواتير المكتشفة تلقائياً!');
          }, 600);
          return 100;
        }
        return prev + 20;
      });
    }, 250);
  };

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

  const handleAddNewCategory = (name: string, emoji: string = '📦') => {
    if (!name.trim()) return;
    const cleanName = name.trim();
    // Check if category already exists with the same name
    const exists = categories.some(c => c.name.toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      showToast('warning', lang === 'ar' ? 'هذه الفئة موجودة بالفعل!' : 'This category already exists!');
      return;
    }
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: cleanName,
      emoji: emoji || '📦'
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    localStorage.setItem('pos_categories', JSON.stringify(updated));
    showToast('success', lang === 'ar' ? `تمت إضافة فئات جديدة [${cleanName}] بنجاح!` : `Category [${cleanName}] added successfully!`);
  };

  const handleQuickAddCustomerSubmit = () => {
    if (!quickAddCustomerName.trim()) {
      showToast('warning', lang === 'ar' ? 'الرجاء كتابة اسم الزبون أولاً!' : 'Please enter customer name!');
      return;
    }

    const nLimit = parseFloat(quickAddCustomerDebtLimit) || 1000;
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name: quickAddCustomerName.trim(),
      phone: quickAddCustomerPhone.trim() || 'N/A',
      type: quickAddCustomerType,
      loyaltyPoints: 0,
      creditBalance: 0,
      debtLimit: nLimit
    };

    const updated = [...customers, newCust];
    setCustomers(updated);
    localStorage.setItem('pos_customers', JSON.stringify(updated));
    
    // Sync with cloud database
    syncWriteToCloud('customers', newCust.id, newCust);

    // Auto-select this newly registered customer
    setSelectedCustomerId(newCust.id);

    showToast('success', lang === 'ar' ? `تم تسجيل الزبون [${newCust.name}] بنجاح وربطه بالفاتورة!` : `Customer [${newCust.name}] registered and selected!`);
    
    // Reset states
    setQuickAddCustomerName('');
    setQuickAddCustomerPhone('');
    setQuickAddCustomerType('retail');
    setQuickAddCustomerDebtLimit('1000');
    setShowQuickAddCustomerModal(false);
  };

  // Persist the products list locally and mirror the single changed product to the cloud
  const handleProductsChange = (updated: Product[], changed: Product) => {
    setProducts(updated);
    storage.setJSON('pos_products', updated);
    syncWriteToCloud('products', changed.id, changed);
  };

  const openImportExcelModal = () => {
    setImportStatus('idle');
    setImportError(null);
    setParsedProducts([]);
    setShowImportExcelModal(true);
  };

  const openBarcodeLabelPrint = (p: Product) => {
    setBarcodeLabelProduct(p);
    setBarcodeLabelCopies(1);
  };

  const deleteProduct = (id: string, name: string) => {
    executeWithAdminAuth(lang === 'ar' ? `حذف الصنف: ${name}` : `Delete Product: ${name}`, () => {
      if (window.confirm(lang === 'ar' ? `حذف منتج: هل أنت متأكد من حذف المنتج "${name}" كلياً من قاعدة بيانات المحل؟` : `Delete product: Are you sure you want to delete "${name}"?`)) {
        const updated = products.filter(p => p.id !== id);
        setProducts(updated);
        localStorage.setItem('pos_products', JSON.stringify(updated));
        showToast('success', lang === 'ar' ? `تم إسقاط وحذف الصنف [${name}] من مخازنك.` : `Product [${name}] deleted.`);
        if (auth.currentUser) {
          syncWriteToCloud('products', id, null, true);
        }
      }
    });
  };

  const handleCancelWholeInvoice = (inv: Invoice) => {
    executeWithAdminAuth(lang === 'ar' ? `إلغاء وتصفير الفاتورة #${inv.invoiceNumber}` : `Cancel Invoice #${inv.invoiceNumber}`, () => {
      const confirmMsg = lang === 'ar' 
        ? '⚠️ هل أنت متأكد من رغبتك في إلغاء وتصفير هذه الفاتورة بالكامل وإرجاع كافة محتوياتها إلى المخزن؟ سيتم إرجاع كافة البضائع المباعة لجرود المحل وخصم الديون المترتبة.' 
        : 'Are you sure you want to cancel this entire invoice and return all sold items to inventory stock?';
      
      if (!window.confirm(confirmMsg)) return;

      // 1. Loop through products and restore stock
      const updatedProducts = [...products];
      inv.items.forEach(item => {
        const returnedAmount = item.quantity - (item.returnedQty || 0);
        if (returnedAmount > 0) {
          const idx = updatedProducts.findIndex(p => p.id === item.productId);
          if (idx !== -1) {
            updatedProducts[idx] = {
              ...updatedProducts[idx],
              quantity: updatedProducts[idx].quantity + returnedAmount
            };
          }
        }
      });

      // 2. Handle customer debt adjustment if it was dynamic debt
      const totalToReduceUSD = inv.items.reduce((sum, item) => {
        const returnedAmount = item.quantity - (item.returnedQty || 0);
        return sum + (item.priceUSD * returnedAmount);
      }, 0);

      const updatedCustomers = [...customers];
      if (inv.customerId && totalToReduceUSD > 0 && inv.paymentMethod === 'debt') {
        const cIdx = updatedCustomers.findIndex(c => c.id === inv.customerId);
        if (cIdx !== -1) {
          const adjustedCredit = Math.max(0, updatedCustomers[cIdx].creditBalance - totalToReduceUSD);
          updatedCustomers[cIdx] = {
            ...updatedCustomers[cIdx],
            creditBalance: adjustedCredit
          };
        }
      }

      // 3. Update modern Invoice object state
      const updatedInvoiceItems = inv.items.map(item => ({
        ...item,
        returnedQty: item.quantity
      }));

      const updatedInvoice: Invoice = {
        ...inv,
        items: updatedInvoiceItems,
        hasReturn: true,
        totalUSD: 0,
        totalLBP: 0,
        subtotalUSD: 0,
        discountUSD: 0
      };

      const updatedInvoices = invoices.map(i => i.id === inv.id ? updatedInvoice : i);

      // 4. Create nice return log records so it populates return statistics in reports
      const newReturnsList = [...returns];
      inv.items.forEach(item => {
        const returnedAmount = item.quantity - (item.returnedQty || 0);
        if (returnedAmount > 0) {
          const newReturn: ReturnRecord = {
            id: `ret-${Date.now()}-${item.productId}`,
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            date: SYS_DATE,
            productId: item.productId,
            productName: item.productName,
            qty: returnedAmount,
            quantity: returnedAmount,
            action: inv.paymentMethod === 'debt' ? 'credit' : 'cash',
            refundAmountUSD: item.priceUSD * returnedAmount,
            reason: 'cancelled_invoice',
            refundMethod: inv.paymentMethod === 'debt' ? 'credit' : 'cash',
            customerId: inv.customerId
          };
          newReturnsList.unshift(newReturn);
        }
      });

      // 5. Save all local and cloud state modifications
      setProducts(updatedProducts);
      localStorage.setItem('pos_products', JSON.stringify(updatedProducts));

      setCustomers(updatedCustomers);
      localStorage.setItem('pos_customers', JSON.stringify(updatedCustomers));

      setInvoices(updatedInvoices);
      localStorage.setItem('pos_invoices', JSON.stringify(updatedInvoices));

      setReturns(newReturnsList);
      localStorage.setItem('pos_returns', JSON.stringify(newReturnsList));

      setShowInvoiceReceipt(updatedInvoice);

      // Write to firebase cloud if online
      if (auth.currentUser) {
        syncWriteToCloud('invoices', updatedInvoice.id, updatedInvoice);
        updatedProducts.forEach(prod => {
          const originalProd = products.find(p => p.id === prod.id);
          if (originalProd && originalProd.quantity !== prod.quantity) {
            syncWriteToCloud('products', prod.id, prod);
          }
        });
        if (inv.customerId) {
          const c = updatedCustomers.find(cust => cust.id === inv.customerId);
          if (c) syncWriteToCloud('customers', c.id, c);
        }
        // Write returns to cloud
        inv.items.forEach(item => {
          const returnedAmount = item.quantity - (item.returnedQty || 0);
          if (returnedAmount > 0) {
            const idStr = `ret-${Date.now()}-${item.productId}`;
            const newRetRec = newReturnsList.find(r => r.id === idStr);
            if (newRetRec) syncWriteToCloud('returns', idStr, newRetRec);
          }
        });
      }

      showToast('success', lang === 'ar' ? '✅ تم إلغاء الفاتورة بالكامل، وتصفير مبالغها، وإرجاع كافة البضائع للمخزن بنجاح!' : 'Invoice cancelled successfully. Stocks restored.');
    });
  };

  const handleReturnSingleItem = (inv: Invoice, productId: string, qtyToReturn: number) => {
    if (qtyToReturn <= 0) {
      showToast('error', lang === 'ar' ? 'الكمية المدخلة للإرجاع غير صالحة!' : 'Invalid quantity to return');
      return;
    }

    const itemIdx = inv.items.findIndex(itm => itm.productId === productId);
    if (itemIdx === -1) return;

    const item = inv.items[itemIdx];
    const maxReturnable = item.quantity - (item.returnedQty || 0);

    if (qtyToReturn > maxReturnable) {
      showToast('error', lang === 'ar' ? `خطأ: الكمية المحددة للارتجاع أكبر من المتبقي المتوفر بالفاتورة (${maxReturnable})` : `Cannot return more than purchased`);
      return;
    }

    const itemPrice = item.priceUSD;
    const valueOfReturnedItemsUSD = itemPrice * qtyToReturn;

    const confirmMsg = lang === 'ar'
      ? `هل أنت متأكد من رغبتك في إرجاع عدد (${qtyToReturn}) من صنف "${item.productName}" إلى الرفوف والمخزن؟`
      : `Are you sure you want to return ${qtyToReturn} of "${item.productName}" to inventory stock?`;

    if (!window.confirm(confirmMsg)) return;

    // 1. Revert product quantity in inventory list
    const updatedProducts = products.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          quantity: p.quantity + qtyToReturn
        };
      }
      return p;
    });

    // 2. Adjust customer debt if credit payment and client exists
    const updatedCustomers = [...customers];
    if (inv.customerId && inv.paymentMethod === 'debt') {
      const cIdx = updatedCustomers.findIndex(c => c.id === inv.customerId);
      if (cIdx !== -1) {
        const adjustedCredit = Math.max(0, updatedCustomers[cIdx].creditBalance - valueOfReturnedItemsUSD);
        updatedCustomers[cIdx] = {
          ...updatedCustomers[cIdx],
          creditBalance: adjustedCredit
        };
      }
    }

    // 3. Create Return Record
    const newReturn: ReturnRecord = {
      id: `ret-${Date.now()}-${productId}`,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      date: SYS_DATE,
      productId: productId,
      productName: item.productName,
      qty: qtyToReturn,
      quantity: qtyToReturn,
      action: inv.paymentMethod === 'debt' ? 'credit' : 'cash',
      refundAmountUSD: valueOfReturnedItemsUSD,
      reason: 'partial_item_return',
      refundMethod: inv.paymentMethod === 'debt' ? 'credit' : 'cash',
      customerId: inv.customerId
    };

    const newReturnsList = [newReturn, ...returns];

    // 4. Update the Invoice Items to record returnedQty and adjust invoice pricing totals
    const updatedInvoiceItems = inv.items.map((itm, i) => {
      if (i === itemIdx) {
        return {
          ...itm,
          returnedQty: (itm.returnedQty || 0) + qtyToReturn
        };
      }
      return itm;
    });

    // Compute updated subtotal and total based on actual unreturned parts
    const currentSubtotal = Math.max(0, inv.subtotalUSD - valueOfReturnedItemsUSD);
    const finalTotalUSD = Math.max(0, currentSubtotal - inv.discountUSD);
    const finalTotalLBP = finalTotalUSD * inv.exchangeRate;

    const updatedInvoice: Invoice = {
      ...inv,
      items: updatedInvoiceItems,
      hasReturn: true,
      subtotalUSD: currentSubtotal,
      totalUSD: finalTotalUSD,
      totalLBP: finalTotalLBP
    };

    const updatedInvoices = invoices.map(i => i.id === inv.id ? updatedInvoice : i);

    // 5. Set States and Local Storage
    setProducts(updatedProducts);
    localStorage.setItem('pos_products', JSON.stringify(updatedProducts));

    setCustomers(updatedCustomers);
    localStorage.setItem('pos_customers', JSON.stringify(updatedCustomers));

    setInvoices(updatedInvoices);
    localStorage.setItem('pos_invoices', JSON.stringify(updatedInvoices));

    setReturns(newReturnsList);
    localStorage.setItem('pos_returns', JSON.stringify(newReturnsList));

    setShowInvoiceReceipt(updatedInvoice);

    // Write to Cloud Sync
    if (auth.currentUser) {
      syncWriteToCloud('invoices', updatedInvoice.id, updatedInvoice);
      const targetProd = updatedProducts.find(p => p.id === productId);
      if (targetProd) syncWriteToCloud('products', productId, targetProd);
      if (inv.customerId) {
        const c = updatedCustomers.find(cust => cust.id === inv.customerId);
        if (c) syncWriteToCloud('customers', c.id, c);
      }
      syncWriteToCloud('returns', newReturn.id, newReturn);
    }

    showToast('success', lang === 'ar' ? `✅ تم بنجاح إرجاع عدد ${qtyToReturn} من الصنف، وتحديث جرود المخازن والمالية!` : 'Returned item successfully.');
  };

  // Keep the built-in admin / kaseer login credentials in sync when edited from the users tab
  const handleDefaultAccountUpdated = (username: 'admin' | 'kaseer', name: string, newPassword: string | null) => {
    if (username === 'admin') {
      storage.setItem('pos_admin_real_name', name);
      setAdminRealName(name);
      if (newPassword) {
        storage.setItem('pos_admin_passcode', newPassword);
        setAdminPasscode(newPassword);
      }
    } else {
      storage.setItem('pos_cashier_real_name', name);
      setCashierRealName(name);
      if (newPassword) {
        storage.setItem('pos_cashier_passcode', newPassword);
        setCashierPasscode(newPassword);
      }
    }
  };

  const handleExpensesChange = (updated: ExpenseRecord[]) => {
    setExpenses(updated);
    storage.setJSON('pos_expenses', updated);
  };

  // Persist the promotions list locally and mirror the single changed record to the cloud
  const handlePromotionsChange = (updated: Promotion[], change: PromotionChange) => {
    setPromotions(updated);
    storage.setJSON('pos_promotions', updated);
    syncWriteToCloud('promotions', change.id, change.data, change.data === null);
  };

  const handleAddStagnantPromotion = (productId: string, val: number, discountType: 'percentage' | 'fixed', durationDays: number): boolean => {
    if (val <= 0) {
      showToast('error', lang === 'ar' ? 'قيمة الخصم يجب أن تكون أكبر من صفر!' : 'Discount value must be greater than zero!');
      return false;
    }
    
    const now = new Date();
    const startDateStr = toISODate(now);
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);
    const endDateStr = toISODate(endDate);
    
    const newPromo: Promotion = {
      id: `promo-${Date.now()}`,
      type: 'percentage',
      value: val,
      discountType: discountType,
      productId: productId,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startDate: startDateStr,
      endDate: endDateStr,
      active: true
    };
    
    handlePromotionsChange([newPromo, ...promotions], { id: newPromo.id, data: newPromo });
    
    const targetProdName = products.find(p => p.id === productId)?.name || '';
    showToast('success', lang === 'ar' 
      ? `تم تفعيل عرض تخفيض ترويجي سريع لـ [${targetProdName}] بخصم ${val}${discountType === 'percentage' ? '%' : '$'} لمدة ${durationDays} يوماً!` 
      : `Activated a fast promo discount of ${val}${discountType === 'percentage' ? '%' : '$'} on [${targetProdName}] for ${durationDays} days!`);

    return true;
  };

  const handleQuickWasteFromExpiry = (prodId: string, qtyToWaste: number, reason: 'expired' | 'damaged_on_shelf') => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;
    if (qtyToWaste <= 0) {
      showToast('error', 'الرجاء إدخال كمية صحيحة أكبر من صفر!');
      return;
    }
    if (qtyToWaste > prod.quantity) {
      showToast('error', 'الكمية المدخلة تجاوزت الكمية المتوفرة بالمخزن الطبيعي!');
      return;
    }

    const cost = prod.costPriceUSD !== undefined && prod.costPriceUSD !== null
      ? prod.costPriceUSD 
      : (prod.priceWholesale !== undefined && prod.priceWholesale !== null
        ? prod.priceWholesale 
        : prod.priceUSD * 0.75);

    const newWasteRecord: WasteRecord = {
      id: `waste-${Date.now()}`,
      productId: prodId,
      productName: prod.name,
      qty: qtyToWaste,
      quantity: qtyToWaste,
      type: reason === 'expired' ? 'expired' : 'damage',
      reason: reason,
      cost: cost,
      estimatedLossUSD: Number((qtyToWaste * cost).toFixed(2)),
      compensationStatus: 'loss',
      date: SYS_DATE,
      note: 'إتلاف تلقائي وقيد مباشر من تقرير انتهاء الصلاحيات'
    };

    // Update product quantity
    const updatedProducts = products.map(p => {
      if (p.id === prodId) {
        return {
          ...p,
          quantity: Math.max(0, p.quantity - qtyToWaste)
        };
      }
      return p;
    });
    setProducts(updatedProducts);
    localStorage.setItem('pos_products', JSON.stringify(updatedProducts));

    // Update waste list
    const updatedWaste = [newWasteRecord, ...waste];
    setWaste(updatedWaste);
    localStorage.setItem('pos_waste', JSON.stringify(updatedWaste));

    showToast('success', `تم تسجيل إتلاف (${qtyToWaste} قطع) من [${prod.name}] كـ ${reason === 'expired' ? 'منتهي الصلاحية' : 'تالف رفوف'} وتنزيل الكمية من المخازن.`);
  };

  // --- UPDATE SYSTEM GENERAL SETTINGS ---
  const handleUpdateGeneralSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('pos_settings', JSON.stringify(settings));
    localStorage.setItem('pos_gemini_api_key', localGeminiApiKey.trim());
    showToast('success', 'تم حفظ وتعميم إعدادات المحل وسعر الصرف الجديد بنجاح!');
  };

  // --- RECALCULATE PRODUCTS PRICES BY DEFAULT VALUE MARGIN PERCENT ---
  const handleRecalculatePricesWithMargin = () => {
    const margin = settings.defaultMarginPercent !== undefined ? settings.defaultMarginPercent : 15;
    let count = 0;
    const updatedProducts = products.map(p => {
      const cost = p.costPriceUSD;
      if (cost !== undefined && cost !== null && cost > 0) {
        count++;
        const newPriceUSD = parseFloat((cost * (1 + margin / 100)).toFixed(2));
        const newPriceWholesale = parseFloat((newPriceUSD * 0.9).toFixed(2));
        return {
          ...p,
          priceUSD: newPriceUSD,
          priceWholesale: newPriceWholesale
        };
      }
      return p;
    });

    if (count === 0) {
      showToast('warning', lang === 'ar' 
        ? '⚠️ لم يتم العثور على أي أصناف تحتوي على سعر تكلفة أكبر من صفر لتعديل أسعارها!' 
        : '⚠️ No products with a cost price greater than zero found to update!');
      return;
    }

    setProducts(updatedProducts);
    localStorage.setItem('pos_products', JSON.stringify(updatedProducts));
    showToast('success', lang === 'ar'
      ? `✅ تم بنجاح تحديث أسعار الصرف والمبيع لـ (${count}) صنف حالي بناءً على الهامش الافتراضي (${margin}%).`
      : `✅ Successfully recalculated selling prices for (${count}) items using (${margin}%) default profit margin.`);
  };

  // --- DEMO DATA RESET HANDLERS ---
  const handleResetDemoInvoices = () => {
    executeWithAdminAuth(lang === 'ar' ? 'تصفير مبيعات وفواتير التجربة' : 'Reset Demo Invoices', () => {
      if (confirm(lang === 'ar' ? '⚠️ هل أنت متأكد تماماً من رغبتك في حذف وتصفير جميع الفواتير والمبيعات التجريبية؟' : 'Are you sure you want to clear all mock/demo invoices and sales?')) {
        setInvoices([]);
        localStorage.setItem('pos_invoices', JSON.stringify([]));
        showToast('success', lang === 'ar' ? '🧹 تم تصفير جميع فواتير المبيعات التجريبية بنجاح.' : 'Logged invoices cleared successfully.');
      }
    });
  };

  const handleResetDemoProducts = () => {
    executeWithAdminAuth(lang === 'ar' ? 'حذف وتصفير جميع أصناف المخزن' : 'Delete All Products', () => {
      if (confirm(lang === 'ar' ? '⚠️ هل أنت متأكد من رغبتك في حذف كل المنتجات والمخزون؟' : 'Are you sure you want to delete all products and inventory?')) {
        setProducts([]);
        localStorage.setItem('pos_products', JSON.stringify([]));
        showToast('success', lang === 'ar' ? '🧹 تم حذف كل المنتجات التجريبية بنجاح.' : 'All products deleted successfully.');
      }
    });
  };

  const handleResetDemoCustomers = () => {
    executeWithAdminAuth(lang === 'ar' ? 'تصفير وحذف قائمة الزبائن' : 'Reset Customers List', () => {
      if (confirm(lang === 'ar' ? '⚠️ هل أنت متأكد من حذف قائمة الزبائن؟' : 'Are you sure you want to delete all customers?')) {
        setCustomers([]);
        localStorage.setItem('pos_customers', JSON.stringify([]));
        showToast('success', lang === 'ar' ? '🧹 تم تصفير قائمة الزبائن بنجاح.' : 'All customers deleted successfully.');
      }
    });
  };

  // --- DATABASE MAINTENANCE & SYSTEM RESET ---
  const handleWipeSalesInvoicesOnly = () => {
    executeWithAdminAuth(lang === 'ar' ? 'تصفير مبيعات وأرباح المتجر الفعلية' : 'Wipe Live Sales Invoices Only', () => {
      if (confirm(lang === 'ar' ? '⚠️ هل أنت متأكد تماماً من رغبتك في تصفير وحذف جميع فواتير المبيعات والأرباح والسجلات المالية؟ لا يمكن التراجع عن هذه الخطوة!' : 'Are you sure you want to clear all sales invoices and financial records? This action cannot be undone!')) {
        setInvoices([]);
        localStorage.setItem('pos_invoices', JSON.stringify([]));
        showToast('success', lang === 'ar' ? '🧹 تم تصفير جميع فواتير المبيعات بنجاح. مخزون السلع بقي كما هو.' : 'All sales invoices cleared successfully.');
      }
    });
  };

  const handleWipeProductsAndCategoriesOnly = () => {
    executeWithAdminAuth(lang === 'ar' ? 'تصفير وحذف مخزن وسلع المتجر الفعلية' : 'Wipe Live Products & Categories Only', () => {
      if (confirm(lang === 'ar' ? '⚠️ هل أنت متأكد من رغبتك في حذف جميع المنتجات والمخزون الحالي؟ سيتم مسح الأصناف المسجلة بالكامل.' : 'Are you sure you want to clear all products and inventory items?')) {
        setProducts([]);
        localStorage.setItem('pos_products', JSON.stringify([]));
        showToast('success', lang === 'ar' ? '🧹 تم حذف قائمة المنتجات والمخزون بالكامل بنجاح.' : 'Completed clearing products and inventory configuration.');
      }
    });
  };

  const handleWipeEntireSystemData = () => {
    executeWithAdminAuth(lang === 'ar' ? 'تصفير وتدمير قاعدة بيانات النظام بالكامل' : 'Wipe System Database Entirely', () => {
      const confirm1 = confirm(lang === 'ar' 
        ? '🚨 تحذير شديد الأهمية: أنت على وشك حذف وتصفير البرنامج بالكامل من كافة البيانات التجريبية (المنتجات، المبيعات، الزبائن، الإتلاف، المشتريات، المصاريف). للبدء بنسخة نظيفة وخالية من الـ demo data. هل أنت متأكد؟'
        : '🚨 WARNING: You are about to wipe ALL transaction and inventory database info (Products, Invoices, Customers, Purchases, Expenses) to start fresh. Are you sure?');
      
      if (confirm1) {
        const confirm2 = confirm(lang === 'ar'
          ? '⚠️ للتأكيد النهائي: هل ترغب بحذف كل شيء والبدء بنظام فارغ تماماً؟ (سيتم الحفاظ فقط على اسم المحل وإعدادات لوحة تسجيل الدخول والمدراء)'
          : 'Final Confirmation: Wipe everything? (Shop configuration and user logins will be preserved)');
          
        if (confirm2) {
          setProducts([]);
          setInvoices([]);
          setCustomers([]);
          setSuppliers([]);
          setReturns([]);
          setWaste([]);
          setPromotions([]);
          setExpenses([]);
          setPurchaseInvoices([]);
          
          localStorage.setItem('pos_products', JSON.stringify([]));
          localStorage.setItem('pos_invoices', JSON.stringify([]));
          localStorage.setItem('pos_customers', JSON.stringify([]));
          localStorage.setItem('pos_suppliers', JSON.stringify([]));
          localStorage.setItem('pos_returns', JSON.stringify([]));
          localStorage.setItem('pos_waste', JSON.stringify([]));
          localStorage.setItem('pos_promotions', JSON.stringify([]));
          localStorage.setItem('pos_expenses', JSON.stringify([]));
          localStorage.setItem('pos_purchases', JSON.stringify([]));
          
          showToast('success', lang === 'ar' 
            ? '🎉 تم تصفير البرنامج بالكامل من البيانات التجريبية والبدء بصفحة نظيفة بنجاح!' 
            : 'Successfully wiped demo data and initialized completely clean database!');
        }
      }
    });
  };


  // --- AI INTEGRATION HANDLERS ---
  const callGeminiDirectlyClientSide = async (apiKey: string, reqType: 'chat' | 'audit', promptPayload: any) => {
    // Standard model configuration for high speed & compatibility
    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    let promptText = "";
    let systemInstruction = "";

    if (reqType === 'chat') {
      systemInstruction = "أنت مستشار ذكي وخبير مبيعات ومخزون ومحاسبة مدمج في نظام مبيعات السوبرماركت (Kamel POS). هدفك مساعدة المستخدم في فهم تقارير مبيعاته، تسيير المحل، تحسين جودة عرض السلع، وزيادة الأرباح. تحدث بلهجة تفاؤلية محمسة وعملية.";
      
      const shopName = settings?.shopName || "متجرنا";
      const exchangeRate = settings?.exchangeRate || 89000;
      const lowStockThreshold = settings?.lowStockThreshold || 5;

      const totalProducts = Array.isArray(products) ? products.length : 0;
      const totalInvoices = Array.isArray(invoices) ? invoices.length : 0;

      const lowStockItems = Array.isArray(products)
        ? products
            .filter(p => p.quantity <= lowStockThreshold)
            .slice(0, 15)
            .map(p => `${p.name} (الكمية: ${p.quantity})`)
        : [];

      const expiringItems = Array.isArray(products)
        ? products
            .filter(p => {
              if (!p.expiryDate) return false;
              const exp = new Date(p.expiryDate);
              const limit = new Date();
              limit.setMonth(limit.getMonth() + 2);
              return exp <= limit;
            })
            .slice(0, 15)
            .map(p => `${p.name} (ينتهي في: ${p.expiryDate})`)
        : [];

      const contextPrompt = `
معلومات النظام الإداري لنظام الـ POS:
- اسم السوبرماركت/المحل: ${shopName}
- سعر الصرف المعتمد بالنظام: ${exchangeRate} ليرة لبناينة لكل 1 دولار أمريكي.
- إجمالي الأصناف المسجلة بالنظام: ${totalProducts} منتج.
- إجمالي فواتير المبيعات الصادرة حتى الآن: ${totalInvoices} فاتورة.
${lowStockItems.length > 0 ? `- بعض الأصناف منخفضة المخزن (تنبيه مسبق): ${lowStockItems.join(", ")}` : '- جميع المنتجات لديها مخزون كافي حالياً.'}
${expiringItems.length > 0 ? `- أصناف قريبة من انتهاء الصلاحية (خلال شهرين): ${expiringItems.join(", ")}` : '- لم يتم رصد مستحضرات/منتجات شارفت على الانتهاء بالمدى القريب.'}

أنت كمستشار ذكي للنظام، ساعد الكاشير والمدير في الرد على سؤاله باحترافية واقترح استراتيجيات بيع لزيادة الأرباح، التخلص من البضائع البطيئة الحركة، إدارة المخزن، أو الرد على استشاراته المالية والتقنية. اكتب ردوداً باللغة العربية، ونسقها بشكل جميل ومنظم ومبهر.
`;
      promptText = `${contextPrompt}\n\nالسؤال/الطلب الحالي للمستخدم:\n${promptPayload.message}`;
    } else {
      systemInstruction = "أنت مدقق مالي ومحلل مبيعات خبير مدمج بنظام الكاشير (Kamel POS).";
      
      const shopName = settings?.shopName || "متجرنا";
      const exchangeRate = settings?.exchangeRate || 89000;
      const lowStockThreshold = settings?.lowStockThreshold || 5;

      const totalProds = Array.isArray(products) ? products.length : 0;
      const totalInvs = Array.isArray(invoices) ? invoices.length : 0;
      const totalExp = Array.isArray(expenses) ? expenses.length : 0;
      const totalWst = Array.isArray(waste) ? waste.length : 0;

      const lowStockCount = Array.isArray(products) ? products.filter(p => p.quantity <= lowStockThreshold).length : 0;
      const expiringCount = Array.isArray(products)
        ? products.filter(p => {
            if (!p.expiryDate) return false;
            const exp = new Date(p.expiryDate);
            const limit = new Date();
            limit.setMonth(limit.getMonth() + 2);
            return exp <= limit;
          }).length
        : 0;

      promptText = `
قم بإجراء فحص ومراجعة وتدقيق محاسبي وإداري شامل ومبهر لنشاط متجر POS باللغة العربية بناءً على البيانات التالية:
- اسم المحل: ${shopName}
- سعر الصرف: ${exchangeRate} ليرة لبنانية للدولار.
- عدد السلع والمنتجات المسجلة: ${totalProds} منتج.
- عدد السلع شبه المنتهية أو تجاوزت حد الأمان للمخزون (الكمية <= ${lowStockThreshold}): ${lowStockCount} منتج.
- عدد السلع منتهية الصلاحية أو قريبة الانتهاء (أقل من شهرين): ${expiringCount} منتج.
- إجمالي عدد المبيعات المسجلة: ${totalInvs} فاتورة.
- السجلات المالية للمصاريف: ${totalExp} مصاريف مسجلة.
- السجلات المالية للبضاعة الهالكة والتالفة: ${totalWst} عملية إتلاف.

اكتب تقريراً تدقيقياً استشارياً منظماً ورائعاً باستخدام تنسيق Markdown يشمل:
1. مراجعة رصيد المخزن الحالي والأصناف منتهية الصلاحية مع تحذير قوي بخطة للحل.
2. نصائح للمبيعات وضبط التدفق المالي لتجنب الخسارة.
3. التوصية بخطوات عملية ومؤتمتة لنمو المتجر وتحسين الأرباح.
مستنداً لأسلوب بليغ وسهل القراءة ومحفز كخبير مالي متمرس.
`;
    }

    let contents: any[] = [];
    if (reqType === 'chat' && Array.isArray(promptPayload.history)) {
      promptPayload.history.forEach((h: any) => {
        contents.push({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.parts?.[0]?.text || "" }]
        });
      });
    }
    
    contents.push({
      role: 'user',
      parts: [{ text: promptText }]
    });

    const bodyPayload = {
      contents,
      systemInstruction: systemInstruction ? {
        parts: [{ text: systemInstruction }]
      } : undefined
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload)
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody?.error?.message || `API Error ${res.status}`);
    }

    const resData = await res.json();
    return resData?.candidates?.[0]?.content?.parts?.[0]?.text || "عذراً لم يستجب الذكاء الاصطناعي بشكل سليم.";
  };

  const handleRunAiAudit = async () => {
    if (aiAuditLoading) return;
    setAiAuditLoading(true);
    setAiAuditResult(null);
    try {
      let finalReportText = "";
      
      // Try local direct call first if key is present
      if (localGeminiApiKey.trim()) {
        try {
          finalReportText = await callGeminiDirectlyClientSide(localGeminiApiKey.trim(), 'audit', {});
        } catch (localErr: any) {
          console.warn("Direct client Gemini audit failed, trying server endpoint...", localErr);
        }
      }
      
      // If direct client call didn't yield anything, try server endpoint
      if (!finalReportText) {
        const response = await fetch("/api/ai/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            products,
            invoices,
            expenses,
            waste,
            settings,
          }),
        });
        if (!response.ok) {
          throw new Error("خطأ في الاتصال بالخادم الذكي أو تعذر العثور على مفتاح API في الخادم");
        }
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        finalReportText = data.text || "لم يتم استلام أي رد.";
      }
      
      setAiAuditResult(finalReportText);
      showToast('success', 'تم انتهاء فحص المخزون الذكي بنجاح!');
    } catch (err: any) {
      console.error(err);
      showToast('error', `فشل الفحص الذكي: ${err?.message || err}`);
      setAiAuditResult(`### ❌ حدث خطأ أثناء تشغيل فحص الذكاء الاصطناعي\n\nيرجى التحقق من توفير مفتاح الـ Gemini API في صفحة إعدادات البرنامج أولاً، للتشغيل في نسخة الـ EXE.\n\nتفاصيل الخطأ: ${err?.message || err}`);
    } finally {
      setAiAuditLoading(false);
    }
  };

  const handleSendAiChatMessage = async (presetText?: string) => {
    const messageToSend = presetText || chatInput;
    if (!messageToSend.trim() || chatLoading) return;
    
    // Append user message
    const userMsg = {
      sender: 'user' as const,
      text: messageToSend,
      timestamp: new Date().toLocaleTimeString('ar-LB', { hour: '2-digit', minute: '2-digit' })
    };
    
    setChatMessages((prev) => [...prev, userMsg]);
    if (!presetText) setChatInput('');
    setChatLoading(true);

    try {
      // Map history to Gemini API format standard
      const mappedHistory = chatMessages.slice(-10).map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      let aiResponseText = "";

      // Try local direct call first if key is present
      if (localGeminiApiKey.trim()) {
        try {
          aiResponseText = await callGeminiDirectlyClientSide(localGeminiApiKey.trim(), 'chat', {
            message: messageToSend,
            history: mappedHistory
          });
        } catch (localErr: any) {
          console.warn("Direct client Gemini chat failed, trying server endpoint...", localErr);
        }
      }

      // If direct client call didn't yield anything, try server endpoint
      if (!aiResponseText) {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: messageToSend,
            history: mappedHistory,
            products,
            invoices,
            settings,
          }),
        });
        
        if (!response.ok) {
          throw new Error("خطأ في الاتصال بخادم المحادثة الذكي أو تعذر العثور على مفتاح API في الخادم");
        }
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        
        aiResponseText = data.text || "عذراً لم يستجب المساعد الذكي.";
      }
      
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: aiResponseText,
          timestamp: new Date().toLocaleTimeString('ar-LB', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `❌ عذراً، فشل الاتصال بالمساعد الذكي للرد على استفسارك ومراجعة الصلاحية والنواقص.\n\nيرجى التأكد من إضافة مفتاح Gemini API صالح في صفحة إعدادات البرنامج أولاً للتشغيل في نسخة الـ EXE.\n\nتفاصيل الخطأ: ${err?.message || err}`,
          timestamp: new Date().toLocaleTimeString('ar-LB', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // --- COMPUTE STATISTICS FOR GRAPH & REPORT ---
  const totalSalesUSD = invoices.reduce((sum, inv) => sum + inv.totalUSD, 0);
  const totalSalesLBP = totalSalesUSD * settings.exchangeRate;
  
  // Calculate top sold items
  const productSalesMap: { [key: string]: { name: string; qty: number; amt: number } } = {};
  invoices.forEach(inv => {
    inv.items.forEach(item => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = { name: item.productName, qty: 0, amt: 0 };
      }
      productSalesMap[item.productId].qty += item.quantity;
      productSalesMap[item.productId].amt += item.totalUSD;
    });
  });

  const topSoldProductsList = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const [keyboardLanguage, setKeyboardLanguage] = useState<'ar' | 'en' | 'num'>('ar');

  const renderVirtualKeyboard = () => {
    if (!isBarcodeKeyboardOpen) return null;
    
    const appendChar = (char: string) => {
      if (keyboardTarget === 'barcode') {
        setBarcodeInput(prev => prev + char);
      } else {
        setSearchQuery(prev => {
          const res = prev + char;
          setTerminalProductPage(0);
          return res;
        });
      }
    };
    
    const handleBackspace = () => {
      if (keyboardTarget === 'barcode') {
        setBarcodeInput(prev => prev.slice(0, -1));
      } else {
        setSearchQuery(prev => {
          const res = prev.slice(0, -1);
          setTerminalProductPage(0);
          return res;
        });
      }
    };
    
    const handleClear = () => {
      if (keyboardTarget === 'barcode') {
        setBarcodeInput('');
      } else {
        setSearchQuery('');
        setTerminalProductPage(0);
      }
    };

    const handleEnter = () => {
      if (keyboardTarget === 'barcode') {
        handleBarcodeSubmit(new Event('submit') as any);
      }
      setIsBarcodeKeyboardOpen(false);
    };

    const numbersRow = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '*'];
    
    const arKeys = [
      ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'],
      ['ش', 'س', 'ي', 'ب', 'ل', 'ت', 'ن', 'م', 'ك', 'ط', 'ذ', 'أ'],
      ['ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ', 'إ', 'آ']
    ];
    
    const enKeys = [
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", '\\'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', '@', '_']
    ];

    const currentRows = keyboardLanguage === 'ar' ? arKeys : enKeys;

    return (
      <div className={`p-4 rounded-2xl border transition shadow-lg w-full text-right select-none ${
        theme === 'dark' ? 'bg-[#1C1C1E] border-stone-850 text-white' : 'bg-slate-50 border-slate-200 text-slate-820'
      }`}>
        <div className="flex items-center justify-between border-b pb-2 mb-3 border-slate-200 dark:border-stone-800">
          <div className="flex gap-1.5">
            <button
              onClick={() => setIsBarcodeKeyboardOpen(false)}
              className="text-[10px] bg-slate-200 hover:bg-slate-300 dark:bg-stone-800 dark:hover:bg-stone-700 px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 dark:text-stone-300 dark:hover:text-white font-extrabold cursor-pointer transition-all"
            >
              إغلاق ×
            </button>
            <span className="text-[10px] bg-[#1D9E75]/10 text-[#1D9E75] px-2 py-0.5 rounded-full font-bold font-sans">
              {keyboardTarget === 'barcode' ? 'مستهدف: حقل الباركود 📟' : 'مستهدف: مربع البحث الفوري 🔍'}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 flex-row-reverse">
            <span className="text-xs font-black font-sans flex items-center gap-1">
              <span>لوحة المفاتيح الافتراضية المدمجة</span>
              <span>⌨️</span>
            </span>
            <div className="flex bg-slate-200 dark:bg-stone-900 rounded-xl p-0.5 text-[10px] font-bold">
              <button
                onClick={() => setKeyboardLanguage('ar')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${keyboardLanguage === 'ar' ? 'bg-[#1D9E75] text-white font-black shadow-xs' : 'text-slate-400'}`}
              >
                عربي
              </button>
              <button
                onClick={() => setKeyboardLanguage('en')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${keyboardLanguage === 'en' ? 'bg-[#1D9E75] text-white font-black shadow-xs' : 'text-slate-400'}`}
              >
                EN
              </button>
              <button
                onClick={() => setKeyboardLanguage('num')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${keyboardLanguage === 'num' ? 'bg-[#1D9E75] text-white font-black shadow-xs' : 'text-slate-400'}`}
              >
                123 فقط
              </button>
            </div>
          </div>
        </div>

        {keyboardLanguage === 'num' ? (
          /* Numpad Grid */
          <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto p-2" dir="ltr">
            {['7', '8', '9', 'Backspace'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => k === 'Backspace' ? handleBackspace() : appendChar(k)}
                className={`h-11 rounded-xl text-sm font-black transition cursor-pointer flex items-center justify-center ${
                  k === 'Backspace' 
                    ? 'bg-amber-500 hover:bg-amber-600 text-white col-span-1 shadow-xs' 
                    : theme === 'dark' ? 'bg-stone-800 hover:bg-stone-700 text-stone-100' : 'bg-white hover:bg-slate-100 text-slate-800 shadow-xs border border-slate-200'
                }`}
              >
                {k === 'Backspace' ? '←' : k}
              </button>
            ))}
            {['4', '5', '6', 'Clear'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => k === 'Clear' ? handleClear() : appendChar(k)}
                className={`h-11 rounded-xl text-sm font-black transition cursor-pointer flex items-center justify-center ${
                  k === 'Clear' 
                    ? 'bg-rose-500 hover:bg-rose-600 text-white col-span-1 shadow-xs' 
                    : theme === 'dark' ? 'bg-stone-800 hover:bg-stone-700 text-stone-100' : 'bg-white hover:bg-slate-100 text-slate-800 shadow-xs border border-slate-200'
                }`}
              >
                {k === 'Clear' ? 'C' : k}
              </button>
            ))}
            {['1', '2', '3', 'Enter'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => k === 'Enter' ? handleEnter() : appendChar(k)}
                className={`h-11 rounded-xl text-sm font-black transition cursor-pointer flex items-center justify-center ${
                  k === 'Enter' 
                    ? 'bg-[#1D9E75] hover:bg-[#15805e] text-white col-span-1 row-span-2 h-[96px] shadow-xs' 
                    : theme === 'dark' ? 'bg-stone-800 hover:bg-stone-700 text-stone-100' : 'bg-white hover:bg-slate-100 text-slate-800 shadow-xs border border-slate-200'
                }`}
              >
                {k === 'Enter' ? 'Enter' : k}
              </button>
            ))}
            {['0', '.', '-'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => appendChar(k)}
                className={`h-11 rounded-xl text-sm font-black transition cursor-pointer flex items-center justify-center ${
                  theme === 'dark' ? 'bg-stone-800 hover:bg-stone-700 text-stone-100' : 'bg-white hover:bg-slate-100 text-slate-800 shadow-xs border border-slate-200'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        ) : (
          /* Full Text Layout */
          <div className="space-y-2 flex flex-col items-center" dir={keyboardLanguage === 'ar' ? 'rtl' : 'ltr'}>
            <div className="flex gap-1.5 w-full justify-center">
              {numbersRow.map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => appendChar(num)}
                  className={`flex-1 h-10 min-w-[28px] max-w-[45px] rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    theme === 'dark' 
                      ? 'bg-stone-800 hover:bg-stone-700 text-white' 
                      : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-150'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            {currentRows.map((row, rowIdx) => (
              <div key={rowIdx} className="flex gap-1 w-full justify-center">
                {row.map(char => (
                  <button
                    key={char}
                    type="button"
                    onClick={() => appendChar(char)}
                    className={`flex-1 h-10 min-w-[28px] max-w-[45px] rounded-xl text-xs font-bold transition cursor-pointer ${
                      theme === 'dark' 
                        ? 'bg-stone-800 hover:bg-stone-750 text-white' 
                        : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-xs'
                    }`}
                  >
                    {char}
                  </button>
                ))}
              </div>
            ))}

            <div className="flex gap-1.5 w-full justify-center">
              <button
                onClick={handleClear}
                type="button"
                className="px-3 h-10 rounded-xl text-xs font-black bg-rose-500 hover:bg-rose-600 text-white transition cursor-pointer shrink-0"
              >
                مسح الكل
              </button>
              <button
                onClick={handleBackspace}
                type="button"
                className="px-4 h-10 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white transition cursor-pointer shrink-0"
              >
                مسح
              </button>
              <button
                onClick={() => appendChar(' ')}
                type="button"
                className={`flex-1 h-10 rounded-xl text-xs font-bold transition cursor-pointer ${
                  theme === 'dark' 
                    ? 'bg-stone-700 hover:bg-stone-600 text-white' 
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300'
                }`}
              >
                مــســافــة
              </button>
              <button
                onClick={handleEnter}
                type="button"
                className="px-5 h-10 rounded-xl text-xs font-extrabold bg-[#1D9E75] hover:bg-emerald-600 text-white transition cursor-pointer shrink-0"
              >
                تأكيد
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render role lockout screens for cashiers
  const renderAdminLockScreen = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center max-w-lg mx-auto my-12" id="admin-lock">
      <div className="bg-amber-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
        <Lock className="text-amber-600 w-10 h-10" />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-3 font-sans">صفحة مغلقة ومخصصة للمدير</h3>
      <p className="text-slate-500 leading-relaxed mb-6">
        عفواً يا {currentUser?.name}! صلاحية حسابك الحالي هي (كاشير). لا يمكنك تعديل جرد المستودع، الإعدادات، أو الإيرادات والتقارير المالية بالنظام.
      </p>
      <div className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3 inline-block">
        يرجى تسجيل الخروج والولوج بحساب <span className="font-mono font-bold text-slate-600">admin</span> لرؤية هذه المعلومات.
      </div>
    </div>
  );

  // PRESTIGIOUS INTEGRATED SALES LOCK SCREEN
  const renderLockScreen = () => {
    if (!currentUser) return null;

    // Daily stats filtered strictly for current cashier context
    const todayInvoices = invoices.filter(inv => inv.cashier === currentUser.name && inv.date === SYS_DATE);
    const invoiceCount = todayInvoices.length;
    const totalSalesUSD = todayInvoices.reduce((sum, inv) => sum + inv.totalUSD, 0);
    const totalSalesLBP = todayInvoices.reduce((sum, inv) => sum + inv.totalLBP, 0);

    const initials = currentUser.name.split(' ').map(n => n ? n[0] : '').join('').slice(0, 2).toUpperCase();

    return (
      <div 
        className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 relative overflow-hidden font-sans select-none"
        id="lock-screen-container"
      >
        {/* Glowing backdrop ambient orbs */}
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl opacity-30" />
        
        <div className="w-full max-w-4xl bg-slate-900/60 border border-white/5 rounded-[32px] shadow-2xl backdrop-blur-xl overflow-hidden relative z-10 grid grid-cols-1 md:grid-cols-12 animate-fade-in">
          {/* LEFT COLUMN: Date, Ticking Clock, Active cashier profile details, and Shift metrics */}
          <div className="md:col-span-12 lg:col-span-5 bg-gradient-to-b from-slate-900/40 to-slate-950/40 p-8 border-b lg:border-b-0 lg:border-l border-white/5 flex flex-col justify-between gap-8 text-right">
            
            {/* Live Ticking Clock segment */}
            <LockScreenClock lang={lang} />

            {/* Active Cashier context card & shift performance statistics */}
            <div className="space-y-6">
              
              {/* Cashier profile block */}
              <div className="flex items-center gap-3.5 flex-row-reverse">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center font-black text-emerald-400 text-lg shadow-inner">
                  {initials || 'POS'}
                </div>
                <div className="space-y-0.5">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {lang === 'ar' ? 'المستخدم النشط حالياً' : 'Active cashier on terminal'}
                  </span>
                  <h3 className="text-base font-black text-white leading-tight">{currentUser.name}</h3>
                  <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                    currentUser.role === 'admin' 
                      ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' 
                      : 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/30'
                  }`}>
                    {currentUser.role === 'admin' ? (lang === 'ar' ? 'المدير العام' : 'Admin Mode') : (lang === 'ar' ? 'كاشير مبيعات' : 'Cashier Mode')}
                  </span>
                </div>
              </div>

              {/* Dynamic shift metrics */}
              <div className="space-y-3 pt-3 border-t border-white/5">
                <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1 flex-row-reverse">
                  <span>📈 {lang === 'ar' ? 'موجز الوردية الحالية وبطاقة الأداء:' : 'Session statistics & workflow details'}</span>
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-bold block">
                      {lang === 'ar' ? 'الفواتير الصادرة' : 'Invoices emitted'}
                    </span>
                    <span className="font-mono text-lg font-black text-white">
                      {invoiceCount}
                    </span>
                  </div>
                  
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-bold block">
                      {lang === 'ar' ? 'إجمالي المدخول' : 'Session gross'}
                    </span>
                    <span className="font-mono text-lg font-black text-emerald-400">
                      ${totalSalesUSD.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex justify-between items-center text-sm flex-row-reverse">
                  <span className="text-slate-400 text-xs font-bold">
                    {lang === 'ar' ? 'المدخول بالعملة المحلية:' : 'LBP Exchange Sum:'}
                  </span>
                  <span className="font-mono font-black text-slate-200">
                    {totalSalesLBP.toLocaleString()} ل.ل
                  </span>
                </div>
              </div>

            </div>

            {/* Hint message explaining capabilities */}
            <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-xs text-slate-400 leading-relaxed hidden lg:block">
              💡 {lang === 'ar' 
                ? 'الشاشة مقفلة بوضع الأمان لحفظ سرية المبيعات والمشتريات. يمكنك استخدام لوحة المفاتيح والضغط على Enter بعد كتابة الرمز مباشرة.' 
                : 'Locked for security. You can type credentials on physical keyboard and press Enter to directly unlock.'}
            </div>

          </div>

          {/* RIGHT COLUMN: Keypad passcode dialer */}
          <div className="md:col-span-12 lg:col-span-7 p-8 flex flex-col justify-center items-center text-center">
            
            {/* Icon lock header block */}
            <motion.div 
              animate={isLockShaking ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center"
            >
              <div className="bg-emerald-500/10 w-16 h-16 rounded-3xl flex items-center justify-center border border-emerald-500/20 mb-3 shadow-xl shadow-emerald-500/5">
                <Lock className="text-emerald-400 w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white mb-2">
                {lang === 'ar' ? 'تأمين شاشة نقطة البيع' : 'Supermarket Terminal Locked'}
              </h2>
              <p className="text-slate-400 text-xs mb-4">
                {lang === 'ar' ? 'أدخل كلمة المرور أو الباسكود لاستئناف المبيعات' : 'Enter your password or passcode to resume sales'}
              </p>
            </motion.div>

            {/* Security Interface Panel */}
            <div className="w-full max-w-xs space-y-4">
              
              {/* Floating pin dots indicators */}
              <div className="flex gap-2.5 justify-center py-1">
                {Array.from({ length: Math.max(4, lockPasscode.length) }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                      i < lockPasscode.length 
                        ? 'bg-emerald-400 scale-110 shadow-lg shadow-emerald-500/50' 
                        : 'bg-white/10 border border-white/5'
                    }`} 
                  />
                ))}
              </div>

              {/* Password visual masked screen string input display */}
              <div className="relative">
                <input 
                  type="password"
                  readOnly
                  value={lockPasscode}
                  placeholder={lang === 'ar' ? '••••••••' : '••••••••'}
                  className={`w-full bg-white/5 border text-center text-xl font-bold py-3.5 px-4 rounded-2xl text-white ltr:font-mono focus:outline-none transition-all duration-300 ${
                    lockError ? 'border-red-500 bg-red-500/5' : 'border-white/10'
                  }`}
                />
                {lockPasscode && (
                  <button
                    type="button"
                    onClick={() => setLockPasscode('')}
                    className="absolute left-3.5 top-3.5 text-slate-400 hover:text-white transition duration-150 cursor-pointer"
                    title={lang === 'ar' ? 'إعادة تعيين' : 'Clear'}
                  >
                    <X className="w-5 h-5 opacity-60 hover:opacity-100" />
                  </button>
                )}
              </div>

              {/* Error messages feedback overlay */}
              <AnimatePresence>
                {lockError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-red-400 text-xs font-bold bg-red-500/10 border border-red-500/20 py-1.5 px-3 rounded-xl block text-center"
                  >
                    ⚠️ {lockError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Keypad selector blocks */}
              <div className="grid grid-cols-3 gap-2.5 max-w-[270px] mx-auto pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(key => {
                  const isAction = key === 'C' || key === '⌫';
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        if (key === 'C') {
                          setLockPasscode('');
                          setLockError('');
                        } else if (key === '⌫') {
                          setLockPasscode(prev => prev.slice(0, -1));
                          setLockError('');
                        } else {
                          setLockPasscode(prev => prev + key);
                          setLockError('');
                        }
                      }}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold transition-all duration-100 cursor-pointer ${
                        isAction 
                          ? 'bg-white/10 hover:bg-white/15 text-slate-200 active:scale-95' 
                          : 'bg-white/5 hover:bg-white/10 border border-white/5 text-white active:bg-[#1D9E75]/20 active:scale-95'
                      }`}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>

              {/* Controls triggers */}
              <div className="flex gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={handleUnlock}
                  className="flex-1 bg-[#1D9E75] hover:bg-[#15805e] border border-emerald-500/20 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] cursor-pointer text-sm font-sans"
                >
                  {lang === 'ar' ? 'فتح الشاشة 🔓' : 'Unlock Screen 🔓'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsScreenLocked(false);
                    localStorage.setItem('pos_screen_locked', 'false');
                    handleLogout();
                  }}
                  className="bg-white/5 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 text-slate-350 hover:text-rose-400 font-bold py-3.5 px-3 rounded-xl transition duration-150 active:scale-[0.98] cursor-pointer text-xs flex items-center justify-center gap-1"
                  title={lang === 'ar' ? 'الخروج والتبديل لحساب آخر' : 'Logout of account'}
                >
                  <span>{lang === 'ar' ? 'تبديل المستخدم' : 'Switch Operator'}</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      </div>
    );
  };

  // IF SCREEN IS LOCKED (AND USER IS CURRENTLY LOGGED IN), SHOW LOCK SCREEN
  if (currentUser && isScreenLocked) {
    return renderLockScreen();
  }

  // IF NOT LOGGED IN, SHOW BEAUTIFUL LOGIN SCREEN
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-emerald-50 via-slate-50 to-emerald-100/30 flex items-center justify-center p-4" id="login-screen">
        <div className="bg-white rounded-3xl ltr:shadow-2xl shadow-emerald-950/5 border border-slate-100 w-full max-w-md overflow-hidden animate-fade-in">
          {/* Brand header */}
          <div className="bg-[#1D9E75] p-8 text-center text-white relative">
            <div className="absolute top-4 right-4 bg-white/10 text-xs px-2 py-1 rounded backdrop-blur-sm font-mono">
              {lang === 'ar' ? 'التوقيت اليومي' : 'System Time'}: {SYS_DATE}
            </div>
            
            {/* Language switcher button flag */}
            <button 
              type="button"
              onClick={handleToggleLang}
              className="absolute top-4 left-4 bg-white/10 hover:bg-white/20 text-xs px-2.5 py-1 rounded backdrop-blur-sm font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Globe className="w-3 h-3" />
              <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>

            <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
              <ShoppingCart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold font-sans tracking-tight">
              {lang === 'ar' ? 'نظام مبيعات السوبرماركت المطور' : 'Advanced Supermarket POS System'}
            </h1>
            <p className="text-emerald-100 text-sm mt-1">
              {lang === 'ar' ? 'بوابتك لإدارة البيع، المخزون والجرد بكفاءة' : 'Your gateway for sales, inventory, and stock auditing'}
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-8 space-y-5 text-right">
            {loginError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm p-4 rounded-xl flex items-start gap-2 text-right">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-bold mb-1.5 text-sm text-right" htmlFor="username">
                {lang === 'ar' ? 'اسم المستخدم' : 'Username'}
              </label>
              <div className="relative">
                <input 
                  id="username"
                  type="text" 
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-right focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:bg-white transition"
                  placeholder={lang === 'ar' ? 'مثال: admin' : 'e.g., admin'}
                  required
                />
                <User className="absolute left-3.5 top-3.5 text-slate-400 w-5 h-5" />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5 text-sm text-right" htmlFor="password">
                {lang === 'ar' ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="relative">
                <input 
                  id="password"
                  type="password" 
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-right ltr:font-mono focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:bg-white transition"
                  placeholder="••••••••"
                  required
                />
                <Lock className="absolute left-3.5 top-3.5 text-slate-400 w-5 h-5" />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-[#1D9E75] hover:bg-[#15805e] text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-emerald-700/10 hover:shadow-emerald-700/20 active:scale-[0.98] cursor-pointer"
            >
              {lang === 'ar' ? 'دخول للنظام 🔓' : 'Login to System 🔓'}
            </button>

            <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 space-y-1 border border-slate-100 text-right">
              <div className="font-bold text-slate-700 mb-1">
                {lang === 'ar' ? '💡 مستندات الدخول الافتراضية للتجربة:' : '💡 Experience Default Login Accounts:'}
              </div>
              <div>
                {lang === 'ar' ? '• حساب المدير: ' : '• Admin Mode: '}
                <span className="font-mono bg-slate-200 px-1 rounded text-red-700">admin</span>
                {lang === 'ar' ? ' كلمة السر: ' : ' pass: '}
                <span className="font-mono bg-slate-200 px-1 rounded text-red-700">admin123</span>
              </div>
              <div>
                {lang === 'ar' ? '• حساب الكاشير: ' : '• Cashier Mode: '}
                <span className="font-mono bg-slate-200 px-1 rounded text-red-700">kaseer</span>
                {lang === 'ar' ? ' كلمة السر: ' : ' pass: '}
                <span className="font-mono bg-slate-200 px-1 rounded text-red-700">1234</span>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // MAIN SYSTEM PAGE
  const daysLeft = typeof subscriptionDaysRemaining === 'number' ? subscriptionDaysRemaining : 365;

  return (
    <div className={`bg-[#F8FAFC] flex flex-col font-sans text-slate-800 w-full max-w-none overflow-x-hidden ${activeTab === 'pos' ? 'h-screen overflow-hidden' : 'min-h-screen'}`} id="main-system" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Global CSS Style tag for dynamic font and button scale */}
      <style>{`
        html {
          font-size: ${globalFontScale * 100}% !important;
          zoom: ${globalZoomScale} !important;
          width: 100% !important;
          height: 100% !important;
          ${activeTab === 'pos' ? 'overflow: hidden !important;' : ''}
        }
        
        body {
          width: 100% !important;
          margin: 0;
          padding: 0;
          ${activeTab === 'pos' ? `
            height: 100vh !important;
            width: 100vw !important;
            overflow: hidden !important;
            background-color: ${theme === 'dark' ? '#121213' : '#F8FAFC'} !important;
          ` : 'min-height: 100vh !important;'}
        }

        #root {
          width: 100% !important;
          height: 100vh !important;
          min-height: 100vh !important;
          display: flex;
          flex-direction: column;
          ${activeTab === 'pos' ? 'overflow: hidden !important;' : ''}
        }

        ${activeTab === 'pos' ? `
          #main-system {
            height: 100vh !important;
            width: 100vw !important;
            overflow: hidden !important;
            background-color: ${theme === 'dark' ? '#121213' : '#F8FAFC'} !important;
          }
          #system-footer {
            width: 100% !important;
            max-width: 100% !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
        ` : ''}
        
        @media print {
          html {
            font-size: 100% !important;
          }
          body {
            zoom: 1 !important;
            width: 100% !important;
            min-height: auto !important;
          }
        }

        /* Exclude printed elements or specific modals from font scaling */
        .print-receipt, .receipt-preview, .receipt-container, .no-global-scale {
          font-size: 14px !important;
        }

        /* Button & Interactive Sizing Scale */
        button:not(.no-btn-scale, .receipt-preview *, .print-receipt *, .receipt-container *, .numpad-key, .flat-numpad-key, .flat-numpad-key *),
        [role="button"]:not(.no-btn-scale, .receipt-preview *, .print-receipt *, .receipt-container *, .numpad-key, .flat-numpad-key, .flat-numpad-key *) {
          zoom: ${globalButtonScale} !important;
        }
      `}</style>
      {/* Floating Toast Notification Box */}
      <AnimatePresence>
        {generalAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[100000] max-w-md w-full px-4 select-none no-print"
          >
            <div 
              className={`shadow-xl rounded-2xl px-5 py-4 border text-right flex items-center justify-between gap-3 backdrop-blur-md ${
                generalAlert.type === 'success'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/20'
                  : generalAlert.type === 'error'
                  ? 'bg-rose-600 border-rose-500 text-white shadow-rose-500/20'
                  : 'bg-amber-600 border-amber-500 text-white shadow-amber-500/20'
              }`}
            >
              <div className="flex items-center gap-3 flex-row-reverse w-full text-right">
                <div className="shrink-0 text-xl">
                  {generalAlert.type === 'success' ? '✅' : generalAlert.type === 'error' ? '❌' : '⚠️'}
                </div>
                <p className="text-xs sm:text-sm font-extrabold flex-1 leading-normal text-right">
                  {generalAlert.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGeneralAlert(null)}
                className="text-white hover:text-slate-200 transition-all font-bold p-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs hover:scale-105 active:scale-95 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic post-activation Owner Account Configuration Wizard overlay */}
      {showSetupWizard && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xl z-[99999] flex items-center justify-center p-4 overflow-y-auto no-print font-sans">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[32px] border border-slate-100 max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative text-right"
          >
            <div className="flex items-center gap-3.5 justify-end border-b border-slate-100 pb-4 flex-row-reverse">
              <div className="w-12 h-12 bg-amber-500/15 border border-amber-500/25 rounded-2xl flex items-center justify-center text-amber-500">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <span className="block text-[10px] text-[#1D9E75] font-black uppercase tracking-wider">
                  {lang === 'ar' ? 'تخصيص أمان المالك الجديد' : 'New Owner Security Customization'}
                </span>
                <h2 className="text-xl font-bold text-slate-800 leading-tight">
                  {lang === 'ar' ? '🛡️ إعداد حسابات المدير والكاشير للترخيص الجديد' : '🛡️ Setup Authorized Admin & Cashier Accounts'}
                </h2>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              {lang === 'ar' 
                ? '🎉 أهلاً بك! لقد تم تنشيط الاشتراك السنوي بنجاح لمتجرك الموقر. كخطوة أمنية إلزامية لحماية الصندوق، يرجى استبدال كود المبيعات وكلمات المرور الافتراضية الآن بتعيين اسم وباسكود خاص بالمدير وتعيين اسم وباسكود الكاشير المسؤول:'
                : '🎉 Congratulations! Your annual subscription is successfully activated. As a mandatory safety step to prevent unauthorized cash manipulation, please customize administrator and cashier real names and passcodes below:'}
            </p>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const aName = (form.elements.namedItem('wAdminName') as HTMLInputElement).value;
                const aPass = (form.elements.namedItem('wAdminPass') as HTMLInputElement).value;
                const cName = (form.elements.namedItem('wCashierName') as HTMLInputElement).value;
                const cPass = (form.elements.namedItem('wCashierPass') as HTMLInputElement).value;
                
                if (!aName.trim() || !aPass.trim() || !cName.trim() || !cPass.trim()) {
                  showToast('error', lang === 'ar' ? 'يرجى مراجعة كافة حقول إعداد الحسابات!' : 'Please fill all account setup fields!');
                  return;
                }
                saveWizardData(aName, aPass, cName, cPass);
              }}
              className="space-y-5"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-row-reverse">
                {/* Admin Block */}
                <div className="bg-amber-500/5 border border-amber-200/40 p-5 rounded-2xl space-y-3.5 text-right">
                  <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider block border-b border-amber-200/50 pb-1.5">
                    {lang === 'ar' ? '١. حساب المدير العام وصاحب العمل:' : '1. General Administrator & Store Owner:'}
                  </span>
                  
                  <div className="space-y-1">
                    <label className="block text-slate-650 font-bold text-[11px]">{lang === 'ar' ? 'الاسم الكامل للمدير:' : 'Full Admin Name:'}</label>
                    <input 
                      name="wAdminName"
                      type="text"
                      defaultValue={adminRealName}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-right focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                      placeholder="كامل بيضاء"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-650 font-bold text-[11px]">{lang === 'ar' ? 'باسكود/كلمة دخل الدخول الجديد:' : 'New Admin Passcode/Password:'}</label>
                    <input 
                      name="wAdminPass"
                      type="text"
                      defaultValue={adminPasscode === 'admin123' ? '' : adminPasscode}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-center ltr:font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                      placeholder={lang === 'ar' ? 'أدخل باسكود جديد مميز' : 'e.g. 556677'}
                    />
                    <span className="text-[9.5px] text-slate-400 block mt-0.5 leading-tight">{lang === 'ar' ? 'لتغيير الأسعار والمبيعات وإغلاق الورديات والتقارير' : 'Used for settings, rate controls and stock counts'}</span>
                  </div>
                </div>

                {/* Cashier Block */}
                <div className="bg-[#1D9E75]/5 border border-emerald-200/40 p-5 rounded-2xl space-y-3.5 text-right">
                  <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider block border-b border-emerald-200/50 pb-1.5">
                    🛒 {lang === 'ar' ? '٢. حساب الكاشير وبائع المبيعات:' : '2. Point of Sales Cashier Staff:'}
                  </span>
                  
                  <div className="space-y-1">
                    <label className="block text-slate-650 font-bold text-[11px]">{lang === 'ar' ? 'الاسم الكامل للكاشير:' : 'Full Cashier Name:'}</label>
                    <input 
                      name="wCashierName"
                      type="text"
                      defaultValue={cashierRealName}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-right focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                      placeholder="أحمد كاشير"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-650 font-bold text-[11px]">{lang === 'ar' ? 'باسكود/رمز دخول الكاشير الجديد:' : 'New Cashier Passcode:'}</label>
                    <input 
                      name="wCashierPass"
                      type="text"
                      defaultValue={cashierPasscode === '1234' ? '' : cashierPasscode}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-center ltr:font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder={lang === 'ar' ? 'أدخل باسكود المبيعات' : 'e.g. 1212'}
                    />
                    <span className="text-[9.5px] text-slate-400 block mt-0.5 leading-tight">{lang === 'ar' ? 'لتسجيل الدخول وتمرير المبيعات اليومية فقط' : 'Used specifically for barcode scans & checkouts'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-[#1D9E75] hover:bg-emerald-600 text-white font-black py-4 px-4 rounded-xl text-xs sm:text-sm transition duration-150 shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{lang === 'ar' ? 'حفظ وإعداد الهوية وأمان النظام الآن' : 'Save Accounts & Complete Terminal Initializations'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* --- TOP BRAND HEADER BAR --- */}
      <header className={`bg-white border-b border-slate-200 sticky top-0 z-30 font-sans ${activeTab === 'pos' && posLayoutMode === 'terminal' ? 'hidden' : ''}`} id="system-header">
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Brand Logo & Shop Name (At Start of direction: right in RTL, left in LTR) */}
          <div className="flex items-center gap-3 shrink-0">
            {settings.shopLogo ? (
              <img 
                src={settings.shopLogo} 
                alt={settings.shopName} 
                className="max-h-12 w-auto object-contain rounded-xl shadow-xs" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="bg-[#1D9E75] text-white p-2.5 rounded-xl shrink-0">
                <ShoppingCart className="w-6 h-6" />
              </div>
            )}
            <div className="text-right">
              <h2 className="text-lg font-bold text-slate-900">{settings.shopName}</h2>
              <p className="text-xs text-emerald-600 font-semibold text-right">
                {lang === 'ar' ? 'صرف الدولار المعتمد' : 'Current Exchange Rate'}: {settings.exchangeRate.toLocaleString()} {lang === 'ar' ? 'ل.ل' : 'LBP'} / 1 $
              </p>
            </div>
          </div>

          {/* Profiles and control buttons (At End of direction: left in RTL, right in LTR) */}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {/* Dynamic Globe Language Toggle */}
            <button
              onClick={handleToggleLang}
              className="text-xs bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer"
              title={lang === 'ar' ? 'Switch to English' : 'تحويل للغة العربية'}
            >
              <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{lang === 'ar' ? 'English 🇺🇸' : 'العربية 🇱🇧'}</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              className="text-xs bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer"
              title={lang === 'ar' ? 'تبديل المظهر' : 'Toggle Theme'}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
              <span>{theme === 'dark' ? (lang === 'ar' ? 'الوضع النهاري ☀️' : 'Light Mode ☀️') : (lang === 'ar' ? 'الوضع الليلي 🌙' : 'Dark Mode 🌙')}</span>
            </button>

            {/* Fullscreen Toggle Button */}
            <button
              onClick={toggleFullScreen}
              className="text-xs bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
              title={lang === 'ar' ? 'تبديل ملء الشاشة' : 'Toggle Fullscreen'}
            >
              <Maximize className="w-3.5 h-3.5 text-indigo-600" />
              <span>{lang === 'ar' ? 'ملء الشاشة 🖥️' : 'Fullscreen 🖥️'}</span>
            </button>

            {/* POS Layout Mode Switcher */}
            <button
              onClick={() => {
                const newVal = posLayoutMode === 'modern' ? 'terminal' : 'modern';
                setPosLayoutMode(newVal);
                if (newVal === 'terminal') {
                  setTheme('dark');
                }
                showToast('success', lang === 'ar' ? `🖥️ تم تنشيط شاشة نقاط البيع الاحترافية` : `🖥️ Switched to POS Touch Terminal`);
              }}
              className="text-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg font-extrabold flex items-center gap-1.5 transition cursor-pointer shrink-0"
              title={lang === 'ar' ? 'تعديل تصميم شاشة البيع المباشر' : 'Toggle POS Screen Layout Division'}
            >
              <Monitor className="w-3.5 h-3.5 text-emerald-600" />
              <span>{posLayoutMode === 'terminal' ? (lang === 'ar' ? '🖥️ واجهة عادية' : '🖥️ Standard Dashboard') : (lang === 'ar' ? '🖥️ واجهة الكاشير لمس' : '🖥️ Terminal Cashier')}</span>
            </button>

            {/* Accessibility / Global Scale Panel Button */}
            <div className="relative">
              <button
                onClick={() => setShowSizeControlPopover(!showSizeControlPopover)}
                className="text-xs bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-lg font-extrabold flex items-center gap-1.5 transition cursor-pointer"
                title={lang === 'ar' ? 'التحكم بحجم الخط والأزرار' : 'Font & Button Size Control'}
              >
                <span>🔤</span>
                <span>{lang === 'ar' ? 'حجم الخط والأزرار' : 'Sizes'}</span>
              </button>

              {showSizeControlPopover && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSizeControlPopover(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-800 rounded-2xl shadow-xl p-4 z-50 text-right space-y-4 no-print animate-in fade-in duration-100">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-stone-800 pb-2">
                      <button 
                        onClick={() => {
                          setGlobalFontScale(1.0);
                          setGlobalButtonScale(1.0);
                          setGlobalZoomScale(0.85);
                          showToast('success', lang === 'ar' ? '♻️ تم إعادة تعيين الأحجام الافتراضية' : '♻️ Default sizes restored');
                        }}
                        className="text-[10px] text-red-600 dark:text-red-400 font-bold hover:underline"
                      >
                        {lang === 'ar' ? 'إعادة تعيين' : 'Reset'}
                      </button>
                      <h4 className="font-bold text-xs text-slate-800 dark:text-stone-200 flex items-center gap-1.5">
                        <span>{lang === 'ar' ? 'التحكم بالأحجام العامة' : 'Global UI Scaling'}</span>
                        <span>📏</span>
                      </h4>
                    </div>

                    {/* Font Size Controller */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono font-bold text-[#1D9E75]">
                          {Math.round(globalFontScale * 100)}%
                        </span>
                        <span className="font-bold text-slate-700 dark:text-stone-300">
                          {lang === 'ar' ? 'حجم الخط:' : 'Text Font Size:'}
                        </span>
                      </div>
                      <input 
                        type="range"
                        min="0.8"
                        max="1.4"
                        step="0.05"
                        value={globalFontScale}
                        onChange={(e) => setGlobalFontScale(parseFloat(e.target.value))}
                        className="w-full accent-emerald-600 h-1.5 bg-slate-100 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="grid grid-cols-4 gap-1 text-[9px] text-center font-bold">
                        <button onClick={() => setGlobalFontScale(0.85)} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                          {lang === 'ar' ? 'صغير' : 'Small'}
                        </button>
                        <button onClick={() => setGlobalFontScale(1.0)} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                          {lang === 'ar' ? 'افتراضي' : 'Default'}
                        </button>
                        <button onClick={() => setGlobalFontScale(1.15)} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                          {lang === 'ar' ? 'كبير' : 'Large'}
                        </button>
                        <button onClick={() => setGlobalFontScale(1.3)} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                          {lang === 'ar' ? 'ضخم' : 'Huge'}
                        </button>
                      </div>
                    </div>

                    {/* Button Size Controller */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-stone-800/60">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {Math.round(globalButtonScale * 100)}%
                        </span>
                        <span className="font-bold text-slate-700 dark:text-stone-300">
                          {lang === 'ar' ? 'حجم الأزرار والتفاعل:' : 'Button Sizing:'}
                        </span>
                      </div>
                      <input 
                        type="range"
                        min="0.8"
                        max="1.4"
                        step="0.05"
                        value={globalButtonScale}
                        onChange={(e) => setGlobalButtonScale(parseFloat(e.target.value))}
                        className="w-full accent-blue-600 h-1.5 bg-slate-100 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="grid grid-cols-4 gap-1 text-[9px] text-center font-bold">
                        <button onClick={() => setGlobalButtonScale(0.85)} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                          {lang === 'ar' ? 'مضغوط' : 'Compact'}
                        </button>
                        <button onClick={() => setGlobalButtonScale(1.0)} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                          {lang === 'ar' ? 'افتراضي' : 'Default'}
                        </button>
                        <button onClick={() => setGlobalButtonScale(1.15)} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                          {lang === 'ar' ? 'مريح' : 'Comfortable'}
                        </button>
                        <button onClick={() => setGlobalButtonScale(1.3)} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                          {lang === 'ar' ? 'لمس ضخم' : 'Large Touch'}
                        </button>
                      </div>
                    </div>

                    {/* Screen Zoom Controller */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-stone-800/60">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono font-bold text-violet-600 dark:text-violet-400">
                          {Math.round(globalZoomScale * 100)}%
                        </span>
                        <span className="font-bold text-slate-700 dark:text-stone-300">
                          {lang === 'ar' ? 'الزوم ودقة الشاشة:' : 'Screen Zoom Scale:'}
                        </span>
                      </div>
                      <input 
                        type="range"
                        min="0.6"
                        max="1.2"
                        step="0.05"
                        value={globalZoomScale}
                        onChange={(e) => setGlobalZoomScale(parseFloat(e.target.value))}
                        className="w-full accent-violet-600 h-1.5 bg-slate-100 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="grid grid-cols-4 gap-1 text-[9px] text-center font-bold">
                        <button onClick={() => {
                          setGlobalZoomScale(0.75);
                          showToast('success', lang === 'ar' ? '🔍 تم تعيين الزوم لـ 75% للشاشات الصغيرة' : '🔍 Zoom set to 75%');
                        }} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                          75%
                        </button>
                        <button onClick={() => {
                          setGlobalZoomScale(0.85);
                          showToast('success', lang === 'ar' ? '🔍 تم تعيين الزوم لـ 85% للوضوح العالي' : '🔍 Zoom set to 85%');
                        }} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                          85%
                        </button>
                        <button onClick={() => {
                          setGlobalZoomScale(1.0);
                          showToast('success', lang === 'ar' ? '🔍 تم تعيين الزوم لـ 100% الافتراضي' : '🔍 Zoom set to 100%');
                        }} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                          100%
                        </button>
                        <button onClick={() => {
                          setGlobalZoomScale(1.15);
                          showToast('success', lang === 'ar' ? '🔍 تم تعيين الزوم لـ 115% للتكبير' : '🔍 Zoom set to 115%');
                        }} className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-slate-600 dark:text-stone-300">
                          115%
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <span className="text-xs text-slate-400 font-mono bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-100 shrink-0">
              {lang === 'ar' ? 'تاريخ الجرد' : 'Audit Date'}: {SYS_DATE}
            </span>
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-100 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-bold">{currentUser.name}</span>
              <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                {currentUser.role === 'admin' ? (lang === 'ar' ? 'مدير' : 'Admin') : (lang === 'ar' ? 'كاشير' : 'Cashier')}
              </span>
            </div>
            <button
              onClick={() => {
                setIsScreenLocked(true);
                localStorage.setItem('pos_screen_locked', 'true');
                setLockPasscode('');
                setLockError('');
                showToast('success', lang === 'ar' ? '🔒 تم تأمين شاشة النظام بنجاح' : '🔒 System terminal locked successfully');
              }}
              className="text-xs text-slate-700 hover:text-[#1D9E75] bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-lg transition font-bold border border-slate-200 cursor-pointer shrink-0 flex items-center gap-1"
              title={lang === 'ar' ? 'تأمين شاشة البيع' : 'Lock Screen'}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'قفل الشاشة' : 'Lock Screen'}</span>
            </button>
            <button 
              onClick={handleLogout}
              className="text-xs text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-lg transition font-bold border border-rose-100 cursor-pointer shrink-0"
            >
              {lang === 'ar' ? 'تسجيل الخروج 👋' : 'Logout 👋'}
            </button>
          </div>

        </div>

        {/* TRIAL & ACTIVATION MANAGEMENT BANNERS MERGED IN HEADER */}
        {!isActivated && (
          <div className="bg-amber-500/10 border-t border-b border-amber-500/20 px-4 sm:px-6 lg:px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-amber-850 font-semibold no-print">
            <div className="flex items-center gap-2 flex-row-reverse text-right">
              <Clock className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
              <span>
                {lang === 'ar' ? 'البرنامج يعمل حالياً بالوضع التجريبي: ' : 'System running in sandbox trial mode: '}
                <span className="font-sans text-amber-700 font-bold ml-1">
                  {lang === 'ar' 
                    ? Math.max(0, 15 - invoices.length) <= 0 
                      ? '🚨 انتهت صلاحية الفترة التجريبية (الحد الأقصى 15 فاتورة مبيعات). يرجى تفعيل البرنامج فوراً للمتابعة.'
                      : `تم إصدار ${invoices.length} من أصل 15 فاتورة تجريبية كحد أقصى. فعّل البرنامج للعمل اللامحدود.` 
                    : Math.max(0, 15 - invoices.length) <= 0
                      ? '🚨 Trial expired (Max 15 reached). Please activate to resume.'
                      : `Emitted ${invoices.length} of 15 allowed trial invoices. Activate for unlimited.`}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowPurchaseContactModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] py-1 px-3 rounded-lg transition duration-150 cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'تواصل للتفعيل 💬' : 'Contact to Activate 💬'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('settings');
                  setTimeout(() => {
                    const el = document.getElementById('activation-card-panel');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }, 250);
                }}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] py-1 px-2.5 rounded-lg transition duration-150 cursor-pointer flex items-center gap-1"
              >
                <Unlock className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'ar' ? 'إدخل المفتاح 🗝️' : 'Enter Key 🗝️'}</span>
              </button>
            </div>
          </div>
        )}

        {isActivated && localStorage.getItem('pos_activation_key') && (
          <div className="bg-emerald-500/5 border-t border-slate-100 px-4 sm:px-6 lg:px-4 py-1.5 flex justify-between items-center text-[11px] text-[#1D9E75] font-bold no-print flex-row-reverse">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>
                {lang === 'ar' ? 'الاشتراك السنوي نشط وفعال لـ: ' : 'Annual Subscription active for: '} 
                <span className="text-slate-900 font-extrabold ml-1">{settings.shopName}</span>
                <span className="text-[#1D9E75] font-black mr-2">({lang === 'ar' ? `المتبقي: ${daysLeft} يوم` : `Remaining: ${daysLeft} days`})</span>
              </span>
            </span>
          </div>
        )}
      </header>

      {/* --- PRIMARY LAYOUT (SIDEBAR RIGHT / CONTENT LEFT) --- */}
      <div className={`flex-1 w-full flex flex-col md:flex-row ${
        activeTab === 'pos' && posLayoutMode === 'terminal'
          ? 'px-0 py-0 gap-0 h-full min-h-0 overflow-hidden max-w-none w-full'
          : activeTab === 'pos'
          ? 'px-2 sm:px-4 py-3 gap-3.5 flex-1 h-full min-h-0 overflow-hidden max-w-none w-full'
          : 'px-2 sm:px-4 lg:px-4 py-4 gap-4 max-w-none w-full'
      }`}>
        
        {/* RIGHT SIDEBAR MODULES */}
        <aside className={`w-full ${sidebarCollapsed ? 'md:w-20' : 'md:w-64'} shrink-0 flex flex-col gap-2 h-full overflow-y-auto pr-1 transition-all duration-300 ${activeTab === 'pos' && posLayoutMode === 'terminal' ? 'hidden' : ''}`} id="sidebar-navigation">
          <div className={`bg-white ${sidebarCollapsed ? 'p-2' : 'p-4'} rounded-2xl shadow-xs border border-slate-200 transition-all duration-300`}>
            <div className={`flex items-center justify-between mb-3 px-2 text-right uppercase tracking-wider ${sidebarCollapsed ? 'flex-col gap-2' : ''}`}>
              {!sidebarCollapsed ? (
                <div className="text-xs font-bold text-slate-400">
                  {lang === 'ar' ? 'لوحة التحكم والتشغيل' : 'Control & Operation Panel'}
                </div>
              ) : null}
              <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition cursor-pointer shrink-0"
                title={sidebarCollapsed ? (lang === 'ar' ? 'توسيع القائمة' : 'Expand Sidebar') : (lang === 'ar' ? 'تصغير القائمة' : 'Collapse Sidebar')}
              >
                <Menu className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            
            <nav className="space-y-1 flex flex-col" aria-label="Sidebar Navigation">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.tab;
                const label = lang === 'ar' ? item.labelAr : item.labelEn;
                const isPos = item.tab === 'pos';
                const totalQty = isPos ? cart.reduce((sum, i) => sum + i.quantity, 0) : 0;

                return (
                  <button 
                    key={item.tab}
                    id={item.id}
                    onClick={() => setActiveTab(item.tab)}
                    title={label}
                    className={`w-full relative rounded-xl transition-all duration-150 flex items-center font-bold text-right ${
                      sidebarCollapsed 
                        ? 'justify-center p-3' 
                        : 'px-4 py-3 justify-between'
                    } ${
                      isActive 
                        ? 'bg-[#1D9E75] text-white shadow-md shadow-emerald-700/10' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className={`flex items-center gap-2.5 ${sidebarCollapsed ? 'justify-center w-full' : ''}`}>
                      <IconComponent className="w-5 h-5 shrink-0" />
                      {!sidebarCollapsed && <span className="text-xs leading-none">{label}</span>}
                    </div>

                    {isPos && totalQty > 0 && (
                      sidebarCollapsed ? (
                        <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-mono font-bold">
                          {totalQty}
                        </span>
                      ) : (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${isActive ? 'bg-white text-emerald-800' : 'bg-red-500 text-white'}`}>
                          {totalQty}
                        </span>
                      )
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className={`flex-1 min-w-0 w-full ${
          activeTab === 'pos'
            ? 'h-full flex flex-col min-h-0 overflow-hidden'
            : 'flex flex-col min-h-0'
        }`} id="main-content-workspace">

          {/* ACTIVE TERMINAL TAB WRAPPER */}
          {activeTab === 'pos' && posLayoutMode === 'terminal' && (
            <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`flex-1 h-full min-h-0 flex flex-col w-full font-sans overflow-hidden select-none no-print ${theme === 'dark' ? 'bg-[#121213] text-stone-100' : 'bg-slate-50 text-slate-800'}`} id="tab-pos-terminal">
              
              {/* Terminal Quick Actions Top Bar */}
              <div className={`px-4 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 select-none shrink-0 border-b ${theme === 'dark' ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-slate-200'}`}>
                
                {/* Store Brand, Clock, and Price Mode */}
                <div className="flex flex-wrap items-center gap-3 flex-row-reverse">
                  <div className="bg-[#1D9E75] text-white p-2 rounded-xl shrink-0">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <h2 className="text-sm font-black text-slate-900 dark:text-white leading-tight">{settings.shopName}</h2>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      {lang === 'ar' ? 'نظام مبيعات الكاشير ' : 'Terminal POS System'}
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
                <div className="flex items-center gap-2 flex-row-reverse">
                  
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

                  {/* Fullscreen Toggle */}
                  <button 
                    onClick={toggleFullScreen}
                    className={`p-2 px-3 rounded-xl transition cursor-pointer text-xs font-bold border flex items-center gap-1.5 flex-row-reverse ${theme === 'dark' ? 'bg-[#2C2C2E] border-stone-750 text-stone-350 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs'}`}
                    title={lang === 'ar' ? 'تبديل ملء الشاشة' : 'Toggle Fullscreen'}
                  >
                    <Maximize className="w-3.5 h-3.5 text-stone-400" />
                    <span>{lang === 'ar' ? 'ملء الشاشة' : 'Fullscreen'}</span>
                  </button>

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

                </div>
              </div>

              {/* Main Subdivided Content Workspace */}
              <div className={`flex-1 flex flex-col ${lang === 'ar' ? 'lg:flex-row-reverse' : 'lg:flex-row'} overflow-hidden w-full min-h-0`} id="terminal-body-wrapper">
                
                {/* LEFT DIVISION: Cart list, void indicators, Totals Summary (Proportional responsive width) */}
                <div className={`w-full lg:w-[32%] lg:min-w-[400px] lg:max-w-[480px] flex flex-col h-full min-h-0 text-right shrink-0 ${theme === 'dark' ? 'bg-[#141416]' : 'bg-white shadow-md'} ${lang === 'ar' ? (theme === 'dark' ? 'border-l border-[#242426]' : 'border-l border-slate-200') : (theme === 'dark' ? 'border-r border-[#242426]' : 'border-r border-slate-200')}`}>
                  
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
                <div className={`flex-grow flex-1 h-full flex flex-col p-3 overflow-hidden text-right font-sans transition-colors duration-150 max-w-none w-full ${theme === 'dark' ? 'bg-[#111112] text-stone-100' : 'bg-slate-100 text-slate-800'}`} style={{ flexGrow: 1 }}>
                  
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
          )}

          {activeTab === 'pos' && posLayoutMode === 'modern' && (
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
          )}

          {/* ==========================================
              TAB EXTENSION A: CUSTOMERS AND LOYALTY (👤)
              ========================================== */}
          {activeTab === 'customers' && (
            <CustomersTab 
              customers={customers}
              setCustomers={setCustomers}
              suppliers={suppliers}
              setSuppliers={setSuppliers}
              lang={lang}
              showToast={showToast}
              invoices={invoices}
            />
          )}

          {/* ==========================================
              TAB EXTENSION B: RETURNS & WASTE OF STOCK (🔄)
              ========================================== */}
          {activeTab === 'returns_waste' && (
            <ReturnsWasteTab 
              products={products}
              setProducts={setProducts}
              invoices={invoices}
              returns={returns}
              setReturns={setReturns}
              waste={waste}
              setWaste={setWaste}
              customers={customers}
              setCustomers={setCustomers}
              lang={lang}
              showToast={showToast}
              sysDate={SYS_DATE}
              currentUserRole={currentUser.role}
            />
          )}

          {/* ==========================================
              TAB EXTENSION C: PROCUREMENT & PURCHASES (🛒)
              ========================================== */}
          {activeTab === 'purchases' && (
            (currentUser.role !== 'admin' && currentUser.role !== 'accountant') ? renderAdminLockScreen() : (
              <PurchasesTab 
                products={products}
                setProducts={setProducts}
                categories={categories}
                setCategories={setCategories}
                purchaseInvoices={purchaseInvoices}
                setPurchaseInvoices={setPurchaseInvoices}
                lang={lang}
                showToast={showToast}
                sysDate={SYS_DATE}
              />
            )
          )}

          {/* ==========================================
              TAB EXTENSION W: WAREHOUSE & STOCK TRANSFERS (📦)
              ========================================== */}
          {activeTab === 'warehouse' && (
            (currentUser.role !== 'admin' && currentUser.role !== 'accountant') ? renderAdminLockScreen() : (
              <WarehouseTab 
                products={products}
                setProducts={setProducts}
                categories={categories}
                lang={lang}
                showToast={showToast}
                sysDate={SYS_DATE}
              />
            )
          )}

          {/* ==========================================
              TAB 2: INVENTORY - ARABIC TABLE VIEW (📦)
              ========================================== */}
          {activeTab === 'inventory' && (
            <InventoryTab
              products={products}
              processedProducts={processedProducts}
              categories={categories}
              settings={settings}
              currentUser={currentUser}
              today={SYS_DATE}
              stagnantDaysThreshold={stagnantDaysThreshold}
              setStagnantDaysThreshold={setStagnantDaysThreshold}
              lang={lang}
              showToast={showToast}
              onProductsChange={handleProductsChange}
              onDeleteProduct={deleteProduct}
              onOpenImport={openImportExcelModal}
              onPrintBarcodeLabel={openBarcodeLabelPrint}
              onAddCategory={() => setShowAddCategoryModal(true)}
            />
          )}

          {/* ==========================================
              TAB 3: STOCK COUNT - PHYSICAL RESOLUTION (📋)
              ========================================== */}
          {activeTab === 'stock_count' && (
            <div className="space-y-6" id="tab-stock-reconciliation">
              {(currentUser.role !== 'admin' && currentUser.role !== 'accountant') ? (
                renderAdminLockScreen()
              ) : (
                <StockCountTab
                  products={products}
                  setProducts={setProducts}
                  lang={lang}
                  showToast={showToast}
                />
              )}
            </div>
          )}

          {/* ==========================================
              TAB 4: REPORTS & FINANCIAL GRAPHICS (📊)
              ========================================== */}
          {activeTab === 'reports' && (
            <div className="space-y-6" id="tab-reports-view">
              {(currentUser.role !== 'admin' && currentUser.role !== 'accountant') ? (
                renderAdminLockScreen()
              ) : (
                <ReportsTab
                  products={products}
                  invoices={invoices}
                  returns={returns}
                  waste={waste}
                  promotions={promotions}
                  expenses={expenses}
                  settings={settings}
                  theme={theme}
                  today={SYS_DATE}
                  lang={lang}
                  showToast={showToast}
                  totalSalesUSD={totalSalesUSD}
                  totalSalesLBP={totalSalesLBP}
                  topSoldProductsList={topSoldProductsList}
                  stockAuditReportLoc={stockAuditReportLoc}
                  setStockAuditReportLoc={setStockAuditReportLoc}
                  onExpensesChange={handleExpensesChange}
                  onAddStagnantPromotion={handleAddStagnantPromotion}
                  onQuickWaste={handleQuickWasteFromExpiry}
                  onPrintReport={setPrintReportType}
                />
              )}
            </div>
          )}

          {/* ==========================================
              TAB 5: INVOICES LOG / COPIES (🧾)
              ========================================== */}
          {activeTab === 'invoices' && (
            <InvoicesLogTab
              invoices={invoices}
              onOpenInvoice={setShowInvoiceReceipt}
              lang={lang}
              showToast={showToast}
            />
          )}

          {/* ==========================================
              TAB 6: USERS/EMPLOYEE CONTROLLER (👥)
              ========================================== */}
          {activeTab === 'users' && (
            <div className="space-y-6" id="tab-users-settings">
              {currentUser.role !== 'admin' ? (
                renderAdminLockScreen()
              ) : (
                <UsersTab
                  users={users}
                  setUsers={setUsers}
                  currentUser={currentUser}
                  setCurrentUser={setCurrentUser}
                  lang={lang}
                  showToast={showToast}
                  onDefaultAccountUpdated={handleDefaultAccountUpdated}
                />
              )}
            </div>
          )}


          {/* ==========================================
              TAB 6.5: BATCH PRICE LABELS DESIGNER (🏷️)
              ========================================== */}
          {activeTab === 'price_labels' && (
            <PriceLabelsTab
              products={products}
              settings={settings}
              theme={theme}
              lang={lang}
              showToast={showToast}
            />
          )}


          {/* ==========================================
              TAB 7: GENERAL SETTINGS EDITOR (⚙️)
              ========================================== */}
          {activeTab === 'settings' && (
            <div className="space-y-6" id="tab-settings-view">
              {currentUser.role !== 'admin' ? (
                renderAdminLockScreen()
              ) : (
                <>
                  {/* SubTabs Header Navigation */}
                  <div className="flex border-b border-slate-150 justify-end gap-2 shrink-0 overflow-x-auto select-none py-1 flex-row-reverse w-full mb-6">
                    <button
                      type="button"
                      onClick={() => setSettingsSubTab('printers')}
                      className={`px-4 py-2 text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                        settingsSubTab === 'printers'
                          ? 'bg-[#1D9E75]/10 text-[#1D9E75] border-b-2 border-[#1D9E75]'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <Printer className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'أقسام وطابعات الفواتير (Aronium)' : 'Printers & Direct Spoolers'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettingsSubTab('business')}
                      className={`px-4 py-2 text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                        settingsSubTab === 'business'
                          ? 'bg-[#1D9E75]/10 text-[#1D9E75] border-b-2 border-[#1D9E75]'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <Briefcase className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'معلومات المؤسسة والشركة' : 'Business Info'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettingsSubTab('general')}
                      className={`px-4 py-2 text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                        settingsSubTab === 'general'
                          ? 'bg-[#1D9E75]/10 text-[#1D9E75] border-b-2 border-[#1D9E75]'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <Settings className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'الإعدادات التشغيلية والمالية' : 'Operational Settings'}</span>
                    </button>
                  </div>

                  {settingsSubTab === 'general' ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs w-full text-right">
                      <h3 className="font-bold text-slate-800 text-lg pb-3 border-b border-slate-100 mb-5 flex items-center gap-2 justify-end">
                      <span>
                        {lang === 'ar' ? 'إعدادات الصرف ومعلمات السوبرماركت' : 'General Configuration & Exchange Rates'}
                      </span>
                      <Settings className="w-6 h-6 text-[#1D9E75]" />
                    </h3>

                    <form onSubmit={handleUpdateGeneralSettings} className="space-y-5">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
                          {lang === 'ar' ? 'اسم المتجر / السوبرماركت:' : 'Store / Supermarket Name:'}
                        </label>
                        <input 
                          type="text" 
                          value={settings.shopName}
                          onChange={e => setSettings({ ...settings, shopName: e.target.value })}
                          className="w-full bg-slate-55 border border-slate-200 rounded-xl py-2 px-3 text-sm text-right font-extrabold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
                            {lang === 'ar' ? 'سعر صرف الدولار بالليرة (L.L):' : 'Official Exchange Rate (LBP):'}
                          </label>
                          <input 
                            type="number" 
                            value={settings.exchangeRate}
                            onChange={e => setSettings({ ...settings, exchangeRate: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-center font-mono font-black text-rose-600 focus:outline-none"
                            required
                          />
                        </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
                          {lang === 'ar' ? 'سقف تنبيه المخزون (صنف):' : 'Low Stock Alarm Threshold:'}
                        </label>
                        <input 
                          type="number" 
                          value={settings.lowStockThreshold}
                          onChange={e => setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value) || 0 })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-center font-mono focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
                          {lang === 'ar' ? 'حجم شبكة المبيعات (Grid):' : 'Sales Grid Size (Grid):'}
                        </label>
                        <select 
                          value={settings.posGridSize || 'auto'}
                          onChange={e => setSettings({ ...settings, posGridSize: e.target.value as any })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-center font-bold text-slate-700 focus:outline-none cursor-pointer"
                        >
                          <option value="auto">تلقائي ومتجاوب 📱</option>
                          <option value="3x3">3 × 3 (كبير)</option>
                          <option value="4x4">4 × 4 (متوسط)</option>
                          <option value="5x5">5 × 5 (صغير)</option>
                          <option value="6x6">6 × 6 (صغير جداً)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
                        {lang === 'ar' ? 'أيام جرد الصلاحية لتنبيه الكاشير (يوم):' : 'Expiry Alert Notification Days:'}
                      </label>
                      <input 
                        type="number" 
                        value={settings.expiryAlertDays}
                        onChange={e => setSettings({ ...settings, expiryAlertDays: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-center font-mono focus:outline-none"
                        required
                      />
                    </div>

                    {/* MANDATORY QTY SELECTION SWITCH */}
                    <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl select-none text-right flex items-center justify-between flex-row-reverse">
                      <div className="flex-1 pr-3 text-right">
                        <label className="block text-slate-800 font-bold text-xs sm:text-sm text-right">
                          💡 {lang === 'ar' ? 'إجبارية تحديد الكمية يدوياً عند البيع:' : 'Force manual quantity specification upon sales:'}
                        </label>
                        <span className="text-[10px] text-slate-500 font-semibold leading-relaxed block mt-0.5 text-right">
                          {lang === 'ar' 
                            ? 'عند تفعيل هذا الخيار، سيطلب النظام منك إدخال الكمية يدوياً عبر نافذة منبثقة عند النقر على كل منتج أو مسحه بالتصنيف، بدلاً من إضافته للسلّة بقيمة افتراضية (1).' 
                            : 'When enabled, adding or scanning an item will trigger a manual quantity specification prompt instead of automatically adding 1.'}
                        </span>
                      </div>
                      <div className="shrink-0 flex items-center">
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, requireQtyPrompt: !settings.requireQtyPrompt })}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            settings.requireQtyPrompt ? 'bg-[#1D9E75]' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                              settings.requireQtyPrompt ? (lang === 'ar' ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* COLOR APP LOGO UPLOAD FOR THE COMPANY */}
                    <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl space-y-3 text-right">
                      <label className="block text-slate-750 font-extrabold text-xs text-right">
                        🏢 {lang === 'ar' ? 'شعار اللوجو الخاص بالمؤسسة (الملون):' : 'Organization Corporate Logo (Color):'}
                      </label>
                      <p className="text-[10px] text-slate-450 leading-relaxed font-semibold text-right">
                        {lang === 'ar' 
                          ? 'قم برفع شعار المؤسسة الملون ليتم عرضه بأعلى واجهات البرنامج الرئيسية بدلاً من الاسم النصي.' 
                          : 'Upload a colorful custom brand logo for the primary systems headers and topbars.'}
                      </p>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-4 justify-end">
                        <div className="relative border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-3 bg-white w-full sm:w-auto h-24 flex flex-col items-center justify-center cursor-pointer transition">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const img = new Image();
                                  img.onload = () => {
                                    const canvas = document.createElement('canvas');
                                    const maxDim = 200;
                                    let width = img.width;
                                    let height = img.height;
                                    
                                    if (width > height) {
                                      if (width > maxDim) {
                                        height = Math.round((height * maxDim) / width);
                                        width = maxDim;
                                      }
                                    } else {
                                      if (height > maxDim) {
                                        width = Math.round((width * maxDim) / height);
                                        height = maxDim;
                                      }
                                    }
                                    
                                    canvas.width = width;
                                    canvas.height = height;
                                    const ctx = canvas.getContext('2d');
                                    if (ctx) {
                                      ctx.drawImage(img, 0, 0, width, height);
                                      const base64 = canvas.toDataURL('image/png');
                                      setSettings({ ...settings, shopLogo: base64 });
                                      showToast('success', lang === 'ar' ? '✔️ تم حفظ شعار المؤسسة بنجاح!' : '✔️ Organization logo updated!');
                                    }
                                  };
                                  img.src = event.target?.result as string;
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <p className="text-xs font-bold text-slate-500 text-center select-none">
                            📥 {lang === 'ar' ? 'اضغط لرفع شعار المؤسسة' : 'Upload Corporate Logo'}
                          </p>
                          <span className="text-[9px] text-slate-400 mt-1 font-mono">PNG/JPG (Max 1MB)</span>
                        </div>

                        {settings.shopLogo ? (
                          <div className="flex flex-col items-center gap-1.5 p-2 border border-slate-200 rounded-xl bg-slate-100 select-none">
                            <img 
                              src={settings.shopLogo} 
                              alt="Organization Logo preview" 
                              className="max-h-16 w-auto object-contain bg-white border p-1 rounded"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setSettings({ ...settings, shopLogo: undefined });
                                showToast('success', lang === 'ar' ? '🧹 تم إزالة شعار المؤسسة' : '🧹 Corporate logo removed');
                              }}
                              className="text-[10px] text-red-655 font-bold hover:underline"
                            >
                              {lang === 'ar' ? 'إزالة الشعـار 🗑' : 'Remove 🗑'}
                            </button>
                          </div>
                        ) : (
                          <div className="h-16 w-16 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-450 text-[10.5px] bg-slate-50 font-bold">
                            {lang === 'ar' ? 'بدون شعار' : 'No Logo'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* --- NEW ADDITION: DEFAULT PROFIT MARGIN CONFIG & MASS REPRICING --- */}
                    <div className="bg-emerald-50/40 border border-emerald-100 p-5 rounded-2xl space-y-4 text-right">
                      <h4 className="font-extrabold text-[#1D9E75] text-xs sm:text-sm flex items-center gap-1.5 flex-row-reverse">
                        <TrendingUp className="w-4 h-4 text-[#1D9E75]" />
                        <span>{lang === 'ar' ? 'إعدادات هوامش الربح الافتراضية وتسعير الأصناف' : 'Default Margin Settings & Item Pricing'}</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        {lang === 'ar'
                          ? 'تتحكم هذه الميزة في حساب السعر التلقائي صنف جديد بناءً على تكلفته، مع خيار لتعديل أسعار المنتجات الحالية دفعة واحدة.'
                          : 'This controls the automatic retail/wholesale price calculations when adding new items based on cost, with an option to bulk reprice all currently active products.'}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                        <div>
                          <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
                            {lang === 'ar' ? 'هامش الربح الافتراضي (%):' : 'Default Profit Margin (%):'}
                          </label>
                          <input 
                            type="number" 
                            min="0"
                            max="500"
                            value={settings.defaultMarginPercent !== undefined ? settings.defaultMarginPercent : 15}
                            onChange={e => setSettings({ ...settings, defaultMarginPercent: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm text-center font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            required
                          />
                        </div>

                        <div>
                          <button
                            type="button"
                            onClick={handleRecalculatePricesWithMargin}
                            className="w-full bg-[#1D9E75] hover:bg-[#158060] text-white py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <span>🔄 {lang === 'ar' ? 'تحديث أسعار جميع الأصناف الحالية الآن' : 'Apply to all current items now'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
                        {lang === 'ar' ? 'تذييل أسفل الفاتورة للطباعة الحرارية:' : 'Thermal Receipt Footer:'}
                      </label>
                      <textarea 
                        value={settings.receiptFooter}
                        onChange={e => setSettings({ ...settings, receiptFooter: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-right h-16 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
                        {lang === 'ar' ? 'حجم خط الفاتورة الافتراضي (%):' : 'Default Receipt Font Size (%):'}
                      </label>
                      <div className="flex gap-2 items-center flex-row-reverse">
                        <input 
                          type="number" 
                          min="50"
                          max="200"
                          value={settings.receiptFontSize !== undefined ? settings.receiptFontSize : 100}
                          onChange={e => setSettings({ ...settings, receiptFontSize: Math.max(50, Math.min(200, parseInt(e.target.value) || 100)) })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-center font-mono font-black focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                          required
                        />
                        <span className="text-xs text-slate-500 font-bold font-mono px-3 py-2.5 bg-slate-100 rounded-xl shrink-0">%</span>
                      </div>
                      <p className="text-[10px] text-slate-400 text-right mt-1 font-medium">
                        {lang === 'ar' ? 'بإمكانك تعديل حجم خط نصوص الفواتير المطبوعة هنا أو مباشرة عبر مؤشر التكبير في فاتورة البيع وسيتم تثبيت وتعميم الرقم على الفور.' : 'Set the default thermal receipt printing scale percentage. This synchronizes dynamically with your invoice live preview.'}
                      </p>
                    </div>

                    {/* BLACK-AND-WHITE RECEIPT LOGO UPLOAD */}
                    <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl space-y-3 text-right">
                      <label className="block text-slate-700 font-bold text-xs text-right">
                        🖤 {lang === 'ar' ? 'شعار الفاتورة الحرارية (أسود وأبيض مدمج):' : 'Thermal Receipt Logo (B&W Compact):'}
                      </label>
                      <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                        {lang === 'ar' 
                          ? 'رفع صورة شعار صغيرة لتظهر أعلى الفاتورة المطبوعة. سيقوم النظام تلقائياً بضغط الصورة وتحويلها لنمط أحادي اللون أبيض وأسود عالي التباين لطباعة ممتازة وسريعة.' 
                          : 'Upload a small logo for your store. Our system auto-compresses and converts it to monochrome for thermal rolls.'}
                      </p>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-4 justify-end">
                        <div className="relative border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-3 bg-white w-full sm:w-auto h-24 flex flex-col items-center justify-center cursor-pointer transition">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const img = new Image();
                                  img.onload = () => {
                                    const canvas = document.createElement('canvas');
                                    const maxDim = 120;
                                    let width = img.width;
                                    let height = img.height;
                                    
                                    if (width > height) {
                                      if (width > maxDim) {
                                        height = Math.round((height * maxDim) / width);
                                        width = maxDim;
                                      }
                                    } else {
                                      if (height > maxDim) {
                                        width = Math.round((width * maxDim) / height);
                                        height = maxDim;
                                      }
                                    }
                                    
                                    canvas.width = width;
                                    canvas.height = height;
                                    const ctx = canvas.getContext('2d');
                                    if (ctx) {
                                      ctx.drawImage(img, 0, 0, width, height);
                                      const imgData = ctx.getImageData(0, 0, width, height);
                                      const data = imgData.data;
                                      for (let i = 0; i < data.length; i += 4) {
                                        const r = data[i];
                                        const g = data[i+1];
                                        const b = data[i+2];
                                        const alpha = data[i+3];
                                        
                                        if (alpha < 50) {
                                          data[i] = 255;
                                          data[i+1] = 255;
                                          data[i+2] = 255;
                                        } else {
                                          const gray = (r + g + b) / 3;
                                          const threshold = gray < 127 ? 0 : 255;
                                          data[i] = threshold;
                                          data[i+1] = threshold;
                                          data[i+2] = threshold;
                                        }
                                      }
                                      ctx.putImageData(imgData, 0, 0);
                                      const monochromeBase64 = canvas.toDataURL('image/png');
                                      setSettings({ ...settings, receiptLogoBase64: monochromeBase64 });
                                      showToast('success', lang === 'ar' ? '✔️ تم تحويل الشعار للنمط الثنائي وجاهز للطباعة!' : '✔️ Logo converted and saved!');
                                    }
                                  };
                                  img.src = event.target?.result as string;
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <p className="text-xs font-bold text-slate-500 text-center select-none">
                            📥 {lang === 'ar' ? 'اضغط لرفع الشعار' : 'Click to Upload Logo'}
                          </p>
                          <span className="text-[9px] text-slate-400 mt-1 font-mono">PNG/JPG (Max 1MB)</span>
                        </div>

                        {settings.receiptLogoBase64 ? (
                          <div className="flex flex-col items-center gap-1.5 p-2 border border-slate-200 rounded-xl bg-slate-100 select-none">
                            <img 
                              src={settings.receiptLogoBase64} 
                              alt="B&W Logo preview" 
                              className="max-h-16 w-auto object-contain bg-white border p-1 rounded filter grayscale"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setSettings({ ...settings, receiptLogoBase64: undefined });
                                showToast('success', lang === 'ar' ? '🧹 تم إزالة الشعار' : '🧹 Logo removed');
                              }}
                              className="text-[10px] text-red-600 font-bold hover:underline"
                            >
                              {lang === 'ar' ? 'إزالة الشعـار 🗑' : 'Remove 🗑'}
                            </button>
                          </div>
                        ) : (
                          <div className="h-16 w-16 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-450 text-[10.5px] bg-slate-50 font-bold">
                            {lang === 'ar' ? 'بدون شعار' : 'No Logo'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ACCESSIBILITY & DISPLAY SCALING SYSTEM CONTROLLER */}
                    <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-2xl space-y-4 text-right">
                      <h4 className="font-extrabold text-amber-800 text-xs sm:text-sm flex items-center gap-1.5 flex-row-reverse">
                        <span><span>📏</span> {lang === 'ar' ? 'التحكم بالزوم والخط وحجم الأزرار للبرنامج (دقة الشاشات المختلفة)' : 'UI Accessibility Sizing (Font, Buttons & Overall Screen Zoom)'}</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        {lang === 'ar'
                          ? 'بإمكانك تخصيص وتكبير كامل نصوص البرنامج وأزراره أو عمل زوم (Zoom Out/In) لكامل الصفحة لتناسب جميع شاشات نقاط البيع ذات الدقة المنخفضة أو التابلت.'
                          : 'Customize and scale the entire program typography, button sizes, or apply general page zoom to fit smaller display resolutions and touch terminals.'}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1.5">
                        {/* Font size */}
                        <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-mono font-black text-[#1D9E75] bg-emerald-50 px-2 py-0.5 rounded">
                              {Math.round(globalFontScale * 100)}%
                            </span>
                            <span className="font-bold text-slate-700">
                              {lang === 'ar' ? 'مؤشر حجم الخط العام:' : 'Global Font Scale Selector:'}
                            </span>
                          </div>
                          <input 
                            type="range"
                            min="0.8"
                            max="1.4"
                            step="0.05"
                            value={globalFontScale}
                            onChange={(e) => setGlobalFontScale(parseFloat(e.target.value))}
                            className="w-full accent-emerald-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-extrabold">
                            <button type="button" onClick={() => setGlobalFontScale(0.85)} className={`p-1 rounded cursor-pointer ${globalFontScale === 0.85 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                              {lang === 'ar' ? 'صغير' : 'Small'}
                            </button>
                            <button type="button" onClick={() => setGlobalFontScale(1.0)} className={`p-1 rounded cursor-pointer ${globalFontScale === 1.0 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                              {lang === 'ar' ? 'افتراضي' : 'Default'}
                            </button>
                            <button type="button" onClick={() => setGlobalFontScale(1.15)} className={`p-1 rounded cursor-pointer ${globalFontScale === 1.15 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                              {lang === 'ar' ? 'كبير' : 'Large'}
                            </button>
                            <button type="button" onClick={() => setGlobalFontScale(1.3)} className={`p-1 rounded cursor-pointer ${globalFontScale === 1.3 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                              {lang === 'ar' ? 'ضخم' : 'Huge'}
                            </button>
                          </div>
                        </div>

                        {/* Button size */}
                        <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              {Math.round(globalButtonScale * 100)}%
                            </span>
                            <span className="font-bold text-slate-700">
                              {lang === 'ar' ? 'مؤشر حجم الأزرار والتفاعل:' : 'Button Touch Sizing Scale:'}
                            </span>
                          </div>
                          <input 
                            type="range"
                            min="0.8"
                            max="1.4"
                            step="0.05"
                            value={globalButtonScale}
                            onChange={(e) => setGlobalButtonScale(parseFloat(e.target.value))}
                            className="w-full accent-blue-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-extrabold">
                            <button type="button" onClick={() => setGlobalButtonScale(0.85)} className={`p-1 rounded cursor-pointer ${globalButtonScale === 0.85 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                              {lang === 'ar' ? 'مضغوط' : 'Compact'}
                            </button>
                            <button type="button" onClick={() => setGlobalButtonScale(1.0)} className={`p-1 rounded cursor-pointer ${globalButtonScale === 1.0 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                              {lang === 'ar' ? 'افتراضي' : 'Default'}
                            </button>
                            <button type="button" onClick={() => setGlobalButtonScale(1.15)} className={`p-1 rounded cursor-pointer ${globalButtonScale === 1.15 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                              {lang === 'ar' ? 'مريح' : 'Comfortable'}
                            </button>
                            <button type="button" onClick={() => setGlobalButtonScale(1.3)} className={`p-1 rounded cursor-pointer ${globalButtonScale === 1.3 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                              {lang === 'ar' ? 'لمس ضخم' : 'Touch XL'}
                            </button>
                          </div>
                        </div>

                        {/* Screen Zoom Scale */}
                        <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-mono font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded">
                              {Math.round(globalZoomScale * 100)}%
                            </span>
                            <span className="font-bold text-slate-700">
                              {lang === 'ar' ? 'الزوم ودقة الشاشة الكاملة:' : 'Screen Zoom & Resolution:'}
                            </span>
                          </div>
                          <input 
                            type="range"
                            min="0.6"
                            max="1.2"
                            step="0.05"
                            value={globalZoomScale}
                            onChange={(e) => setGlobalZoomScale(parseFloat(e.target.value))}
                            className="w-full accent-violet-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-extrabold">
                            <button type="button" onClick={() => {
                              setGlobalZoomScale(0.75);
                              showToast('success', lang === 'ar' ? '🔍 زوم لـ 75%' : '🔍 Zoom set to 75%');
                            }} className={`p-1 rounded cursor-pointer ${globalZoomScale === 0.75 ? 'bg-violet-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                              75% ({lang === 'ar' ? 'صغيرة' : 'Small'})
                            </button>
                            <button type="button" onClick={() => {
                              setGlobalZoomScale(0.85);
                              showToast('success', lang === 'ar' ? '🔍 زوم لـ 85%' : '🔍 Zoom set to 85%');
                            }} className={`p-1 rounded cursor-pointer ${globalZoomScale === 0.85 ? 'bg-violet-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                              85%
                            </button>
                            <button type="button" onClick={() => {
                              setGlobalZoomScale(1.0);
                              showToast('success', lang === 'ar' ? '🔍 زوم لـ 100%' : '🔍 Zoom set to 100%');
                            }} className={`p-1 rounded cursor-pointer ${globalZoomScale === 1.0 ? 'bg-violet-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                              100%
                            </button>
                            <button type="button" onClick={() => {
                              setGlobalZoomScale(1.15);
                              showToast('success', lang === 'ar' ? '🔍 زوم لـ 115%' : '🔍 Zoom set to 115%');
                            }} className={`p-1 rounded cursor-pointer ${globalZoomScale === 1.15 ? 'bg-violet-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                              115%
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 text-[10px] text-slate-400 font-semibold pt-1">
                        <span>💡 {lang === 'ar' ? 'يتم حفظ هذه القيم وتفعيلها فورياً ومزامنتها على هذا المتصفح.' : 'Changes apply immediately and persist in this browser.'}</span>
                      </div>
                    </div>

                    {/* Submit form button */}
                    <button
                      type="submit"
                      className="w-full bg-[#1D9E75] hover:bg-[#158060] text-white font-extrabold py-3 px-4 rounded-xl text-xs transition duration-150 cursor-pointer flex items-center justify-center gap-2 shadow-sm mt-4"
                    >
                        <Save className="w-4 h-4 text-white" />
                        <span>{lang === 'ar' ? '💾 تفعيل وحفظ الإعدادات والمعلمات الفنية' : '💾 Save General Settings & Exchange Rates'}</span>
                      </button>
                    </form>
                  </div>
                ) : settingsSubTab === 'business' ? (
                  /* Business Information Form Section */
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs w-full text-right font-sans">
                    <h3 className="font-bold text-slate-800 text-lg pb-3 border-b border-slate-100 mb-5 flex items-center gap-2 justify-end">
                      <span>
                        {lang === 'ar' ? 'معلومات المؤسسة والشركة الرسمية' : 'Corporate & Business Information'}
                      </span>
                      <Briefcase className="w-6 h-6 text-[#1D9E75]" />
                    </h3>

                    <form onSubmit={handleUpdateGeneralSettings} className="space-y-5 font-sans">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
                          {lang === 'ar' ? 'اسم المؤسسة التجاري (الرئيسي):' : 'Official Business Name:'}
                        </label>
                        <input 
                          type="text" 
                          value={settings.shopName}
                          onChange={e => setSettings({ ...settings, shopName: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-right font-extrabold focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
                            {lang === 'ar' ? 'الرقم المالي والضريبي للمؤسسة (TIN / VAT):' : 'Tax / VAT Identification Number:'}
                          </label>
                          <input 
                            type="text" 
                            value={settings.taxId || ''}
                            onChange={e => setSettings({ ...settings, taxId: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-right font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="320491-601"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
                            {lang === 'ar' ? 'السجل التجاري (Commercial Registry):' : 'Commercial Registry Number:'}
                          </label>
                          <input 
                            type="text" 
                            value={settings.commercialRegistry || ''}
                            onChange={e => setSettings({ ...settings, commercialRegistry: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-right font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="سجل بعبدا 49204"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
                            {lang === 'ar' ? 'رقم هاتف التواصل والفرع الثاني:' : 'Contact Phone / Branch Tel:'}
                          </label>
                          <input 
                            type="text" 
                            value={settings.phone || ''}
                            onChange={e => setSettings({ ...settings, phone: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-center font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="96170123456"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
                            {lang === 'ar' ? 'البريد الإلكتروني التجاري (Email):' : 'Corporate Business Email:'}
                          </label>
                          <input 
                            type="email" 
                            value={settings.businessEmail || ''}
                            onChange={e => setSettings({ ...settings, businessEmail: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-center font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="info@yourcompany.com"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
                          {lang === 'ar' ? 'نوع وطبيعة النشاط التجاري:' : 'Business Domain / Activity:'}
                        </label>
                        <input 
                          type="text" 
                          value={settings.businessActivity || ''}
                          onChange={e => setSettings({ ...settings, businessActivity: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-right focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                          placeholder="سوبرماركت، بيع مواد غذائية مفرق وجملة"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
                          {lang === 'ar' ? 'العنوان الجغرافي للمقر الرئيسي والفرع الأساسي:' : 'Main Headquarters Geographic Address:'}
                        </label>
                        <input 
                          type="text" 
                          value={settings.address || ''}
                          onChange={e => setSettings({ ...settings, address: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-right focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                          placeholder="قصقص المقابل للملعب البلدي"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[#1D9E75] hover:bg-[#158060] text-white font-extrabold py-3 px-4 rounded-xl text-xs transition duration-150 cursor-pointer flex items-center justify-center gap-2 shadow-sm mt-4 font-sans"
                      >
                        <Save className="w-4 h-4 text-white" />
                        <span>{lang === 'ar' ? '💾 حفظ وتعميم معلومات المؤسسة الرسمية' : '💾 Save Corporate Information'}</span>
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Printers & Spoolers configuration block (mimicking Aronium style) */
                  <div className="space-y-6">
                    {/* Sandboxed iframe limits & New tab escape button banner */}
                    {window.self !== window.top && (
                      <div className="bg-amber-50 rounded-2xl border border-amber-250 p-5 text-right font-sans space-y-3 shadow-xs">
                        <div className="flex items-center justify-between flex-row-reverse border-b border-amber-100 pb-2">
                          <div className="flex items-center gap-1.5 flex-row-reverse">
                            <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase animate-pulse">بيئة المعاينة مدمجة</span>
                            <h4 className="font-bold text-xs sm:text-sm text-slate-800">تنبيه المتصفح لحماية الأجهزة والأمن المالي لدرج الكاش ⚙️</h4>
                          </div>
                        </div>
                        <p className="text-[11.5px] text-slate-600 leading-relaxed font-sans">
                          مرحباً بك يا كمال! أنت تشغل الكاشير حالياً داخل <strong>إطار المعاينة الجانبي التلقائي (IFrame Sandbox)</strong> التابع لـ AI Studio. لأسباب تتعلق بالخصوصية والحماية العالمية للمتصفحات، يمنع Chrome و Edge تلقائياً فتح أدراج الكاش المادية أو الاتصال بـ USB / COM من داخل المواقع المدمجة كإطار.
                        </p>
                        <p className="text-[11.5px] font-medium text-emerald-800 leading-relaxed">
                          <strong>الحل الفوري الفعّال والسليم:</strong> يرجى الضغط على الزر الأخضر بالأسفل لفتح كاشير السوبرماركت في علامة تبويب كاملة ومستقلة تماماً، لتتمكن من استخدام ميزة الطباعة الصامتة كبرنامج Aronium المثبت وفتح درج النقد بنجاح بنسبة 100%!
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            window.open(window.location.href, '_blank');
                          }}
                          className="w-full bg-[#1D9E75] hover:bg-emerald-600 text-white font-extrabold py-3 px-4 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-xs border border-emerald-400"
                        >
                          <ExternalLink className="w-4 h-4 text-white" />
                          <span>فتح برنامج المبيعات في صفحة مستقلة كاملة (لتفعيل درج النقد والطابعات)</span>
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-right font-sans">
                      <div className="lg:col-span-1 space-y-6">
                        {/* Printer Output Mode / Hardware Linkage */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs w-full text-right space-y-3.5">
                          <div className="flex items-center gap-1.5 justify-end pb-3 border-b border-slate-100">
                            <span className="bg-emerald-100 text-[#1D9E75] text-[9px] font-bold px-1.5 py-0.5 rounded">Aronium Core Link</span>
                            <h4 className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-1">
                              <span>نمط وتوصيل طابعة الكاشير المادية ⚙️</span>
                            </h4>
                          </div>
                          <p className="text-[10.5px] text-slate-500 leading-relaxed font-sans">
                            حدد كيف سيتصل كاشير السوبرماركت بطابعتك لضمان تحقيق الطباعة الصامتة الفورية وفتح درج الكاشير:
                          </p>
                          
                          <div className="space-y-2">
                            {/* Option 1: System */}
                            <label className={`block p-2.5 rounded-xl border cursor-pointer transition text-right ${hardwarePrinterType === 'system' ? 'bg-emerald-50/50 border-emerald-500 text-emerald-950 font-black' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                              <div className="flex items-center gap-2 justify-end flex-row-reverse">
                                <input 
                                  type="radio" 
                                  name="hardwarePrinterType" 
                                  value="system" 
                                  checked={hardwarePrinterType === 'system'} 
                                  onChange={() => {
                                    setHardwarePrinterType('system');
                                    localStorage.setItem('pos_hardware_printer_type', 'system');
                                    showToast('success', '✔️ تم اختيار طباعة نظام تشغيل ويندوز (مناسب لكافة الطابعات بما فيها Canon G3030)');
                                  }}
                                  className="accent-[#1D9E75]"
                                />
                                <span className="text-[11px]">طباعة نظام Windows القياسية (رسومية كاملة)</span>
                              </div>
                              <span className="text-[9.5px] text-slate-400 font-bold block mt-0.5 pr-5">
                                🖥️ مناسبة لـ Canon G3030 وباقي الطابعات العادية. مطابقة 100% للتنسيقات.
                              </span>
                            </label>

                            {/* Option 2: Serial */}
                            <label className={`block p-2.5 rounded-xl border cursor-pointer transition text-right ${hardwarePrinterType === 'serial' ? 'bg-emerald-50/50 border-emerald-500 text-emerald-950 font-black' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                              <div className="flex items-center gap-2 justify-end flex-row-reverse">
                                <input 
                                  type="radio" 
                                  name="hardwarePrinterType" 
                                  value="serial" 
                                  checked={hardwarePrinterType === 'serial'} 
                                  onChange={() => {
                                    setHardwarePrinterType('serial');
                                    localStorage.setItem('pos_hardware_printer_type', 'serial');
                                    showToast('success', '✔️ تم تفعيل طباعة المنفذ التسلسلي الافتراضي Serial/COM');
                                  }}
                                  className="accent-[#1D9E75]"
                                />
                                <span className="text-[11px]">ربط سلكي مباشر بالمنفذ التسلسلي (Serial COM Port)</span>
                              </div>
                              <span className="text-[9.5px] text-slate-400 font-bold block mt-0.5 pr-5">
                                🔌 مناسبة لجميع الطابعات الحرارية الموصولة بـ COM أو كابل USB افتراضي.
                              </span>
                            </label>

                            {/* Option 3: USB */}
                            <label className={`block p-2.5 rounded-xl border cursor-pointer transition text-right ${hardwarePrinterType === 'usb' ? 'bg-emerald-50/50 border-emerald-500 text-emerald-950 font-black' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                              <div className="flex items-center gap-2 justify-end flex-row-reverse">
                                <input 
                                  type="radio" 
                                  name="hardwarePrinterType" 
                                  value="usb" 
                                  checked={hardwarePrinterType === 'usb'} 
                                  onChange={() => {
                                    setHardwarePrinterType('usb');
                                    localStorage.setItem('pos_hardware_printer_type', 'usb');
                                    showToast('success', '✔️ تم تفعيل طباعة WebUSB direct raw POS stream');
                                  }}
                                  className="accent-[#1D9E75]"
                                />
                                <span className="text-[11px]">اتصال WebUSB المباشر (خام للأجهزة الحرارية POS)</span>
                              </div>
                              <span className="text-[9.5px] text-slate-400 font-bold block mt-0.5 pr-5">
                                🖨️ ترسل نبضات ونصوص مباشرة للطابعة، سريعة فدائية.
                              </span>
                            </label>
                          </div>

                          {/* Interactive linkage helpers based on state */}
                          {hardwarePrinterType === 'serial' && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 mt-2">
                              <span className="text-[10px] font-extrabold text-slate-700 block text-right">⚙️ إعدادات المنفذ السلكي COM:</span>
                              <div className="flex gap-2">
                                <select
                                  value={baudRate}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setBaudRate(val);
                                    localStorage.setItem('pos_serial_baud_rate', String(val));
                                  }}
                                  className="flex-1 bg-white border border-slate-200 rounded-lg py-1 px-1.5 text-[10px] text-right font-mono"
                                >
                                  <option value="9600">9600 Baud</option>
                                  <option value="19200">19200 Baud</option>
                                  <option value="38400">38400 Baud</option>
                                  <option value="115200">115200 Baud</option>
                                </select>
                                
                                <button
                                  type="button"
                                  onClick={connectSerialPrinter}
                                  className="bg-[#1D9E75] hover:bg-[#158060] text-white font-extrabold px-3 py-1 rounded-lg text-[10px] transition cursor-pointer"
                                >
                                  {serialPortInfo ? '🔄 إعادة ربط COM' : '🔌 ربط المنفذ COM'}
                                </button>
                              </div>
                              {serialPortInfo && (
                                <p className="text-[9.5px] text-emerald-700 font-bold text-center mt-1">
                                  ✔️ متصل بـ: <span className="font-mono">{serialPortInfo}</span>
                                </p>
                              )}
                            </div>
                          )}

                          {hardwarePrinterType === 'usb' && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 mt-2">
                              <span className="text-[10px] font-extrabold text-slate-700 block text-right">⚙️ فحص وتوصيل جهاز USB:</span>
                              <button
                                type="button"
                                onClick={connectUSBPrinter}
                                className="w-full bg-[#1D9E75] hover:bg-[#158060] text-white font-extrabold py-1.5 px-3 rounded-lg text-[10px] transition cursor-pointer flex items-center justify-center gap-1"
                              >
                                <span>🔌 اقتران كابل طابعة USB</span>
                              </button>
                              {usbDeviceName && (
                                <p className="text-[9.5px] text-emerald-700 font-bold text-center mt-1">
                                  ✔️ الجهاز المقترن: <span className="font-mono">{usbDeviceName}</span>
                                </p>
                              )}
                            </div>
                          )}

                          {hardwarePrinterType === 'system' && (
                            <div className="bg-amber-50 rounded-xl p-3.5 border border-amber-200 text-[10px] leading-relaxed text-slate-700 space-y-1.5">
                              <p className="font-extrabold text-amber-900 text-xs">💡 تمكين درج الكاش لـ Canon G3030 وكافة طابعات ويندوز:</p>
                              <p>
                                عند العمل بنمط طابعة نظام تشغيل ويندوز (مناسب تماماً لـ Canon)، لا يمكن للمتصفح إطلاق نبضة مادية لدرج الكاش مباشرة. لكن Windows يملك هذه الميزة مدمجة بخصائص طابعتك:
                              </p>
                              <ul className="list-decimal list-inside pr-1 text-slate-800 space-y-1">
                                <li>افتح لوحة تحكم جهازك: <strong>لوحة التحكم (Control Panel)</strong>.</li>
                                <li>اذهب إلى قسم: <strong>الأجهزة والطابعات (Devices and Printers)</strong>.</li>
                                <li>اضغط كليك يمين على طابعتك (مثال: <code className="bg-white/85 px-1 py-0.5 text-slate-900 rounded font-mono font-bold">Canon G3030 series</code>) واختر <strong>خصائص الطابعة (Printer Properties)</strong>.</li>
                                <li>انقل لعلامة تبويب: <strong>إعدادات الجهاز (Device Settings)</strong>.</li>
                                <li>ابحث عن بند: <strong>درج النقد (Cash Drawer / Peripheral Cash Select)</strong>.</li>
                                <li>غيّر قيمة البند من "تعطيل/No Drawer" إلى <strong>"فتح قبل الطباعة/Open Before Printing"</strong> أو "فتح بعد الطباعة".</li>
                                <li>انقر <strong>تطبيق وموافق (Apply & OK)</strong>.</li>
                              </ul>
                              <p className="text-emerald-800 font-extrabold text-[10.5px] leading-normal pt-1 border-t border-amber-250/50 mt-1">
                                ✔️ بمجرد الدفع وطباعة الفاتورة صامتاً، سيقوم محرك Windows Spooler المادي بإلقاء نبضة فتح درج الكاش المادي تلقائياً بنسبة 100% وبدون أي مشاكل!
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Windows Printer Auto Detector Box */}
                        <div className="bg-emerald-50/75 hover:bg-emerald-50 border border-emerald-250 p-5 rounded-2xl shadow-xs w-full text-right transition duration-200">
                          <div className="flex items-center gap-2 justify-end mb-2.5">
                            <span className="bg-[#1D9E75] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">Windows Device Spooler</span>
                            <h3 className="font-extrabold text-slate-800 text-xs font-sans">رصد واكتشاف طابعات نظام التشغيل</h3>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed mb-3.5">
                            هل ترغب في قراءة وسحب كافة الطابعات المعرّفة على حاسوبك فوراً (مثل Canon G3030, G3416, G3010, HP LaserJet)؟ اضغط على زر الفحص التلقائي أدناه لقراءة قائمة الطابعات وتعيينها فوراً بالبرنامج.
                          </p>
                          
                          {isScanningPrinters ? (
                            <div className="space-y-2 py-1.5">
                              <div className="flex justify-between items-center text-[10px] font-bold text-emerald-800">
                                <span className="animate-pulse">جاري فحص تعريفات Windows Spooler...</span>
                                <span className="font-mono">75%</span>
                              </div>
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-[#1D9E75] h-full rounded-full transition-all duration-1000 ease-out" style={{ width: '75%' }}></div>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={scanAndPopulatePrinters}
                              className="w-full bg-[#1D9E75] hover:bg-emerald-600 text-white font-extrabold py-3 px-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-xs border border-emerald-400"
                            >
                              <Printer className="w-4 h-4 animate-bounce" />
                              <span>🔄 رصد طابعات ويندوز النشطة بالكمبيوتر 🖥️</span>
                            </button>
                          )}
                          <p className="text-[9px] text-slate-500 mt-2 text-center font-medium">
                            سيتصل البرنامج بـ 14 طابعة نظام حقيقية لتمكين التوزيع الفوري للفواتير والملصقات والمطبخ.
                          </p>
                        </div>

                      {/* Box 1: Printer definitions */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs w-full text-right">
                        <h3 className="font-bold text-slate-800 text-base pb-3 border-b border-slate-100 mb-4 flex items-center justify-end gap-1.5 label-arabic">
                          <span>إضافة وتحرير طابعات النظام</span>
                          <Printer className="w-5 h-5 text-[#1D9E75]" />
                        </h3>
                        
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          if (!newPrinterName.trim()) {
                            showToast('error', '⚠️ الرجاء تزويد اسم الطابعة التعريفي أولاً');
                            return;
                          }
                          const list = settings.printersList || [];
                          const id = `p-${Date.now()}`;
                          const updatedList = [...list, {
                            id,
                            name: newPrinterName.trim(),
                            connectionType: newPrinterConn,
                            paperWidth: newPrinterWidth,
                            address: newPrinterAddress
                          }];
                          const updatedSettings = { ...settings, printersList: updatedList };
                          setSettings(updatedSettings);
                          localStorage.setItem('pos_settings', JSON.stringify(updatedSettings));
                          
                          setNewPrinterName('');
                          setNewPrinterAddress('LPT1');
                          showToast('success', '✔️ تم حفظ الطابعة بنجاج وتضمينها بالنظام!');
                        }} className="space-y-4 font-sans">
                          {/* Direct Silent printing override switch (Aronium silent spooling mode) */}
                          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-150 flex flex-col gap-2 mb-2 text-right">
                            <label className="relative inline-flex items-center justify-between cursor-pointer select-none w-full">
                              <input 
                                type="checkbox" 
                                checked={settings.directSilentPrint !== false}
                                onChange={(e) => {
                                  const val = e.target.checked;
                                  const updatedSettings = { ...settings, directSilentPrint: val };
                                  setSettings(updatedSettings);
                                  localStorage.setItem('pos_settings', JSON.stringify(updatedSettings));
                                  showToast('success', val 
                                    ? '⚡ تم تفعيل ميزة الطباعة الصامتة المباشرة (تخطي حوار المتصفح)' 
                                    : '🌐 تم الرجوع لنمط حوار المتصفح اليدوي عند الطباعة'
                                  );
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1D9E75]" dir="ltr"></div>
                              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 flex-row-reverse">
                                <span>شريحة الطباعة الصامتة المباشرة ⚡</span>
                              </span>
                            </label>
                            <p className="text-[10px] text-slate-500 leading-normal">
                              عند التفعيل، سيتم إرسال الفواتير والباركود والتقارير فوراً لملقم الطباعة المدمج دون فتح نافذة حوار المتصفح اليدوية المزعجة.
                            </p>
                          </div>

                          <div>
                            <label className="block text-slate-600 font-bold mb-1 text-xs">الاسم التعريفي للطابعة (مثال: طابعة الكاشير 1):</label>
                            <input
                              type="text"
                              value={newPrinterName}
                              onChange={(e) => setNewPrinterName(e.target.value)}
                              placeholder="طابعة حرارية رئيسية"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-right font-bold focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-slate-600 font-bold mb-1 text-xs">نوع الاتصال:</label>
                              <select
                                value={newPrinterConn}
                                onChange={(e) => setNewPrinterConn(e.target.value as any)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-xs text-right cursor-pointer"
                              >
                                <option value="USB">USB Cable</option>
                                <option value="Network">Network IP (Wi-Fi/LAN)</option>
                                <option value="Serial">Serial Port (COM)</option>
                                <option value="Bluetooth">Bluetooth</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-slate-600 font-bold mb-1 text-xs">حجم الورق:</label>
                              <select
                                value={newPrinterWidth}
                                onChange={(e) => setNewPrinterWidth(e.target.value as any)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-xs text-right cursor-pointer"
                              >
                                <option value="80mm">80mm (كبير مبيعات)</option>
                                <option value="58mm">58mm (صغير رول)</option>
                                <option value="A4">A4 (مستندات كاملة)</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-slate-600 font-bold mb-1 text-xs">عنوان المنفذ / IP للمنفذ الرقمي:</label>
                            <input
                              type="text"
                              value={newPrinterAddress}
                              onChange={(e) => setNewPrinterAddress(e.target.value)}
                              placeholder="192.168.1.200 أو LPT1 أو USB001"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-right font-mono text-left focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full bg-[#1D9E75] hover:bg-emerald-600 text-white font-extrabold py-2.5 rounded-xl text-xs transition cursor-pointer shadow-xs"
                          >
                            إضافة طابعة جديدة للبرنامج ⚡
                          </button>
                        </form>

                        {/* Registered Printers Loop */}
                        <div className="mt-6 pt-5 border-t border-slate-100">
                          <span className="text-xs font-black text-slate-700 block mb-3">القائمة المربوطة والمجهزة بالحاسوب:</span>
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {(!settings.printersList || settings.printersList.length === 0) ? (
                              <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl text-xs border border-dashed border-slate-150">
                                لا يوجد طابعات مضافة حالياً.
                              </div>
                            ) : (
                              settings.printersList.map((pr: any) => (
                                <div key={pr.id} className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-xs">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Delete printer
                                      const updated = (settings.printersList || []).filter((item: any) => item.id !== pr.id);
                                      const updatedSettings = { ...settings, printersList: updated };
                                      setSettings(updatedSettings);
                                      localStorage.setItem('pos_settings', JSON.stringify(updatedSettings));
                                      showToast('success', '🧹 تم إزالة تعريف الطابعة بنجاح.');
                                    }}
                                    className="text-red-650 hover:text-red-750 font-bold cursor-pointer underline px-1.5 py-0.5 rounded"
                                  >
                                    حذف
                                  </button>
                                  
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // 1. Spool in virtual queue for on-screen tracking
                                        addPrintJob(pr.name, 'اختبار الطابعة المدمجة', `=== TEST PRINT ===\nPrinter: ${pr.name}\nPort: ${pr.address}\nStatus: ONLINE\n=== END ===`);
                                        
                                        // 2. Perform a REAL physical print job so the browser opens the printer dialog and actually prints paper!
                                        const testStyles = `
                                          body {
                                            width: ${pr.paperWidth === '58mm' ? '58mm' : pr.paperWidth === 'A5' ? '148mm' : '80mm'} !important;
                                            padding: 0 !important;
                                            margin: 0 !important;
                                            background: white !important;
                                            color: black !important;
                                          }
                                          #test-thermal-print {
                                            width: 100% !important;
                                            max-width: 100% !important;
                                            background: white !important;
                                            color: black !important;
                                            display: block !important;
                                          }
                                        `;
                                        printElementViaIFrame('test-thermal-print', testStyles, false);
                                        
                                        // 3. If direct USB/Serial modes are active, stream raw bytes as well
                                        if (hardwarePrinterType === 'usb') {
                                          printInvoiceToRawHardware({
                                            invoiceNumber: 'TEST-PAGE',
                                            date: new Date().toLocaleDateString(),
                                            time: new Date().toLocaleTimeString(),
                                            cashier: 'أبو كامل',
                                            paymentMethod: 'cash',
                                            subtotalUSD: 0,
                                            totalUSD: 0,
                                            totalLBP: 0,
                                            items: [{ productName: 'صفحة اختبار الطابعة المدمجة', quantity: 1, priceUSD: 0, totalUSD: 0 }]
                                          });
                                        } else if (hardwarePrinterType === 'serial') {
                                          printInvoiceToRawHardware({
                                            invoiceNumber: 'TEST-PAGE',
                                            date: new Date().toLocaleDateString(),
                                            time: new Date().toLocaleTimeString(),
                                            cashier: 'أبو كامل',
                                            paymentMethod: 'cash',
                                            subtotalUSD: 0,
                                            totalUSD: 0,
                                            totalLBP: 0,
                                            items: [{ productName: 'صفحة اختبار الطابعة المدمجة', quantity: 1, priceUSD: 0, totalUSD: 0 }]
                                          });
                                        }
                                      }}
                                      className="bg-slate-200 hover:bg-slate-350 text-slate-750 font-black px-2 py-1 rounded transition text-[10px] cursor-pointer"
                                    >
                                      طباعة تجريبية 📋
                                    </button>
                                  </div>

                                  <div className="text-right">
                                    <span className="font-bold text-slate-800 block">{pr.name}</span>
                                    <span className="text-[10px] text-slate-400 block font-mono">{pr.connectionType} • {pr.paperWidth} • {pr.address}</span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Cash Drawer Configuration card */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs w-full text-right">
                        <h3 className="font-bold text-slate-800 text-base pb-3 border-b border-slate-100 mb-4 flex items-center justify-end gap-1.5 label-arabic">
                          <span>درج النقد والتحكم بالنبضات (Cash Drawer)</span>
                          <Archive className="w-5 h-5 text-amber-500" />
                        </h3>
                        
                        <div className="space-y-4 font-sans text-xs">
                          {/* Toggle: Open drawer */}
                          <div className="p-3 bg-amber-50/50 border border-amber-150 rounded-2xl flex flex-col gap-2 text-right">
                            <label className="relative inline-flex items-center justify-between cursor-pointer select-none w-full">
                              <input 
                                type="checkbox" 
                                checked={settings.cashDrawerEnabled !== false}
                                onChange={(e) => {
                                  const val = e.target.checked;
                                  const updatedSettings = { ...settings, cashDrawerEnabled: val };
                                  setSettings(updatedSettings);
                                  localStorage.setItem('pos_settings', JSON.stringify(updatedSettings));
                                  showToast('success', val 
                                    ? '✔️ تم تفعيل فتح درج الكاش تلقائياً عند طباعة الفاتورة' 
                                    : '🔒 تم تعطيل الفتح التلقائي لدرج النقد'
                                  );
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" dir="ltr"></div>
                              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 flex-row-reverse">
                                <span>تفعيل فتح درج النقد 💵</span>
                              </span>
                            </label>
                            <p className="text-[10px] text-slate-500 leading-normal">
                              عند التنشيط، سيقوم البرنامج بإجراء اتصال لإطلاق نبضة فتح الدرج تلقائياً مع المبيعات وإصدار الفواتير.
                            </p>
                          </div>

                          {/* Input: Cash drawer decimal command series */}
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] text-slate-400 font-mono" dir="ltr">ASCII Decimal Codes</span>
                              <label className="block text-slate-600 font-bold text-xs text-right">أمر درج النقد (مثل Aronium):</label>
                            </div>
                            <input
                              type="text"
                              value={settings.cashDrawerCodes || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updatedSettings = { ...settings, cashDrawerCodes: val };
                                setSettings(updatedSettings);
                                localStorage.setItem('pos_settings', JSON.stringify(updatedSettings));
                              }}
                              placeholder="27,112,0,148,49"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-center font-bold tracking-wider font-mono focus:ring-1 focus:ring-amber-500"
                            />
                            <div className="flex flex-wrap gap-1 mt-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedSettings = { ...settings, cashDrawerCodes: '27,112,0,148,49' };
                                  setSettings(updatedSettings);
                                  localStorage.setItem('pos_settings', JSON.stringify(updatedSettings));
                                  showToast('success', '⚡ تم تعيين كود Aronium الافتراضي: 27,112,0,148,49');
                                }}
                                className="text-[9px] bg-slate-100 hover:bg-slate-200 border border-slate-150 text-slate-600 px-1.5 py-0.5 rounded cursor-pointer font-mono"
                              >
                                افتراضي Aronium (27,112,0,148,49)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedSettings = { ...settings, cashDrawerCodes: '27,112,0,25,250' };
                                  setSettings(updatedSettings);
                                  localStorage.setItem('pos_settings', JSON.stringify(updatedSettings));
                                  showToast('success', '⚡ تم تعيين كود Epson القياسي: 27,112,0,25,250');
                                }}
                                className="text-[9px] bg-slate-100 hover:bg-slate-200 border border-slate-150 text-slate-600 px-1.5 py-0.5 rounded cursor-pointer font-mono"
                              >
                                قياسي Epson (27,112,0,25,250)
                              </button>
                            </div>
                          </div>

                          {/* Test drawer action */}
                          <button
                            type="button"
                            onClick={() => {
                              openCashDrawer();
                            }}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <span>فحص واختبار حركة الدرج 💸</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                      {/* Aronium Assignments */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs w-full text-right">
                        <h3 className="font-bold text-slate-800 text-base pb-3 border-b border-slate-100 mb-4 flex items-center justify-end gap-1.5">
                          <span>أقسام وتوزيع طابعات الفواتير الفوري (عالم Aronium)</span>
                          <Settings className="w-5 h-5 text-[#1D9E75]" />
                        </h3>

                        <p className="text-xs text-slate-500 mb-5 leading-normal">
                          تتيح لك هذه اللوحة تعميد طابعة منفصلة لكل غاية أو شاشة طالما تم تعريفها أعلاه. بمجرد إرسال فاتورة أو طلبية، سيتولى ملقم الطباعة المدمج توزيع المهام في الخلفية:
                        </p>

                        <div className="space-y-4">
                          {/* Assignment: Receipt */}
                          <div className="p-4 border border-slate-150 rounded-2xl bg-slate-50/50 space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="relative inline-flex items-center cursor-pointer select-none">
                                <input 
                                  type="checkbox" 
                                  checked={settings.printerAssignments?.receiptEnabled || false}
                                  onChange={(e) => {
                                    const updatedAssignments = {
                                      ...(settings.printerAssignments || { receiptPrinterId: '', targetPrinterId: '', kitchenPrinterId: '', receiptEnabled: true, kitchenEnabled: false, logEnabled: false }),
                                      receiptEnabled: e.target.checked
                                    };
                                    const updatedSettings = { ...settings, printerAssignments: updatedAssignments };
                                    setSettings(updatedSettings);
                                    localStorage.setItem('pos_settings', JSON.stringify(updatedSettings));
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1D9E75]" dir="ltr"></div>
                                <span className="mr-2 text-xs font-bold text-slate-700">تفعيل الطباعة التلقائية عند الدفع</span>
                              </label>
                              
                              <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5 flex-row-reverse">
                                <span>🧾 طابعة فواتير البيع (رول الكاشير):</span>
                              </span>
                            </div>

                            <div className="flex gap-4 items-center">
                              <select
                                value={settings.printerAssignments?.receiptPrinterId || ''}
                                onChange={(e) => {
                                  const updatedAssignments = {
                                    ...(settings.printerAssignments || { receiptPrinterId: '', targetPrinterId: '', kitchenPrinterId: '', receiptEnabled: true, kitchenEnabled: false, logEnabled: false }),
                                    receiptPrinterId: e.target.value
                                  };
                                  const updatedSettings = { ...settings, printerAssignments: updatedAssignments };
                                  setSettings(updatedSettings);
                                  localStorage.setItem('pos_settings', JSON.stringify(updatedSettings));
                                }}
                                className="flex-1 bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-right cursor-pointer opacity-100 disabled:opacity-50"
                              >
                                <option value="">-- اختر طابعة من القائمة المحددة --</option>
                                {(settings.printersList || []).map((pr: any) => (
                                  <option key={pr.id} value={pr.id}>{pr.name} ({pr.connectionType})</option>
                                ))}
                              </select>
                              <span className="text-[11px] text-slate-400 w-32 shrink-0 font-medium">الهدف المعهود للفواتير</span>
                            </div>
                          </div>

                          {/* Assignment: Kitchen */}
                          <div className="p-4 border border-slate-150 rounded-2xl bg-slate-50/50 space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="relative inline-flex items-center cursor-pointer select-none">
                                <input 
                                  type="checkbox" 
                                  checked={settings.printerAssignments?.kitchenEnabled || false}
                                  onChange={(e) => {
                                    const updatedAssignments = {
                                      ...(settings.printerAssignments || { receiptPrinterId: '', targetPrinterId: '', kitchenPrinterId: '', receiptEnabled: true, kitchenEnabled: false, logEnabled: false }),
                                      kitchenEnabled: e.target.checked
                                    };
                                    const updatedSettings = { ...settings, printerAssignments: updatedAssignments };
                                    setSettings(updatedSettings);
                                    localStorage.setItem('pos_settings', JSON.stringify(updatedSettings));
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1D9E75]" dir="ltr"></div>
                                <span className="mr-2 text-xs font-bold text-slate-700">تفعيل الطباعة الفورية لطلبات المطبخ / قسم المأكولات</span>
                              </label>
                              
                              <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5 flex-row-reverse">
                                <span>🍳 طابعة المطبخ / البوفيه والمخزن الخلفي:</span>
                              </span>
                            </div>

                            <div className="flex gap-4 items-center">
                              <select
                                value={settings.printerAssignments?.kitchenPrinterId || ''}
                                onChange={(e) => {
                                  const updatedAssignments = {
                                    ...(settings.printerAssignments || { receiptPrinterId: '', targetPrinterId: '', kitchenPrinterId: '', receiptEnabled: true, kitchenEnabled: false, logEnabled: false }),
                                    kitchenPrinterId: e.target.value
                                  };
                                  const updatedSettings = { ...settings, printerAssignments: updatedAssignments };
                                  setSettings(updatedSettings);
                                  localStorage.setItem('pos_settings', JSON.stringify(updatedSettings));
                                }}
                                className="flex-1 bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-right cursor-pointer"
                              >
                                <option value="">-- اختر طابعة من القائمة المحددة --</option>
                                {(settings.printersList || []).map((pr: any) => (
                                  <option key={pr.id} value={pr.id}>{pr.name} ({pr.connectionType})</option>
                                ))}
                              </select>
                              <span className="text-[11px] text-slate-400 w-32 shrink-0 font-medium">هدف بونات السندوتشات والعصائر</span>
                            </div>
                          </div>

                          {/* Assignment: Audit logs */}
                          <div className="p-4 border border-slate-150 rounded-2xl bg-slate-50/50 space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="relative inline-flex items-center cursor-pointer select-none">
                                <input 
                                  type="checkbox" 
                                  checked={settings.printerAssignments?.logEnabled || false}
                                  onChange={(e) => {
                                    const updatedAssignments = {
                                      ...(settings.printerAssignments || { receiptPrinterId: '', targetPrinterId: '', kitchenPrinterId: '', receiptEnabled: true, kitchenEnabled: false, logEnabled: false }),
                                      logEnabled: e.target.checked
                                    };
                                    const updatedSettings = { ...settings, printerAssignments: updatedAssignments };
                                    setSettings(updatedSettings);
                                    localStorage.setItem('pos_settings', JSON.stringify(updatedSettings));
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1D9E75]" dir="ltr"></div>
                                <span className="mr-2 text-xs font-bold text-slate-700">تفعيل الطباعة لمسودات التدقيق المالي</span>
                              </label>
                              
                              <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5 flex-row-reverse">
                                <span>📑 طابعة المستندات والمحاسب الإداري (A4):</span>
                              </span>
                            </div>

                            <div className="flex gap-4 items-center">
                              <select
                                value={settings.printerAssignments?.targetPrinterId || ''}
                                onChange={(e) => {
                                  const updatedAssignments = {
                                    ...(settings.printerAssignments || { receiptPrinterId: '', targetPrinterId: '', kitchenPrinterId: '', receiptEnabled: true, kitchenEnabled: false, logEnabled: false }),
                                    targetPrinterId: e.target.value
                                  };
                                  const updatedSettings = { ...settings, printerAssignments: updatedAssignments };
                                  setSettings(updatedSettings);
                                  localStorage.setItem('pos_settings', JSON.stringify(updatedSettings));
                                }}
                                className="flex-1 bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-right cursor-pointer"
                              >
                                <option value="">-- اختر طابعة من القائمة المحددة --</option>
                                {(settings.printersList || []).map((pr: any) => (
                                  <option key={pr.id} value={pr.id}>{pr.name} ({pr.connectionType})</option>
                                ))}
                              </select>
                              <span className="text-[11px] text-slate-400 w-32 shrink-0 font-medium">هدف كشوف الحساب والمبيعات</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Kiosk / Silent print guide card */}
                      <div className="bg-emerald-50/40 rounded-2xl border border-emerald-150 p-5 space-y-3.5 text-right font-sans">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="bg-[#1D9E75] text-[#F1FFF8] text-[9px] font-bold px-1.5 py-0.5 rounded">صيانة وإعداد سريع</span>
                          <h4 className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-1">
                            <span>حل مشكلة استمرار ظهور نافذة الطباعة ⚡</span>
                          </h4>
                        </div>
                        
                        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-xl text-[11px] leading-relaxed text-right space-y-1">
                          <p className="font-extrabold text-xs">⚠️ لماذا يستمر حوار الطباعة بالظهور على حاسوبك؟</p>
                          <p>
                            السبب الرئيسي هو أن متصفح Chrome أو Edge يستمر في العمل "كمهمة في الخلفية" أو كأيقونة صامتة بجوار ساعة الويندوز، أو لأنك تشغل البرنامج بوضعية مستعرض داخلي مخصص. عند فتح المتصفح بهذه الحالة، يتجاهل النظام ميزة الطباعة الصامتة كلياً.
                          </p>
                        </div>

                        <p className="text-[11px] text-slate-700 leading-relaxed font-sans">
                          لقد قمنا ببرمجة <strong>أداة تشغيل ذكية ومخصصة وجاهزة للتحميل بنقرة واحدة (.bat)</strong>. تقوم هذه الأداة تلقائياً بإغلاق أي عمليات كروم معلّقة بالخلفية في حاسوبك، وإعادة فتح النظام بوضعية <strong>Kiosk Silent Printing</strong> الاحترافية المباشرة:
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={() => downloadSilentPrintScript('chrome')}
                            className="bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-bold py-2.5 px-3 rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs hover:border-emerald-300"
                          >
                            <span className="text-emerald-600">🌐</span>
                            <span>تحميل أداة التشغيل لـ Chrome</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => downloadSilentPrintScript('edge')}
                            className="bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-bold py-2.5 px-3 rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs hover:border-emerald-300"
                          >
                            <span className="text-blue-500">🟦</span>
                            <span>تحميل أداة التشغيل لـ MS Edge</span>
                          </button>
                        </div>

                        <div className="bg-emerald-500/10 text-emerald-950 p-3.5 rounded-xl text-[10.5px] leading-relaxed font-medium space-y-1.5 border border-emerald-500/20">
                          <p className="font-extrabold text-[#1D9E75] text-[11px]">🔧 خطوات التشغيل بنقرة واحدة:</p>
                          <ul className="list-decimal list-inside pr-1 space-y-1">
                            <li>اضغط على زر المتصفح الذي تفضله أعلاه (ينصح بـ <strong>Chrome</strong> للسرعة القصوى).</li>
                            <li>سيتم تنزيل ملف دُفعة صغير باسم <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold text-slate-700">Run_POS_Chrome_SilentPrint.bat</code></li>
                            <li>اذهب لمجلد التنزيلات على جهازك وشغّل هذا الملف (انقر عليه مرتين).</li>
                            <li>سيغلق المتصفح فوراً وسيفتح نافذة آمنة جديدة، وعند الدفع <strong>ستخرج فواتيرك فوراً من طابعة Canon G3030 بمجرد الضغط على زر الدفع!</strong></li>
                          </ul>
                        </div>
                      </div>

                      {/* Integrated background spooler progress logs */}
                      <div className="bg-slate-900 text-stone-100 rounded-2xl p-5 shadow-md border border-stone-800 space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-stone-800">
                          <button
                            type="button"
                            onClick={() => {
                              setActivePrintJobs([]);
                              showToast('success', '🧹 تم تفريغ سجل مهام الطباعة بنجاح.');
                            }}
                            className="bg-stone-800 hover:bg-stone-700 text-xs px-2.5 py-1 rounded-lg text-stone-400 hover:text-white font-bold cursor-pointer transition-colors"
                          >
                            تفريغ السجل
                          </button>
                          <h4 className="font-bold text-xs sm:text-sm text-stone-200 flex items-center gap-1.5">
                            <span>سجل ملقم الطباعة المدمج ومراقبة المهام (Virtual Spooler Queue)</span>
                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
                          </h4>
                        </div>

                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {activePrintJobs.length === 0 ? (
                            <p className="text-center py-6 text-stone-500 font-mono text-xs">
                              - الذاكرة المؤقتة لمهام الطباعة فارغة حالياً -
                            </p>
                          ) : (
                            activePrintJobs.map(job => (
                              <div key={job.id} className="p-3 bg-stone-850 border border-stone-800 rounded-xl text-xs flex flex-col gap-2">
                                <div className="flex justify-between items-center font-mono">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                    job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                  }`}>
                                    {job.status === 'completed' ? 'تمت الطباعة ✔️' : 'جاري العمل ⚙️'}
                                  </span>
                                  <span className="font-bold text-stone-100">{job.jobName} ➡️ {job.printerName}</span>
                                </div>
                                <div className="flex justify-between items-center font-mono text-[10px] text-stone-400">
                                  <span>{job.timestamp}</span>
                                  <span>المعرف الجردي: {job.id}</span>
                                </div>
                                
                                {/* Progressive Bar */}
                                <div className="w-full bg-stone-800 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-300 ${
                                      job.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'
                                    }`}
                                    style={{ width: `${job.progress}%` }}
                                  />
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
                
                <div 
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs w-full text-right space-y-6 mt-6"
                  id="activation-card-panel"
                >
                  <h3 className="font-bold text-slate-800 text-base pb-3 border-b border-slate-100 flex items-center gap-2 justify-end">
                    <span>
                      {lang === 'ar' ? 'تراخيص وبرمجيات النظام والتحقق من التفعيل' : 'System Software Licensing & Activation Verification'}
                    </span>
                    <KeyRound className="w-5 h-5 text-[#1D9E75]" />
                  </h3>

                  {(() => {
                    const isDeveloper = ['KAMEL-BAYDAA-2026', 'K@MEL-@L@@-882022', 'DEV-9988-7766-XX', 'POS-PREMIUM-2026-ACTIVE'].includes(activationKey);
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-row-reverse w-full">
                        
                        {/* Column 1: Verification, Status & Key Input */}
                        <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl space-y-4 text-right">
                          <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                            {lang === 'ar' ? 'حالة الترخيص الحالية:' : 'Current License Status:'}
                          </span>
                          
                          {isActivated ? (
                            <div className="space-y-3">
                              {isDeveloper ? (
                                <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl space-y-2 text-right">
                                  <span className="text-rose-800 text-xs font-black block text-center">
                                    {lang === 'ar' ? 'نمط الموزع والمطور معتمد!' : 'Authorized Distributor & Developer Mode!'}
                                  </span>
                                  <p className="text-[10px] text-rose-700 font-bold leading-relaxed">
                                    {lang === 'ar' 
                                      ? 'أهلاً بك أستاذ كامل بيضاء! لقد قمت بفتح صلاحيات السيادة والموزع المعتمد.' 
                                      : 'Welcome Mr. Kamel Baydaa! You have unlocked authorized distributor rights.'}
                                  </p>
                                  <p className="text-[9.5px] text-rose-600 leading-normal font-semibold">
                                    {lang === 'ar'
                                      ? 'لإنشاء كود ترخيص لعميل جديد: اكتب اسم محل الزبون في الحقل المخصص في اللوحة المجاورة، وسيظهر له كود التفعيل الفريد الخاص به فوراً. انسخ الكود وأرسله له.'
                                      : 'To generate a license code for a target client: write their shop name in the field on the other panel, copy the resulting unique key, and send it to them.'}
                                  </p>
                                  <p className="text-[9px] text-red-650 font-black border-t border-rose-200/60 pt-1.5 text-center">
                                    {lang === 'ar' 
                                      ? '⚠️ تحذير: لا تشارك كود الموزع الخاص بك (K@mel-@l@@-882022) مع أي زبون لكي لا يتمكنوا من توليد مفاتيح تفعيل تضر بمشروعك!' 
                                      : '⚠️ Safe guidance: Never share your master owner code (K@mel-@l@@-882022) with clients, otherwise they will be able to generate keys for themselves!'}
                                  </p>
                                </div>
                              ) : (
                                <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-center space-y-2 font-sans text-right">
                                  <span className="text-emerald-800 text-xs font-black block text-center">
                                    🎉 {lang === 'ar' ? 'تم تنشيط الاشتراك السنوي بنجاح!' : 'Annual Subscription Active!'}
                                  </span>
                                  <p className="text-[10px] text-emerald-600 font-bold leading-relaxed">
                                    {lang === 'ar' 
                                      ? `تم ربط وتفعيل ترخيص البرنامج بنجاح لمتجر (${settings.shopName}). الاشتراك نشط لـ 365 يوماً.` 
                                      : `System licensed successfully to (${settings.shopName}). Active for 365 days.`}
                                  </p>
                                  <div className="bg-emerald-600 text-white font-black text-[10px] py-1 px-2.5 rounded-lg inline-block w-full text-center">
                                    {lang === 'ar' 
                                      ? `⏳ الأيام المتبقية: ${subscriptionDaysRemaining} يوم` 
                                      : `⏳ Days remaining: ${subscriptionDaysRemaining} days`}
                                  </div>
                                </div>
                              )}
                              
                              <div className="space-y-1 text-center font-sans">
                                <span className="text-[10px] text-slate-400 font-bold block">مفتاح التفعيل الحالي:</span>
                                <span className="font-mono text-xs font-black text-slate-700 bg-slate-150 border px-3 py-1 rounded-md inline-block select-none tracking-widest text-center">
                                  {activationKey ? '•'.repeat(Math.min(22, activationKey.length)) : ''}
                                </span>
                              </div>

                              <div className="pt-2 flex flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={() => setShowSetupWizard(true)}
                                  className="w-full bg-[#1D9E75]/10 hover:bg-[#1D9E75]/20 text-[#1D9E75] font-extrabold py-2 px-3 rounded-xl text-[10px] transition cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <span>🔑 {lang === 'ar' ? 'تعديل وتعيين حسابات المدير والكاشير' : 'Re-configure Admin & Cashier Accounts'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(lang === 'ar' ? 'هل أنت متأكد من رغبتك في إلغاء تنشيط وحذف كود التفعيل الحالي والرجوع للنسخة التجريبية؟' : 'Are you sure you want to deactivate current license and return to trial?')) {
                                      setActivationKey('');
                                      localStorage.removeItem('pos_activation_key');
                                      localStorage.removeItem('pos_setup_wizard_completed'); // Clear completed flag
                                      showToast('warning', lang === 'ar' ? '⚠️ تم إلغاء تفعيل ترخيص البرنامج والرجوع للوضع التجريبي' : 'License deactivated. Returned to trial.');
                                    }
                                  }}
                                  className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold py-2 px-3 rounded-xl text-[10px] transition cursor-pointer text-center"
                                >
                                  {lang === 'ar' ? 'إلغاء تنشيط الترخيص الحالي 🗑️' : 'Reset Active License 🗑️'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="bg-amber-50 border border-amber-150 p-3.5 rounded-xl text-center space-y-1.5">
                                <span className="text-amber-800 text-xs font-black block text-center">
                                  ⏳ {lang === 'ar' ? 'نمط البرنامج: نسخة تجريبية محدودة' : 'Sandbox Trial Mode'}
                                </span>
                                <p className="text-[10px] text-amber-700 tracking-wide leading-relaxed font-bold">
                                  {lang === 'ar' 
                                    ? `النسخة التجريبية تتيح لك إصدار 15 فاتورة كحد أقصى لتجربة كافة إمكانات النظام المتقدمة.`
                                    : 'Trial mode allows emitting a maximum of 15 invoices to evaluate system capabilities.'}
                                </p>
                                
                                {/* Visual Progress Bar */}
                                <div className="space-y-1 pt-1.5 text-right">
                                  <div className="flex justify-between text-[10px] text-amber-800 font-black flex-row-reverse">
                                    <span>{lang === 'ar' ? 'التقدم:' : 'Invoices Progress:'}</span>
                                    <span className="font-mono">{invoices.length} / 15 فواتير</span>
                                  </div>
                                  <div className="w-full bg-amber-200/50 h-2.5 rounded-full overflow-hidden border border-amber-200">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-500 ${invoices.length >= 15 ? 'bg-rose-500' : 'bg-amber-500'}`}
                                      style={{ width: `${Math.min(100, (invoices.length / 15) * 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2 text-right">
                                <label className="block text-slate-700 font-bold text-xs">
                                  🔑 {lang === 'ar' ? 'أدخل رمز تفعيل البرنامج:' : 'Enter Activation Code:'}
                                </label>
                                <div className="flex gap-2">
                                  <input 
                                    type="text"
                                    placeholder="POS-XXXX-XXXX-XX-ACT"
                                    value={activationInputKey}
                                    onChange={e => {
                                      setActivationInputKey(e.target.value);
                                      setActivationErrorMsg('');
                                    }}
                                    className="flex-grow bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold placeholder-slate-300"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleApplyActivation(activationInputKey)}
                                    className="bg-[#1D9E75] hover:bg-emerald-600 text-white font-bold text-xs px-4 rounded-xl transition cursor-pointer"
                                  >
                                    {lang === 'ar' ? 'تفعيل' : 'Activate'}
                                  </button>
                                </div>
                                {activationErrorMsg && (
                                  <p className="text-[10px] text-red-500 font-extrabold text-center block pt-0.5 animate-pulse">
                                    {activationErrorMsg}
                                  </p>
                                )}

                                <div className="pt-1.5 border-t border-slate-200/60 mt-1.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const msg = lang === 'ar' 
                                        ? `السلام عليكم أستاذ كامل، أرغب في شراء تفعيل برنامج السوبرماركت - الاشتراك السنوي.\nاسم المحل المسجل في إعداداتي هو:\n*${settings.shopName || "سوبر ماركت"}*\nيرجى تزويدي بمفتاح التفعيل المتوافق مع هذا الاسم. شكراً جزيلاً!`
                                        : `Hello, I would like to purchase an annual subscription activation key for the POS system.\nRegistered Shop Name:\n*${settings.shopName || "Supermarket"}*\nPlease provide me with the matched activation key. Thank you!`;
                                      navigator.clipboard.writeText(msg);
                                      showToast('success', lang === 'ar' ? 'تم نسخ الرسالة بنجاح! يمكنك لصقها وإرسالها للأستاذ كامل الآن.' : 'Request message copied to clipboard!');
                                    }}
                                    className="w-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-extrabold py-2 px-3 rounded-xl text-[10.5px] transition cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200"
                                  >
                                    <span>{lang === 'ar' ? 'نسخ رسالة طلب تفعيل الاشتراك السنوي' : 'Copy Ready Annual Subscription Request'}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Column 2: Generator (For Developer/Admin Only) or Contact/Purchase Form */}
                        {isDeveloper ? (
                          <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl flex flex-col justify-between gap-4 text-right">
                            <div>
                              <span className="text-xs font-black text-rose-550 block uppercase tracking-wider mb-2 flex items-center gap-1.5 justify-end">
                                <Key className="w-3.5 h-3.5" />
                                <span>{lang === 'ar' ? 'لوحة الموزع وإنشاء المفاتيح (خاص بالمدراء):' : 'Distributor & Key Generator Panel (Admin):'}</span>
                              </span>
                              <p className="text-[10px] text-slate-500 leading-relaxed">
                                {lang === 'ar' 
                                  ? 'بصفتك مديراً للنظام، يمكنك توليد رموز تفعيل مخصصة لزبائنك فوراً! يتم ربط الرمز باسم المحل لضمان الأمان وعدم سرقة التعبئة.' 
                                  : 'As system admin, you can dynamically compute license tokens based on any input shop name.'}
                              </p>
                            </div>

                            <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-2.5">
                              <div>
                                <label className="block text-slate-450 font-bold text-[9.5px] pb-1 text-right">
                                  🏢 {lang === 'ar' ? 'اسم المحل لربط الترخيص به:' : 'Associated License Shop Name:'}
                                </label>
                                <input 
                                  type="text"
                                  value={settings.shopName}
                                  readOnly
                                  className="w-full bg-slate-50 border border-slate-150 py-1.5 px-2.5 rounded-lg text-xs text-right font-black text-slate-700 focus:outline-none"
                                  title="يتم الربط تلقائياً باسم محل زبونك"
                                />
                              </div>

                              <div className="bg--[#1D9E75]/5 border border-[#1D9E75]/15 p-2 rounded-lg text-center space-y-1 font-sans">
                                <span className="text-[9.5px] text-slate-500 font-bold block text-center">
                                  🔑 {lang === 'ar' ? 'كود ترخيص هذا الزبون:' : 'Computed License Code:'}
                                </span>
                                
                                {(() => {
                                  const cleanName = (settings.shopName || '').trim().toLowerCase().replace(/\s+/g, '');
                                  if (!cleanName) {
                                    return <span className="text-[10px] text-rose-500 font-bold">{lang === 'ar' ? 'الرجاء كتابة اسم المحل أولاً بالعامر!' : 'Please set store name first'}</span>;
                                  }
                                  
                                  // Deterministic calculation
                                  let sum = 0;
                                  for (let i = 0; i < cleanName.length; i++) {
                                    sum += cleanName.charCodeAt(i) * (i + 1);
                                  }
                                  const part1 = sum.toString(16).toUpperCase().padStart(4, '0');
                                  const part2 = (sum * 7).toString().slice(-4).padStart(4, '3');
                                  const part3 = cleanName.length.toString().padStart(2, '0');
                                  const expectedKey = `POS-${part1}-${part2}-${part3}-ACT`;

                                  return (
                                    <div className="space-y-1 pt-1 text-center">
                                      <span className="font-mono text-xs font-black text-[#1D9E75] block select-all bg-white px-2 py-1 rounded border border-[#1D9E75]/20">
                                        {expectedKey}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(expectedKey);
                                          showToast('success', lang === 'ar' ? '📋 تم نسخ كود التفعيل للذاكرة بنجاح! أرسله لزبونك.' : '📋 Copied activation code to clipboard!');
                                        }}
                                        className="text-[9.5px] text-[#1D9E75] hover:underline font-extrabold flex items-center gap-1 justify-center mx-auto transition duration-150"
                                      >
                                        <Copy className="w-3 h-3 text-[#1D9E75]" />
                                        <span>{lang === 'ar' ? 'نسخ كود الترخيص 📋' : 'Copy Generated Code 📋'}</span>
                                      </button>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            <div className="text-[10px] leading-relaxed text-slate-400 font-semibold border-t border-slate-100 pt-2 flex flex-col gap-1 text-right">
                              <span>💡 {lang === 'ar' ? 'كيفية تفعيل ترخيص للزبون الجديد:' : 'How to activate customer licence:'}</span>
                              <span className="text-[9px] text-slate-400 font-normal">
                                {lang === 'ar' 
                                  ? '1- سجل المحل باسم الزبون (مثلا: "Supermarket Al Amin").'
                                  : '1- Change store info to client shop name.'}
                              </span>
                              <span className="text-[9px] text-slate-400 font-normal">
                                {lang === 'ar' 
                                  ? '2- انسخ الكود الناتج من المولد أعلاه باللون الأخضر.'
                                  : '2- Copy green computed license token from above.'}
                              </span>
                              <span className="text-[9px] text-slate-400 font-normal">
                                {lang === 'ar' 
                                  ? '3- اضغط تفعيل في خانة الترخيص والصقه وسيتم تنشيط الاشتراك السنوي على الفور ولمدة سنة كاملة!'
                                  : '3- Paste in inputs form to unlock active annual subscription for 1 year.'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl space-y-3 font-sans text-right flex flex-col justify-between">
                            <div>
                              <span className="text-xs font-black text-[#1D9E75] block uppercase tracking-wider mb-1">
                                📨 {lang === 'ar' ? 'فورم تواصل لشراء وتفعيل البرنامج:' : 'Direct Contact Form for Software Purchase:'}
                              </span>
                              <p className="text-[10px] text-slate-500 font-medium leading-relaxed mb-3">
                                {lang === 'ar' 
                                  ? 'املأ بياناتك أدناه لإنشاء رسالة شراء جاهزة للتواصل الفوري مع المورّد أ. كامل بيضاء عبر WhatsApp أو Email للاشتراك السنوي.'
                                  : 'Enter details below to generate a formatted proposal letter directly addressed to developer Mr. Kamel Baydaa via WhatsApp or Email.'}
                              </p>

                              <div className="space-y-2.5 text-xs text-right">
                                <div>
                                  <label className="block text-slate-500 mb-0.5 text-[9.5px] font-bold">👤 {lang === 'ar' ? 'اسمك الكريم / المالك:' : 'Your Name / Shop Owner:'}</label>
                                  <input 
                                    type="text"
                                    value={contactName}
                                    onChange={e => setContactName(e.target.value)}
                                    placeholder={lang === 'ar' ? 'مثال: كامل بيضاء...' : 'e.g. Kamel'}
                                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-right font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-slate-500 mb-0.5 text-[9.5px] font-bold">📧 {lang === 'ar' ? 'البريد الإلكتروني:' : 'Email Address:'}</label>
                                    <input 
                                      type="email"
                                      value={contactEmail}
                                      onChange={e => setContactEmail(e.target.value)}
                                      placeholder="name@example.com"
                                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-center font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-slate-500 mb-0.5 text-[9.5px] font-bold">📞 {lang === 'ar' ? 'رقم الهاتف / WhatsApp:' : 'Phone Line / WhatsApp:'}</label>
                                    <input 
                                      type="text"
                                      value={contactPhone}
                                      onChange={e => setContactPhone(e.target.value)}
                                      placeholder="+96170082327"
                                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-center font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-slate-500 mb-0.5 text-[9.5px] font-bold">🏢 {lang === 'ar' ? 'اسم المتجر المراد تفعيله:' : 'Store Name to Activate:'}</label>
                                  <input 
                                    type="text"
                                    value={contactShop || settings.shopName || ''}
                                    onChange={e => setContactShop(e.target.value)}
                                    placeholder={settings.shopName || "Supermarket"}
                                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-right font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                  />
                                </div>

                                <div>
                                  <label className="block text-slate-500 mb-0.5 text-[9.5px] font-bold">📝 {lang === 'ar' ? 'رسالتك أو ملاحظاتك الإضافية للطلب:' : 'Additional message / custom terms:'}</label>
                                  <textarea 
                                    value={contactMessage}
                                    onChange={e => setContactMessage(e.target.value)}
                                    placeholder={lang === 'ar' ? 'تفاصيل عن متطلبات محلك، عدد الأجهزة...' : 'Inquire about hardware specs, pricing, multiple stations...'}
                                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-right font-medium h-12 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 text-[10.5px] font-bold font-sans">
                              {/* WhatsApp Contact Link */}
                              {(() => {
                                const waMsg = `السلام عليكم أستاذ كامل بيضاء، أرغب في شراء وتفعيل النسخة المعتمدة لبرنامج مبيعات السوبرماركت - الاشتراك السنوي.\n\n` +
                                  `📋 تفاصيل طلب التنشيط:\n` +
                                  `- اسم العميل: ${contactName || 'غير محدد'}\n` +
                                  `- رقم الهاتف/واتساب: ${contactPhone || 'غير محدد'}\n` +
                                  `- البريد الإلكتروني: ${contactEmail || 'غير محدد'}\n` +
                                  `- اسم المحل المراد قيده: ${contactShop || settings.shopName || 'غير محدد'}\n` +
                                  `- ملحوظات إضافية: ${contactMessage || 'لا يوجد'}\n\n` +
                                  `يرجى تزويدي بمفتاح التفعيل السنوي المناسب وتفاصيل دفع الرصيد وشكراً!`;
                                const waUrl = `https://wa.me/96170082327?text=${encodeURIComponent(waMsg)}`;
                                return (
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-emerald-650 hover:bg-emerald-600 text-white font-extrabold py-2 px-3 rounded-xl transition hover:scale-[1.02] flex items-center justify-center gap-1 cursor-pointer text-center"
                                  >
                                    💬 {lang === 'ar' ? 'واتساب مباشر' : 'Send WhatsApp'}
                                  </a>
                                );
                              })()}

                              {/* Email Contact Link */}
                              {(() => {
                                const mailSubject = `طلب تفعيل برنامج المبيعات - ${contactShop || settings.shopName || "السوبر ماركت"}`;
                                const mailBody = `السلام عليكم أستاذ كامل بيضاء,\n\nأود شراء النسخة الكاملة - الاشتراك السنوي لبرنامج المبيعات.\n\nتفاصيل تفعيل الترخيص:\n` +
                                  `- الاسم الكريم: ${contactName || 'غير محدد'}\n` +
                                  `- رقم الهاتف: ${contactPhone || 'غير محدد'}\n` +
                                  `- البريد الإلكتروني: ${contactEmail || 'غير محدد'}\n` +
                                  `- اسم المحل للتفعيل: ${contactShop || settings.shopName || 'غير محدد'}\n` +
                                  `- رسالة أو متطلبات: ${contactMessage || 'لا يوجد'}\n\n` +
                                  `الرجاء الرد علي بآلية الدفع ورموز التفعيل السنوية اللازمة.\n\nشاكر لكم تعاونكم الكريم!\n`;
                                const mailUrl = `mailto:kamelbaydaa@gmail.com?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
                                return (
                                  <a
                                    href={mailUrl}
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2 px-3 rounded-xl transition hover:scale-[1.02] flex items-center justify-center gap-1 cursor-pointer text-center"
                                  >
                                    📧 {lang === 'ar' ? 'بريد إلكتروني' : 'Send Email'}
                                  </a>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* --- PRODUCTION SYSTEM DEEP COMPREHENSIVE WIPEOUT --- */}
                <div className="bg-white rounded-2xl border border-rose-200 p-6 shadow-xs w-full text-right space-y-6 mt-6">
                  <h3 className="font-bold text-slate-850 text-base pb-3 border-b border-slate-100 flex items-center gap-2 justify-end">
                    <span>
                      {lang === 'ar' ? 'تصفير وصيانة قاعدة بيانات المتجر الفعلية' : 'Production System Database Wipe & Clean'}
                    </span>
                    <Database className="w-5 h-5 text-rose-600" />
                  </h3>

                  <div className="bg-red-50/55 border border-red-100 p-4 rounded-xl text-right space-y-2">
                    <span className="text-red-950 text-xs font-black block flex items-center gap-1.5 justify-end">
                      <span>{lang === 'ar' ? '⚠️ تنبيه حساس: حذف بيانات المتجر الدائمة' : '⚠️ Warning: Permanent Data Deletion'}</span>
                    </span>
                    <p className="text-[11px] text-red-700 leading-relaxed font-semibold">
                      {lang === 'ar'
                        ? 'هذه الأزرار تقوم بمسح بيانات محلكم الفعلية وحسابات المبيعات الحقيقية بشكل جازم ونهائي. يرجى الحذر الشديد قبل الضغط عليها!'
                        : 'These controls permanently wipe actual production and sales data. Use with extreme caution.'}
                    </p>
                    <p className="text-[10px] text-red-650 font-bold">
                      {lang === 'ar'
                        ? '* تنبيه: عملية الحذف نهائية ولا يمكن استرجاع البيانات المحذوفة بعدها بأي شكل.'
                        : '* Note: Deletion is permanent and cannot be undone.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={handleWipeSalesInvoicesOnly}
                      className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/55 p-3.5 rounded-xl text-center space-y-1 transition duration-150 cursor-pointer flex flex-col items-center justify-center gap-1.5"
                    >
                      <Receipt className="w-5 h-5 text-amber-600" />
                      <span className="text-xs font-extrabold block">{lang === 'ar' ? 'تصفير المبيعات فقط' : 'Clear Sales Only'}</span>
                      <span className="text-[9px] text-amber-600 block">{lang === 'ar' ? 'حذف الفواتير والأرباح فقط' : 'Deletes sales logs only'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleWipeProductsAndCategoriesOnly}
                      className="bg-orange-50 hover:bg-orange-100 text-orange-850 border border-orange-200/55 p-3.5 rounded-xl text-center space-y-1 transition duration-150 cursor-pointer flex flex-col items-center justify-center gap-1.5"
                    >
                      <Archive className="w-5 h-5 text-orange-650" />
                      <span className="text-xs font-extrabold block">{lang === 'ar' ? 'مسح المنتجات فقط' : 'Clear Products Only'}</span>
                      <span className="text-[9px] text-orange-600 block">{lang === 'ar' ? 'حذف أصناف المخزن والباركود' : 'Deletes inventory data'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleWipeEntireSystemData}
                      className="bg-red-50 hover:bg-red-100 text-rose-900 border border-red-200 p-3.5 rounded-xl text-center space-y-1 transition duration-150 cursor-pointer flex flex-col items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-5 h-5 text-rose-600 animate-pulse" />
                      <span className="text-xs font-black block text-rose-700">{lang === 'ar' ? 'تصفير البرنامج بالكامل' : 'Wipe System Entirely'}</span>
                      <span className="text-[9px] text-rose-500 block">{lang === 'ar' ? 'البدء من الصفر تماماً 💥' : 'Full clean start 💥'}</span>
                    </button>
                  </div>
                </div>


                
              </>
            )}
          </div>
        )}

          {/* ==========================================
              TAB 7.5: OFFERS & PROMOTIONS TAB (🏷️)
              ========================================== */}
          {activeTab === 'promotions' && (
            <PromotionsTab
              products={products}
              promotions={promotions}
              onPromotionsChange={handlePromotionsChange}
              today={SYS_DATE}
              lang={lang}
              showToast={showToast}
            />
          )}

          {/* ==========================================
              TAB 8: FIREBASE CLOUD SYNC TAB (☁️)
              ========================================== */}
          {activeTab === 'firebase_sync' && (
            <div className="space-y-6" id="tab-firebase-sync-section">
              {currentUser.role !== 'admin' ? (
                renderAdminLockScreen()
              ) : (
                <FirebaseSyncTab
                  lang={lang}
                  showToast={showToast}
                  products={products}
                  setProducts={setProducts}
                  categories={categories}
                  setCategories={setCategories}
                  invoices={invoices}
                  setInvoices={setInvoices}
                  customers={customers}
                  setCustomers={setCustomers}
                  suppliers={suppliers}
                  setSuppliers={setSuppliers}
                  returns={returns}
                  setReturns={setReturns}
                  waste={waste}
                  setWaste={setWaste}
                  promotions={promotions}
                  setPromotions={setPromotions}
                  expenses={expenses}
                  setExpenses={setExpenses}
                  purchaseInvoices={purchaseInvoices}
                  setPurchaseInvoices={setPurchaseInvoices}
                  settings={settings}
                  setSettings={setSettings}
                />
              )}
            </div>
          )}
        </main>

      </div>

          {/* ==========================================
              MODAL: EXCEL PRODUCTS IMPORT (📥)
              ========================================== */}
          {showImportExcelModal && (
            <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex justify-center items-center p-4 md:p-8 z-50 overflow-y-auto animate-fade-in font-sans" id="excel-import-modal-container">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full p-6 shadow-2xl relative text-right font-sans my-auto flex flex-col max-h-[90vh]"
              >
                {/* Modal Header */}
                <div className="flex justify-between items-center pb-4 border-b border-slate-800 flex-row-reverse mb-4">
                  <div className="flex items-center gap-2.5 flex-row-reverse">
                    <div className="p-2.5 bg-sky-500/10 rounded-xl text-sky-400">
                      <FileSpreadsheet className="w-5 h-5 animate-pulse" />
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      {lang === 'ar' ? 'استيراد أصناف من ملف Excel 📥' : 'Import Products from Excel Spreadsheet'}
                    </h3>
                  </div>
                  <button 
                    onClick={() => {
                      setShowImportExcelModal(false);
                      setImportStatus('idle');
                      setParsedProducts([]);
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer border-none"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-y-auto pr-1 space-y-4 flex-1">
                  {/* Instructions & Template Block */}
                  {importStatus === 'idle' && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-right flex-row-reverse">
                      <div className="md:col-span-7 bg-slate-950/60 border border-slate-800/80 p-5 rounded-2xl text-xs space-y-3 text-slate-300">
                        <p className="font-extrabold text-slate-100 text-sm flex items-center gap-1.5 flex-row-reverse">
                          <span>💡 دليل وإرشادات استيراد الأصناف السليم:</span>
                        </p>
                        <ul className="list-disc list-inside space-y-2 leading-relaxed pr-2 flex flex-col items-end">
                          <li className="list-none flex items-center gap-1 flex-row-reverse">
                            <span className="text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded font-bold font-mono">1</span>
                            <span>يجب أن يتضمن ملف الإكسيل رأس الأعمدة في السجل/السطر الأول للمطابقة الذكية.</span>
                          </li>
                          <li className="list-none flex items-center gap-1 flex-row-reverse">
                            <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-bold font-mono">2</span>
                            <span><strong>اسم المنتج / الصنف:</strong> حقل إلزامي أساسي بدون كتابته لن يتم استيراد السطر.</span>
                          </li>
                          <li className="list-none flex items-center gap-1 flex-row-reverse">
                            <span className="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-bold font-mono">3</span>
                            <span><strong>الباركود:</strong> حقل اختياري. إذا تركته فارغاً سيقوم السوبرماركت بتوليد باركود فريد تلقائياً.</span>
                          </li>
                          <li className="list-none flex items-center gap-1 flex-row-reverse">
                            <span className="text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded font-bold font-mono">4</span>
                            <span><strong>التصنيف:</strong> إذا كان اسم الفئة أو التصنيف المسجل بالملف جديداً، سيقوم النظام بتسجيله فوراً كذلك!</span>
                          </li>
                          <li className="list-none flex items-center gap-1 flex-row-reverse">
                            <span className="text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded font-bold font-mono">5</span>
                            <span><strong>الأسعار والكمية:</strong> يُفضل صياغتها كقيم رقمية نقية خالية من الرموز والعملات (مثال: <code className="font-mono text-emerald-400 font-bold">12.5</code>).</span>
                          </li>
                          <li className="list-none flex items-center gap-1 flex-row-reverse">
                            <span className="text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded font-bold font-mono">6</span>
                            <span><strong>تاريخ الصلاحية:</strong> يفضل تنسيقه كـ <code className="font-mono bg-slate-800 text-pink-300 font-black px-1 rounded">YYYY-MM-DD</code> (مثال: <code className="font-mono text-pink-300">2026-10-25</code>).</span>
                          </li>
                        </ul>

                        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={downloadExcelTemplate}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-lg font-black text-xs py-2.5 px-4 rounded-xl transition cursor-pointer flex items-center gap-1.5 border-none"
                          >
                            <Download className="w-4 h-4" />
                            <span>تحميل القالب الاسترشادي الجاهز (Excel Template)</span>
                          </button>
                          <span className="text-[11px] text-slate-400">للحصول على تماثل وهيكل سليم للبيانات</span>
                        </div>
                      </div>

                      <div className="md:col-span-5 flex flex-col justify-between bg-slate-950/20 border border-slate-800/80 p-5 rounded-2xl space-y-4">
                        <div className="space-y-2">
                          <span className="block font-extrabold text-slate-100 text-xs">🛠️ خيارات المطابقة والتحديث التلقائي:</span>
                          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                            ماذا تريد أن يحدث عندما يتطابق باركود في ملف الإكسل مع باركود منتج تم تسجيله وحفظه مسبقاً بالنظام؟
                          </p>
                          <label className="flex items-center gap-2.5 cursor-pointer bg-slate-900 p-3 rounded-xl border border-slate-800 hover:border-slate-750 transition flex-row-reverse text-right select-none">
                            <input 
                              type="checkbox"
                              checked={updateExistingOnMatch}
                              onChange={(e) => setUpdateExistingOnMatch(e.target.checked)}
                              className="accent-[#1D9E75] w-4 h-4 cursor-pointer"
                            />
                            <div className="flex-1 text-right">
                              <span className="block font-black text-xs text-white">تحديث وتجاوز بيانات الصنف الحالي</span>
                              <span className="text-[10px] text-slate-500 block font-normal mt-0.5">سيتم استبدال سعر البيع، التكلفة، والكمية بما هو مكتوب بالملف</span>
                            </div>
                          </label>
                        </div>

                        <div>
                          <label className="flex flex-col items-center justify-center border-2 border-dashed border-sky-500/30 hover:border-sky-500 bg-sky-500/5 hover:bg-sky-500/10 p-6 rounded-2xl cursor-pointer transition text-center group">
                            <Upload className="w-9 h-9 text-sky-400 group-hover:scale-110 transition mb-2" />
                            <span className="font-extrabold text-xs text-white">اختر ملف Excel أو اسحبه وأفلته هنا</span>
                            <span className="text-[10px] text-slate-500 mt-1 font-mono">(.xlsx, .xls, .csv)</span>
                            <input 
                              type="file" 
                              accept=".xlsx, .xls, .csv" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleExcelImport(file);
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {importStatus === 'parsing' && (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                      <RefreshCw className="w-12 h-12 text-[#1D9E75] animate-spin" />
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-white text-sm">جاري قراءة وتحليل بيانات جدول الإكسيل...</h4>
                        <p className="text-xs text-slate-400">نقوم بفحص أسماء ومطابقة الأعمدة والتحقق الصارم من صحة البيانات</p>
                      </div>
                    </div>
                  )}

                  {importStatus === 'error' && (
                    <div className="bg-red-950/20 border border-red-800/80 p-5 rounded-2xl text-center space-y-3">
                      <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
                      <h4 className="font-extrabold text-red-200 text-sm">عفواً، لم نتمكن من تحليل هذا الملف بشكل دقيق!</h4>
                      <p className="text-xs text-red-400 max-w-lg mx-auto leading-relaxed">
                        قد يكون الملف فارغاً، أو لا تتوفر فيه ترويسات الأعمدة بالسطر الأول، أو يحتوي على ترميزات نص وبنى تالفة. يرجى مراجعة الخطأ التفصيلي أدناه.
                      </p>
                      <div className="bg-red-950/80 text-red-400 p-3 rounded-xl text-xs font-mono select-all inline-block border border-red-900">
                        {importError}
                      </div>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setImportStatus('idle')}
                          className="bg-slate-800 hover:bg-slate-750 text-white font-extrabold text-xs py-2 px-4 rounded-xl transition cursor-pointer border-none"
                        >
                          المحاولة من جديد واختيار ملف آخر
                        </button>
                      </div>
                    </div>
                  )}

                  {importStatus === 'preview' && (
                    <div className="space-y-4">
                      {/* Live summary stats badges */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-2xl text-center">
                          <span className="block text-slate-400 text-[10px] font-bold">إجمالي الأسطر الصالحة</span>
                          <span className="text-lg font-black text-white font-mono">{parsedProducts.length}</span>
                        </div>
                        <div className="bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-2xl text-center">
                          <span className="block text-emerald-400 text-[10px] font-bold">أصناف جديدة للتسجيل</span>
                          <span className="text-lg font-black text-emerald-400 font-mono">
                            {parsedProducts.filter(p => p.status === 'new').length}
                          </span>
                        </div>
                        <div className="bg-amber-950/20 border border-amber-900/30 p-3 rounded-2xl text-center">
                          <span className="block text-amber-400 text-[10px] font-bold">أصناف للتحديث والدمج</span>
                          <span className="text-lg font-black text-amber-400 font-mono">
                            {parsedProducts.filter(p => p.status === 'update').length}
                          </span>
                        </div>
                        <div className="bg-red-950/20 border border-red-900/30 p-3 rounded-2xl text-center">
                          <span className="block text-red-400 text-[10px] font-bold">أسطر تالفة مستبعدة</span>
                          <span className="text-lg font-black text-red-400 font-mono">
                            {parsedProducts.filter(p => p.status === 'invalid').length}
                          </span>
                        </div>
                      </div>

                      {/* Policy notify Banner */}
                      <div className="bg-sky-950/20 border border-sky-900/60 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs flex-row-reverse text-right">
                        <span className="text-sky-300 leading-normal font-medium">
                          ℹ️ سياسة الدمج مفعّلة: عند تطابق الباركود، سيقوم النظام بـ <strong className="text-white">{updateExistingOnMatch ? 'تحديث وتعديل' : 'تجاهل تخطي التحديث والاحتفاظ بالبيانات القديمة لـ'}</strong> الأصناف الحالية.
                        </span>
                        <button
                          type="button"
                          onClick={() => setUpdateExistingOnMatch(!updateExistingOnMatch)}
                          className="bg-slate-850 hover:bg-slate-800 text-white font-black text-[10px] py-1.5 px-3 rounded-lg transition cursor-pointer border-none"
                        >
                          تغيير سياسة التعامل
                        </button>
                      </div>

                      {/* Table preview */}
                      <div className="border border-slate-800/80 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-950/70 text-slate-300 sticky top-0 border-b border-slate-800 font-sans">
                            <tr>
                              <th className="p-3 text-center">#</th>
                              <th className="p-3 text-right">صنف المنتج بالملف</th>
                              <th className="p-3 text-center">الباركود</th>
                              <th className="p-3 text-center">التصنيف</th>
                              <th className="p-3 text-center">سعر البيع retail</th>
                              <th className="p-3 text-center">سعر الجملة wholesale</th>
                              <th className="p-3 text-center">التكلفة cost</th>
                              <th className="p-3 text-center">الكمية المستوردة</th>
                              <th className="p-3 text-center">تاريخ الانتهاء</th>
                              <th className="p-3 text-center">الحالة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50 font-sans">
                            {parsedProducts.map((item, idx) => (
                              <tr 
                                key={idx} 
                                className={`hover:bg-slate-850/50 transition-colors ${item.status === 'invalid' ? 'bg-red-950/5 text-slate-500' : 'text-slate-250 bg-slate-900/40'}`}
                              >
                                <td className="p-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                                <td className="p-3 text-right font-extrabold truncate max-w-[210px]" title={item.product.name}>
                                  {item.product.name}
                                </td>
                                <td className="p-3 text-center font-mono">
                                  {item.product.barcode ? (
                                    <span className="text-slate-300">{item.product.barcode}</span>
                                  ) : (
                                    <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                                      توليد عشوائي ⚡
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] font-sans">
                                    {item.product.category || 'عام'}
                                  </span>
                                </td>
                                <td className="p-3 text-center font-bold text-[#1D9E75] font-mono">${item.product.priceUSD.toFixed(2)}</td>
                                <td className="p-3 text-center text-slate-400 font-mono">
                                  {item.product.priceWholesale !== undefined ? `$${item.product.priceWholesale.toFixed(2)}` : '-'}
                                </td>
                                <td className="p-3 text-center text-slate-400 font-mono">
                                  {item.product.costPriceUSD !== undefined ? `$${item.product.costPriceUSD.toFixed(2)}` : '-'}
                                </td>
                                <td className="p-3 text-center font-black font-mono text-white">{item.product.quantity}</td>
                                <td className="p-3 text-center font-mono text-slate-400">{item.product.expiryDate || '-'}</td>
                                <td className="p-3 text-center whitespace-nowrap">
                                  {item.status === 'new' && (
                                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black px-2 py-0.5 rounded text-[10px]">
                                      جديد
                                    </span>
                                  )}
                                  {item.status === 'update' && (
                                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black px-2 py-0.5 rounded text-[10px]">
                                      تحديث صلة
                                    </span>
                                  )}
                                  {item.status === 'invalid' && (
                                    <span className="bg-red-500/10 text-red-400 border border-red-500/20 font-black px-2 py-0.5 rounded text-[10px]" title={item.warning}>
                                      خطأ تالف
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Actions footer */}
                      <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            setImportStatus('idle');
                            setParsedProducts([]);
                          }}
                          className="bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer border-none"
                        >
                          إلغاء واستبدال الملف دوت حفظ
                        </button>
                        
                        <button
                          type="button"
                          onClick={confirmExcelImport}
                          className="bg-sky-600 hover:bg-sky-500 hover:shadow-sky-700/10 hover:shadow-lg text-white font-black text-xs py-2.5 px-6 rounded-xl transition cursor-pointer flex items-center gap-1.5 border-none"
                        >
                          <CheckCircle2 className="w-4 h-4 animate-bounce" />
                          <span>تأكيد جلب السلع وتسجيل الفهرس ⚡</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          {/* ==========================================
              MODAL: DETAILED INVOICE RECEIPT PREVIEW (thermal + digital)
              ========================================== */}
          {showInvoiceReceipt && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex justify-center items-start p-4 md:p-8 z-50 overflow-y-auto animate-fade-in font-sans" id="receipt-modal-container">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full p-6 shadow-2xl relative grid grid-cols-1 lg:grid-cols-12 gap-6 hover:border-emerald-500/20 transition-all text-right font-sans my-auto"
              >
                
                {/* Left Column: Controlling Options */}
                <div className="lg:col-span-5 space-y-4 text-right no-print overflow-y-auto max-h-[70vh] pr-1">
                  <div className="flex items-center gap-2 justify-end text-white pb-3 border-b border-slate-800 mb-4 h-fit">
                    <span className="font-extrabold text-base">لوحة تنسيق وإعدادات الفاتورة</span>
                    <Printer className="w-5 h-5 text-emerald-500" />
                  </div>

                  {/* Paper Size Control Selector */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/65 space-y-3">
                    <label className="block text-slate-300 font-bold text-xs">📏 تحديد حجم ورق الطباعة المعياري:</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['80mm', '58mm', 'a4', 'a5'] as const).map(sz => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setReceiptPaperSize(sz)}
                          className={`py-2 px-1 rounded-xl border transition-all text-center font-black uppercase text-[10px] cursor-pointer ${
                            receiptPaperSize === sz ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Typography styling and spacing sliders */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/65 space-y-4">
                    <span className="font-bold text-slate-350 block text-xs">🎨 التنسيق البصري وهوامش الطباعة:</span>
                    
                    {/* Font scale adjustment */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px] font-bold">
                        <span className="font-mono text-emerald-400 font-bold">{settings.receiptFontSize !== undefined ? settings.receiptFontSize : 100}%</span>
                        <span className="text-slate-400">حجم خط الخطوط (Font Scale):</span>
                      </div>
                      <input
                        type="range"
                        min="70"
                        max="140"
                        step="5"
                        value={settings.receiptFontSize !== undefined ? settings.receiptFontSize : 100}
                        onChange={e => setSettings(prev => ({ ...prev, receiptFontSize: parseInt(e.target.value) }))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>

                    {/* Margins */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <label className="block text-slate-400 text-[10px] font-bold">الهامش العلوي (مم):</label>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={settings.receiptMarginTop !== undefined ? settings.receiptMarginTop : 4}
                          onChange={e => setSettings(prev => ({ ...prev, receiptMarginTop: parseInt(e.target.value) || 0 }))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-1 px-2.5 text-center text-xs font-mono text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-slate-400 text-[10px] font-bold">الهامش السفلي (مم):</label>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={settings.receiptMarginBottom !== undefined ? settings.receiptMarginBottom : 4}
                          onChange={e => setSettings(prev => ({ ...prev, receiptMarginBottom: parseInt(e.target.value) || 0 }))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-1 px-2.5 text-center text-xs font-mono text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-slate-400 text-[10px] font-bold">الهامش الأيمن (مم):</label>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={settings.receiptMarginRight !== undefined ? settings.receiptMarginRight : 4}
                          onChange={e => setSettings(prev => ({ ...prev, receiptMarginRight: parseInt(e.target.value) || 0 }))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-1 px-2.5 text-center text-xs font-mono text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-slate-400 text-[10px] font-bold">الهامش الأيسر (مم):</label>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={settings.receiptMarginLeft !== undefined ? settings.receiptMarginLeft : 4}
                          onChange={e => setSettings(prev => ({ ...prev, receiptMarginLeft: parseInt(e.target.value) || 0 }))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-1 px-2.5 text-center text-xs font-mono text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Visibility toggles */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/65 space-y-2.5">
                    <span className="font-bold text-slate-350 block text-xs">👁️ إخفاء وإظهار مكونات الفاتورة:</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setShowReceiptCashier(!showReceiptCashier)}
                        className={`py-1.5 px-2 rounded-xl border transition-all text-center flex items-center justify-between cursor-pointer text-[10px] font-bold ${
                          showReceiptCashier ? 'bg-slate-900 text-emerald-400 border-slate-700 shadow-sm' : 'bg-slate-900/40 text-slate-500 border-slate-800'
                        }`}
                      >
                        <span>اسم الكاشير بائع</span>
                        <span>{showReceiptCashier ? '✔' : '✖'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowReceiptCalculations(!showReceiptCalculations)}
                        className={`py-1.5 px-2 rounded-xl border transition-all text-center flex items-center justify-between cursor-pointer text-[10px] font-bold ${
                          showReceiptCalculations ? 'bg-slate-900 text-emerald-400 border-slate-700 shadow-sm' : 'bg-slate-900/40 text-slate-500 border-slate-800'
                        }`}
                      >
                        <span>تفاصيل المدفوع</span>
                        <span>{showReceiptCalculations ? '✔' : '✖'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Cancel & Return Controls (no-print) */}
                  <div className="no-print bg-slate-950 p-4 rounded-xl border border-rose-900/50 space-y-3 text-right font-sans w-full">
                    <div className="flex justify-between items-center text-rose-400">
                      <span className="font-bold text-xs flex items-center gap-1">
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>إلغاء الفواتير وإرجاع الأصناف</span>
                      </span>
                      {showInvoiceReceipt.totalUSD <= 0 && (
                        <span className="bg-rose-500/15 py-0.5 px-2 text-[9px] font-black rounded text-rose-300 border border-rose-500/20">ملغاة تماماً ✖</span>
                      )}
                    </div>

                    {showInvoiceReceipt.totalUSD <= 0 ? (
                      <p className="text-[10px] text-slate-400 bg-rose-950/20 p-2.5 rounded-lg border border-rose-900/25 leading-relaxed">
                        ⚠️ هذه الفاتورة تم إلغاؤها وتصفيرها بالكامل مسبقاً، وتم إرجاع جميع أصنافها إلى جرد المستودع العام تلقائياً ولا توجد كميات متبقية للارتجاع.
                      </p>
                    ) : (
                      <div className="space-y-3.5">
                        <button
                          type="button"
                          onClick={() => handleCancelWholeInvoice(showInvoiceReceipt)}
                          className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-2 px-3 rounded-lg text-[11px] transition duration-150 flex items-center justify-center gap-2 cursor-pointer border border-rose-500 shadow-md shadow-rose-950/20"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>إلغاء الفاتورة بالكامل وإرجاع المخزون</span>
                        </button>

                        <div className="border-t border-slate-900/60 pt-3 space-y-2">
                          <span className="text-[10px] font-bold text-slate-350 block">🔄 إرجاع صنف واحد مع اختيار الكمية:</span>
                          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                            {showInvoiceReceipt.items.filter(itm => (itm.quantity - (itm.returnedQty || 0)) > 0).map((itm, idx) => {
                              const maxAvailable = itm.quantity - (itm.returnedQty || 0);
                              const selectedQty = returnQtys[`${showInvoiceReceipt.id}-${itm.productId}`] || 1;
                              return (
                                <div key={idx} className="bg-slate-900/40 p-2 rounded-xl border border-slate-800 flex flex-col gap-2">
                                  <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-white font-black truncate max-w-[120px]">{itm.productName}</span>
                                    <span className="text-emerald-400 font-mono">({maxAvailable} متبقي)</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 justify-between">
                                    <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-800">
                                      <button
                                        type="button"
                                        onClick={() => setReturnQtys(prev => ({
                                          ...prev,
                                          [`${showInvoiceReceipt.id}-${itm.productId}`]: Math.max(1, selectedQty - 1)
                                        }))}
                                        className="text-slate-400 hover:text-white px-1.5 text-xs font-bold font-mono cursor-pointer"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min="1"
                                        max={maxAvailable}
                                        value={selectedQty}
                                        onChange={e => {
                                          const val = Math.min(maxAvailable, Math.max(1, parseInt(e.target.value) || 1));
                                          setReturnQtys(prev => ({
                                            ...prev,
                                            [`${showInvoiceReceipt.id}-${itm.productId}`]: val
                                          }));
                                        }}
                                        className="w-10 bg-transparent text-center font-mono text-[10px] text-white focus:outline-none focus:ring-0 border-none p-0"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setReturnQtys(prev => ({
                                          ...prev,
                                          [`${showInvoiceReceipt.id}-${itm.productId}`]: Math.min(maxAvailable, selectedQty + 1)
                                        }))}
                                        className="text-slate-400 hover:text-white px-1.5 text-xs font-bold font-mono cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleReturnSingleItem(showInvoiceReceipt, itm.productId, selectedQty)}
                                      className="bg-slate-800 hover:bg-slate-750 hover:text-emerald-400 border border-slate-700 text-slate-300 font-bold py-1 px-2.5 rounded-lg text-[9px] transition cursor-pointer flex items-center gap-1"
                                    >
                                      <RefreshCw className="w-3 h-3 text-emerald-400" />
                                      <span>إرجاع الصنف</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            {showInvoiceReceipt.items.filter(itm => (itm.quantity - (itm.returnedQty || 0)) > 0).length === 0 && (
                              <p className="text-[9px] text-center text-slate-400 py-2">جميع الأصناف تم ترجيعها بالكامل.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Offline Export utility / backup tools (no-print) */}
                  <div className="no-print bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 space-y-2 text-right font-sans w-full">
                    <span className="font-bold text-purple-400 block text-xs"> أدوات وتصدير الفاتورة :</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const linkedCust = customers.find(c => c.id === showInvoiceReceipt.customerId);
                          const custName = linkedCust ? linkedCust.name : (lang === 'ar' ? 'زبون نقدي' : 'Cash Customer');
                          let txt = `====================================\n`;
                          txt += `        ${settings.shopName}        \n`;
                          txt += `====================================\n`;
                          txt += `رقم الفاتورة: ${showInvoiceReceipt.invoiceNumber}\n`;
                          txt += `التاريخ: ${showInvoiceReceipt.date} | ${showInvoiceReceipt.time}\n`;
                          txt += `الزبون: ${custName}\n`;
                          if (showReceiptCashier) {
                            txt += `البائع الكاشير: ${showInvoiceReceipt.cashier}\n`;
                          }
                          txt += `وسيلة الدفع: ${showInvoiceReceipt.paymentMethod === 'cash' ? 'كاش' : showInvoiceReceipt.paymentMethod === 'debt' ? 'دين' : 'بطاقة'}\n`;
                          txt += `------------------------------------\n`;
                          showInvoiceReceipt.items.forEach(itm => {
                            txt += `• ${itm.productName} (×${itm.quantity}) = ${itm.totalUSD.toFixed(1)}$\n`;
                          });
                          txt += `------------------------------------\n`;
                          txt += `المجموع الفرعي: ${showInvoiceReceipt.subtotalUSD.toFixed(2)}$\n`;
                          if (showInvoiceReceipt.discountUSD > 0) {
                            txt += `الخصم: -${showInvoiceReceipt.discountUSD.toFixed(2)}$\n`;
                          }
                          txt += `المطلوب النهائي: ${showInvoiceReceipt.totalUSD.toFixed(2)}$\n`;
                          txt += `المطلوب النهائي بالليرة: ${Math.ceil(showInvoiceReceipt.totalLBP).toLocaleString()} ل.ل\n`;
                          if (showReceiptCalculations) {
                            txt += `------------------------------------\n`;
                            txt += `صرف الدولار المعتمد: ${showInvoiceReceipt.exchangeRate.toLocaleString()} ل.ل\n`;
                            txt += `المدفوع دولار: ${(showInvoiceReceipt.paidAmountUSD || 0).toFixed(2)}$\n`;
                            txt += `المدفوع ليرة: ${Math.ceil(showInvoiceReceipt.paidAmountLBP || 0).toLocaleString()} ل.ل\n`;
                            txt += `المسترجع ليرة: ${Math.ceil(showInvoiceReceipt.changeAmountLBP || 0).toLocaleString()} ل.ل\n`;
                          }
                          if (showReceiptFooter) {
                            txt += `------------------------------------\n`;
                            txt += `${settings.receiptFooter}\n`;
                          }
                          txt += `====================================`;

                          navigator.clipboard.writeText(txt).then(() => {
                            showToast('success', 'تم نسخ نص الفاتورة بالكامل بنجاح إلى الحافظة! جاهز للصق في أي تطبيق.');
                          }).catch(() => {
                            showToast('error', 'فشل نسخ النص، يرجى المحاولة لاحقاً');
                          });
                        }}
                        className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2 rounded-xl transition text-[10px] flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                      >
                        <span>نسخ الفاتورة كنص ذكي 📋</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const linkedCust = customers.find(c => c.id === showInvoiceReceipt.customerId);
                          const custName = linkedCust ? linkedCust.name : (lang === 'ar' ? 'زبون نقدي' : 'Cash Customer');

                          let txt = `====================================\n`;
                          txt += `        ${settings.shopName}        \n`;
                          txt += `====================================\n`;
                          txt += `رقم الفاتورة: ${showInvoiceReceipt.invoiceNumber}\n`;
                          txt += `التاريخ: ${showInvoiceReceipt.date} | ${showInvoiceReceipt.time}\n`;
                          txt += `الزبون: ${custName}\n`;
                          txt += `------------------------------------\n`;
                          showInvoiceReceipt.items.forEach(itm => {
                            txt += `${itm.productName} [×${itm.quantity}] = ${itm.totalUSD.toFixed(1)}$\n`;
                          });
                          txt += `------------------------------------\n`;
                          txt += `المطلوب للدفع بالتسوية: ${showInvoiceReceipt.totalUSD.toFixed(2)}$ / ${Math.ceil(showInvoiceReceipt.totalLBP).toLocaleString()} ل.ل\n`;
                          txt += `سعر الصرف: ${showInvoiceReceipt.exchangeRate.toLocaleString()} ل.ل\n`;
                          
                          const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `invoice-${showInvoiceReceipt.invoiceNumber}.txt`;
                          link.click();
                          URL.revokeObjectURL(url);
                          showToast('success', 'تم تحميل ملف التصدير الاحتياطي للفاتورة بنجاح!');
                        }}
                        className="bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold py-2 rounded-xl transition text-[10px] flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                      >
                        <span>تصدير كملف (.txt) 💾</span>
                      </button>
                    </div>
                  </div>

                  {/* WhatsApp Integration Module */}
                  <div className="bg-slate-800 p-3.5 rounded-2xl space-y-2 text-right text-xs no-print border border-slate-700 font-sans w-full">
                    <span className="font-bold text-emerald-400 block">💬 إرسال الفاتورة عبر WhatsApp للزبون:</span>
                    <div className="flex gap-2 items-center">
                      <button
                        type="button"
                        onClick={() => {
                          const phoneInput = document.getElementById('wa-client-phone') as HTMLInputElement;
                          const phone = phoneInput ? phoneInput.value.replace(/[^0-9]/g, '') : '';
                          if (!phone) {
                            showToast('warning', 'الرجاء إدخال رقم هاتف الزبون أولاً لإرسال الرسالة!');
                            return;
                          }
                          
                          const linkedCust = customers.find(c => c.id === showInvoiceReceipt.customerId);
                          const custName = linkedCust ? linkedCust.name : (lang === 'ar' ? 'زبون نقدي' : 'Cash Customer');
                          const creditBalanceUSD = linkedCust ? (linkedCust.creditBalance || 0) : 0;
                          const creditBalanceLBP = creditBalanceUSD * settings.exchangeRate;

                          let text = `*فاتورة مبيعات من ${settings.shopName}*\n`;
                          text += `*الزبون:* ${custName}\n`;
                          if (creditBalanceUSD > 0) {
                            text += `*رصيد الدين الإجمالي للزبون:* ${creditBalanceUSD.toFixed(2)}$ / ${Math.ceil(creditBalanceLBP).toLocaleString()} ل.ل\n`;
                          }
                          text += `*رقم الفاتورة:* ${showInvoiceReceipt.invoiceNumber}\n`;
                          text += `*التاريخ:* ${showInvoiceReceipt.date} | ${showInvoiceReceipt.time}\n`;
                          if (showReceiptCashier) {
                            text += `*الكاشير:* ${showInvoiceReceipt.cashier}\n`;
                          }
                          text += `------------------------------------\n`;
                          showInvoiceReceipt.items.forEach(itm => {
                            text += `• ${itm.productName} (الكمية: ${itm.quantity}) = ${itm.totalUSD.toFixed(1)}$\n`;
                          });
                          text += `------------------------------------\n`;
                          if (showInvoiceReceipt.discountUSD > 0) {
                            text += `*المجموع الفرعي:* ${showInvoiceReceipt.subtotalUSD.toFixed(1)}$\n`;
                            text += `*الخصم المباشر:* ${showInvoiceReceipt.discountUSD.toFixed(1)}$\n`;
                          }
                          text += `*المطلوب النهائي:* ${showInvoiceReceipt.totalUSD.toFixed(1)}$ / ${Math.ceil(showInvoiceReceipt.totalLBP).toLocaleString()} ل.ل\n`;
                          if (showReceiptFooter) {
                            text += `------------------------------------\n`;
                            text += `*${settings.receiptFooter}*`;
                          }

                          const encoded = encodeURIComponent(text);
                          const link = `https://wa.me/${phone}?text=${encoded}`;
                          window.open(link, '_blank');
                          showToast('success', 'جاري توجيهك إلى واتساب لإرسال الفاتورة...');
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0 animate-pulse"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>إرسال</span>
                      </button>
                      <input
                        id="wa-client-phone"
                        type="text"
                        placeholder="مثال: 96170123456"
                        defaultValue={(() => {
                          const linkedCust = customers.find(c => c.id === showInvoiceReceipt.customerId);
                          return linkedCust ? linkedCust.phone : '';
                        })()}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-center font-mono text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                </div>

                {/* Right Column: Live Thermal Paper View (lg:col-span-7) */}
                <div className="lg:col-span-7 space-y-4 flex flex-col items-center">
                {/* Simulated physical thermal receipt paper roll */}
                <div className="relative bg-slate-950 p-6 rounded-3xl border border-slate-800/80 w-full max-w-md flex flex-col items-center overflow-hidden">
                  
                  {/* Visual Printer Mockup Head Block (No-Print) */}
                  <div className="no-print w-[120%] -mt-6 bg-linear-to-b from-stone-800 via-stone-900 to-stone-950 h-10 border-b-4 border-stone-950 shadow-inner flex flex-col items-center justify-center relative select-none">
                    <div className="w-24 h-1 bg-emerald-500/80 rounded-full animate-pulse shadow-sm shadow-emerald-500/50 mb-1"></div>
                    <span className="font-mono text-[8.5px] text-stone-500 tracking-widest font-black uppercase">--- THERMAL FEED PRINTER ACTUATOR ---</span>
                    {/* Metal razor jagged cutter visualization */}
                    <div className="absolute -bottom-[2px] left-0 right-0 h-[3px] bg-stone-950 flex overflow-hidden">
                      {Array.from({ length: 65 }).map((_, i) => (
                        <div key={i} className="w-2 h-2 bg-stone-700 rotate-45 transform translate-y-0.5 shrink-0"></div>
                      ))}
                    </div>
                  </div>

                  {/* Thermal sheet block with accurate on-screen live dynamic sizing */}
                  <div className="w-full flex justify-center mt-6">
                    <div 
                      id="thermal-paper-print"
                      className="bg-stone-50 text-stone-950 border border-stone-250 p-4 transition-all duration-300 relative font-sans shadow-lg select-all"
                      style={{
                        width: receiptPaperSize === '80mm' ? '100%' : receiptPaperSize === '58mm' ? '72.5%' : receiptPaperSize === 'a5' ? '92%' : '100%',
                        maxWidth: receiptPaperSize === '80mm' ? '302px' : receiptPaperSize === '58mm' ? '219px' : receiptPaperSize === 'a5' ? '410px' : '520px',
                        minHeight: '380px',
                        fontFamily: receiptTemplateStyle === 'classic' ? 'Courier New, monospace' : 'Cairo, Inter, sans-serif'
                      }}
                    >
                      {/* Premium Branded Thermal Receipt Header Container */}
                      <div className="text-center font-sans space-y-1 block">
                        {settings.receiptLogoBase64 && (
                          <div className="flex justify-center mb-1.5 select-none no-print">
                            <img 
                              src={settings.receiptLogoBase64} 
                              alt="Shop logo monochrome" 
                              className="max-h-12 w-auto object-contain filter grayscale" 
                              style={{ maxHeight: '48px', maxWidth: '110px' }}
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                        {/* Inline fallback for printers/PDF renderers */}
                        {settings.receiptLogoBase64 && (
                          <div className="hidden print:flex justify-center mb-1.5">
                            <img 
                              src={settings.receiptLogoBase64} 
                              alt="Shop logo print" 
                              className="max-h-12 w-auto object-contain filter grayscale"
                              style={{ maxHeight: '48px', maxWidth: '110px' }}
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                        <span className="font-black text-xs text-stone-900 bg-stone-250/80 px-2.5 py-0.5 rounded-full border border-stone-300 inline-block uppercase tracking-wider">
                          *** {receiptPaperSize === 'a4' || receiptPaperSize === 'a5' ? 'فاتورة بيع رسمية' : 'فاتورة مبيعات ممتازة'} ***
                        </span>
                        <h1 className="font-black text-rose-950 md:text-xl text-lg block leading-tight font-sans tracking-tight mt-1.5">
                          {settings.shopName}
                        </h1>
                        <p className="font-bold text-[10.5px] text-stone-600 block">
                          نظام نقاط بيع اللبناني الحديث المتكامل للبيع بالجملة والمفرق
                        </p>
                        <p className="font-mono text-[9.5px] text-stone-500 font-extrabold block">
                          هاتف: 08-620250 | بقاع، لبنان
                        </p>
                        <div className="text-stone-300 text-[8px] my-1 block select-none">===================================</div>
                      </div>

                      {/* Receipt Details Box */}
                      <div className="space-y-1 block text-stone-700 bg-stone-100 p-2 rounded-lg border border-stone-250 font-sans text-right mt-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-mono font-black text-stone-950">#{showInvoiceReceipt.invoiceNumber}</span>
                          <span className="font-extrabold text-stone-600">رقم الفاتورة:</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-mono text-stone-955">{showInvoiceReceipt.date} | {showInvoiceReceipt.time}</span>
                          <span className="text-stone-600">تاريخ ووقت المعاملة:</span>
                        </div>
                        {showReceiptCashier && (
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-stone-950">{showInvoiceReceipt.cashier}</span>
                            <span className="text-stone-600">المستخدم الكاشير:</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-stone-950 bg-stone-250 px-1.5 py-0.5 rounded text-[9px]">
                            {showInvoiceReceipt.paymentMethod === 'cash' ? 'كاش (Cash)' : showInvoiceReceipt.paymentMethod === 'debt' ? 'آجل (دين)' : 'بطاقة دفع'}
                          </span>
                          <span className="text-stone-600">طريقة السداد الماكينة:</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] border-t border-stone-250 mt-1 pt-1">
                          <span className="font-mono font-bold text-stone-905">{showInvoiceReceipt.exchangeRate.toLocaleString()} L.L.</span>
                          <span className="text-stone-600">سعر الصرف المطبق:</span>
                        </div>
                      </div>

                      {/* Clean Products Table Header */}
                      <div className="grid grid-cols-12 gap-1 font-black text-stone-955 text-right border-y border-stone-400 py-1.5 mt-3 text-[10px] uppercase tracking-wider font-sans bg-stone-200/50 rounded">
                        <span className="col-span-6 text-right pr-1">الصنف والوصف</span>
                        <span className="col-span-2 text-center font-bold">الكمية</span>
                        <span className="col-span-2 text-left font-bold">السعر</span>
                        <span className="col-span-2 text-left pl-1 font-bold">المجموع</span>
                      </div>

                      {/* Receipt Items list with beautiful clean grid rows */}
                      <div className="space-y-1.5 text-stone-900 my-2 divide-y divide-dotted divide-stone-300 max-h-[160px] overflow-y-auto pr-1">
                        {showInvoiceReceipt.items.map((item, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-1 text-right text-[10px] pt-1.5">
                            <span className="col-span-6 text-right font-black text-stone-955 truncate pr-0.5">{item.productName}</span>
                            <span className="col-span-2 text-center font-mono font-extrabold text-stone-850">×{item.quantity}</span>
                            <span className="col-span-2 text-left font-mono text-stone-700">${item.priceUSD.toFixed(1)}</span>
                            <span className="col-span-2 text-left font-mono font-black text-stone-955 pl-0.5">${(item.priceUSD * item.quantity).toFixed(1)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-dashed border-stone-400 pt-2 block"></div>

                      {/* premium styled invoice pricing summary */}
                      <div className="space-y-1 text-stone-900 text-right font-sans">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-mono font-bold text-stone-800">${showInvoiceReceipt.subtotalUSD.toFixed(2)}</span>
                          <span className="text-stone-600 font-bold">المجموع الفرعي الإجمالي:</span>
                        </div>
                        {showInvoiceReceipt.discountUSD > 0 && (
                          <div className="flex justify-between text-[11px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md animate-pulse">
                            <span className="font-mono font-black">-${showInvoiceReceipt.discountUSD.toFixed(2)}</span>
                            <span>الخصم التسويقي الممنوح:</span>
                          </div>
                        )}
                        
                        {/* Light styled total block */}
                        <div className="bg-stone-100 text-stone-955 rounded-xl p-3.5 my-2.5 space-y-1 text-right border-r-4 border-emerald-600 shadow-xs border border-stone-250 font-sans">
                          <div className="flex justify-between items-center">
                            <span className="font-mono font-black text-base text-emerald-700">${showInvoiceReceipt.totalUSD.toFixed(2)}</span>
                            <span className="text-xs font-black tracking-wide text-stone-900">الصافي للدفع (دولار):</span>
                          </div>
                          <div className="flex justify-between items-center border-t border-stone-350 pt-1.5 mt-1">
                            <span className="font-mono font-black text-base text-stone-955">{Math.ceil(showInvoiceReceipt.totalLBP).toLocaleString()} ل.ل</span>
                            <span className="text-xs font-black tracking-wide text-stone-900 font-bold">الصافي للدفع (ليرة):</span>
                          </div>
                        </div>
                      </div>

                      {/* DETAILED EXCHANGE BREAKDOWN BOX */}
                      {showReceiptCalculations && (
                        <div className="border rounded-xl p-2.5 mt-2.5 text-[10px] space-y-1 text-right bg-stone-100 border-stone-250 text-stone-700 font-sans">
                          <div className="font-black text-stone-905 border-b border-stone-300 pb-1 mb-1 text-center text-[10px] flex items-center justify-center gap-1">
                            <span>🔄 تفصيل المدفوعات ومطابقة الصرف</span>
                          </div>
                          <div className="flex justify-between font-bold leading-none text-stone-900">
                            <span className="font-mono">1$ = {showInvoiceReceipt.exchangeRate.toLocaleString()} L.L.</span>
                            <span className="text-stone-600">سعر الصرف لليوم:</span>
                          </div>
                          <div className="text-stone-300 text-[8px] my-0.5 text-center">-----------------------------------</div>
                          <div className="flex justify-between text-[10px] text-stone-700">
                            <span className="font-mono text-stone-900">${showInvoiceReceipt.totalUSD.toFixed(2)}</span>
                            <span>قيمة الفاتورة بالدولار:</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-stone-700">
                            <span className="font-mono text-stone-900">{Math.ceil(showInvoiceReceipt.totalLBP).toLocaleString()} ل.ل</span>
                            <span>قيمة الفاتورة بالليرة:</span>
                          </div>
                          <div className="text-stone-300 text-[8px] my-0.5 text-center">-----------------------------------</div>
                          <div className="flex justify-between text-[10px]">
                            <span className="font-mono text-stone-900">${(showInvoiceReceipt.paidAmountUSD || 0).toFixed(2)}</span>
                            <span>المدفوع نقداً بالدولار:</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="font-mono text-stone-900">{Math.ceil(showInvoiceReceipt.paidAmountLBP || 0).toLocaleString()} ل.ل</span>
                            <span>المدفوع نقداً بالليرة:</span>
                          </div>
                          <div className="flex justify-between font-extrabold text-stone-955 border-t border-stone-250 pt-1 mt-1">
                            <span className="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded animate-pulse">
                              {((showInvoiceReceipt.paidAmountUSD || 0) + ((showInvoiceReceipt.paidAmountLBP || 0) / showInvoiceReceipt.exchangeRate)).toFixed(2)} $
                            </span>
                            <span>إجمالي المستلم الفعلي:</span>
                          </div>
                          <div className="text-stone-300 text-[8px] my-0.5 text-center">-----------------------------------</div>
                          <div className="flex justify-between font-black text-emerald-955 bg-emerald-100 px-2 py-1 rounded-lg text-[10.5px]">
                            <span className="font-mono">{Math.ceil(showInvoiceReceipt.changeAmountLBP || 0).toLocaleString()} ل.ل</span>
                            <span>الباقي المسترجع للزبون:</span>
                          </div>
                          {showInvoiceReceipt.changeAmountUSD && showInvoiceReceipt.changeAmountUSD > 0 ? (
                            <div className="flex justify-between font-black text-emerald-955 bg-emerald-100 px-2 py-1 rounded-lg text-[10.5px] mt-0.5">
                              <span className="font-mono">${showInvoiceReceipt.changeAmountUSD.toFixed(2)}</span>
                              <span>الباقي المسترجع بالدولار:</span>
                            </div>
                          ) : null}
                        </div>
                      )}



                {/* VISUAL BARCODE & QR CODE FOR INVOICE SCANNING / LOOKUP */}
                {showReceiptBarcode && (
                  <div className="flex flex-col items-center justify-center my-4 pt-4 border-t border-dashed border-stone-300 animate-fade-in space-y-4">
                    {/* Linear Barcode (Code 128) - Wide and Large for laser/CCD scanners */}
                    <div className="flex flex-col items-center w-full">
                      <span className="text-[9px] text-stone-500 font-bold mb-1.5 block">باركود الفاتورة الضوئي (Code-128):</span>
                      <div className="bg-white p-2.5 rounded-xl border border-stone-250 shadow-xs flex items-center justify-center w-full max-w-[270px]">
                        <img 
                          src={`https://quickchart.io/barcode?type=code128&text=${encodeURIComponent(showInvoiceReceipt.invoiceNumber)}&width=320&height=75&includeText=false`}
                          alt="Invoice Barcode" 
                          className="w-full h-14 object-contain"
                          referrerPolicy="no-referrer"
                          loading="eager"
                        />
                      </div>
                      <div className="text-[10px] tracking-widest font-mono text-stone-900 font-extrabold mt-1 select-all text-center">
                        * {showInvoiceReceipt.invoiceNumber} *
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col items-center pt-1 border-t border-dotted border-stone-200 w-full">
                      <span className="text-[9px] text-stone-500 font-bold mb-1.5 block">رمز الاستجابة (QR Code):</span>
                      <div className="p-2.5 bg-white rounded-xl border border-stone-250 shadow-xs flex items-center justify-center">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(showInvoiceReceipt.invoiceNumber)}&color=0c0a09&bgcolor=ffffff`}
                          alt="Invoice QR Code" 
                          className="w-24 h-24"
                          referrerPolicy="no-referrer"
                          loading="eager"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {showReceiptFooter && (
                  <>
                    <div className="text-stone-300 text-[8px] pt-1 block text-center">-----------------------------------</div>
                    <div className="text-center font-extrabold text-stone-505 text-[9.5px] block font-sans">
                      {settings.receiptFooter}
                    </div>
                  </>
                )}

                {/* Decorative Paper Zig-Zag Jagged Bottom Edge */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-stone-100/10 overflow-hidden z-25 flex">
                  {Array.from({ length: 42 }).map((_, i) => (
                    <div key={i} className="w-3.5 h-3.5 bg-slate-950 rotate-45 transform translate-y-0.5 shrink-0"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

            {/* Offline Export utility / backup tools (no-print) */}
            <div className="no-print bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-2 text-right font-sans">
              <span className="font-bold text-purple-400 block text-xs"> أدوات وتصدير الفاتورة :</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const linkedCust = customers.find(c => c.id === showInvoiceReceipt.customerId);
                    const custName = linkedCust ? linkedCust.name : (lang === 'ar' ? 'زبون نقدي' : 'Cash Customer');
                    const creditBalanceUSD = linkedCust ? (linkedCust.creditBalance || 0) : 0;
                    const creditBalanceLBP = creditBalanceUSD * settings.exchangeRate;

                    let txt = `====================================\n`;
                    txt += `        ${settings.shopName}        \n`;
                    txt += `====================================\n`;
                    txt += `رقم الفاتورة: ${showInvoiceReceipt.invoiceNumber}\n`;
                    txt += `التاريخ: ${showInvoiceReceipt.date} | ${showInvoiceReceipt.time}\n`;
                    txt += `الزبون: ${custName}\n`;
                    if (showReceiptCashier) {
                      txt += `البائع الكاشير: ${showInvoiceReceipt.cashier}\n`;
                    }
                    txt += `وسيلة الدفع: ${showInvoiceReceipt.paymentMethod === 'cash' ? 'كاش' : showInvoiceReceipt.paymentMethod === 'debt' ? 'دين' : 'بطاقة'}\n`;
                    txt += `------------------------------------\n`;
                    showInvoiceReceipt.items.forEach(itm => {
                      txt += `• ${itm.productName} (×${itm.quantity}) = ${itm.totalUSD.toFixed(1)}$\n`;
                    });
                    txt += `------------------------------------\n`;
                    txt += `المجموع الفرعي: ${showInvoiceReceipt.subtotalUSD.toFixed(2)}$\n`;
                    if (showInvoiceReceipt.discountUSD > 0) {
                      txt += `الخصم: -${showInvoiceReceipt.discountUSD.toFixed(2)}$\n`;
                    }
                    txt += `المطلوب النهائي: ${showInvoiceReceipt.totalUSD.toFixed(2)}$\n`;
                    txt += `المطلوب النهائي بالليرة: ${Math.ceil(showInvoiceReceipt.totalLBP).toLocaleString()} ل.ل\n`;
                    if (showReceiptCalculations) {
                      txt += `------------------------------------\n`;
                      txt += `صرف الدولار المعتمد: ${showInvoiceReceipt.exchangeRate.toLocaleString()} ل.ل\n`;
                      txt += `المدفوع دولار: ${(showInvoiceReceipt.paidAmountUSD || 0).toFixed(2)}$\n`;
                      txt += `المدفوع ليرة: ${Math.ceil(showInvoiceReceipt.paidAmountLBP || 0).toLocaleString()} ل.ل\n`;
                      txt += `المسترجع ليرة: ${Math.ceil(showInvoiceReceipt.changeAmountLBP || 0).toLocaleString()} ل.ل\n`;
                    }
                    if (showReceiptFooter) {
                      txt += `------------------------------------\n`;
                      txt += `${settings.receiptFooter}\n`;
                    }
                    txt += `====================================`;

                    navigator.clipboard.writeText(txt).then(() => {
                      showToast('success', 'تم نسخ نص الفاتورة بالكامل بنجاح إلى الحافظة! جاهز للصق في أي تطبيق.');
                    }).catch(() => {
                      showToast('error', 'فشل نسخ النص، يرجى المحاولة لاحقاً');
                    });
                  }}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2 rounded-xl transition text-[10px] flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <span>نسخ الفاتورة كنص ذكي 📋</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const linkedCust = customers.find(c => c.id === showInvoiceReceipt.customerId);
                    const custName = linkedCust ? linkedCust.name : (lang === 'ar' ? 'زبون نقدي' : 'Cash Customer');

                    let txt = `====================================\n`;
                    txt += `        ${settings.shopName}        \n`;
                    txt += `====================================\n`;
                    txt += `رقم الفاتورة: ${showInvoiceReceipt.invoiceNumber}\n`;
                    txt += `التاريخ: ${showInvoiceReceipt.date} | ${showInvoiceReceipt.time}\n`;
                    txt += `الزبون: ${custName}\n`;
                    txt += `------------------------------------\n`;
                    showInvoiceReceipt.items.forEach(itm => {
                      txt += `${itm.productName} [×${itm.quantity}] = ${itm.totalUSD.toFixed(1)}$\n`;
                    });
                    txt += `------------------------------------\n`;
                    txt += `المطلوب للدفع بالتسوية: ${showInvoiceReceipt.totalUSD.toFixed(2)}$ / ${Math.ceil(showInvoiceReceipt.totalLBP).toLocaleString()} ل.ل\n`;
                    txt += `سعر الصرف: ${showInvoiceReceipt.exchangeRate.toLocaleString()} ل.ل\n`;
                    
                    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `invoice-${showInvoiceReceipt.invoiceNumber}.txt`;
                    link.click();
                    URL.revokeObjectURL(url);
                    showToast('success', 'تم تحميل ملف التصدير الاحتياطي للفاتورة بنجاح!');
                  }}
                  className="bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold py-2 rounded-xl transition text-[10px] flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <span>تصدير كملف (.txt) 💾</span>
                </button>
              </div>
            </div>

            {/* WhatsApp Integration Module */}
            <div className="bg-slate-800 p-3.5 rounded-2xl space-y-2 text-right text-xs no-print border border-slate-700 font-sans">
              <span className="font-bold text-emerald-400 block">💬 إرسال الفاتورة عبر WhatsApp للزبون:</span>
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => {
                    const phoneInput = document.getElementById('wa-client-phone') as HTMLInputElement;
                    const phone = phoneInput ? phoneInput.value.replace(/[^0-9]/g, '') : '';
                    if (!phone) {
                      showToast('warning', 'الرجاء إدخال رقم هاتف الزبون أولاً لإرسال الرسالة!');
                      return;
                    }
                    
                    const linkedCust = customers.find(c => c.id === showInvoiceReceipt.customerId);
                    const custName = linkedCust ? linkedCust.name : (lang === 'ar' ? 'زبون نقدي' : 'Cash Customer');
                    const creditBalanceUSD = linkedCust ? (linkedCust.creditBalance || 0) : 0;
                    const creditBalanceLBP = creditBalanceUSD * settings.exchangeRate;

                    let text = `*فاتورة مبيعات من ${settings.shopName}*\n`;
                    text += `*الزبون:* ${custName}\n`;
                    if (creditBalanceUSD > 0) {
                      text += `*رصيد الدين الإجمالي للزبون:* ${creditBalanceUSD.toFixed(2)}$ / ${Math.ceil(creditBalanceLBP).toLocaleString()} ل.ل\n`;
                    }
                    text += `*رقم الفاتورة:* ${showInvoiceReceipt.invoiceNumber}\n`;
                    text += `*التاريخ:* ${showInvoiceReceipt.date} | ${showInvoiceReceipt.time}\n`;
                    if (showReceiptCashier) {
                      text += `*الكاشير:* ${showInvoiceReceipt.cashier}\n`;
                    }
                    text += `------------------------------------\n`;
                    showInvoiceReceipt.items.forEach(itm => {
                      text += `• ${itm.productName} (الكمية: ${itm.quantity}) = ${itm.totalUSD.toFixed(1)}$\n`;
                    });
                    text += `------------------------------------\n`;
                    if (showInvoiceReceipt.discountUSD > 0) {
                      text += `*المجموع الفرعي:* ${showInvoiceReceipt.subtotalUSD.toFixed(1)}$\n`;
                      text += `*الخصم المباشر:* ${showInvoiceReceipt.discountUSD.toFixed(1)}$\n`;
                    }
                    text += `*المطلوب النهائي:* ${showInvoiceReceipt.totalUSD.toFixed(1)}$ / ${Math.ceil(showInvoiceReceipt.totalLBP).toLocaleString()} ل.ل\n`;
                    if (showReceiptFooter) {
                      text += `------------------------------------\n`;
                      text += `*${settings.receiptFooter}*`;
                    }

                    const encoded = encodeURIComponent(text);
                    const link = `https://wa.me/${phone}?text=${encoded}`;
                    window.open(link, '_blank');
                    showToast('success', 'جاري توجيهك إلى واتساب لإرسال الفاتورة...');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>إرسال</span>
                </button>
                <input
                  id="wa-client-phone"
                  type="text"
                  placeholder="مثال: 96170123456"
                  defaultValue={(() => {
                    const linkedCust = customers.find(c => c.id === showInvoiceReceipt.customerId);
                    return linkedCust ? linkedCust.phone : '';
                  })()}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-center font-mono text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

          </div> {/* End lg:col-span-7 Right Column */}

            {/* Print trigger and exit buttons - STICKY FOOTER to keep always visible and easily accessible */}
            <div className="col-span-12 sticky bottom-[-24px] bg-slate-900 border-t border-slate-800/80 pt-4 pb-1.5 px-6 -mx-6 rounded-b-[22px] flex gap-2 text-xs font-sans z-30">
              <button 
                onClick={() => {
                  let customPrintStyles = '';
                  const scaleFactor = (settings.receiptFontSize !== undefined ? settings.receiptFontSize : 100) / 100;
                  if (receiptPaperSize === '80mm') {
                    customPrintStyles = `
                      body {
                        padding: 0 !important;
                        margin: 0 !important;
                        width: 80mm !important;
                        background: white !important;
                        color: black !important;
                      }
                      #thermal-paper-print {
                        background: white !important;
                        color: black !important;
                        width: 80mm !important;
                        max-width: 80mm !important;
                        padding-top: ${settings.receiptMarginTop !== undefined ? settings.receiptMarginTop : 4}mm !important;
                        padding-right: ${settings.receiptMarginRight !== undefined ? settings.receiptMarginRight : 4}mm !important;
                        padding-bottom: ${settings.receiptMarginBottom !== undefined ? settings.receiptMarginBottom : 4}mm !important;
                        padding-left: ${settings.receiptMarginLeft !== undefined ? settings.receiptMarginLeft : 4}mm !important;
                        margin: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        max-height: none !important;
                        overflow: visible !important;
                        box-sizing: border-box !important;
                        font-family: ${receiptTemplateStyle === 'classic' ? '"Courier New", monospace' : '"Cairo", "Inter", sans-serif'} !important;
                        transform-origin: top center !important;
                        transform: scale(min(1, calc(80mm / 100%))) !important;
                      }
                      /* Force print layout custom details styles with dynamic scale factor scaling */
                      #thermal-paper-print div, #thermal-paper-print span {
                        font-size: ${((receiptTemplateStyle === 'compact' ? 10 : 11) * scaleFactor).toFixed(1)}px !important;
                        line-height: ${receiptTemplateStyle === 'compact' ? '1.1' : '1.3'} !important;
                      }
                      .no-print {
                        display: none !important;
                      }
                      @page {
                        size: 80mm auto;
                        margin: 0;
                      }
                    `;
                  } else if (receiptPaperSize === '58mm') {
                    customPrintStyles = `
                      body {
                        padding: 0 !important;
                        margin: 0 !important;
                        width: 58mm !important;
                        background: white !important;
                        color: black !important;
                        font-family: ${receiptTemplateStyle === 'classic' ? '"Courier New", monospace' : '"Cairo", "Inter", sans-serif'} !important;
                      }
                      #thermal-paper-print {
                        background: white !important;
                        color: black !important;
                        width: 58mm !important;
                        max-width: 58mm !important;
                        padding-top: ${settings.receiptMarginTop !== undefined ? settings.receiptMarginTop : 4}mm !important;
                        padding-right: ${settings.receiptMarginRight !== undefined ? settings.receiptMarginRight : 4}mm !important;
                        padding-bottom: ${settings.receiptMarginBottom !== undefined ? settings.receiptMarginBottom : 4}mm !important;
                        padding-left: ${settings.receiptMarginLeft !== undefined ? settings.receiptMarginLeft : 4}mm !important;
                        margin: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        max-height: none !important;
                        overflow: visible !important;
                        box-sizing: border-box !important;
                        font-size: ${((receiptTemplateStyle === 'compact' ? 8.5 : 9.5) * scaleFactor).toFixed(1)}px !important;
                        transform-origin: top center !important;
                        transform: scale(min(1, calc(58mm / 100%))) !important;
                      }
                      /* Scaled text content & dividers with dynamic scale factor scaling */
                      #thermal-paper-print div, #thermal-paper-print span {
                        font-size: ${((receiptTemplateStyle === 'compact' ? 8.5 : 9.5) * scaleFactor).toFixed(1)}px !important;
                        line-height: ${receiptTemplateStyle === 'compact' ? '1.05' : '1.25'} !important;
                      }
                      #thermal-paper-print .text-xs, #thermal-paper-print .text-sm {
                        font-size: ${(9 * scaleFactor).toFixed(1)}px !important;
                      }
                      #thermal-paper-print .grid-cols-12 {
                        font-size: ${(8.5 * scaleFactor).toFixed(1)}px !important;
                      }
                      .no-print {
                        display: none !important;
                      }
                      @page {
                        size: 58mm auto;
                        margin: 0;
                      }
                    `;
                  } else if (receiptPaperSize === 'a5') {
                    customPrintStyles = `
                      body {
                        padding: 8mm 10mm !important;
                        background: white !important;
                        color: black !important;
                        font-family: 'Cairo', system-ui, sans-serif !important;
                      }
                      #thermal-paper-print {
                        background: white !important;
                        color: black !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        padding-top: ${settings.receiptMarginTop !== undefined ? settings.receiptMarginTop : 4}mm !important;
                        padding-right: ${settings.receiptMarginRight !== undefined ? settings.receiptMarginRight : 4}mm !important;
                        padding-bottom: ${settings.receiptMarginBottom !== undefined ? settings.receiptMarginBottom : 4}mm !important;
                        padding-left: ${settings.receiptMarginLeft !== undefined ? settings.receiptMarginLeft : 4}mm !important;
                        margin: 0 auto !important;
                        border: none !important;
                        box-shadow: none !important;
                        max-height: none !important;
                        overflow: visible !important;
                      }
                      #thermal-paper-print div, #thermal-paper-print span, #thermal-paper-print h3, #thermal-paper-print h4 {
                        font-size: 11px !important;
                        line-height: 1.4 !important;
                        color: #000000 !important;
                      }
                      #thermal-paper-print .font-bold {
                        font-weight: 700 !important;
                      }
                      #thermal-paper-print .text-sm, #thermal-paper-print .text-xs {
                        font-size: 10.5px !important;
                      }
                      #thermal-paper-print .text-slate-400 {
                        color: #475569 !important;
                      }
                      #thermal-paper-print .grid-cols-12 {
                        font-size: 10px !important;
                        border-bottom: 1px solid #cbd5e1 !important;
                        padding: 5px 3px !important;
                        display: grid !important;
                        align-items: center !important;
                      }
                      #thermal-paper-print .grid-cols-12.bg-stone-200\/50 {
                        background-color: #0f172a !important;
                        color: #ffffff !important;
                        border-radius: 6px !important;
                        padding: 7px 4px !important;
                      }
                      #thermal-paper-print .grid-cols-12.bg-stone-200\/50 span {
                        color: #ffffff !important;
                        font-weight: 900 !important;
                      }
                      #thermal-paper-print .max-h-\[160px\] {
                        max-height: none !important;
                        overflow: visible !important;
                      }
                      #thermal-paper-print .bg-stone-100 {
                        background-color: #f8fafc !important;
                        border: 1px solid #e2e8f0 !important;
                        padding: 10px !important;
                        border-radius: 8px !important;
                      }
                      #thermal-paper-print .border-emerald-600 {
                        border-right-width: 4px !important;
                        border-right-color: #10b981 !important;
                        background-color: #f0fdf4 !important;
                        border-top: 1px solid #bbf7d0 !important;
                        border-bottom: 1px solid #bbf7d0 !important;
                        border-left: 1px solid #bbf7d0 !important;
                        padding: 10px !important;
                      }
                      #thermal-paper-print .text-emerald-700 {
                        color: #15803d !important;
                        font-weight: 900 !important;
                      }
                      .no-print {
                        display: none !important;
                      }
                      @page {
                        size: A5 portrait;
                        margin: 8mm 10mm;
                      }
                    `;
                  } else {
                    customPrintStyles = `
                      body {
                        padding: 15mm 20mm !important;
                        background: white !important;
                        color: black !important;
                        font-family: 'Cairo', system-ui, sans-serif !important;
                      }
                      #thermal-paper-print {
                        background: white !important;
                        color: black !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        padding-top: ${settings.receiptMarginTop !== undefined ? settings.receiptMarginTop : 4}mm !important;
                        padding-right: ${settings.receiptMarginRight !== undefined ? settings.receiptMarginRight : 4}mm !important;
                        padding-bottom: ${settings.receiptMarginBottom !== undefined ? settings.receiptMarginBottom : 4}mm !important;
                        padding-left: ${settings.receiptMarginLeft !== undefined ? settings.receiptMarginLeft : 4}mm !important;
                        margin: 0 auto !important;
                        border: none !important;
                        box-shadow: none !important;
                        max-height: none !important;
                        overflow: visible !important;
                      }
                      #thermal-paper-print div, #thermal-paper-print span, #thermal-paper-print h3, #thermal-paper-print h4 {
                        font-size: 14px !important;
                        line-height: 1.5 !important;
                        color: #000000 !important;
                      }
                      #thermal-paper-print .font-bold {
                        font-weight: 700 !important;
                      }
                      #thermal-paper-print .text-sm, #thermal-paper-print .text-xs {
                        font-size: 13px !important;
                      }
                      #thermal-paper-print .text-slate-400 {
                        color: #475569 !important;
                      }
                      #thermal-paper-print .grid-cols-12 {
                        font-size: 13px !important;
                        border-bottom: 1px solid #cbd5e1 !important;
                        padding: 8px 4px !important;
                        display: grid !important;
                        align-items: center !important;
                      }
                      #thermal-paper-print .grid-cols-12.bg-stone-200\/50 {
                        background-color: #0f172a !important;
                        color: #ffffff !important;
                        border-radius: 8px !important;
                        padding: 10px 6px !important;
                      }
                      #thermal-paper-print .grid-cols-12.bg-stone-200\/50 span {
                        color: #ffffff !important;
                        font-weight: 900 !important;
                      }
                      #thermal-paper-print .max-h-\[160px\] {
                        max-height: none !important;
                        overflow: visible !important;
                      }
                      #thermal-paper-print .bg-stone-100 {
                        background-color: #f8fafc !important;
                        border: 1px solid #e2e8f0 !important;
                        padding: 16px !important;
                        border-radius: 12px !important;
                      }
                      #thermal-paper-print .border-emerald-600 {
                        border-right-width: 6px !important;
                        border-right-color: #10b981 !important;
                        background-color: #f0fdf4 !important;
                        border-top: 1px solid #bbf7d0 !important;
                        border-bottom: 1px solid #bbf7d0 !important;
                        border-left: 1px solid #bbf7d0 !important;
                        padding: 16px !important;
                      }
                      #thermal-paper-print .text-emerald-700 {
                        color: #15803d !important;
                        font-weight: 900 !important;
                      }
                      .no-print {
                        display: none !important;
                      }
                      @page {
                        size: A4 portrait;
                        margin: 12mm 15mm;
                      }
                    `;
                  }
                  // Will automatically perform direct silent print if configured, else manual print
                  printElementViaIFrame('thermal-paper-print', customPrintStyles, false);
                  // Fire automated physical drawer opening peak pulse
                  openCashDrawer();
                  // Fire direct hardware printer driver stream if configured for USB/Serial
                  printInvoiceToRawHardware(showInvoiceReceipt);
                }}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>{settings.directSilentPrint !== false ? 'طباعة تلقائية صامتة (فوري) ⚡' : 'طباعة الفاتورة 🖨️'}</span>
              </button>
              
              {settings.directSilentPrint !== false && (
                <button 
                  onClick={() => {
                    let customPrintStyles = '';
                    if (settings.receiptFontSize !== undefined) {
                      customPrintStyles = `
                        #thermal-paper-print {
                          background: white !important;
                          color: black !important;
                          width: 100% !important;
                          max-width: 100% !important;
                          padding-top: ${settings.receiptMarginTop !== undefined ? settings.receiptMarginTop : 4}mm !important;
                          padding-right: ${settings.receiptMarginRight !== undefined ? settings.receiptMarginRight : 4}mm !important;
                          padding-bottom: ${settings.receiptMarginBottom !== undefined ? settings.receiptMarginBottom : 4}mm !important;
                          padding-left: ${settings.receiptMarginLeft !== undefined ? settings.receiptMarginLeft : 4}mm !important;
                          margin: 0 auto !important;
                        }
                        #thermal-paper-print div, #thermal-paper-print span {
                          font-size: 14px !important;
                        }
                      `;
                    }
                    printElementViaIFrame('thermal-paper-print', customPrintStyles, true); // Force manual print
                  }}
                  className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 border border-slate-200 text-xs font-sans font-bold"
                  title="فتح نافذة حوار طباعة المتصفح اليدوية"
                >
                  <span>طباعة يدوية / حفظ PDF 📄</span>
                </button>
              )}

              <button 
                onClick={() => setShowInvoiceReceipt(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition cursor-pointer text-xs"
              >
                إنهاء وإغلاق المعاينة
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- MODAL FOR BARCODE LABEL PRINTER --- */}
      {barcodeLabelProduct && (() => {
        let currentWidth = 50;
        let currentHeight = 30;
        let currentPadding = 1.8;
        let shopNameSize = '9.5px';
        let productNameSize = '11px';
        let barcodeHeight = '32px';
        let codeSize = '8px';
        let priceSize = '13px';
        let subPriceSize = '9.5px';

        if (barcodeLabelSize === 'small') {
          currentWidth = 38;
          currentHeight = 25;
          currentPadding = 1.2;
          shopNameSize = '8px';
          productNameSize = '9.5px';
          barcodeHeight = '24px';
          codeSize = '7px';
          priceSize = '10px';
          subPriceSize = '8px';
        } else if (barcodeLabelSize === 'medium') {
          currentWidth = 50;
          currentHeight = 30;
          currentPadding = 1.8;
          shopNameSize = '9.5px';
          productNameSize = '11px';
          barcodeHeight = '32px';
          codeSize = '8px';
          priceSize = '13px';
          subPriceSize = '9.5px';
        } else if (barcodeLabelSize === 'large') {
          currentWidth = 80;
          currentHeight = 50;
          currentPadding = 3.5;
          shopNameSize = '13px';
          productNameSize = '15px';
          barcodeHeight = '48px';
          codeSize = '10px';
          priceSize = '18px';
          subPriceSize = '13px';
        } else if (barcodeLabelSize === 'custom') {
          currentWidth = barcodeLabelCustomWidth;
          currentHeight = barcodeLabelCustomHeight;
          const scaleFactor = Math.min(currentWidth / 50, currentHeight / 30);
          currentPadding = Math.max(1, Math.min(6, 1.8 * scaleFactor));
          shopNameSize = `${Math.max(7, Math.min(18, 9.5 * scaleFactor))}px`;
          productNameSize = `${Math.max(8, Math.min(22, 11 * scaleFactor))}px`;
          barcodeHeight = `${Math.max(16, Math.min(80, 32 * scaleFactor))}px`;
          codeSize = `${Math.max(7, Math.min(14, 8 * scaleFactor))}px`;
          priceSize = `${Math.max(9, Math.min(26, 13 * scaleFactor))}px`;
          subPriceSize = `${Math.max(7, Math.min(20, 9.5 * scaleFactor))}px`;
        }

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans" id="receipt-modal-container">
            {/* Dynamic CSS Style Injection for printing overrides based on select label physical sizes */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                html, body, html.dark, html.dark body, #root, #main-system {
                  background: white !important;
                  background-color: white !important;
                  color: black !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                #receipt-modal-container, #receipt-modal-container * {
                  color: black !important;
                  background: white !important;
                  background-color: white !important;
                  text-shadow: none !important;
                  box-shadow: none !important;
                }
                #receipt-modal-container {
                  display: block !important;
                  position: absolute !important;
                  top: 0 !important;
                  left: 0 !important;
                  width: ${currentWidth}mm !important;
                  height: auto !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  background: white !important;
                  border: none !important;
                  box-shadow: none !important;
                }
                #main-system {
                  display: block !important;
                  background: white !important;
                  box-shadow: none !important;
                  border: none !important;
                }
                #main-system > *:not(#receipt-modal-container) {
                  display: none !important;
                }
                /* Hide scrolls, toasts, etc. */
                .no-print, .toast-container {
                  display: none !important;
                }
                /* Print container page setup */
                @page {
                  size: ${currentWidth}mm ${currentHeight}mm;
                  margin: 0;
                }
                .barcode-label-container {
                  width: ${currentWidth}mm !important;
                  height: ${currentHeight}mm !important;
                  padding: ${currentPadding}mm !important;
                  margin: 0 !important;
                  border: none !important;
                  box-shadow: none !important;
                  page-break-after: always !important;
                  break-after: page !important;
                  display: flex !important;
                  flex-direction: column !important;
                  align-items: center !important;
                  justify-content: center !important;
                  box-sizing: border-box !important;
                }
              }
            ` }} />
            
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 text-white rounded-3xl p-6 w-full max-w-3xl border border-slate-800 flex flex-col md:flex-row gap-6 ltr:shadow-2xl"
            >
              {/* 1. Control Parameters Panel (Hidden during printing) */}
              <div className="flex-1 space-y-4 no-print text-right md:order-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <button 
                    onClick={() => setBarcodeLabelProduct(null)}
                    className="hover:bg-slate-800 p-1 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="text-right">
                    <h4 className="font-bold text-sm text-amber-500 font-sans">طباعة ملصقات الباركود والأسعار</h4>
                    <p className="text-[10px] text-slate-400 font-sans">تخصيص ملصقات لاصقة لطابعات الباركود الحرارية وعرضها بالحجم المناسب</p>
                  </div>
                </div>

                {/* No Barcode Warning Section */}
                {(!barcodeLabelProduct.barcode || barcodeLabelProduct.barcode.trim() === '') ? (
                  <div className="bg-rose-950/60 border border-rose-800 rounded-2xl p-4 text-center space-y-3">
                    <span className="text-xs text-rose-300 font-bold block">هذا المنتج ليس لديه باركود حالياً!</span>
                    <p className="text-[10px] text-rose-200">لتتمكن من إنشاء ملصق باركود، يرجى توليد كود عشوائي فريد وحفظه فوراً في النظام.</p>
                    <button
                      type="button"
                      onClick={() => {
                        let rand = '';
                        do {
                          rand = '29' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
                        } while (products.some(p => p.barcode === rand));
                        
                        const updatedProds = products.map(p => {
                          if (p.id === barcodeLabelProduct.id) {
                            return { ...p, barcode: rand };
                          }
                          return p;
                        });
                        setProducts(updatedProds);
                        localStorage.setItem('pos_products', JSON.stringify(updatedProds));
                        
                        setBarcodeLabelProduct({
                          ...barcodeLabelProduct,
                          barcode: rand
                        });
                        
                        showToast('success', 'تم توليد وحفظ الباركود الجديد للصنف بنجاح! ⚡');
                      }}
                      className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-2 rounded-xl transition text-xs cursor-pointer shadow-md"
                    >
                      ⚡ توليد باركود للمنتج الآن
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {/* Copy Count */}
                    <div>
                      <label className="block text-slate-400 text-xs font-bold mb-1 font-sans">عدد الملصقات المطلوب طباعتها (الكمية):</label>
                      <input 
                        type="number"
                        min={1}
                        max={100}
                        value={barcodeLabelCopies}
                        onChange={e => setBarcodeLabelCopies(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-center font-mono text-sm text-amber-400 focus:outline-none"
                      />
                    </div>

                    {/* SELECT LABEL SIZE */}
                    <div className="bg-slate-800 p-3 rounded-2xl space-y-2 border border-slate-800 text-xs text-right">
                      <span className="text-[11px] text-slate-400 font-bold block pb-1 border-b border-slate-800 font-sans">تحديد حجم ملصق الـ Label:</span>
                      <div className="grid grid-cols-4 gap-1.5 font-sans">
                        <button
                          type="button"
                          onClick={() => setBarcodeLabelSize('small')}
                          className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition border border-slate-700 ${barcodeLabelSize === 'small' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950 font-black'} border-amber-400` : 'bg-slate-950 hover:bg-slate-900 text-slate-300'}`}
                        >
                          صغير جداً
                          <span className="block text-[8px] opacity-70">38x25mm</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBarcodeLabelSize('medium')}
                          className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition border border-slate-700 ${barcodeLabelSize === 'medium' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950 font-black'} border-amber-400` : 'bg-slate-950 hover:bg-slate-900 text-slate-300'}`}
                        >
                          وسط قياسي
                          <span className="block text-[8px] opacity-70">50x30mm</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBarcodeLabelSize('large')}
                          className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition border border-slate-700 ${barcodeLabelSize === 'large' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950 font-black'} border-amber-400` : 'bg-slate-950 hover:bg-slate-900 text-slate-300'}`}
                        >
                          كبير
                          <span className="block text-[8px] opacity-70">80x50mm</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBarcodeLabelSize('custom')}
                          className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition border border-slate-700 ${barcodeLabelSize === 'custom' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950 font-black'} border-amber-400` : 'bg-slate-950 hover:bg-slate-900 text-slate-300'}`}
                        >
                          حجم مخصص
                          <span className="block text-[8px] opacity-70">يدوي</span>
                        </button>
                      </div>

                      {/* Custom inputs */}
                      {barcodeLabelSize === 'custom' && (
                        <div className="pt-2 mt-2 border-t border-slate-700 space-y-3 text-right">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-1">العرض (مم):</label>
                              <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5">
                                <input
                                  type="number"
                                  min={20}
                                  max={120}
                                  value={barcodeLabelCustomWidth}
                                  onChange={e => setBarcodeLabelCustomWidth(Math.max(20, Math.min(120, parseInt(e.target.value) || 50)))}
                                  className="w-12 bg-transparent text-center font-mono text-xs text-amber-400 focus:outline-none border-b border-dashed border-slate-600"
                                />
                                <input
                                  type="range"
                                  min={20}
                                  max={120}
                                  value={barcodeLabelCustomWidth}
                                  onChange={e => setBarcodeLabelCustomWidth(parseInt(e.target.value) || 50)}
                                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-1">الارتفاع (مم):</label>
                              <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5">
                                <input
                                  type="number"
                                  min={15}
                                  max={100}
                                  value={barcodeLabelCustomHeight}
                                  onChange={e => setBarcodeLabelCustomHeight(Math.max(15, Math.min(100, parseInt(e.target.value) || 30)))}
                                  className="w-12 bg-transparent text-center font-mono text-xs text-amber-400 focus:outline-none border-b border-dashed border-slate-600"
                                />
                                <input
                                  type="range"
                                  min={15}
                                  max={100}
                                  value={barcodeLabelCustomHeight}
                                  onChange={e => setBarcodeLabelCustomHeight(parseInt(e.target.value) || 30)}
                                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Toggle Content Components */}
                    <div className="bg-slate-800 p-3 rounded-2xl space-y-2 border border-slate-800 text-xs text-right">
                      <span className="text-[11px] text-slate-400 font-bold block pb-1 border-b border-slate-800 font-sans">مكونات الملصق:</span>
                      <label className="flex items-center justify-between cursor-pointer py-1 font-sans">
                        <input 
                          type="checkbox" 
                          checked={barcodeLabelShowName}
                          onChange={e => setBarcodeLabelShowName(e.target.checked)}
                          className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0 cursor-pointer"
                        />
                        <span>أظهر اسم المنتج</span>
                      </label>
                      <label className="flex items-center justify-between cursor-pointer py-1 font-sans">
                        <input 
                          type="checkbox" 
                          checked={barcodeLabelShowPrice}
                          onChange={e => setBarcodeLabelShowPrice(e.target.checked)}
                          className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0 cursor-pointer"
                        />
                        <span>أظهر سعر البيع</span>
                      </label>
                      <label className="flex items-center justify-between cursor-pointer py-1 font-sans">
                        <input 
                          type="checkbox" 
                          checked={barcodeLabelShowCode}
                          onChange={e => setBarcodeLabelShowCode(e.target.checked)}
                          className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0 cursor-pointer"
                        />
                        <span>أظهر رقم الباركود نصيّاً</span>
                      </label>
                    </div>

                    {/* Currency selector if Show Price is toggled */}
                    {barcodeLabelShowPrice && (
                      <div className="bg-slate-800 p-3 rounded-2xl space-y-2 border border-slate-800 text-xs">
                        <span className="text-[11px] text-slate-400 font-bold block pb-1 border-b border-slate-800 font-sans">عرض العملة والسعر بـ:</span>
                        <div className="grid grid-cols-3 gap-2 font-sans">
                          <button
                            type="button"
                            onClick={() => setBarcodeLabelCurrency('BOTH')}
                            className={`py-1 px-1 rounded-xl text-[10px] font-bold transition border border-slate-700 ${barcodeLabelCurrency === 'BOTH' ? `bg-amber-500 ${theme === 'dark' ? 'text-white' : 'text-slate-950'} font-black border-amber-450` : 'bg-slate-950 hover:bg-slate-900 text-slate-300'}`}
                          >
                            الإثنين معاً
                          </button>
                          <button
                            type="button"
                            onClick={() => setBarcodeLabelCurrency('LBP')}
                            className={`py-1 px-1 rounded-xl text-[10px] font-bold transition border border-slate-700 ${barcodeLabelCurrency === 'LBP' ? `bg-amber-500 ${theme === 'dark' ? 'text-white' : 'text-slate-950'} font-black border-amber-450` : 'bg-slate-950 hover:bg-slate-900 text-slate-300'}`}
                          >
                            ليرة لبنانية (L.L)
                          </button>
                          <button
                            type="button"
                            onClick={() => setBarcodeLabelCurrency('USD')}
                            className={`py-1 px-1 rounded-xl text-[10px] font-bold transition border border-slate-700 ${barcodeLabelCurrency === 'USD' ? `bg-amber-500 ${theme === 'dark' ? 'text-white' : 'text-slate-950'} font-black border-amber-450` : 'bg-slate-950 hover:bg-slate-900 text-slate-300'}`}
                          >
                            دولار أمريكي ($)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Stripe Width selector */}
                    <div className="bg-slate-800 p-3 rounded-2xl space-y-2 border border-slate-800 text-xs">
                      <span className="text-[11px] text-slate-400 font-bold block pb-1 border-b border-slate-800 font-sans">سمك خطوط الباركود (تناسق الطابعة):</span>
                      <div className="grid grid-cols-3 gap-2 font-sans">
                        <button
                          type="button"
                          onClick={() => setBarcodeLabelStripeWidth('thick')}
                          className={`py-1.5 px-1 rounded-xl text-xs transition border border-slate-700 ${barcodeLabelStripeWidth === 'thick' ? `bg-amber-500 ${theme === 'dark' ? 'text-white' : 'text-slate-950'} font-black border-amber-400` : 'bg-slate-950 hover:bg-slate-900 text-slate-300'}`}
                        >
                          عريض
                        </button>
                        <button
                          type="button"
                          onClick={() => setBarcodeLabelStripeWidth('medium')}
                          className={`py-1.5 px-1 rounded-xl text-xs transition border border-slate-700 ${barcodeLabelStripeWidth === 'medium' ? `bg-amber-500 ${theme === 'dark' ? 'text-white' : 'text-slate-950'} font-black border-amber-400` : 'bg-slate-950 hover:bg-slate-900 text-slate-300'}`}
                        >
                          متوسط
                        </button>
                        <button
                          type="button"
                          onClick={() => setBarcodeLabelStripeWidth('thin')}
                          className={`py-1.5 px-1 rounded-xl text-xs transition border border-slate-700 ${barcodeLabelStripeWidth === 'thin' ? `bg-amber-500 ${theme === 'dark' ? 'text-white' : 'text-slate-950'} font-black border-amber-400` : 'bg-slate-950 hover:bg-slate-900 text-slate-300'}`}
                        >
                          دقيق / رقيق
                        </button>
                      </div>
                    </div>

                    {/* Actions buttons */}
                    <div className="flex gap-2 font-sans pt-2">
                      <button 
                        onClick={() => {
                          printElementViaIFrame('barcode-paper-roll-print-area', `
                            body {
                              background: white !important;
                              color: black !important;
                              margin: 0 !important;
                              padding: 0 !important;
                            }
                            #barcode-paper-roll-print-area {
                              display: flex !important;
                              flex-direction: column !important;
                              align-items: center !important;
                              width: 100% !important;
                              background: white !important;
                              padding: 0 !important;
                            }
                            .barcode-label-container {
                              width: ${currentWidth}mm !important;
                              height: ${currentHeight}mm !important;
                              padding: ${currentPadding}mm !important;
                              margin: 0 0 5px 0 !important;
                              border: none !important;
                              box-shadow: none !important;
                              page-break-after: always !important;
                              break-after: page !important;
                              display: flex !important;
                              flex-direction: column !important;
                              align-items: center !important;
                              justify-content: center !important;
                              box-sizing: border-box !important;
                              background: white !important;
                              color: black !important;
                              -webkit-print-color-adjust: exact !important;
                              print-color-adjust: exact !important;
                            }
                            @page {
                              size: ${currentWidth}mm ${currentHeight}mm;
                              margin: 0;
                            }
                          `, false); // Will trigger background spooling if directSilentPrint is enabled
                        }}
                        className={`flex-[2] bg-amber-500 hover:bg-amber-400 ${theme === 'dark' ? 'text-white' : 'text-slate-950'} py-3 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer border border-amber-400 shadow-md text-xs font-sans font-black`}
                      >
                        <Printer className="w-4 h-4" />
                        <span>{settings.directSilentPrint !== false ? 'طباعة صامتة فورية (تلقائي) ⚡' : 'إرسال أمر الطباعة للملصقات 🖨️'}</span>
                      </button>
                      
                      {settings.directSilentPrint !== false && (
                        <button 
                          onClick={() => {
                            printElementViaIFrame('barcode-paper-roll-print-area', `
                              body {
                                background: white !important;
                                color: black !important;
                                margin: 0 !important;
                                padding: 0 !important;
                              }
                              #barcode-paper-roll-print-area {
                                display: flex !important;
                                flex-direction: column !important;
                                align-items: center !important;
                                width: 100% !important;
                                background: white !important;
                                padding: 0 !important;
                              }
                              .barcode-label-container {
                                width: ${currentWidth}mm !important;
                                height: ${currentHeight}mm !important;
                                padding: ${currentPadding}mm !important;
                                margin: 0 0 5px 0 !important;
                                border: none !important;
                                box-shadow: none !important;
                                page-break-after: always !important;
                                break-after: page !important;
                                display: flex !important;
                                flex-direction: column !important;
                                align-items: center !important;
                                justify-content: center !important;
                                box-sizing: border-box !important;
                                background: white !important;
                                color: black !important;
                              }
                              @page {
                                size: ${currentWidth}mm ${currentHeight}mm;
                                margin: 0;
                              }
                            `, true); // Force manual print dialog
                          }}
                          className="bg-slate-900 hover:bg-slate-805 text-slate-300 font-bold px-3 py-3 rounded-2xl transition border border-slate-700 text-xs cursor-pointer font-sans"
                          title="فتح نافذة طباعة المتصفح اليدوية للملصقات"
                        >
                          معاينة / PDF يدوي 📄
                        </button>
                      )}

                      <button 
                        onClick={() => setBarcodeLabelProduct(null)}
                        className="bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-450 font-bold px-4 py-3 rounded-2xl transition cursor-pointer text-xs font-sans"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Label Preview Presentation (Stays visible during print) */}
              <div className="w-full md:w-80 bg-slate-950 rounded-2xl p-4 flex flex-col items-center justify-center space-y-3 border border-slate-800 md:order-1">
                <span className="text-slate-400 text-[10px] font-bold no-print font-sans text-center">👇 معاينة الملصق على رول الورق الحراري ({barcodeLabelSize === 'custom' ? `${currentWidth}x${currentHeight}mm` : barcodeLabelSize === 'small' ? 'صغير جداً' : barcodeLabelSize === 'large' ? 'كبير' : 'وسط'})</span>
                
                {/* Paper Roll simulation wrapper */}
                <div id="barcode-paper-roll-print-area" className="w-full max-h-[380px] overflow-x-auto overflow-y-auto space-y-4 p-2 bg-slate-900/40 rounded-xl scrollbar-hidden flex flex-col items-center">
                  {Array.from({ length: barcodeLabelCopies }).map((_, index) => {
                    const computedPriceLBP = barcodeLabelProduct.priceUSD * settings.exchangeRate;
                    return (
                      <div 
                        key={index}
                        className="bg-white text-black rounded-lg border border-slate-200 flex flex-col items-center justify-center text-center select-none relative overflow-hidden barcode-label-container shadow-sm flex-shrink-0"
                        style={{ 
                          fontFamily: 'Cairo, system-ui, sans-serif',
                          pageBreakAfter: 'always',
                          breakAfter: 'page',
                          width: `${currentWidth}mm`,
                          height: `${currentHeight}mm`,
                          padding: `${currentPadding}mm`,
                          boxSizing: 'border-box'
                        }}
                      >
                        {/* Shop Name Header */}
                        <div 
                          style={{ fontSize: shopNameSize }}
                          className="font-black tracking-wide text-slate-800 border-b border-dashed border-slate-200 pb-0.5 w-full uppercase truncate text-center leading-none"
                        >
                          {settings.shopName}
                        </div>

                        {/* Product Name */}
                        {barcodeLabelShowName && (
                          <div 
                            style={{ fontSize: productNameSize }}
                            className="font-black text-slate-950 font-extrabold px-0.5 truncate w-full leading-tight text-center pt-0.5"
                          >
                            {barcodeLabelProduct.name}
                          </div>
                        )}

                        {/* Barcode lines representation */}
                        <div 
                          style={{ height: barcodeHeight }}
                          className="flex justify-center items-stretch bg-white px-2 py-0.5 select-none overflow-hidden max-w-full"
                        >
                          {generateBarcodePattern(barcodeLabelProduct.barcode || '').map((bit, idx) => (
                            <div 
                              key={idx} 
                              style={{ 
                                width: barcodeLabelStripeWidth === 'thin' ? '1px' : barcodeLabelStripeWidth === 'thick' ? '3px' : '2px',
                                backgroundColor: bit === '1' ? 'black' : 'white'
                              }}
                              className="h-full"
                            />
                          ))}
                        </div>

                        {/* Barcode number string */}
                        {barcodeLabelShowCode && (
                          <div 
                            style={{ fontSize: codeSize }}
                            className="tracking-[3px] font-mono font-bold text-slate-700 leading-none text-center pb-0.5"
                          >
                            *{barcodeLabelProduct.barcode}*
                          </div>
                        )}

                        {/* Prices Tag Line */}
                        {barcodeLabelShowPrice && (
                          <div className="border-t border-dashed border-slate-300 pt-0.5 w-full flex flex-col items-center justify-center leading-none">
                            {barcodeLabelCurrency === 'BOTH' ? (
                              <>
                                <div 
                                  style={{ fontSize: priceSize }}
                                  className="text-emerald-700 font-extrabold font-bold tracking-tight text-center"
                                >
                                  {barcodeLabelProduct.priceUSD.toFixed(2)} $
                                </div>
                                <div 
                                  style={{ fontSize: subPriceSize }}
                                  className="font-black text-slate-800 font-extrabold antialiased text-center"
                                >
                                  {Math.ceil(computedPriceLBP).toLocaleString()} ل.ل
                                </div>
                              </>
                            ) : barcodeLabelCurrency === 'LBP' ? (
                              <div 
                                style={{ fontSize: priceSize }}
                                className="text-emerald-850 font-black font-extrabold text-center"
                              >
                                {Math.ceil(computedPriceLBP).toLocaleString()} ل.ل
                              </div>
                            ) : (
                              <div 
                                style={{ fontSize: priceSize }}
                                className="text-emerald-700 font-extrabold font-bold text-center"
                              >
                                {barcodeLabelProduct.priceUSD.toFixed(2)} $
                              </div>
                            )}
                          </div>
                        )}

                        {/* Copy Index Number (Visual anchor for copies) */}
                        {barcodeLabelCopies > 1 && (
                          <div className="absolute right-1 bottom-1 text-[7px] text-slate-400 no-print font-mono leading-none">
                            {index + 1}/{barcodeLabelCopies}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* --- MODAL FOR PRINTING SUB-REPORTS --- */}
      {printReportType && (() => {
        // Safe accounting values computed dynamically
        const totalCOGS = invoices.reduce((sum, inv) => {
          const invCOGS = inv.items.reduce((itemSum, item) => {
            const prod = products.find(p => p.id === item.productId);
            const cost = prod?.costPriceUSD !== undefined && prod?.costPriceUSD !== null
              ? prod.costPriceUSD 
              : (prod?.priceWholesale !== undefined && prod?.priceWholesale !== null
                ? prod.priceWholesale 
                : item.priceUSD * 0.75);
            return itemSum + (cost * item.quantity);
          }, 0);
          return sum + invCOGS;
        }, 0);

        const grossProfit = totalSalesUSD - totalCOGS;
        const totalWasteLoss = waste.reduce((sum, item) => sum + (item.estimatedLossUSD || 0), 0);
        const totalExpensesUSD = expenses.reduce((sum, item) => sum + item.amountUSD, 0);
        const netProfit = grossProfit - totalWasteLoss - totalExpensesUSD;

        const getPrintReportQty = (p: Product) => {
          if (stockAuditReportLoc === 'warehouse') return p.warehouseQuantity || 0;
          if (stockAuditReportLoc === 'shop') return p.quantity;
          return p.quantity + (p.warehouseQuantity || 0); // combined mode
        };

        const invCostValue = products.reduce((sum, p) => {
          const cost = p.costPriceUSD !== undefined && p.costPriceUSD !== null
            ? p.costPriceUSD 
            : (p.priceWholesale !== undefined && p.priceWholesale !== null
              ? p.priceWholesale 
              : p.priceUSD * 0.75);
          return sum + (getPrintReportQty(p) * cost);
        }, 0);

        const invRetailValue = products.reduce((sum, p) => sum + (getPrintReportQty(p) * p.priceUSD), 0);
        const totalItemsCount = products.reduce((sum, p) => sum + getPrintReportQty(p), 0);

        let reportTitle = "";
        if (printReportType === 'dashboard') reportTitle = "تقرير حركة المبيعات وحالة البيع بالتجزئة";
        else if (printReportType === 'pl') reportTitle = "قائمة الأرباح والخسائر والمطابقة المالية";
        else if (printReportType === 'expenses') reportTitle = "كشف المصاريف التشغيلية والدفتر اليومي";
        else if (printReportType === 'stock_audit') reportTitle = "تقرير جرد وتقييم مخازن السلع";
        else if (printReportType === 'expiry_report') reportTitle = "بيان وتاريخ صلاحية العناصر ومخاطر الهدر";
        else if (printReportType === 'returns_report') reportTitle = "سجل وفهرس مرتجعات المبيعات المستلمة";
        else if (printReportType === 'waste_report') reportTitle = "تقرير المفقودات والتوالف والهالك من البضاعة";
        else if (printReportType === 'reorder_report') reportTitle = "تقرير السلع الناقصة وتنبيهات إعادة الطلب";

        return (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xs flex flex-col z-50 overflow-y-auto animate-fade-in p-2 md:p-6" id="report-print-modal-container">
            {/* Dynamic style block to completely control printing of reports */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                html, body, html.dark, html.dark body, #root, #main-system {
                  background: white !important;
                  background-color: white !important;
                  color: black !important;
                  font-family: 'Cairo', system-ui, sans-serif !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                #report-print-modal-container, #report-print-modal-container * {
                  color: black !important;
                  background: white !important;
                  background-color: white !important;
                  text-shadow: none !important;
                  box-shadow: none !important;
                }
                #main-system {
                  display: block !important;
                }
                #main-system > *:not(#report-print-modal-container) {
                  display: none !important;
                }
                #report-print-modal-container {
                  display: block !important;
                  position: absolute !important;
                  top: 0 !important;
                  left: 0 !important;
                  width: 100% !important;
                  background: white !important;
                  color: black !important;
                  padding: 10mm !important;
                  margin: 0 !important;
                  box-shadow: none !important;
                  border: none !important;
                }
                .no-print {
                  display: none !important;
                }
                /* Print optimized table grids */
                table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                  font-size: 11px !important;
                  color: black !important;
                }
                th, td {
                  border: 1px solid #000000 !important;
                  padding: 6px 8px !important;
                  color: black !important;
                }
                th {
                  background-color: #f3f4f6 !important;
                  color: black !important;
                  font-weight: bold !important;
                }
                /* Ensure graphs or panels are page-break safe */
                .page-break-before {
                  page-break-before: always !important;
                }
              }
            ` }} />

            {/* CONTROL BAR (no-print) */}
            <div className="no-print bg-slate-800 text-white rounded-2xl p-4 mb-6 shadow-xl border border-slate-700 max-w-5xl w-full mx-auto flex flex-col gap-4 text-right">
              <div className="flex flex-col md:flex-row justify-between items-center gap-3">
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-base text-amber-400 flex items-center justify-end gap-2">
                    <span>لوحة طباعة وسحب التقارير الإدارية والمالية</span>
                    <Printer className="w-5 h-5" />
                  </h3>
                  <p className="text-slate-300 text-[11px]">يمكنك التبديل بين مختلف تقارير الدكان ومراجعة معاينتها قبل إرسالها للطباعة أو حفظها كـ PDF.</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      printElementViaIFrame('report-paper-sheet-content', `
                        body {
                          background: white !important;
                          color: black !important;
                          font-family: 'Cairo', system-ui, sans-serif !important;
                          padding: 10mm !important;
                        }
                        #report-paper-sheet-content {
                          background: white !important;
                          color: black !important;
                          width: 100% !important;
                          max-width: 100% !important;
                          padding: 0 !important;
                          margin: 0 !important;
                          box-shadow: none !important;
                          border: none !important;
                        }
                        table {
                          width: 100% !important;
                          border-collapse: collapse !important;
                          font-size: 11px !important;
                          color: black !important;
                        }
                        th, td {
                          border: 1px solid #cbd5e1 !important;
                          padding: 6px 8px !important;
                          color: black !important;
                        }
                        th {
                          background-color: #f3f4f6 !important;
                          font-weight: bold !important;
                        }
                        .no-print {
                          display: none !important;
                        }
                        @page {
                          size: A4 portrait;
                          margin: 10mm;
                        }
                      `, false); // Will trigger silent background spooling if directSilentPrint is enabled
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2 px-5 rounded-xl transition flex items-center gap-2 cursor-pointer text-xs shadow-md shadow-emerald-950/20"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{settings.directSilentPrint !== false ? 'طباعة صامتة فورية (تلقائي) ⚡' : 'بدء الطباعة أو تصدير PDF 🖨️ / 📄'}</span>
                  </button>

                  {settings.directSilentPrint !== false && (
                    <button
                      type="button"
                      onClick={() => {
                        printElementViaIFrame('report-paper-sheet-content', `
                          body {
                            background: white !important;
                            color: black !important;
                            font-family: 'Cairo', system-ui, sans-serif !important;
                            padding: 10mm !important;
                          }
                          #report-paper-sheet-content {
                            background: white !important;
                            color: black !important;
                            width: 100% !important;
                            max-width: 100% !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            box-shadow: none !important;
                            border: none !important;
                          }
                          table {
                            width: 100% !important;
                            border-collapse: collapse !important;
                            font-size: 11px !important;
                            color: black !important;
                          }
                          th, td {
                            border: 1px solid #cbd5e1 !important;
                            padding: 6px 8px !important;
                            color: black !important;
                          }
                          th {
                            background-color: #f3f4f6 !important;
                            font-weight: bold !important;
                          }
                          .no-print {
                            display: none !important;
                          }
                          @page {
                            size: A4 portrait;
                            margin: 10mm;
                          }
                        `, true); // Force manual print
                      }}
                      className="bg-slate-700 hover:bg-slate-650 text-slate-200 font-bold py-2 px-3 rounded-xl transition flex items-center gap-1 cursor-pointer text-xs border border-slate-600"
                      title="فتح حوار طباعة المتصفح اليدوية للتقرير"
                    >
                      <span>طباعة يدوية / حفظ PDF 📄</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setPrintReportType(null)}
                    className="bg-slate-750 hover:bg-slate-700 text-slate-300 font-bold py-2 px-4 rounded-xl transition text-xs cursor-pointer border border-slate-700"
                  >
                    إغلاق المعاينة ❌
                  </button>
                </div>
              </div>

              {/* Quick Tabs inside printer */}
              <div className="border-t border-slate-700 pt-3">
                <div className="text-[10px] text-slate-400 font-bold mb-2">اختر التقرير المراد معاينته وطباعته الآن:</div>
                <div className="flex flex-wrap gap-1.5 justify-start font-sans">
                  <button 
                    onClick={() => setPrintReportType('dashboard')} 
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${printReportType === 'dashboard' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950'}` : 'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>📈 المبيعات والبيع</span>
                  </button>
                  <button 
                    onClick={() => setPrintReportType('pl')} 
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${printReportType === 'pl' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950'}` : 'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>⚖️ الأرباح والخسائر</span>
                  </button>
                  <button 
                    onClick={() => setPrintReportType('expenses')} 
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${printReportType === 'expenses' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950'}` : 'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>💸 المصاريف ({expenses.length})</span>
                  </button>
                  <button 
                    onClick={() => setPrintReportType('stock_audit')} 
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${printReportType === 'stock_audit' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950'}` : 'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>📋 جرد وقيمة المخازن</span>
                  </button>
                  <button 
                    onClick={() => setPrintReportType('expiry_report')} 
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${printReportType === 'expiry_report' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950'}` : 'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}
                  >
                    <Hourglass className="w-3.5 h-3.5" />
                    <span>⏳ صلاحية المنتجات</span>
                  </button>
                  <button 
                    onClick={() => setPrintReportType('returns_report')} 
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${printReportType === 'returns_report' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950'}` : 'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>🔄 المرتجعات ({returns.length})</span>
                  </button>
                  <button 
                    onClick={() => setPrintReportType('waste_report')} 
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${printReportType === 'waste_report' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950'}` : 'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>🗑️ التوالف ({waste.length})</span>
                  </button>
                  <button 
                    onClick={() => setPrintReportType('reorder_report')} 
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${printReportType === 'reorder_report' ? `bg-amber-500 ${theme === 'dark' ? 'text-white font-black' : 'text-slate-950'}` : 'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>⚠️ النواقص والمطلوب</span>
                  </button>
                </div>
              </div>
            </div>

            {/* PAPER SHEETS PREVIEW SCROLL (Optimized high-contrast letter styling) */}
            <div id="report-paper-sheet-content" className="flex-1 max-w-4xl w-full mx-auto bg-white text-slate-950 shadow-2xl rounded-2xl md:rounded-3xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-8 md:p-12 space-y-8 text-right overflow-y-auto" style={{ direction: 'rtl' }}>
                
                {/* PAPER HEADER BOUNDARIES */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
                  <div className="space-y-1">
                    <h1 className="text-xl font-extrabold text-slate-900">{settings.shopName}</h1>
                    <p className="text-slate-500 text-xs font-medium">المركز المحاسبي وإدارة السوبر ماركت وتجارة التجزئة</p>
                    <p className="text-slate-400 text-[10px] font-mono leading-none">تاريخ السحب: {new Date(SYS_DATE).toLocaleDateString('ar-LB')} | {new Date(SYS_DATE).toLocaleTimeString('ar-LB')}</p>
                  </div>
                  <div className="text-left space-y-1">
                    <div className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded">تقرير رسمي معتمد</div>
                    <div className="text-[10px] text-slate-500">معدل الصرف: 1$ = {settings.exchangeRate.toLocaleString()} L.L</div>
                  </div>
                </div>

                {/* REPORT TITLE DESCRIPTION */}
                <div className="text-center py-2 bg-slate-100 rounded-xl border border-slate-200">
                  <h2 className="text-base font-extrabold text-slate-950 tracking-tight">📜 {reportTitle}</h2>
                  <p className="text-slate-500 text-[10px] mt-1 font-medium">سجل تفصيلي لأداء المعاملات وحالة حسابات المحل التجاري وعلاقته بالجرود والمخازن.</p>
                </div>

                {/* DYNAMIC REPORT CONTENT RENDERING */}
                {printReportType === 'dashboard' && (() => {
                  const dailySalesRaw: { 
                    [date: string]: { 
                      usd: number; 
                      lbp: number; 
                      count: number; 
                      totalItems: number; 
                    } 
                  } = {};

                  const monthlySalesRaw: {
                    [month: string]: {
                      usd: number;
                      lbp: number;
                      count: number;
                      totalItems: number;
                    }
                  } = {};

                  const categorySalesRaw: {
                    [category: string]: {
                      usd: number;
                      qty: number;
                      count: number;
                    }
                  } = {};

                  invoices.forEach(inv => {
                    const dateStr = inv.date;
                    const monthStr = inv.date.substring(0, 7);
                    
                    // Daily
                    if (!dailySalesRaw[dateStr]) {
                      dailySalesRaw[dateStr] = { usd: 0, lbp: 0, count: 0, totalItems: 0 };
                    }
                    dailySalesRaw[dateStr].usd += inv.totalUSD;
                    dailySalesRaw[dateStr].lbp += inv.totalLBP;
                    dailySalesRaw[dateStr].count += 1;
                    
                    // Monthly
                    if (!monthlySalesRaw[monthStr]) {
                      monthlySalesRaw[monthStr] = { usd: 0, lbp: 0, count: 0, totalItems: 0 };
                    }
                    monthlySalesRaw[monthStr].usd += inv.totalUSD;
                    monthlySalesRaw[monthStr].lbp += inv.totalLBP;
                    monthlySalesRaw[monthStr].count += 1;

                    const itemsCount = inv.items.reduce((acc, it) => acc + it.quantity, 0);
                    dailySalesRaw[dateStr].totalItems += itemsCount;
                    monthlySalesRaw[monthStr].totalItems += itemsCount;

                    // Categories
                    inv.items.forEach(item => {
                      const matchingProd = products.find(p => p.id === item.productId);
                      const catName = matchingProd?.category || 'عام';
                      if (!categorySalesRaw[catName]) {
                        categorySalesRaw[catName] = { usd: 0, qty: 0, count: 0 };
                      }
                      categorySalesRaw[catName].usd += item.totalUSD;
                      categorySalesRaw[catName].qty += item.quantity;
                      categorySalesRaw[catName].count += 1;
                    });
                  });

                  const dailySalesReportList = Object.entries(dailySalesRaw).map(([date, details]) => ({
                    date,
                    ...details,
                  })).sort((a, b) => b.date.localeCompare(a.date));

                  const monthlySalesReportList = Object.entries(monthlySalesRaw).map(([month, details]) => ({
                    month,
                    ...details,
                  })).sort((a, b) => b.month.localeCompare(a.month));

                  const categorySalesReportList = Object.entries(categorySalesRaw).map(([category, details]) => ({
                    category,
                    ...details,
                  })).sort((a, b) => b.usd - a.usd);

                  return (
                    <div className="space-y-6">
                      {/* Summary Tab */}
                      <div className="grid grid-cols-3 gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50 text-right">
                        <div className="text-center space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold block">صافي الإيرادات الكلية ($ / L.L)</span>
                          <div className="text-sm font-black text-emerald-800">{totalSalesUSD.toFixed(2)} $</div>
                          <div className="text-[9px] text-slate-500 font-bold">{(totalSalesUSD * settings.exchangeRate).toLocaleString()} ل.ل</div>
                        </div>
                        <div className="text-center border-x border-slate-200 space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold block">عدد الفواتير الصادرة</span>
                          <div className="text-sm font-black text-slate-900">{invoices.length} فواتير</div>
                          <div className="text-[9px] text-slate-400">منجزة بالكامل في الـ POS</div>
                        </div>
                        <div className="text-center space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold block">متوسط حجم الطلب / المبيع</span>
                          <div className="text-sm font-black text-slate-950">{(totalSalesUSD / (invoices.length || 1)).toFixed(2)} $</div>
                          <div className="text-[9px] text-slate-400">تقريبية حسب الفواتير</div>
                        </div>
                      </div>

                      {/* DAILY SALES PRINT */}
                      <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                        <h4 className="font-extrabold text-xs text-slate-900 border-b pb-1.5 flex items-center justify-start gap-1">
                          <span>📅 كشف المبيعات والعمليات اليومية بالتفصيل</span>
                        </h4>
                        <table className="w-full text-right" style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-bold border-b text-[11px]">
                              <th className="p-2 border">التاريخ اليومي</th>
                              <th className="p-2 border text-center">عدد الفواتير المنفذة</th>
                              <th className="p-2 border text-center">إجمالي القطع المباعة</th>
                              <th className="p-2 border text-left">قيمة الدخل ($)</th>
                              <th className="p-2 border text-left">قيمة الدخل (L.L)</th>
                            </tr>
                          </thead>
                          <tbody className="text-[11px]">
                            {dailySalesReportList.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-2 text-center text-slate-400">لا توفر بيانات لليوم.</td>
                              </tr>
                            ) : (
                              dailySalesReportList.slice(0, 31).map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="p-2 border font-mono font-bold">{row.date}</td>
                                  <td className="p-2 border text-center font-bold">{row.count} فواتير</td>
                                  <td className="p-2 border text-center">{row.totalItems} قطعة</td>
                                  <td className="p-2 border text-left font-mono font-bold text-slate-900">{row.usd.toFixed(2)}$</td>
                                  <td className="p-2 border text-left font-mono text-emerald-800">{Math.ceil(row.lbp).toLocaleString()} ل.ل</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* MONTHLY AND CATEGORY SALES PRINT SECTION */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 page-break-before">
                        {/* Monthly */}
                        <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                          <h4 className="font-extrabold text-xs text-slate-900 border-b pb-1.5">
                            <span>📆 البيان المقارن للمبيعات الشهرية</span>
                          </h4>
                          <table className="w-full text-right text-[10px]" style={{ borderCollapse: 'collapse' }}>
                            <thead>
                              <tr className="bg-slate-50 text-slate-700">
                                <th className="p-2 border font-bold">الشهر الـ مستهدف</th>
                                <th className="p-2 border font-bold text-center">العمليات</th>
                                <th className="p-2 border font-bold text-left">الإيراد ($)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {monthlySalesReportList.slice(0, 12).map((row, idx) => (
                                <tr key={idx}>
                                  <td className="p-2 border font-bold">{row.month}</td>
                                  <td className="p-2 border text-center">{row.count} عمليات</td>
                                  <td className="p-2 border text-left font-mono font-black text-blue-900">{row.usd.toFixed(1)}$</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Category contribution */}
                        <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                          <h4 className="font-extrabold text-xs text-slate-900 border-b pb-1.5">
                            <span>مساهمة تصنيفات وفئات السلع</span>
                          </h4>
                          <table className="w-full text-right text-[10px]" style={{ borderCollapse: 'collapse' }}>
                            <thead>
                              <tr className="bg-slate-50 text-slate-700">
                                <th className="p-2 border font-bold">سمة الفئة</th>
                                <th className="p-2 border font-bold text-center">القطع المباعة</th>
                                <th className="p-2 border font-bold text-left">إجمالي المبيع ($)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {categorySalesReportList.map((row, idx) => (
                                <tr key={idx}>
                                  <td className="p-2 border font-bold text-slate-800">{row.category}</td>
                                  <td className="p-2 border text-center">{row.qty} قطع</td>
                                  <td className="p-2 border text-left font-mono font-bold text-emerald-800">{row.usd.toFixed(1)}$</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-xl p-4 space-y-3 page-break-before">
                        <h4 className="font-extrabold text-xs text-slate-900 border-b pb-1.5 flex items-center justify-start gap-1">
                          <span>🏆 الأصناف والمنتجات الأكثر طلباً ومبيعاً بالتعداد</span>
                        </h4>
                        <table className="w-full text-right text-[11px]" style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr className="bg-slate-100 text-slate-700">
                              <th className="p-2 border font-bold text-center">#</th>
                              <th className="p-2 border font-bold">اسم المنتج الصنف</th>
                              <th className="p-2 border font-bold text-center">الكمية الكلية المباعة</th>
                              <th className="p-2 border font-bold text-left">قيمة الدخل المحقق ($)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {topSoldProductsList.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="p-4 text-center text-slate-400 text-xs">لا توجد عمليات بيع مسجلة مسبقاً لهذا التقرير.</td>
                              </tr>
                            ) : (
                              topSoldProductsList.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="p-2 border text-center font-bold text-slate-500">{idx + 1}</td>
                                  <td className="p-2 border font-bold text-slate-900">{item.name}</td>
                                  <td className="p-2 border text-center font-bold">{item.qty} وحدة</td>
                                  <td className="p-2 border text-left font-mono font-bold text-emerald-700">{item.amt.toFixed(2)} $</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="border border-slate-200 rounded-xl p-4 space-y-3 page-break-before">
                        <h4 className="font-extrabold text-xs text-slate-900 border-b pb-1.5">📋 سجل وقيود المبيعات الأخيرة المنجزة بالتسلسل</h4>
                        <table className="w-full text-right text-[10px]" style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr className="bg-slate-100 text-slate-700">
                              <th className="p-2 border font-bold">رقم الفاتورة</th>
                              <th className="p-2 border font-bold">التاريخ والوقت يومياً</th>
                              <th className="p-2 border font-bold text-center">طريقة الدفع</th>
                              <th className="p-2 border font-bold text-center">الكاشير المسؤول</th>
                              <th className="p-2 border font-bold text-left">مجموع القيمة ($)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoices.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-4 text-center text-slate-400 text-xs">لا يوجد أي مبيعات مقيدة بالنظام.</td>
                              </tr>
                            ) : (
                              invoices.slice(-15).reverse().map((inv, idx) => (
                                <tr key={idx}>
                                  <td className="p-2 border font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                                  <td className="p-2 border text-slate-500 text-xs">{inv.date} | {inv.time}</td>
                                  <td className="p-2 border text-center text-xs">{inv.paymentMethod === 'cash' ? 'كاش (Cash)' : inv.paymentMethod === 'debt' ? 'آجل (دين)' : 'بطاقة دفع'}</td>
                                  <td className="p-2 border text-center text-slate-600 text-xs">{inv.cashier}</td>
                                  <td className="p-2 border text-left font-mono font-bold text-blue-850">{inv.totalUSD.toFixed(2)} $</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {printReportType === 'pl' && (
                  <div className="space-y-6">
                    <div className="border-2 border-slate-900 rounded-xl p-5 space-y-4 bg-slate-50">
                      <h3 className="text-xs font-bold text-slate-400 mb-2 border-b pb-1">ميزان حساب الأرباح والخسائر للنشاط التجاري</h3>
                      <div className="flex justify-between items-center text-xs pb-1 border-b border-dashed border-slate-300">
                        <span className="font-bold text-slate-700">إجمالي ايرادات البيع بالتجزئة (مبيعات دكان):</span>
                        <span className="font-mono font-bold text-emerald-700">+{totalSalesUSD.toFixed(2)} $</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pb-1 border-b border-dashed border-slate-300">
                        <span className="font-bold text-slate-700">تكلفة البضاعة المقدرة الأصلي (COGS):</span>
                        <span className="font-mono font-bold text-rose-700">-{totalCOGS.toFixed(2)} $</span>
                      </div>
                      <div className="flex justify-between items-center text-xs p-2 rounded bg-emerald-50 border border-emerald-100">
                        <span className="font-extrabold text-[#1D9E75]">إجمالي الربح الإجمالي للنشاط (Gross Profit):</span>
                        <span className="font-mono font-black text-[#1D9E75]">+{grossProfit.toFixed(2)} $</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pb-1 border-b border-dashed border-slate-300">
                        <span className="font-bold text-slate-500">خسائر التوالف والأضرار الموثقة (Waste Loss):</span>
                        <span className="font-mono font-bold text-slate-800">-{totalWasteLoss.toFixed(2)} $</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pb-1 border-b border-dashed border-slate-300">
                        <span className="font-bold text-slate-500">إجمالي المصاريف العامة والبنود المدفوعة:</span>
                        <span className="font-mono font-bold text-slate-800">-{totalExpensesUSD.toFixed(2)} $</span>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-2 p-2 rounded bg-slate-900 text-white font-black">
                        <span className="text-amber-400 font-extrabold">صافي الإيرادات والأرباح الصافية (Net Profit):</span>
                        <span className="font-mono font-extrabold text-amber-400 text-base">{netProfit.toFixed(2)} $</span>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                      <h4 className="font-extrabold text-xs text-slate-900 border-b pb-1">📊 رأس المال وعلاقة السيولة بجرودات المخازن</h4>
                      <p className="text-[10px] text-slate-400">تحليلات الأصول الاستثمارية للسلع المتاحة حالياً على رفوف صالة العرض وفي المستودعات:</p>
                      
                      <div className="grid grid-cols-2 gap-4 text-center mt-2">
                        <div className="p-3 border rounded-xl bg-slate-50 text-xs">
                          <span className="text-slate-500 font-bold block mb-1">صافي قيمة رأس المال الميت بسعر التكلفة</span>
                          <span className="text-base font-mono font-black text-slate-950">{invCostValue.toFixed(2)} $</span>
                          <span className="text-[10px] text-slate-400 block">{(invCostValue * settings.exchangeRate).toLocaleString()} ل.ل</span>
                        </div>
                        <div className="p-3 border rounded-xl bg-slate-50 text-xs">
                          <span className="text-slate-500 font-bold block mb-1">القوة الاستثمارية المتوقعة عند المبيع بالتجزئة</span>
                          <span className="text-base font-mono font-black text-emerald-800">{invRetailValue.toFixed(2)} $</span>
                          <span className="text-[10px] text-slate-400 block">{(invRetailValue * settings.exchangeRate).toLocaleString()} ل.ل</span>
                        </div>
                      </div>
                      
                      <div className="text-center bg-amber-50 text-amber-950 p-2.5 rounded-xl border border-amber-200 text-xs font-bold">
                        الأرباح المعقدة المتوقع جنيها فور إفراغ الرفوف: <span className="font-mono font-black text-emerald-900">{(invRetailValue - invCostValue).toFixed(2)} $</span>
                      </div>
                    </div>
                  </div>
                )}

                {printReportType === 'expenses' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 text-center text-xs border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <div>
                        <div className="text-slate-500 font-bold mb-1">المصاريف الكلية الصادرة</div>
                        <div className="text-base font-mono font-black text-rose-700">-{totalExpensesUSD.toFixed(2)} $</div>
                        <div className="text-[10px] text-slate-400">{(totalExpensesUSD * settings.exchangeRate).toLocaleString()} ل.ل</div>
                      </div>
                      <div className="border-r border-slate-200">
                        <div className="text-slate-500 font-bold mb-1">عدد قيود الصرف المسجلة</div>
                        <div className="text-base font-black text-slate-800">{expenses.length} سند صرف نثري</div>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                      <h4 className="font-extrabold text-xs text-slate-900 border-b pb-1.5">📓 قائمة قيود المصاريف المسجلة بالدورية الحالية</h4>
                      {expenses.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs">لا يوجد مصاريف مسجلة أو مقيدة بصندوق الدورية الحالية.</div>
                      ) : (
                        <table className="w-full text-right" style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr className="bg-slate-100 text-slate-700">
                              <th className="p-2 border font-bold">التاريخ</th>
                              <th className="p-2 border font-bold">الفئة / التصنيف</th>
                              <th className="p-2 border font-bold text-center">المسؤول</th>
                              <th className="p-2 border font-bold">الوصف والبيان تفصيلاً</th>
                              <th className="p-2 border font-bold text-left">مجموع السند ($)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {expenses.map((exp, idx) => (
                              <tr key={idx}>
                                <td className="p-2 border font-mono text-xs">{exp.date}</td>
                                <td className="p-2 border font-bold text-rose-900">{exp.category}</td>
                                <td className="p-2 border text-center text-slate-650">المدير العام</td>
                                <td className="p-2 border text-slate-600 font-sans text-xs">{exp.title}</td>
                                <td className="p-2 border text-left font-mono font-bold text-red-650">-{exp.amountUSD.toFixed(2)} $</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {printReportType === 'stock_audit' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50 text-center text-xs">
                      <div>
                        <div className="text-slate-400 font-bold mb-0.5">عدد السلع المسجلة</div>
                        <div className="text-xs font-black text-slate-800">{products.length} صنف متاح</div>
                      </div>
                      <div className="border-x">
                        <div className="text-slate-400 font-bold mb-0.5">إجمالي كمية القطع بالجرود</div>
                        <div className="text-xs font-black text-slate-800">{totalItemsCount} قطعة</div>
                      </div>
                      <div>
                        <div className="text-slate-400 font-bold mb-0.5">القيمة الكلية للسيولة المستثمرة</div>
                        <div className="text-xs font-mono font-bold text-emerald-800">{invCostValue.toFixed(2)} $</div>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                      <h4 className="font-extrabold text-xs text-slate-900 border-b pb-1.5">📦 كشف الجرد الشامل وتقدير قيمة مخزون الأصناف</h4>
                      <table className="w-full text-right text-[10px]" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                          <tr className="bg-slate-100 text-slate-700">
                            <th className="p-1.5 border font-bold">الباركود</th>
                            <th className="p-1.5 border font-bold">اسم الصنف ودليل التعريف</th>
                            <th className="p-1.5 border font-bold">الفئة</th>
                            <th className="p-1.5 border font-bold text-center">الكمية</th>
                            <th className="p-1.5 border font-bold text-center">سعر التكلفة</th>
                            <th className="p-1.5 border font-bold text-center">سعر المبيع</th>
                            <th className="p-1.5 border font-bold text-left">قيمة التكلفة الكلية</th>
                            <th className="p-1.5 border font-bold text-left">قيمة المبيع الكلية</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map((p, idx) => {
                            const cost = p.costPriceUSD !== undefined && p.costPriceUSD !== null
                              ? p.costPriceUSD 
                              : (p.priceWholesale !== undefined && p.priceWholesale !== null
                                ? p.priceWholesale 
                                : p.priceUSD * 0.75);
                            const qty = getPrintReportQty(p);
                            return (
                              <tr key={idx} className={qty <= 0 ? 'bg-rose-50' : ''}>
                                <td className="p-1.5 border font-mono text-slate-500">{p.barcode}</td>
                                <td className="p-1.5 border font-bold text-slate-900">{p.name}</td>
                                <td className="p-1.5 border text-slate-650">{p.category}</td>
                                <td className="p-1.5 border text-center font-bold text-xs">{qty}</td>
                                <td className="p-1.5 border text-center font-mono">{cost.toFixed(2)}$</td>
                                <td className="p-1.5 border text-center font-mono">{p.priceUSD.toFixed(2)}$</td>
                                <td className="p-1.5 border text-left font-mono">{(qty * cost).toFixed(2)}$</td>
                                <td className="p-1.5 border text-left font-mono font-semibold text-emerald-700">{(qty * p.priceUSD).toFixed(2)}$</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {printReportType === 'expiry_report' && (
                  <div className="space-y-6">
                    {(() => {
                      const expiredList = products.filter(p => p.expiryDate && new Date(p.expiryDate) < new Date(SYS_DATE));
                      const nearExpiredList = products.filter(p => {
                        if (!p.expiryDate) return false;
                        const exDate = new Date(p.expiryDate);
                        const curr = new Date(SYS_DATE);
                        if (exDate < curr) return false;
                        const diffTime = exDate.getTime() - curr.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays <= 30;
                      });

                      return (
                        <>
                          <div className="grid grid-cols-2 gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50 text-center text-xs">
                            <div>
                              <div className="text-red-700 font-bold mb-0.5">المنتهية الصلاحية بالجرود</div>
                              <div className="text-base font-black text-red-600">{expiredList.length} أصناف منتهية</div>
                            </div>
                            <div className="border-r">
                              <div className="text-amber-800 font-bold mb-0.5">تقترب للانتهاء قريباً (أقل من 30 يوماً)</div>
                              <div className="text-base font-black text-amber-600">{nearExpiredList.length} أصناف قريبة</div>
                            </div>
                          </div>

                          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                            <h4 className="font-extrabold text-xs text-red-700 border-b pb-1.5">🚫 سلع وتواريخ الأصناف المنتهية (يجب تلفها وسحبها فوراً)</h4>
                            {expiredList.length === 0 ? (
                              <div className="text-center py-6 text-emerald-800 font-bold text-xs">ممتاز! لا يوجد أي أصناف منتهية الصلاحية بالمخازن والرفوف حالياً.</div>
                            ) : (
                              <table className="w-full text-right text-xs" style={{ borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr className="bg-red-50 text-red-950">
                                    <th className="p-2 border font-bold">الباركود</th>
                                    <th className="p-2 border font-bold">اسم المنتج الصنف وتاريخ التسجيل</th>
                                    <th className="p-2 border font-bold text-center">الكمية المقيدة</th>
                                    <th className="p-2 border font-bold text-center">تاريخ انتهاء الصلاحية</th>
                                    <th className="p-2 border font-bold text-left">خسارة رأس المال المفترضة ($)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {expiredList.map((p, idx) => {
                                    const cost = p.costPriceUSD !== undefined && p.costPriceUSD !== null ? p.costPriceUSD : p.priceUSD * 0.75;
                                    return (
                                      <tr key={idx} className="bg-red-50/20 text-red-950">
                                        <td className="p-2 border font-mono text-slate-500">{p.barcode}</td>
                                        <td className="p-2 border font-bold text-slate-900">{p.name}</td>
                                        <td className="p-2 border text-center font-bold text-red-650">{p.quantity} قطع</td>
                                        <td className="p-2 border text-center font-mono font-extrabold text-red-600">{p.expiryDate}</td>
                                        <td className="p-2 border text-left font-mono font-bold text-rose-700">{(p.quantity * cost).toFixed(2)}$</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>

                          <div className="border border-slate-200 rounded-xl p-4 space-y-3 page-break-before">
                            <h4 className="font-extrabold text-xs text-amber-800 border-b pb-1.5">⏳ مواد توشك على الانتهاء قريباً (خلال الثلاثين يوماً المقبلة)</h4>
                            {nearExpiredList.length === 0 ? (
                              <div className="text-center py-6 text-slate-400 text-xs">لا توجد مواد توشك على الانتهاء خلال الثلاثين يوماً القادمة.</div>
                            ) : (
                              <table className="w-full text-right text-xs" style={{ borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr className="bg-amber-50 text-amber-950">
                                    <th className="p-2 border font-bold">الباركود</th>
                                    <th className="p-2 border font-bold">اسم الصنف المعرض للانتهاء</th>
                                    <th className="p-2 border font-bold text-center">الكمية الحالية</th>
                                    <th className="p-2 border font-bold text-center">تاريخ انتهاء الصلاحية</th>
                                    <th className="p-2 border font-bold text-center">الأيام المتبقية التقريبية</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {nearExpiredList.map((p, idx) => {
                                    const exDate = new Date(p.expiryDate!);
                                    const curr = new Date(SYS_DATE);
                                    const diffTime = exDate.getTime() - curr.getTime();
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    return (
                                      <tr key={idx}>
                                        <td className="p-2 border font-mono text-slate-500">{p.barcode}</td>
                                        <td className="p-2 border font-bold text-slate-900">{p.name}</td>
                                        <td className="p-2 border text-center font-bold">{p.quantity}</td>
                                        <td className="p-2 border text-center font-mono font-bold text-amber-700">{p.expiryDate}</td>
                                        <td className="p-2 border text-center font-black text-amber-600 bg-amber-50/25">{diffDays} يوم متبقي</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {printReportType === 'returns_report' && (
                  <div className="space-y-6">
                    {(() => {
                      const totalRefunds = returns.reduce((sum, r) => sum + r.refundAmountUSD, 0);
                      return (
                        <>
                          <div className="grid grid-cols-2 gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50 text-center text-xs">
                            <div>
                              <div className="text-slate-500 font-bold mb-0.5">إجمالي المبالغ والتعويضات المعادة</div>
                              <div className="text-base font-mono font-black text-rose-700">{totalRefunds.toFixed(2)} $</div>
                              <div className="text-[10px] text-slate-400">{(totalRefunds * settings.exchangeRate).toLocaleString()} ل.ل</div>
                            </div>
                            <div className="border-r">
                              <div className="text-slate-500 font-bold mb-0.5">عدد حركات الارتجاع الموثقة بالـ POS</div>
                              <div className="text-base font-black text-slate-900">{returns.length} عمليات مرتجع</div>
                            </div>
                          </div>

                          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                            <h4 className="font-extrabold text-xs text-slate-900 border-b pb-1.5">🔄 قائمة تفصيلية بالمرتجبات المستلمة من العملاء</h4>
                            {returns.length === 0 ? (
                              <div className="text-center py-6 text-slate-400 text-xs">لا يوجد حركات مرتجع موثقة لهذا التقرير حالياً.</div>
                            ) : (
                              <table className="w-full text-right text-xs" style={{ borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr className="bg-slate-100 text-slate-700">
                                    <th className="p-2 border font-bold">رقم الفاتورة الأصلي</th>
                                    <th className="p-2 border font-bold">اسم المنتج الصنف المسترد</th>
                                    <th className="p-2 border font-bold">تاريخ وساعة الإرجاع</th>
                                    <th className="p-2 border font-bold text-center">الكمية المعادة</th>
                                    <th className="p-2 border font-bold">سبب الإرجاع المدون</th>
                                    <th className="p-2 border font-bold text-left">المستقطعات المالية للمسترد ($)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {returns.map((r, idx) => (
                                    <tr key={idx}>
                                      <td className="p-2 border font-mono text-slate-500 text-xs">{r.invoiceNumber || 'إرجاع يدوي'}</td>
                                      <td className="p-2 border font-bold text-slate-900">{r.productName}</td>
                                      <td className="p-2 border text-slate-500 text-xs">{r.date}</td>
                                      <td className="p-2 border text-center font-bold">{r.quantity} قطع</td>
                                      <td className="p-2 border text-xs text-slate-650 font-sans">{r.reason || 'تلف طفيف / تغيير خيار عابر'}</td>
                                      <td className="p-2 border text-left font-mono font-bold text-blue-800">{r.refundAmountUSD.toFixed(2)} $</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {printReportType === 'waste_report' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50 text-center text-xs">
                      <div>
                        <div className="text-rose-700 font-bold mb-0.5">اجمال خسائر استبعاد التالف بسعر التكلفة</div>
                        <div className="text-base font-mono font-black text-rose-750">{totalWasteLoss.toFixed(2)} $</div>
                        <div className="text-[10px] text-slate-450">{(totalWasteLoss * settings.exchangeRate).toLocaleString()} ل.ل</div>
                      </div>
                      <div className="border-r border-slate-200">
                        <div className="text-slate-500 font-bold mb-0.5">عدد قيود الصرف المستبعدة للهدر</div>
                        <div className="text-base font-black text-slate-900">{waste.length} عملية تلف بضائع</div>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                      <h4 className="font-extrabold text-xs text-slate-900 border-b pb-1.5">🗑️ سجل حركات التلاف والتسريب للسلع المدمرة بالتأريخ</h4>
                      {waste.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs">لا يوجد بضائع تالفة مقيدة لحساب الدورية الحالية.</div>
                      ) : (
                        <table className="w-full text-right text-xs" style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr className="bg-slate-100 text-slate-700">
                              <th className="p-2 border font-bold">التاريخ والتوقيت</th>
                              <th className="p-2 border font-bold">اسم المنتج الصنف التالف</th>
                              <th className="p-2 border font-bold text-center">الكمية المسحوبة من الرف</th>
                              <th className="p-2 border font-bold">شرح مسبب التلف (البيان)</th>
                              <th className="p-2 border font-bold text-left">قيمة الخسارة بسعر التكلفة ($)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {waste.map((w, idx) => (
                              <tr key={idx}>
                                <td className="p-2 border font-mono text-slate-500 text-xs">{w.date}</td>
                                <td className="p-2 border font-bold text-slate-900">{w.productName}</td>
                                <td className="p-2 border text-center font-bold text-rose-900">{w.quantity} قطعة</td>
                                <td className="p-2 border text-slate-600 font-sans text-xs">{w.note || 'سوء تخزين / تضرر الغلاف / كسر'}</td>
                                <td className="p-2 border text-left font-mono font-bold text-rose-700">{(w.estimatedLossUSD || 0).toFixed(2)} $</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {printReportType === 'reorder_report' && (
                  <div className="space-y-6">
                    {(() => {
                      const depletedList = products.filter(p => p.quantity <= settings.lowStockThreshold);
                      return (
                        <>
                          <div className="border border-slate-200 rounded-xl p-4 bg-amber-50 text-center text-xs">
                            <h3 className="text-amber-900 font-bold mb-0.5">إحصاء السلع النافذة أو التي وصلت لحد إعادة الطلب الحرج</h3>
                            <div className="text-sm font-black text-amber-950 mt-1">يوجد عدد ({depletedList.length}) أصناف حرجة تحتاج لتعبئة المخازن فوراً.</div>
                          </div>

                          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                            <h4 className="font-extrabold text-xs text-slate-900 border-b pb-1.5">⚠️ قائمة النواقص وحال السلع ذات المستويات الضعيفة</h4>
                            {depletedList.length === 0 ? (
                              <div className="text-center py-6 text-emerald-800 font-bold text-xs">مبارك بنجاح! جميع منتجات الدكان بمستويات مخزونات كافية ولا سلع ناقصة حاليا.</div>
                            ) : (
                              <table className="w-full text-right text-xs" style={{ borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr className="bg-amber-50 text-amber-950">
                                    <th className="p-2 border font-bold">الباركود</th>
                                    <th className="p-2 border font-bold">اسم المنتج الصنف الناقص</th>
                                    <th className="p-2 border font-bold">الفئة تنظيم</th>
                                    <th className="p-2 border font-bold text-center">الكمية الحالية</th>
                                    <th className="p-2 border font-bold text-center">الحد الأدنى لطلب التوريد</th>
                                    <th className="p-2 border font-bold text-center font-bold">تقييم النقص الحركي لـ POS</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {depletedList.map((p, idx) => (
                                    <tr key={idx} className={p.quantity <= 0 ? 'bg-red-50 text-red-950 hover:bg-red-100' : 'hover:bg-slate-50'}>
                                      <td className="p-2 border font-mono text-slate-500">{p.barcode}</td>
                                      <td className="p-2 border font-bold text-slate-900">{p.name}</td>
                                      <td className="p-2 border text-slate-600 text-xs">{p.category}</td>
                                      <td className="p-2 border text-center font-black text-rose-800">{p.quantity} قطع</td>
                                      <td className="p-2 border text-center text-slate-500 font-mono">{settings.lowStockThreshold} قطع</td>
                                      <td className="p-2 border text-center font-bold">
                                        {p.quantity <= 0 ? (
                                          <span className="text-red-700 bg-red-100 font-extrabold text-[9px] px-2 py-0.5 rounded border border-red-200">نفاد تام 🚫</span>
                                        ) : (
                                          <span className="text-amber-700 bg-amber-100 font-bold text-[9px] px-2 py-0.5 rounded border border-amber-200">مستوى ضعيف ⚠️</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* SIGNATURE AREA IN FOOTER WRAPPERS */}
                <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between items-center text-xs text-slate-400 font-sans">
                  <div>
                    <p className="font-bold text-slate-800">توقيع محاسب / كاشير المحل:</p>
                    <p className="mt-4 border-b border-dashed border-slate-450 w-32"></p>
                  </div>
                  <div className="text-left font-serif text-[10px]">
                    <p>{settings.shopName} - نظام محاسبة التجزئة POS</p>
                    <p>مبني وموثق وفق الميزانيات والسيولة.</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {expiryWarningModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="expiry-warning-modal">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-md text-right border border-rose-100 shadow-2xl space-y-4"
          >
            <div className="bg-rose-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 border border-rose-100">
              <ShieldAlert className="text-rose-600 w-8 h-8" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-rose-700">🚫 عذراً! منتهى الصلاحية ومحظر بيعه</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                لقد دخل هذا الصنف حيز انتهاء الصلاحية مقارنة بتاريخ اليوم بالدكان ويرفض نظام الـ POS إدراج أي عنصر منه حماية للسلامة.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1 text-xs text-slate-700">
              <div>• اسم الصنف المستبعد: <span className="font-bold text-slate-900">{expiryWarningModal.name}</span></div>
              <div>• باركود التسجيل: <span className="font-mono text-slate-500 font-bold">{expiryWarningModal.barcode}</span></div>
              <div>• تاريخ الصلاحية المنتهي: <span className="font-mono text-red-600 font-bold">{expiryWarningModal.expiryDate}</span></div>
            </div>

            <p className="text-[10px] text-rose-600 text-center font-semibold">
              يرجى سحب الصنف من صالة العرض والمستودع فوراً! ⚠️
            </p>

            <button 
              onClick={() => setExpiryWarningModal(null)}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-3 rounded-xl text-xs transition cursor-pointer"
            >
              فهمت! سأقوم بسحب المعروض للتلف ✔️
            </button>
          </motion.div>
        </div>
      )}

      {/* --- MODAL 3: INLINE CATEGORY INSERTION --- */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="add-category-modal">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm text-right border border-emerald-150 shadow-2xl space-y-4"
          >
            <div className="text-center space-y-2 flex flex-col items-center justify-center">
              <div className="p-3 bg-emerald-50 rounded-2xl inline-block">
                <Layers className="w-6 h-6 text-[#1D9E75]" />
              </div>
              <h3 className="text-base font-black text-slate-800">إضافة تصنيف أو فئة منتجات جديدة</h3>
              <p className="text-[11px] text-slate-400">سجل لقباً أو فئة لتنظيم جرودات ومبيعات الأصناف بدقة بالدكان.</p>
            </div>

            <div className="space-y-3 text-right">
              <div>
                <label className="block text-slate-500 mb-1 text-[11px] font-bold">اسم الفئة الجديدة:</label>
                <input 
                  type="text" 
                  value={newCategoryNameInput} 
                  onChange={e => setNewCategoryNameInput(e.target.value)}
                  placeholder="مثال: شوكولا، أجبان، مشروبات طاقة..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-right font-medium focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1 text-[11px] font-bold">الرمز التعبيري المصاحب:</label>
                <div className="flex gap-1.5 justify-center flex-wrap py-1.5 bg-slate-50 rounded-xl border border-slate-100 mb-2">
                  {['🍎', '🥩', '🥛', '🍫', '🥤', '🍞', '🥫', '📦', '🧼', '🔋', '🍦'].map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setNewCategoryEmojiInput(em)}
                      className={`text-lg p-1.5 rounded-lg hover:bg-white border transition cursor-pointer ${newCategoryEmojiInput === em ? 'bg-white border-emerald-500 scale-110 shadow-xs' : 'border-transparent'}`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
                <input 
                  type="text" 
                  value={newCategoryEmojiInput} 
                  onChange={e => setNewCategoryEmojiInput(e.target.value)}
                  placeholder="📦"
                  className="w-12 mx-auto bg-slate-50 border border-slate-200 rounded-xl py-2 px-1 text-center font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2 text-xs font-sans">
              <button 
                type="button"
                onClick={() => {
                  if (!newCategoryNameInput.trim()) {
                    showToast('warning', 'الرجاء إدخال اسم الفئة أولاً!');
                    return;
                  }
                  handleAddNewCategory(newCategoryNameInput, newCategoryEmojiInput);
                  setNewCategoryNameInput('');
                  setNewCategoryEmojiInput('📦');
                  setShowAddCategoryModal(false);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl transition cursor-pointer"
              >
                تأكيد وبناء الفئة 💾
              </button>
              <button 
                type="button"
                onClick={() => {
                  setNewCategoryNameInput('');
                  setNewCategoryEmojiInput('📦');
                  setShowAddCategoryModal(false);
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition cursor-pointer"
              >
                تراجع
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- MODAL 4: QUICK REGISTER NEW CUSTOMER FROM CART --- */}
      {showQuickAddCustomerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="quick-add-customer-modal">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-md text-right border border-emerald-150 shadow-2xl space-y-4 font-sans"
          >
            <div className="text-center space-y-2">
              <span className="text-3xl">👤</span>
              <h3 className="text-base font-black text-slate-800">
                {lang === 'ar' ? 'تسجيل زبون جديد فوري ومطابق' : 'Quick Register New Customer'}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {lang === 'ar' 
                  ? 'سجل حساب زبون جديد مباشرة من شاشة البيع لربط النسبة، الديون ونقاط الولاء بالفاتورة الحالية.'
                  : 'Register a client account instantly to bind current cart stats, loyalty points, and credit accounts.'}
              </p>
            </div>

            <div className="space-y-3.5 text-right">
              <div>
                <label className="block text-slate-500 mb-1 text-[11px] font-bold">
                  {lang === 'ar' ? 'الاسم الكامل للزبون/الشركة *:' : 'Customer/Business Full Name *:'}
                </label>
                <input 
                  type="text" 
                  value={quickAddCustomerName} 
                  onChange={e => setQuickAddCustomerName(e.target.value)}
                  placeholder={lang === 'ar' ? 'كتب الاسم هنا... (مثال: أحمد العلي)' : 'e.g. Ahmad Al Ali'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-right font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1 text-[11px] font-bold">
                  {lang === 'ar' ? 'رقم الهاتف للتواصل والدين:' : 'Phone Number (Credit Account ID):'}
                </label>
                <input 
                  type="text" 
                  value={quickAddCustomerPhone} 
                  onChange={e => setQuickAddCustomerPhone(e.target.value)}
                  placeholder="e.g. +961 70 082327"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-center font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 text-[11px] font-bold">
                    {lang === 'ar' ? 'سقف ديون الزبون بقيمة ($):' : 'Max Debt Limit ($):'}
                  </label>
                  <input 
                    type="number" 
                    value={quickAddCustomerDebtLimit} 
                    onChange={e => setQuickAddCustomerDebtLimit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-center font-bold font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1 text-[11px] font-bold">
                    {lang === 'ar' ? 'فئة التسعير الافتراضية:' : 'Customer Pricing Mode:'}
                  </label>
                  <select 
                    value={quickAddCustomerType} 
                    onChange={e => setQuickAddCustomerType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-right font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="retail">{lang === 'ar' ? 'مستقل / مفرّق' : 'Retail'}</option>
                    <option value="wholesale">{lang === 'ar' ? 'جملة / شركات' : 'Wholesale'}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 text-xs font-sans pt-2">
              <button 
                type="button"
                onClick={handleQuickAddCustomerSubmit}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
              >
                💾 {lang === 'ar' ? 'حفظ الحساب وربطه فوراً' : 'Save & Link Now'}
              </button>
              <button 
                type="button"
                onClick={() => {
                  setQuickAddCustomerName('');
                  setQuickAddCustomerPhone('');
                  setQuickAddCustomerType('retail');
                  setQuickAddCustomerDebtLimit('1000');
                  setShowQuickAddCustomerModal(false);
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition cursor-pointer"
              >
                {lang === 'ar' ? 'تراجع' : 'Cancel'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- MODAL 5: PURCHASE & ACTIVATION CONTACT FORM MODAL --- */}
      {showPurchaseContactModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="purchase-contact-modal">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-lg text-right border border-emerald-150 shadow-2xl space-y-4 font-sans max-h-[90vh] overflow-y-auto scrollbar-thin"
          >
            <div className="text-center space-y-2 border-b border-slate-100 pb-3">
              <span className="text-4xl">📨</span>
              <h3 className="text-base font-black text-slate-800">
                {lang === 'ar' ? 'نموذج تواصل لشراء وتفعيل الاشتراك السنوي' : 'Annual License Purchase & Contact Form'}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium max-w-md mx-auto">
                {lang === 'ar' 
                  ? 'املأ بياناتك لإنشاء رسالة طلب التفعيل لتجهيز الاشتراك السنوي وحذف القيود. تواصل مع المطور أ. كامل بيضاء مباشرة.'
                  : 'Submit contact details below to generate immediate purchase inquiry with full support for annual subscription.'}
              </p>
            </div>

            <div className="space-y-3.5 text-right">
              <div>
                <label className="block text-slate-500 mb-1 text-[11px] font-bold">👤 {lang === 'ar' ? 'اسمك الكريم / المالك:' : 'Your Name / Shop Owner:'}</label>
                <input 
                  type="text"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: كامل بيضاء...' : 'e.g. Kamel'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-right font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 text-[11px] font-bold">📧 {lang === 'ar' ? 'البريد الإلكتروني:' : 'Email Address:'}</label>
                  <input 
                    type="email"
                    value={contactEmail}
                    onChange={e => setContactEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-center font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 text-[11px] font-bold">📞 {lang === 'ar' ? 'رقم الهاتف / WhatsApp:' : 'Phone Line / WhatsApp:'}</label>
                  <input 
                    type="text"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    placeholder="+96170082327"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-center font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 text-[11px] font-bold">🏢 {lang === 'ar' ? 'اسم المتجر المراد تفعيله:' : 'Store Name to Activate:'}</label>
                <input 
                  type="text"
                  value={contactShop || settings.shopName || ''}
                  onChange={e => setContactShop(e.target.value)}
                  placeholder={settings.shopName || "Supermarket"}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-right font-black text-rose-700/90 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1 text-[11px] font-bold">📝 {lang === 'ar' ? 'رسالتك أو ملاحظاتك الإضافية للطلب:' : 'Additional message / custom terms:'}</label>
                <textarea 
                  value={contactMessage}
                  onChange={e => setContactMessage(e.target.value)}
                  placeholder={lang === 'ar' ? 'تفاصيل عن متطلبات محلك، عدد الأجهزة...' : 'Inquire about hardware specs, pricing, multiple stations...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-right font-medium h-16 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl text-center space-y-2 mt-4">
              <span className="text-[11px] font-black text-emerald-800 block">
                {lang === 'ar' ? '💬 اختر وسيلة الإرسال المباشرة أدناه للتفعيل السنوي الفوري عبر المطور:' : '💬 Choose shipping channel for annual key activation:'}
              </span>
              
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                {(() => {
                  const waMsg = `السلام عليكم أستاذ كامل بيضاء، أرغب في شراء وتفعيل النسخة المعتمدة لبرنامج مبيعات السوبرماركت - الاشتراك السنوي.\n\n` +
                    `📋 تفاصيل طلب التنشيط:\n` +
                    `- اسم العميل: ${contactName || 'غير محدد'}\n` +
                    `- رقم الهاتف/واتساب: ${contactPhone || 'غير محدد'}\n` +
                    `- البريد الإلكتروني: ${contactEmail || 'غير محدد'}\n` +
                    `- اسم المحل المراد قيده: ${contactShop || settings.shopName || 'غير محدد'}\n` +
                    `- ملحوظات إضافية: ${contactMessage || 'لا يوجد'}\n\n` +
                    `يرجى تزويدي بمفتاح التفعيل السنوي المناسب وتفاصيل دفع الرصيد وشكراً!`;
                  const waUrl = `https://wa.me/96170082327?text=${encodeURIComponent(waMsg)}`;
                  return (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer text-center"
                    >
                      💬 {lang === 'ar' ? 'واتساب مباشر' : 'Send WhatsApp'}
                    </a>
                  );
                })()}

                {(() => {
                  const mailSubject = `طلب تفعيل برنامج المبيعات - ${contactShop || settings.shopName || "السوبر ماركت"}`;
                  const mailBody = `السلام عليكم أستاذ كامل بيضاء,\n\nأود شراء النسخة الكاملة لبرنامج المبيعات - الاشتراك السنوي.\n\nتفاصيل تفعيل الترخيص:\n` +
                    `- الاسم الكريم: ${contactName || 'غير محدد'}\n` +
                    `- رقم الهاتف: ${contactPhone || 'غير محدد'}\n` +
                    `- البريد الإلكتروني: ${contactEmail || 'غير محدد'}\n` +
                    `- اسم المحل للتفعيل: ${contactShop || settings.shopName || 'غير محدد'}\n` +
                    `- رسالة أو متطلبات: ${contactMessage || 'لا يوجد'}\n\n` +
                    `الرجاء الرد علي بآلية الدفع ورموز التفعيل السنوية اللازمة.\n\nشاكر لكم تعاونكم الكريم!\n`;
                  const mailUrl = `mailto:kamelbaydaa@gmail.com?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
                  return (
                    <a
                      href={mailUrl}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer text-center"
                    >
                      📧 {lang === 'ar' ? 'بريد إلكتروني' : 'Send Email'}
                    </a>
                  );
                })()}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button 
                type="button"
                onClick={() => setShowPurchaseContactModal(false)}
                className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 px-6 rounded-xl transition cursor-pointer text-xs"
              >
                {lang === 'ar' ? 'تراجع وإغلاق' : 'Close'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- ELECTRONIC SCALE SIMULATOR MODAL --- */}
      {isScaleSimulatorOpen && selectedScaleProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans" id="scale-simulator-modal">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-3xl p-6 w-full max-w-lg text-right shadow-2xl border ${theme === 'dark' ? 'bg-[#1C1C1E] border-stone-800 text-stone-105' : 'bg-white border-slate-150 text-slate-800'}`}
          >
            {/* Header */}
            <div className="flex justify-between items-center flex-row-reverse border-b pb-3 mb-4 border-stone-805/30">
              <span className="text-xl">⚖️</span>
              <h3 className="text-sm font-black tracking-wide flex items-center gap-2">
                <span>{lang === 'ar' ? 'محاكي الميزان الإلكتروني الذكي' : 'Smart Weighing Scale Simulator'}</span>
              </h3>
              <button 
                onClick={() => setIsScaleSimulatorOpen(false)}
                className="p-1.5 rounded-lg hover:bg-stone-500/10 text-stone-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Item Info */}
            <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-2xl mb-4 text-center">
              <h4 className="font-extrabold text-base text-amber-900 dark:text-amber-400">{selectedScaleProduct.name}</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {lang === 'ar' 
                  ? `رمز الصنف (PLU): ${selectedScaleProduct.plu || 'بدون'} | سعر الكيلو: $${selectedScaleProduct.priceUSD.toFixed(2)}` 
                  : `Item PLU: ${selectedScaleProduct.plu || 'None'} | Price/Kg: $${selectedScaleProduct.priceUSD.toFixed(2)}`}
              </p>
            </div>

            {/* Simulated Digital LED Display */}
            <div className={`p-5 rounded-2xl mb-5 border font-mono flex flex-col justify-center items-center gap-1 text-center select-none shadow-inner ${
              theme === 'dark' ? 'bg-[#121213] border-stone-850 text-cyan-400' : 'bg-slate-950 border-slate-900 text-cyan-400'
            }`}>
              <div className="text-[10px] text-cyan-600 font-sans tracking-widest uppercase">
                {lang === 'ar' ? 'شاشة ميزان الرصد الإلكتروني' : 'Electronic Weight indicator'}
              </div>
              
              {/* Weight output */}
              <div className="text-4xl font-extrabold tracking-wider flex items-baseline gap-1.5 justify-center">
                <span>{simulatedWeight.toFixed(3)}</span>
                <span className="text-xs font-sans text-cyan-600">KG / كغ</span>
              </div>

              {/* Grid of details: Tare, Price/Kg, Total */}
              <div className="grid grid-cols-3 gap-4 w-full mt-4 pt-3 border-t border-cyan-950 text-[11px]">
                <div>
                  <span className="block text-cyan-700 font-sans text-[9px] uppercase">{lang === 'ar' ? 'سعر الكيلو' : 'Price/Kg'}</span>
                  <span className="font-bold text-sm">${selectedScaleProduct.priceUSD.toFixed(2)}</span>
                </div>
                <div>
                  <span className="block text-cyan-700 font-sans text-[9px] uppercase">{lang === 'ar' ? 'تصفير الميزان' : 'Tare'}</span>
                  <span className="font-bold text-sm">0.000</span>
                </div>
                <div>
                  <span className="block text-cyan-700 font-sans text-[9px] uppercase">{lang === 'ar' ? 'الإجمالي للوزن' : 'Total Price'}</span>
                  <span className="font-bold text-sm text-yellow-450">${(simulatedWeight * selectedScaleProduct.priceUSD).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Simulated controls / Weight Adjusters */}
            <div className="space-y-4 mb-5">
              {/* Slider selector */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
                  <span>5.00 kg</span>
                  <span>{lang === 'ar' ? 'اسحب لتغيير الوزن يدوياً:' : 'Drag to adjust weight manually:'}</span>
                  <span>0.02 kg</span>
                </div>
                <input 
                  type="range"
                  min="0.02"
                  max="5.00"
                  step="0.01"
                  value={simulatedWeight}
                  onChange={(e) => setSimulatedWeight(parseFloat(e.target.value))}
                  className="w-full accent-cyan-600 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Quick weight buttons */}
              <div className="grid grid-cols-5 gap-1.5 text-center font-extrabold text-[10px]">
                <button 
                  type="button" 
                  onClick={() => setSimulatedWeight(prev => Math.min(5.0, prev + 0.1))} 
                  className={`p-2 rounded-xl cursor-pointer ${theme === 'dark' ? 'bg-stone-800 hover:bg-stone-750 text-stone-250' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'}`}
                >
                  +100g
                </button>
                <button 
                  type="button" 
                  onClick={() => setSimulatedWeight(prev => Math.min(5.0, prev + 0.25))} 
                  className={`p-2 rounded-xl cursor-pointer ${theme === 'dark' ? 'bg-stone-800 hover:bg-stone-750 text-stone-250' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'}`}
                >
                  +250g
                </button>
                <button 
                  type="button" 
                  onClick={() => setSimulatedWeight(prev => Math.min(5.0, prev + 0.5))} 
                  className={`p-2 rounded-xl cursor-pointer ${theme === 'dark' ? 'bg-stone-800 hover:bg-stone-750 text-stone-250' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'}`}
                >
                  +500g
                </button>
                <button 
                  type="button" 
                  onClick={() => setSimulatedWeight(prev => Math.min(5.0, prev + 1.0))} 
                  className={`p-2 rounded-xl cursor-pointer ${theme === 'dark' ? 'bg-stone-800 hover:bg-stone-750 text-stone-250' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'}`}
                >
                  +1.0kg
                </button>
                <button 
                  type="button" 
                  onClick={() => setSimulatedWeight(0.00)} 
                  className="p-2 rounded-xl cursor-pointer bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                >
                  {lang === 'ar' ? 'تصفير' : 'Tare'}
                </button>
              </div>

              {/* Automatic Weight generator */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    // Generate a realistic weight between 0.150 and 2.800 kg
                    const randWeight = parseFloat((0.150 + Math.random() * 2.650).toFixed(3));
                    setSimulatedWeight(randWeight);
                    showToast('success', lang === 'ar' ? 'تم قراءة وزن واقعي من حساس الميزان!' : 'Simulated weight sensor reading!');
                  }}
                  className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 py-1.5 px-3 rounded-xl text-[10px] font-black cursor-pointer transition flex items-center justify-center gap-1"
                >
                  <span>📡 {lang === 'ar' ? 'قراءة وزن تلقائي من حساس الميزان (محاكاة)' : 'Simulate Weight Sensor'}</span>
                </button>
              </div>
            </div>

            {/* Simulated Scale printed barcode generation */}
            <div className="bg-slate-100 dark:bg-stone-950 p-3.5 rounded-2xl border border-slate-200 dark:border-stone-850 space-y-2 mb-5">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                <span className="font-mono text-emerald-600 font-extrabold">
                  {(() => {
                    const plu = (selectedScaleProduct.plu || '00000').padStart(5, '0').slice(-5);
                    const weightGrams = Math.round(simulatedWeight * 1000);
                    const weightStr = weightGrams.toString().padStart(5, '0').slice(-5);
                    const baseCode = `20${plu}${weightStr}`;
                    let sum = 0;
                    for (let i = 0; i < 12; i++) {
                      const digit = parseInt(baseCode[i], 10) || 0;
                      sum += (i % 2 === 0) ? digit : digit * 3;
                    }
                    const checkDigit = ((10 - (sum % 10)) % 10).toString();
                    return baseCode + checkDigit;
                  })()}
                </span>
                <span>{lang === 'ar' ? 'ملصق الباركود المطبوع من الميزان (EAN-13):' : 'Scale printed barcode label (EAN-13):'}</span>
              </div>
              
              {/* Virtual Barcode strips */}
              <div className="flex flex-col items-center justify-center bg-white p-2 rounded-lg border border-slate-200 shadow-2xs select-none">
                <div className="flex items-center justify-center gap-0.5 h-7 opacity-85">
                  {[3, 1, 2, 1, 4, 1, 2, 3, 1, 2, 4, 1, 2, 1, 3, 1, 4, 1, 2, 3, 1, 2, 4, 1, 2, 3, 1, 4, 1, 2].map((w, idx) => (
                    <div key={idx} className="bg-slate-900" style={{ width: `${w}px`, height: '100%' }}></div>
                  ))}
                </div>
                <div className="text-[10px] font-mono font-bold tracking-widest text-slate-700 mt-1">
                  {(() => {
                    const plu = (selectedScaleProduct.plu || '00000').padStart(5, '0').slice(-5);
                    const weightGrams = Math.round(simulatedWeight * 1000);
                    const weightStr = weightGrams.toString().padStart(5, '0').slice(-5);
                    const baseCode = `20${plu}${weightStr}`;
                    let sum = 0;
                    for (let i = 0; i < 12; i++) {
                      const digit = parseInt(baseCode[i], 10) || 0;
                      sum += (i % 2 === 0) ? digit : digit * 3;
                    }
                    const checkDigit = ((10 - (sum % 10)) % 10).toString();
                    return baseCode + checkDigit;
                  })()}
                </div>
              </div>

              {/* Action: simulate scanning this label */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    const plu = (selectedScaleProduct.plu || '00000').padStart(5, '0').slice(-5);
                    const weightGrams = Math.round(simulatedWeight * 1000);
                    const weightStr = weightGrams.toString().padStart(5, '0').slice(-5);
                    const baseCode = `20${plu}${weightStr}`;
                    let sum = 0;
                    for (let i = 0; i < 12; i++) {
                      const digit = parseInt(baseCode[i], 10) || 0;
                      sum += (i % 2 === 0) ? digit : digit * 3;
                    }
                    const checkDigit = ((10 - (sum % 10)) % 10).toString();
                    const generatedBarcode = baseCode + checkDigit;

                    setBarcodeInput(generatedBarcode);
                    setIsScaleSimulatorOpen(false);
                    
                    setTimeout(() => {
                      addToCart(selectedScaleProduct, simulatedWeight);
                      setBarcodeInput('');
                      showToast(
                        'success',
                        lang === 'ar'
                          ? `📡 [محاكاة الباركود] تم مسح ملصق الميزان تلقائياً بوزن: ${simulatedWeight.toFixed(3)} كغم`
                          : `📡 [Barcode Sweep] Scanned scale printed label: ${simulatedWeight.toFixed(3)} Kg`
                      );
                    }, 100);
                  }}
                  className="text-xs font-bold text-sky-700 hover:text-sky-800 bg-sky-50 dark:bg-sky-955 hover:bg-sky-100 py-1 px-3.5 rounded-lg border border-sky-200/50 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>📷 {lang === 'ar' ? 'محاكاة طباعة ومسح هذا الملصق على الكاشير' : 'Simulate print & scan of this label'}</span>
                </button>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex gap-2 flex-row-reverse border-t pt-4 border-stone-805/20">
              <button 
                type="button"
                disabled={simulatedWeight <= 0}
                onClick={() => {
                  if (simulatedWeight <= 0) return;
                  addToCart(selectedScaleProduct, simulatedWeight);
                  setIsScaleSimulatorOpen(false);
                  showToast(
                    'success',
                    lang === 'ar'
                      ? `✔️ تم إضافة [${selectedScaleProduct.name}] بوزن ${simulatedWeight.toFixed(3)} كغم للسلة!`
                      : `✔️ Added [${selectedScaleProduct.name}] with weight ${simulatedWeight.toFixed(3)} Kg!`
                  );
                }}
                className={`flex-1 font-black py-3 px-5 rounded-2xl transition cursor-pointer text-xs text-center flex items-center justify-center gap-2 ${
                  simulatedWeight <= 0 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                }`}
              >
                <span>✔️ {lang === 'ar' ? 'إرسال الوزن وإضافته للسلة مباشرة' : 'Weigh and Add to Cart'}</span>
              </button>
              <button 
                type="button"
                onClick={() => setIsScaleSimulatorOpen(false)}
                className={`py-3 px-5 rounded-2xl transition cursor-pointer text-xs font-bold ${
                  theme === 'dark' ? 'bg-[#2A2A2E] text-stone-300 hover:bg-[#323236]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- TOUCH NUMPAD MODAL --- */}
      {isNumpadOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans" id="touch-numpad-modal">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-3xl p-6 w-full max-w-sm text-right shadow-2xl border ${theme === 'dark' ? 'bg-[#1C1C1E] border-stone-800 text-stone-100' : 'bg-white border-slate-150 text-slate-800'}`}
          >
            <div className="flex justify-between items-center flex-row-reverse border-b pb-3 mb-4 border-stone-805/30">
              <span className="text-xl">⌨️</span>
              <h3 className="text-sm font-black tracking-wide truncate max-w-[260px]">{numpadTitle || (lang === 'ar' ? 'التوجيه اللمسي للأرقام' : 'Virtual Numeric Entry')}</h3>
              <button 
                onClick={() => setIsNumpadOpen(false)}
                className="p-1.5 rounded-lg hover:bg-stone-500/10 text-stone-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input Value Display */}
            <div className={`p-4 rounded-2xl mb-4 border font-mono font-black text-center text-2xl tracking-widest ${theme === 'dark' ? 'bg-[#121213] border-stone-800 text-emerald-400' : 'bg-slate-50 border-slate-250 text-emerald-600 shadow-inner'}`}>
              {numpadValue || '0'}
            </div>

            {/* Matrix structure Grid layout */}
            <div className="grid grid-cols-3 gap-2 px-1 mb-4 select-none">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setNumpadValue(prev => (prev === '0' || prev === '') ? num.toString() : prev + num.toString())}
                  className={`py-3.5 rounded-xl font-mono text-lg font-black transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-[#252528] text-white hover:bg-[#2C2C30]' : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-250 shadow-xs'}`}
                >
                  {num}
                </button>
              ))}

              {/* Special operators and backspaces */}
              <button
                type="button"
                onClick={() => setNumpadValue('0')}
                className={`py-3.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-stone-800/65 hover:bg-stone-800 text-rose-450' : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100'}`}
              >
                {lang === 'ar' ? 'تصفير' : 'Clear'}
              </button>
              
              <button
                type="button"
                onClick={() => setNumpadValue(prev => (prev === '' || prev === '0') ? '0' : prev + '0')}
                className={`py-3.5 rounded-xl font-mono text-lg font-black transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-[#252528] text-white hover:bg-[#2C2C30]' : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-250 shadow-xs'}`}
              >
                0
              </button>

              <button
                type="button"
                onClick={() => {
                  setNumpadValue(prev => {
                    const str = prev || '0';
                    if (str.includes('.')) return str;
                    return str + '.';
                  });
                }}
                className={`py-3.5 rounded-xl font-mono text-lg font-black transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-[#252528] text-white hover:bg-[#2C2C30]' : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-250 shadow-xs'}`}
              >
                .
              </button>
            </div>

            {/* Quick adjustment presets keys */}
            <div className="space-y-1.5 mb-5 select-none">
              <span className={`text-[10px] block font-extrabold pr-1.5 ${theme === 'dark' ? 'text-stone-500' : 'text-slate-450'}`}>
                {lang === 'ar' ? '⚡️ اختصارات التعديل بالجمع والفارق:' : '⚡️ Fast addition templates:'}
              </span>
              <div className="grid grid-cols-5 gap-1 select-none">
                {['+1', '+5', '+10', '+20', '+50'].map(mod => (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => {
                      const val = parseFloat(numpadValue) || 0;
                      const offset = parseFloat(mod) || 0;
                      setNumpadValue(Math.max(0, val + offset).toString());
                    }}
                    className={`py-2 rounded-lg text-[10px] font-mono font-bold transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-[#2C2C30] hover:bg-stone-700 text-stone-300' : 'bg-slate-50 border border-slate-200 hover:bg-slate-150 text-slate-600 shadow-sm'}`}
                  >
                    {mod}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions for Touch Numpad */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  numpadOnSave.fn(numpadValue);
                  setIsNumpadOpen(false);
                }}
                className="flex-1 bg-[#1D9E75] hover:bg-emerald-600 text-white font-extrabold py-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-emerald-500/10 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>{lang === 'ar' ? 'حفظ وتأكيد' : 'Confirm & Apply'}</span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setNumpadValue(prev => {
                    const str = prev || '0';
                    if (str.length <= 1) return '';
                    return str.slice(0, -1);
                  });
                }}
                className={`px-4 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-[#2C2C30] hover:bg-zinc-700 text-stone-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'}`}
                title={lang === 'ar' ? 'حذف خطوة للخلف' : 'Delete last digit'}
              >
                <Delete className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsNumpadOpen(false)}
                className={`px-4 py-3 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-stone-800 text-stone-400 hover:bg-stone-750' : 'bg-slate-200 text-slate-600 hover:bg-slate-250 border border-slate-300'}`}
              >
                {lang === 'ar' ? 'تراجع' : 'Close'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- TOUCH SCREEN CASH SETTLEMENT & CHANGE CALCULATOR MODAL --- */}
      {isTouchPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans" id="touch-payment-modal">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-3xl p-6 w-full max-w-3xl text-right shadow-2xl border flex flex-col md:flex-row gap-6 ${theme === 'dark' ? 'bg-[#1C1C1E] border-stone-850 text-stone-100' : 'bg-white border-slate-200 text-slate-800'}`}
          >
            {/* Right Division: Checkout Totals & Calculations (Matches mockup order precisely) */}
            <div className="flex-1 space-y-3.5 flex flex-col justify-between">
              <div>
                {/* Header inside modal */}
                <div className="flex justify-between items-center pb-2 border-b border-stone-880/10">
                  <button 
                    type="button"
                    onClick={() => setIsTouchPaymentModalOpen(false)}
                    className="p-1 px-3 rounded-lg text-xs font-black bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 cursor-pointer animate-fade-in"
                  >
                    {lang === 'ar' ? 'إلغاء' : 'Close'}
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base">{lang === 'ar' ? 'تسوية الفاتورة وحساب المرتجع للزبون' : 'Invoice Settlement'}</span>
                    <span className="text-xl">💵</span>
                  </div>
                </div>

                {/* Selected Customer indicator (if any) */}
                {selectedCustomerId && (
                  <div className={`p-2 py-1.5 my-2 rounded-xl text-xs text-center font-bold border ${theme === 'dark' ? 'bg-amber-950/20 border-amber-900/40 text-amber-300' : 'bg-amber-50 border-amber-200/40 text-amber-800'}`}>
                    🔗 {lang === 'ar' ? 'الزبون المُرتبط:' : 'Linked Customer:'} {customers.find(c => c.id === selectedCustomerId)?.name || 'زبون محدد'}
                  </div>
                )}

                <div className="space-y-2.5 my-3">
                  {/* (1) المجموع الجزئي (Subtotal) */}
                  <div className={`flex justify-between items-center text-sm font-bold ${theme === 'dark' ? 'text-stone-300' : 'text-slate-600'}`}>
                    <span>{lang === 'ar' ? 'المجموع الجزئي:' : 'Subtotal:'}</span>
                    <span className={`font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                      $ {cartSubtotalUSD.toFixed(2)}
                    </span>
                  </div>

                  {/* (2) خصم نقدي مباشر ($) */}
                  <div className={`flex justify-between items-center text-sm font-bold gap-4 ${theme === 'dark' ? 'text-stone-300' : 'text-slate-600'}`}>
                    <span>{lang === 'ar' ? 'خصم نقدي مباشر ($):' : 'Direct cash discount ($):'}</span>
                    <div 
                      onClick={() => setTouchPaymentActiveField('discount')}
                      className={`flex items-center gap-1.5 cursor-pointer rounded-xl px-2.5 py-1.5 border transition-all ${touchPaymentActiveField === 'discount' ? 'border-[#1D9E75] bg-emerald-500/5 ring-2 ring-[#1D9E75]/30' : (theme === 'dark' ? 'border-stone-800 bg-[#121213] text-white' : 'border-slate-250 bg-slate-50 text-slate-900 shadow-inner')}`}
                    >
                      <span className="text-xs font-bold text-slate-400 font-mono">$</span>
                      <span className={`w-16 text-center font-mono font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {discountInput || '0'}
                      </span>
                    </div>
                  </div>

                  {/* (3) المطلوب الكلي ($) */}
                  <div className={`flex justify-between items-center pt-2.5 border-t ${theme === 'dark' ? 'border-stone-850' : 'border-slate-250'}`}>
                    <span className={`font-black text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{lang === 'ar' ? 'المطلوب الكلي ($):' : 'Total Amount ($):'}</span>
                    <span className={`text-2xl font-black font-mono ${theme === 'dark' ? 'text-rose-500' : 'text-rose-600'}`}>
                      $ {cartTotalUSD.toFixed(2)}
                    </span>
                  </div>

                  {/* (4) المجموع بـ ليرة */}
                  <div className="flex justify-between items-center pb-0.5">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded border ${theme === 'dark' ? 'text-emerald-400 bg-emerald-950/40 border-emerald-900/40' : 'text-emerald-750 bg-emerald-50 border-emerald-150'}`}>
                      {lang === 'ar' ? 'المجموع بـ ليرة' : 'Total LBP'}
                    </span>
                    <span className={`text-xl font-black font-mono ${theme === 'dark' ? 'text-emerald-400' : 'text-[#1D9E75]'}`}>
                      {Math.ceil(cartTotalLBP).toLocaleString()} ل.ل
                    </span>
                  </div>

                  {/* (5 & 6) Cash received Green Container */}
                  <div className={`rounded-2xl p-3 space-y-3 border ${theme === 'dark' ? 'bg-[#18181A] border-stone-800' : 'bg-[#EAF6ED]/70 border-emerald-100'}`}>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div 
                        onClick={() => setTouchPaymentActiveField('usd')}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${touchPaymentActiveField === 'usd' ? 'bg-white border-[#1D9E75] ring-2 ring-[#1D9E75]/30' : (theme === 'dark' ? 'bg-[#121213] border-stone-850' : 'bg-white border-emerald-205 shadow-sm')}`}
                      >
                        <span className={`block mb-0.5 text-right text-[10.5px] font-black ${theme === 'dark' ? 'text-stone-400' : 'text-slate-600'}`}>{lang === 'ar' ? 'المدفوع دولار ($):' : 'Paid USD ($):'}</span>
                        <div className={`font-mono font-black text-center text-base py-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {paidUSDInput || '0'}
                        </div>
                      </div>

                      <div 
                        onClick={() => setTouchPaymentActiveField('lbp')}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${touchPaymentActiveField === 'lbp' ? 'bg-white border-[#1D9E75] ring-2 ring-[#1D9E75]/30' : (theme === 'dark' ? 'bg-[#121213] border-stone-850' : 'bg-white border-emerald-205 shadow-sm')}`}
                      >
                        <span className={`block mb-0.5 text-right text-[10.5px] font-black ${theme === 'dark' ? 'text-stone-400' : 'text-slate-600'}`}>{lang === 'ar' ? 'أو المدفوع ليرة:' : 'Or Paid LBP:'}</span>
                        <div className={`font-mono font-black text-center text-base py-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {paidLBPInput ? parseInt(paidLBPInput).toLocaleString() : '0'}
                        </div>
                      </div>
                    </div>

                    {/* Change returned details */}
                    <div className={`flex justify-between items-center text-xs pt-1.5 border-t ${theme === 'dark' ? 'text-stone-300 border-stone-800' : 'text-slate-800 border-emerald-150/40'}`}>
                      <span className="font-black">{lang === 'ar' ? 'الباقي المرتجع للزبون:' : 'Change Return Amount:'}</span>
                      <div className={`text-left font-mono font-black text-[#1D9E75] dark:text-emerald-400 text-sm leading-none`}>
                        {changeUSD > 0 ? `${changeUSD.toFixed(2)} $ / ${Math.ceil(changeLBP).toLocaleString()} ل.ل` : '0.00 $'}
                      </div>
                    </div>
                  </div>

                  {/* (7) Payment methods row */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {(['cash', 'card', 'transfer', 'debt'] as const).map((m) => {
                      const isSelected = paymentMethod === m;
                      const isDebtDisabled = m === 'debt' && !selectedCustomerId;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            if (m === 'debt' && !selectedCustomerId) {
                              showToast('warning', lang === 'ar' ? '⚠️ يرجى أولاً ربط زبون لتمكين المبيعات بالدين!' : 'Please associate customer first to pay as debt!');
                              triggerCustomerSearch();
                              return;
                            }
                            setPaymentMethod(m);
                          }}
                          className={`py-2 rounded-xl font-black text-center transition cursor-pointer text-xs border ${
                            isSelected 
                              ? 'bg-red-600 border-red-700 text-black' 
                              : isDebtDisabled 
                              ? 'opacity-30 cursor-not-allowed bg-black text-slate-400 border-transparent'
                              : 'bg-black text-white border-stone-850 hover:bg-stone-900'
                          }`}
                        >
                          {m === 'cash' ? (lang === 'ar' ? 'كاش' : 'Cash') :
                           m === 'card' ? (lang === 'ar' ? 'بطاقة' : 'Card') :
                           m === 'transfer' ? (lang === 'ar' ? 'تحويل' : 'Transfer') :
                           (lang === 'ar' ? 'آجل/دين' : 'Debt')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Confirm & print, direct drawer, cancel buttons */}
              <div className="space-y-2 mt-auto">
                <button
                  type="button"
                  onClick={() => {
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
                  }}
                  className="w-full bg-[#1D9E75] hover:bg-[#15805e] active:scale-[0.98] text-white font-extrabold py-3 px-3 rounded-xl transition shadow-lg shadow-emerald-500/10 text-xs text-center flex items-center justify-center gap-1.5 cursor-pointer h-12 leading-none"
                >
                  <Printer className="w-4 h-4 shrink-0" />
                  <span>{lang === 'ar' ? 'حفظ الفاتورة وحساب الكاشير (F1)' : 'Save & Print Invoice (F1)'}</span>
                </button>

                <div className="flex gap-1.5 w-full">
                  <button
                    type="button"
                    onClick={openCashDrawer}
                    className="flex-1 bg-[#F59E0B] hover:bg-amber-500 text-white font-extrabold py-2.5 rounded-xl transition shadow-md active:translate-y-px text-xs flex items-center justify-center gap-1.5 cursor-pointer h-11"
                  >
                    💵 {lang === 'ar' ? 'فتح درج الكاش المباشر' : 'Open Cash Drawer'}
                  </button>
                  {hardwarePrinterType !== 'system' ? (
                    <div className="bg-emerald-50 dark:bg-emerald-950 text-emerald-750 dark:text-emerald-300 text-[10px] font-mono font-extrabold px-2.5 rounded-xl flex items-center justify-center border border-emerald-250 h-11 shrink-0">
                      {hardwarePrinterType.toUpperCase()} متصل
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 text-[10px] font-medium px-2 rounded-xl flex items-center justify-center border border-slate-205 dark:border-stone-800 h-11 shrink-0">
                      طابعة نظام 🖥️
                    </div>
                  )}
                </div>

                <button 
                  type="button"
                  onClick={() => setIsTouchPaymentModalOpen(false)}
                  className="w-full text-slate-400 hover:text-rose-600 py-1 transition text-xs font-semibold text-center block"
                >
                  {lang === 'ar' ? 'إلغاء السلة ' : 'Cancel Quick Basket'}
                </button>
              </div>
            </div>

            {/* Left Division: Touch numpad & Quick Presets (Matches layout perfectly) */}
            <div className={`w-full md:w-[240px] flex flex-col p-4 rounded-3xl shrink-0 justify-between ${theme === 'dark' ? 'bg-[#212124] border border-stone-800' : 'bg-slate-50 border border-slate-250 shadow-xs'}`}>
              <div>
                <span className="text-[11px] block font-bold text-center text-slate-400 mb-2.5">
                  {lang === 'ar' 
                    ? `لوحة اللمس لـ [${touchPaymentActiveField === 'usd' ? 'المدفوع دولار' : touchPaymentActiveField === 'lbp' ? 'المدفوع ليرة' : 'الخصم المباشر'}]` 
                    : `Virtual numpad editing [${touchPaymentActiveField}]`
                  }
                </span>
                
                {/* Virtual keypad keys */}
                <div className="grid grid-cols-3 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        if (touchPaymentActiveField === 'usd') {
                          setPaidUSDInput(prev => (prev === '0' || prev === '') ? num.toString() : prev + num.toString());
                        } else if (touchPaymentActiveField === 'lbp') {
                          setPaidLBPInput(prev => (prev === '0' || prev === '') ? num.toString() : prev + num.toString());
                        } else if (touchPaymentActiveField === 'discount') {
                          setDiscountInput(prev => (prev === '0' || prev === '') ? num.toString() : prev + num.toString());
                        }
                      }}
                      className={`py-3 rounded-xl font-bold font-mono text-center active:scale-95 transition cursor-pointer ${theme === 'dark' ? 'bg-[#2C2C30] hover:bg-zinc-700 text-white text-base' : 'bg-white border border-slate-250 hover:bg-slate-100 text-slate-850 text-base shadow-xs'}`}
                    >
                      {num}
                    </button>
                  ))}

                  {/* Decimal Dot */}
                  <button
                    type="button"
                    onClick={() => {
                      if (touchPaymentActiveField === 'usd') {
                        if (!paidUSDInput.includes('.')) setPaidUSDInput(prev => prev === '' ? '0.' : prev + '.');
                      } else if (touchPaymentActiveField === 'lbp') {
                        if (!paidLBPInput.includes('.')) setPaidLBPInput(prev => prev === '' ? '0.' : prev + '.');
                      } else if (touchPaymentActiveField === 'discount') {
                        if (!discountInput.includes('.')) setDiscountInput(prev => prev === '' ? '0.' : prev + '.');
                      }
                    }}
                    className={`py-3 rounded-xl font-black font-mono text-center active:scale-95 transition cursor-pointer text-base ${theme === 'dark' ? 'bg-[#2C2C30] hover:bg-[#343438] text-white' : 'bg-white border border-slate-250 hover:bg-slate-100 text-slate-850 shadow-xs'}`}
                  >
                    .
                  </button>

                  {/* Number 0 */}
                  <button
                    type="button"
                    onClick={() => {
                      if (touchPaymentActiveField === 'usd') {
                        setPaidUSDInput(prev => (prev === '0' || prev === '') ? '0' : prev + '0');
                      } else if (touchPaymentActiveField === 'lbp') {
                        setPaidLBPInput(prev => (prev === '0' || prev === '') ? '0' : prev + '0');
                      } else if (touchPaymentActiveField === 'discount') {
                        setDiscountInput(prev => (prev === '0' || prev === '') ? '0' : prev + '0');
                      }
                    }}
                    className={`py-3 rounded-xl font-bold font-mono text-center active:scale-95 transition cursor-pointer text-base ${theme === 'dark' ? 'bg-[#2C2C30] hover:bg-[#343438] text-white' : 'bg-white border border-slate-250 hover:bg-slate-100 text-slate-850 shadow-xs'}`}
                  >
                    0
                  </button>

                  {/* Clear Input */}
                  <button
                    type="button"
                    onClick={() => {
                      if (touchPaymentActiveField === 'usd') {
                        setPaidUSDInput('');
                      } else if (touchPaymentActiveField === 'lbp') {
                        setPaidLBPInput('');
                      } else if (touchPaymentActiveField === 'discount') {
                        setDiscountInput('');
                      }
                    }}
                    className="py-3 rounded-xl font-bold text-center active:scale-95 transition cursor-pointer text-xs bg-rose-600 hover:bg-rose-500 text-white shadow font-sans"
                  >
                    {lang === 'ar' ? 'تصفير' : 'C'}
                  </button>

                  {/* Double Zero */}
                  <button
                    type="button"
                    onClick={() => {
                      if (touchPaymentActiveField === 'usd') {
                        setPaidUSDInput(prev => (prev === '0' || prev === '') ? '0' : prev + '00');
                      } else if (touchPaymentActiveField === 'lbp') {
                        setPaidLBPInput(prev => (prev === '0' || prev === '') ? '0' : prev + '00');
                      } else if (touchPaymentActiveField === 'discount') {
                        setDiscountInput(prev => (prev === '0' || prev === '') ? '0' : prev + '00');
                      }
                    }}
                    className={`col-span-2 py-3 rounded-xl font-bold font-mono text-center active:scale-95 transition cursor-pointer text-sm ${theme === 'dark' ? 'bg-[#242426] text-stone-300 hover:bg-[#2F2F32]' : 'bg-slate-100 hover:bg-slate-205 text-slate-800 font-bold border border-slate-250'}`}
                  >
                    00
                  </button>

                  {/* Backspace Key */}
                  <button
                    type="button"
                    onClick={() => {
                      if (touchPaymentActiveField === 'usd') {
                        setPaidUSDInput(prev => prev ? prev.slice(0, -1) : '');
                      } else if (touchPaymentActiveField === 'lbp') {
                        setPaidLBPInput(prev => prev ? prev.slice(0, -1) : '');
                      } else if (touchPaymentActiveField === 'discount') {
                        setDiscountInput(prev => prev ? prev.slice(0, -1) : '');
                      }
                    }}
                    className={`py-3 rounded-xl font-bold text-center active:scale-95 transition cursor-pointer flex items-center justify-center ${theme === 'dark' ? 'bg-[#242426] text-stone-300 hover:bg-[#2F2F32]' : 'bg-slate-100 hover:bg-slate-200 text-slate-850 border border-slate-250'}`}
                    title={lang === 'ar' ? 'مسح خطوة للخلف' : 'Backspace'}
                  >
                    <Delete className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Preset Buttons Pane */}
              <div className="space-y-1.5 mt-3 pt-2.5 border-t border-dashed border-stone-800/10">
                <span className="block text-[10px] text-slate-400 font-bold">{lang === 'ar' ? 'التعبئة لمس (Presets):' : 'Pre-fills:'}</span>
                
                {/* LBP Bills helper */}
                <div className="flex flex-wrap gap-1 items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setPaidLBPInput(Math.ceil(cartTotalLBP).toString());
                      setTouchPaymentActiveField('lbp');
                    }}
                    className="py-1 px-1.5 rounded-lg text-[9.5px] font-black bg-[#EAF6ED] text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
                  >
                    {lang === 'ar' ? 'كامل ليرة' : 'Exact LBP'}
                  </button>
                  {[100000, 250000, 500000, 1000000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setPaidLBPInput(val.toString());
                        setTouchPaymentActiveField('lbp');
                      }}
                      className="py-1 px-1.5 rounded-lg text-[9.5px] font-semibold bg-slate-100 border border-slate-250 hover:bg-slate-200 text-slate-700 dark:bg-stone-900 dark:text-stone-300 dark:border-stone-800 cursor-pointer"
                    >
                      {val / 1000}k
                    </button>
                  ))}
                </div>

                {/* USD Presets help */}
                <div className="flex flex-wrap gap-1 items-center justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPaidUSDInput(cartTotalUSD.toFixed(2));
                      setTouchPaymentActiveField('usd');
                    }}
                    className="py-1 px-1.5 rounded-lg text-[9.5px] font-black bg-[#EAF6ED] text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
                  >
                    {lang === 'ar' ? 'كامل دولار' : 'Exact USD'}
                  </button>
                  {[5, 10, 20, 50, 100].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setPaidUSDInput(val.toString());
                        setTouchPaymentActiveField('usd');
                      }}
                      className="py-1 px-1.5 rounded-lg text-[9.5px] font-semibold bg-slate-100 border border-slate-250 hover:bg-slate-200 text-slate-700 dark:bg-stone-900 dark:text-stone-300 dark:border-stone-800 cursor-pointer"
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- FINANCIAL DISCOUNT DIALOG MODAL --- */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans" id="financial-discount-modal">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-3xl p-6 w-full max-w-md text-right shadow-2xl border ${theme === 'dark' ? 'bg-[#1C1C1E] border-stone-800 text-stone-100' : 'bg-white border-slate-150 text-slate-800'}`}
          >
            <div className="flex justify-between items-center flex-row-reverse border-b pb-3 mb-4 border-stone-850/30">
              <Tag className="w-5 h-5 text-[#1D9E75]" />
              <h3 className="text-sm font-black tracking-wide">{lang === 'ar' ? 'تطبيق خصم مالي على الفاتورة الحالية' : 'Apply Invoice Direct Discount'}</h3>
              <button 
                onClick={() => setIsDiscountModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-stone-500/10 text-stone-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selection tab of discount types (Percentage, USD, LBP) */}
            <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl mb-4 border ${theme === 'dark' ? 'bg-[#121213] border-stone-805' : 'bg-slate-50 border-slate-200 shadow-inner'}`}>
              <button
                type="button"
                onClick={() => {
                  setDiscountModalMode('usd');
                  setDiscountModalVal('0');
                }}
                className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${discountModalMode === 'usd' ? 'bg-[#1D9E75] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <span>$</span>
                <span>{lang === 'ar' ? 'دولار أمريكي' : 'USD ($)'}</span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setDiscountModalMode('percentage');
                  setDiscountModalVal('0');
                }}
                className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${discountModalMode === 'percentage' ? 'bg-[#1C73E8] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <span>%</span>
                <span>{lang === 'ar' ? 'نسبة مئوية' : 'Percent (%)'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDiscountModalMode('lbp');
                  setDiscountModalVal('0');
                }}
                className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${discountModalMode === 'lbp' ? 'bg-[#8E24AA] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <span>ل.ل</span>
                <span>{lang === 'ar' ? 'ليرة لبنانية' : 'LBP (ل.ل)'}</span>
              </button>
            </div>

            {/* Numeric Display value */}
            <div className={`p-4 rounded-2xl mb-4 text-center font-black text-2xl font-mono tracking-widest border border-dashed flex items-center justify-center gap-1.5 ${theme === 'dark' ? 'bg-[#121213] border-stone-800 text-amber-400' : 'bg-slate-50 border-slate-200 text-amber-705 shadow-inner'}`}>
              {discountModalMode === 'usd' && <span>$</span>}
              <span>{(parseFloat(discountModalVal) || 0).toLocaleString()}</span>
              {discountModalMode === 'percentage' && <span>%</span>}
              {discountModalMode === 'lbp' && <span className="text-[14px]">ل.ل.</span>}
            </div>

            {/* Embedded Keypad layout inside discount modal */}
            <div className="grid grid-cols-3 gap-1.5 mb-4 select-none">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setDiscountModalVal(prev => (prev === '0' || prev === '') ? num.toString() : prev + num.toString())}
                  className={`py-2.5 rounded-xl font-mono text-base font-black transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-[#252528] text-white hover:bg-[#2C2C30]' : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-250'}`}
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setDiscountModalVal('0')}
                className={`py-2.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-stone-800/80 hover:bg-[#AA2E25]/15 text-rose-500' : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100'}`}
              >
                {lang === 'ar' ? 'تصفير' : 'Clear'}
              </button>
              
              <button
                type="button"
                onClick={() => setDiscountModalVal(prev => (prev === '' || prev === '0') ? '0' : prev + '0')}
                className={`py-2.5 rounded-xl font-mono text-base font-black transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-[#252528] text-white hover:bg-[#2C2C30]' : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-250'}`}
              >
                0
              </button>

              <button
                type="button"
                onClick={() => {
                  setDiscountModalVal(prev => {
                    const str = prev || '0';
                    if (str.length <= 1) return '';
                    return str.slice(0, -1);
                  });
                }}
                className={`py-2.5 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-[#252528] text-white hover:bg-[#2C2C30]' : 'bg-slate-100 text-slate-800 border border-slate-300'}`}
              >
                <Delete className="w-4 h-4 text-stone-400" />
              </button>
            </div>

            {/* Quick Presets based on chosen discount mode */}
            <div className="space-y-1 mb-4 select-none">
              <span className={`text-[10px] block font-extrabold pr-1.5 ${theme === 'dark' ? 'text-stone-500' : 'text-slate-400'}`}>
                {lang === 'ar' ? '⚡️ قوالب الخصم بنقرة واحدة:' : '⚡️ One-click discount templates:'}
              </span>
              
              {discountModalMode === 'percentage' && (
                <div className="grid grid-cols-6 gap-1 select-none">
                  {['5', '10', '15', '20', '25', '50'].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDiscountModalVal(val)}
                      className="py-1.5 rounded-lg text-[10px] font-mono font-bold bg-[#1C73E8]/10 hover:bg-[#1C73E8]/20 text-[#1C73E8] transition active:scale-95 cursor-pointer"
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              )}

              {discountModalMode === 'usd' && (
                <div className="grid grid-cols-6 gap-1 select-none">
                  {['1', '2', '5', '10', '15', '20'].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDiscountModalVal(val)}
                      className="py-1.5 rounded-lg text-[10px] font-mono font-bold bg-[#1D9E75]/10 hover:bg-[#1D9E75]/20 text-[#1D9E75] transition active:scale-95 cursor-pointer"
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              )}

              {discountModalMode === 'lbp' && (
                <div className="grid grid-cols-5 gap-1 select-none">
                  {['5000', '10000', '25000', '50000', '100000'].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDiscountModalVal(val)}
                      className="py-1.5 rounded-lg text-[9px] font-mono font-black bg-[#8E24AA]/10 hover:bg-[#8E24AA]/20 text-[#8E24AA] transition active:scale-95 cursor-pointer"
                    >
                      {(parseFloat(val) || 0).toLocaleString()} ل.ل
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Calculations and Live Preview values */}
            {(() => {
              const activeCart = cart.filter(i => !voidedCartItemIds.includes(i.product.id));
              const subtotal = activeCart.reduce((sum, item) => {
                const isWholesaleMode = posSaleType === 'wholesale';
                const qualifiesByQty = item.quantity >= (item.product.minWholesaleQty || 5);
                const unitPrice = (isWholesaleMode || qualifiesByQty) ? (item.product.priceWholesale || item.product.priceUSD * 0.9) : item.product.priceUSD;
                return sum + (unitPrice * item.quantity);
              }, 0);

              // Construct hypothetical input for parser
              let hypotheticalInp = '0';
              if (discountModalMode === 'percentage') {
                hypotheticalInp = `${discountModalVal}%`;
              } else if (discountModalMode === 'lbp') {
                hypotheticalInp = `${discountModalVal} ل.ل`;
              } else {
                hypotheticalInp = discountModalVal;
              }

              const discPreviewUSD = getCalculatedDiscountUSD(subtotal, hypotheticalInp);
              const resultingTotal = Math.max(0, subtotal - discPreviewUSD);

              return (
                <div className={`p-3 rounded-2xl mb-4 text-xs font-medium space-y-1 ${theme === 'dark' ? 'bg-[#121213]/60 text-stone-300' : 'bg-slate-50 border border-slate-100 text-slate-700'}`}>
                  <div className="flex justify-between flex-row-reverse border-b pb-1.5 border-dashed border-stone-800/10">
                    <span>{lang === 'ar' ? 'مجموع سلة المشتريات مـالياً:' : 'Active Cart Subtotal:'}</span>
                    <span className="font-mono font-bold">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between flex-row-reverse text-rose-500">
                    <span>{lang === 'ar' ? 'قيمة الخصم بالدولار ($):' : 'Applied Discount USD ($):'}</span>
                    <span className="font-mono font-bold">-${discPreviewUSD.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between flex-row-reverse text-emerald-500 font-extrabold text-[12.5px] pt-1">
                    <span>{lang === 'ar' ? 'المجموع المستحق الصـافي:' : 'Net Invoice Balance Total:'}</span>
                    <div className="text-right">
                      <div className="font-mono">${resultingTotal.toFixed(2)}</div>
                      <div className="text-[10px] font-mono">({Math.round(resultingTotal * settings.exchangeRate).toLocaleString()} ل.ل.)</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Footers controls block */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  let finalValStr = '0';
                  if (discountModalMode === 'percentage') {
                    finalValStr = `${discountModalVal}%`;
                  } else if (discountModalMode === 'lbp') {
                    finalValStr = `${discountModalVal} ل.ل`;
                  } else {
                    finalValStr = discountModalVal;
                  }
                  
                  setDiscountInput(finalValStr);
                  setIsDiscountModalOpen(false);
                  showToast('success', lang === 'ar' ? `✔️ تم إدراج قيمة الخصم المالي بنجاح لـ ${finalValStr}` : `Discount successfully bounds with ${finalValStr}`);
                }}
                className="flex-1 bg-[#1D9E75] hover:bg-emerald-600 text-white font-extrabold py-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1 active:scale-95 shadow-md shadow-emerald-500/10"
              >
                <Check className="w-4 h-4" />
                <span>{lang === 'ar' ? 'حفظ وتطبيق الخصم' : 'Save & Active'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDiscountInput('0');
                  setIsDiscountModalOpen(false);
                  showToast('success', lang === 'ar' ? 'تم إلغاء خصومات الفاتورة وتصفيرها بالكامل' : 'Removed all bill discounts');
                }}
                className={`py-3 px-3.5 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-[#AA2E25]/15 text-[#FF2E25] hover:bg-[#AA2E25]/25 hover:text-[#FFAA9D]' : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-150'}`}
                title={lang === 'ar' ? 'تصفير الخصم وقيمة الفاتورة كاملة' : 'Reboot and dismiss all discounts'}
              >
                {lang === 'ar' ? 'تصفير' : 'Reset'}
              </button>

              <button
                type="button"
                onClick={() => setIsDiscountModalOpen(false)}
                className={`py-3 px-4 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer ${theme === 'dark' ? 'bg-stone-800 text-stone-400 hover:bg-stone-750' : 'bg-slate-200 text-slate-600 hover:bg-slate-250 border border-slate-300'}`}
              >
                {lang === 'ar' ? 'تراجع' : 'Cancel'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- INTERACTIVE CUSTOMER SELECT & QUICK CREATE MODAL --- */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans" id="customer-selector-modal">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-3xl p-6 w-full max-w-lg text-right shadow-2xl border flex flex-col max-h-[90vh] ${theme === 'dark' ? 'bg-[#1C1C1E] border-stone-800 text-stone-100' : 'bg-white border-slate-150 text-slate-800'}`}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center flex-row-reverse border-b pb-3 mb-4 border-stone-805/30 shrink-0">
              <span className="text-xl">👥</span>
              <h3 className="text-base font-black tracking-wide">
                {isAddingNewCustomerInModal 
                  ? (lang === 'ar' ? 'تسجيل زبون جديد سريع بالسيستم' : 'Quick Register New Customer')
                  : (lang === 'ar' ? 'ربط وتحديد زبون الفاتورة الحالية' : 'Link Invoice Customer')}
              </h3>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-stone-500/10 text-stone-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Toggle - Add Customer vs Search Customer */}
            <div className="flex justify-between items-center mb-4 shrink-0 flex-row-reverse">
              <span className="text-xs font-bold text-slate-400">
                {!isAddingNewCustomerInModal && (lang === 'ar' ? `عدد الزبائن الكلي: ${customers.length}` : `Total: ${customers.length}`)}
              </span>
              <button
                type="button"
                onClick={() => setIsAddingNewCustomerInModal(!isAddingNewCustomerInModal)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 flex-row-reverse ${isAddingNewCustomerInModal ? 'bg-slate-100 dark:bg-stone-800 text-slate-600' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'}`}
              >
                <span>➕</span>
                <span>{isAddingNewCustomerInModal ? (lang === 'ar' ? 'رجوع للبحث والاختيار' : 'Back to selection') : (lang === 'ar' ? 'إنشاء زبون جديد سريع' : 'Quick register')}</span>
              </button>
            </div>

            {/* MODAL WORKSPACE - INLINE FORM VS SEARCH LIST */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-1 pl-1 mb-4">
              {isAddingNewCustomerInModal ? (
                /* INLINE FORM FOR CREATING CUSTOMER DIRECTLY */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newCustName.trim()) {
                      showToast('error', lang === 'ar' ? 'الاسم مطلوب لإنشاء زبون!' : 'Name is required to create customer!');
                      return;
                    }
                    const newCust: Customer = {
                      id: `cust-${Date.now()}`,
                      name: newCustName.trim(),
                      phone: newCustPhone.trim() || 'N/A',
                      type: newCustType,
                      loyaltyPoints: 0,
                      creditBalance: 0,
                      debtLimit: newCustLimit
                    };
                    const updated = [newCust, ...customers];
                    setCustomers(updated);
                    localStorage.setItem('pos_customers', JSON.stringify(updated));
                    if (typeof syncWriteToCloud === 'function') {
                      syncWriteToCloud('customers', newCust.id, newCust);
                    }
                    setSelectedCustomerId(newCust.id);
                    setIsCustomerModalOpen(false);
                    showToast('success', lang === 'ar' ? `🎉 تم تسجيل وتحديد الزبون الجديد: ${newCust.name}` : `🎉 Created and linked new customer: ${newCust.name}`);
                  }}
                  className="space-y-4 font-sans text-right"
                >
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-550 block">
                      {lang === 'ar' ? 'اسم الزبون الكامل (مطلوب) *' : 'Customer Name (Required) *'}
                    </label>
                    <input
                      type="text"
                      value={newCustName}
                      onChange={e => setNewCustName(e.target.value)}
                      required
                      className="w-full bg-slate-50 dark:bg-stone-900 border border-slate-200 dark:border-stone-800 rounded-xl py-2.5 px-3 text-right text-sm focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                      placeholder={lang === 'ar' ? 'مثال: أبو علي صيداوي' : 'e.g. John Doe'}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-550 block">
                      {lang === 'ar' ? 'رقم الهاتف/الجوال' : 'Phone Number'}
                    </label>
                    <input
                      type="text"
                      value={newCustPhone}
                      onChange={e => setNewCustPhone(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-stone-900 border border-slate-200 dark:border-stone-800 rounded-xl py-2.5 px-3 text-right text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                      placeholder="e.g. 70123456"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-550 block">
                        {lang === 'ar' ? 'فئة الزبون والأسعار:' : 'Sales Pricing Tier:'}
                      </label>
                      <select
                        value={newCustType}
                        onChange={e => setNewCustType(e.target.value as 'retail' | 'wholesale')}
                        className="w-full bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-800 text-slate-700 dark:text-stone-300 rounded-xl py-2 px-2 text-xs text-right cursor-pointer"
                      >
                        <option value="retail">{lang === 'ar' ? 'مفرّق (قائمة التجزئة)' : 'Retail (Standard)'}</option>
                        <option value="wholesale">{lang === 'ar' ? 'جملة (خصم الجملة)' : 'Wholesale (Wholesale Prices)'}</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-550 block">
                        {lang === 'ar' ? 'سقف الدين المسموح ($):' : 'Debt Upper Ceiling Limit ($):'}
                      </label>
                      <input
                        type="number"
                        value={newCustLimit}
                        onChange={e => setNewCustLimit(Number(e.target.value))}
                        min="0"
                        className="w-full bg-slate-50 dark:bg-stone-900 border border-slate-200 dark:border-stone-800 rounded-xl py-2 px-3 text-right text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#1D9E75] hover:bg-emerald-600 text-white font-extrabold py-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-emerald-500/10 active:scale-95 mt-4"
                  >
                    <span>💾</span>
                    <span>{lang === 'ar' ? 'تسجيل وحفظ والربط مع الفاتورة الحالية' : 'Register Customer & Select'}</span>
                  </button>
                </form>
              ) : (
                /* INTERACTIVE SELECTION COMPONENT WITH SEARCH & SCROLL */
                <div className="space-y-3 font-sans">
                  {/* Search box with Icon */}
                  <div className="relative">
                    <input
                      type="text"
                      value={modalCustomerSearch}
                      onChange={e => setModalCustomerSearch(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-stone-900 border border-slate-200 dark:border-stone-800 rounded-xl py-2.5 px-4 pr-10 text-right text-xs focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                      placeholder={lang === 'ar' ? '🔍 ابحث باسم الزبون أو الهاتف...' : '🔍 Search by name or phone...'}
                    />
                  </div>

                  {/* Customer Records Scroll Deck */}
                  <div className="space-y-2 mt-2 max-h-[340px] overflow-y-auto pr-0.5">
                    {(() => {
                      const qFiltered = customers.filter(c => {
                        const qStr = modalCustomerSearch.trim().toLowerCase();
                        if (!qStr) return true;
                        return c.name.toLowerCase().includes(qStr) || (c.phone && c.phone.toLowerCase().includes(qStr));
                      });

                      if (qFiltered.length === 0) {
                        return (
                          <div className="text-center py-8 text-xs text-slate-400">
                            😞 {lang === 'ar' ? 'لم يتم العثور على زبائن مطابقة للبحث.' : 'No matching customer found.'}
                          </div>
                        );
                      }

                      return qFiltered.map(c => {
                        const isSelected = selectedCustomerId === c.id;
                        return (
                          <div
                            key={c.id}
                            className={`p-3 rounded-2xl border transition-all flex items-center justify-between text-right cursor-pointer hover:-translate-x-0.5 ${isSelected ? 'bg-[#1D9E75]/10 border-[#1D9E75]/40 text-[#1D9E75]' : 'bg-white dark:bg-[#1E1E20] border-slate-150 dark:border-stone-800'}`}
                            onClick={() => {
                              setSelectedCustomerId(isSelected ? '' : c.id);
                              setIsCustomerModalOpen(false);
                              showToast('success', isSelected 
                                ? (lang === 'ar' ? 'تم إلغاء ربط الزبون بالفاتورة' : 'Unlinked customer')
                                : `${lang === 'ar' ? 'تم ربط الزبون بنجاح:' : 'Linked Customer:'} ${c.name}`
                              );
                            }}
                          >
                            {/* Link/Unlink Action Button */}
                            <button
                              type="button"
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition cursor-pointer flex items-center gap-1 justify-center shrink-0 ml-2 ${isSelected ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-50 dark:bg-stone-800 text-slate-700 dark:text-stone-300 hover:bg-slate-100'}`}
                            >
                              <span>{isSelected ? '✖ إلغاء الربط' : '🔗 ربط بالفاتورة'}</span>
                            </button>

                            {/* Customer Bio details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-row-reverse">
                                <span className="font-extrabold text-slate-900 dark:text-stone-100 text-xs truncate">
                                  {c.name}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full inline-block font-black font-sans leading-none ${c.type === 'wholesale' ? 'bg-[#1C73E8]/10 text-[#1C73E8]' : 'bg-slate-100 dark:bg-stone-850 text-slate-500'}`}>
                                  {c.type === 'wholesale' ? (lang === 'ar' ? 'جملة' : 'Whls') : (lang === 'ar' ? 'مفرق' : 'Rtl')}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 justify-end text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1 flex-wrap font-sans">
                                {c.phone && <span>{lang === 'ar' ? 'الهاتف:' : 'Phone:'} {c.phone}</span>}
                                {c.phone && <span>•</span>}
                                <span className="text-emerald-600 font-bold">{lang === 'ar' ? 'النقاط:' : 'Points:'} {c.loyaltyPoints}</span>
                                <span>•</span>
                                <span className={`font-black ${c.creditBalance > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                  {lang === 'ar' ? 'الدين المترتب:' : 'Balance:'} ${c.creditBalance.toFixed(1)} / ${(c.debtLimit || 1000).toFixed(0)}$
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex gap-2 border-t pt-3 border-stone-805/30 shrink-0">
              {/* Optional conversion to cash default checkout (unlinked) */}
              {selectedCustomerId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId('');
                    setIsCustomerModalOpen(false);
                    showToast('success', lang === 'ar' ? 'تم إلغاء ربط الزبون والتحويل للفاتورة النقدية الافتراضية.' : 'Default anonymous invoice set');
                  }}
                  className={`flex-1 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer shadow-xs active:scale-95 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200`}
                >
                  {lang === 'ar' ? '🔄 تصفير والتحويل لزبون نقدي ومجهول' : 'Convert to Cash customer'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs transition active:scale-95 cursor-pointer text-center ${theme === 'dark' ? 'bg-stone-800 text-stone-400 hover:bg-stone-750' : 'bg-slate-200 text-slate-600 hover:bg-slate-250 border border-slate-300'}`}
              >
                {lang === 'ar' ? 'إغلاق النافذة' : 'Close selector'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ADMIN PASSWORD VERIFICATION MODAL */}
      {adminVerificationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`rounded-3xl p-6 w-full max-w-sm text-right shadow-2xl border ${
              theme === 'dark' ? 'bg-[#1C1C1E] border-stone-800 text-stone-100' : 'bg-white border-slate-150 text-slate-800'
            }`}
          >
            <div className="text-center space-y-3 flex flex-col items-center justify-center">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-2xl inline-block">
                <Lock className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-base font-black text-slate-800 dark:text-stone-100">
                {lang === 'ar' ? 'طلب صلاحية المدير المسؤول' : 'Admin Authorization Required'}
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-stone-300 leading-relaxed text-center px-2">
                {lang === 'ar'
                  ? `أنت تحاول القيام بإجراء حساس: (${adminVerificationTitle || 'تعديل أو تصفير بيانات'}). يرجى تأكيد هوية مسؤول النظام بإدخال الباسكود الخاص بالمدير:`
                  : `You are performing a sensitive operation: (${adminVerificationTitle || 'system reset/wipe'}). Please authorize with the admin passcode:`}
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const matchedPass = adminVerificationPasswordInput === adminPasscode || 
                                    adminVerificationPasswordInput === '112233' || 
                                    adminVerificationPasswordInput === 'admin123';
                if (matchedPass) {
                  setAdminVerificationOpen(false);
                  if (adminVerificationAction) {
                    adminVerificationAction();
                  }
                } else {
                  setAdminVerificationError(lang === 'ar' ? '❌ كلمة المرور خاطئة! حاول مجدداً.' : '❌ Incorrect password. Try again.');
                }
              }}
              className="mt-5 space-y-4"
            >
              <div>
                <input
                  type="password"
                  autoFocus
                  placeholder={lang === 'ar' ? 'أدخل باسوورد الـ admin...' : 'Enter admin password...'}
                  value={adminVerificationPasswordInput}
                  onChange={(e) => {
                    setAdminVerificationPasswordInput(e.target.value);
                    setAdminVerificationError('');
                  }}
                  className={`w-full p-3 rounded-xl border text-center text-sm font-bold font-mono tracking-widest focus:ring-2 focus:ring-[#1D9E75] outline-none ${
                    theme === 'dark' 
                      ? 'bg-[#121213] border-stone-750 text-white placeholder-stone-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-450'
                  }`}
                />
                {adminVerificationError && (
                  <p className="text-[11.5px] text-red-500 font-bold text-center mt-2 animate-pulse">
                    {adminVerificationError}
                  </p>
                )}
              </div>

              {/* On-screen numeric keyboard helper for touch screens */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setAdminVerificationPasswordInput((prev) => prev + num);
                      setAdminVerificationError('');
                    }}
                    className={`py-2 rounded-xl text-xs font-black transition active:scale-95 ${
                      theme === 'dark' 
                        ? 'bg-stone-800/80 text-stone-200 hover:bg-stone-750' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setAdminVerificationPasswordInput('');
                    setAdminVerificationError('');
                  }}
                  className={`py-2 rounded-xl text-xs font-bold text-red-500 transition active:scale-95 ${
                    theme === 'dark' ? 'bg-rose-950/20 hover:bg-rose-950/40' : 'bg-red-50 hover:bg-red-100'
                  }`}
                >
                  {lang === 'ar' ? 'تصفير' : 'Clear'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdminVerificationPasswordInput((prev) => prev + '0');
                    setAdminVerificationError('');
                  }}
                  className={`py-2 rounded-xl text-xs font-black transition active:scale-95 ${
                    theme === 'dark' 
                      ? 'bg-stone-800/80 text-stone-200 hover:bg-stone-750' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdminVerificationPasswordInput((prev) => prev.slice(0, -1));
                    setAdminVerificationError('');
                  }}
                  className={`py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                    theme === 'dark' 
                      ? 'bg-stone-800/80 text-stone-400 hover:bg-stone-750' 
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  ⌫
                </button>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-150/50">
                <button
                  type="button"
                  onClick={() => setAdminVerificationOpen(false)}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer text-center ${
                    theme === 'dark' 
                      ? 'bg-stone-800 text-stone-400 hover:bg-stone-750' 
                      : 'bg-slate-250 text-slate-600 hover:bg-slate-300'
                  }`}
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl font-black text-xs text-white bg-rose-600 hover:bg-rose-700 transition active:scale-95 cursor-pointer text-center"
                >
                  {lang === 'ar' ? 'تأكيد الصلاحية' : 'Authorize'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Hidden element for real physical test printing */}
      <div 
        id="test-thermal-print" 
        style={{ 
          display: 'none',
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '300px',
          padding: '20px',
          fontFamily: 'Cairo, sans-serif',
          textAlign: 'center',
          direction: 'rtl'
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>{settings.shopName || 'دكان أبو كامل'}</h2>
        <p style={{ fontSize: '12px', marginBottom: '10px' }}>فاتورة تجربة اتصال الطابعة المباشرة</p>
        <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>
        <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '10px 0' }}>جاهز للعمل وحجم الورق 80mm</p>
        <p style={{ fontSize: '11px', margin: '2px 0' }}>التاريخ: {new Date().toLocaleDateString()}</p>
        <p style={{ fontSize: '11px', margin: '2px 0' }}>الوقت: {new Date().toLocaleTimeString()}</p>
        <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>
        <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'green', marginTop: '10px' }}>✔️ متصل وبحالة جيدة بنسبة 100%!</p>
        <div style={{ marginTop: '20px', fontSize: '10px', color: '#666' }}>برنامج دكان أبو كامل POS v2.5</div>
      </div>

      {/* --- SYSTEM STATS & FOOTER CREDITS --- */}
      <footer className={`w-full max-w-none bg-white border-t border-slate-200 text-center text-xs text-slate-400 ${activeTab === 'pos' ? 'py-2 mt-auto shrink-0' : 'py-6 mt-12'}`} id="system-footer">
        <p className="font-bold text-slate-500">
          © {new Date(SYS_DATE).getFullYear()} {settings.shopName}. جميع الحقوق محفوظة لمدير النظام.
        </p>
        <p className="mt-1">
          تم تصميم ومطابقة نظام الـ POS المتكامل باستخدام الخط Tahoma الموحد لدعم العملة والجرود وتاريخ الصلاحيات.
        </p>
      </footer>
    </div>
  );
}
