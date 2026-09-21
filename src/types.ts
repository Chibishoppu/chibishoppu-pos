export type ProductCategory = 'keychain' | 'pokemon_tcg' | 'card_holder' | 'accessories' | 'custom_bundle' | 'binders' | 'others';

export interface Product {
  id: string;
  sku: string;
  barcode?: string; // scannable code — defaults to SKU semantics when set
  name: string;
  category: ProductCategory;
  price: number;
  cost: number;
  stock: number;
  lowStockThreshold: number;
  description?: string;
  tags: string[];
  emoji: string;
  imageColor?: string; // Pastel accent for aesthetic badge
  isFeatured?: boolean;
  defectiveStock?: number; // Units marked defective on refund (not sellable)
}

export interface CartModifier {
  id: string;
  name: string;
  priceAdd: number;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  category: ProductCategory;
  emoji: string;
  unitPrice: number;
  unitCost: number;
  quantity: number;
  discountPercent?: number;
  customNote?: string;
  modifiers?: CartModifier[];
}

export interface RefundItemDetail {
  productId: string;
  quantity: number;     // units refunded on this line
  defectiveQty: number; // of those, units marked defective (excluded from restock)
}

export type PaymentMethod = 'cash' | 'qr_pay' | 'card' | 'split';

export interface SplitPaymentDetail {
  cashAmount: number;
  electronicAmount: number;
  electronicMethod: 'qr_pay' | 'card';
}

export type CustomerDiscountType = 'none' | 'cosplayer' | 'booth_neighbor' | 'staff_friend' | 'custom';

export interface Transaction {
  id: string;
  receiptNumber: string;
  timestamp: string; // ISO format
  eventName: string;
  boothNumber: string;
  cashierName: string;
  items: CartItem[];
  subtotal: number;
  discountType: CustomerDiscountType;
  discountRate: number; // e.g. 0.10 for 10%
  discountAmount: number;
  taxRate: number; // e.g. 0 for ACG booths or custom
  taxAmount: number;
  total: number;
  totalCost: number;
  netProfit: number;
  paymentMethod: PaymentMethod;
  tenderedAmount?: number;
  changeGiven?: number;
  splitDetail?: SplitPaymentDetail;
  referenceCode?: string;
  status: 'completed' | 'refunded' | 'voided';
  customerNote?: string;
  refundedAt?: string;   // ISO timestamp of the refund
  refundReason?: string;
  refundedBy?: string;   // cashier who processed the refund
  refundDetails?: RefundItemDetail[];
}

export interface EventConfig {
  eventName: string;
  boothNumber: string;
  cashierName: string;
  currencySymbol: string;
  currencyCode: string;
  openingCashFloat: number;
  taxPercent: number;
  soundEffectsEnabled: boolean;
}

export interface CashDrawerCount {
  timestamp: string;
  hundredBills: number;
  fiftyBills: number;
  twentyBills: number;
  tenBills: number;
  fiveBills: number;
  oneCoinsOrBills: number;
  cents: number;
  totalCounted: number;
  notes?: string;
}

export interface HourlySalesPoint {
  hour: string;
  sales: number;
  count: number;
}

export interface PaymentBreakdown {
  cash: number;
  qr: number;
  card: number;
}

export interface CategorySalesPoint {
  category: string;
  unitsSold: number;
  revenue: number;
  percentage: number;
}

export interface DailySalesReport {
  reportDate: string;
  eventName: string;
  boothNumber: string;
  cashierName: string;
  openingCashFloat: number;
  totalGrossRevenue: number;
  totalDiscounts: number;
  totalTax: number;
  totalCostOfGoods: number;
  netProfit: number;
  transactionCount: number;
  unitsSold: number;
  averageOrderValue: number;
  paymentBreakdown: PaymentBreakdown;
  categorySales: CategorySalesPoint[];
  hourlySales: HourlySalesPoint[];
  transactions: Transaction[];
}
