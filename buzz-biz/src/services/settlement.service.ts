import { supabase } from '../lib/supabase';

export interface Settlement {
  id: string;
  business_id: string;
  date: string;
  total_sales: number;
  coupon_discount: number;
  mileage_used: number;
  net_amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requested_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface DailySales {
  date: string;
  total_amount: number;
  transaction_count: number;
  coupon_count: number;
  mileage_count: number;
}

class SettlementService {
  // 일별 매출 조회
  async getDailySales(businessId: string, startDate?: string, endDate?: string): Promise<DailySales[]> {
    try {
      const today = new Date();
      const start = startDate || new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const end = endDate || today.toISOString();

      // 거래 데이터 조회
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('business_id', businessId)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 일별로 집계
      const salesByDate = new Map<string, DailySales>();
      
      transactions?.forEach(transaction => {
        const date = new Date(transaction.created_at).toISOString().split('T')[0];
        
        if (!salesByDate.has(date)) {
          salesByDate.set(date, {
            date,
            total_amount: 0,
            transaction_count: 0,
            coupon_count: 0,
            mileage_count: 0
          });
        }
        
        const dailySale = salesByDate.get(date)!;
        dailySale.total_amount += transaction.amount;
        dailySale.transaction_count += 1;
        
        if (transaction.coupon_used) dailySale.coupon_count += 1;
        if (transaction.mileage_used) dailySale.mileage_count += 1;
      });

      return Array.from(salesByDate.values()).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    } catch (error) {
      console.error('Error fetching daily sales:', error);
      return [];
    }
  }

  // 정산 내역 조회
  async getSettlements(businessId: string, limit = 30): Promise<Settlement[]> {
    try {
      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .eq('business_id', businessId)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching settlements:', error);
      return [];
    }
  }

  // 정산 요청
  async requestSettlement(businessId: string, date: string): Promise<{ success: boolean; data?: Settlement; error?: string }> {
    try {
      // 해당 날짜의 매출 데이터 조회
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('business_id', businessId)
        .gte('created_at', `${date}T00:00:00`)
        .lt('created_at', `${date}T23:59:59`);

      if (txError) throw txError;

      // 매출 집계
      let totalSales = 0;
      let couponDiscount = 0;
      let mileageUsed = 0;

      transactions?.forEach(tx => {
        totalSales += tx.amount;
        couponDiscount += tx.coupon_discount || 0;
        mileageUsed += tx.mileage_amount || 0;
      });

      const netAmount = totalSales - couponDiscount - mileageUsed;

      // 정산 레코드 생성
      const { data: settlement, error } = await supabase
        .from('settlements')
        .insert({
          business_id: businessId,
          date,
          total_sales: totalSales,
          coupon_discount: couponDiscount,
          mileage_used: mileageUsed,
          net_amount: netAmount,
          status: 'pending',
          requested_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: settlement };
    } catch (error: any) {
      console.error('Error requesting settlement:', error);
      return { success: false, error: error.message };
    }
  }

  // 오늘 매출 요약
  async getTodaySummary(businessId: string) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('business_id', businessId)
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      if (error) throw error;

      let totalAmount = 0;
      let customerCount = new Set<string>();
      let transactionCount = 0;

      transactions?.forEach(tx => {
        totalAmount += tx.amount;
        customerCount.add(tx.customer_id);
        transactionCount++;
      });

      return {
        totalAmount,
        customerCount: customerCount.size,
        transactionCount,
        averageAmount: transactionCount > 0 ? Math.round(totalAmount / transactionCount) : 0
      };
    } catch (error) {
      console.error('Error fetching today summary:', error);
      return {
        totalAmount: 0,
        customerCount: 0,
        transactionCount: 0,
        averageAmount: 0
      };
    }
  }

  // 월별 매출 통계
  async getMonthlySummary(businessId: string, year: number, month: number) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('business_id', businessId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      let totalSales = 0;
      let totalCouponDiscount = 0;
      let totalMileageUsed = 0;
      let transactionCount = 0;

      transactions?.forEach(tx => {
        totalSales += tx.amount;
        totalCouponDiscount += tx.coupon_discount || 0;
        totalMileageUsed += tx.mileage_amount || 0;
        transactionCount++;
      });

      return {
        year,
        month,
        totalSales,
        totalCouponDiscount,
        totalMileageUsed,
        netAmount: totalSales - totalCouponDiscount - totalMileageUsed,
        transactionCount,
        averageTransaction: transactionCount > 0 ? Math.round(totalSales / transactionCount) : 0
      };
    } catch (error) {
      console.error('Error fetching monthly summary:', error);
      return null;
    }
  }

  // 정산 상태 업데이트
  async updateSettlementStatus(settlementId: string, status: Settlement['status']) {
    try {
      const updates: any = { status };
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('settlements')
        .update(updates)
        .eq('id', settlementId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error updating settlement status:', error);
      return { success: false, error: error.message };
    }
  }

  // 정산 가능 여부 확인
  async canRequestSettlement(businessId: string, date: string): Promise<boolean> {
    try {
      // 이미 해당 날짜에 정산 요청이 있는지 확인
      const { data: existing } = await supabase
        .from('settlements')
        .select('id, status')
        .eq('business_id', businessId)
        .eq('date', date)
        .single();

      // 이미 정산 요청이 있고 pending이나 processing 상태면 불가
      if (existing && ['pending', 'processing', 'completed'].includes(existing.status)) {
        return false;
      }

      // 오늘 날짜보다 미래면 불가
      if (new Date(date) > new Date()) {
        return false;
      }

      return true;
    } catch (error) {
      // 레코드가 없으면 요청 가능
      return true;
    }
  }
}

export const settlementService = new SettlementService();