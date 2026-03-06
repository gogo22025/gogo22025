
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  INVENTORY = 'INVENTORY',
  SALES = 'SALES',
  PURCHASES = 'PURCHASES',
  PARTNERS = 'PARTNERS',
  STAFF = 'STAFF',
  SAFE = 'SAFE',
  INVOICES = 'INVOICES',
  SETTINGS = 'SETTINGS',
  REPORTS = 'REPORTS'
}

export type UserRole = 'ADMIN' | 'SALES_REP' | 'DELIVERY' | 'WAREHOUSE';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  permissions: AppView[];
}

export interface PriceLog {
  oldPrice: number;
  newPrice: number;
  date: string;
  timestamp: number;
  userId: string;
  userName: string;
  source: 'INVENTORY' | 'SALE' | 'PURCHASE';
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
  reorderThreshold?: number;
  priceHistory?: PriceLog[];
}

export interface StaffMember {
  id: string;
  name: string;
  username: string;
  password: string;
  role: UserRole;
  phone: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'BUSY';
  permissions: AppView[];
  currentInventory: { productId: string; name: string; quantity: number }[];
  totalCollection: number;
  performancePoints: number; // نقاط الأداء للمندوب
}

export interface Partner {
  id: string;
  name: string;
  type: 'CUSTOMER' | 'SUPPLIER';
  phone: string;
  address: string;
  balance: number;
  loyaltyPoints: number; // نقاط الولاء للعميل
}

export interface InvoiceItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Transaction {
  id: string;
  date: string;
  timestamp: number;
  type: 'SALE' | 'PURCHASE' | 'DISPATCH' | 'RETURN' | 'EXPENSE' | 'INCOME';
  partnerName: string; 
  staffId?: string;
  amount: number; // Total amount (Final)
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  status: 'PAID' | 'PENDING' | 'CANCELLED' | 'COMPLETED';
  items: InvoiceItem[];
  notes?: string;
  qrCodeData?: string; // For E-Invoicing
}

export interface BillingSettings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  taxNumber: string;
  logoUrl: string;
  vatPercentage: number;
  currency: string;
}
