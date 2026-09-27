/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Category, SystemSettings, User, Invoice, Customer, Promotion, ExpenseRecord, Supplier } from './types';
import { toISODate, parseISODate } from './lib/date';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'dairy', name: 'ألبان وأجبان', emoji: '🥛' },
  { id: 'bakery', name: 'مخبوزات وحلويات', emoji: '🍞' },
  { id: 'beverages', name: 'المشروبات والعصائر', emoji: '🥤' },
  { id: 'canned', name: 'المعلبات والمونة', emoji: '🥫' },
  { id: 'snacks', name: 'تسالي وشيبس', emoji: '🍿' },
  { id: 'cleaning', name: 'منظفات ومواد عناية', emoji: '🧼' },
];

export const DEFAULT_SETTINGS: SystemSettings = {
  shopName: 'سوبرماركت البركة',
  exchangeRate: 90000, // 90,000 LBP fixed/editable rate
  lowStockThreshold: 10,
  expiryAlertDays: 10,
  receiptFooter: 'شكراً لزيارتكم! يرجى مراجعة الفاتورة قبل المغادرة.',
  defaultMarginPercent: 15,
  receiptFontSize: 100,
  receiptMarginTop: 4,
  receiptMarginRight: 4,
  receiptMarginBottom: 4,
  receiptMarginLeft: 4,
  posGridSize: 'auto',
  printersList: [
    { id: 'p-default-receipt', name: 'XP-80 POS Thermal', connectionType: 'USB', paperWidth: '80mm', address: 'USB001' },
    { id: 'p-default-laser', name: 'HP LaserJet 400 M402', connectionType: 'Network', paperWidth: 'A4', address: '192.168.1.50' },
    { id: 'p-default-kitchen', name: 'POS-80 Kitchen Printer', connectionType: 'USB', paperWidth: '80mm', address: 'USB002' }
  ],
  printerAssignments: {
    receiptEnabled: true,
    receiptPrinterId: 'p-default-receipt',
    kitchenEnabled: false,
    kitchenPrinterId: 'p-default-kitchen',
    targetPrinterId: 'p-default-laser'
  },
  directSilentPrint: true,
  cashDrawerCodes: '27,112,0,148,49',
  cashDrawerEnabled: true
};

export const DEFAULT_USERS: User[] = [
  { id: '1', username: 'admin', name: 'المدير المسؤول (كامل)', role: 'admin' },
  { id: '2', username: 'kaseer', name: 'كاشير الورديات (أحمد)', role: 'cashier' },
  { id: '3', username: 'accounting', name: 'المحاسب العام (سمير)', role: 'accountant' },
];

export const DEFAULT_CUSTOMERS: Customer[] = [
  { id: 'cust-1', name: 'أحمد الحريري', phone: '03123456', type: 'wholesale', loyaltyPoints: 340, creditBalance: 45.00 },
  { id: 'cust-2', name: 'ليلى خوري', phone: '70987654', type: 'retail', loyaltyPoints: 120, creditBalance: 0.00 },
  { id: 'cust-3', name: 'عماد عبد الله', phone: '71112233', type: 'retail', loyaltyPoints: 80, creditBalance: 12.50 },
  { id: 'cust-4', name: 'سوبرماركت النجمة (موزع)', phone: '05998877', type: 'wholesale', loyaltyPoints: 1200, creditBalance: 250.00 }
];

export const DEFAULT_SUPPLIERS: Supplier[] = [
  { id: 'supp-1', name: 'موزع شركة بيبسي لبنان', phone: '01484848', companyName: 'PepsiCo Lebanon', debtBalance: 200.00 },
  { id: 'supp-2', name: 'شركة فاندوم الغذائية', phone: '05432109', companyName: 'Fandome Foods', debtBalance: 0.00 },
  { id: 'supp-3', name: 'ألبان وأجبان تعنايل', phone: '08544332', companyName: 'Taanayel Dairy', debtBalance: 125.00 },
  { id: 'supp-4', name: 'مخبز ومطاحن البقاع الفنية', phone: '08600100', companyName: 'Bekaa Mills', debtBalance: 0.00 }
];

export const DEFAULT_PROMOTIONS: Promotion[] = [
  {
    id: 'promo-1',
    type: 'bxgy',
    value: 100, // Buy 2 Get 1 Free (100% discount on the third item)
    buyX: 2,
    getY: 1,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    active: true
  },
  {
    id: 'promo-2',
    type: 'percentage',
    value: 15, // 15% discount on bulk purchases
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startDate: '2026-05-01',
    endDate: '2026-07-31',
    active: true
  }
];

export const DEFAULT_EXPENSES: ExpenseRecord[] = [
  { id: 'exp-1', title: 'اشتراك مولد الحي', category: 'generator', amountUSD: 85.00, date: '21-05-2026' },
  { id: 'exp-2', title: 'إيجار المحل لشهر أيار', category: 'rent', amountUSD: 300.00, date: '01-05-2026' },
  { id: 'exp-3', title: 'راتب صانع التوصيل', category: 'salaries', amountUSD: 180.00, date: '25-05-2026' }
];

export const getSeededProducts = (currentDateStr: string): Product[] => {
  const current = parseISODate(currentDateStr);
  
  // Format helpers
  const addDays = (d: Date, days: number): string => {
    const copy = new Date(d);
    copy.setDate(copy.getDate() + days);
    return toISODate(copy);
  };

  const subDays = (d: Date, days: number): string => {
    const copy = new Date(d);
    copy.setDate(copy.getDate() - days);
    return toISODate(copy);
  };

  return [
    {
      id: 'prod-1',
      name: 'حليب نيدو مجفف 900غ',
      barcode: '1111',
      category: 'dairy',
      priceUSD: 14.50,
      quantity: 15,
      expiryDate: addDays(current, 180),
      sku: 'DY-NID-900',
      priceWholesale: 13.10,
      minWholesaleQty: 3
    },
    {
      id: 'prod-2',
      name: 'لبنة بلدية طازجة 1كغ',
      barcode: '2222',
      category: 'dairy',
      priceUSD: 4.20,
      quantity: 12,
      expiryDate: subDays(current, 3), // Already expired
      sku: 'DY-LAB-1KG',
      priceWholesale: 3.80,
      minWholesaleQty: 5
    },
    {
      id: 'prod-3',
      name: 'جبنة قشقوان عكاوي 500غ',
      barcode: '3333',
      category: 'dairy',
      priceUSD: 6.80,
      quantity: 8, // Low stock
      expiryDate: addDays(current, 4), // Near Expiry
      sku: 'DY-QSH-500',
      priceWholesale: 6.00,
      minWholesaleQty: 4
    },
    {
      id: 'prod-4',
      name: 'ربطة خبز لبناني كبير',
      barcode: '4444',
      category: 'bakery',
      priceUSD: 1.00,
      quantity: 45,
      expiryDate: addDays(current, 2),
      sku: 'BK-BRD-LRG',
      priceWholesale: 0.85,
      minWholesaleQty: 10
    },
    {
      id: 'prod-5',
      name: 'كرواسون شوكولاتة طازج',
      barcode: '5555',
      category: 'bakery',
      priceUSD: 1.20,
      quantity: 4,
      expiryDate: subDays(current, 1), // Expired
      sku: 'BK-CR-CHO',
      priceWholesale: 1.00,
      minWholesaleQty: 6
    },
    {
      id: 'prod-6',
      name: 'بيبسي عائلي 2.25 لتر',
      barcode: '6666',
      category: 'beverages',
      priceUSD: 1.50,
      quantity: 30,
      expiryDate: addDays(current, 240),
      sku: 'BV-PEP-2.25',
      priceWholesale: 1.30,
      minWholesaleQty: 12
    },
    {
      id: 'prod-7',
      name: 'عصير راني تفاح 1 لتر',
      barcode: '7777',
      category: 'beverages',
      priceUSD: 1.10,
      quantity: 25,
      expiryDate: addDays(current, 120),
      sku: 'BV-RAN-APP',
      priceWholesale: 0.95,
      minWholesaleQty: 10
    },
    {
      id: 'prod-8',
      name: 'حلاوة طحينية بالشرش 400غ',
      barcode: '8888',
      category: 'canned',
      priceUSD: 3.50,
      quantity: 14,
      expiryDate: addDays(current, 360),
      sku: 'CN-HLV-400',
      priceWholesale: 3.10,
      minWholesaleQty: 5
    },
    {
      id: 'prod-9',
      name: 'علبة سردين فيليه حار',
      barcode: '9999',
      category: 'canned',
      priceUSD: 0.90,
      quantity: 3,
      expiryDate: addDays(current, 450),
      sku: 'CN-SRD-HOT',
      priceWholesale: 0.78,
      minWholesaleQty: 15
    },
    {
      id: 'prod-10',
      name: 'شيبس ديربي ملح وخل كبير',
      barcode: '1010',
      category: 'snacks',
      priceUSD: 0.50,
      quantity: 60,
      expiryDate: addDays(current, 90),
      sku: 'SN-DRB-SLC',
      priceWholesale: 0.42,
      minWholesaleQty: 24
    },
    {
      id: 'prod-11',
      name: 'أرز بسمتي هندي ممتاز 5كغ',
      barcode: '1122',
      category: 'canned',
      priceUSD: 8.90,
      quantity: 11,
      expiryDate: addDays(current, 540),
      sku: 'CN-RCE-5KG',
      priceWholesale: 8.00,
      minWholesaleQty: 3
    },
    {
      id: 'prod-12',
      name: 'مسحوق غسيل أريال 2.5كغ',
      barcode: '1212',
      category: 'cleaning',
      priceUSD: 9.50,
      quantity: 6,
      expiryDate: addDays(current, 720),
      sku: 'CL-ARI-2.5',
      priceWholesale: 8.70,
      minWholesaleQty: 4
    }
  ];
};

export const getSeededInvoices = (currentDateStr: string): Invoice[] => {
  const current = parseISODate(currentDateStr);
  const formatDate = (offset: number) => {
    const d = new Date(current);
    d.setDate(d.getDate() - offset);
    return toISODate(d);
  };

  return [
    {
      id: 'inv-1',
      invoiceNumber: 'INV-2026-0001',
      date: formatDate(1),
      time: '14:23',
      items: [
        { productId: 'prod-1', productName: 'حليب نيدو مجفف 900غ', priceUSD: 14.50, quantity: 1, totalUSD: 14.50, priceType: 'retail' },
        { productId: 'prod-6', productName: 'بيبسي عائلي 2.25 لتر', priceUSD: 1.50, quantity: 2, totalUSD: 3.00, priceType: 'retail' },
        { productId: 'prod-10', productName: 'شيبس ديربي ملح وخل كبير', priceUSD: 0.50, quantity: 4, totalUSD: 2.00, priceType: 'retail' }
      ],
      subtotalUSD: 19.50,
      discountUSD: 1.50,
      totalUSD: 18.00,
      totalLBP: 18.00 * 90000,
      paymentMethod: 'cash',
      cashier: 'المدير المسؤول (كامل)',
      exchangeRate: 90000,
      paidAmountUSD: 20,
      changeAmountUSD: 2,
      barcode: 'TXN-98273618',
      saleType: 'retail'
    },
    {
      id: 'inv-2',
      invoiceNumber: 'INV-2026-0002',
      date: formatDate(0),
      time: '09:12',
      items: [
        { productId: 'prod-4', productName: 'ربطة خبز لبناني كبير', priceUSD: 1.00, quantity: 3, totalUSD: 3.00, priceType: 'retail' },
        { productId: 'prod-3', productName: 'جبنة قشقوان عكاوي 500غ', priceUSD: 6.80, quantity: 1, totalUSD: 6.80, priceType: 'retail' }
      ],
      subtotalUSD: 9.80,
      discountUSD: 0.00,
      totalUSD: 9.80,
      totalLBP: 9.80 * 90000,
      paymentMethod: 'card',
      cashier: 'كاشير الورديات (أحمد)',
      exchangeRate: 90000,
      barcode: 'TXN-41920384',
      saleType: 'retail'
    },
    {
      id: 'inv-3',
      invoiceNumber: 'INV-2026-0003',
      date: formatDate(0),
      time: '11:45',
      items: [
        { productId: 'prod-11', productName: 'أرز بسمتي هندي ممتاز 5كغ', priceUSD: 8.00, quantity: 2, totalUSD: 16.00, priceType: 'wholesale' },
        { productId: 'prod-7', productName: 'عصير راني تفاح 1 لتر', priceUSD: 0.95, quantity: 5, totalUSD: 4.75, priceType: 'wholesale' }
      ],
      subtotalUSD: 20.75,
      discountUSD: 0.00,
      totalUSD: 20.75,
      totalLBP: 20.75 * 90000,
      paymentMethod: 'cash',
      cashier: 'المدير المسؤول (كامل)',
      exchangeRate: 90000,
      paidAmountLBP: 1867500,
      barcode: 'TXN-55610287',
      saleType: 'wholesale',
      customerId: 'cust-1'
    }
  ];
};
