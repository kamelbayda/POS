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
  purchaseTaxRate?: number; // VAT % on the last purchase; costPriceUSD includes it
  // Remembered from the last purchase so the next invoice line starts the same way
  lastPurchaseCostUSD?: number; // supplier unit price before discount and VAT
  purchaseDiscountPercent?: number;
  bonusEvery?: number; // supplier bonus: for every N bought...
  bonusFree?: number; // ...M more come free
  // Operating cost on top of the purchase cost (see lib/operatingCost.ts)
  operatingCostUSD?: number; // fixed $ per unit
  operatingCostPercent?: number; // % of the purchase cost
  unitsPerCarton?: number; // units in one supplier carton/pack (purchases can be entered in cartons)
  // Phone shops: each unit has its own IMEI / serial number
  trackSerial?: boolean;
  serialNumbers?: string[]; // IMEIs in stock, one per unit
  warrantyMonths?: number; // warranty given with each unit sold
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  serials?: string[]; // IMEIs picked for a serial-tracked product (quantity = serials.length)
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
  serials?: string[]; // IMEIs sold; the first returnedQty of them came back
  warrantyUntil?: string; // YYYY-MM-DD
  unitCostUSD?: number; // cost of a line that is not a stock product (e.g. repair parts)
}

/** Phone shops: a used phone bought from a customer. */
export interface TradeIn {
  id: string;
  number: string; // TI-0001
  date: string;
  sellerName: string;
  sellerPhone: string;
  sellerIdNumber: string; // ID card / passport, for the ownership declaration
  customerId?: string;
  device: string;
  imei: string;
  condition: 'excellent' | 'good' | 'fair';
  batteryHealth?: number;
  notes?: string;
  pricePaidUSD: number;
  sellPriceUSD: number;
  payment: 'cash' | 'credit' | 'exchange'; // credit = kept on the customer's account; exchange = swapped for a device from stock
  productId: string; // the used phone put on sale
  purchaseInvoiceId?: string;
  /** Exchange: the device the customer took instead, and who paid the difference. */
  exchange?: {
    productId: string;
    productName: string;
    imei?: string;
    priceUSD: number;
    invoiceId: string;
    invoiceNumber: string;
    differenceUSD: number; // > 0 the customer paid it, < 0 the shop paid it
    differenceMethod: 'cash' | 'debt';
  };
}

/** Phone shops: a device left for repair. */
export type RepairStatus = 'received' | 'in_progress' | 'waiting_parts' | 'ready' | 'delivered' | 'cancelled';
export interface RepairTicket {
  id: string;
  ticketNumber: string; // REP-0001
  date: string; // YYYY-MM-DD received
  customerName: string;
  customerPhone: string;
  customerId?: string;
  device: string; // brand / model
  imei?: string;
  problem: string;
  accessories?: string; // what was left with the device (charger, case, SIM...)
  devicePasscode?: string;
  estimateUSD: number;
  depositUSD: number;
  expectedDate?: string;
  status: RepairStatus;
  finalCostUSD?: number;
  partsCostUSD?: number;
  technicianNote?: string;
  history: Array<{ date: string; status: RepairStatus; note?: string }>;
  deliveredAt?: string;
  invoiceId?: string; // sales invoice created on delivery
}

/** Phone shops: the shop's prepaid credit with a mobile operator (Alfa / Touch). */
export interface TopupWallet {
  id: string; // 'alfa' | 'touch' | custom
  name: string;
  balance: number; // credit dollars the shop can still transfer
  avgCostUSD: number; // what the shop paid per 1$ of credit (weighted average)
  sellRateUSD: number; // default price per 1$ of credit sold
  loads?: Array<{ date: string; credit: number; paidUSD: number }>;
}

export interface InstallmentDue {
  dueDate: string; // YYYY-MM-DD
  amountUSD: number;
  paidUSD: number;
  paidDate?: string;
}

/** Phone shops: a sale paid over several months. */
export interface InstallmentPlan {
  id: string;
  number: string; // INS-0001
  date: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  description: string; // device / IMEI
  invoiceId?: string; // the debt sale it schedules
  priceUSD: number; // amount owed before the down payment
  downPaymentUSD: number;
  markupPercent: number;
  totalUSD: number; // financed amount incl. markup, split over the months
  months: number;
  guarantorName?: string;
  guarantorPhone?: string;
  schedule: InstallmentDue[];
  payments: Array<{ date: string; amountUSD: number }>;
  status: 'active' | 'done';
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
  email?: string; // login and account recovery (lowercase)
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
  businessType?: 'supermarket' | 'phones'; // kind of shop; missing = supermarket
  shopUid?: string; // this shop's id (same on all its computers); a licence key serves one shop
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
  taxRate?: number; // VAT % charged by the supplier on costPriceUSD (which is before VAT)
  discountPercent?: number; // supplier discount on this line, applied before VAT
  freeQty?: number; // bonus units received free on top of qty
  serials?: string[]; // IMEIs received (serial-tracked products)
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
  taxUSD?: number; // total VAT on the items, included in totalAmountUSD
  discountUSD?: number; // total supplier discount, already taken off totalAmountUSD
  // Free goods given for the whole invoice; their value is spread as a discount over all units
  offerFreeItems?: Array<{ productId: string; productName: string; qty: number; unitValueUSD: number }>;
  offerFreeValueUSD?: number;
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
