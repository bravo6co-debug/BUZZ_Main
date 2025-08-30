import { apiService } from './api.service';

export interface AdminCoupon {
  id: string;
  name: string;
  type: 'basic' | 'signup' | 'referral' | 'event';
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  min_purchase_amount?: number;
  max_discount_amount?: number;
  valid_from?: string;
  valid_until?: string;
  total_quantity?: number;
  used_quantity: number;
  applicable_businesses?: string[];
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  issued_count?: number;
  used_count?: number;
  total_discount_amount?: number;
}

export interface AdminCouponDetails extends AdminCoupon {
  statistics: {
    total_issued: number;
    total_used: number;
    active_count: number;
    expired_count: number;
    total_discount: number;
    avg_discount: number;
    usage_rate: string;
    remaining_quantity?: number;
  };
  applicableBusinesses: Array<{
    id: string;
    business_name: string;
    category: string;
    address: string;
  }>;
  recentUsage: Array<{
    id: string;
    issued_at: string;
    used_at?: string;
    status: string;
    used_amount?: number;
    user_name: string;
    user_email: string;
    business_name?: string;
  }>;
}

export interface CouponUsageHistory {
  user_coupon_id: string;
  status: 'active' | 'used' | 'expired';
  issued_at: string;
  used_at?: string;
  used_amount?: number;
  expires_at: string;
  user_id: string;
  user_name: string;
  user_email: string;
  business_id?: string;
  business_name?: string;
}

export interface CouponStatistics {
  timeframe: string;
  overview: {
    total_coupons: number;
    active_coupons: number;
    total_issued: number;
    total_used: number;
    total_discount_amount: number;
    avg_discount_amount: number;
    period_issued: number;
    period_used: number;
    period_discount: number;
    usage_rate: string;
    period_usage_rate: string;
  };
  typeDistribution: Array<{
    type: string;
    coupon_count: number;
    issued_count: number;
    used_count: number;
  }>;
  topCoupons: Array<{
    id: string;
    name: string;
    type: string;
    discount_type: string;
    discount_value: number;
    issued_count: number;
    used_count: number;
    total_discount: number;
    usage_rate: string;
  }>;
  dailyTrend: Array<{
    date: string;
    issued: number;
    used: number;
    discount_amount: number;
  }>;
  generatedAt: string;
}

export interface CreateCouponData {
  name: string;
  type: 'basic' | 'signup' | 'referral' | 'event';
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  min_purchase_amount?: number;
  max_discount_amount?: number;
  valid_from?: string;
  valid_until?: string;
  total_quantity?: number;
  applicable_businesses?: string[];
  description?: string;
}

export interface UpdateCouponData {
  name?: string;
  discount_type?: 'fixed' | 'percentage';
  discount_value?: number;
  min_purchase_amount?: number;
  max_discount_amount?: number;
  valid_from?: string;
  valid_until?: string;
  total_quantity?: number;
  applicable_businesses?: string[];
  status?: 'active' | 'inactive';
}

export interface BulkIssueCouponData {
  couponId: string;
  userIds?: string[];
  userFilters?: {
    role?: 'user' | 'business';
    isActive?: boolean;
    university?: string;
    registeredAfter?: string;
    registeredBefore?: string;
  };
  expirationDays?: number;
}

export interface BulkIssueCouponResult {
  issuedCount: number;
  skippedCount: number;
  totalTargeted: number;
  expiresAt: string;
}

class AdminCouponService {
  private readonly baseUrl = '/admin/coupons';

  // Get all coupons with filters and pagination
  async getCoupons(params?: {
    page?: number;
    limit?: number;
    status?: 'active' | 'inactive';
    type?: 'basic' | 'signup' | 'referral' | 'event';
    search?: string;
  }) {
    try {
      const response = await apiService.get(this.baseUrl, { params });
      return {
        success: true,
        data: response.data.data as AdminCoupon[],
        pagination: response.data.pagination,
        error: null
      };
    } catch (error: any) {
      console.error('Error fetching admin coupons:', error);
      return {
        success: false,
        data: null,
        pagination: null,
        error: error.response?.data?.message || 'Failed to fetch coupons'
      };
    }
  }

  // Get coupon details by ID
  async getCoupon(couponId: string) {
    try {
      const response = await apiService.get(`${this.baseUrl}/${couponId}`);
      return {
        success: true,
        data: response.data.data as AdminCouponDetails,
        error: null
      };
    } catch (error: any) {
      console.error('Error fetching coupon details:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.message || 'Failed to fetch coupon details'
      };
    }
  }

  // Create new coupon
  async createCoupon(couponData: CreateCouponData) {
    try {
      const response = await apiService.post(this.baseUrl, couponData);
      return {
        success: true,
        data: response.data.data as AdminCoupon,
        error: null
      };
    } catch (error: any) {
      console.error('Error creating coupon:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.message || 'Failed to create coupon'
      };
    }
  }

  // Update coupon
  async updateCoupon(couponId: string, updateData: UpdateCouponData) {
    try {
      const response = await apiService.put(`${this.baseUrl}/${couponId}`, updateData);
      return {
        success: true,
        data: response.data.data as AdminCoupon,
        error: null
      };
    } catch (error: any) {
      console.error('Error updating coupon:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.message || 'Failed to update coupon'
      };
    }
  }

  // Delete or deactivate coupon
  async deleteCoupon(couponId: string, permanent: boolean = false) {
    try {
      const response = await apiService.delete(`${this.baseUrl}/${couponId}`, {
        data: { permanent }
      });
      return {
        success: true,
        data: response.data.data,
        error: null
      };
    } catch (error: any) {
      console.error('Error deleting coupon:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.message || 'Failed to delete coupon'
      };
    }
  }

  // Issue coupons to users in bulk
  async issueCoupons(issueData: BulkIssueCouponData) {
    try {
      const response = await apiService.post(`${this.baseUrl}/issue`, issueData);
      return {
        success: true,
        data: response.data.data as BulkIssueCouponResult,
        error: null
      };
    } catch (error: any) {
      console.error('Error issuing coupons:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.message || 'Failed to issue coupons'
      };
    }
  }

  // Get coupon statistics
  async getCouponStatistics(timeframe: 'week' | 'month' | 'year' = 'month') {
    try {
      const response = await apiService.get(`${this.baseUrl}/statistics`, {
        params: { timeframe }
      });
      return {
        success: true,
        data: response.data.data as CouponStatistics,
        error: null
      };
    } catch (error: any) {
      console.error('Error fetching coupon statistics:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.message || 'Failed to fetch statistics'
      };
    }
  }

  // Get coupon usage history
  async getCouponUsageHistory(couponId: string, params?: {
    page?: number;
    limit?: number;
    status?: 'active' | 'used' | 'expired';
  }) {
    try {
      const response = await apiService.get(`${this.baseUrl}/${couponId}/usage`, { params });
      return {
        success: true,
        data: response.data.data as CouponUsageHistory[],
        pagination: response.data.pagination,
        error: null
      };
    } catch (error: any) {
      console.error('Error fetching coupon usage history:', error);
      return {
        success: false,
        data: null,
        pagination: null,
        error: error.response?.data?.message || 'Failed to fetch usage history'
      };
    }
  }

  // Get businesses for coupon targeting
  async getBusinessesForCoupon() {
    try {
      const response = await apiService.get('/admin/businesses', {
        params: { status: 'approved', limit: 100 }
      });
      return {
        success: true,
        data: response.data.data,
        error: null
      };
    } catch (error: any) {
      console.error('Error fetching businesses:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.message || 'Failed to fetch businesses'
      };
    }
  }

  // Validate coupon data
  validateCouponData(data: CreateCouponData | UpdateCouponData): string[] {
    const errors: string[] = [];

    if ('name' in data && data.name) {
      if (data.name.length < 2 || data.name.length > 200) {
        errors.push('쿠폰 이름은 2-200자 사이여야 합니다.');
      }
    }

    if ('discount_value' in data && data.discount_value !== undefined) {
      if (data.discount_value <= 0) {
        errors.push('할인 값은 0보다 커야 합니다.');
      }
      
      if ('discount_type' in data && data.discount_type === 'percentage' && data.discount_value > 100) {
        errors.push('퍼센트 할인율은 100%를 초과할 수 없습니다.');
      }
    }

    if ('min_purchase_amount' in data && data.min_purchase_amount !== undefined) {
      if (data.min_purchase_amount < 0) {
        errors.push('최소 구매 금액은 0 이상이어야 합니다.');
      }
    }

    if ('max_discount_amount' in data && data.max_discount_amount !== undefined) {
      if (data.max_discount_amount < 0) {
        errors.push('최대 할인 금액은 0 이상이어야 합니다.');
      }
    }

    if ('total_quantity' in data && data.total_quantity !== undefined) {
      if (data.total_quantity < 1) {
        errors.push('총 수량은 1 이상이어야 합니다.');
      }
    }

    if ('valid_from' in data && 'valid_until' in data && data.valid_from && data.valid_until) {
      if (new Date(data.valid_from) >= new Date(data.valid_until)) {
        errors.push('유효 시작일은 종료일보다 이전이어야 합니다.');
      }
    }

    return errors;
  }

  // Format discount display text
  formatDiscountText(coupon: AdminCoupon): string {
    if (coupon.discount_type === 'fixed') {
      return `${coupon.discount_value.toLocaleString()}원 할인`;
    } else {
      const maxText = coupon.max_discount_amount 
        ? ` (최대 ${coupon.max_discount_amount.toLocaleString()}원)` 
        : '';
      return `${coupon.discount_value}% 할인${maxText}`;
    }
  }

  // Get coupon type display name
  getCouponTypeDisplayName(type: string): string {
    const typeNames = {
      basic: '기본 쿠폰',
      signup: '가입 쿠폰',
      referral: '추천 쿠폰',
      event: '이벤트 쿠폰'
    };
    return typeNames[type as keyof typeof typeNames] || type;
  }

  // Get coupon status display name
  getCouponStatusDisplayName(status: string): string {
    const statusNames = {
      active: '활성',
      inactive: '비활성'
    };
    return statusNames[status as keyof typeof statusNames] || status;
  }

  // Calculate usage rate percentage
  calculateUsageRate(issued: number, used: number): number {
    if (issued === 0) return 0;
    return Math.round((used / issued) * 100 * 100) / 100; // Round to 2 decimal places
  }

  // Check if coupon is expired
  isCouponExpired(coupon: AdminCoupon): boolean {
    if (!coupon.valid_until) return false;
    return new Date(coupon.valid_until) < new Date();
  }

  // Get days until expiry
  getDaysUntilExpiry(coupon: AdminCoupon): number | null {
    if (!coupon.valid_until) return null;
    const now = new Date();
    const expiry = new Date(coupon.valid_until);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }
}

export const adminCouponService = new AdminCouponService();