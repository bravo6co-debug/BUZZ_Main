import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar, Clock, CheckCircle, Send, TrendingUp, Loader2, AlertCircle, DollarSign, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-transparent px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-center">정산 관리</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">매출 정산 현황을 확인하세요</p>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-4 space-y-4">

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" strokeWidth={2.5} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">오늘 매출</p>
              <p className="text-xl font-bold mt-1">
                {todaySummary ? `${todaySummary.totalAmount.toLocaleString()}원` : '0원'}
              </p>
              {todaySummary && todaySummary.transactionCount > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {todaySummary.transactionCount}건 거래
                </p>
              )}
            </div>
          </Card>
          
          <Card className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" strokeWidth={2.5} />
              </div>
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">이번 달 누적</p>
              <p className="text-xl font-bold mt-1">
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

        {/* Daily Sales Status */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" strokeWidth={2.5} />
              일별 매출 현황
            </h3>
            {dailySales.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                최근 7일
              </Badge>
            )}
          </div>
        <div className="space-y-3">
          {dailySales.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              매출 데이터가 없습니다
            </p>
          ) : (
            dailySales.slice(0, 5).map((sale, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-primary" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{formatDate(sale.date)}</p>
                    <p className="text-xs text-muted-foreground">
                      {sale.transaction_count}건 거래
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{sale.total_amount.toLocaleString()}원</p>
                </div>
              </div>
            ))
          )}
        </div>
        </Card>

        {/* Settlement Request History */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" strokeWidth={2.5} />
              정산 요청 내역
            </h3>
          </div>
        <div className="space-y-3">
          {settlements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              정산 요청 내역이 없습니다
            </p>
          ) : (
            settlements.map((settlement) => (
              <div key={settlement.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    settlement.status === 'completed' ? 'bg-green-100' : 
                    settlement.status === 'failed' ? 'bg-red-100' : 'bg-orange-100'
                  }`}>
                    {settlement.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" strokeWidth={2.5} />
                    ) : settlement.status === 'failed' ? (
                      <AlertCircle className="w-5 h-5 text-red-600" strokeWidth={2.5} />
                    ) : (
                      <Clock className="w-5 h-5 text-orange-500" strokeWidth={2.5} />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{formatDate(settlement.date)}</p>
                    <div className="mt-0.5">
                      {getStatusBadge(settlement.status)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{settlement.net_amount.toLocaleString()}원</p>
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

        {/* Settlement Request Button */}
        {todaySummary && todaySummary.totalAmount > 0 && (
          <Card className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl mx-auto flex items-center justify-center">
                <Send className="w-6 h-6 text-primary" strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="font-bold text-lg">오늘 정산 요청</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  오늘 매출 <span className="font-semibold text-primary">{todaySummary.totalAmount.toLocaleString()}원</span>을 정산 요청하시겠습니까?
                </p>
              </div>
              <Button 
                className="w-full h-12 font-medium" 
                onClick={handleSettlementRequest}
                disabled={requesting}
              >
                {requesting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" strokeWidth={2.5} />
                    오늘 정산 요청하기
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Notice */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-muted-foreground" strokeWidth={2.5} />
            <p className="text-xs text-muted-foreground">
              정산 요청은 영업일 기준 1-2일 내에 처리됩니다
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}