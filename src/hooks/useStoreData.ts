import { useState, useEffect } from 'react';
import { Product, Category, SystemSettings, User, Invoice, Customer, Supplier, ReturnRecord, WasteRecord, Promotion, ExpenseRecord, PurchaseInvoice } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, DEFAULT_USERS, getSeededProducts, getSeededInvoices, DEFAULT_CUSTOMERS, DEFAULT_SUPPLIERS, DEFAULT_PROMOTIONS, DEFAULT_EXPENSES } from '../mockData';

export interface UseStoreDataDeps {
  SYS_DATE: string;
}

export function useStoreData({
  SYS_DATE,
}: UseStoreDataDeps) {
  // --- DATABASE & APP STATE INITIALIZATION ---
  const [products, setProducts] = useState<Product[]>([]);

  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);

  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);

  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // New 5 data tables representing SQLite extensions
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [returns, setReturns] = useState<ReturnRecord[]>([]);

  const [waste, setWaste] = useState<WasteRecord[]>([]);

  const [promotions, setPromotions] = useState<Promotion[]>([]);

  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);

  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);

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

  return {
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
  };
}
