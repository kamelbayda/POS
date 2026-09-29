/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  barcode: string;
  barcodes?: string[];
  category: string;
  priceUSD: number;
  priceLBP?: number;
  quantity: number; // Current stock in system
  warehouseQuantity?: number; // Stock stored in warehouse
  expiryDate: string; // YYYY-MM-DD
  isExpired?: boolean;
  // --- NEW PROPERTIES FROM ROADMAP SCHEMA ---
  sku?: string;
  priceWholesale?: number;
  minWholesaleQty?: number;
  costPriceUSD?: number;
  image?: string; // Base64 or image URL
  isWeighed?: boolean; // Is sold by weight using scale
  plu?: string; // PLU code for electronic scales
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  priceUSD: number;
  quantity: number;
  totalUSD: number;
  // --- NEW PROPERTIES FROM ROADMAP SCHEMA ---
  priceType?: 'retail' | 'wholesale';
  discountApplied?: number;
  promotionId?: string;
  returnedQty?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  time: string;
  items: InvoiceItem[];
  subtotalUSD: number;
  discountUSD: number;
  totalUSD: number;
  totalLBP: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'debt'; // added debt for late customer payment as per customers table
  cashier: string;
  exchangeRate: number;
  paidAmountUSD?: number;
  paidAmountLBP?: number;
  changeAmountUSD?: number;
  changeAmountLBP?: number;
  // --- NEW PROPERTIES FROM ROADMAP SCHEMA ---
  barcode?: string; // invoice printed barcode identifier
  saleType?: 'retail' | 'wholesale';
  hasReturn?: boolean;
  returnRef?: string;
  customerId?: string; // linked customer for debt and loyalty calculation
  note?: string; // invoice custom notes/comments
  taxRate?: number;
  taxUSD?: number;
  deliveryUSD?: number;
}

export interface StockCountItem {
  productId: string;
  name: string;
  barcode: string;
  category: string;
  priceUSD: number;
  systemStock: number;
  actualStock: number;
  difference: number;
  expiryDate: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'cashier' | 'accountant';
  password?: string;
}

export interface PrinterConfig {
  id: string;
  name: string;
  connectionType: 'USB' | 'Network' | 'Serial' | 'Bluetooth';
  paperWidth: '58mm' | '80mm' | 'A4' | 'A5';
  address: string; // e.g. 'USB001', '192.168.1.100'
}

export interface PrinterAssignments {
  receiptEnabled: boolean;
  receiptPrinterId: string; // customer receipts
  kitchenEnabled: boolean;
  kitchenPrinterId: string; // kitchen / order tickets
  targetPrinterId: string; // A4 reports and invoices
  logEnabled?: boolean;
}

export interface SystemSettings {
  shopName: string;
  exchangeRate: number; // e.g. 89000 LBP per 1 USD
  lowStockThreshold: number; // alarm when stock is less than this
  expiryAlertDays: number; // alarm when product expires in N days
  receiptFooter: string;
  defaultMarginPercent?: number; // default profit margin percent (e.g. 15%)
  receiptFontSize?: number; // font size percentage (e.g. 100 for 100%, 80 for 80%)
  receiptMarginTop?: number; // margin top in mm
  receiptMarginRight?: number; // margin right in mm
  receiptMarginBottom?: number; // margin bottom in mm
  receiptMarginLeft?: number; // margin left in mm
  posGridSize?: 'auto' | '3x3' | '4x4' | '5x5' | '6x6';
  receiptLogoBase64?: string;
  requireQtyPrompt?: boolean;
  shopLogo?: string;
  // --- BUSINESS INFORMATION PROPERTIES ---
  taxId?: string;
  phone?: string;
  address?: string;
  commercialRegistry?: string;
  businessEmail?: string;
  businessActivity?: string;
  // --- PRINTER SETTINGS FOR ARONIUM REPLICA ---
  printersList?: PrinterConfig[];
  printerAssignments?: PrinterAssignments;
  directSilentPrint?: boolean;
  cashDrawerCodes?: string;
  cashDrawerEnabled?: boolean;
}

// --- NEW DATA TABLES FROM THE 18-TABLE ADVANCED ROADMAP ---

export interface ReturnRecord {
  id: string;
  invoiceId: string;
  invoiceNumber?: string;
  productId: string;
  productName?: string;
  qty: number;
  quantity?: number;
  reason: string;
  action: 'cash' | 'swap' | 'credit';
  refundAmountUSD?: number;
  refundMethod?: 'cash' | 'credit';
  customerId?: string;
  date: string;
}

export interface WasteRecord {
  id: string;
  productId: string;
  productName?: string;
  qty: number;
  quantity?: number;
  type: 'damage' | 'expired' | 'entry_error';
  reason?: 'expired' | 'damaged_on_shelf' | 'theft_loss';
  cost: number;
  estimatedLossUSD?: number;
  compensationStatus?: 'loss' | 'compensated';
  date: string;
  note?: string;
}

export interface Promotion {
  id: string;
  type: 'percentage' | 'bxgy' | 'bundle'; // percent discount, buy X get Y, zمني bundles
  value: number; // discount percent or bundle price
  buyX?: number;
  getY?: number;
  daysOfWeek: number[]; // days [0-6] this is active
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  active: boolean;
  productId?: string; // target product for single-item discount
  name?: string; // custom title of the combo/bundle
  bundleProducts?: Array<{ productId: string; quantity: number }>; // products inside the bundle combo
  discountType?: 'percentage' | 'fixed'; // custom type for single discounts
  barcode?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  type: 'retail' | 'wholesale';
  loyaltyPoints: number;
  creditBalance: number; // dept customer can buy with
  debtLimit?: number; // debt threshold allowed
}

export interface ExpenseRecord {
  id: string;
  title: string;
  category: 'rent' | 'electricity' | 'salaries' | 'generator' | 'other';
  amountUSD: number;
  date: string;
}

export interface PurchaseItem {
  id: string;
  productId: string;
  productName: string;
  qty: number;
  costPriceUSD: number;
  newPriceUSD: number;
  newPriceWholesale?: number;
  expiryDate?: string;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  date: string;
  items: PurchaseItem[];
  totalAmountUSD: number;
  paymentStatus: 'paid' | 'pending';
  note?: string;
  destination?: 'shop' | 'warehouse';
  transportationCostUSD?: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  companyName?: string;
  debtBalance: number; // money we owe them (e.g., from ongoing procurement)
}

export interface WarehouseTransfer {
  id: string;
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  date: string;
  time: string;
  note?: string;
}


/** A product with the derived expiry / sales-activity flags computed in App.tsx. */
export interface ProcessedProduct extends Product {
  isExpired: boolean;
  isNearExpiry: boolean;
  lastSoldDate: string | null;
  daysSinceLastSale: number | null;
  isStagnant: boolean;
}

/** A parked/secondary cart ("invoice tab") on the POS screen. */
export interface CartSession {
  id: string;
  label: string;
  cart: CartItem[];
  discountInput: string;
  paidUSDInput: string;
  paidLBPInput: string;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'debt';
  posSaleType: 'retail' | 'wholesale';
  selectedCustomerId: string;
  voidedCartItemIds?: string[];
  noteInput?: string;
}
