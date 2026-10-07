/**
 * Demo data per kind of shop. A new install is seeded with the supermarket demo before the
 * owner picks the kind of shop; once a phone shop is chosen, whatever is still untouched demo
 * data (every record a demo one) is swapped for the phone-shop demo, and back.
 */
import { Category, Customer, Invoice, Product, Supplier } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_CUSTOMERS, DEFAULT_SUPPLIERS, getSeededInvoices, getSeededProducts } from '../mockData';
import { toISODate, parseISODate } from './date';

type ShopKind = 'supermarket' | 'phones';

export const PHONE_CATEGORIES: Category[] = [
  { id: 'phones', name: 'هواتف جديدة', emoji: '📱' },
  { id: 'used-phones', name: 'تلفونات مستعملة', emoji: '📲' },
  { id: 'chargers', name: 'شواحن وكابلات', emoji: '🔌' },
  { id: 'accessories', name: 'سماعات وإكسسوارات', emoji: '🎧' },
  { id: 'covers', name: 'كفرات ولزقات', emoji: '🛡️' },
  { id: 'storage', name: 'ميموري وفلاشات', emoji: '💾' },
];

const FAR = '2099-12-31';
const item = (id: string, name: string, barcode: string, category: string, priceUSD: number, costPriceUSD: number, quantity: number, extra: Partial<Product> = {}): Product =>
  ({ id, name, barcode, category, priceUSD, costPriceUSD, quantity, expiryDate: FAR, priceWholesale: Math.round(priceUSD * 0.92 * 100) / 100, ...extra });
const imeis = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${String(i + 1).padStart(3, '0')}`);

export const getPhoneSeedProducts = (): Product[] => [
  item('ph-prod-1', 'iPhone 15 128GB', '0194253401', 'phones', 780, 720, 3, { trackSerial: true, serialNumbers: imeis('356789110000', 3), warrantyMonths: 12 }),
  item('ph-prod-2', 'Samsung Galaxy A15 128GB', '8806095301', 'phones', 165, 140, 2, { trackSerial: true, serialNumbers: imeis('352345670000', 2), warrantyMonths: 12 }),
  item('ph-prod-3', 'Redmi Note 13 256GB', '6941812701', 'phones', 210, 180, 2, { trackSerial: true, serialNumbers: imeis('861234560000', 2), warrantyMonths: 12 }),
  item('ph-prod-4', 'شاحن سامسونج أصلي 25W', '8806090001', 'chargers', 12, 6.5, 20),
  item('ph-prod-5', 'كابل Type-C إلى Lightning 1م', '6970000001', 'chargers', 5, 2, 30),
  item('ph-prod-6', 'باور بنك 10000mAh', '6970000002', 'chargers', 20, 12, 10),
  item('ph-prod-7', 'شاحن سيارة سريع USB-C', '6970000003', 'chargers', 8, 4, 6),
  item('ph-prod-8', 'سماعات بلوتوث لاسلكية', '6970000004', 'accessories', 18, 9, 15),
  item('ph-prod-9', 'ساعة ذكية رياضية', '6970000005', 'accessories', 35, 22, 4),
  item('ph-prod-10', 'كفر آيفون 15 سيليكون', '6970000006', 'covers', 6, 2, 25),
  item('ph-prod-11', 'لزقة شاشة زجاج 9D', '6970000007', 'covers', 3, 0.6, 50),
  item('ph-prod-12', 'ميموري SanDisk 64GB', '6970000008', 'storage', 9, 5, 12),
];

export const PHONE_SUPPLIERS: Supplier[] = [
  { id: 'ph-supp-1', name: 'موزع سامسونج المعتمد', phone: '01555123', companyName: 'Samsung Distributor', debtBalance: 0 },
  { id: 'ph-supp-2', name: 'شركة الشرق للإكسسوارات', phone: '03444555', companyName: 'Orient Accessories', debtBalance: 150 },
  { id: 'ph-supp-3', name: 'موزع آبل - بيروت', phone: '01777888', companyName: 'Apple Reseller Beirut', debtBalance: 0 },
];

const WHOLESALE_CUSTOMER: Record<ShopKind, string> = { supermarket: 'سوبرماركت النجمة (موزع)', phones: 'محل الأمل للخلوي (جملة)' };

export const getPhoneSeedInvoices = (currentDateStr: string): Invoice[] => {
  const day = (offset: number) => { const d = parseISODate(currentDateStr); d.setDate(d.getDate() - offset); return toISODate(d); };
  const inv = (id: string, n: string, date: string, time: string, lines: Array<[string, string, number, number]>, paymentMethod: Invoice['paymentMethod'], customerId?: string): Invoice => {
    const total = lines.reduce((s, [, , p, q]) => s + p * q, 0);
    return {
      id, invoiceNumber: n, date, time,
      items: lines.map(([productId, productName, priceUSD, quantity]) => ({ productId, productName, priceUSD, quantity, totalUSD: priceUSD * quantity, priceType: 'retail' as const })),
      subtotalUSD: total, discountUSD: 0, totalUSD: total, totalLBP: total * 90000,
      paymentMethod, cashier: 'المدير المسؤول', exchangeRate: 90000, saleType: 'retail',
      ...(paymentMethod === 'cash' ? { paidAmountUSD: total } : {}),
      ...(customerId ? { customerId } : {}),
    };
  };
  return [
    inv('ph-inv-1', 'INV-2026-0001', day(1), '13:10', [['ph-prod-10', 'كفر آيفون 15 سيليكون', 6, 1], ['ph-prod-11', 'لزقة شاشة زجاج 9D', 3, 1]], 'cash'),
    inv('ph-inv-2', 'INV-2026-0002', day(0), '10:05', [['ph-prod-4', 'شاحن سامسونج أصلي 25W', 12, 1], ['ph-prod-5', 'كابل Type-C إلى Lightning 1م', 5, 1]], 'card'),
    inv('ph-inv-3', 'INV-2026-0003', day(0), '12:40', [['ph-prod-8', 'سماعات بلوتوث لاسلكية', 18, 1]], 'cash', 'cust-1'),
  ];
};

const demoOf = (kind: ShopKind, today: string) => kind === 'phones'
  ? { products: getPhoneSeedProducts(), categories: PHONE_CATEGORIES, suppliers: PHONE_SUPPLIERS, invoices: getPhoneSeedInvoices(today) }
  : { products: getSeededProducts(today), categories: DEFAULT_CATEGORIES, suppliers: DEFAULT_SUPPLIERS, invoices: getSeededInvoices(today) };

const onlyDemo = (rows: Array<{ id: string }>, demo: Array<{ id: string }>, extra: string[] = []) => {
  const ids = new Set([...demo.map(r => r.id), ...extra]);
  return rows.length > 0 && rows.every(r => ids.has(r.id));
};

export interface ShopData { products: Product[]; categories: Category[]; suppliers: Supplier[]; customers: Customer[]; invoices: Invoice[] }

/** What to replace so the untouched demo data matches the kind of shop (null = nothing to do). */
export function demoSwap(kind: ShopKind, data: ShopData, today: string): Partial<ShopData> | null {
  const other: ShopKind = kind === 'phones' ? 'supermarket' : 'phones';
  const from = demoOf(other, today);
  const to = demoOf(kind, today);
  const out: Partial<ShopData> = {};
  if (onlyDemo(data.products, from.products)) out.products = to.products;
  if (onlyDemo(data.categories, from.categories, ['used-phones'])) out.categories = to.categories;
  if (onlyDemo(data.suppliers, from.suppliers)) out.suppliers = to.suppliers;
  const demoInvoiceIds = new Set(from.invoices.map(i => i.id));
  if (data.invoices.some(i => demoInvoiceIds.has(i.id))) {
    const kept = data.invoices.filter(i => !demoInvoiceIds.has(i.id));
    out.invoices = kept.length ? kept : to.invoices;
  }
  if (onlyDemo(data.customers, DEFAULT_CUSTOMERS)) {
    const renamed = data.customers.map(c => (c.id === 'cust-4' && c.name === WHOLESALE_CUSTOMER[other] ? { ...c, name: WHOLESALE_CUSTOMER[kind] } : c));
    if (renamed.some((c, i) => c !== data.customers[i])) out.customers = renamed;
  }
  return Object.keys(out).length ? out : null;
}
