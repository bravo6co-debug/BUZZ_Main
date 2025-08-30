import { Request, Response } from 'express';
import { getDatabase } from '../config/knex';
import { sendSuccess, sendError, Errors, sendPaginated } from '../utils/response';
import { log } from '../utils/logger';

export class UserController {
  /**
   * Get user profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const db = getDatabase();
    
    try {
      // Get user with profile data
      const userQuery = await db('users as u')
        .leftJoin('user_profiles as up', 'u.id', 'up.user_id')
        .select(
          'u.id',
          'u.email',
          'u.name',
          'u.phone',
          'u.avatar_url',
          'u.role',
          'u.created_at',
          'up.birth_date',
          'up.gender',
          'up.university',
          'up.referral_code',
          'up.marketing_agree'
        )
        .where('u.id', userId)
        .where('u.is_active', true)
        .first();
      
      if (!userQuery) {
        return Errors.NOT_FOUND('User').send(res, 404);
      }
      
      // Get mileage balance
      const mileageAccount = await db('mileage_accounts')
        .where('user_id', userId)
        .first();
      
      // Get active coupons count
      const activeCouponsCount = await db('user_coupons')
        .where('user_id', userId)
        .where('status', 'active')
        .count('* as count')
        .first();
      
      // Get referral stats
      const referralStats = await db('user_profiles')
        .where('referrer_id', userId)
        .count('* as count')
        .first();
      
      const profileData = {
        id: userQuery.id,
        email: userQuery.email,
        name: userQuery.name,
        phone: userQuery.phone,
        avatarUrl: userQuery.avatar_url,
        role: userQuery.role,
        birthDate: userQuery.birth_date,
        gender: userQuery.gender,
        university: userQuery.university,
        referralCode: userQuery.referral_code,
        marketingAgree: userQuery.marketing_agree,
        mileage: {
          balance: mileageAccount?.balance || 0,
          totalEarned: mileageAccount?.total_earned || 0,
          totalUsed: mileageAccount?.total_used || 0,
        },
        coupons: {
          active: parseInt(activeCouponsCount?.count || '0'),
        },
        referrals: {
          total: parseInt(referralStats?.count || '0'),
        },
        createdAt: userQuery.created_at,
      };
      
      sendSuccess(res, profileData, 'Profile retrieved successfully');
      
    } catch (error) {
      log.error('Get profile error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Update user profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { name, phone, birthDate, gender, university, marketingAgree } = req.body;
    const db = getDatabase();
    
    try {
      await db.transaction(async (trx) => {
        // Update user table
        const userUpdates: any = {};
        if (name) userUpdates.name = name;
        if (phone) userUpdates.phone = phone;
        userUpdates.updated_at = trx.fn.now();
        
        if (Object.keys(userUpdates).length > 1) { // More than just updated_at
          await trx('users')
            .where('id', userId)
            .update(userUpdates);
        }
        
        // Update user profile table
        const profileUpdates: any = {};
        if (birthDate) profileUpdates.birth_date = new Date(birthDate);
        if (gender) profileUpdates.gender = gender;
        if (university !== undefined) profileUpdates.university = university;
        if (marketingAgree !== undefined) profileUpdates.marketing_agree = marketingAgree;
        
        if (Object.keys(profileUpdates).length > 0) {
          await trx('user_profiles')
            .where('user_id', userId)
            .update(profileUpdates);
        }
      });
      
      // Get updated profile
      const updatedProfile = await this.getProfileData(userId);
      
      log.info('Profile updated', { userId, updates: req.body });
      
      sendSuccess(res, updatedProfile, 'Profile updated successfully');
      
    } catch (error) {
      log.error('Update profile error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Get mileage balance and recent history
   */
  async getMileage(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const db = getDatabase();
    
    try {
      // Get mileage account
      const account = await db('mileage_accounts')
        .where('user_id', userId)
        .first();
      
      if (!account) {
        return Errors.NOT_FOUND('Mileage account').send(res, 404);
      }
      
      // Get transaction history with pagination
      const transactions = await db('mileage_transactions as mt')
        .leftJoin('businesses as b', 'mt.business_id', 'b.id')
        .select(
          'mt.id',
          'mt.type',
          'mt.amount',
          'mt.balance_after',
          'mt.description',
          'mt.reference_type',
          'mt.expires_at',
          'mt.created_at',
          'b.business_name as business_name'
        )
        .where('mt.user_id', userId)
        .orderBy('mt.created_at', 'desc')
        .limit(limit)
        .offset(offset);
      
      // Get total count for pagination
      const totalCount = await db('mileage_transactions')
        .where('user_id', userId)
        .count('* as count')
        .first();
      
      const total = parseInt(totalCount?.count || '0');
      
      const responseData = {
        account: {
          balance: account.balance,
          totalEarned: account.total_earned,
          totalUsed: account.total_used,
          totalExpired: account.total_expired,
          updatedAt: account.updated_at,
        },
        transactions,
      };
      
      sendPaginated(res, [responseData], total, page, limit, 'Mileage data retrieved successfully');
      
    } catch (error) {
      log.error('Get mileage error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Get user's coupons
   */
  async getCoupons(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const db = getDatabase();
    
    try {
      let query = db('user_coupons as uc')
        .join('coupons as c', 'uc.coupon_id', 'c.id')
        .select(
          'uc.id as user_coupon_id',
          'uc.status',
          'uc.issued_at',
          'uc.used_at',
          'uc.expires_at',
          'uc.qr_code_data',
          'c.id as coupon_id',
          'c.name',
          'c.type',
          'c.discount_type',
          'c.discount_value',
          'c.min_purchase_amount',
          'c.max_discount_amount'
        )
        .where('uc.user_id', userId);
      
      // Filter by status if provided
      if (status && ['active', 'used', 'expired'].includes(status)) {
        query = query.where('uc.status', status);
      }
      
      const coupons = await query
        .orderBy('uc.created_at', 'desc')
        .limit(limit)
        .offset(offset);
      
      // Get total count
      let countQuery = db('user_coupons')
        .where('user_id', userId);
      
      if (status && ['active', 'used', 'expired'].includes(status)) {
        countQuery = countQuery.where('status', status);
      }
      
      const totalCount = await countQuery.count('* as count').first();
      const total = parseInt(totalCount?.count || '0');
      
      sendPaginated(res, coupons, total, page, limit, 'Coupons retrieved successfully');
      
    } catch (error) {
      log.error('Get coupons error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Get referral statistics
   */
  async getReferralStats(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
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
      
      // Get referral statistics
      const stats = await db('user_profiles as up')
        .join('users as u', 'up.user_id', 'u.id')
        .select(
          db.raw('COUNT(*) as total_referrals'),
          db.raw('COUNT(CASE WHEN u.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as monthly_referrals'),
          db.raw('COUNT(CASE WHEN u.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as weekly_referrals')
        )
        .where('up.referrer_id', userId)
        .where('u.is_active', true)
        .first();
      
      // Get recent referrals
      const recentReferrals = await db('user_profiles as up')
        .join('users as u', 'up.user_id', 'u.id')
        .select(
          'u.id',
          'u.name',
          'u.email',
          'u.created_at'
        )
        .where('up.referrer_id', userId)
        .where('u.is_active', true)
        .orderBy('u.created_at', 'desc')
        .limit(5);
      
      // Calculate referral rewards earned
      const rewardStats = await db('mileage_transactions')
        .select(
          db.raw('SUM(amount) as total_rewards')
        )
        .where('user_id', userId)
        .where('reference_type', 'referral')
        .first();
      
      const responseData = {
        referralCode: profile.referral_code,
        stats: {
          totalReferrals: parseInt(stats?.total_referrals || '0'),
          monthlyReferrals: parseInt(stats?.monthly_referrals || '0'),
          weeklyReferrals: parseInt(stats?.weekly_referrals || '0'),
          totalRewards: parseInt(rewardStats?.total_rewards || '0'),
        },
        recentReferrals,
        shareUrl: `https://buzz-app.com/invite/${profile.referral_code}`,
      };
      
      sendSuccess(res, responseData, 'Referral stats retrieved successfully');
      
    } catch (error) {
      log.error('Get referral stats error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Helper method to get profile data
   */
  private async getProfileData(userId: string): Promise<any> {
    const db = getDatabase();
    
    const userQuery = await db('users as u')
      .leftJoin('user_profiles as up', 'u.id', 'up.user_id')
      .select(
        'u.id',
        'u.email',
        'u.name',
        'u.phone',
        'u.avatar_url',
        'u.role',
        'u.created_at',
        'up.birth_date',
        'up.gender',
        'up.university',
        'up.referral_code',
        'up.marketing_agree'
      )
      .where('u.id', userId)
      .first();
    
    return {
      id: userQuery.id,
      email: userQuery.email,
      name: userQuery.name,
      phone: userQuery.phone,
      avatarUrl: userQuery.avatar_url,
      role: userQuery.role,
      birthDate: userQuery.birth_date,
      gender: userQuery.gender,
      university: userQuery.university,
      referralCode: userQuery.referral_code,
      marketingAgree: userQuery.marketing_agree,
      createdAt: userQuery.created_at,
    };
  }
}

export default new UserController();