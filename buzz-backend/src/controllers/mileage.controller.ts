import { Request, Response } from 'express';
import { getDatabase } from '../config/knex';
import { sendSuccess, sendError, Errors, sendPaginated } from '../utils/response';
import { BusinessStatus, MileageTransactionType } from '../types';
import { log } from '../utils/logger';

export class MileageController {
  /**
   * Get mileage balance
   */
  async getBalance(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const db = getDatabase();
    
    try {
      // Get mileage account
      const account = await db('mileage_accounts')
        .where('user_id', userId)
        .first();
      
      if (!account) {
        // Create mileage account if it doesn't exist
        await db('mileage_accounts')
          .insert({
            user_id: userId,
            balance: 0,
            total_earned: 0,
            total_used: 0,
            total_expired: 0,
            updated_at: db.fn.now(),
          });
        
        const responseData = {
          balance: 0,
          totalEarned: 0,
          totalUsed: 0,
          totalExpired: 0,
          updatedAt: new Date().toISOString(),
        };
        
        return sendSuccess(res, responseData, 'Mileage balance retrieved successfully');
      }
      
      // Get expiring mileage (expires within 30 days)
      const expiringMileage = await db('mileage_transactions')
        .where('user_id', userId)
        .where('type', MileageTransactionType.EARN)
        .whereNotNull('expires_at')
        .where('expires_at', '>', db.fn.now())
        .where('expires_at', '<=', db.raw("DATE_ADD(NOW(), INTERVAL 30 DAY)"))
        .sum('amount as expiring_amount')
        .first();
      
      const responseData = {
        balance: account.balance,
        totalEarned: account.total_earned,
        totalUsed: account.total_used,
        totalExpired: account.total_expired,
        expiringAmount: parseInt(expiringMileage?.expiring_amount || '0'),
        updatedAt: account.updated_at,
      };
      
      sendSuccess(res, responseData, 'Mileage balance retrieved successfully');
      
    } catch (error) {
      log.error('Get mileage balance error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Use mileage
   */
  async useMileage(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { qrCode, amount, businessId } = req.body;
    const db = getDatabase();
    
    try {
      // Validate amount
      if (amount <= 0) {
        return sendError(res, 'MILEAGE_002', 'Amount must be greater than 0', null, 400);
      }
      
      // Get mileage account
      const account = await db('mileage_accounts')
        .where('user_id', userId)
        .first();
      
      if (!account) {
        return Errors.NOT_FOUND('Mileage account').send(res, 404);
      }
      
      // Check if user has sufficient balance
      if (account.balance < amount) {
        return Errors.INSUFFICIENT_BALANCE().send(res, 400);
      }
      
      // Validate business
      const business = await db('businesses')
        .where('id', businessId)
        .where('status', BusinessStatus.APPROVED)
        .first();
      
      if (!business) {
        return Errors.NOT_FOUND('Business').send(res, 404);
      }
      
      // Validate QR code (simplified - in production, verify QR code authenticity)
      if (!qrCode || qrCode.length < 10) {
        return Errors.INVALID_QR_CODE().send(res, 400);
      }
      
      // Process mileage usage
      await db.transaction(async (trx) => {
        // Create mileage transaction
        await trx('mileage_transactions')
          .insert({
            user_id: userId,
            business_id: businessId,
            type: MileageTransactionType.USE,
            amount: amount,
            balance_before: account.balance,
            balance_after: account.balance - amount,
            description: `${business.business_name}에서 마일리지 사용`,
            reference_type: 'qr_payment',
            reference_id: qrCode,
            created_at: trx.fn.now(),
          });
        
        // Update mileage account
        await trx('mileage_accounts')
          .where('user_id', userId)
          .update({
            balance: trx.raw('balance - ?', [amount]),
            total_used: trx.raw('total_used + ?', [amount]),
            updated_at: trx.fn.now(),
          });
        
        // Update business scan count
        await trx('businesses')
          .where('id', businessId)
          .increment('qr_scan_count', 1);
        
        // Log mileage usage for analytics
        await trx('mileage_usage_logs')
          .insert({
            user_id: userId,
            business_id: businessId,
            amount: amount,
            qr_code: qrCode,
            used_at: trx.fn.now(),
          });
      });
      
      log.info('Mileage used successfully', {
        userId,
        businessId,
        amount,
        previousBalance: account.balance,
        newBalance: account.balance - amount,
      });
      
      sendSuccess(res, {
        usedAmount: amount,
        remainingBalance: account.balance - amount,
        businessName: business.business_name,
        message: `${amount.toLocaleString()} 마일리지가 사용되었습니다.`,
      }, 'Mileage used successfully');
      
    } catch (error) {
      log.error('Use mileage error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Get mileage transaction history
   */
  async getHistory(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string; // earn, use, expire, cancel, refund
    const offset = (page - 1) * limit;
    const db = getDatabase();
    
    try {
      let query = db('mileage_transactions as mt')
        .leftJoin('businesses as b', 'mt.business_id', 'b.id')
        .select(
          'mt.id',
          'mt.type',
          'mt.amount',
          'mt.balance_before',
          'mt.balance_after',
          'mt.description',
          'mt.reference_type',
          'mt.reference_id',
          'mt.expires_at',
          'mt.created_at',
          'b.business_name',
          'b.category as business_category'
        )
        .where('mt.user_id', userId);
      
      // Filter by transaction type if provided
      if (type && Object.values(MileageTransactionType).includes(type as MileageTransactionType)) {
        query = query.where('mt.type', type);
      }
      
      // Get transactions with pagination
      const transactions = await query
        .orderBy('mt.created_at', 'desc')
        .limit(limit)
        .offset(offset);
      
      // Get total count
      let countQuery = db('mileage_transactions')
        .where('user_id', userId);
      
      if (type && Object.values(MileageTransactionType).includes(type as MileageTransactionType)) {
        countQuery = countQuery.where('type', type);
      }
      
      const totalCount = await countQuery.count('* as count').first();
      const total = parseInt(totalCount?.count || '0');
      
      // Get summary statistics
      const summary = await db('mileage_transactions')
        .where('user_id', userId)
        .select(
          db.raw('SUM(CASE WHEN type = "earn" THEN amount ELSE 0 END) as total_earned'),
          db.raw('SUM(CASE WHEN type = "use" THEN amount ELSE 0 END) as total_used'),
          db.raw('SUM(CASE WHEN type = "expire" THEN amount ELSE 0 END) as total_expired'),
          db.raw('COUNT(CASE WHEN type = "earn" THEN 1 END) as earn_count'),
          db.raw('COUNT(CASE WHEN type = "use" THEN 1 END) as use_count')
        )
        .first();
      
      // Transform transactions to include additional info
      const enrichedTransactions = transactions.map(tx => ({
        ...tx,
        isPositive: ['earn', 'refund'].includes(tx.type),
        isNegative: ['use', 'expire', 'cancel'].includes(tx.type),
        displayAmount: ['earn', 'refund'].includes(tx.type) ? `+${tx.amount}` : `-${tx.amount}`,
        typeDisplayName: this.getTransactionTypeDisplayName(tx.type),
      }));
      
      const responseData = {
        transactions: enrichedTransactions,
        summary: {
          totalEarned: parseInt(summary?.total_earned || '0'),
          totalUsed: parseInt(summary?.total_used || '0'),
          totalExpired: parseInt(summary?.total_expired || '0'),
          earnCount: parseInt(summary?.earn_count || '0'),
          useCount: parseInt(summary?.use_count || '0'),
        },
      };
      
      sendPaginated(res, [responseData], total, page, limit, 'Mileage history retrieved successfully');
      
    } catch (error) {
      log.error('Get mileage history error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Get mileage earning opportunities
   */
  async getEarningOpportunities(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const db = getDatabase();
    
    try {
      // Get user's current stats
      const userStats = await db('users as u')
        .leftJoin('user_profiles as up', 'u.id', 'up.user_id')
        .select(
          'u.login_count',
          'up.referral_code'
        )
        .where('u.id', userId)
        .first();
      
      // Get referral count
      const referralCount = await db('user_profiles')
        .where('referrer_id', userId)
        .count('* as count')
        .first();
      
      // Get review count (how many reviews user has written)
      const reviewCount = await db('store_reviews')
        .where('user_id', userId)
        .count('* as count')
        .first();
      
      // Check recent activities (last 7 days)
      const recentActivities = await db('mileage_transactions')
        .where('user_id', userId)
        .where('created_at', '>=', db.raw('DATE_SUB(NOW(), INTERVAL 7 DAY)'))
        .select('reference_type', db.raw('COUNT(*) as count'))
        .groupBy('reference_type');
      
      const recentActivityMap = recentActivities.reduce((acc, activity) => {
        acc[activity.reference_type] = parseInt(activity.count);
        return acc;
      }, {});
      
      // Define earning opportunities
      const opportunities = [
        {
          type: 'daily_login',
          title: '매일 로그인',
          description: '매일 첫 로그인시 10 마일리지 적립',
          reward: 10,
          frequency: 'daily',
          completed: false, // Would check if user logged in today
          available: true,
        },
        {
          type: 'referral',
          title: '친구 추천',
          description: '친구 추천시 500 마일리지 적립',
          reward: 500,
          frequency: 'unlimited',
          completed: false,
          available: true,
          progress: {
            current: parseInt(referralCount?.count || '0'),
            description: `${referralCount?.count || 0}명 추천완료`,
          },
        },
        {
          type: 'review',
          title: '스토어 리뷰 작성',
          description: '스토어 방문 후 리뷰 작성시 50 마일리지 적립',
          reward: 50,
          frequency: 'per_review',
          completed: false,
          available: true,
          progress: {
            current: parseInt(reviewCount?.count || '0'),
            description: `${reviewCount?.count || 0}개 리뷰 작성완료`,
          },
        },
        {
          type: 'store_visit',
          title: '스토어 방문',
          description: '제휴 스토어 방문시 최대 100 마일리지 적립',
          reward: 100,
          frequency: 'per_visit',
          completed: false,
          available: true,
        },
        {
          type: 'social_share',
          title: '소셜 공유',
          description: '버즈 앱 공유시 20 마일리지 적립 (주 3회 한정)',
          reward: 20,
          frequency: 'weekly',
          completed: (recentActivityMap['social_share'] || 0) >= 3,
          available: (recentActivityMap['social_share'] || 0) < 3,
          progress: {
            current: recentActivityMap['social_share'] || 0,
            max: 3,
            description: `이번 주 ${recentActivityMap['social_share'] || 0}/3회 완료`,
          },
        },
      ];
      
      // Calculate total possible weekly earnings
      const weeklyPotential = 10 * 7 + 20 * 3; // Daily login + social share
      const unlimitedPotential = 500 + 50 + 100; // Per referral, review, visit
      
      const responseData = {
        opportunities,
        summary: {
          weeklyPotential,
          unlimitedPotential,
          totalOpportunities: opportunities.length,
          availableOpportunities: opportunities.filter(o => o.available).length,
        },
        userStats: {
          totalReferrals: parseInt(referralCount?.count || '0'),
          totalReviews: parseInt(reviewCount?.count || '0'),
          loginCount: userStats?.login_count || 0,
          referralCode: userStats?.referral_code,
        },
      };
      
      sendSuccess(res, responseData, 'Earning opportunities retrieved successfully');
      
    } catch (error) {
      log.error('Get earning opportunities error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Helper method to get transaction type display name
   */
  private getTransactionTypeDisplayName(type: string): string {
    const typeMap: { [key: string]: string } = {
      'earn': '적립',
      'use': '사용',
      'expire': '소멸',
      'cancel': '취소',
      'refund': '환급',
    };
    
    return typeMap[type] || type;
  }
}

export default new MileageController();