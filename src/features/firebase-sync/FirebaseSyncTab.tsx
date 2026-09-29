import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CloudOff, 
  CloudLightning, 
  RefreshCw, 
  LogIn, 
  LogOut, 
  Database, 
  HelpCircle, 
  CheckCircle, 
  AlertTriangle, 
  Cpu, 
  Sparkles,
  Wifi,
  WifiOff,
  UserCheck,
  KeyRound
} from 'lucide-react';
import { 
  db, 
  auth, 
  googleProvider, 
  toggleNetwork, 
  testConnection,
  shopCollection,
  shopDoc,
} from '../../firebase';
import { 
  signInWithPopup, 
  signInAnonymously, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getDocs, 
  writeBatch,
  DocumentReference,
} from 'firebase/firestore';
import { 
  Product, 
  Category, 
  Invoice, 
  Customer, 
  Supplier, 
  ReturnRecord, 
  WasteRecord, 
  Promotion, 
  ExpenseRecord, 
  PurchaseInvoice, 
  SystemSettings 
} from '../../types';
import * as storage from '../../lib/storage';

interface FirebaseSyncTabProps {
  lang: 'ar' | 'en';
  showToast: (type: 'success' | 'error' | 'warning', msg: string) => void;
  products: Product[];
  setProducts: (p: Product[]) => void;
  categories: Category[];
  setCategories: (c: Category[]) => void;
  invoices: Invoice[];
  setInvoices: (i: Invoice[]) => void;
  customers: Customer[];
  setCustomers: (c: Customer[]) => void;
  suppliers: Supplier[];
  setSuppliers: (s: Supplier[]) => void;
  returns: ReturnRecord[];
  setReturns: (r: ReturnRecord[]) => void;
  waste: WasteRecord[];
  setWaste: (w: WasteRecord[]) => void;
  promotions: Promotion[];
  setPromotions: (p: Promotion[]) => void;
  expenses: ExpenseRecord[];
  setExpenses: (e: ExpenseRecord[]) => void;
  purchaseInvoices: PurchaseInvoice[];
  setPurchaseInvoices: (p: PurchaseInvoice[]) => void;
  settings: SystemSettings;
  setSettings: (s: SystemSettings) => void;
}

// Firebase Auth error codes -> user-facing messages
const AUTH_ERRORS: Record<string, { ar: string; en: string }> = {
  'auth/invalid-credential': { ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.', en: 'Wrong email or password.' },
  'auth/wrong-password': { ar: 'كلمة المرور غير صحيحة.', en: 'Wrong password.' },
  'auth/user-not-found': { ar: 'لا يوجد حساب بهذا البريد. اختر "إنشاء حساب".', en: 'No account with this email. Choose "Create account".' },
  'auth/email-already-in-use': { ar: 'هذا البريد مسجّل مسبقاً. سجّل الدخول بدلاً من ذلك.', en: 'This email is already registered. Sign in instead.' },
  'auth/weak-password': { ar: 'كلمة المرور ضعيفة (6 أحرف على الأقل).', en: 'Password is too weak (min 6 characters).' },
  'auth/invalid-email': { ar: 'البريد الإلكتروني غير صالح.', en: 'Invalid email address.' },
  'auth/too-many-requests': { ar: 'محاولات كثيرة. حاول بعد قليل.', en: 'Too many attempts. Try again later.' },
  'auth/network-request-failed': { ar: 'لا يوجد اتصال بالإنترنت.', en: 'No internet connection.' },
  'auth/operation-not-allowed': { ar: 'طريقة الدخول هذه غير مفعّلة في مشروع Firebase.', en: 'This sign-in method is not enabled in the Firebase project.' },
};
const authErrorMessage = (err: any, isAr: boolean) => {
  const m = AUTH_ERRORS[err?.code];
  return m ? (isAr ? m.ar : m.en) : (err?.message || String(err));
};

// Collections mirrored to the cloud (under shops/{uid}/...)
const SYNCED_COLLECTIONS = ['products', 'categories', 'invoices', 'customers', 'suppliers', 'expenses', 'purchaseInvoices'] as const;

/** Writes documents in batches (Firestore allows up to 500 operations per batch). */
async function batchWrite(entries: Array<[DocumentReference, object]>) {
  for (let i = 0; i < entries.length; i += 400) {
    const batch = writeBatch(db);
    entries.slice(i, i + 400).forEach(([ref, data]) => batch.set(ref, data));
    await batch.commit();
  }
}

export function FirebaseSyncTab({
  lang,
  showToast,
  products,
  setProducts,
  categories,
  setCategories,
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
  settings,
  setSettings
}: FirebaseSyncTabProps) {
  
  const isAr = lang === 'ar';

  // State Management
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [networkOnline, setNetworkOnline] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<string>('');
  
  // Counts states (Compare local vs remote)
  const [cloudCounts, setCloudCounts] = useState<{ [key: string]: number }>({
    products: 0,
    categories: 0,
    invoices: 0,
    customers: 0,
    suppliers: 0,
    expenses: 0,
    purchases: 0
  });

  // Email and Password Auth States
  const [showEmailAuth, setShowEmailAuth] = useState<boolean>(false);
  const [emailVal, setEmailVal] = useState<string>('');
  const [passwordVal, setPasswordVal] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [emailLoading, setEmailLoading] = useState<boolean>(false);

  // Firebase Auth session
  useEffect(() => {
    // Older versions kept a fake "signed in" record in localStorage without a real Firebase session
    if (storage.getItem('custom_logged_user')) {
      storage.removeItem('custom_logged_user');
      showToast('warning', isAr
        ? 'تم تحديث نظام المزامنة السحابية لحماية بياناتك. يرجى إنشاء حساب أو تسجيل الدخول من جديد، ثم رفع بياناتك.'
        : 'Cloud sync was upgraded to protect your data. Please sign in (or create an account) again, then upload your data.');
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFbUser(user);
      if (user) fetchCloudCounts();
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check initial connection status
  useEffect(() => {
    const checkConnection = async () => {
      const isOnline = await testConnection();
      setNetworkOnline(isOnline);
    };
    checkConnection();
    
    // Add tab focus listeners etc.
    const handleOnlineStatus = () => setNetworkOnline(navigator.onLine);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  // Toggle network offline/online manually for teaching/testing
  const handleToggleNetwork = async (goOnline: boolean) => {
    const success = await toggleNetwork(goOnline);
    if (success) {
      setNetworkOnline(goOnline);
      showToast('success', goOnline 
        ? (isAr ? 'تم تفعيل الاتصال بالخادم السحابي! جاري المزامنة تلقائياً...' : 'Connected to Cloud ! Syncing automatically...') 
        : (isAr ? 'تم فصل الشبكة! البرنامج يعمل الآن أوفلاين بالكامل ويخزن مؤقتاً.' : 'Network disconnected! App running completely offline.')
      );
    }
  };

  // Google Login
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        showToast('success', isAr 
          ? `مرحباً ${result.user.displayName || 'يا صديقي'}! تم تسجيل الدخول سحابياً بنجاح.` 
          : `Welcome ${result.user.displayName || 'friend'}! Firebase login successful.`
        );
        fetchCloudCounts();
      }
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      
      const isExeOrIframe = window.location.hostname === 'localhost' || 
                            window.location.protocol === 'file:' || 
                            window.navigator.userAgent.includes('Electron') ||
                            window.self !== window.top;

      if (isExeOrIframe || err?.code === 'auth/operation-not-supported-in-this-environment' || err?.code === 'auth/popup-blocked') {
        showToast('error', isAr 
          ? 'تنبيه EXE: قوقل تمنع تسجيل الدخول التلقائي بالنوافذ المنبثقة داخل برامج الكمبيوتر (Desktop EXE) كإجراء حماية. الرجاء استخدام خيار "الربط بالبريد والرقم السري" بالأسفل حيث يعمل بامتياز وبشكل رسمي وبسيط!'
          : 'Google blocks popup authentication inside desktop wraps due to security policies. Please use the "Sync Style Email & Password" option below instead!'
        );
      } else {
        showToast('error', isAr 
          ? `فشل تسجيل الدخول بـ Google! (التفاصيل: ${err?.message || err})` 
          : `Google sign-in failed! (${err?.message || err})`
        );
      }
    }
  };

  // Email & password sign-in / registration (Firebase Auth)
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailVal.trim().toLowerCase();
    if (!email || !passwordVal) {
      showToast('error', isAr ? 'يرجى ملء جميع الحقول المطلوبة!' : 'Please fill all fields!');
      return;
    }
    setEmailLoading(true);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, passwordVal);
        showToast('success', isAr ? '🎉 تم إنشاء حسابك السحابي بنجاح! يمكنك الآن رفع بياناتك.' : '🎉 Cloud account created! You can now upload your data.');
      } else {
        await signInWithEmailAndPassword(auth, email, passwordVal);
        showToast('success', isAr ? '👋 تم تسجيل الدخول للمزامنة السحابية بنجاح.' : '👋 Signed in to cloud sync.');
      }
      setShowEmailAuth(false);
      setPasswordVal('');
    } catch (err: any) {
      console.error(err);
      showToast('error', authErrorMessage(err, isAr));
    } finally {
      setEmailLoading(false);
    }
  };

  // Password reset email (sent by Firebase)
  const handleResetPassword = async () => {
    const email = emailVal.trim().toLowerCase();
    if (!email) {
      showToast('error', isAr ? 'اكتب بريدك الإلكتروني أولاً في خانة البريد.' : 'Enter your email address first.');
      return;
    }
    setEmailLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      showToast('success', isAr ? '📧 أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك.' : '📧 Password reset link sent to your email.');
    } catch (err: any) {
      showToast('error', authErrorMessage(err, isAr));
    } finally {
      setEmailLoading(false);
    }
  };

  // Anonymous Guest Login Fallback
  const handleAnonymousLogin = async () => {
    try {
      const result = await signInAnonymously(auth);
      if (result.user) {
        showToast('success', isAr 
          ? 'تم إنشاء معرّف سائد (ضيف) وتفعيل المزامنة الفورية لمسودتك!' 
          : 'Anonymous sandbox account created! Live sync active.'
        );
        fetchCloudCounts();
      }
    } catch (err) {
      console.error(err);
      showToast('error', isAr ? 'فشل تسجيل الدخول مجهول الهوية!' : 'Anonymous login failed!');
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setFbUser(null);
      showToast('warning', isAr ? 'تم تسجيل الخروج وفصل الخادم السحابي 👋' : 'Disconnected from Firebase Cloud 👋');
    } catch (err) {
      showToast('error', 'Logout Error');
    }
  };

  // Count this shop's documents in the cloud
  const fetchCloudCounts = async () => {
    if (!auth.currentUser) return;
    try {
      const counts: any = {};
      for (const col of SYNCED_COLLECTIONS) {
        const snap = await getDocs(shopCollection(col));
        counts[col === 'purchaseInvoices' ? 'purchases' : col] = snap.size;
      }
      setCloudCounts(counts);
    } catch (err) {
      console.warn("Could not load remote counts (perhaps permission rules / offline)", err);
    }
  };

  // Migrate Local Storage data TO Cloud Firestore
  const handleUploadAllToCloud = async () => {
    if (!fbUser) {
      showToast('error', isAr ? 'يرجى تسجيل الدخول سحابياً أولاً للتمكن من الرفع!' : 'Please log in to Firebase Cloud first!');
      return;
    }

    setSyncing(true);
    try {
      const tables: Array<[string, Array<{ id: string }>, string]> = [
        ['categories', categories, isAr ? 'جاري رفع الفئات...' : 'Uploading categories...'],
        ['products', products, isAr ? 'جاري رفع المنتجات...' : 'Uploading products...'],
        ['invoices', invoices, isAr ? 'جاري رفع فواتير المبيعات...' : 'Uploading sales invoices...'],
        ['customers', customers, isAr ? 'جاري رفع قاعدة بيانات الزبائن...' : 'Uploading customers...'],
        ['suppliers', suppliers, isAr ? 'جاري رفع بيانات الموردين...' : 'Uploading suppliers...'],
        ['expenses', expenses, isAr ? 'جاري رفع المصاريف والتشغيل...' : 'Uploading expenses...'],
        ['purchaseInvoices', purchaseInvoices, isAr ? 'جاري رفع فواتير المشتريات...' : 'Uploading procurement invoices...'],
      ];
      for (const [col, rows, label] of tables) {
        setSyncProgress(label);
        await batchWrite(rows.map(row => [shopDoc(col, row.id), row]));
      }
      setSyncProgress(isAr ? 'جاري رفع إعدادات المحل...' : 'Uploading store settings...');
      await batchWrite([[shopDoc('settings', 'global_config'), settings]]);

      showToast('success', isAr 
        ? '🚀 تم ترحيل ورفع كافة البيانات المحلية إلى خادم Firebase بنجاح!' 
        : '🚀 All local database tables migrated to Firebase successfully!'
      );
      fetchCloudCounts();
    } catch (error) {
      console.error(error);
      showToast('error', isAr ? 'حدث خطأ أثناء ترحيل البيانات!' : 'Error occurred while migrating data!');
    } finally {
      setSyncing(false);
      setSyncProgress('');
    }
  };

  // Pull All Data FROM Cloud Firestore TO Local Storage
  const handlePullAllFromCloud = async () => {
    if (!fbUser) {
      showToast('error', isAr ? 'يرجى تسجيل الدخول أولاً للتمكن من التحميل!' : 'Please log in first before pulling!');
      return;
    }

    if (!window.confirm(isAr 
      ? 'تحذير: هذا الإجراء سيستبدل بياناتك المحلية المخزنة ببيانات السحاب بالكامل! هل أنت متأكد؟'
      : 'Warning: Resyncing will overwrite all your local browser offline records with Cloud values. Proceed?'
    )) {
      return;
    }

    setSyncing(true);
    try {
      // 1. Categories
      setSyncProgress(isAr ? 'جاري سحب الفئات...' : 'Pulling categories...');
      const catSnap = await getDocs(shopCollection('categories'));
      const catList: Category[] = [];
      catSnap.forEach(d => catList.push(d.data() as Category));
      if (catList.length > 0) {
        setCategories(catList);
        storage.setJSON('pos_categories', catList);
      }

      // 2. Products
      setSyncProgress(isAr ? 'جاري سحب المنتجات...' : 'Pulling products...');
      const prodSnap = await getDocs(shopCollection('products'));
      const prodList: Product[] = [];
      prodSnap.forEach(d => prodList.push(d.data() as Product));
      if (prodList.length > 0) {
        setProducts(prodList);
        storage.setJSON('pos_products', prodList);
      }

      // 3. Invoices
      setSyncProgress(isAr ? 'جاري سحب المبيعات...' : 'Pulling invoices...');
      const invSnap = await getDocs(shopCollection('invoices'));
      const invList: Invoice[] = [];
      invSnap.forEach(d => invList.push(d.data() as Invoice));
      if (invList.length > 0) {
        setInvoices(invList);
        storage.setJSON('pos_invoices', invList);
      }

      // 4. Customers
      setSyncProgress(isAr ? 'جاري سحب العملاء والزبائن...' : 'Pulling customers...');
      const custSnap = await getDocs(shopCollection('customers'));
      const custList: Customer[] = [];
      custSnap.forEach(d => custList.push(d.data() as Customer));
      if (custList.length > 0) {
        setCustomers(custList);
        storage.setJSON('pos_customers', custList);
      }

      // 5. Suppliers
      setSyncProgress(isAr ? 'جاري سحب الموردين...' : 'Pulling suppliers...');
      const supSnap = await getDocs(shopCollection('suppliers'));
      const supList: Supplier[] = [];
      supSnap.forEach(d => supList.push(d.data() as Supplier));
      if (supList.length > 0) {
        setSuppliers(supList);
        storage.setJSON('pos_suppliers', supList);
      }

      // 6. Expenses
      setSyncProgress(isAr ? 'جاري سحب المصاريف...' : 'Pulling expenses...');
      const expSnap = await getDocs(shopCollection('expenses'));
      const expList: ExpenseRecord[] = [];
      expSnap.forEach(d => expList.push(d.data() as ExpenseRecord));
      if (expList.length > 0) {
        setExpenses(expList);
        storage.setJSON('pos_expenses', expList);
      }

      // 7. Purchase Invoices
      setSyncProgress(isAr ? 'جاري سحب فواتير المشتريات...' : 'Pulling purchase logs...');
      const purSnap = await getDocs(shopCollection('purchaseInvoices'));
      const purList: PurchaseInvoice[] = [];
      purSnap.forEach(d => purList.push(d.data() as PurchaseInvoice));
      if (purList.length > 0) {
        setPurchaseInvoices(purList);
        storage.setJSON('pos_purchases', purList);
      }

      showToast('success', isAr 
        ? '📥 تم ترحيل وسحب كامل البيانات المستضافة سحابياً إلى التخزين المحلي بنجاح!' 
        : '📥 All Firebase remote tables loaded and written to browser storage!'
      );
    } catch (error) {
      console.error(error);
      showToast('error', isAr ? 'حدث خطأ أثناء تحميل البيانات!' : 'Error occurred while pulling data!');
    } finally {
      setSyncing(false);
      setSyncProgress('');
    }
  };

  return (
    <div className="space-y-6 text-right" id="tab-firebase-sync-view">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-15">
          <CloudLightning className="w-40 h-40" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2.5 justify-end">
            <span className="bg-yellow-400 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
              {isAr ? 'قاعدة بيانات سحابية متكاملة ☁️' : 'PRO CLOUD BACKEND ☁️'}
            </span>
            <Cloud className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black">{isAr ? 'بوابة المزامنة والعمل دون اتصال' : 'Firebase Cloud Synchronization Center'}</h2>
          <p className="text-sm text-emerald-100 max-w-xl self-end">
            {isAr 
              ? 'نهج فريد يربط متجرك بسيرفر الـ Firebase تلقائياً! تكنولوجيا ذكية تمكنك من جرد وحساب زبائنك بدون إنترنت، ثم ترحيل البيانات عند توفر الشبكة بسلاسة فائقة للتوسع وتعدد السيرفرات.' 
              : 'Our advanced architecture lets you handle direct supermarket checkouts, track suppliers and manage stock 100% offline. The system caches the data and synchronizes automatic batch commits to Firebase the second you go online.'}
          </p>
        </div>
      </div>

      {/* 2. Interactive Status Panel & Connection Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Connection Widget */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h4 className="font-bold text-slate-800 text-sm flex items-center justify-end gap-1.5 pb-2 border-b border-slate-100">
              <span>{isAr ? 'حالة شبكة الخادم' : 'Server Connection Status'}</span>
              <Cpu className="w-4 h-3.5 text-slate-500" />
            </h4>
            <div className="mt-4 flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-center">
              {networkOnline ? (
                <>
                  <Wifi className="w-10 h-10 text-emerald-500 animate-bounce" />
                  <span className="text-emerald-700 font-extrabold text-xs bg-emerald-50 px-2.5 py-1 rounded-full block">
                    {isAr ? '📶 متصل بالإنترنت وقاعدة البيانات السحابية الحية' : '📶 Online & Cloud Synced'}
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-10 h-10 text-amber-500 animate-pulse" />
                  <span className="text-amber-700 font-extrabold text-xs bg-amber-50 px-2.5 py-1 rounded-full block">
                    {isAr ? '📡 غير متصل (يعمل على الكاش المؤقت بأمان)' : '📡 Offline (Safe Storage Active)'}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 font-semibold block text-center">
              {isAr ? '🎮 اختبر ميزة العمل دون إنترنت الآن:' : '🎮 Test Offline workflow right now:'}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleToggleNetwork(false)}
                disabled={!networkOnline}
                className={`py-2 px-3 text-[11px] font-black rounded-lg transition border flex items-center justify-center gap-1.5 cursor-pointer ${
                  !networkOnline 
                  ? 'bg-amber-100 text-amber-800 border-amber-200 font-bold' 
                  : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                }`}
              >
                <span>🔌 {isAr ? 'شغل أوفلاين' : 'Go Offline'}</span>
              </button>
              <button
                onClick={() => handleToggleNetwork(true)}
                disabled={networkOnline}
                className={`py-2 px-3 text-[11px] font-black rounded-lg transition border flex items-center justify-center gap-1.5 cursor-pointer ${
                  networkOnline 
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold' 
                  : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                }`}
              >
                <span>⚡ {isAr ? 'شغل متصل' : 'Go Live'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* User Account Authentication Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h4 className="font-bold text-slate-800 text-sm flex items-center justify-end gap-1.5 pb-2 border-b border-slate-100">
              <span>{isAr ? 'بوابة المزامنة السحابية (Firebase Auth)' : 'Live Synchronization Portal'}</span>
              <UserCheck className="w-4 h-4 text-slate-500" />
            </h4>

            <div className="mt-4">
              {fbUser ? (
                <div className="p-3 bg-emerald-50/50 rounded-xl space-y-2 border border-emerald-100/50">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="text-right">
                      <span className="font-bold text-slate-800 text-xs block">{fbUser.displayName || (isAr ? 'حساب مجهول/تجريبي' : 'Sandbox User')}</span>
                      <span className="font-mono text-[9px] text-[#1D9E75] block truncate max-w-[170px]">{fbUser.email || 'anonymous_sandbox@pos.db'}</span>
                    </div>
                    {fbUser.photoURL ? (
                      <img src={fbUser.photoURL} referrerPolicy="no-referrer" alt="Profile" className="w-8 h-8 rounded-full border border-slate-200" />
                    ) : (
                      <span className="bg-[#1D9E75] text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">U</span>
                    )}
                  </div>
                  <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100 py-0.5 px-2 rounded block text-center">
                    {isAr ? '✅ السيرفر السحابي متصل ويعمل حالياً بنظام الكاش' : '✅ Cloud synchronization is enabled'}
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-center text-xs text-slate-500 border border-slate-100">
                  <span>🔒 {isAr ? 'المزامنة السحابية مغلقة حالياً' : 'Cloud Sync inactive'}</span>
                  <span className="block text-[10px] text-slate-400">
                    {isAr ? 'قم بربط حسابك لحماية بيانات متجرك وتمثيلها سحابياً.' : 'Connect to synchronize store ledger and scale branches.'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            {fbUser ? (
              <button
                onClick={handleLogout}
                className="w-full bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isAr ? 'فصل الخادم السحابي 👋' : 'Disconnect Cloud Session 👋'}</span>
              </button>
            ) : showEmailAuth ? (
              <form onSubmit={handleEmailAuthSubmit} className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-right text-[11px] font-black text-slate-700 mb-1">
                  {isRegistering 
                    ? (isAr ? '📝 إنشاء حساب سحابي جديد لمحلّك:' : '📝 Create new cloud account:') 
                    : (isAr ? '🔑 تسجيل دخول بحساب سحابي مفّعل:' : '🔑 Sign in to cloud database:')}
                </div>
                
                <div>
                  <input
                    type="email"
                    required
                    value={emailVal}
                    onChange={(e) => setEmailVal(e.target.value)}
                    placeholder={isAr ? 'البريد الإلكتروني (مثال: shop@pos.com)' : 'Email address'}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D9E75] text-right"
                  />
                </div>

                <div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordVal}
                    onChange={(e) => setPasswordVal(e.target.value)}
                    placeholder={isAr ? 'كلمة المرور (6 أحرف على الأقل)' : 'Password (min 6 chars)'}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D9E75] text-right"
                  />
                </div>

                {!isRegistering && (
                  <div className="text-right flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={emailLoading}
                      className="text-[10px] text-rose-600 hover:text-rose-750 hover:underline font-bold transition cursor-pointer text-right"
                    >
                      {isAr ? 'نسيت كلمة المرور؟ إعادة تعيينها عبر البريد 📧' : 'Forgot password? Reset via Email 📧'}
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailAuth(false);
                      setEmailVal('');
                      setPasswordVal('');
                    }}
                    className="w-1/3 bg-slate-200 hover:bg-slate-300 text-slate-750 py-1.5 rounded-lg text-xs font-black transition cursor-pointer"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  
                  <button
                    type="submit"
                    disabled={emailLoading}
                    className="w-2/3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black hover:opacity-90 py-1.5 rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {emailLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <LogIn className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isRegistering 
                        ? (isAr ? 'إنشاء الحساب' : 'Create Account') 
                        : (isAr ? 'تسجيل الدخول' : 'Sign In')}
                    </span>
                  </button>
                </div>

                <div className="text-center pt-1.5 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="text-[10px] text-indigo-700 hover:underline font-bold"
                  >
                    {isRegistering 
                      ? (isAr ? 'لديك حساب بالفعل؟ سجل دخولك من هنا' : 'Already have account? Sign in') 
                      : (isAr ? 'ليس لديك حساب؟ اضغط هنا لإنشاء حساب جديد' : 'New to Cloud? Create an account')}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isAr ? 'تسجيل دخول بالـ Google 🌐' : 'Log in with Google 🌐'}</span>
                </button>

                <div className="text-center text-[9px] text-slate-400 font-bold py-0.5">
                  {isAr ? '🔓 مرن وتوافقي مع تطبيق الكمبيوتر السطحي (EXE):' : '🔓 Full compatibility fallback for local Desktop App:'}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowEmailAuth(true);
                    setIsRegistering(false);
                  }}
                  className="w-full bg-gradient-to-r from-indigo-50 to-indigo-100/70 hover:from-indigo-100 hover:to-indigo-150 text-indigo-850 border border-indigo-200/50 py-2 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isAr ? 'الربط بالبريد الإلكتروني والرقم السري 🔑' : 'Sync style Email & Password 🔑'}</span>
                </button>

                <div className="h-[1px] bg-slate-100 my-1"></div>

                <button
                  type="button"
                  onClick={handleAnonymousLogin}
                  className="w-full bg-[#1D9E75]/10 text-[#1D9E75] hover:bg-[#1D9E75]/20 py-1.5 rounded-xl text-[10px] font-black transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>🚀 {isAr ? 'إنشاء قاعدة سحابية تجريبية للضيف فورا' : 'Create guest cloud database'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sync Operations Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h4 className="font-bold text-slate-800 text-sm flex items-center justify-end gap-1.5 pb-2 border-b border-slate-100">
              <span>{isAr ? 'ترحيل وترقية يدوية شاملة' : 'Full Manual Synchronization'}</span>
              <Database className="w-4 h-4 text-slate-500" />
            </h4>
            <p className="text-[10px] text-slate-400 leading-normal mt-3 text-right">
              {isAr 
                ? 'استخدم هذه الخيارات لترحيل كامل مخزونك الحالي وبيانات الكاش المتراكمة لديك إلى قاعدة بيانات Firebase أو العكس لتنزيلها على جهاز جديد.' 
                : 'Useful for migrating preexisting data on local storage to modern Firebase db, or fetching them back.'}
            </p>
          </div>

          {syncing ? (
            <div className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl text-center">
              <RefreshCw className="w-6 h-6 text-[#1D9E75] animate-spin" />
              <span className="text-xs font-bold text-[#1D9E75]">{syncProgress}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={handleUploadAllToCloud}
                disabled={!fbUser}
                className={`w-full py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  fbUser 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white hover:opacity-90 shadow-sm' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border'
                }`}
              >
                <span>📤 {isAr ? 'رفع البضائع وفواتيرك الحالية للسحاب' : 'Upload Data to Firebase'}</span>
              </button>
              
              <button
                onClick={handlePullAllFromCloud}
                disabled={!fbUser}
                className={`w-full py-2 rounded-xl text-xs font-black transition border flex items-center justify-center gap-1.5 cursor-pointer ${
                  fbUser 
                  ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>📥 {isAr ? 'سحب فواتير وبضائع السحاب للمتجر' : 'Load from Firebase Cloud'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Database Sync Comparison Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center flex-row-reverse">
          <div className="flex items-center gap-1 text-slate-800">
            <span className="font-extrabold text-sm">{isAr ? 'مطابقة ومقارنة جداول قاعدة البيانات ومخزن الـ Firebase' : 'Supermarket Ledger Status Comparison'}</span>
            <Database className="w-4 h-4 text-[#1D9E75]" />
          </div>
          {fbUser && (
            <button
              onClick={fetchCloudCounts}
              className="text-xs text-slate-600 hover:text-[#1D9E75] border border-slate-200 hover:border-emerald-200 bg-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isAr ? 'تحديث الإحصاء السحابي' : 'Query Server Counts'}</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-100/50 text-slate-500 font-extrabold border-b border-slate-200 uppercase tracking-wider">
                <th className="py-2 px-4 text-center">{isAr ? 'الحالة والمطامنة' : 'Sync Status'}</th>
                <th className="py-2 px-4 text-center">{isAr ? 'عدد السجلات السحابية (Firebase)' : 'Cloud Firestore Counts'}</th>
                <th className="py-2 px-4 text-center">{isAr ? 'عدد السجلات المحلية (Browser)' : 'Local Storage Counts'}</th>
                <th className="py-2 px-4">{isAr ? 'جدول قاعدة البيانات' : 'Collection Name'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              
              {/* Row 1: Products */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-4 text-center">
                  {fbUser ? (
                    cloudCounts.products === products.length ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        <CheckCircle className="w-3 h-3" /> {isAr ? 'مطابق' : 'Identical'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3" /> {isAr ? 'يتطلب ترحيل' : 'Out of sync'}
                      </span>
                    )
                  ) : (
                    <span className="text-slate-400 text-[10px]">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">{fbUser ? cloudCounts.products : '🔒'}</td>
                <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">{products.length}</td>
                <td className="py-3 px-4 font-bold flex items-center justify-end gap-1.5">
                  <span>🍏 {isAr ? 'المنتجات والمخزون' : 'Active Products'}</span>
                </td>
              </tr>

              {/* Row 2: Categories */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-4 text-center">
                  {fbUser ? (
                    cloudCounts.categories === categories.length ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        <CheckCircle className="w-3 h-3" /> {isAr ? 'مطابق' : 'Identical'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3" /> {isAr ? 'يتطلب ترحيل' : 'Out of sync'}
                      </span>
                    )
                  ) : (
                    <span className="text-slate-400 text-[10px]">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">{fbUser ? cloudCounts.categories : '🔒'}</td>
                <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">{categories.length}</td>
                <td className="py-3 px-4 font-bold flex items-center justify-end gap-1.5">
                  <span>📂 {isAr ? 'فئات المنتجات' : 'Inventory Categories'}</span>
                </td>
              </tr>

              {/* Row 3: Invoices */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-4 text-center">
                  {fbUser ? (
                    cloudCounts.invoices === invoices.length ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        <CheckCircle className="w-3 h-3" /> {isAr ? 'مطابق' : 'Identical'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3" /> {isAr ? 'يتطلب ترحيل' : 'Out of sync'}
                      </span>
                    )
                  ) : (
                    <span className="text-slate-400 text-[10px]">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">{fbUser ? cloudCounts.invoices : '🔒'}</td>
                <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">{invoices.length}</td>
                <td className="py-3 px-4 font-bold flex items-center justify-end gap-1.5">
                  <span>🧾 {isAr ? 'فواتير المبيعات' : 'Sales Invoices'}</span>
                </td>
              </tr>

              {/* Row 4: Customers */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-4 text-center">
                  {fbUser ? (
                    cloudCounts.customers === customers.length ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        <CheckCircle className="w-3 h-3" /> {isAr ? 'مطابق' : 'Identical'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3" /> {isAr ? 'يتطلب ترحيل' : 'Out of sync'}
                      </span>
                    )
                  ) : (
                    <span className="text-slate-400 text-[10px]">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">{fbUser ? cloudCounts.customers : '🔒'}</td>
                <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">{customers.length}</td>
                <td className="py-3 px-4 font-bold flex items-center justify-end gap-1.5">
                  <span>👥 {isAr ? 'الزبائن وحساب الديون' : 'Customer Directory'}</span>
                </td>
              </tr>

              {/* Row 5: Suppliers */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-4 text-center">
                  {fbUser ? (
                    cloudCounts.suppliers === suppliers.length ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        <CheckCircle className="w-3 h-3" /> {isAr ? 'مطابق' : 'Identical'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3" /> {isAr ? 'يتطلب ترحيل' : 'Out of sync'}
                      </span>
                    )
                  ) : (
                    <span className="text-slate-400 text-[10px]">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">{fbUser ? cloudCounts.suppliers : '🔒'}</td>
                <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">{suppliers.length}</td>
                <td className="py-3 px-4 font-bold flex items-center justify-end gap-1.5">
                  <span>🚛 {isAr ? 'بيانات الموردين' : 'Wholesaler Suppliers'}</span>
                </td>
              </tr>

              {/* Row 6: Purchase Invoices */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-4 text-center">
                  {fbUser ? (
                    cloudCounts.purchases === purchaseInvoices.length ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        <CheckCircle className="w-3 h-3" /> {isAr ? 'مطابق' : 'Identical'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3" /> {isAr ? 'يتطلب ترحيل' : 'Out of sync'}
                      </span>
                    )
                  ) : (
                    <span className="text-slate-400 text-[10px]">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">{fbUser ? cloudCounts.purchases : '🔒'}</td>
                <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">{purchaseInvoices.length}</td>
                <td className="py-3 px-4 font-bold flex items-center justify-end gap-1.5">
                  <span>🛒 {isAr ? 'فواتير المشتريات' : 'Purchase Invoices'}</span>
                </td>
              </tr>

              {/* Row 7: Expenses */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-4 text-center">
                  {fbUser ? (
                    cloudCounts.expenses === expenses.length ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        <CheckCircle className="w-3 h-3" /> {isAr ? 'مطابق' : 'Identical'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3" /> {isAr ? 'يتطلب ترحيل' : 'Out of sync'}
                      </span>
                    )
                  ) : (
                    <span className="text-slate-400 text-[10px]">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">{fbUser ? cloudCounts.expenses : '🔒'}</td>
                <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">{expenses.length}</td>
                <td className="py-3 px-4 font-bold flex items-center justify-end gap-1.5">
                  <span>💵 {isAr ? 'المصاريف التشغيلية' : 'Operating Expenses'}</span>
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Helpful offline documentation banner */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
        <h4 className="font-bold text-slate-800 text-sm flex items-center justify-end gap-1.5">
          <span>{isAr ? 'كيف يعمل الـ Offline والـ Online في السوبرماركت في نفس الوقت؟' : 'How does Offline & Online coexistence work?'}</span>
          <HelpCircle className="w-4 h-4 text-emerald-600" />
        </h4>
        <div className="text-xs text-slate-600 leading-relaxed space-y-2 text-right">
          <p>
            {isAr 
              ? '1️⃣ عند تشغيل النظام وهو متصل بالإنترنت، يتم حفظ المبيعات والمنتجات في السحاب (Firebase) ولدى المتصفح معاً.' 
              : '1️⃣ When online, invoices and stock levels are saved in both raw cloud documents and local device caching.'}
          </p>
          <p>
            {isAr 
              ? '2️⃣ في حال انقطاع الشبكة فجأة، يستمر الكاشير في البيع وفحص الباركود وجرد المشتريات دون أي اهتزاز أو انقطاع، مع الحفظ الفوري بفضل قاعدة البيانات المحلية (IndexedDB Persistent Cache).' 
              : '2️⃣ During a power cut or network failure, cashiers continue printing bills and checking barcoded labels normally. Firestore automatically redirects operations locally.'}
          </p>
          <p>
            {isAr 
              ? '3️⃣ لحظة عودة الإنترنت، تقوم الخوارزمية سحابياً برفع التغييرات والمبيعات المجدولة تلقائياً بالكامل بدون أي تدخل منك وبشكل صامت بالخلفية.' 
              : '3️⃣ As soon as wifi resumes, queued transactions are synchronized automatically in the background with zero lag.'}
          </p>
        </div>
      </div>
    </div>
  );
}
