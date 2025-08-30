import { supabase } from '../lib/supabase';

export interface Coupon {
  id: string;
  name: string;
  description?: string;
  discount_amount?: number;
  discount_percent?: number;
  business_id?: string;
  valid_from: string;
  valid_until: string;
  usage_limit?: number;
  used_count?: number;
  status: 'active' | 'inactive' | 'expired';
  created_at: string;
}

export interface UserCoupon {
  id: string;
  user_id: string;
  coupon_id: string;
  issued_at: string;
  used_at?: string;
  expires_at: string;
  status: 'active' | 'used' | 'expired';
  coupon?: Coupon;
}

class CouponService {
  // 사용자의 쿠폰 목록 조회
  async getUserCoupons(userId?: string) {
    try {
      let userIdToUse = userId;
      
      // userId가 없으면 현재 로그인한 사용자 ID 사용
      if (!userIdToUse) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        userIdToUse = user.id;
      }

      const { data, error } = await supabase
        .from('user_coupons')
        .select(`
          *,
          coupon:coupons(*)
        `)
        .eq('user_id', userIdToUse)
        .order('issued_at', { ascending: false });

      if (error) throw error;

      // 만료된 쿠폰 상태 업데이트
      const now = new Date();
      const processedData = data?.map(uc => {
        if (uc.status === 'active' && new Date(uc.expires_at) < now) {
          return { ...uc, status: 'expired' };
        }
        return uc;
      });

      return {
        success: true,
        data: processedData,
        error: null
      };
    } catch (error: any) {
      console.error('Error fetching user coupons:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  // 활성 쿠폰만 조회
  async getActiveCoupons() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('user_coupons')
        .select(`
          *,
          coupon:coupons(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('expires_at', now)
        .order('expires_at', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data,
        count: data?.length || 0,
        error: null
      };
    } catch (error: any) {
      console.error('Error fetching active coupons:', error);
      return {
        success: false,
        data: null,
        count: 0,
        error: error.message
      };
    }
  }

  // 쿠폰 발급
  async issueCoupon(couponId: string, userId?: string) {
    try {
      let userIdToUse = userId;
      
      if (!userIdToUse) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        userIdToUse = user.id;
      }

      // 쿠폰 정보 조회
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('id', couponId)
        .single();

      if (couponError || !coupon) throw new Error('Coupon not found');

      // 이미 발급받았는지 확인
      const { data: existing } = await supabase
        .from('user_coupons')
        .select('id')
        .eq('user_id', userIdToUse)
        .eq('coupon_id', couponId)
        .single();

      if (existing) {
        return {
          success: false,
          data: null,
          error: '이미 발급받은 쿠폰입니다'
        };
      }

      // 쿠폰 발급
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30일 후 만료

      const { data, error } = await supabase
        .from('user_coupons')
        .insert({
          user_id: userIdToUse,
          coupon_id: couponId,
          issued_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          status: 'active'
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
      console.error('Error issuing coupon:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  // 쿠폰 사용
  async useCoupon(userCouponId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 쿠폰 상태 확인
      const { data: userCoupon, error: fetchError } = await supabase
        .from('user_coupons')
        .select('*, coupon:coupons(*)')
        .eq('id', userCouponId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !userCoupon) throw new Error('Coupon not found');

      if (userCoupon.status === 'used') {
        return {
          success: false,
          data: null,
          error: '이미 사용된 쿠폰입니다'
        };
      }

      if (userCoupon.status === 'expired' || new Date(userCoupon.expires_at) < new Date()) {
        return {
          success: false,
          data: null,
          error: '만료된 쿠폰입니다'
        };
      }

      // 쿠폰 사용 처리
      const { data, error } = await supabase
        .from('user_coupons')
        .update({
          status: 'used',
          used_at: new Date().toISOString()
        })
        .eq('id', userCouponId)
        .select()
        .single();

      if (error) throw error;

      // 사용 기록 저장
      await supabase
        .from('coupon_usage')
        .insert({
          user_coupon_id: userCouponId,
          user_id: user.id,
          coupon_id: userCoupon.coupon_id,
          business_id: userCoupon.coupon?.business_id,
          used_at: new Date().toISOString()
        });

      return {
        success: true,
        data,
        error: null
      };
    } catch (error: any) {
      console.error('Error using coupon:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  // 사용 가능한 쿠폰 목록 조회 (발급 가능한 쿠폰)
  async getAvailableCoupons() {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('status', 'active')
        .lte('valid_from', now)
        .gte('valid_until', now)
        .order('discount_amount', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data,
        error: null
      };
    } catch (error: any) {
      console.error('Error fetching available coupons:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  // 실시간 구독 - 쿠폰 업데이트 감지
  subscribeToUserCoupons(userId: string, callback: (payload: any) => void) {
    const subscription = supabase
      .channel(`user_coupons:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_coupons',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();

    return subscription;
  }
}

export const couponService = new CouponService();