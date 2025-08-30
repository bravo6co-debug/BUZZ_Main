import { Request, Response } from 'express';
import { getDatabase } from '../../config/knex';
import { sendSuccess, Errors } from '../../utils/response';
import { BusinessStatus, UserRole, SettlementStatus } from '../../types';
import { log } from '../../utils/logger';

export class AdminDashboardController {
  /**
   * Get admin dashboard statistics
   */
  async getDashboard(req: Request, res: Response): Promise<void> {
    const timeframe = req.query.timeframe as string || 'month'; // week, month, year
    const db = getDatabase();
    
    try {
      // Calculate date ranges
      const now = new Date();
      let startDate: Date;
      
      switch (timeframe) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default: // month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      
      // Get user statistics
      const userStats = await db('users')
        .select(
          db.raw('COUNT(*) as total_users'),
          db.raw('COUNT(CASE WHEN role = "user" THEN 1 END) as regular_users'),
          db.raw('COUNT(CASE WHEN role = "business" THEN 1 END) as business_users'),
          db.raw('COUNT(CASE WHEN created_at >= ? THEN 1 END) as new_users', [startDate]),
          db.raw('COUNT(CASE WHEN last_login_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as active_users'),
          db.raw('COUNT(CASE WHEN is_active = true THEN 1 END) as active_total')
        )
        .first();
      
      // Get business statistics
      const businessStats = await db('businesses')
        .select(
          db.raw('COUNT(*) as total_businesses'),
          db.raw('COUNT(CASE WHEN status = "approved" THEN 1 END) as approved_businesses'),
          db.raw('COUNT(CASE WHEN status = "pending" THEN 1 END) as pending_businesses'),
          db.raw('COUNT(CASE WHEN created_at >= ? THEN 1 END) as new_businesses', [startDate]),
          db.raw('AVG(avg_rating) as overall_rating'),
          db.raw('SUM(qr_scan_count) as total_scans')
        )
        .first();
      
      // Get mileage statistics
      const mileageStats = await db('mileage_transactions')
        .select(
          db.raw('SUM(CASE WHEN type = "earn" THEN amount ELSE 0 END) as total_earned'),
          db.raw('SUM(CASE WHEN type = "use" THEN amount ELSE 0 END) as total_used'),
          db.raw('SUM(CASE WHEN type = "earn" AND created_at >= ? THEN amount ELSE 0 END) as period_earned', [startDate]),
          db.raw('SUM(CASE WHEN type = "use" AND created_at >= ? THEN amount ELSE 0 END) as period_used', [startDate]),
          db.raw('COUNT(CASE WHEN type = "earn" AND created_at >= ? THEN 1 END) as period_earn_count', [startDate]),
          db.raw('COUNT(CASE WHEN type = "use" AND created_at >= ? THEN 1 END) as period_use_count', [startDate])
        )
        .first();
      
      // Get coupon statistics
      const couponStats = await db('user_coupons')
        .select(
          db.raw('COUNT(*) as total_issued'),
          db.raw('COUNT(CASE WHEN status = "used" THEN 1 END) as total_used'),
          db.raw('SUM(CASE WHEN status = "used" THEN used_amount ELSE 0 END) as total_discount'),
          db.raw('COUNT(CASE WHEN issued_at >= ? THEN 1 END) as period_issued', [startDate]),
          db.raw('COUNT(CASE WHEN used_at >= ? THEN 1 END) as period_used', [startDate]),
          db.raw('SUM(CASE WHEN used_at >= ? THEN used_amount ELSE 0 END) as period_discount', [startDate])
        )
        .first();
      
      // Get settlement statistics
      const settlementStats = await db('settlements')
        .select(
          db.raw('COUNT(*) as total_requests'),
          db.raw('SUM(total_amount) as total_amount'),
          db.raw('COUNT(CASE WHEN status = "pending" THEN 1 END) as pending_requests'),
          db.raw('SUM(CASE WHEN status = "pending" THEN total_amount ELSE 0 END) as pending_amount'),
          db.raw('COUNT(CASE WHEN status = "paid" THEN 1 END) as paid_requests'),
          db.raw('SUM(CASE WHEN status = "paid" THEN total_amount ELSE 0 END) as paid_amount'),
          db.raw('COUNT(CASE WHEN requested_at >= ? THEN 1 END) as period_requests', [startDate])
        )
        .first();
      
      // Get growth metrics (compare with previous period)
      const prevStartDate = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
      
      const growthMetrics = await db('users')
        .select(
          db.raw('COUNT(CASE WHEN created_at >= ? AND created_at < ? THEN 1 END) as prev_new_users', [prevStartDate, startDate]),
        )
        .first();
      
      const businessGrowth = await db('businesses')
        .select(
          db.raw('COUNT(CASE WHEN created_at >= ? AND created_at < ? THEN 1 END) as prev_new_businesses', [prevStartDate, startDate])
        )
        .first();
      
      // Calculate growth percentages
      const userGrowthRate = growthMetrics?.prev_new_users > 0 ? 
        (((userStats?.new_users || 0) - (growthMetrics.prev_new_users || 0)) / (growthMetrics.prev_new_users || 1) * 100).toFixed(1) : '0';
      
      const businessGrowthRate = businessGrowth?.prev_new_businesses > 0 ?
        (((businessStats?.new_businesses || 0) - (businessGrowth.prev_new_businesses || 0)) / (businessGrowth.prev_new_businesses || 1) * 100).toFixed(1) : '0';
      
      // Get recent activities
      const recentActivities = await this.getRecentActivities(db, 20);
      
      // Get top performing businesses
      const topBusinesses = await db('businesses')
        .select('id', 'business_name', 'category', 'qr_scan_count', 'avg_rating', 'review_count')
        .where('status', BusinessStatus.APPROVED)
        .orderBy('qr_scan_count', 'desc')
        .limit(5);
      
      const dashboardData = {
        summary: {
          totalUsers: parseInt(userStats?.total_users || '0'),
          totalBusinesses: parseInt(businessStats?.total_businesses || '0'),
          totalMileageIssued: parseInt(mileageStats?.total_earned || '0'),
          totalCouponsUsed: parseInt(couponStats?.total_used || '0'),
          pendingSettlements: parseInt(settlementStats?.pending_requests || '0'),
          pendingSettlementAmount: parseFloat(settlementStats?.pending_amount || '0'),
        },
        
        users: {
          total: parseInt(userStats?.total_users || '0'),
          regular: parseInt(userStats?.regular_users || '0'),
          business: parseInt(userStats?.business_users || '0'),
          active: parseInt(userStats?.active_users || '0'),
          newThisPeriod: parseInt(userStats?.new_users || '0'),
          growthRate: parseFloat(userGrowthRate),
          activeRate: userStats?.total_users > 0 ? 
            (parseInt(userStats?.active_total || '0') / parseInt(userStats?.total_users || '1') * 100).toFixed(1) : '0',
        },
        
        businesses: {
          total: parseInt(businessStats?.total_businesses || '0'),
          approved: parseInt(businessStats?.approved_businesses || '0'),
          pending: parseInt(businessStats?.pending_businesses || '0'),
          newThisPeriod: parseInt(businessStats?.new_businesses || '0'),
          growthRate: parseFloat(businessGrowthRate),
          averageRating: parseFloat(businessStats?.overall_rating || '0').toFixed(2),
          totalScans: parseInt(businessStats?.total_scans || '0'),
        },
        
        mileage: {
          totalEarned: parseInt(mileageStats?.total_earned || '0'),
          totalUsed: parseInt(mileageStats?.total_used || '0'),
          periodEarned: parseInt(mileageStats?.period_earned || '0'),
          periodUsed: parseInt(mileageStats?.period_used || '0'),
          utilizationRate: mileageStats?.total_earned > 0 ?
            (parseInt(mileageStats?.total_used || '0') / parseInt(mileageStats?.total_earned || '1') * 100).toFixed(1) : '0',
          activeTransactions: parseInt(mileageStats?.period_earn_count || '0') + parseInt(mileageStats?.period_use_count || '0'),
        },
        
        coupons: {
          totalIssued: parseInt(couponStats?.total_issued || '0'),
          totalUsed: parseInt(couponStats?.total_used || '0'),
          totalDiscountAmount: parseFloat(couponStats?.total_discount || '0'),
          periodIssued: parseInt(couponStats?.period_issued || '0'),
          periodUsed: parseInt(couponStats?.period_used || '0'),
          periodDiscountAmount: parseFloat(couponStats?.period_discount || '0'),
          usageRate: couponStats?.total_issued > 0 ?
            (parseInt(couponStats?.total_used || '0') / parseInt(couponStats?.total_issued || '1') * 100).toFixed(1) : '0',
        },
        
        settlements: {
          totalRequests: parseInt(settlementStats?.total_requests || '0'),
          totalAmount: parseFloat(settlementStats?.total_amount || '0'),
          pendingRequests: parseInt(settlementStats?.pending_requests || '0'),
          pendingAmount: parseFloat(settlementStats?.pending_amount || '0'),
          paidRequests: parseInt(settlementStats?.paid_requests || '0'),
          paidAmount: parseFloat(settlementStats?.paid_amount || '0'),
          periodRequests: parseInt(settlementStats?.period_requests || '0'),
        },
        
        recentActivities,
        topBusinesses,
        timeframe,
        generatedAt: new Date().toISOString(),
      };
      
      sendSuccess(res, dashboardData, 'Dashboard data retrieved successfully');
      
    } catch (error) {
      log.error('Get admin dashboard error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Get detailed analytics
   */
  async getAnalytics(req: Request, res: Response): Promise<void> {
    const timeframe = req.query.timeframe as string || 'month';
    const metric = req.query.metric as string || 'users'; // users, businesses, mileage, coupons
    const db = getDatabase();
    
    try {
      let analyticsData: any = {};
      
      switch (metric) {
        case 'users':
          analyticsData = await this.getUserAnalytics(db, timeframe);
          break;
        case 'businesses':
          analyticsData = await this.getBusinessAnalytics(db, timeframe);
          break;
        case 'mileage':
          analyticsData = await this.getMileageAnalytics(db, timeframe);
          break;
        case 'coupons':
          analyticsData = await this.getCouponAnalytics(db, timeframe);
          break;
        default:
          return Errors.NOT_FOUND('Analytics metric').send(res, 404);
      }
      
      sendSuccess(res, {
        metric,
        timeframe,
        ...analyticsData,
        generatedAt: new Date().toISOString(),
      }, 'Analytics data retrieved successfully');
      
    } catch (error) {
      log.error('Get analytics error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Helper method to get recent activities
   */
  private async getRecentActivities(db: any, limit: number = 10): Promise<any[]> {
    // This would be implemented with a proper activity log table
    // For now, we'll simulate recent activities
    
    const activities = [
      {
        id: '1',
        type: 'user_signup',
        description: '새로운 사용자가 가입했습니다',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
        metadata: { userId: 'user-123', email: 'user@example.com' }
      },
      {
        id: '2',
        type: 'business_application',
        description: '새로운 사업자 등록 신청이 접수되었습니다',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        metadata: { businessName: '카페 버즈', category: 'cafe' }
      },
      {
        id: '3',
        type: 'settlement_request',
        description: '정산 요청이 접수되었습니다',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
        metadata: { amount: 50000, businessName: '맛집 A' }
      }
    ];
    
    return activities.slice(0, limit);
  }
  
  /**
   * Helper method to get user analytics
   */
  private async getUserAnalytics(db: any, timeframe: string): Promise<any> {
    // Implementation for detailed user analytics
    const data = await db('users')
      .select(
        db.raw('DATE(created_at) as date'),
        db.raw('COUNT(*) as signups'),
        db.raw('COUNT(CASE WHEN auth_provider = "google" THEN 1 END) as google_signups'),
        db.raw('COUNT(CASE WHEN auth_provider = "kakao" THEN 1 END) as kakao_signups')
      )
      .where('created_at', '>=', this.getStartDateForTimeframe(timeframe))
      .groupBy('date')
      .orderBy('date', 'asc');
    
    return {
      chartData: data,
      summary: {
        totalSignups: data.reduce((sum, item) => sum + item.signups, 0),
        avgDailySignups: data.length > 0 ? (data.reduce((sum, item) => sum + item.signups, 0) / data.length).toFixed(1) : '0',
      }
    };
  }
  
  /**
   * Helper method to get business analytics
   */
  private async getBusinessAnalytics(db: any, timeframe: string): Promise<any> {
    const data = await db('businesses')
      .select(
        'category',
        db.raw('COUNT(*) as count'),
        db.raw('AVG(avg_rating) as avg_rating'),
        db.raw('SUM(qr_scan_count) as total_scans')
      )
      .where('status', BusinessStatus.APPROVED)
      .groupBy('category')
      .orderBy('count', 'desc');
    
    return {
      categoryDistribution: data,
      summary: {
        totalApproved: data.reduce((sum, item) => sum + item.count, 0),
        averageRating: data.length > 0 ? (data.reduce((sum, item) => sum + (item.avg_rating * item.count), 0) / data.reduce((sum, item) => sum + item.count, 0)).toFixed(2) : '0',
      }
    };
  }
  
  /**
   * Helper method to get mileage analytics
   */
  private async getMileageAnalytics(db: any, timeframe: string): Promise<any> {
    const data = await db('mileage_transactions')
      .select(
        db.raw('DATE(created_at) as date'),
        db.raw('SUM(CASE WHEN type = "earn" THEN amount ELSE 0 END) as earned'),
        db.raw('SUM(CASE WHEN type = "use" THEN amount ELSE 0 END) as used'),
        db.raw('COUNT(CASE WHEN type = "earn" THEN 1 END) as earn_count'),
        db.raw('COUNT(CASE WHEN type = "use" THEN 1 END) as use_count')
      )
      .where('created_at', '>=', this.getStartDateForTimeframe(timeframe))
      .groupBy('date')
      .orderBy('date', 'asc');
    
    return {
      chartData: data,
      summary: {
        totalEarned: data.reduce((sum, item) => sum + item.earned, 0),
        totalUsed: data.reduce((sum, item) => sum + item.used, 0),
        totalTransactions: data.reduce((sum, item) => sum + item.earn_count + item.use_count, 0),
      }
    };
  }
  
  /**
   * Helper method to get coupon analytics
   */
  private async getCouponAnalytics(db: any, timeframe: string): Promise<any> {
    const data = await db('user_coupons as uc')
      .join('coupons as c', 'uc.coupon_id', 'c.id')
      .select(
        'c.type',
        db.raw('COUNT(*) as total_issued'),
        db.raw('COUNT(CASE WHEN uc.status = "used" THEN 1 END) as total_used'),
        db.raw('SUM(CASE WHEN uc.status = "used" THEN uc.used_amount ELSE 0 END) as total_discount')
      )
      .where('uc.issued_at', '>=', this.getStartDateForTimeframe(timeframe))
      .groupBy('c.type')
      .orderBy('total_used', 'desc');
    
    return {
      typeDistribution: data,
      summary: {
        totalIssued: data.reduce((sum, item) => sum + item.total_issued, 0),
        totalUsed: data.reduce((sum, item) => sum + item.total_used, 0),
        totalDiscount: data.reduce((sum, item) => sum + item.total_discount, 0),
      }
    };
  }
  
  /**
   * Helper method to get start date for timeframe
   */
  private getStartDateForTimeframe(timeframe: string): Date {
    const now = new Date();
    
    switch (timeframe) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default: // month
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }
}

export default new AdminDashboardController();