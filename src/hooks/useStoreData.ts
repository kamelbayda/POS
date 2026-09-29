import { useState, useEffect } from 'react';
import { Product, Category, SystemSettings, User, Invoice, Customer, Supplier, ReturnRecord, WasteRecord, Promotion, ExpenseRecord, PurchaseInvoice } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, DEFAULT_USERS, getSeededProducts, getSeededInvoices, DEFAULT_CUSTOMERS, DEFAULT_SUPPLIERS, DEFAULT_PROMOTIONS, DEFAULT_EXPENSES } from '../mockData';
import * as storage from '../lib/storage';

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
    const storedSettings = storage.getItem('pos_settings');
    let activeSettings = DEFAULT_SETTINGS;
    if (storedSettings) {
      activeSettings = JSON.parse(storedSettings);
      setSettings(activeSettings);
    } else {
      storage.setJSON('pos_settings', DEFAULT_SETTINGS);
    }

    // 1.5 categories
    const storedCategories = storage.getItem('pos_categories');
    if (storedCategories) {
      setCategories(JSON.parse(storedCategories));
    } else {
      storage.setJSON('pos_categories', DEFAULT_CATEGORIES);
    }

    // 2. Products
    const storedProducts = storage.getItem('pos_products');
    let activeProds: Product[] = [];
    if (storedProducts) {
      activeProds = JSON.parse(storedProducts);
      setProducts(activeProds);
    } else {
      activeProds = getSeededProducts(SYS_DATE);
      storage.setJSON('pos_products', activeProds);
      setProducts(activeProds);
    }

    // 3. Invoices
    const storedInvoices = storage.getItem('pos_invoices');
    if (storedInvoices) {
      setInvoices(JSON.parse(storedInvoices));
    } else {
      const seedInvs = getSeededInvoices(SYS_DATE);
      storage.setJSON('pos_invoices', seedInvs);
      setInvoices(seedInvs);
    }

    // 4. Users
    const storedUsers = storage.getItem('pos_users');
    let loadedUsers = DEFAULT_USERS;
    if (storedUsers) {
      loadedUsers = JSON.parse(storedUsers);
    }
    const savedAdminName = storage.getItem('pos_admin_real_name');
    const savedCashierName = storage.getItem('pos_cashier_real_name');
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
      storage.setJSON('pos_users', loadedUsers);
    }

    // 5. Customers
    const storedCustomers = storage.getItem('pos_customers');
    if (storedCustomers) {
      setCustomers(JSON.parse(storedCustomers));
    } else {
      storage.setJSON('pos_customers', DEFAULT_CUSTOMERS);
      setCustomers(DEFAULT_CUSTOMERS);
    }

    // 5.5 Suppliers
    const storedSuppliers = storage.getItem('pos_suppliers');
    if (storedSuppliers) {
      setSuppliers(JSON.parse(storedSuppliers));
    } else {
      storage.setJSON('pos_suppliers', DEFAULT_SUPPLIERS);
      setSuppliers(DEFAULT_SUPPLIERS);
    }

    // 6. Returns
    const storedReturns = storage.getItem('pos_returns');
    if (storedReturns) {
      setReturns(JSON.parse(storedReturns));
    } else {
      storage.setJSON('pos_returns', []);
      setReturns([]);
    }

    // 7. Waste
    const storedWaste = storage.getItem('pos_waste');
    if (storedWaste) {
      setWaste(JSON.parse(storedWaste));
    } else {
      storage.setJSON('pos_waste', []);
      setWaste([]);
    }

    // 8. Promotions
    const storedPromotions = storage.getItem('pos_promotions');
    if (storedPromotions) {
      setPromotions(JSON.parse(storedPromotions));
    } else {
      storage.setJSON('pos_promotions', DEFAULT_PROMOTIONS);
      setPromotions(DEFAULT_PROMOTIONS);
    }

    // 9. Expenses
    const storedExpenses = storage.getItem('pos_expenses');
    if (storedExpenses) {
      setExpenses(JSON.parse(storedExpenses));
    } else {
      storage.setJSON('pos_expenses', DEFAULT_EXPENSES);
      setExpenses(DEFAULT_EXPENSES);
    }

    // 10. Purchase Invoices
    const storedPurchases = storage.getItem('pos_purchases');
    if (storedPurchases) {
      setPurchaseInvoices(JSON.parse(storedPurchases));
    } else {
      storage.setJSON('pos_purchases', []);
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
