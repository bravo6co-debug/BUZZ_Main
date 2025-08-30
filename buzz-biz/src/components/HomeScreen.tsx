import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Store, TrendingUp, Users, Calendar, QrCode, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { statisticsService, StoreStats } from '../services/statistics.service';
import { businessService, BusinessInfo } from '../services/business.service';
import { realtimeQRService } from '../services/realtime-qr.service';
import { settlementService } from '../services/settlement.service';
import { ApprovalStatus } from './ApprovalStatus';

export function HomeScreen() {
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [stats, setStats] = useState<StoreStats>({
    todaySales: 0,
    todayCustomers: 0,
    todayTransactions: 0,
    averageAmount: 0,
    comparedToYesterday: { sales: 0, customers: 0 }
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeData();
    
    return () => {
      // 클린업: 실시간 구독 해제
      statisticsService.unsubscribe();
    };
  }, []);

  const initializeData = async () => {
    setLoading(true);
    
    // 비즈니스 정보 로드
    const businessData = await businessService.getCurrentBusiness();
    if (businessData) {
      setBusiness(businessData);
      
      // 실시간 통계 구독
      statisticsService.subscribeToRealtimeStats(businessData.id, (newStats) => {
        setStats(newStats);
      });
      
      // 최근 QR 스캔 활동 로드
      const recentScans = await realtimeQRService.getRecentScans(businessData.id, 5);
      setRecentActivity(recentScans);
    }
    
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString() + '원';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center py-6">
        <h1 className="text-2xl font-bold text-primary mb-2">
          {business?.name || '카페 버즈'}
        </h1>
        <p className="text-sm text-primary/80 mb-1">
          {business?.description || "신선한 원두로 내린 커피와 함께 달콤한 디저트를 즐겨보세요"}
        </p>
        <p className="text-xs text-muted-foreground">Buzz-Biz 매장 관리</p>
      </div>

      {/* Approval Status - Show if not approved */}
      {business && business.verification_status !== 'approved' && (
        <ApprovalStatus />
      )}

      {/* Quick Stats - 실시간 데이터 */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">오늘 매출</p>
              <p className="font-semibold">{formatCurrency(stats.todaySales)}</p>
              {stats.comparedToYesterday.sales !== 0 && (
                <div className="flex items-center gap-1 mt-1">
                  {stats.comparedToYesterday.sales > 0 ? (
                    <>
                      <ArrowUp className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-500">
                        {stats.comparedToYesterday.sales}%
                      </span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-3 h-3 text-red-500" />
                      <span className="text-xs text-red-500">
                        {Math.abs(stats.comparedToYesterday.sales)}%
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">오늘 고객</p>
              <p className="font-semibold">{stats.todayCustomers}명</p>
              {stats.comparedToYesterday.customers !== 0 && (
                <div className="flex items-center gap-1 mt-1">
                  {stats.comparedToYesterday.customers > 0 ? (
                    <>
                      <ArrowUp className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-500">
                        {stats.comparedToYesterday.customers}%
                      </span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-3 h-3 text-red-500" />
                      <span className="text-xs text-red-500">
                        {Math.abs(stats.comparedToYesterday.customers)}%
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">거래 건수</p>
          <p className="font-semibold">{stats.todayTransactions}건</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">평균 결제</p>
          <p className="font-semibold">{formatCurrency(stats.averageAmount)}</p>
        </Card>
      </div>

      {/* Recent Activity - 실시간 QR 스캔 기록 */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          최근 활동
        </h3>
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              아직 활동 내역이 없습니다
            </p>
          ) : (
            recentActivity.map((activity, index) => (
              <div key={activity.id || index} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="font-medium">
                    {activity.type === 'coupon' ? '쿠폰 사용' : '마일리지 적립'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activity.profiles?.name || '고객'} - 
                    {activity.type === 'coupon' 
                      ? ` ${activity.data?.discount || 0}원 할인`
                      : ` ${activity.data?.points || 0}P`
                    }
                  </p>
                </div>
                <div className="text-right">
                  <Badge 
                    variant={activity.status === 'completed' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {activity.status === 'completed' ? '완료' : '처리중'}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTime(activity.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-12">
          <QrCode className="w-5 h-5 mr-2" />
          QR 스캔
        </Button>
        <Button variant="outline" className="h-12">
          <TrendingUp className="w-5 h-5 mr-2" />
          매출 분석
        </Button>
      </div>
    </div>
  );
}