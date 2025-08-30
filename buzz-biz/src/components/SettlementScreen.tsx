import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar, Clock, CheckCircle, Send, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { settlementService, Settlement, DailySales } from '../services/settlement.service';
import { businessService } from '../services/business.service';

export function SettlementScreen() {
  const [business, setBusiness] = useState<any>(null);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [todaySummary, setTodaySummary] = useState<any>(null);
  const [monthlySummary, setMonthlySummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    const businessData = await businessService.getCurrentBusiness();
    if (businessData) {
      setBusiness(businessData);
      
      // 일별 매출 조회 (최근 7일)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const sales = await settlementService.getDailySales(
        businessData.id,
        startDate.toISOString(),
        new Date().toISOString()
      );
      setDailySales(sales);
      
      // 정산 내역 조회
      const settlementHistory = await settlementService.getSettlements(businessData.id, 10);
      setSettlements(settlementHistory);
      
      // 오늘 요약
      const todayData = await settlementService.getTodaySummary(businessData.id);
      setTodaySummary(todayData);
      
      // 이번 달 요약
      const now = new Date();
      const monthlyData = await settlementService.getMonthlySummary(
        businessData.id,
        now.getFullYear(),
        now.getMonth() + 1
      );
      setMonthlySummary(monthlyData);
    }
    
    setLoading(false);
  };

  const handleSettlementRequest = async () => {
    if (!business || !todaySummary || todaySummary.totalAmount === 0) return;
    
    setRequesting(true);
    const today = new Date().toISOString().split('T')[0];
    
    // 정산 가능 여부 확인
    const canRequest = await settlementService.canRequestSettlement(business.id, today);
    if (!canRequest) {
      alert('이미 오늘 정산 요청이 진행 중입니다.');
      setRequesting(false);
      return;
    }
    
    const result = await settlementService.requestSettlement(business.id, today);
    if (result.success) {
      alert('정산 요청이 완료되었습니다.');
      await loadData(); // 데이터 새로고침
    } else {
      alert(`정산 요청 실패: ${result.error}`);
    }
    
    setRequesting(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `오늘 (${date.getMonth() + 1}/${date.getDate()})`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `어제 (${date.getMonth() + 1}/${date.getDate()})`;
    }
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="text-xs">대기중</Badge>;
      case 'processing':
        return <Badge variant="outline" className="text-xs">처리중</Badge>;
      case 'completed':
        return <Badge variant="default" className="text-xs bg-green-100 text-green-800">완료</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-xs">실패</Badge>;
      default:
        return null;
    }
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
      <div className="text-center py-4">
        <h1 className="text-xl font-semibold">정산 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">매출 정산 현황을 확인하세요</p>
      </div>

      {/* Daily Sales Status */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">일별 매출 현황</h3>
        </div>
        <div className="space-y-3">
          {dailySales.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              매출 데이터가 없습니다
            </p>
          ) : (
            dailySales.slice(0, 5).map((sale, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-border/50 last:border-b-0">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{formatDate(sale.date)}</span>
                  <Badge variant="outline" className="text-xs">
                    {sale.transaction_count}건
                  </Badge>
                </div>
                <span className="font-semibold">
                  {sale.total_amount.toLocaleString()}원
                </span>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Settlement Request History */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">정산 요청 내역</h3>
        </div>
        <div className="space-y-3">
          {settlements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              정산 요청 내역이 없습니다
            </p>
          ) : (
            settlements.map((settlement) => (
              <div key={settlement.id} className="flex justify-between items-center py-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {settlement.status === 'completed' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : settlement.status === 'failed' ? (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-orange-500" />
                    )}
                    <span className="font-medium">{formatDate(settlement.date)}</span>
                  </div>
                  {getStatusBadge(settlement.status)}
                </div>
                <div className="text-right">
                  <p className="font-medium">{settlement.net_amount.toLocaleString()}원</p>
                  {(settlement.coupon_discount > 0 || settlement.mileage_used > 0) && (
                    <p className="text-xs text-muted-foreground">
                      총 {settlement.total_sales.toLocaleString()}원
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">오늘 매출</p>
            <p className="font-semibold">
              {todaySummary ? `${todaySummary.totalAmount.toLocaleString()}원` : '0원'}
            </p>
            {todaySummary && todaySummary.transactionCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {todaySummary.transactionCount}건
              </p>
            )}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <Calendar className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">이번 달 누적</p>
            <p className="font-semibold">
              {monthlySummary ? `${monthlySummary.totalSales.toLocaleString()}원` : '0원'}
            </p>
            {monthlySummary && monthlySummary.transactionCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                평균 {monthlySummary.averageTransaction.toLocaleString()}원
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Settlement Request Button */}
      {todaySummary && todaySummary.totalAmount > 0 && (
        <Card className="p-4 bg-primary/5">
          <div className="text-center space-y-3">
            <Send className="w-8 h-8 text-primary mx-auto" />
            <div>
              <h4 className="font-semibold">오늘 정산 요청</h4>
              <p className="text-sm text-muted-foreground">
                오늘 매출 {todaySummary.totalAmount.toLocaleString()}원을 정산 요청하시겠습니까?
              </p>
            </div>
            <Button 
              className="w-full h-12" 
              onClick={handleSettlementRequest}
              disabled={requesting}
            >
              {requesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                '오늘 정산 요청하기'
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Notice */}
      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-xs text-muted-foreground text-center">
          정산 요청은 영업일 기준 1-2일 내에 처리됩니다
        </p>
      </div>
    </div>
  );
}