import { Request, Response } from 'express';
import { getDatabase } from '../config/knex';
import { sendSuccess, sendError, Errors, sendPaginated } from '../utils/response';
import { config } from '../config';
import { log } from '../utils/logger';

// Helper function to get dynamic reward amount from policies
async function getDynamicReward(type: string, context: any = {}): Promise<number> {
  const db = getDatabase();
  
  try {
    const policy = await db('reward_policies')
      .select('*')
      .where('type', type)
      .where('status', 'active')
      .first();
    
    if (!policy) return 0;
    
    const conditions = typeof policy.conditions === 'string' 
      ? JSON.parse(policy.conditions) 
      : policy.conditions;
    const reward = typeof policy.reward === 'string'
      ? JSON.parse(policy.reward)
      : policy.reward;
    
    // Check eligibility
    if (conditions.minOrderAmount && context.orderAmount < conditions.minOrderAmount) {
      return 0;
    }
    
    if (conditions.maxRewards && context.rewardCount >= conditions.maxRewards) {
      return 0;
    }
    
    return reward.amount || 0;
  } catch (error) {
    log.error('Get dynamic reward error', error);
    return 0;
  }
}

// Helper function to calculate user tier
function calculateUserTier(totalReferrals: number): string {
  if (totalReferrals >= 50) return 'platinum';
  if (totalReferrals >= 25) return 'gold';
  if (totalReferrals >= 10) return 'silver';
  return 'bronze';
}

export class ReferralController {
  /**
   * Get user's referral code
   */
  async getReferralCode(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const db = getDatabase();
    
    try {
      // Get user's referral code from profile
      const profile = await db('user_profiles')
        .select('referral_code')
        .where('user_id', userId)
        .first();
      
      if (!profile) {
        return Errors.NOT_FOUND('User profile').send(res, 404);
      }
      
      // Get referral statistics
      const stats = await db('user_profiles as up')
        .join('users as u', 'up.user_id', 'u.id')
        .select(
          db.raw('COUNT(*) as total_referrals'),
          db.raw('COUNT(CASE WHEN u.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as monthly_referrals')
        )
        .where('up.referrer_id', userId)
        .where('u.is_active', true)
        .first();
      
      // Calculate total mileage earned from referrals
      const mileageEarned = await db('mileage_transactions')
        .where('user_id', userId)
        .where('reference_type', 'referral')
        .sum('amount as total')
        .first();
      
      // Get dynamic reward amounts from policies
      const totalReferrals = parseInt(stats?.total_referrals || '0');
      const currentRewardCount = await db('mileage_transactions')
        .where('user_id', userId)
        .where('reference_type', 'referral')
        .count('* as count')
        .first();
      
      const rewardContext = {
        orderAmount: 50000, // Default context for calculation
        rewardCount: parseInt(currentRewardCount?.count || '0')
      };
      
      const [recommenderReward, refereeReward] = await Promise.all([
        getDynamicReward('referral_recommender', rewardContext),
        getDynamicReward('referral_referee', rewardContext)
      ]);
      
      const responseData = {
        referralCode: profile.referral_code,
        shareUrl: `${config.app.frontendUrl}/invite/${profile.referral_code}`,
        qrCodeUrl: `${config.app.apiUrl}/api/referral/qr/${profile.referral_code}`,
        stats: {
          totalReferrals,
          monthlyReferrals: parseInt(stats?.monthly_referrals || '0'),
          totalMileageEarned: parseInt(mileageEarned?.total || '0'),
        },
        tier: calculateUserTier(totalReferrals),
        rewards: {
          recommenderReward,
          refereeReward,
          // Legacy compatibility
          mileagePerReferral: recommenderReward,
          couponPerReferral: refereeReward,
        },
      };
      
      sendSuccess(res, responseData, 'Referral code retrieved successfully');
      
    } catch (error) {
      log.error('Get referral code error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Track referral visit/click
   */
  async trackReferral(req: Request, res: Response): Promise<void> {
    const { referralCode, metadata } = req.body;
    const userAgent = req.headers['user-agent'];
    const clientIP = req.ip;
    const db = getDatabase();
    
    try {
      // Find referrer user by referral code
      const referrerProfile = await db('user_profiles')
        .join('users', 'user_profiles.user_id', 'users.id')
        .select('users.id as user_id', 'users.name')
        .where('user_profiles.referral_code', referralCode)
        .where('users.is_active', true)
        .first();
      
      if (!referrerProfile) {
        return sendError(res, 'REFERRAL_001', 'Invalid referral code', null, 404);
      }
      
      // Track referral visit
      await db('referral_visits')
        .insert({
          referrer_id: referrerProfile.user_id,
          referral_code: referralCode,
          visitor_ip: clientIP,
          user_agent: userAgent,
          metadata: metadata || {},
          visited_at: db.fn.now(),
        });
      
      log.info('Referral visit tracked', {
        referralCode,
        referrerId: referrerProfile.user_id,
        visitorIP: clientIP,
      });
      
      sendSuccess(res, {
        referrerName: referrerProfile.name,
        message: 'Referral visit tracked successfully',
      }, 'Referral tracked successfully');
      
    } catch (error) {
      log.error('Track referral error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Get referral statistics for current user
   */
  async getReferralStats(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const timeframe = req.query.timeframe as string || 'all'; // all, month, week
    const db = getDatabase();
    
    try {
      // Get user's referral code
      const profile = await db('user_profiles')
        .select('referral_code')
        .where('user_id', userId)
        .first();
      
      if (!profile) {
        return Errors.NOT_FOUND('User profile').send(res, 404);
      }
      
      // Build time filter
      let timeFilter = '';
      switch (timeframe) {
        case 'week':
          timeFilter = 'AND u.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
          break;
        case 'month':
          timeFilter = 'AND u.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
          break;
        default:
          timeFilter = '';
      }
      
      // Get referral statistics
      const [referralStats] = await db.raw(`
        SELECT 
          COUNT(*) as total_referrals,
          COUNT(CASE WHEN u.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as weekly_referrals,
          COUNT(CASE WHEN u.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as monthly_referrals,
          COUNT(CASE WHEN u.last_login_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as active_referrals
        FROM user_profiles up
        JOIN users u ON up.user_id = u.id
        WHERE up.referrer_id = ? AND u.is_active = true ${timeFilter}
      `, [userId]);
      
      // Get visit statistics
      const [visitStats] = await db.raw(`
        SELECT 
          COUNT(*) as total_visits,
          COUNT(CASE WHEN visited_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as weekly_visits,
          COUNT(CASE WHEN visited_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as monthly_visits,
          COUNT(DISTINCT visitor_ip) as unique_visitors
        FROM referral_visits
        WHERE referrer_id = ?
      `, [userId]);
      
      // Get conversion rate (visits to signups)
      const conversionRate = visitStats[0]?.total_visits > 0 ? 
        (referralStats[0]?.total_referrals / visitStats[0]?.total_visits * 100).toFixed(2) : 0;
      
      // Get mileage earned from referrals
      const mileageEarned = await db('mileage_transactions')
        .where('user_id', userId)
        .where('reference_type', 'referral')
        .sum('amount as total')
        .first();
      
      // Get recent referrals (last 10)
      const recentReferrals = await db('user_profiles as up')
        .join('users as u', 'up.user_id', 'u.id')
        .select(
          'u.id',
          'u.name',
          'u.email',
          'u.created_at',
          'u.last_login_at'
        )
        .where('up.referrer_id', userId)
        .where('u.is_active', true)
        .orderBy('u.created_at', 'desc')
        .limit(10);
      
      // Get dynamic rewards and tier info
      const totalReferrals = parseInt(referralStats[0]?.total_referrals || '0');
      const tier = calculateUserTier(totalReferrals);
      
      // Calculate tier benefits
      const getTierBenefits = (tier: string) => {
        switch (tier) {
          case 'bronze': return { rewardBonus: 5, couponsPerMonth: 0 };
          case 'silver': return { rewardBonus: 10, couponsPerMonth: 1 };
          case 'gold': return { rewardBonus: 15, couponsPerMonth: 3 };
          case 'platinum': return { rewardBonus: 20, couponsPerMonth: -1 }; // unlimited
          default: return { rewardBonus: 0, couponsPerMonth: 0 };
        }
      };
      
      const responseData = {
        referralCode: profile.referral_code,
        tier,
        tierBenefits: getTierBenefits(tier),
        stats: {
          referrals: {
            total: totalReferrals,
            weekly: parseInt(referralStats[0]?.weekly_referrals || '0'),
            monthly: parseInt(referralStats[0]?.monthly_referrals || '0'),
            active: parseInt(referralStats[0]?.active_referrals || '0'),
          },
          visits: {
            total: parseInt(visitStats[0]?.total_visits || '0'),
            weekly: parseInt(visitStats[0]?.weekly_visits || '0'),
            monthly: parseInt(visitStats[0]?.monthly_visits || '0'),
            unique: parseInt(visitStats[0]?.unique_visitors || '0'),
          },
          performance: {
            conversionRate: parseFloat(conversionRate),
            totalMileageEarned: parseInt(mileageEarned?.total || '0'),
          },
        },
        recentReferrals,
      };
      
      sendSuccess(res, responseData, 'Referral statistics retrieved successfully');
      
    } catch (error) {
      log.error('Get referral stats error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Get referral leaderboard
   */
  async getLeaderboard(req: Request, res: Response): Promise<void> {
    const timeframe = req.query.timeframe as string || 'month'; // all, month, week
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const db = getDatabase();
    
    try {
      // Build time filter for leaderboard
      let timeFilter = '';
      switch (timeframe) {
        case 'week':
          timeFilter = 'AND u.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
          break;
        case 'month':
          timeFilter = 'AND u.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
          break;
        default:
          timeFilter = '';
      }
      
      // Get leaderboard data
      const [leaderboard] = await db.raw(`
        SELECT 
          referrer.id as user_id,
          referrer.name,
          referrer.avatar_url,
          COUNT(u.id) as referral_count,
          COALESCE(SUM(mt.amount), 0) as total_mileage_earned,
          @rank := @rank + 1 as rank
        FROM users referrer
        JOIN user_profiles rp ON referrer.id = rp.user_id
        JOIN user_profiles up ON up.referrer_id = referrer.id
        JOIN users u ON up.user_id = u.id
        LEFT JOIN mileage_transactions mt ON mt.user_id = referrer.id 
          AND mt.reference_type = 'referral'
        CROSS JOIN (SELECT @rank := 0) r
        WHERE referrer.is_active = true 
          AND u.is_active = true 
          ${timeFilter}
        GROUP BY referrer.id, referrer.name, referrer.avatar_url
        HAVING referral_count > 0
        ORDER BY referral_count DESC, total_mileage_earned DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      
      // Get total count for pagination
      const [totalCount] = await db.raw(`
        SELECT COUNT(DISTINCT referrer.id) as count
        FROM users referrer
        JOIN user_profiles rp ON referrer.id = rp.user_id
        JOIN user_profiles up ON up.referrer_id = referrer.id
        JOIN users u ON up.user_id = u.id
        WHERE referrer.is_active = true 
          AND u.is_active = true 
          ${timeFilter}
      `);
      
      const total = parseInt(totalCount[0]?.count || '0');
      
      // Get current user's rank if authenticated
      let currentUserRank = null;
      if (req.user) {
        const [userRank] = await db.raw(`
          SELECT 
            user_rank.rank,
            user_rank.referral_count,
            user_rank.total_mileage_earned
          FROM (
            SELECT 
              referrer.id,
              COUNT(u.id) as referral_count,
              COALESCE(SUM(mt.amount), 0) as total_mileage_earned,
              @rank := @rank + 1 as rank
            FROM users referrer
            JOIN user_profiles rp ON referrer.id = rp.user_id
            JOIN user_profiles up ON up.referrer_id = referrer.id
            JOIN users u ON up.user_id = u.id
            LEFT JOIN mileage_transactions mt ON mt.user_id = referrer.id 
              AND mt.reference_type = 'referral'
            CROSS JOIN (SELECT @rank := 0) r
            WHERE referrer.is_active = true 
              AND u.is_active = true 
              ${timeFilter}
            GROUP BY referrer.id
            HAVING referral_count > 0
            ORDER BY referral_count DESC, total_mileage_earned DESC
          ) user_rank
          WHERE user_rank.id = ?
        `, [req.user.userId]);
        
        currentUserRank = userRank[0] || null;
      }
      
      const responseData = {
        leaderboard,
        timeframe,
        currentUserRank,
      };
      
      sendPaginated(res, [responseData], total, page, limit, 'Referral leaderboard retrieved successfully');
      
    } catch (error) {
      log.error('Get referral leaderboard error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }

  /**
   * Claim referral reward (mileage or discount QR)
   */
  async claimReward(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;
    const { rewardType, referralIds } = req.body;
    
    if (!userId) {
      return Errors.UNAUTHORIZED('User not authenticated').send(res);
    }
    
    try {
      // Get unclaimed referrals
      const unclaimedReferrals = await db('user_profiles as up')
        .join('users as u', 'up.user_id', 'u.id')
        .select('u.id', 'u.name', 'u.created_at')
        .where('up.referrer_id', userId)
        .whereRaw('(up.reward_claimed IS NULL OR up.reward_claimed = false)')
        .where('u.is_active', true);
      
      if (unclaimedReferrals.length === 0) {
        return sendError(res, 'No unclaimed referrals available', 400);
      }
      
      // Filter by provided IDs if specified
      const referralsToProcess = referralIds 
        ? unclaimedReferrals.filter(r => referralIds.includes(r.id))
        : unclaimedReferrals;
      
      if (referralsToProcess.length === 0) {
        return sendError(res, 'No valid referrals to claim', 400);
      }
      
      let rewardData: any = {};
      
      if (rewardType === 'mileage') {
        // Calculate mileage reward based on tier
        const totalReferrals = await db('user_profiles')
          .where('referrer_id', userId)
          .count('* as count')
          .first();
        
        const tier = this.calculateUserTier(parseInt(totalReferrals?.count || '0'));
        const tierBonus = tier === 'platinum' ? 2.0 : tier === 'gold' ? 1.5 : tier === 'silver' ? 1.2 : 1.0;
        const baseReward = 500; // Base reward per referral
        const totalReward = Math.floor(referralsToProcess.length * baseReward * tierBonus);
        
        // Add mileage transaction
        await db.transaction(async (trx) => {
          await trx('mileage_transactions').insert({
            user_id: userId,
            amount: totalReward,
            type: 'earn',
            description: `리퍼럴 보상 (${referralsToProcess.length}명 추천)`,
            reference_type: 'referral',
            reference_id: referralsToProcess[0].id.toString(),
            created_at: db.fn.now(),
          });
          
          await trx('mileage_accounts')
            .where('user_id', userId)
            .increment('balance', totalReward)
            .increment('total_earned', totalReward);
          
          // Mark referrals as claimed
          await trx('user_profiles')
            .whereIn('user_id', referralsToProcess.map(r => r.id))
            .update({ 
              reward_claimed: true,
              reward_claimed_at: db.fn.now(),
              reward_type: 'mileage'
            });
        });
        
        rewardData = {
          type: 'mileage',
          amount: totalReward,
          referralCount: referralsToProcess.length,
          tier,
          tierBonus: `${(tierBonus * 100).toFixed(0)}%`,
        };
        
      } else if (rewardType === 'discount_qr') {
        // Generate discount QR code
        const discountCode = `BUZZ-DC-${Date.now().toString(36).toUpperCase()}`;
        const discountPercentage = referralsToProcess.length >= 10 ? 30 
          : referralsToProcess.length >= 5 ? 20 
          : referralsToProcess.length >= 3 ? 15 
          : 10;
        
        // Save discount code to database
        await db.transaction(async (trx) => {
          await trx('discount_codes').insert({
            code: discountCode,
            user_id: userId,
            discount_percentage: discountPercentage,
            referral_count: referralsToProcess.length,
            valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            is_used: false,
            created_at: db.fn.now(),
          });
          
          // Mark referrals as claimed
          await trx('user_profiles')
            .whereIn('user_id', referralsToProcess.map(r => r.id))
            .update({ 
              reward_claimed: true,
              reward_claimed_at: db.fn.now(),
              reward_type: 'discount_qr'
            });
        });
        
        rewardData = {
          type: 'discount_qr',
          code: discountCode,
          discountPercentage,
          referralCount: referralsToProcess.length,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          qrUrl: `/api/referral/discount-qr/${discountCode}`,
        };
      }
      
      sendSuccess(res, rewardData, `Successfully claimed ${rewardType} reward`);
      
    } catch (error) {
      log.error('Error claiming reward:', error);
      return Errors.INTERNAL_ERROR('Failed to claim reward').send(res, 500);
    }
  }

  /**
   * Get discount QR code image
   */
  async getDiscountQR(req: Request, res: Response): Promise<void> {
    const { code } = req.params;
    const userId = req.user?.userId;
    
    if (!userId) {
      return Errors.UNAUTHORIZED('User not authenticated').send(res);
    }
    
    try {
      // Verify discount code belongs to user
      const discountCode = await db('discount_codes')
        .where('code', code)
        .where('user_id', userId)
        .first();
      
      if (!discountCode) {
        return sendError(res, 'Discount code not found', 404);
      }
      
      // Generate QR code data
      const qrData = JSON.stringify({
        code: discountCode.code,
        discount: discountCode.discount_percentage,
        validUntil: discountCode.valid_until,
        userId: userId,
      });
      
      // For now, return the QR data (in production, generate actual QR image)
      sendSuccess(res, {
        qrData,
        code: discountCode.code,
        discount: discountCode.discount_percentage,
        validUntil: discountCode.valid_until,
        isUsed: discountCode.is_used,
      }, 'Discount QR retrieved successfully');
      
    } catch (error) {
      log.error('Error getting discount QR:', error);
      return Errors.INTERNAL_ERROR('Failed to get discount QR').send(res, 500);
    }
  }

  /**
   * Get available rewards for user
   */
  async getAvailableRewards(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;
    
    if (!userId) {
      return Errors.UNAUTHORIZED('User not authenticated').send(res);
    }
    
    try {
      // Get unclaimed referrals count
      const unclaimedCount = await db('user_profiles as up')
        .join('users as u', 'up.user_id', 'u.id')
        .where('up.referrer_id', userId)
        .whereRaw('(up.reward_claimed IS NULL OR up.reward_claimed = false)')
        .where('u.is_active', true)
        .count('* as count')
        .first();
      
      const count = parseInt(unclaimedCount?.count || '0');
      
      // Get user tier
      const totalReferrals = await db('user_profiles')
        .where('referrer_id', userId)
        .count('* as count')
        .first();
      
      const tier = this.calculateUserTier(parseInt(totalReferrals?.count || '0'));
      
      // Calculate potential rewards
      const tierBonus = tier === 'platinum' ? 2.0 : tier === 'gold' ? 1.5 : tier === 'silver' ? 1.2 : 1.0;
      const mileageReward = Math.floor(count * 500 * tierBonus);
      
      const discountPercentage = count >= 10 ? 30 
        : count >= 5 ? 20 
        : count >= 3 ? 15 
        : count >= 1 ? 10 
        : 0;
      
      // Get existing discount codes
      const activeDiscounts = await db('discount_codes')
        .where('user_id', userId)
        .where('is_used', false)
        .where('valid_until', '>', new Date())
        .select('code', 'discount_percentage', 'valid_until');
      
      sendSuccess(res, {
        unclaimedReferrals: count,
        tier,
        availableRewards: {
          mileage: {
            available: count > 0,
            amount: mileageReward,
            tierBonus: `${(tierBonus * 100).toFixed(0)}%`,
          },
          discountQR: {
            available: count > 0,
            discountPercentage,
            minimumReferrals: count < 3 ? 3 - count : 0,
          },
        },
        activeDiscounts,
      }, 'Available rewards retrieved successfully');
      
    } catch (error) {
      log.error('Error getting available rewards:', error);
      return Errors.INTERNAL_ERROR('Failed to get available rewards').send(res, 500);
    }
  }
}

export default new ReferralController();