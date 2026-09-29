import { Invoice, ReturnRecord, Product, Customer } from '../../types';
import { auth } from '../../firebase';
import React from 'react';

export interface UseInvoiceActionsDeps {
  SYS_DATE: string;
  syncWriteToCloud: (collectionName: string, docId: string, data: any, isDelete?: boolean) => Promise<void>;
  lang: "ar" | "en";
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  returns: ReturnRecord[];
  setReturns: React.Dispatch<React.SetStateAction<ReturnRecord[]>>;
  setShowInvoiceReceipt: React.Dispatch<React.SetStateAction<Invoice>>;
  showToast: (type: "success" | "error" | "warning", message: string) => void;
  executeWithAdminAuth: (title: string, action: () => void) => void;
}

export function useInvoiceActions({
  SYS_DATE,
  syncWriteToCloud,
  lang,
  products,
  setProducts,
  invoices,
  setInvoices,
  customers,
  setCustomers,
  returns,
  setReturns,
  setShowInvoiceReceipt,
  showToast,
  executeWithAdminAuth,
}: UseInvoiceActionsDeps) {
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

  return {
    handleCancelWholeInvoice,
    handleReturnSingleItem,
  };
}
