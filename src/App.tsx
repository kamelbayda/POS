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
import { SuppliersTab } from './features/suppliers/SuppliersTab';
import { ReturnsWasteTab } from './features/returns-waste/ReturnsWasteTab';
import { UsersTab } from './features/users/UsersTab';
import { StockCountTab } from './features/stock-count/StockCountTab';
import { InvoicesLogTab } from './features/invoices/InvoicesLogTab';
import { PriceLabelsTab } from './features/price-labels/PriceLabelsTab';
import { ShelfTagsTab } from './features/shelf-tags/ShelfTagsTab';
import { InventoryTab } from './features/inventory/InventoryTab';
import { ReportsTab } from './features/reports/ReportsTab';
import { SettingsTab } from './features/settings/SettingsTab';
import { useStoreActions } from './hooks/useStoreActions';
import { useUiPreferences } from './hooks/useUiPreferences';
import { useDataMaintenance } from './hooks/useDataMaintenance';
import { useInvoiceActions } from './features/invoices/useInvoiceActions';
import { useAccounts } from './hooks/useAccounts';
import { useStoreData } from './hooks/useStoreData';
import { usePrintSpooler } from './hooks/usePrintSpooler';
import { useExcelImport } from './features/inventory/useExcelImport';
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
import { useLicense } from './hooks/useLicense';
import { hashPassword, verifyPassword, needsRehash } from './lib/password';
import { PurchasesTab } from './features/purchases/PurchasesTab';
import { WarehouseTab } from './features/warehouse/WarehouseTab';
import { FirebaseSyncTab } from './features/firebase-sync/FirebaseSyncTab';
import { ForgotPasswordModal } from './modals/ForgotPasswordModal';
import { CloudBackupBanner } from './components/CloudBackupBanner';
import { useCloudSync } from './hooks/useCloudSync';
import { CloudAlignModal } from './components/CloudAlignModal';
import { CloudJoinModal } from './components/CloudJoinModal';
import { BeeCashWordmark } from './components/BeeCashLogo';
import { handleMathBlur, handleMathKeyDown } from './mathEvaluator';

/** localStorage key of the signed-in account and open page, kept across a refresh. */
const SESSION_KEY = 'pos_session';

// System operational date base

export default function App() {
  // Today's date (YYYY-MM-DD, local time); rolls over at midnight
  const SYS_DATE = useToday();

  // Cloud writes are done by useCloudSync, which mirrors every list as it changes (and sends
  // stock and balances as increments). Feature hooks still call this; it is intentionally a no-op.
  const syncWriteToCloud = async (_collectionName: string, _docId: string, _data: any, _isDelete: boolean = false) => {};

  // --- BILINGUAL & MULTI-PLATFORM DEVICE STATES ---
  const [lang, setLang] = useState<'ar' | 'en'>(() => {
    return (storage.getItem('pos_language') as 'ar' | 'en') || 'ar';
  });

  const handleToggleLang = () => {
    const nextLang = lang === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    storage.setItem('pos_language', nextLang);
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

  const storeData = useStoreData({ SYS_DATE });
  const {
    loaded: storeLoaded,
    products,
    setProducts,
    categories,
    setCategories,
    settings,
    setSettings,
    users,
    setUsers,
    invoices,
    setInvoices,
    customers,
    setCustomers,
    suppliers,
    setSuppliers,
    returns,
    setReturns,
    waste,
    setWaste,
    promotions,
    setPromotions,
    expenses,
    setExpenses,
    purchaseInvoices,
    setPurchaseInvoices,
  } = storeData;
  
  

  
  // App navigation & session state
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  

  

  // --- ON-SCREEN KEYBOARD ---
  const [isBarcodeKeyboardOpen, setIsBarcodeKeyboardOpen] = useState<boolean>(false);
  const [keyboardTarget, setKeyboardTarget] = useState<'barcode' | 'search'>('barcode');

  // --- INTERACTIVE CUSTOMER SELECT & REGISTER MODAL STATES ---
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [modalCustomerSearch, setModalCustomerSearch] = useState<string>('');
  const [isAddingNewCustomerInModal, setIsAddingNewCustomerInModal] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustType, setNewCustType] = useState<'retail' | 'wholesale'>('retail');
  const [newCustLimit, setNewCustLimit] = useState<number>(1000);

  // Operations to manage multi-client carts

  const uiPreferences = useUiPreferences();
  const {
    theme,
    setTheme,
    posLayoutMode,
    setPosLayoutMode,
    globalFontScale,
    setGlobalFontScale,
    globalButtonScale,
    setGlobalButtonScale,
    globalZoomScale,
    setGlobalZoomScale,
    sidebarCollapsed,
    setSidebarCollapsed,
    terminalProductPage,
    setTerminalProductPage,
    terminalItemsPerPage,
    setTerminalItemsPerPage,
  } = uiPreferences;
  

  
  // Modals & alerts state
  const [showInvoiceReceipt, setShowInvoiceReceipt] = useState<Invoice | null>(null);
  const [barcodeLabelProduct, setBarcodeLabelProduct] = useState<Product | null>(null);
  const [barcodeLabelCopies, setBarcodeLabelCopies] = useState<number>(1);
  const [printReportType, setPrintReportType] = useState<'dashboard' | 'pl' | 'expenses' | 'stock_audit' | 'expiry_report' | 'returns_report' | 'waste_report' | 'reorder_report' | null>(null);
  const [expiryWarningModal, setExpiryWarningModal] = useState<Product | null>(null);
  const [generalAlert, setGeneralAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // --- ACCOUNT PASSWORDS ---
  // admin / kaseer keep their password in dedicated keys (set by the setup wizard); other accounts on the user record

  /** Checks a password and upgrades a legacy plaintext one to a hash on success. */

  // Warehouse & Shop separate stock counts and reports states
  const [stockAuditReportLoc, setStockAuditReportLoc] = useState<'shop' | 'warehouse' | 'combined'>('shop');

  
  // Days without a sale after which a product counts as stagnant (inventory & reports)
  const [stagnantDaysThreshold, setStagnantDaysThreshold] = useState<number>(30);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState<boolean>(false);
  
  // --- QUICK REGISTER CUSTOMER STATES ---

  // --- SEAMLESS CUSTOMER SEARCH & SELECT ---
  const [showPurchaseContactModal, setShowPurchaseContactModal] = useState<boolean>(false);
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
  const [showCloudJoin, setShowCloudJoin] = useState<boolean>(false);

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
  })
    // Products in stock first, sold-out ones after (stable: keeps the order within each group)
    .sort((a, b) => Number(a.quantity <= 0) - Number(b.quantity <= 0));

  // Toast auto dismiss
  useEffect(() => {
    if (generalAlert) {
      const tm = setTimeout(() => setGeneralAlert(null), 4000);
      return () => clearTimeout(tm);
    }
  }, [generalAlert]);

  // --- LOGIN HANDLER ---

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

  // A device must always have accounts to sign in with (an empty list once came from an
  // older cloud download); fall back to the defaults
  useEffect(() => {
    if (storeLoaded && users.length === 0) {
      setUsers(DEFAULT_USERS);
      storage.setJSON('pos_users', DEFAULT_USERS);
    }
  }, [storeLoaded, users.length]);

  // Keep the signed-in account and open page across a page refresh; only "logout" ends
  // the session. The account is looked up again so a deleted user cannot come back.
  const sessionRestored = useRef(false);
  useEffect(() => {
    if (!storeLoaded || sessionRestored.current) return;
    sessionRestored.current = true;
    const saved = storage.getJSON<{ userId?: string; tab?: string } | null>(SESSION_KEY, null);
    const user = saved?.userId ? users.find(u => u.id === saved.userId) : undefined;
    if (user) {
      setCurrentUser(user);
      if (saved?.tab) setActiveTab(saved.tab);
    }
  }, [storeLoaded, users]);
  useEffect(() => {
    if (!sessionRestored.current) return;
    if (currentUser) storage.setJSON(SESSION_KEY, { userId: currentUser.id, tab: activeTab });
    else storage.removeItem(SESSION_KEY);
  }, [currentUser, activeTab]);

  // Live sync between every device signed in to the same cloud shop
  const cloudSync = useCloudSync({
    loaded: storeLoaded,
    SYS_DATE,
    lang,
    lists: {
      products: { items: products, set: setProducts },
      categories: { items: categories, set: setCategories },
      customers: { items: customers, set: setCustomers },
      suppliers: { items: suppliers, set: setSuppliers },
      promotions: { items: promotions, set: setPromotions },
      users: { items: users, set: setUsers },
      invoices: { items: invoices, set: setInvoices },
      returns: { items: returns, set: setReturns },
      waste: { items: waste, set: setWaste },
      expenses: { items: expenses, set: setExpenses },
      purchaseInvoices: { items: purchaseInvoices, set: setPurchaseInvoices },
    },
    settings,
    setSettings,
    showToast,
  });

  const accounts = useAccounts({ lang, users, setUsers, currentUser, setCurrentUser, loginUsername, loginPassword, setLoginError, showToast });
  const {
    isScreenLocked,
    setIsScreenLocked,
    lockPasscode,
    setLockPasscode,
    lockError,
    setLockError,
    isLockShaking,
    adminPasscode,
    adminRealName,
    setAdminRealName,
    cashierRealName,
    setCashierRealName,
    showSetupWizard,
    setShowSetupWizard,
    adminVerificationAction,
    adminVerificationOpen,
    setAdminVerificationOpen,
    adminVerificationPasswordInput,
    setAdminVerificationPasswordInput,
    adminVerificationError,
    setAdminVerificationError,
    adminVerificationTitle,
    executeWithAdminAuth,
    saveWizardData,
    setAccountPassword,
    handleUnlock,
    handleLogin,
  } = accounts;

  const printSpooler = usePrintSpooler({ lang, settings, setShowInvoiceReceipt, showToast });
  const {
    activePrintJobs,
    setActivePrintJobs,
    addPrintJob,
  } = printSpooler;

  const excelImport = useExcelImport({ SYS_DATE, syncWriteToCloud, lang, products, setProducts, categories, setCategories, showToast });
  const {
    showImportExcelModal,
    setShowImportExcelModal,
    importStatus,
    setImportStatus,
    importError,
    setImportError,
    parsedProducts,
    setParsedProducts,
    updateExistingOnMatch,
    setUpdateExistingOnMatch,
    downloadExcelTemplate,
    handleExcelImport,
    confirmExcelImport,
  } = excelImport;

  // Direct POS hardware (raw USB / serial receipt printing, cash drawer)
  // Licence (verified offline, refreshed against the licence server when online)
  const licenseState = useLicense({
    shopName: settings.shopName,
    ownerEmail: (users.find(u => u.username === 'admin')?.email || users.find(u => u.role === 'admin' && u.email)?.email || ''),
    lang,
    showToast,
    onActivated: () => {
      if (storage.getItem('pos_setup_wizard_completed') !== 'true') setShowSetupWizard(true);
    },
  });
  const { isActivated } = licenseState;

  const printerHardware = usePrinterHardware({ settings, customers, lang, showToast });
  const {
    hardwarePrinterType,
    openCashDrawer,
    printInvoiceToRawHardware,
  } = printerHardware;

  const posRegister = usePosRegister({ SYS_DATE, syncWriteToCloud, lang, products, setProducts, settings, invoices, setInvoices, customers, setCustomers, promotions, activeTab, currentUser, setIsCustomerModalOpen, setModalCustomerSearch, setIsAddingNewCustomerInModal, setNewCustName, setNewCustPhone, setNewCustType, setNewCustLimit, posLayoutMode, setShowInvoiceReceipt, setExpiryWarningModal, isActivated, setShowPurchaseContactModal, setSelectedScaleProduct, setSimulatedWeight, setIsScaleSimulatorOpen, processedProducts, showToast, hardwarePrinterType, openCashDrawer });
  const {
    cart,
    setCart,
    setBarcodeInput,
    setSearchQuery,
    setDiscountInput,
    isDiscountModalOpen,
    isNumpadOpen,
    setPaidUSDInput,
    setPaidLBPInput,
    isTouchPaymentModalOpen,
    paymentMethod,
    selectedCustomerId,
    setSelectedCustomerId,
    handleBarcodeSubmit,
    addToCart,
  } = posRegister;

  // Physical keyboard listener for virtual numpads (Touch payment & touch numpad modals)

  const storeActions = useStoreActions({ SYS_DATE, syncWriteToCloud, lang, products, setProducts, categories, setCategories, waste, setWaste, promotions, setPromotions, setExpenses, showToast, executeWithAdminAuth });
  const {
    handleAddNewCategory,
    handleProductsChange,
    deleteProduct,
    handleExpensesChange,
    handlePromotionsChange,
    handleAddStagnantPromotion,
    handleQuickWasteFromExpiry,
  } = storeActions;


  // Persist the products list locally and mirror the single changed product to the cloud

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

  const invoiceActions = useInvoiceActions({ SYS_DATE, syncWriteToCloud, lang, products, setProducts, invoices, setInvoices, customers, setCustomers, returns, setReturns, setShowInvoiceReceipt, showToast, executeWithAdminAuth });
  const {
    handleCancelWholeInvoice,
    handleReturnSingleItem,
  } = invoiceActions;

  // Keep the built-in admin / kaseer login credentials in sync when edited from the users tab
  const handleDefaultAccountUpdated = (username: 'admin' | 'kaseer', name: string, newPassword: string | null) => {
    if (username === 'admin') {
      storage.setItem('pos_admin_real_name', name);
      setAdminRealName(name);
      if (newPassword) setAccountPassword('admin', newPassword);
    } else {
      storage.setItem('pos_cashier_real_name', name);
      setCashierRealName(name);
      if (newPassword) setAccountPassword('kaseer', newPassword);
    }
  };

  // --- UPDATE SYSTEM GENERAL SETTINGS ---

  const dataMaintenance = useDataMaintenance({ lang, products, setProducts, settings, setInvoices, setCustomers, setSuppliers, setReturns, setWaste, setPromotions, setExpenses, setPurchaseInvoices, showToast, executeWithAdminAuth });
  const {
    handleUpdateGeneralSettings,
    handleRecalculatePricesWithMargin,
    handleWipeSalesInvoicesOnly,
    handleWipeProductsAndCategoriesOnly,
    handleWipeEntireSystemData,
  } = dataMaintenance;

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
      <>
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
        needsOwnerSetup={!adminPasscode && !accounts.cashierPasscode && !users.some(u => u.password)}
        onCreateOwner={accounts.createOwnerAccount}
        onForgotPassword={() => setShowForgotPassword(true)}
        onJoinCloud={() => setShowCloudJoin(true)}
      />
      {showCloudJoin && (
        <CloudJoinModal lang={lang} onBeforeSignIn={cloudSync.joinByDownload} onClose={() => setShowCloudJoin(false)} />
      )}
      {cloudSync.choicePending && <CloudAlignModal lang={lang} onChoose={cloudSync.resolveChoice} />}
      {showForgotPassword && (
        <ForgotPasswordModal
          lang={lang}
          isLicensed={licenseState.isLicensed}
          verifyOwnerKey={licenseState.verifyOwnerKey}
          users={users}
          resetPassword={(username, plain) => accounts.setAccountPassword(username, plain)}
          linkEmail={(username, email) => setUsers(prev => {
            const updated = prev.map(u => (u.username === username ? { ...u, email } : u));
            storage.setJSON('pos_users', updated);
            return updated;
          })}
          onClose={() => setShowForgotPassword(false)}
          onDone={(email) => {
            setShowForgotPassword(false);
            setLoginUsername(email);
            setLoginPassword('');
            showToast('success', lang === 'ar' ? 'تم تعيين كلمة المرور الجديدة. سجّل الدخول بالإيميل وكلمة المرور الجديدة.' : 'New password set. Sign in with your email and the new password.');
          }}
        />
      )}
      </>
    );
  }

  // MAIN SYSTEM PAGE
  return (
    <div className={`bg-[#F8FAFC] flex flex-col font-sans text-slate-800 w-full max-w-none overflow-x-hidden ${activeTab === 'pos' ? 'h-screen overflow-hidden' : 'min-h-screen md:h-screen md:overflow-hidden'}`} id="main-system" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Global CSS Style tag for dynamic font and button scale */}
      <style>{`
        html {
          /* Display size scales the rem-based layout via the root font size. CSS zoom on <html>
             shrank viewport units too and left an empty strip on the side and bottom. */
          font-size: ${globalFontScale * globalZoomScale * 100}% !important;
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
        setShowPurchaseContactModal={setShowPurchaseContactModal}
        handleLogout={handleLogout}
        showToast={showToast}
        license={licenseState}
      />

      {cloudSync.choicePending && <CloudAlignModal lang={lang} onChoose={cloudSync.resolveChoice} />}

      <CloudBackupBanner
        lang={lang}
        SYS_DATE={SYS_DATE}
        isAdmin={currentUser.role === 'admin'}
        openCloudSync={() => setActiveTab('firebase_sync')}
      />

      {/* --- PRIMARY LAYOUT (SIDEBAR RIGHT / CONTENT LEFT) --- */}
      <div className={`flex-1 w-full flex flex-col md:flex-row ${
        activeTab === 'pos' && posLayoutMode === 'terminal'
          ? 'px-0 py-0 gap-0 h-full min-h-0 overflow-hidden max-w-none w-full'
          : activeTab === 'pos'
          ? 'px-2 sm:px-4 py-3 gap-3.5 flex-1 h-full min-h-0 overflow-hidden max-w-none w-full'
          // Tablets and computers: only the page content scrolls; header and sidebar stay put
          : 'px-2 sm:px-4 lg:px-4 py-4 gap-4 max-w-none w-full md:min-h-0 md:overflow-hidden'
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
            : 'flex flex-col min-h-0 md:h-full md:overflow-y-auto md:pe-1'
        }`} id="main-content-workspace">

          {/* ACTIVE TERMINAL TAB WRAPPER */}
          {activeTab === 'pos' && posLayoutMode === 'terminal' && (
            <PosTerminalScreen
              register={posRegister}
              SYS_DATE={SYS_DATE}
              lang={lang}
              setLang={setLang}
              toggleFullScreen={toggleFullScreen}
              products={products}
              categories={categories}
              settings={settings}
              customers={customers}
              promotions={promotions}
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
              handleLogout={handleLogout}
            />
          )}

          {activeTab === 'pos' && posLayoutMode === 'modern' && (
            <PosModernScreen
              register={posRegister}
              SYS_DATE={SYS_DATE}
              lang={lang}
              products={products}
              categories={categories}
              settings={settings}
              promotions={promotions}
              isBarcodeKeyboardOpen={isBarcodeKeyboardOpen}
              setIsBarcodeKeyboardOpen={setIsBarcodeKeyboardOpen}
              keyboardTarget={keyboardTarget}
              setKeyboardTarget={setKeyboardTarget}
              setTheme={setTheme}
              setPosLayoutMode={setPosLayoutMode}
              setExpiryWarningModal={setExpiryWarningModal}
              sortedCategoriesBySales={sortedCategoriesBySales}
              processedProducts={processedProducts}
              showToast={showToast}
              hardwarePrinterType={hardwarePrinterType}
              openCashDrawer={openCashDrawer}
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
              lang={lang}
              showToast={showToast}
              invoices={invoices}
            />
          )}

          {/* ==========================================
              SUPPLIERS AND ACCOUNTS PAYABLE (🏢)
              ========================================== */}
          {activeTab === 'suppliers' && (
            <SuppliersTab
              suppliers={suppliers}
              setSuppliers={setSuppliers}
              lang={lang}
              showToast={showToast}
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
          {activeTab === 'shelf_tags' && (
            <ShelfTagsTab
              products={products}
              promotions={promotions}
              settings={settings}
              lang={lang}
              sysDate={SYS_DATE}
              showToast={showToast}
            />
          )}

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
                  license={licenseState}
                  openSetupWizard={() => setShowSetupWizard(true)}
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
                  liveSync={cloudSync}
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
          register={posRegister}
          lang={lang}
          theme={theme}
        />
      )}

      {/* --- TOUCH SCREEN CASH SETTLEMENT & CHANGE CALCULATOR MODAL --- */}
      {isTouchPaymentModalOpen && (
        <TouchPaymentModal
          register={posRegister}
          lang={lang}
          settings={settings}
          customers={customers}
          theme={theme}
          showToast={showToast}
          hardwarePrinterType={hardwarePrinterType}
          openCashDrawer={openCashDrawer}
        />
      )}

      {/* --- FINANCIAL DISCOUNT DIALOG MODAL --- */}
      {isDiscountModalOpen && (
        <DiscountModal
          register={posRegister}
          lang={lang}
          settings={settings}
          theme={theme}
          showToast={showToast}
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
          verifyAdminPassword={(input) => verifyPassword(input, adminPasscode)}
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
      <footer className={`w-full max-w-none bg-white border-t border-slate-200 text-center text-xs text-slate-400 ${activeTab === 'pos' ? 'py-2 mt-auto shrink-0' : 'py-6 mt-12 md:py-2 md:mt-0 md:shrink-0'}`} id="system-footer">
        <p className="font-bold text-slate-500">
          © {new Date(SYS_DATE).getFullYear()} {settings.shopName}. جميع الحقوق محفوظة لمدير النظام.
        </p>
        <p className="mt-1">
          🐝 {lang === 'ar' ? 'يعمل بنظام' : 'Powered by'} <BeeCashWordmark /> {lang === 'ar' ? '· نظام الكاشير والمخزون' : '· checkout & inventory'}
        </p>
      </footer>
    </div>
  );
}
