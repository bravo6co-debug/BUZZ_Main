import { supabase } from '../lib/supabase';
import QRCode from 'qrcode';

export interface QRCodeData {
  id: string;
  business_id: string;
  code: string;
  type: 'coupon' | 'mileage' | 'payment';
  amount?: number;
  mileage_amount?: number;
  description?: string;
  expires_at: string;
  used_at?: string;
  used_by?: string;
  created_at: string;
}

class QRService {
  // QR 코드 생성 (사업자용)
  async generateQRCode(businessId: string, type: QRCodeData['type'], data: {
    amount?: number;
    mileageAmount?: number;
    description?: string;
    expiryMinutes?: number;
  }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 고유 코드 생성
      const code = `BUZZ_${type.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // 만료 시간 설정 (기본 5분)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + (data.expiryMinutes || 5));

      // DB에 QR 코드 정보 저장
      const { data: qrData, error } = await supabase
        .from('qr_codes')
        .insert({
          business_id: businessId,
          code,
          type,
          amount: data.amount,
          mileage_amount: data.mileageAmount,
          description: data.description,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // QR 코드 이미지 생성
      const qrImage = await this.generateQRImage(code);

      return {
        success: true,
        data: {
          ...qrData,
          qrImage
        },
        error: null
      };
    } catch (error: any) {
      console.error('Error generating QR code:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  // QR 코드 이미지 생성
  async generateQRImage(data: string): Promise<string> {
    try {
      const qrImage = await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        margin: 1,
        width: 300,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      return qrImage;
    } catch (error) {
      console.error('Error generating QR image:', error);
      return '';
    }
  }

  // QR 코드 검증 및 사용
  async validateAndUseQR(code: string, userId?: string) {
    try {
      let userIdToUse = userId;
      
      if (!userIdToUse) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        userIdToUse = user.id;
      }

      // QR 코드 조회
      const { data: qr, error: qrError } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('code', code)
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

      // QR 코드 사용 처리
      const { data: updatedQR, error: updateError } = await supabase
        .from('qr_codes')
        .update({
          used_at: new Date().toISOString(),
          used_by: userIdToUse
        })
        .eq('id', qr.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // 타입별 처리
      let processResult;
      switch (qr.type) {
        case 'coupon':
          // 쿠폰 발급 처리
          processResult = await this.processCouponQR(qr, userIdToUse);
          break;
        case 'mileage':
          // 마일리지 적립 처리
          processResult = await this.processMileageQR(qr, userIdToUse);
          break;
        case 'payment':
          // 결제 처리
          processResult = await this.processPaymentQR(qr, userIdToUse);
          break;
        default:
          processResult = { success: true, message: 'QR 코드가 처리되었습니다' };
      }

      return {
        success: true,
        data: {
          qr: updatedQR,
          ...processResult
        },
        error: null
      };
    } catch (error: any) {
      console.error('Error validating QR code:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  // 쿠폰 QR 처리
  private async processCouponQR(qr: QRCodeData, userId: string) {
    try {
      // 쿠폰 발급 로직
      const { data, error } = await supabase
        .from('user_coupons')
        .insert({
          user_id: userId,
          business_id: qr.business_id,
          amount: qr.amount,
          description: qr.description || 'QR 쿠폰',
          issued_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일 후
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: `${qr.amount}원 쿠폰이 발급되었습니다`,
        coupon: data
      };
    } catch (error: any) {
      return {
        success: false,
        message: '쿠폰 발급 실패',
        error: error.message
      };
    }
  }

  // 마일리지 QR 처리
  private async processMileageQR(qr: QRCodeData, userId: string) {
    try {
      const amount = qr.mileage_amount || 100;
      
      // 마일리지 적립
      const { data: transaction, error } = await supabase
        .from('mileage_transactions')
        .insert({
          user_id: userId,
          business_id: qr.business_id,
          amount,
          type: 'earn',
          description: qr.description || 'QR 적립',
          reference_type: 'qr',
          reference_id: qr.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // 마일리지 계좌 업데이트
      const { data: account } = await supabase
        .from('mileage_accounts')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (account) {
        await supabase
          .from('mileage_accounts')
          .update({
            balance: account.balance + amount,
            total_earned: account.total_earned + amount,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      } else {
        // 계좌가 없으면 생성
        await supabase
          .from('mileage_accounts')
          .insert({
            user_id: userId,
            balance: amount,
            total_earned: amount,
            total_used: 0
          });
      }

      return {
        success: true,
        message: `${amount}P가 적립되었습니다`,
        transaction
      };
    } catch (error: any) {
      return {
        success: false,
        message: '마일리지 적립 실패',
        error: error.message
      };
    }
  }

  // 결제 QR 처리
  private async processPaymentQR(qr: QRCodeData, userId: string) {
    try {
      // 결제 처리 로직 (실제 결제 연동 필요)
      const { data, error } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          business_id: qr.business_id,
          amount: qr.amount,
          qr_code_id: qr.id,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: `${qr.amount}원 결제가 요청되었습니다`,
        payment: data
      };
    } catch (error: any) {
      return {
        success: false,
        message: '결제 처리 실패',
        error: error.message
      };
    }
  }

  // QR 코드 목록 조회 (사업자용)
  async getBusinessQRCodes(businessId: string, includeUsed = false) {
    try {
      let query = supabase
        .from('qr_codes')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (!includeUsed) {
        query = query.is('used_at', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data,
        error: null
      };
    } catch (error: any) {
      console.error('Error fetching QR codes:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  // QR 코드 통계 조회 (사업자용)
  async getQRStatistics(businessId: string) {
    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('business_id', businessId);

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        used: data?.filter(qr => qr.used_at).length || 0,
        expired: data?.filter(qr => new Date(qr.expires_at) < new Date() && !qr.used_at).length || 0,
        active: data?.filter(qr => new Date(qr.expires_at) >= new Date() && !qr.used_at).length || 0,
        byType: {
          coupon: data?.filter(qr => qr.type === 'coupon').length || 0,
          mileage: data?.filter(qr => qr.type === 'mileage').length || 0,
          payment: data?.filter(qr => qr.type === 'payment').length || 0
        }
      };

      return {
        success: true,
        data: stats,
        error: null
      };
    } catch (error: any) {
      console.error('Error fetching QR statistics:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }
}

export const qrService = new QRService();