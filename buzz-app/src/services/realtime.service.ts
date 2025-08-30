import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Notification {
  id: string;
  user_id: string;
  type: 'coupon' | 'mileage' | 'review' | 'qr' | 'referral' | 'system';
  title: string;
  message: string;
  icon?: string;
  link?: string;
  read: boolean;
  created_at: string;
}

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private notificationCallbacks: Map<string, (notification: Notification) => void> = new Map();

  // 실시간 알림 구독
  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    const channelName = `notifications:${userId}`;
    
    // 기존 채널이 있으면 재사용
    if (this.channels.has(channelName)) {
      this.notificationCallbacks.set(channelName, callback);
      return this.channels.get(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const notification = payload.new as Notification;
          callback(notification);
          
          // 브라우저 알림 표시 (권한이 있는 경우)
          this.showBrowserNotification(notification);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    this.notificationCallbacks.set(channelName, callback);

    return channel;
  }

  // 쿠폰 발급 실시간 알림
  subscribeToCouponUpdates(userId: string, callback: (coupon: any) => void) {
    const channelName = `user_coupons:${userId}`;
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_coupons',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          callback(payload.new);
          
          // 알림 생성
          await this.createNotification(
            userId,
            'coupon',
            '새 쿠폰 도착!',
            '새로운 쿠폰이 발급되었습니다.',
            '🎫'
          );
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  // 마일리지 변동 실시간 알림
  subscribeToMileageUpdates(userId: string, callback: (transaction: any) => void) {
    const channelName = `mileage:${userId}`;
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mileage_transactions',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          const transaction = payload.new as any;
          callback(transaction);
          
          // 알림 생성
          const type = transaction.type === 'earn' ? '적립' : '사용';
          const emoji = transaction.type === 'earn' ? '💰' : '💸';
          
          await this.createNotification(
            userId,
            'mileage',
            `마일리지 ${type}`,
            `${Math.abs(transaction.amount)}P가 ${type}되었습니다.`,
            emoji
          );
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  // QR 스캔 실시간 알림 (사업자용)
  subscribeToQRScans(businessId: string, callback: (scan: any) => void) {
    const channelName = `qr_scans:${businessId}`;
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'qr_codes',
          filter: `business_id=eq.${businessId}`
        },
        (payload) => {
          const qr = payload.new as any;
          if (qr.used_at && !payload.old.used_at) {
            callback(qr);
          }
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  // 리뷰 작성 실시간 알림 (사업자용)
  subscribeToReviews(businessId: string, callback: (review: any) => void) {
    const channelName = `reviews:${businessId}`;
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reviews',
          filter: `business_id=eq.${businessId}`
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  // 알림 생성
  async createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    icon?: string,
    link?: string
  ) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title,
          message,
          icon,
          link,
          read: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }

  // 알림 읽음 처리
  async markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  // 모든 알림 읽음 처리
  async markAllAsRead(userId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  // 알림 목록 조회
  async getNotifications(userId: string, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  // 브라우저 알림 표시
  private async showBrowserNotification(notification: Notification) {
    // 브라우저 알림 권한 확인
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/logo192.png', // 앱 아이콘
        badge: '/logo192.png',
        tag: notification.id,
        requireInteraction: false,
        silent: false
      });
    } else if (Notification.permission !== 'denied') {
      // 권한 요청
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.showBrowserNotification(notification);
      }
    }
  }

  // 브라우저 알림 권한 요청
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  // 구독 해제
  unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
      this.notificationCallbacks.delete(channelName);
    }
  }

  // 모든 구독 해제
  unsubscribeAll() {
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.notificationCallbacks.clear();
  }
}

export const realtimeService = new RealtimeService();