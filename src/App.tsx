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
import { Product, Category, Invoice, User as UserType, SystemSettings, PrinterConfig, CartItem, StockCountItem, ReturnRecord, WasteRecord, Promotion, Customer, ExpenseRecord, PurchaseItem, PurchaseInvoice, Supplier, CartSession } from './types';
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, DEFAULT_USERS, getSeededProducts, getSeededInvoices, DEFAULT_CUSTOMERS, DEFAULT_SUPPLIERS, DEFAULT_PROMOTIONS, DEFAULT_EXPENSES } from './mockData';
import { CustomersTab } from './features/customers/CustomersTab';
import { ReturnsWasteTab } from './features/returns-waste/ReturnsWasteTab';
import { UsersTab } from './features/users/UsersTab';
import { StockCountTab } from './features/stock-count/StockCountTab';
import { InvoicesLogTab } from './features/invoices/InvoicesLogTab';
import { PriceLabelsTab } from './features/price-labels/PriceLabelsTab';
import { InventoryTab } from './features/inventory/InventoryTab';
import { ReportsTab } from './features/reports/ReportsTab';
import { SettingsTab } from './features/settings/SettingsTab';
import { usePosRegister } from './features/pos/usePosRegister';
import { PosModernScreen } from './features/pos/PosModernScreen';
import { PosTerminalScreen } from './features/pos/PosTerminalScreen';
import { AppHeader } from './components/AppHeader';
import { Sidebar } from './components/Sidebar';
import { AdminOnlyNotice } from './components/AdminOnlyNotice';
import { getGridColsStyle, getCardStyle } from './features/pos/posGrid';
import { VirtualKeyboard } from './components/VirtualKeyboard';
import { LoginScreen } from './screens/LoginScreen';
import { LockScreen } from './screens/LockScreen';
import { PrintReportModal } from './modals/PrintReportModal';
import { BarcodeLabelModal } from './modals/BarcodeLabelModal';
import { SetupWizardModal } from './modals/SetupWizardModal';
import { ImportExcelModal } from './modals/ImportExcelModal';
import { InvoiceReceiptModal } from './modals/InvoiceReceiptModal';
import { ExpiryWarningModal } from './modals/ExpiryWarningModal';
import { AddCategoryModal } from './modals/AddCategoryModal';
import { QuickAddCustomerModal } from './modals/QuickAddCustomerModal';
import { PurchaseContactModal } from './modals/PurchaseContactModal';
import { ScaleSimulatorModal } from './modals/ScaleSimulatorModal';
import { NumpadModal } from './modals/NumpadModal';
import { TouchPaymentModal } from './modals/TouchPaymentModal';
import { DiscountModal } from './modals/DiscountModal';
import { CustomerPickerModal } from './modals/CustomerPickerModal';
import { AdminVerificationModal } from './modals/AdminVerificationModal';
import { PromotionsTab, PromotionChange } from './features/promotions/PromotionsTab';
import * as storage from './lib/storage';
import { useToday, toISODate, addDays } from './lib/date';
import { generateBarcodePattern } from './lib/barcode';
import { printElementViaIFrame, playReceiptPrintSound } from './lib/print';
import { LockScreenClock } from './components/LockScreenClock';
import { usePrinterHardware } from './hooks/usePrinterHardware';
import { PurchasesTab } from './features/purchases/PurchasesTab';
import { WarehouseTab } from './features/warehouse/WarehouseTab';
import { FirebaseSyncTab } from './features/firebase-sync/FirebaseSyncTab';
import { db, auth } from './firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { handleMathBlur, handleMathKeyDown } from './mathEvaluator';

// System operational date base



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
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [loginUsername, setLoginUsername] = useState<string>('admin');
  const [loginPassword, setLoginPassword] = useState<string>('admin123');
  const [loginError, setLoginError] = useState<string>('');
  
  // --- POS CART STATES ---

  // --- TOUCH KEYPAD & FINANCIAL DISCOUNT STATES ---
  

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



  // Sync sessions list to localStorage on change

  // Sync activeSessionId to localStorage on change

  // Synchronize dynamic active fields of currently active cart inputs to the active session item

  // Operations to manage multi-client carts




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
  const [terminalProductPage, setTerminalProductPage] = useState<number>(0);
  const [terminalItemsPerPage, setTerminalItemsPerPage] = useState<number>(() => {
    return parseInt(localStorage.getItem('terminal_items_per_page') || '12');
  });

  useEffect(() => {
    localStorage.setItem('terminal_items_per_page', String(terminalItemsPerPage));
  }, [terminalItemsPerPage]);
  
  // Modals & alerts state
  const [showInvoiceReceipt, setShowInvoiceReceipt] = useState<Invoice | null>(null);
  const [barcodeLabelProduct, setBarcodeLabelProduct] = useState<Product | null>(null);
  const [barcodeLabelCopies, setBarcodeLabelCopies] = useState<number>(1);
  const [printReportType, setPrintReportType] = useState<'dashboard' | 'pl' | 'expenses' | 'stock_audit' | 'expiry_report' | 'returns_report' | 'waste_report' | 'reorder_report' | null>(null);
  const [expiryWarningModal, setExpiryWarningModal] = useState<Product | null>(null);
  const [generalAlert, setGeneralAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
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
  
  // --- QUICK REGISTER CUSTOMER STATES ---
  const [showQuickAddCustomerModal, setShowQuickAddCustomerModal] = useState<boolean>(false);
  const [quickAddCustomerName, setQuickAddCustomerName] = useState<string>('');
  const [quickAddCustomerPhone, setQuickAddCustomerPhone] = useState<string>('');
  const [quickAddCustomerType, setQuickAddCustomerType] = useState<'retail' | 'wholesale'>('retail');
  const [quickAddCustomerDebtLimit, setQuickAddCustomerDebtLimit] = useState<string>('1000');


  // --- SEAMLESS CUSTOMER SEARCH & SELECT ---
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

  // Direct POS hardware (raw USB / serial receipt printing, cash drawer)
  const printerHardware = usePrinterHardware({ settings, customers, lang, showToast });
  const {
    hardwarePrinterType,
    setHardwarePrinterType,
    usbDeviceName,
    serialPortInfo,
    baudRate,
    setBaudRate,
    connectUSBPrinter,
    connectSerialPrinter,
    openCashDrawer,
    printInvoiceToRawHardware,
  } = printerHardware;

  const posRegister = usePosRegister({ SYS_DATE, syncWriteToCloud, lang, products, setProducts, settings, invoices, setInvoices, customers, setCustomers, promotions, activeTab, currentUser, setIsCustomerModalOpen, setModalCustomerSearch, setIsAddingNewCustomerInModal, setNewCustName, setNewCustPhone, setNewCustType, setNewCustLimit, posLayoutMode, setShowInvoiceReceipt, setExpiryWarningModal, isActivated, setShowPurchaseContactModal, setSelectedScaleProduct, setSimulatedWeight, setIsScaleSimulatorOpen, processedProducts, showToast, hardwarePrinterType, openCashDrawer });
  const {
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
  } = posRegister;

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

  // --- ADD TO CART UTILITY ---

  // --- PRODUCT CLICK HANDLER FOR SCALE INTERCEPTION ---





  // Scroll cart list automatically whenever an item is added, changed, or session switches

  // --- CALCULATE CART MATHS ---



  // Change calculations (dual currency)

  // --- SAVE BILL & CHECKOUT (F1) ---


  // Physical keyboard listener for virtual numpads (Touch payment & touch numpad modals)

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


  const renderVirtualKeyboard = () => {
    return (
      <VirtualKeyboard
        setBarcodeInput={setBarcodeInput}
        setSearchQuery={setSearchQuery}
        isBarcodeKeyboardOpen={isBarcodeKeyboardOpen}
        setIsBarcodeKeyboardOpen={setIsBarcodeKeyboardOpen}
        keyboardTarget={keyboardTarget}
        theme={theme}
        setTerminalProductPage={setTerminalProductPage}
        handleBarcodeSubmit={handleBarcodeSubmit}
      />
    );
  };

  // Render role lockout screens for cashiers
  // PRESTIGIOUS INTEGRATED SALES LOCK SCREEN
  const renderLockScreen = () => {
    return (
      <LockScreen
        SYS_DATE={SYS_DATE}
        lang={lang}
        invoices={invoices}
        currentUser={currentUser}
        setIsScreenLocked={setIsScreenLocked}
        lockPasscode={lockPasscode}
        setLockPasscode={setLockPasscode}
        lockError={lockError}
        setLockError={setLockError}
        isLockShaking={isLockShaking}
        handleUnlock={handleUnlock}
        handleLogout={handleLogout}
      />
    );
  };

  // IF SCREEN IS LOCKED (AND USER IS CURRENTLY LOGGED IN), SHOW LOCK SCREEN
  if (currentUser && isScreenLocked) {
    return renderLockScreen();
  }

  // IF NOT LOGGED IN, SHOW BEAUTIFUL LOGIN SCREEN
  if (!currentUser) {
    return (
      <LoginScreen
        SYS_DATE={SYS_DATE}
        lang={lang}
        handleToggleLang={handleToggleLang}
        loginUsername={loginUsername}
        setLoginUsername={setLoginUsername}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        loginError={loginError}
        handleLogin={handleLogin}
      />
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
        <SetupWizardModal
          lang={lang}
          adminPasscode={adminPasscode}
          cashierPasscode={cashierPasscode}
          adminRealName={adminRealName}
          cashierRealName={cashierRealName}
          saveWizardData={saveWizardData}
          showToast={showToast}
        />
      )}

      {/* --- TOP BRAND HEADER BAR --- */}
      <AppHeader
        SYS_DATE={SYS_DATE}
        lang={lang}
        handleToggleLang={handleToggleLang}
        toggleFullScreen={toggleFullScreen}
        settings={settings}
        invoices={invoices}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        theme={theme}
        setTheme={setTheme}
        posLayoutMode={posLayoutMode}
        setPosLayoutMode={setPosLayoutMode}
        globalFontScale={globalFontScale}
        setGlobalFontScale={setGlobalFontScale}
        globalButtonScale={globalButtonScale}
        setGlobalButtonScale={setGlobalButtonScale}
        globalZoomScale={globalZoomScale}
        setGlobalZoomScale={setGlobalZoomScale}
        setIsScreenLocked={setIsScreenLocked}
        setLockPasscode={setLockPasscode}
        setLockError={setLockError}
        isActivated={isActivated}
        setShowPurchaseContactModal={setShowPurchaseContactModal}
        handleLogout={handleLogout}
        showToast={showToast}
        daysLeft={daysLeft}
      />

      {/* --- PRIMARY LAYOUT (SIDEBAR RIGHT / CONTENT LEFT) --- */}
      <div className={`flex-1 w-full flex flex-col md:flex-row ${
        activeTab === 'pos' && posLayoutMode === 'terminal'
          ? 'px-0 py-0 gap-0 h-full min-h-0 overflow-hidden max-w-none w-full'
          : activeTab === 'pos'
          ? 'px-2 sm:px-4 py-3 gap-3.5 flex-1 h-full min-h-0 overflow-hidden max-w-none w-full'
          : 'px-2 sm:px-4 lg:px-4 py-4 gap-4 max-w-none w-full'
      }`}>
        
        {/* RIGHT SIDEBAR MODULES */}
        <Sidebar
          lang={lang}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          cart={cart}
          posLayoutMode={posLayoutMode}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
        />

        <main className={`flex-1 min-w-0 w-full ${
          activeTab === 'pos'
            ? 'h-full flex flex-col min-h-0 overflow-hidden'
            : 'flex flex-col min-h-0'
        }`} id="main-content-workspace">

          {/* ACTIVE TERMINAL TAB WRAPPER */}
          {activeTab === 'pos' && posLayoutMode === 'terminal' && (
            <PosTerminalScreen
              SYS_DATE={SYS_DATE}
              lang={lang}
              setLang={setLang}
              toggleFullScreen={toggleFullScreen}
              products={products}
              categories={categories}
              settings={settings}
              customers={customers}
              promotions={promotions}
              cart={cart}
              setCart={setCart}
              setBarcodeInput={setBarcodeInput}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              discountInput={discountInput}
              setDiscountInput={setDiscountInput}
              taxRate={taxRate}
              setTaxRate={setTaxRate}
              deliveryUSD={deliveryUSD}
              setDeliveryUSD={setDeliveryUSD}
              setIsNumpadOpen={setIsNumpadOpen}
              setNumpadValue={setNumpadValue}
              setNumpadTitle={setNumpadTitle}
              setNumpadOnSave={setNumpadOnSave}
              paidUSDInput={paidUSDInput}
              paidLBPInput={paidLBPInput}
              posSaleType={posSaleType}
              setPosSaleType={setPosSaleType}
              selectedCustomerId={selectedCustomerId}
              setSelectedCustomerId={setSelectedCustomerId}
              voidedCartItemIds={voidedCartItemIds}
              setVoidedCartItemIds={setVoidedCartItemIds}
              noteInput={noteInput}
              setNoteInput={setNoteInput}
              sessions={sessions}
              activeSessionId={activeSessionId}
              switchSession={switchSession}
              addNewSession={addNewSession}
              theme={theme}
              setTheme={setTheme}
              setPosLayoutMode={setPosLayoutMode}
              terminalProductPage={terminalProductPage}
              setTerminalProductPage={setTerminalProductPage}
              terminalItemsPerPage={terminalItemsPerPage}
              setTerminalItemsPerPage={setTerminalItemsPerPage}
              executeWithAdminAuth={executeWithAdminAuth}
              processedProducts={processedProducts}
              showToast={showToast}
              openCashDrawer={openCashDrawer}
              addToCart={addToCart}
              handleProductClick={handleProductClick}
              clearCart={clearCart}
              triggerCustomerSearch={triggerCustomerSearch}
              getCalculatedDiscountUSD={getCalculatedDiscountUSD}
              handleCheckout={handleCheckout}
              openTouchPayment={openTouchPayment}
            />
          )}

          {activeTab === 'pos' && posLayoutMode === 'modern' && (
            <PosModernScreen
              SYS_DATE={SYS_DATE}
              syncWriteToCloud={syncWriteToCloud}
              lang={lang}
              products={products}
              categories={categories}
              settings={settings}
              customers={customers}
              setCustomers={setCustomers}
              promotions={promotions}
              cart={cart}
              barcodeInput={barcodeInput}
              setBarcodeInput={setBarcodeInput}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              discountInput={discountInput}
              setDiscountInput={setDiscountInput}
              paidUSDInput={paidUSDInput}
              setPaidUSDInput={setPaidUSDInput}
              paidLBPInput={paidLBPInput}
              setPaidLBPInput={setPaidLBPInput}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              posSaleType={posSaleType}
              setPosSaleType={setPosSaleType}
              selectedCustomerId={selectedCustomerId}
              setSelectedCustomerId={setSelectedCustomerId}
              isBarcodeKeyboardOpen={isBarcodeKeyboardOpen}
              setIsBarcodeKeyboardOpen={setIsBarcodeKeyboardOpen}
              keyboardTarget={keyboardTarget}
              setKeyboardTarget={setKeyboardTarget}
              sessions={sessions}
              activeSessionId={activeSessionId}
              editingSessionId={editingSessionId}
              setEditingSessionId={setEditingSessionId}
              editingLabelValue={editingLabelValue}
              setEditingLabelValue={setEditingLabelValue}
              switchSession={switchSession}
              addNewSession={addNewSession}
              deleteSession={deleteSession}
              startRenameSession={startRenameSession}
              saveRenameSession={saveRenameSession}
              setTheme={setTheme}
              setPosLayoutMode={setPosLayoutMode}
              setExpiryWarningModal={setExpiryWarningModal}
              setShowQuickAddCustomerModal={setShowQuickAddCustomerModal}
              setQuickAddCustomerName={setQuickAddCustomerName}
              setQuickAddCustomerPhone={setQuickAddCustomerPhone}
              setQuickAddCustomerType={setQuickAddCustomerType}
              setQuickAddCustomerDebtLimit={setQuickAddCustomerDebtLimit}
              showCustomerDropdown={showCustomerDropdown}
              setShowCustomerDropdown={setShowCustomerDropdown}
              sortedCategoriesBySales={sortedCategoriesBySales}
              processedProducts={processedProducts}
              showToast={showToast}
              hardwarePrinterType={hardwarePrinterType}
              openCashDrawer={openCashDrawer}
              handleBarcodeSubmit={handleBarcodeSubmit}
              addToCart={addToCart}
              handleProductClick={handleProductClick}
              updateCartQuantity={updateCartQuantity}
              removeFromCart={removeFromCart}
              clearCart={clearCart}
              getProductDisplayPrice={getProductDisplayPrice}
              cartSubtotalUSD={cartSubtotalUSD}
              cartTotalUSD={cartTotalUSD}
              cartTotalLBP={cartTotalLBP}
              changeUSD={changeUSD}
              changeLBP={changeLBP}
              handleCheckout={handleCheckout}
              renderVirtualKeyboard={renderVirtualKeyboard}
            />
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
            (currentUser.role !== 'admin' && currentUser.role !== 'accountant') ? <AdminOnlyNotice userName={currentUser?.name} /> : (
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
            (currentUser.role !== 'admin' && currentUser.role !== 'accountant') ? <AdminOnlyNotice userName={currentUser?.name} /> : (
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
                <AdminOnlyNotice userName={currentUser?.name} />
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
                <AdminOnlyNotice userName={currentUser?.name} />
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
                <AdminOnlyNotice userName={currentUser?.name} />
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
                <AdminOnlyNotice userName={currentUser?.name} />
              ) : (
                <SettingsTab
                  settings={settings}
                  setSettings={setSettings}
                  invoices={invoices}
                  lang={lang}
                  showToast={showToast}
                  onSaveSettings={handleUpdateGeneralSettings}
                  onRecalculatePrices={handleRecalculatePricesWithMargin}
                  displayScale={{ globalFontScale, setGlobalFontScale, globalButtonScale, setGlobalButtonScale, globalZoomScale, setGlobalZoomScale }}
                  printerHardware={printerHardware}
                  spooler={{ activePrintJobs, setActivePrintJobs, addPrintJob }}
                  activation={{
                    activationKey,
                    setActivationKey,
                    isActivated,
                    subscriptionDaysRemaining,
                    activationErrorMsg,
                    setActivationErrorMsg,
                    applyActivation: handleApplyActivation,
                    openSetupWizard: () => setShowSetupWizard(true),
                  }}
                  contactForm={{
                    contactName, setContactName,
                    contactPhone, setContactPhone,
                    contactEmail, setContactEmail,
                    contactShop, setContactShop,
                    contactMessage, setContactMessage,
                  }}
                  dataWipe={{
                    onWipeSales: handleWipeSalesInvoicesOnly,
                    onWipeProducts: handleWipeProductsAndCategoriesOnly,
                    onWipeAll: handleWipeEntireSystemData,
                  }}
                />
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
                <AdminOnlyNotice userName={currentUser?.name} />
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
            <ImportExcelModal
              lang={lang}
              setShowImportExcelModal={setShowImportExcelModal}
              importStatus={importStatus}
              setImportStatus={setImportStatus}
              importError={importError}
              parsedProducts={parsedProducts}
              setParsedProducts={setParsedProducts}
              updateExistingOnMatch={updateExistingOnMatch}
              setUpdateExistingOnMatch={setUpdateExistingOnMatch}
              downloadExcelTemplate={downloadExcelTemplate}
              handleExcelImport={handleExcelImport}
              confirmExcelImport={confirmExcelImport}
            />
          )}

          {/* ==========================================
              MODAL: DETAILED INVOICE RECEIPT PREVIEW (thermal + digital)
              ========================================== */}
          {showInvoiceReceipt && (
        <InvoiceReceiptModal
          lang={lang}
          settings={settings}
          setSettings={setSettings}
          customers={customers}
          showInvoiceReceipt={showInvoiceReceipt}
          setShowInvoiceReceipt={setShowInvoiceReceipt}
          showToast={showToast}
          openCashDrawer={openCashDrawer}
          printInvoiceToRawHardware={printInvoiceToRawHardware}
          handleCancelWholeInvoice={handleCancelWholeInvoice}
          handleReturnSingleItem={handleReturnSingleItem}
        />
      )}

      {/* --- MODAL FOR BARCODE LABEL PRINTER --- */}
      {barcodeLabelProduct && (
        <BarcodeLabelModal
          products={products}
          setProducts={setProducts}
          settings={settings}
          theme={theme}
          barcodeLabelProduct={barcodeLabelProduct}
          setBarcodeLabelProduct={setBarcodeLabelProduct}
          barcodeLabelCopies={barcodeLabelCopies}
          setBarcodeLabelCopies={setBarcodeLabelCopies}
          showToast={showToast}
        />
      )}

      {/* --- MODAL FOR PRINTING SUB-REPORTS --- */}
      {printReportType && (
        <PrintReportModal
          SYS_DATE={SYS_DATE}
          products={products}
          settings={settings}
          invoices={invoices}
          returns={returns}
          waste={waste}
          expenses={expenses}
          theme={theme}
          printReportType={printReportType}
          setPrintReportType={setPrintReportType}
          stockAuditReportLoc={stockAuditReportLoc}
          totalSalesUSD={totalSalesUSD}
          topSoldProductsList={topSoldProductsList}
        />
      )}

      {expiryWarningModal && (
        <ExpiryWarningModal
          expiryWarningModal={expiryWarningModal}
          setExpiryWarningModal={setExpiryWarningModal}
        />
      )}

      {/* --- MODAL 3: INLINE CATEGORY INSERTION --- */}
      {showAddCategoryModal && (
        <AddCategoryModal
          setShowAddCategoryModal={setShowAddCategoryModal}
          showToast={showToast}
          handleAddNewCategory={handleAddNewCategory}
        />
      )}

      {/* --- MODAL 4: QUICK REGISTER NEW CUSTOMER FROM CART --- */}
      {showQuickAddCustomerModal && (
        <QuickAddCustomerModal
          lang={lang}
          setShowQuickAddCustomerModal={setShowQuickAddCustomerModal}
          quickAddCustomerName={quickAddCustomerName}
          setQuickAddCustomerName={setQuickAddCustomerName}
          quickAddCustomerPhone={quickAddCustomerPhone}
          setQuickAddCustomerPhone={setQuickAddCustomerPhone}
          quickAddCustomerType={quickAddCustomerType}
          setQuickAddCustomerType={setQuickAddCustomerType}
          quickAddCustomerDebtLimit={quickAddCustomerDebtLimit}
          setQuickAddCustomerDebtLimit={setQuickAddCustomerDebtLimit}
          handleQuickAddCustomerSubmit={handleQuickAddCustomerSubmit}
        />
      )}

      {/* --- MODAL 5: PURCHASE & ACTIVATION CONTACT FORM MODAL --- */}
      {showPurchaseContactModal && (
        <PurchaseContactModal
          lang={lang}
          settings={settings}
          setShowPurchaseContactModal={setShowPurchaseContactModal}
          contactName={contactName}
          setContactName={setContactName}
          contactPhone={contactPhone}
          setContactPhone={setContactPhone}
          contactEmail={contactEmail}
          setContactEmail={setContactEmail}
          contactShop={contactShop}
          setContactShop={setContactShop}
          contactMessage={contactMessage}
          setContactMessage={setContactMessage}
        />
      )}

      {/* --- ELECTRONIC SCALE SIMULATOR MODAL --- */}
      {isScaleSimulatorOpen && selectedScaleProduct && (
        <ScaleSimulatorModal
          lang={lang}
          setBarcodeInput={setBarcodeInput}
          theme={theme}
          selectedScaleProduct={selectedScaleProduct}
          simulatedWeight={simulatedWeight}
          setSimulatedWeight={setSimulatedWeight}
          setIsScaleSimulatorOpen={setIsScaleSimulatorOpen}
          showToast={showToast}
          addToCart={addToCart}
        />
      )}

      {/* --- TOUCH NUMPAD MODAL --- */}
      {isNumpadOpen && (
        <NumpadModal
          lang={lang}
          setIsNumpadOpen={setIsNumpadOpen}
          numpadValue={numpadValue}
          setNumpadValue={setNumpadValue}
          numpadTitle={numpadTitle}
          numpadOnSave={numpadOnSave}
          theme={theme}
        />
      )}

      {/* --- TOUCH SCREEN CASH SETTLEMENT & CHANGE CALCULATOR MODAL --- */}
      {isTouchPaymentModalOpen && (
        <TouchPaymentModal
          lang={lang}
          settings={settings}
          customers={customers}
          discountInput={discountInput}
          setDiscountInput={setDiscountInput}
          paidUSDInput={paidUSDInput}
          setPaidUSDInput={setPaidUSDInput}
          paidLBPInput={paidLBPInput}
          setPaidLBPInput={setPaidLBPInput}
          setIsTouchPaymentModalOpen={setIsTouchPaymentModalOpen}
          touchPaymentActiveField={touchPaymentActiveField}
          setTouchPaymentActiveField={setTouchPaymentActiveField}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          selectedCustomerId={selectedCustomerId}
          theme={theme}
          showToast={showToast}
          hardwarePrinterType={hardwarePrinterType}
          openCashDrawer={openCashDrawer}
          triggerCustomerSearch={triggerCustomerSearch}
          cartSubtotalUSD={cartSubtotalUSD}
          cartTotalUSD={cartTotalUSD}
          cartTotalLBP={cartTotalLBP}
          changeUSD={changeUSD}
          changeLBP={changeLBP}
          handleCheckout={handleCheckout}
        />
      )}

      {/* --- FINANCIAL DISCOUNT DIALOG MODAL --- */}
      {isDiscountModalOpen && (
        <DiscountModal
          lang={lang}
          settings={settings}
          cart={cart}
          setDiscountInput={setDiscountInput}
          setIsDiscountModalOpen={setIsDiscountModalOpen}
          posSaleType={posSaleType}
          voidedCartItemIds={voidedCartItemIds}
          theme={theme}
          showToast={showToast}
          getCalculatedDiscountUSD={getCalculatedDiscountUSD}
        />
      )}

      {/* --- INTERACTIVE CUSTOMER SELECT & QUICK CREATE MODAL --- */}
      {isCustomerModalOpen && (
        <CustomerPickerModal
          syncWriteToCloud={syncWriteToCloud}
          lang={lang}
          customers={customers}
          setCustomers={setCustomers}
          selectedCustomerId={selectedCustomerId}
          setSelectedCustomerId={setSelectedCustomerId}
          setIsCustomerModalOpen={setIsCustomerModalOpen}
          modalCustomerSearch={modalCustomerSearch}
          setModalCustomerSearch={setModalCustomerSearch}
          isAddingNewCustomerInModal={isAddingNewCustomerInModal}
          setIsAddingNewCustomerInModal={setIsAddingNewCustomerInModal}
          newCustName={newCustName}
          setNewCustName={setNewCustName}
          newCustPhone={newCustPhone}
          setNewCustPhone={setNewCustPhone}
          newCustType={newCustType}
          setNewCustType={setNewCustType}
          newCustLimit={newCustLimit}
          setNewCustLimit={setNewCustLimit}
          theme={theme}
          showToast={showToast}
        />
      )}

      {/* ADMIN PASSWORD VERIFICATION MODAL */}
      {adminVerificationOpen && (
        <AdminVerificationModal
          lang={lang}
          theme={theme}
          adminPasscode={adminPasscode}
          adminVerificationAction={adminVerificationAction}
          setAdminVerificationOpen={setAdminVerificationOpen}
          adminVerificationPasswordInput={adminVerificationPasswordInput}
          setAdminVerificationPasswordInput={setAdminVerificationPasswordInput}
          adminVerificationError={adminVerificationError}
          setAdminVerificationError={setAdminVerificationError}
          adminVerificationTitle={adminVerificationTitle}
        />
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
