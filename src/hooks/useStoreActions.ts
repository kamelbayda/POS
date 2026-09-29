import { Category, Product, ExpenseRecord, Promotion, WasteRecord } from '../types';
import * as storage from '../lib/storage';
import { auth } from '../firebase';
import { PromotionChange } from '../features/promotions/PromotionsTab';
import { toISODate } from '../lib/date';
import React from 'react';

export interface UseStoreActionsDeps {
  SYS_DATE: string;
  syncWriteToCloud: (collectionName: string, docId: string, data: any, isDelete?: boolean) => Promise<void>;
  lang: "ar" | "en";
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  waste: WasteRecord[];
  setWaste: React.Dispatch<React.SetStateAction<WasteRecord[]>>;
  promotions: Promotion[];
  setPromotions: React.Dispatch<React.SetStateAction<Promotion[]>>;
  setExpenses: React.Dispatch<React.SetStateAction<ExpenseRecord[]>>;
  showToast: (type: "success" | "error" | "warning", message: string) => void;
  executeWithAdminAuth: (title: string, action: () => void) => void;
}

export function useStoreActions({
  SYS_DATE,
  syncWriteToCloud,
  lang,
  products,
  setProducts,
  categories,
  setCategories,
  waste,
  setWaste,
  promotions,
  setPromotions,
  setExpenses,
  showToast,
  executeWithAdminAuth,
}: UseStoreActionsDeps) {
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

  // Persist the products list locally and mirror the single changed product to the cloud
  const handleProductsChange = (updated: Product[], changed: Product) => {
    setProducts(updated);
    storage.setJSON('pos_products', updated);
    syncWriteToCloud('products', changed.id, changed);
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

  return {
    handleAddNewCategory,
    handleProductsChange,
    deleteProduct,
    handleExpensesChange,
    handlePromotionsChange,
    handleAddStagnantPromotion,
    handleQuickWasteFromExpiry,
  };
}
