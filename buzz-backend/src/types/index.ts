export interface User {
  id: string;
  email: string;
  phone?: string;
  name: string;
  role: UserRole;
  authProvider?: AuthProvider;
  providerId?: string;
  avatarUrl?: string;
  isActive: boolean;
  passwordHash?: string;
  mustChangePassword: boolean;
  createdBy?: string;
  lastLoginAt?: Date;
  loginCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface UserProfile {
  userId: string;
  birthDate?: Date;
  gender?: Gender;
  university?: string;
  referralCode: string;
  referrerId?: string;
  marketingAgree: boolean;
  termsAgreedAt: Date;
  privacyAgreedAt: Date;
  createdAt: Date;
}

export interface Business {
  id: string;
  ownerId: string;
  businessName: string;
  businessNumber?: string;
  category: string;
  description?: string;
  address: string;
  addressDetail?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  businessHours?: BusinessHours;
  images?: string[];
  tags?: string[];
  status: BusinessStatus;
  approvedAt?: Date;
  approvedBy?: string;
  suspendedAt?: Date;
  suspensionReason?: string;
  qrScanCount: number;
  avgRating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessApplication {
  id: string;
  email: string;
  passwordHash: string;
  businessInfo: BusinessInfo;
  documents?: string[];
  status: ApplicationStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  approvedUserId?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Coupon {
  id: string;
  name: string;
  type: CouponType;
  discountType: DiscountType;
  discountValue: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  validFrom?: Date;
  validUntil?: Date;
  totalQuantity?: number;
  usedQuantity: number;
  applicableBusinesses?: string[];
  status: CouponStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCoupon {
  id: string;
  userId: string;
  couponId: string;
  issuedAt: Date;
  usedAt?: Date;
  usedBusinessId?: string;
  usedAmount?: number;
  expiresAt: Date;
  status: UserCouponStatus;
  qrCodeData?: string;
}

export interface MileageAccount {
  userId: string;
  balance: number;
  totalEarned: number;
  totalUsed: number;
  totalExpired: number;
  updatedAt: Date;
}

export interface MileageTransaction {
  id: string;
  userId: string;
  businessId?: string;
  type: MileageTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  referenceType?: string;
  referenceId?: string;
  expiresAt?: Date;
  createdAt: Date;
}

export interface Settlement {
  id: string;
  businessId: string;
  settlementDate: Date;
  couponCount: number;
  couponAmount: number;
  mileageCount: number;
  mileageAmount: number;
  totalAmount: number;
  bankName?: string;
  bankAccount?: string;
  status: SettlementStatus;
  requestedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  paidAt?: Date;
  rejectionReason?: string;
  adminNote?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

// Enums
export enum UserRole {
  USER = 'user',
  BUSINESS = 'business',
  ADMIN = 'admin',
}

export enum AuthProvider {
  GOOGLE = 'google',
  KAKAO = 'kakao',
  EMAIL = 'email',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum BusinessStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected',
}

export enum ApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum CouponType {
  SIGNUP = 'signup',
  REFERRAL = 'referral',
  EVENT = 'event',
  BASIC = 'basic',
}

export enum DiscountType {
  FIXED = 'fixed',
  PERCENTAGE = 'percentage',
}

export enum CouponStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum UserCouponStatus {
  ACTIVE = 'active',
  USED = 'used',
  EXPIRED = 'expired',
}

export enum MileageTransactionType {
  EARN = 'earn',
  USE = 'use',
  EXPIRE = 'expire',
  CANCEL = 'cancel',
  REFUND = 'refund',
}

export enum SettlementStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAID = 'paid',
}

// Utility Types
export interface BusinessHours {
  [key: string]: string; // e.g., "mon": "08:00-22:00"
}

export interface BusinessInfo {
  name: string;
  registrationNumber: string;
  category: string;
  address: string;
  phone: string;
  bankAccount: BankAccount;
}

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ErrorCode {
  AUTH_001: 'AUTH_001';
  AUTH_002: 'AUTH_002';
  AUTH_003: 'AUTH_003';
  RATE_001: 'RATE_001';
  VALIDATION_001: 'VALIDATION_001';
  VALIDATION_002: 'VALIDATION_002';
  BUSINESS_001: 'BUSINESS_001';
  BUDGET_001: 'BUDGET_001';
  BUDGET_002: 'BUDGET_002';
}