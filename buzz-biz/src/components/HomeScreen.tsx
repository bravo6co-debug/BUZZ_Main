import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Store, TrendingUp, Users, Calendar, QrCode, ArrowUp, ArrowDown, Loader2, Gift, Coins, CreditCard } from 'lucide-react';
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-transparent px-4 pt-6 pb-4">
        <div className="max-w-sm mx-auto">
          <h1 className="text-2xl font-bold text-foreground">
            {business?.name || '카페 버즈'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {business?.description || "신선한 원두로 내린 커피와 함께 달콤한 디저트를 즐겨보세요"}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-4 space-y-4">

        {/* Approval Status - Show if not approved */}
        {business && business.verification_status !== 'approved' && (
          <ApprovalStatus />
        )}

        {/* Quick Stats - 실시간 데이터 */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Store className="w-5 h-5 text-primary" strokeWidth={2.5} />
                </div>
                {stats.comparedToYesterday.sales !== 0 && (
                  <div className="flex items-center gap-1">
                    {stats.comparedToYesterday.sales > 0 ? (
                      <>
                        <ArrowUp className="w-3 h-3 text-green-600" />
                        <span className="text-xs font-medium text-green-600">
                          {stats.comparedToYesterday.sales}%
                        </span>
                      </>
                    ) : (
                      <>
                        <ArrowDown className="w-3 h-3 text-red-600" />
                        <span className="text-xs font-medium text-red-600">
                          {Math.abs(stats.comparedToYesterday.sales)}%
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">오늘 매출</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(stats.todaySales)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" strokeWidth={2.5} />
                </div>
                {stats.comparedToYesterday.customers !== 0 && (
                  <div className="flex items-center gap-1">
                    {stats.comparedToYesterday.customers > 0 ? (
                      <>
                        <ArrowUp className="w-3 h-3 text-green-600" />
                        <span className="text-xs font-medium text-green-600">
                          {stats.comparedToYesterday.customers}%
                        </span>
                      </>
                    ) : (
                      <>
                        <ArrowDown className="w-3 h-3 text-red-600" />
                        <span className="text-xs font-medium text-red-600">
                          {Math.abs(stats.comparedToYesterday.customers)}%
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">오늘 고객</p>
                <p className="text-xl font-bold mt-1">{stats.todayCustomers}명</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">거래 건수</p>
                <p className="text-lg font-bold mt-1">{stats.todayTransactions}건</p>
              </div>
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" strokeWidth={2.5} />
              </div>
            </div>
          </Card>
          <Card className="p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">평균 결제</p>
                <p className="text-lg font-bold mt-1">{formatCurrency(stats.averageAmount)}</p>
              </div>
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-primary" strokeWidth={2.5} />
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Activity - 실시간 QR 스캔 기록 */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" strokeWidth={2.5} />
              최근 활동
            </h3>
            {recentActivity.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {recentActivity.length} 건
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-muted rounded-xl mx-auto mb-3 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  아직 활동 내역이 없습니다
                </p>
              </div>
            ) : (
              recentActivity.map((activity, index) => (
                <div key={activity.id || index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    activity.type === 'coupon' ? 'bg-orange-100' : 'bg-blue-100'
                  }`}>
                    {activity.type === 'coupon' ? (
                      <Gift className="w-5 h-5 text-orange-600" strokeWidth={2.5} />
                    ) : (
                      <Coins className="w-5 h-5 text-blue-600" strokeWidth={2.5} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {activity.profiles?.name || '고객'}
                      </p>
                      <Badge 
                        variant={activity.status === 'completed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {activity.status === 'completed' ? '완료' : '처리중'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activity.type === 'coupon' 
                        ? `쿠폰 ${activity.data?.discount || 0}원 할인`
                        : `마일리지 ${activity.data?.points || 0}P 적립`
                      }
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(activity.created_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-12 font-medium hover:bg-primary hover:text-primary-foreground transition-all">
            <QrCode className="w-5 h-5 mr-2" strokeWidth={2.5} />
            QR 스캔
          </Button>
          <Button variant="outline" className="h-12 font-medium hover:bg-primary hover:text-primary-foreground transition-all">
            <TrendingUp className="w-5 h-5 mr-2" strokeWidth={2.5} />
            매출 분석
          </Button>
        </div>
      </div>
    </div>
  );
}