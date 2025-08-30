import { supabase } from '../lib/supabase';

export interface MileageAccount {
  id: string;
  user_id: string;
  balance: number;
  total_earned: number;
  total_used: number;
  created_at: string;
  updated_at: string;
}

export interface MileageTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'earn' | 'use' | 'expire';
  description: string;
  reference_type?: 'review' | 'purchase' | 'referral' | 'event' | 'qr';
  reference_id?: string;
  business_id?: string;
  balance_after: number;
  created_at: string;
}

class MileageService {
  // 마일리지 계좌 조회
  async getMileageAccount(userId?: string) {
    try {
      let userIdToUse = userId;
      
      if (!userIdToUse) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        userIdToUse = user.id;
      }

      // 마일리지 계좌 조회 또는 생성
      let { data, error } = await supabase
        .from('mileage_accounts')
        .select('*')
        .eq('user_id', userIdToUse)
        .single();

      // 계좌가 없으면 생성
      if (error?.code === 'PGRST116' || !data) {
        const { data: newAccount, error: createError } = await supabase
          .from('mileage_accounts')
          .insert({
            user_id: userIdToUse,
            balance: 0,
            total_earned: 0,
            total_used: 0
          })
          .select()
          .single();

        if (createError) throw createError;
        data = newAccount;
      }

      return {
        success: true,
        data,
        error: null
      };
    } catch (error: any) {
      console.error('Error fetching mileage account:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  // 마일리지 거래 내역 조회
  async getMileageHistory(userId?: string, limit = 20) {
    try {
      let userIdToUse = userId;
      
      if (!userIdToUse) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        userIdToUse = user.id;
      }

      const { data, error } = await supabase
        .from('mileage_transactions')
        .select('*')
        .eq('user_id', userIdToUse)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return {
        success: true,
        data,
        error: null
      };
    } catch (error: any) {
      console.error('Error fetching mileage history:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  // 마일리지 적립
  async earnMileage(amount: number, description: string, referenceType?: string, referenceId?: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 현재 계좌 조회
      const { data: account, error: accountError } = await this.getMileageAccount(user.id);
      if (accountError || !account) throw new Error('Failed to get mileage account');

      const newBalance = (account.data?.balance || 0) + amount;

      // 트랜잭션 시작
      const { error: transactionError } = await supabase.rpc('process_mileage_transaction', {
        p_user_id: user.id,
        p_amount: amount,
        p_type: 'earn',
        p_description: description,
        p_reference_type: referenceType,
        p_reference_id: referenceId
      });

      if (transactionError) throw transactionError;

      return {
        success: true,
        data: {
          amount,
          newBalance,
          description
        },
        error: null
      };
    } catch (error: any) {
      console.error('Error earning mileage:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  // 마일리지 사용
  async useMileage(amount: number, description: string, businessId?: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 현재 계좌 조회
      const { data: accountData } = await this.getMileageAccount(user.id);
      const account = accountData?.data;
      
      if (!account) throw new Error('Mileage account not found');

      // 잔액 확인
      if (account.balance < amount) {
        return {
          success: false,
          data: null,
          error: '마일리지 잔액이 부족합니다'
        };
      }

      const newBalance = account.balance - amount;

      // 트랜잭션 생성
      const { data: transaction, error: transError } = await supabase
        .from('mileage_transactions')
        .insert({
          user_id: user.id,
          amount: -amount, // 사용은 음수로 저장
          type: 'use',
          description,
          business_id: businessId,
          balance_after: newBalance
        })
        .select()
        .single();

      if (transError) throw transError;

      // 계좌 업데이트
      const { error: updateError } = await supabase
        .from('mileage_accounts')
        .update({
          balance: newBalance,
          total_used: account.total_used + amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      return {
        success: true,
        data: {
          amount,
          newBalance,
          transaction
        },
        error: null
      };
    } catch (error: any) {
      console.error('Error using mileage:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  // QR 코드로 마일리지 적립
  async earnMileageByQR(qrCode: string, businessId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // QR 코드 검증
      const { data: qr, error: qrError } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('code', qrCode)
        .eq('business_id', businessId)
        .single();

      if (qrError || !qr) {
        return {
          success: false,
          data: null,
          error: '유효하지 않은 QR 코드입니다'
        };
      }

      // 만료 확인
      if (new Date(qr.expires_at) < new Date()) {
        return {
          success: false,
          data: null,
          error: '만료된 QR 코드입니다'
        };
      }

      // 이미 사용 확인
      if (qr.used_at) {
        return {
          success: false,
          data: null,
          error: '이미 사용된 QR 코드입니다'
        };
      }

      // 마일리지 적립
      const earnResult = await this.earnMileage(
        qr.mileage_amount || 100,
        `QR 적립 - ${qr.description || '매장 방문'}`,
        'qr',
        qr.id
      );

      if (earnResult.success) {
        // QR 코드 사용 처리
        await supabase
          .from('qr_codes')
          .update({
            used_at: new Date().toISOString(),
            used_by: user.id
          })
          .eq('id', qr.id);
      }

      return earnResult;
    } catch (error: any) {
      console.error('Error earning mileage by QR:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  // 리뷰 작성으로 마일리지 적립
  async earnMileageForReview(reviewId: string, businessName: string) {
    return this.earnMileage(
      500, // 리뷰 작성 시 500P 적립
      `리뷰 작성 - ${businessName}`,
      'review',
      reviewId
    );
  }

  // 추천인 보너스 마일리지
  async earnReferralBonus(referrerId: string, referredName: string) {
    return this.earnMileage(
      1000, // 추천 보너스 1000P
      `추천 보너스 - ${referredName}님 가입`,
      'referral',
      referrerId
    );
  }

  // 실시간 구독 - 마일리지 변경 감지
  subscribeTomileageUpdates(userId: string, callback: (payload: any) => void) {
    const subscription = supabase
      .channel(`mileage:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mileage_accounts',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();

    return subscription;
  }
}

export const mileageService = new MileageService();