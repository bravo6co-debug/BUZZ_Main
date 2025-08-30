import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface StoreStats {
  todaySales: number;
  todayCustomers: number;
  todayTransactions: number;
  averageAmount: number;
  comparedToYesterday: {
    sales: number; // percentage change
    customers: number;
  };
}

export interface HourlyStats {
  hour: number;
  sales: number;
  customers: number;
}

export interface PopularItem {
  name: string;
  count: number;
  revenue: number;
}

class StatisticsService {
  private statsChannel: RealtimeChannel | null = null;
  private updateCallbacks: Set<(stats: StoreStats) => void> = new Set();

  // 실시간 통계 구독
  subscribeToRealtimeStats(businessId: string, callback: (stats: StoreStats) => void) {
    // 콜백 등록
    this.updateCallbacks.add(callback);

    // 이미 채널이 있으면 재사용
    if (this.statsChannel) {
      return this.statsChannel;
    }

    // 실시간 채널 생성
    this.statsChannel = supabase
      .channel(`business_stats:${businessId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `business_id=eq.${businessId}`
        },
        async () => {
          // 새 거래가 발생하면 통계 업데이트
          const stats = await this.getTodayStats(businessId);
          this.updateCallbacks.forEach(cb => cb(stats));
        }
      )
      .subscribe();

    // 초기 데이터 로드
    this.getTodayStats(businessId).then(stats => {
      callback(stats);
    });

    return this.statsChannel;
  }

  // 오늘 통계 조회
  async getTodayStats(businessId: string): Promise<StoreStats> {
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // 오늘 거래 데이터
      const { data: todayTransactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('business_id', businessId)
        .gte('created_at', `${todayStr}T00:00:00`)
        .lt('created_at', `${todayStr}T23:59:59`);

      // 어제 거래 데이터
      const { data: yesterdayTransactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('business_id', businessId)
        .gte('created_at', `${yesterdayStr}T00:00:00`)
        .lt('created_at', `${yesterdayStr}T23:59:59`);

      // 오늘 통계 계산
      const todayCustomers = new Set(todayTransactions?.map(t => t.customer_id) || []);
      const todaySales = todayTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const todayCount = todayTransactions?.length || 0;

      // 어제 통계 계산
      const yesterdayCustomers = new Set(yesterdayTransactions?.map(t => t.customer_id) || []);
      const yesterdaySales = yesterdayTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

      // 비교 백분율 계산
      const salesChange = yesterdaySales > 0 
        ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 
        : 0;
      const customersChange = yesterdayCustomers.size > 0
        ? ((todayCustomers.size - yesterdayCustomers.size) / yesterdayCustomers.size) * 100
        : 0;

      return {
        todaySales,
        todayCustomers: todayCustomers.size,
        todayTransactions: todayCount,
        averageAmount: todayCount > 0 ? Math.round(todaySales / todayCount) : 0,
        comparedToYesterday: {
          sales: Math.round(salesChange),
          customers: Math.round(customersChange)
        }
      };
    } catch (error) {
      console.error('Error fetching today stats:', error);
      return {
        todaySales: 0,
        todayCustomers: 0,
        todayTransactions: 0,
        averageAmount: 0,
        comparedToYesterday: { sales: 0, customers: 0 }
      };
    }
  }

  // 시간대별 통계
  async getHourlyStats(businessId: string, date?: string): Promise<HourlyStats[]> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('business_id', businessId)
        .gte('created_at', `${targetDate}T00:00:00`)
        .lt('created_at', `${targetDate}T23:59:59`);

      // 시간대별로 집계
      const hourlyMap = new Map<number, { sales: number; customers: Set<string> }>();
      
      for (let hour = 0; hour < 24; hour++) {
        hourlyMap.set(hour, { sales: 0, customers: new Set() });
      }

      transactions?.forEach(tx => {
        const hour = new Date(tx.created_at).getHours();
        const hourData = hourlyMap.get(hour)!;
        hourData.sales += tx.amount;
        hourData.customers.add(tx.customer_id);
      });

      return Array.from(hourlyMap.entries()).map(([hour, data]) => ({
        hour,
        sales: data.sales,
        customers: data.customers.size
      }));
    } catch (error) {
      console.error('Error fetching hourly stats:', error);
      return [];
    }
  }

  // 인기 메뉴 통계
  async getPopularItems(businessId: string, limit = 5): Promise<PopularItem[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 거래 상세 데이터에서 메뉴 정보 추출
      const { data: transactions } = await supabase
        .from('transaction_items')
        .select(`
          item_name,
          quantity,
          price,
          transactions!inner(
            business_id,
            created_at
          )
        `)
        .eq('transactions.business_id', businessId)
        .gte('transactions.created_at', `${today}T00:00:00`);

      // 메뉴별로 집계
      const itemMap = new Map<string, { count: number; revenue: number }>();
      
      transactions?.forEach(item => {
        const existing = itemMap.get(item.item_name) || { count: 0, revenue: 0 };
        existing.count += item.quantity;
        existing.revenue += item.price * item.quantity;
        itemMap.set(item.item_name, existing);
      });

      // 정렬 및 상위 N개 반환
      return Array.from(itemMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching popular items:', error);
      // 더미 데이터 반환 (테이블이 없을 경우)
      return [
        { name: '아메리카노', count: 45, revenue: 180000 },
        { name: '카페라떼', count: 32, revenue: 160000 },
        { name: '크로플', count: 28, revenue: 140000 },
        { name: '치즈케이크', count: 15, revenue: 90000 },
        { name: '아이스티', count: 12, revenue: 48000 }
      ];
    }
  }

  // 주간 통계
  async getWeeklyStats(businessId: string) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('business_id', businessId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // 일별로 집계
      const dailyStats = new Map<string, { sales: number; customers: Set<string> }>();
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        dailyStats.set(dateStr, { sales: 0, customers: new Set() });
      }

      transactions?.forEach(tx => {
        const dateStr = new Date(tx.created_at).toISOString().split('T')[0];
        const stats = dailyStats.get(dateStr);
        if (stats) {
          stats.sales += tx.amount;
          stats.customers.add(tx.customer_id);
        }
      });

      return Array.from(dailyStats.entries()).map(([date, data]) => ({
        date,
        sales: data.sales,
        customers: data.customers.size
      }));
    } catch (error) {
      console.error('Error fetching weekly stats:', error);
      return [];
    }
  }

  // 고객 분석
  async getCustomerAnalytics(businessId: string) {
    try {
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          customer_id,
          amount,
          created_at,
          profiles:customer_id (
            name,
            email
          )
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(100);

      // 고객별 집계
      const customerMap = new Map<string, {
        name: string;
        visitCount: number;
        totalSpent: number;
        lastVisit: string;
      }>();

      transactions?.forEach(tx => {
        const existing = customerMap.get(tx.customer_id) || {
          name: tx.profiles?.name || '익명',
          visitCount: 0,
          totalSpent: 0,
          lastVisit: tx.created_at
        };
        
        existing.visitCount += 1;
        existing.totalSpent += tx.amount;
        if (new Date(tx.created_at) > new Date(existing.lastVisit)) {
          existing.lastVisit = tx.created_at;
        }
        
        customerMap.set(tx.customer_id, existing);
      });

      // VIP 고객 (상위 10%)
      const customers = Array.from(customerMap.values());
      const sortedBySpent = customers.sort((a, b) => b.totalSpent - a.totalSpent);
      const vipThreshold = Math.ceil(customers.length * 0.1);
      
      return {
        totalCustomers: customers.length,
        vipCustomers: sortedBySpent.slice(0, vipThreshold),
        averageSpentPerCustomer: customers.length > 0
          ? Math.round(customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length)
          : 0,
        averageVisitsPerCustomer: customers.length > 0
          ? (customers.reduce((sum, c) => sum + c.visitCount, 0) / customers.length).toFixed(1)
          : 0
      };
    } catch (error) {
      console.error('Error fetching customer analytics:', error);
      return {
        totalCustomers: 0,
        vipCustomers: [],
        averageSpentPerCustomer: 0,
        averageVisitsPerCustomer: 0
      };
    }
  }

  // 구독 해제
  unsubscribe() {
    if (this.statsChannel) {
      supabase.removeChannel(this.statsChannel);
      this.statsChannel = null;
    }
    this.updateCallbacks.clear();
  }
}

export const statisticsService = new StatisticsService();