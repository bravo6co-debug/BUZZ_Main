import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Gift, 
  Users, 
  DollarSign, 
  Calendar,
  BarChart3,
  PieChart,
  Download,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { adminCouponService, CouponStatistics } from '../services/adminCoupon.service';
import { LoadingSpinner } from './ui/loading-spinner';
import { toast } from './ui/use-toast';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface CouponStatisticsProps {
  className?: string;
}

export default function CouponStatistics({ className }: CouponStatisticsProps) {
  const [statistics, setStatistics] = useState<CouponStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month');

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const response = await adminCouponService.getCouponStatistics(timeframe);
      if (response.success && response.data) {
        setStatistics(response.data);
      } else {
        toast({
          title: '오류',
          description: response.error || '통계 데이터를 불러오는데 실패했습니다.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
      toast({
        title: '오류',
        description: '통계 데이터를 불러오는데 실패했습니다.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, [timeframe]);

  const handleExportData = () => {
    if (!statistics) return;

    const dataToExport = {
      timeframe,
      generatedAt: statistics.generatedAt,
      overview: statistics.overview,
      typeDistribution: statistics.typeDistribution,
      topCoupons: statistics.topCoupons,
      dailyTrend: statistics.dailyTrend
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coupon-statistics-${timeframe}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: '성공',
      description: '통계 데이터가 다운로드되었습니다.',
      variant: 'default'
    });
  };

  const getTimeframeName = (tf: string) => {
    const names = { week: '주간', month: '월간', year: '연간' };
    return names[tf as keyof typeof names] || tf;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  if (loading) {
    return (
      <div className={`flex justify-center items-center py-12 ${className}`}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">통계 데이터를 불러올 수 없습니다.</p>
        <Button onClick={loadStatistics} className="mt-4">
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">쿠폰 통계</h2>
          <p className="text-gray-600 mt-1">
            {getTimeframeName(timeframe)} 쿠폰 발급 및 사용 현황
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">주간</option>
            <option value="month">월간</option>
            <option value="year">연간</option>
          </select>
          <Button variant="outline" size="sm" onClick={loadStatistics}>
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="w-4 h-4 mr-2" />
            내보내기
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 쿠폰</p>
                <p className="text-2xl font-bold">{statistics.overview.total_coupons}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    활성 {statistics.overview.active_coupons}개
                  </Badge>
                </div>
              </div>
              <Gift className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 발급량</p>
                <p className="text-2xl font-bold">{formatNumber(statistics.overview.total_issued)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-green-600">
                    +{formatNumber(statistics.overview.period_issued)} ({getTimeframeName(timeframe)})
                  </span>
                </div>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">사용량</p>
                <p className="text-2xl font-bold">{formatNumber(statistics.overview.total_used)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant={parseFloat(statistics.overview.usage_rate) >= 50 ? "default" : "secondary"} className="text-xs">
                    사용률 {statistics.overview.usage_rate}%
                  </Badge>
                </div>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">할인 총액</p>
                <p className="text-2xl font-bold">
                  {(statistics.overview.total_discount_amount / 1000).toFixed(0)}K원
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-orange-600">
                    +{(statistics.overview.period_discount / 1000).toFixed(0)}K원 ({getTimeframeName(timeframe)})
                  </span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              일별 발급/사용 추이
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={statistics.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).getMonth() + 1 + '/' + new Date(value).getDate()}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: any, name: string) => [
                    formatNumber(value),
                    name === 'issued' ? '발급' : name === 'used' ? '사용' : '할인금액'
                  ]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="issued" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="발급"
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="used" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="사용"
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              타입별 분포
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={statistics.typeDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="issued_count"
                  label={({ type, issued_count }) => `${type}: ${formatNumber(issued_count)}`}
                >
                  {statistics.typeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [formatNumber(value), '발급량']} />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Type Distribution Table */}
      <Card>
        <CardHeader>
          <CardTitle>타입별 상세 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">타입</th>
                  <th className="text-left py-3 px-4">쿠폰 수</th>
                  <th className="text-left py-3 px-4">발급량</th>
                  <th className="text-left py-3 px-4">사용량</th>
                  <th className="text-left py-3 px-4">사용률</th>
                </tr>
              </thead>
              <tbody>
                {statistics.typeDistribution.map((item) => {
                  const usageRate = item.issued_count > 0 
                    ? ((item.used_count / item.issued_count) * 100).toFixed(1)
                    : '0';
                  
                  return (
                    <tr key={item.type} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <Badge variant="secondary">{item.type}</Badge>
                      </td>
                      <td className="py-3 px-4 font-medium">{item.coupon_count}</td>
                      <td className="py-3 px-4">{formatNumber(item.issued_count)}</td>
                      <td className="py-3 px-4">{formatNumber(item.used_count)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${usageRate}%` }}
                            />
                          </div>
                          <span className="text-sm">{usageRate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Coupons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            인기 쿠폰 Top 10
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {statistics.topCoupons.slice(0, 10).map((coupon, index) => (
              <div key={coupon.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{coupon.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">{coupon.type}</Badge>
                      <span className="text-xs text-gray-500">
                        {coupon.discount_type === 'fixed' 
                          ? `${coupon.discount_value.toLocaleString()}원` 
                          : `${coupon.discount_value}%`} 할인
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatNumber(coupon.used_count)} 사용</p>
                  <p className="text-sm text-gray-500">
                    사용률 {coupon.usage_rate}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>
              마지막 업데이트: {new Date(statistics.generatedAt).toLocaleString()}
            </p>
            <p>
              기준 기간: {getTimeframeName(timeframe)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}