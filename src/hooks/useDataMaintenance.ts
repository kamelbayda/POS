import React from 'react';
import { Product, Invoice, SystemSettings, ReturnRecord, WasteRecord, Promotion, Customer, ExpenseRecord, PurchaseInvoice, Supplier } from '../types';
import * as storage from '../lib/storage';
import { withOperatingCost } from '../lib/operatingCost';

export interface UseDataMaintenanceDeps {
  lang: "ar" | "en";
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  settings: SystemSettings;
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  setReturns: React.Dispatch<React.SetStateAction<ReturnRecord[]>>;
  setWaste: React.Dispatch<React.SetStateAction<WasteRecord[]>>;
  setPromotions: React.Dispatch<React.SetStateAction<Promotion[]>>;
  setExpenses: React.Dispatch<React.SetStateAction<ExpenseRecord[]>>;
  setPurchaseInvoices: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
  showToast: (type: "success" | "error" | "warning", message: string) => void;
  executeWithAdminAuth: (title: string, action: () => void) => void;
}

export function useDataMaintenance({
  lang,
  products,
  setProducts,
  settings,
  setInvoices,
  setCustomers,
  setSuppliers,
  setReturns,
  setWaste,
  setPromotions,
  setExpenses,
  setPurchaseInvoices,
  showToast,
  executeWithAdminAuth,
}: UseDataMaintenanceDeps) {
  // --- UPDATE SYSTEM GENERAL SETTINGS ---
  const handleUpdateGeneralSettings = (e: React.FormEvent) => {
    e.preventDefault();
    storage.setJSON('pos_settings', settings);
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
        const newPriceUSD = parseFloat((withOperatingCost(p, cost) * (1 + margin / 100)).toFixed(2));
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
    storage.setJSON('pos_products', updatedProducts);
    showToast('success', lang === 'ar'
      ? `✅ تم بنجاح تحديث أسعار الصرف والمبيع لـ (${count}) صنف حالي بناءً على الهامش الافتراضي (${margin}%).`
      : `✅ Successfully recalculated selling prices for (${count}) items using (${margin}%) default profit margin.`);
  };

  // --- DATABASE MAINTENANCE & SYSTEM RESET ---
  const handleWipeSalesInvoicesOnly = () => {
    executeWithAdminAuth(lang === 'ar' ? 'تصفير مبيعات وأرباح المتجر الفعلية' : 'Wipe Live Sales Invoices Only', () => {
      if (confirm(lang === 'ar' ? '⚠️ هل أنت متأكد تماماً من رغبتك في تصفير وحذف جميع فواتير المبيعات والأرباح والسجلات المالية؟ لا يمكن التراجع عن هذه الخطوة!' : 'Are you sure you want to clear all sales invoices and financial records? This action cannot be undone!')) {
        setInvoices([]);
        storage.setJSON('pos_invoices', []);
        showToast('success', lang === 'ar' ? '🧹 تم تصفير جميع فواتير المبيعات بنجاح. مخزون السلع بقي كما هو.' : 'All sales invoices cleared successfully.');
      }
    });
  };

  const handleWipeProductsAndCategoriesOnly = () => {
    executeWithAdminAuth(lang === 'ar' ? 'تصفير وحذف مخزن وسلع المتجر الفعلية' : 'Wipe Live Products & Categories Only', () => {
      if (confirm(lang === 'ar' ? '⚠️ هل أنت متأكد من رغبتك في حذف جميع المنتجات والمخزون الحالي؟ سيتم مسح الأصناف المسجلة بالكامل.' : 'Are you sure you want to clear all products and inventory items?')) {
        setProducts([]);
        storage.setJSON('pos_products', []);
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
          
          storage.setJSON('pos_products', []);
          storage.setJSON('pos_invoices', []);
          storage.setJSON('pos_customers', []);
          storage.setJSON('pos_suppliers', []);
          storage.setJSON('pos_returns', []);
          storage.setJSON('pos_waste', []);
          storage.setJSON('pos_promotions', []);
          storage.setJSON('pos_expenses', []);
          storage.setJSON('pos_purchases', []);
          
          showToast('success', lang === 'ar' 
            ? '🎉 تم تصفير البرنامج بالكامل من البيانات التجريبية والبدء بصفحة نظيفة بنجاح!' 
            : 'Successfully wiped demo data and initialized completely clean database!');
        }
      }
    });
  };

  return {
    handleUpdateGeneralSettings,
    handleRecalculatePricesWithMargin,
    handleWipeSalesInvoicesOnly,
    handleWipeProductsAndCategoriesOnly,
    handleWipeEntireSystemData,
  };
}
