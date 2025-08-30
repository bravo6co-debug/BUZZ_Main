import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface QRScanEvent {
  id: string;
  business_id: string;
  customer_id: string;
  type: 'coupon' | 'mileage';
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

class RealtimeQRService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private scanCallbacks: Map<string, (event: QRScanEvent) => void> = new Map();

  // QR 스캔 이벤트 구독
  subscribeToQRScans(businessId: string, callback: (event: QRScanEvent) => void) {
    const channelName = `qr_scans:${businessId}`;
    
    // 기존 채널이 있으면 재사용
    if (this.channels.has(channelName)) {
      this.scanCallbacks.set(channelName, callback);
      return this.channels.get(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'qr_scans',
          filter: `business_id=eq.${businessId}`
        },
        (payload) => {
          const scanEvent = payload.new as QRScanEvent;
          callback(scanEvent);
          
          // 자동으로 처리 상태 업데이트
          this.processScanEvent(scanEvent);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'qr_scans',
          filter: `business_id=eq.${businessId}`
        },
        (payload) => {
          const scanEvent = payload.new as QRScanEvent;
          callback(scanEvent);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    this.scanCallbacks.set(channelName, callback);

    return channel;
  }

  // QR 스캔 이벤트 처리
  private async processScanEvent(event: QRScanEvent) {
    try {
      // 처리 중 상태로 변경
      await this.updateScanStatus(event.id, 'processing');

      // 타입에 따라 처리
      if (event.type === 'coupon') {
        await this.processCouponScan(event);
      } else if (event.type === 'mileage') {
        await this.processMileageScan(event);
      }

      // 완료 상태로 변경
      await this.updateScanStatus(event.id, 'completed');
    } catch (error) {
      console.error('Error processing scan event:', error);
      await this.updateScanStatus(event.id, 'failed');
    }
  }

  // 쿠폰 스캔 처리
  private async processCouponScan(event: QRScanEvent) {
    const { data: coupon } = await supabase
      .from('user_coupons')
      .select('*')
      .eq('id', event.data.coupon_id)
      .single();

    if (!coupon || coupon.is_used) {
      throw new Error('Invalid or already used coupon');
    }

    // 쿠폰 사용 처리
    await supabase
      .from('user_coupons')
      .update({ 
        is_used: true, 
        used_at: new Date().toISOString(),
        used_business_id: event.business_id
      })
      .eq('id', event.data.coupon_id);

    // 실시간 알림 전송
    await this.sendNotification(
      event.customer_id,
      'coupon',
      '쿠폰 사용 완료',
      `${event.data.discount}원 할인 쿠폰이 사용되었습니다.`
    );
  }

  // 마일리지 스캔 처리
  private async processMileageScan(event: QRScanEvent) {
    const { points, action } = event.data;

    if (action === 'earn') {
      // 마일리지 적립
      await supabase
        .from('mileage_transactions')
        .insert({
          user_id: event.customer_id,
          business_id: event.business_id,
          amount: points,
          type: 'earned',
          description: `QR 스캔 적립 - ${points}P`
        });

      await this.sendNotification(
        event.customer_id,
        'mileage',
        '마일리지 적립',
        `${points}P가 적립되었습니다.`
      );
    } else if (action === 'use') {
      // 마일리지 사용
      await supabase
        .from('mileage_transactions')
        .insert({
          user_id: event.customer_id,
          business_id: event.business_id,
          amount: -points,
          type: 'used',
          description: `QR 스캔 사용 - ${points}P`
        });

      await this.sendNotification(
        event.customer_id,
        'mileage',
        '마일리지 사용',
        `${points}P가 사용되었습니다.`
      );
    }
  }

  // 스캔 상태 업데이트
  async updateScanStatus(scanId: string, status: QRScanEvent['status']) {
    await supabase
      .from('qr_scans')
      .update({ status })
      .eq('id', scanId);
  }

  // 실시간 알림 전송
  private async sendNotification(userId: string, type: string, title: string, message: string) {
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        read: false
      });
  }

  // QR 코드 생성 (비즈니스용)
  async generateBusinessQR(businessId: string, type: 'coupon' | 'mileage', data: any) {
    const qrData = {
      business_id: businessId,
      type,
      data,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5분 만료
    };

    const { data: qrCode, error } = await supabase
      .from('qr_codes')
      .insert(qrData)
      .select()
      .single();

    if (error) throw error;
    return qrCode;
  }

  // QR 코드 검증
  async validateQRCode(qrCodeId: string): Promise<boolean> {
    const { data: qrCode } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('id', qrCodeId)
      .single();

    if (!qrCode) return false;

    const now = new Date();
    const expiresAt = new Date(qrCode.expires_at);
    
    // 만료 확인
    if (now > expiresAt) return false;
    
    // 이미 사용됨 확인
    if (qrCode.used_at) return false;

    return true;
  }

  // QR 스캔 기록 생성
  async createScanRecord(
    businessId: string,
    customerId: string,
    type: 'coupon' | 'mileage',
    data: any
  ): Promise<QRScanEvent | null> {
    try {
      const { data: scanRecord, error } = await supabase
        .from('qr_scans')
        .insert({
          business_id: businessId,
          customer_id: customerId,
          type,
          data,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return scanRecord;
    } catch (error) {
      console.error('Error creating scan record:', error);
      return null;
    }
  }

  // 최근 스캔 기록 조회
  async getRecentScans(businessId: string, limit = 10): Promise<QRScanEvent[]> {
    try {
      const { data, error } = await supabase
        .from('qr_scans')
        .select(`
          *,
          profiles:customer_id (
            name,
            email
          )
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent scans:', error);
      return [];
    }
  }

  // 구독 해제
  unsubscribe(businessId: string) {
    const channelName = `qr_scans:${businessId}`;
    const channel = this.channels.get(channelName);
    
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
      this.scanCallbacks.delete(channelName);
    }
  }

  // 모든 구독 해제
  unsubscribeAll() {
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.scanCallbacks.clear();
  }
}

export const realtimeQRService = new RealtimeQRService();