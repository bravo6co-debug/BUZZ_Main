import { supabase } from '../lib/supabase';

export interface TimeSlot {
  morning: boolean;   // 06:00-11:00
  lunch: boolean;     // 11:00-14:00
  dinner: boolean;    // 17:00-21:00
  night: boolean;     // 21:00-02:00
}

export interface Business {
  id: string;
  name: string;
  category: string;
  description?: string;
  address: string;
  phone?: string;
  image_url?: string;
  rating?: number;
  review_count?: number;
  is_featured?: boolean;
  status: 'active' | 'inactive' | 'pending';
  display_time_slots?: TimeSlot;
  created_at: string;
  updated_at: string;
}

export interface BusinessCategory {
  id: string;
  name: string;
  icon?: string;
}

class BusinessService {
  // 비즈니스 목록 조회
  async getBusinesses(filters?: {
    category?: string;
    search?: string;
    is_featured?: boolean;
    limit?: number;
    offset?: number;
  }) {
    try {
      let query = supabase
        .from('businesses')
        .select('*', { count: 'exact' })
        .eq('status', 'active');

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      if (filters?.is_featured !== undefined) {
        query = query.eq('is_featured', filters.is_featured);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error, count } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data,
        count,
        error: null
      };
    } catch (error: any) {
      console.error('Error fetching businesses:', error);
      return {
        success: false,
        data: null,
        count: 0,
        error: error.message
      };
    }
  }

  // 추천 비즈니스 조회
  async getFeaturedBusinesses(limit = 6) {
    return this.getBusinesses({ is_featured: true, limit });
  }

  // 페이지네이션을 지원하는 모든 비즈니스 조회
  async getAllBusinessesWithPagination(options: {
    limit?: number;
    offset?: number;
    category?: string;
    search?: string;
    timeSlot?: 'morning' | 'lunch' | 'dinner' | 'night' | 'all';
  } = {}) {
    try {
      const { limit = 20, offset = 0, category, search, timeSlot } = options;
      
      let query = supabase
        .from('businesses')
        .select('*', { count: 'exact' })
        .eq('status', 'active');

      // 카테고리 필터
      if (category && category !== '전체') {
        query = query.eq('category', category);
      }

      // 검색 필터
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      // 시간대 필터링 (JSONB 쿼리)
      if (timeSlot && timeSlot !== 'all') {
        query = query.eq(`display_time_slots->>${timeSlot}`, true);
      }

      // 페이지네이션
      query = query
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
        error: null
      };
    } catch (error: any) {
      console.error('Error fetching businesses with pagination:', error);
      return {
        success: false,
        data: [],
        total: 0,
        hasMore: false,
        error: error.message
      };
    }
  }

  // 인기 매장 조회 (평점 기준)
  async getPopularBusinesses(limit = 6) {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('status', 'active')
        .not('rating', 'is', null)
        .order('rating', { ascending: false })
        .order('review_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        error: null
      };
    } catch (error: any) {
      console.error('Error fetching popular businesses:', error);
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  // 비즈니스 상세 조회
  async getBusinessById(id: string) {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        error: null
      };
    } catch (error: any) {
      console.error('Error fetching business:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  // 카테고리 목록 조회
  async getCategories() {
    try {
      const { data, error } = await supabase
        .from('business_categories')
        .select('*')
        .order('name');

      if (error) throw error;

      return {
        success: true,
        data,
        error: null
      };
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  // 비즈니스 생성 (관리자/사업자용)
  async createBusiness(businessData: Partial<Business>) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('businesses')
        .insert({
          ...businessData,
          owner_id: user.id,
          status: 'pending' // 새 비즈니스는 승인 대기 상태로 시작
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        error: null
      };
    } catch (error: any) {
      console.error('Error creating business:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  // 비즈니스 업데이트 (관리자/사업자용)
  async updateBusiness(id: string, updates: Partial<Business>) {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        error: null
      };
    } catch (error: any) {
      console.error('Error updating business:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  // 비즈니스 삭제 (관리자용)
  async deleteBusiness(id: string) {
    try {
      // Soft delete - status를 inactive로 변경
      const { data, error } = await supabase
        .from('businesses')
        .update({ status: 'inactive' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        error: null
      };
    } catch (error: any) {
      console.error('Error deleting business:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  // 비즈니스 승인 (관리자용)
  async approveBusiness(id: string) {
    return this.updateBusiness(id, { status: 'active' });
  }

  // 비즈니스 통계 조회
  async getBusinessStats(businessId: string) {
    try {
      // 여러 테이블에서 통계 데이터 수집
      const [reviews, coupons, qrScans] = await Promise.all([
        // 리뷰 통계
        supabase
          .from('reviews')
          .select('rating', { count: 'exact' })
          .eq('business_id', businessId),
        
        // 쿠폰 사용 통계
        supabase
          .from('coupon_usage')
          .select('*', { count: 'exact' })
          .eq('business_id', businessId),
        
        // QR 스캔 통계
        supabase
          .from('qr_codes')
          .select('*', { count: 'exact' })
          .eq('business_id', businessId)
          .not('used_at', 'is', null)
      ]);

      // 평균 평점 계산
      let avgRating = 0;
      if (reviews.data && reviews.data.length > 0) {
        const totalRating = reviews.data.reduce((sum, r) => sum + (r.rating || 0), 0);
        avgRating = totalRating / reviews.data.length;
      }

      return {
        success: true,
        data: {
          reviewCount: reviews.count || 0,
          averageRating: avgRating,
          couponUsageCount: coupons.count || 0,
          qrScanCount: qrScans.count || 0
        },
        error: null
      };
    } catch (error: any) {
      console.error('Error fetching business stats:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  // 현재 시간에 해당하는 시간대 반환
  getCurrentTimeSlot(): keyof TimeSlot | null {
    const now = new Date();
    const hours = now.getHours();
    
    if (hours >= 6 && hours < 11) {
      return 'morning';
    } else if (hours >= 11 && hours < 14) {
      return 'lunch';
    } else if (hours >= 17 && hours < 21) {
      return 'dinner';
    } else if (hours >= 21 || hours < 2) {
      return 'night';
    }
    
    return null; // 노출 시간대 외
  }

  // 시간대별 비즈니스 조회
  async getBusinessesByTimeSlot(filters?: {
    category?: string;
    search?: string;
    is_featured?: boolean;
    time_slot?: keyof TimeSlot | 'current';
    limit?: number;
    offset?: number;
  }) {
    try {
      let query = supabase
        .from('businesses')
        .select('*', { count: 'exact' })
        .eq('status', 'active');

      // 기본 필터 적용
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      if (filters?.is_featured !== undefined) {
        query = query.eq('is_featured', filters.is_featured);
      }

      // 시간대 필터 적용
      if (filters?.time_slot) {
        const targetSlot = filters.time_slot === 'current' 
          ? this.getCurrentTimeSlot() 
          : filters.time_slot;
        
        if (targetSlot) {
          // PostgreSQL JSONB 쿼리로 해당 시간대가 true인 비즈니스만 선택
          query = query.eq(`display_time_slots->${targetSlot}`, true);
        }
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error, count } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data,
        count,
        error: null
      };
    } catch (error: any) {
      console.error('Error fetching businesses by time slot:', error);
      return {
        success: false,
        data: null,
        count: 0,
        error: error.message
      };
    }
  }

  // 현재 시간대 기준 추천 비즈니스 조회
  async getCurrentTimeSlotBusinesses(limit = 6) {
    return this.getBusinessesByTimeSlot({ 
      time_slot: 'current', 
      limit 
    });
  }

  // 실시간 구독 - 비즈니스 업데이트 감지
  subscribeToBusinessUpdates(businessId: string, callback: (payload: any) => void) {
    const subscription = supabase
      .channel(`business:${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'businesses',
          filter: `id=eq.${businessId}`
        },
        callback
      )
      .subscribe();

    return subscription;
  }
}

export const businessService = new BusinessService();