// Mock coupon data for development
export interface Coupon {
  id: string;
  name: string;
  description: string;
  type: 'basic' | 'signup' | 'event' | 'store';
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  validFrom: Date;
  validUntil: Date;
  applicableBusinesses?: string[]; // 특정 매장에서만 사용 가능
  businessNames?: string[]; // 매장 이름들
  status: 'active' | 'used' | 'expired';
  usedAt?: Date;
  usedBusinessName?: string;
}

// Mock data
export const mockUserCoupons: Coupon[] = [
  {
    id: 'coupon-1',
    name: '기본 할인 쿠폰',
    description: '모든 매장에서 사용 가능한 기본 할인',
    type: 'basic',
    discountType: 'fixed',
    discountValue: 3000,
    minPurchaseAmount: 10000,
    validFrom: new Date('2024-12-01'),
    validUntil: new Date('2024-12-31'),
    status: 'active'
  },
  {
    id: 'coupon-2',
    name: '신규 가입 축하 쿠폰',
    description: '가입 축하 특별 할인',
    type: 'signup',
    discountType: 'fixed',
    discountValue: 5000,
    minPurchaseAmount: 15000,
    validFrom: new Date('2024-12-01'),
    validUntil: new Date('2025-01-31'),
    status: 'active'
  },
  {
    id: 'coupon-3',
    name: '크리스마스 이벤트',
    description: '12월 한정 특별 할인',
    type: 'event',
    discountType: 'percentage',
    discountValue: 30,
    maxDiscountAmount: 10000,
    minPurchaseAmount: 20000,
    validFrom: new Date('2024-12-01'),
    validUntil: new Date('2024-12-25'),
    status: 'active'
  },
  {
    id: 'coupon-4',
    name: '카페 브라운 전용',
    description: '카페 브라운에서만 사용 가능',
    type: 'store',
    discountType: 'percentage',
    discountValue: 20,
    maxDiscountAmount: 5000,
    applicableBusinesses: ['store-1'],
    businessNames: ['카페 브라운'],
    validFrom: new Date('2024-12-01'),
    validUntil: new Date('2024-12-31'),
    status: 'active'
  },
  {
    id: 'coupon-5',
    name: '아메리카노 무료',
    description: '아메리카노 1잔 무료 제공',
    type: 'store',
    discountType: 'fixed',
    discountValue: 4500,
    applicableBusinesses: ['store-3'],
    businessNames: ['힐링 카페'],
    validFrom: new Date('2024-12-01'),
    validUntil: new Date('2024-12-15'),
    status: 'active'
  },
  {
    id: 'coupon-6',
    name: '런치 할인 쿠폰',
    description: '점심 시간 특별 할인 (11:30 - 14:00)',
    type: 'event',
    discountType: 'fixed',
    discountValue: 2000,
    minPurchaseAmount: 8000,
    applicableBusinesses: ['store-2'],
    businessNames: ['맛있는 식당'],
    validFrom: new Date('2024-12-01'),
    validUntil: new Date('2024-12-31'),
    status: 'active'
  },
  {
    id: 'coupon-7',
    name: '첫 구매 할인',
    description: '첫 구매 고객 특별 할인',
    type: 'event',
    discountType: 'percentage',
    discountValue: 50,
    maxDiscountAmount: 15000,
    minPurchaseAmount: 10000,
    validFrom: new Date('2024-11-01'),
    validUntil: new Date('2024-11-30'),
    status: 'expired'
  },
  {
    id: 'coupon-8',
    name: '블랙프라이데이',
    description: '블랙프라이데이 특별 할인',
    type: 'event',
    discountType: 'fixed',
    discountValue: 10000,
    minPurchaseAmount: 30000,
    validFrom: new Date('2024-11-24'),
    validUntil: new Date('2024-11-25'),
    status: 'used',
    usedAt: new Date('2024-11-24'),
    usedBusinessName: '맛있는 식당'
  }
];

// Helper functions
export const getActiveCoupons = () => {
  return mockUserCoupons.filter(c => c.status === 'active');
};

export const getUsedCoupons = () => {
  return mockUserCoupons.filter(c => c.status === 'used');
};

export const getExpiredCoupons = () => {
  return mockUserCoupons.filter(c => c.status === 'expired');
};

export const getCouponById = (id: string) => {
  return mockUserCoupons.find(c => c.id === id);
};

export const formatDiscountText = (coupon: Coupon) => {
  if (coupon.discountType === 'fixed') {
    return `${coupon.discountValue.toLocaleString()}원 할인`;
  } else {
    const maxText = coupon.maxDiscountAmount 
      ? ` (최대 ${coupon.maxDiscountAmount.toLocaleString()}원)` 
      : '';
    return `${coupon.discountValue}% 할인${maxText}`;
  }
};

export const getDaysUntilExpiry = (coupon: Coupon) => {
  if (coupon.status !== 'active') return null;
  
  const now = new Date();
  const expiry = new Date(coupon.validUntil);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
};

export const isExpiringSoon = (coupon: Coupon) => {
  const days = getDaysUntilExpiry(coupon);
  return days !== null && days <= 7 && days > 0;
};