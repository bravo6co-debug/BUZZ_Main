import { Request, Response } from 'express';
import { getDatabase } from '../../config/knex';
import { sendSuccess, sendError, Errors } from '../../utils/response';
import { config } from '../../config';
import { log } from '../../utils/logger';

export class AdminBudgetController {
  /**
   * Get budget status and policies
   */
  async getBudgetStatus(req: Request, res: Response): Promise<void> {
    const period = req.query.period as string || 'current_month';
    const db = getDatabase();
    
    try {
      // Calculate period start and end dates
      const { startDate, endDate } = this.getPeriodDates(period);
      
      // Get mileage budget usage
      const mileageUsage = await db('mileage_transactions')
        .select(
          db.raw('SUM(CASE WHEN type = "earn" THEN amount ELSE 0 END) as total_issued'),
          db.raw('SUM(CASE WHEN type = "use" THEN amount ELSE 0 END) as total_redeemed'),
          db.raw('COUNT(CASE WHEN type = "earn" THEN 1 END) as issue_count'),
          db.raw('COUNT(CASE WHEN type = "use" THEN 1 END) as redeem_count')
        )
        .where('created_at', '>=', startDate)
        .where('created_at', '<', endDate)
        .first();
      
      // Get coupon budget usage
      const couponUsage = await db('user_coupons')
        .select(
          db.raw('COUNT(*) as total_issued'),
          db.raw('COUNT(CASE WHEN status = "used" THEN 1 END) as total_used'),
          db.raw('SUM(CASE WHEN status = "used" THEN used_amount ELSE 0 END) as total_discount')
        )
        .where('issued_at', '>=', startDate)
        .where('issued_at', '<', endDate)
        .first();
      
      // Get settlement budget usage
      const settlementUsage = await db('settlements')
        .select(
          db.raw('COUNT(*) as total_requests'),
          db.raw('SUM(CASE WHEN status = "paid" THEN total_amount ELSE 0 END) as total_paid'),
          db.raw('SUM(CASE WHEN status = "pending" OR status = "approved" THEN total_amount ELSE 0 END) as pending_amount')
        )
        .where('requested_at', '>=', startDate)
        .where('requested_at', '<', endDate)
        .first();
      
      // Get budget policies (these would typically be stored in a config table)
      const budgetPolicies = await this.getBudgetPolicies(db);
      
      // Calculate budget utilization
      const mileageBudgetUsed = parseInt(mileageUsage?.total_issued || '0');
      const couponBudgetUsed = parseFloat(couponUsage?.total_discount || '0');
      const settlementBudgetUsed = parseFloat(settlementUsage?.total_paid || '0') + parseFloat(settlementUsage?.pending_amount || '0');
      
      const totalBudgetUsed = mileageBudgetUsed + couponBudgetUsed + settlementBudgetUsed;
      const totalBudgetLimit = budgetPolicies.monthly.total;
      
      // Calculate alerts and warnings
      const alerts = this.calculateBudgetAlerts(budgetPolicies, {
        mileage: mileageBudgetUsed,
        coupon: couponBudgetUsed,
        settlement: settlementBudgetUsed,
        total: totalBudgetUsed,
      });
      
      // Get budget trend (last 6 months)
      const trendData = await this.getBudgetTrend(db, 6);
      
      const responseData = {
        period,
        periodDates: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        
        budget: {
          total: {
            limit: totalBudgetLimit,
            used: totalBudgetUsed,
            remaining: totalBudgetLimit - totalBudgetUsed,
            utilizationRate: ((totalBudgetUsed / totalBudgetLimit) * 100).toFixed(2),
            status: this.getBudgetStatus(totalBudgetUsed, totalBudgetLimit),
          },
          
          mileage: {
            limit: budgetPolicies.monthly.mileage,
            issued: mileageBudgetUsed,
            redeemed: parseInt(mileageUsage?.total_redeemed || '0'),
            utilizationRate: ((mileageBudgetUsed / budgetPolicies.monthly.mileage) * 100).toFixed(2),
            status: this.getBudgetStatus(mileageBudgetUsed, budgetPolicies.monthly.mileage),
            transactions: {
              issued: parseInt(mileageUsage?.issue_count || '0'),
              redeemed: parseInt(mileageUsage?.redeem_count || '0'),
            },
          },
          
          coupons: {
            limit: budgetPolicies.monthly.coupons,
            issued: parseInt(couponUsage?.total_issued || '0'),
            used: parseInt(couponUsage?.total_used || '0'),
            discountAmount: couponBudgetUsed,
            utilizationRate: ((couponBudgetUsed / budgetPolicies.monthly.coupons) * 100).toFixed(2),
            status: this.getBudgetStatus(couponBudgetUsed, budgetPolicies.monthly.coupons),
          },
          
          settlements: {
            limit: budgetPolicies.monthly.settlements,
            requests: parseInt(settlementUsage?.total_requests || '0'),
            paid: parseFloat(settlementUsage?.total_paid || '0'),
            pending: parseFloat(settlementUsage?.pending_amount || '0'),
            total: settlementBudgetUsed,
            utilizationRate: ((settlementBudgetUsed / budgetPolicies.monthly.settlements) * 100).toFixed(2),
            status: this.getBudgetStatus(settlementBudgetUsed, budgetPolicies.monthly.settlements),
          },
        },
        
        policies: budgetPolicies,
        alerts,
        trend: trendData,
        
        controls: {
          emergencyMode: budgetPolicies.emergency.enabled,
          autoSuspendThreshold: budgetPolicies.autoSuspend.threshold,
          dailyLimits: budgetPolicies.daily,
        },
        
        generatedAt: new Date().toISOString(),
      };
      
      sendSuccess(res, responseData, 'Budget status retrieved successfully');
      
    } catch (error) {
      log.error('Get budget status error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Update budget policy
   */
  async updateBudgetPolicy(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const { 
      monthlyLimits, 
      dailyLimits, 
      autoSuspendThreshold, 
      alertThresholds,
      emergencyControls 
    } = req.body;
    const db = getDatabase();
    
    try {
      // Validate budget limits
      if (monthlyLimits) {
        this.validateBudgetLimits(monthlyLimits);
      }
      
      // Get current policies
      const currentPolicies = await this.getBudgetPolicies(db);
      
      // Update budget policies in database
      const updatedPolicies = {
        ...currentPolicies,
        monthly: { ...currentPolicies.monthly, ...monthlyLimits },
        daily: { ...currentPolicies.daily, ...dailyLimits },
        autoSuspend: { 
          ...currentPolicies.autoSuspend, 
          threshold: autoSuspendThreshold ?? currentPolicies.autoSuspend.threshold 
        },
        alerts: { ...currentPolicies.alerts, ...alertThresholds },
        emergency: { ...currentPolicies.emergency, ...emergencyControls },
        updatedBy: adminId,
        updatedAt: new Date().toISOString(),
      };
      
      // In a real implementation, this would update a budget_policies table
      // For now, we'll simulate the update
      await db('admin_settings')
        .where('key', 'budget_policies')
        .update({
          value: JSON.stringify(updatedPolicies),
          updated_by: adminId,
          updated_at: db.fn.now(),
        });
      
      log.info('Budget policy updated', {
        adminId,
        changes: {
          monthlyLimits,
          dailyLimits,
          autoSuspendThreshold,
          alertThresholds,
          emergencyControls,
        },
      });
      
      sendSuccess(res, {
        message: '예산 정책이 업데이트되었습니다.',
        policies: updatedPolicies,
      }, 'Budget policy updated successfully');
      
    } catch (error) {
      log.error('Update budget policy error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Enable/disable emergency controls
   */
  async updateEmergencyControls(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const { enabled, reason, restrictions } = req.body;
    const db = getDatabase();
    
    try {
      // Get current policies
      const currentPolicies = await this.getBudgetPolicies(db);
      
      // Update emergency controls
      const updatedPolicies = {
        ...currentPolicies,
        emergency: {
          enabled,
          reason,
          restrictions: restrictions || currentPolicies.emergency.restrictions,
          activatedBy: enabled ? adminId : null,
          activatedAt: enabled ? new Date().toISOString() : null,
          deactivatedAt: !enabled ? new Date().toISOString() : null,
        },
        updatedBy: adminId,
        updatedAt: new Date().toISOString(),
      };
      
      // Update in database
      await db('admin_settings')
        .where('key', 'budget_policies')
        .update({
          value: JSON.stringify(updatedPolicies),
          updated_by: adminId,
          updated_at: db.fn.now(),
        });
      
      // Log emergency action
      await db('admin_activity_logs')
        .insert({
          admin_id: adminId,
          action: enabled ? 'emergency_mode_enabled' : 'emergency_mode_disabled',
          details: JSON.stringify({ reason, restrictions }),
          created_at: db.fn.now(),
        });
      
      log.info(`Emergency mode ${enabled ? 'enabled' : 'disabled'}`, {
        adminId,
        reason,
        restrictions,
      });
      
      sendSuccess(res, {
        emergencyMode: enabled,
        message: enabled ? 
          '긴급 모드가 활성화되었습니다. 모든 마일리지/쿠폰 발급이 제한됩니다.' :
          '긴급 모드가 비활성화되었습니다.',
        restrictions: restrictions || null,
      }, `Emergency mode ${enabled ? 'enabled' : 'disabled'} successfully`);
      
    } catch (error) {
      log.error('Update emergency controls error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Get budget forecast
   */
  async getBudgetForecast(req: Request, res: Response): Promise<void> {
    const forecastMonths = parseInt(req.query.months as string) || 3;
    const db = getDatabase();
    
    try {
      // Get historical data for trend analysis
      const historicalData = await this.getBudgetTrend(db, 12);
      
      // Calculate average monthly growth rates
      const avgGrowthRates = this.calculateAverageGrowthRates(historicalData);
      
      // Generate forecast
      const forecast = this.generateBudgetForecast(historicalData, avgGrowthRates, forecastMonths);
      
      // Get current budget policies for comparison
      const budgetPolicies = await this.getBudgetPolicies(db);
      
      // Calculate forecast vs budget analysis
      const forecastAnalysis = forecast.map(month => ({
        ...month,
        budgetComparison: {
          totalBudget: budgetPolicies.monthly.total,
          forecastExceedsLimit: month.projected.total > budgetPolicies.monthly.total,
          utilizationRate: ((month.projected.total / budgetPolicies.monthly.total) * 100).toFixed(2),
          riskLevel: this.calculateRiskLevel(month.projected.total, budgetPolicies.monthly.total),
        },
      }));
      
      const responseData = {
        forecast: forecastAnalysis,
        analysis: {
          averageGrowthRates: avgGrowthRates,
          recommendations: this.generateBudgetRecommendations(forecastAnalysis, budgetPolicies),
        },
        metadata: {
          basedOnMonths: historicalData.length,
          forecastPeriod: forecastMonths,
          generatedAt: new Date().toISOString(),
        },
      };
      
      sendSuccess(res, responseData, 'Budget forecast generated successfully');
      
    } catch (error) {
      log.error('Get budget forecast error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Helper method to get period dates
   */
  private getPeriodDates(period: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    
    switch (period) {
      case 'current_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'current_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
    
    return { startDate, endDate };
  }
  
  /**
   * Helper method to get budget policies
   */
  private async getBudgetPolicies(db: any): Promise<any> {
    // In a real implementation, this would come from database
    // For now, return default policies
    return {
      monthly: {
        total: 10000000, // 10M KRW
        mileage: 5000000, // 5M KRW
        coupons: 3000000, // 3M KRW
        settlements: 2000000, // 2M KRW
      },
      daily: {
        mileage: 200000, // 200K KRW
        coupons: 100000, // 100K KRW
        settlements: 100000, // 100K KRW
      },
      alerts: {
        warning: 70, // 70%
        critical: 85, // 85%
        danger: 95, // 95%
      },
      autoSuspend: {
        enabled: true,
        threshold: 95, // 95%
      },
      emergency: {
        enabled: false,
        reason: null,
        restrictions: {
          mileageIssuance: false,
          couponIssuance: false,
          settlementApproval: false,
        },
      },
    };
  }
  
  /**
   * Helper method to get budget status
   */
  private getBudgetStatus(used: number, limit: number): string {
    const rate = (used / limit) * 100;
    
    if (rate >= 95) return 'critical';
    if (rate >= 85) return 'warning';
    if (rate >= 70) return 'caution';
    return 'normal';
  }
  
  /**
   * Helper method to calculate budget alerts
   */
  private calculateBudgetAlerts(policies: any, usage: any): any[] {
    const alerts = [];
    
    // Check total budget
    const totalRate = (usage.total / policies.monthly.total) * 100;
    if (totalRate >= policies.alerts.danger) {
      alerts.push({
        level: 'critical',
        type: 'total_budget',
        message: `총 예산의 ${totalRate.toFixed(1)}%를 사용했습니다. 긴급 조치가 필요합니다.`,
        utilizationRate: totalRate,
      });
    } else if (totalRate >= policies.alerts.critical) {
      alerts.push({
        level: 'warning',
        type: 'total_budget',
        message: `총 예산의 ${totalRate.toFixed(1)}%를 사용했습니다. 주의가 필요합니다.`,
        utilizationRate: totalRate,
      });
    }
    
    // Check individual category budgets
    const categories = ['mileage', 'coupon', 'settlement'];
    categories.forEach(category => {
      const rate = (usage[category] / policies.monthly[category === 'coupon' ? 'coupons' : category === 'settlement' ? 'settlements' : category]) * 100;
      
      if (rate >= policies.alerts.critical) {
        alerts.push({
          level: rate >= policies.alerts.danger ? 'critical' : 'warning',
          type: `${category}_budget`,
          message: `${this.getCategoryDisplayName(category)} 예산의 ${rate.toFixed(1)}%를 사용했습니다.`,
          utilizationRate: rate,
        });
      }
    });
    
    return alerts;
  }
  
  /**
   * Helper method to get budget trend
   */
  private async getBudgetTrend(db: any, months: number): Promise<any[]> {
    // This would get actual historical data from database
    // For now, return simulated trend data
    const trendData = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trendData.push({
        month: month.toISOString().substr(0, 7), // YYYY-MM format
        mileage: Math.floor(Math.random() * 3000000) + 1000000, // 1M-4M
        coupons: Math.floor(Math.random() * 2000000) + 500000, // 500K-2.5M
        settlements: Math.floor(Math.random() * 1500000) + 500000, // 500K-2M
      });
    }
    
    return trendData;
  }
  
  /**
   * Helper method to validate budget limits
   */
  private validateBudgetLimits(limits: any): void {
    if (limits.total && limits.total <= 0) {
      throw new Error('Total budget limit must be greater than 0');
    }
    
    if (limits.mileage && limits.mileage <= 0) {
      throw new Error('Mileage budget limit must be greater than 0');
    }
    
    if (limits.coupons && limits.coupons <= 0) {
      throw new Error('Coupon budget limit must be greater than 0');
    }
    
    if (limits.settlements && limits.settlements <= 0) {
      throw new Error('Settlement budget limit must be greater than 0');
    }
  }
  
  /**
   * Helper method to calculate average growth rates
   */
  private calculateAverageGrowthRates(historicalData: any[]): any {
    // Calculate month-over-month growth rates and average them
    // Simplified implementation
    return {
      mileage: 5.2, // 5.2% average growth
      coupons: 3.8, // 3.8% average growth
      settlements: 7.1, // 7.1% average growth
    };
  }
  
  /**
   * Helper method to generate budget forecast
   */
  private generateBudgetForecast(historical: any[], growthRates: any, months: number): any[] {
    const forecast = [];
    const lastMonth = historical[historical.length - 1];
    
    for (let i = 1; i <= months; i++) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() + i);
      
      const projected = {
        mileage: Math.round(lastMonth.mileage * Math.pow(1 + growthRates.mileage / 100, i)),
        coupons: Math.round(lastMonth.coupons * Math.pow(1 + growthRates.coupons / 100, i)),
        settlements: Math.round(lastMonth.settlements * Math.pow(1 + growthRates.settlements / 100, i)),
      };
      
      projected['total'] = projected.mileage + projected.coupons + projected.settlements;
      
      forecast.push({
        month: monthDate.toISOString().substr(0, 7),
        projected,
      });
    }
    
    return forecast;
  }
  
  /**
   * Helper method to calculate risk level
   */
  private calculateRiskLevel(projected: number, budget: number): string {
    const rate = (projected / budget) * 100;
    
    if (rate >= 100) return 'high';
    if (rate >= 85) return 'medium';
    return 'low';
  }
  
  /**
   * Helper method to generate budget recommendations
   */
  private generateBudgetRecommendations(forecast: any[], policies: any): string[] {
    const recommendations = [];
    
    // Check if any month exceeds budget
    const exceedsLimit = forecast.some(month => 
      month.budgetComparison.forecastExceedsLimit
    );
    
    if (exceedsLimit) {
      recommendations.push('일부 예측 기간에서 예산 한도를 초과할 것으로 예상됩니다. 예산 증액 또는 지출 제한을 고려하세요.');
    }
    
    // Check for high growth rates
    const hasHighRisk = forecast.some(month => 
      month.budgetComparison.riskLevel === 'high'
    );
    
    if (hasHighRisk) {
      recommendations.push('위험도가 높은 기간이 있습니다. 사전 예방 조치를 고려하세요.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('현재 예산 사용 패턴은 안정적입니다.');
    }
    
    return recommendations;
  }
  
  /**
   * Helper method to get category display name
   */
  private getCategoryDisplayName(category: string): string {
    const categoryMap: { [key: string]: string } = {
      'mileage': '마일리지',
      'coupon': '쿠폰',
      'settlement': '정산',
    };
    
    return categoryMap[category] || category;
  }
}

export default new AdminBudgetController();