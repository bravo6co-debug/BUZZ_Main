import { useState, useEffect } from "react";
import { Bell, X, CheckCircle, AlertCircle, Info, Gift, Star, QrCode } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

export interface NotificationItem {
  id: string;
  type: 'success' | 'warning' | 'info' | 'coupon' | 'review' | 'qr';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  icon?: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

// 실시간 알림을 시뮬레이션하기 위한 샘플 데이터
const sampleNotifications: NotificationItem[] = [
  {
    id: '1',
    type: 'coupon',
    title: '새로운 쿠폰이 도착했어요!',
    message: '카페 브라운에서 3,000원 할인 쿠폰을 받았어요',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5분 전
    read: false,
    icon: '🎫'
  },
  {
    id: '2',
    type: 'review',
    title: '리뷰 보상 적립 완료',
    message: '작성하신 리뷰에 대한 50P가 적립되었어요',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1시간 전
    read: false,
    icon: '⭐'
  },
  {
    id: '3',
    type: 'qr',
    title: 'QR 스캔 완료',
    message: '마일리지 1,000P가 사용되었습니다',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2시간 전
    read: true,
    icon: '📱'
  },
  {
    id: '4',
    type: 'success',
    title: '리퍼럴 보상 지급',
    message: '친구 추천으로 500P를 받았어요!',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1일 전
    read: true,
    icon: '🎉'
  }
];

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(sampleNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  const getTypeIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'warning':
        return <AlertCircle size={16} className="text-orange-500" />;
      case 'info':
        return <Info size={16} className="text-blue-500" />;
      case 'coupon':
        return <Gift size={16} className="text-purple-500" />;
      case 'review':
        return <Star size={16} className="text-yellow-500" />;
      case 'qr':
        return <QrCode size={16} className="text-gray-500" />;
      default:
        return <Info size={16} className="text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return timestamp.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(notification => 
    filter === 'all' || !notification.read
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={20} />
              알림
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                모두 읽음
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Filter Tabs */}
        <div className="flex border-b px-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            전체 ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === 'unread'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            읽지 않음 ({unreadCount})
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Bell size={48} className="mb-4 text-gray-300" />
              <p className="text-sm">
                {filter === 'unread' ? '읽지 않은 알림이 없습니다' : '알림이 없습니다'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {notification.icon ? (
                        <span className="text-lg">{notification.icon}</span>
                      ) : (
                        getTypeIcon(notification.type)
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className={`text-sm font-medium text-gray-900 ${
                          !notification.read ? 'font-semibold' : ''
                        }`}>
                          {notification.title}
                        </h4>
                        <div className="flex items-center gap-1 ml-2">
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                          >
                            <X size={12} className="text-gray-400" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatTimestamp(notification.timestamp)}
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  {!notification.read && (
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs h-7"
                      >
                        읽음으로 표시
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            알림은 30일 후 자동으로 삭제됩니다
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 실시간 알림을 위한 커스텀 훅
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(sampleNotifications);

  const addNotification = (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // 토스트 알림 표시 (브라우저 알림)
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
      });
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  return {
    notifications,
    addNotification,
    requestNotificationPermission,
    unreadCount: notifications.filter(n => !n.read).length
  };
};