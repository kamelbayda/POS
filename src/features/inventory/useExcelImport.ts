import React, { useState } from 'react';
import { Product, Category } from '../../types';
import * as XLSX from 'xlsx';
import { auth } from '../../firebase';

export interface UseExcelImportDeps {
  SYS_DATE: string;
  syncWriteToCloud: (collectionName: string, docId: string, data: any, isDelete?: boolean) => Promise<void>;
  lang: "ar" | "en";
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  showToast: (type: "success" | "error" | "warning", message: string) => void;
}

export function useExcelImport({
  SYS_DATE,
  syncWriteToCloud,
  lang,
  products,
  setProducts,
  categories,
  setCategories,
  showToast,
}: UseExcelImportDeps) {
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

  return {
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
  };
}
