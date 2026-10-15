import type {
  User,
  Session,
  BuyerLimit,
  Sale,
  SaleItem,
  SellingPointStock,
  CentralStock,
  StockLedger,
  SmsLog,
  AuditLog,
  Size as PrismaSize,
  Role as PrismaRole,
  LedgerType as PrismaLedgerType,
  SmsStatus as PrismaSmsStatus,
  AuditAction as PrismaAuditAction,
} from '@prisma/client';

// Re-export Prisma model types
export type {
  User,
  Session,
  BuyerLimit,
  Sale,
  SaleItem,
  SellingPointStock,
  CentralStock,
  StockLedger,
  SmsLog,
  AuditLog,
};

// Size enum type & runtime values
export type Size = 'S' | 'M' | 'L' | 'XL' | 'XXL';
export const Size = {
  S: 'S',
  M: 'M',
  L: 'L',
  XL: 'XL',
  XXL: 'XXL',
} as const;

export const SIZES: readonly Size[] = ['S', 'M', 'L', 'XL', 'XXL'] as const;

// Role enum type & runtime values
export type Role = 'SELLER' | 'ADMIN';
export const Role = {
  SELLER: 'SELLER',
  ADMIN: 'ADMIN',
} as const;

// LedgerType enum type & runtime values
export type LedgerType = 'STOCK_IN' | 'ASSIGN' | 'SALE';
export const LedgerType = {
  STOCK_IN: 'STOCK_IN',
  ASSIGN: 'ASSIGN',
  SALE: 'SALE',
} as const;

// SmsStatus enum type & runtime values
export type SmsStatus = 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED';
export const SmsStatus = {
  QUEUED: 'QUEUED',
  SENDING: 'SENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
} as const;

// AuditAction enum type & runtime values
export type AuditAction =
  | 'LOGIN'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'REGISTER'
  | 'SALE_CREATED'
  | 'STOCK_IN'
  | 'STOCK_ASSIGNED'
  | 'CSV_EXPORT'
  | 'SMS_SENT'
  | 'SMS_FAILED'
  | 'PASSWORD_CHANGED';
export const AuditAction = {
  LOGIN: 'LOGIN',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  REGISTER: 'REGISTER',
  SALE_CREATED: 'SALE_CREATED',
  STOCK_IN: 'STOCK_IN',
  STOCK_ASSIGNED: 'STOCK_ASSIGNED',
  CSV_EXPORT: 'CSV_EXPORT',
  SMS_SENT: 'SMS_SENT',
  SMS_FAILED: 'SMS_FAILED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
} as const;

// API Response type
export type ApiResponse<T> =
  | { success: true; data: T; error?: never; details?: never }
  | { success: false; error: string; details?: unknown; data?: never };

// Authenticated session user
export interface SessionUser {
  userId: string;
  role: Role;
  fullName: string;
  phone: string;
  sellingPointName?: string | null;
}

// Error types
export type SaleError =
  | 'BUYER_LIMIT_REACHED'
  | 'INSUFFICIENT_STOCK'
  | 'DUPLICATE_SALE';

export class SaleServiceError extends Error {
  code: SaleError;
  details?: unknown;

  constructor(code: SaleError, message: string, details?: unknown) {
    super(message);
    this.name = 'SaleServiceError';
    this.code = code;
    this.details = details;
  }
}

export class StockServiceError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'StockServiceError';
    this.code = code;
    this.details = details;
  }
}

// Buyer limit status
export interface BuyerLimitStatus {
  totalBought: number;
  remaining: number;
  canBuy: boolean;
}

// Create sale params
export interface CreateSaleParams {
  sellerId: string;
  sellingPointName: string;
  buyerPhone: string;
  sizes: Size[];
  idempotencyKey: string;
  ipAddress?: string | null;
}

// Sale with items included
export type SaleWithItems = Sale & {
  items: SaleItem[];
};

// Stock types
export interface StockItem {
  size: Size;
  quantity: number;
}

export interface SellingPointStockSummary {
  sellingPointName: string;
  stocks: StockItem[];
}

export interface AssignStockItem {
  size: Size;
  quantity: number;
}

export interface AssignStockParams {
  sellingPointName: string;
  items: AssignStockItem[];
  adminId: string;
}

// Dashboard types
export interface SalesBySellingPoint {
  sellingPoint: string;
  count: number;
  totalSold: number;
}

export interface SalesBySize {
  size: Size;
  count: number;
}

export interface DailySalesTrend {
  date: string;
  orderCount: number;
  totalSold: number;
}

export interface TopSellingPoint {
  sellingPoint: string;
  totalSold: number;
  totalOrders: number;
}

export interface SellingPointStockOverview {
  sellingPointName: string;
  stocks: StockItem[];
  totalAssigned: number;
  totalSold: number;
  totalAvailable: number;
}

export interface StockOverviewData {
  centralRemaining: StockItem[];
  sellingPoints: SellingPointStockOverview[];
}

export interface DashboardData {
  totalSold: number;
  totalOrders: number;
  totalSellers: number;
  salesBySellingPoint: SalesBySellingPoint[];
  salesBySize: SalesBySize[];
  dailySalesTrend: DailySalesTrend[];
  topSellingPoints: TopSellingPoint[];
  stockOverview: StockOverviewData;
  buyersAtLimit: number;
}

// Daily summary breakdown
export interface SellingPointDailySummary {
  sellingPointName: string;
  totalSold: number;
  bySize: Record<Size, number>;
}

export interface DailySummaryData {
  date: string;
  sellingPoints: SellingPointDailySummary[];
  grandTotal: number;
  remainingCentralStock: StockItem[];
}

// Filter and pagination types
export interface SalesListFilters {
  sellingPoint?: string;
  dateFrom?: string | Date;
  dateTo?: string | Date;
  size?: Size;
  buyerPhone?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface SalesListRow {
  serialNo: number;
  orderId: string;
  sellingPoint: string;
  sellerName: string;
  buyerPhone: string;
  size: Size;
  dateTime: Date;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type SalesListData = PaginatedResult<SalesListRow>;

export interface StockInHistoryRow {
  id: string;
  type: LedgerType;
  size: Size;
  quantity: number;
  sellingPointName?: string | null;
  referenceId?: string | null;
  userId: string;
  createdAt: Date;
}

export interface AssignmentHistoryRow {
  id: string;
  type: LedgerType;
  size: Size;
  quantity: number;
  sellingPointName: string | null;
  referenceId?: string | null;
  userId: string;
  createdAt: Date;
}

export interface SmsLogRow {
  id: string;
  saleId: string | null;
  recipient: string;
  message: string;
  status: SmsStatus;
  providerResponse: string | null;
  attempts: number;
  lastAttemptAt: Date | null;
  createdAt: Date;
}

export interface CsvColumnDef<T> {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
}
