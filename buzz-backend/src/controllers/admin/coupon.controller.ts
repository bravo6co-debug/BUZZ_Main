import { Request, Response } from 'express';
import { getDatabase } from '../../config/knex';
import { sendSuccess, sendError, Errors, sendPaginated } from '../../utils/response';
import { BusinessStatus } from '../../types';
import { log } from '../../utils/logger';

export class AdminCouponController {
  /**
   * Get all coupons for admin
   */
  async getCoupons(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const type = req.query.type as string;
    const search = req.query.search as string;
    const db = getDatabase();
    
    try {
      let query = db('coupons as c')
        .leftJoin('user_coupons as uc', 'c.id', 'uc.coupon_id')
        .select(
          'c.id',
          'c.name',
          'c.type',
          'c.discount_type',
          'c.discount_value',
          'c.min_purchase_amount',
          'c.max_discount_amount',
          'c.valid_from',
          'c.valid_until',
          'c.total_quantity',
          'c.used_quantity',
          'c.status',
          'c.created_at',
          'c.updated_at',
          db.raw('COUNT(uc.id) as issued_count'),
          db.raw('COUNT(CASE WHEN uc.status = "used" THEN 1 END) as used_count'),
          db.raw('SUM(CASE WHEN uc.status = "used" THEN uc.used_amount ELSE 0 END) as total_discount_amount')
        )
        .groupBy('c.id');

      // Apply filters
      if (status && ['active', 'inactive'].includes(status)) {
        query = query.where('c.status', status);
      }

      if (type && ['basic', 'signup', 'referral', 'event'].includes(type)) {
        query = query.where('c.type', type);
      }

      if (search) {
        query = query.where(function() {
          this.where('c.name', 'ilike', `%${search}%`);
        });
      }

      const coupons = await query
        .orderBy('c.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      // Get total count
      let countQuery = db('coupons');
      if (status && ['active', 'inactive'].includes(status)) {
        countQuery = countQuery.where('status', status);
      }
      if (type && ['basic', 'signup', 'referral', 'event'].includes(type)) {
        countQuery = countQuery.where('type', type);
      }
      if (search) {
        countQuery = countQuery.where('name', 'ilike', `%${search}%`);
      }

      const totalCount = await countQuery.count('* as count').first();
      const total = parseInt(totalCount?.count || '0');

      sendPaginated(res, coupons, total, page, limit, 'Admin coupons retrieved successfully');
      
    } catch (error) {
      log.error('Get admin coupons error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }

  /**
   * Get coupon details by ID
   */
  async getCoupon(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const db = getDatabase();
    
    try {
      // Get coupon details
      const coupon = await db('coupons')
        .select('*')
        .where('id', id)
        .first();

      if (!coupon) {
        return Errors.NOT_FOUND('Coupon').send(res, 404);
      }

      // Get usage statistics
      const usageStats = await db('user_coupons')
        .select(
          db.raw('COUNT(*) as total_issued'),
          db.raw('COUNT(CASE WHEN status = "used" THEN 1 END) as total_used'),
          db.raw('COUNT(CASE WHEN status = "active" THEN 1 END) as active_count'),
          db.raw('COUNT(CASE WHEN status = "expired" THEN 1 END) as expired_count'),
          db.raw('SUM(CASE WHEN status = "used" THEN used_amount ELSE 0 END) as total_discount'),
          db.raw('AVG(CASE WHEN status = "used" THEN used_amount END) as avg_discount')
        )
        .where('coupon_id', id)
        .first();

      // Get applicable businesses if specified
      let applicableBusinesses = [];
      if (coupon.applicable_businesses && coupon.applicable_businesses.length > 0) {
        applicableBusinesses = await db('businesses')
          .select('id', 'business_name', 'category', 'address')
          .whereIn('id', coupon.applicable_businesses)
          .where('status', BusinessStatus.APPROVED);
      }

      // Get recent usage history
      const recentUsage = await db('user_coupons as uc')
        .join('users as u', 'uc.user_id', 'u.id')
        .leftJoin('businesses as b', 'uc.used_business_id', 'b.id')
        .select(
          'uc.id',
          'uc.issued_at',
          'uc.used_at',
          'uc.status',
          'uc.used_amount',
          'u.name as user_name',
          'u.email as user_email',
          'b.business_name'
        )
        .where('uc.coupon_id', id)
        .orderBy('uc.issued_at', 'desc')
        .limit(10);

      const responseData = {
        ...coupon,
        statistics: {
          ...usageStats,
          usage_rate: usageStats?.total_issued > 0 ? 
            (parseInt(usageStats.total_used || '0') / parseInt(usageStats.total_issued || '1') * 100).toFixed(1) : '0',
          remaining_quantity: coupon.total_quantity ? 
            coupon.total_quantity - (coupon.used_quantity || 0) : null,
        },
        applicableBusinesses,
        recentUsage,
      };

      sendSuccess(res, responseData, 'Coupon details retrieved successfully');
      
    } catch (error) {
      log.error('Get coupon details error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }

  /**
   * Create new coupon
   */
  async createCoupon(req: Request, res: Response): Promise<void> {
    const adminUser = req.user!;
    const {
      name,
      type,
      discount_type,
      discount_value,
      min_purchase_amount,
      max_discount_amount,
      valid_from,
      valid_until,
      total_quantity,
      applicable_businesses,
      description
    } = req.body;
    
    const db = getDatabase();
    
    try {
      // Validate applicable businesses if provided
      if (applicable_businesses && applicable_businesses.length > 0) {
        const validBusinesses = await db('businesses')
          .select('id')
          .whereIn('id', applicable_businesses)
          .where('status', BusinessStatus.APPROVED);
        
        if (validBusinesses.length !== applicable_businesses.length) {
          return sendError(res, 'ADMIN_COUPON_001', 'Some businesses are not valid', null, 400);
        }
      }

      // Create coupon
      const couponData = {
        name,
        type,
        discount_type,
        discount_value,
        min_purchase_amount: min_purchase_amount || null,
        max_discount_amount: max_discount_amount || null,
        valid_from: valid_from || null,
        valid_until: valid_until || null,
        total_quantity: total_quantity || null,
        used_quantity: 0,
        applicable_businesses: applicable_businesses || null,
        status: 'active',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      };

      const [coupon] = await db('coupons')
        .insert(couponData)
        .returning('*');

      log.info('Admin created coupon', {
        adminId: adminUser.userId,
        couponId: coupon.id,
        couponName: name,
      });

      sendSuccess(res, coupon, 'Coupon created successfully');
      
    } catch (error) {
      log.error('Create coupon error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }

  /**
   * Update coupon
   */
  async updateCoupon(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const adminUser = req.user!;
    const updateData = req.body;
    const db = getDatabase();
    
    try {
      // Check if coupon exists
      const existingCoupon = await db('coupons')
        .where('id', id)
        .first();

      if (!existingCoupon) {
        return Errors.NOT_FOUND('Coupon').send(res, 404);
      }

      // Validate applicable businesses if provided
      if (updateData.applicable_businesses && updateData.applicable_businesses.length > 0) {
        const validBusinesses = await db('businesses')
          .select('id')
          .whereIn('id', updateData.applicable_businesses)
          .where('status', BusinessStatus.APPROVED);
        
        if (validBusinesses.length !== updateData.applicable_businesses.length) {
          return sendError(res, 'ADMIN_COUPON_002', 'Some businesses are not valid', null, 400);
        }
      }

      // Prepare update data
      const allowedFields = [
        'name', 'discount_type', 'discount_value', 'min_purchase_amount',
        'max_discount_amount', 'valid_from', 'valid_until', 'total_quantity',
        'applicable_businesses', 'status'
      ];

      const filteredUpdateData = Object.keys(updateData)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updateData[key];
          return obj;
        }, {} as any);

      filteredUpdateData.updated_at = db.fn.now();

      // Update coupon
      const [updatedCoupon] = await db('coupons')
        .where('id', id)
        .update(filteredUpdateData)
        .returning('*');

      log.info('Admin updated coupon', {
        adminId: adminUser.userId,
        couponId: id,
        changes: Object.keys(filteredUpdateData),
      });

      sendSuccess(res, updatedCoupon, 'Coupon updated successfully');
      
    } catch (error) {
      log.error('Update coupon error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }

  /**
   * Delete/deactivate coupon
   */
  async deleteCoupon(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const adminUser = req.user!;
    const { permanent } = req.body;
    const db = getDatabase();
    
    try {
      // Check if coupon exists
      const existingCoupon = await db('coupons')
        .where('id', id)
        .first();

      if (!existingCoupon) {
        return Errors.NOT_FOUND('Coupon').send(res, 404);
      }

      if (permanent) {
        // Check if there are any issued user coupons
        const issuedCoupons = await db('user_coupons')
          .where('coupon_id', id)
          .count('* as count')
          .first();

        if (parseInt(issuedCoupons?.count || '0') > 0) {
          return sendError(res, 'ADMIN_COUPON_003', 
            'Cannot permanently delete coupon with issued instances', null, 400);
        }

        // Permanently delete
        await db('coupons').where('id', id).del();
        
        log.info('Admin permanently deleted coupon', {
          adminId: adminUser.userId,
          couponId: id,
        });

        sendSuccess(res, null, 'Coupon permanently deleted');
      } else {
        // Deactivate
        await db('coupons')
          .where('id', id)
          .update({ 
            status: 'inactive',
            updated_at: db.fn.now()
          });

        log.info('Admin deactivated coupon', {
          adminId: adminUser.userId,
          couponId: id,
        });

        sendSuccess(res, null, 'Coupon deactivated successfully');
      }
      
    } catch (error) {
      log.error('Delete coupon error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }

  /**
   * Issue coupons to users in bulk
   */
  async issueCoupons(req: Request, res: Response): Promise<void> {
    const adminUser = req.user!;
    const { couponId, userIds, userFilters, expirationDays } = req.body;
    const db = getDatabase();
    
    try {
      // Validate coupon
      const coupon = await db('coupons')
        .where('id', couponId)
        .where('status', 'active')
        .first();

      if (!coupon) {
        return Errors.NOT_FOUND('Active coupon').send(res, 404);
      }

      let targetUserIds = userIds || [];

      // If userFilters provided, get users based on filters
      if (userFilters && !userIds) {
        let userQuery = db('users').select('id');

        if (userFilters.role) {
          userQuery = userQuery.where('role', userFilters.role);
        }
        if (userFilters.isActive !== undefined) {
          userQuery = userQuery.where('is_active', userFilters.isActive);
        }
        if (userFilters.university) {
          userQuery = userQuery.where('university', userFilters.university);
        }
        if (userFilters.registeredAfter) {
          userQuery = userQuery.where('created_at', '>=', userFilters.registeredAfter);
        }
        if (userFilters.registeredBefore) {
          userQuery = userQuery.where('created_at', '<=', userFilters.registeredBefore);
        }

        const users = await userQuery;
        targetUserIds = users.map(u => u.id);
      }

      if (targetUserIds.length === 0) {
        return sendError(res, 'ADMIN_COUPON_004', 'No target users found', null, 400);
      }

      // Check quantity limit
      if (coupon.total_quantity) {
        const remainingQuantity = coupon.total_quantity - (coupon.used_quantity || 0);
        if (targetUserIds.length > remainingQuantity) {
          return sendError(res, 'ADMIN_COUPON_005', 
            `Insufficient coupon quantity. Remaining: ${remainingQuantity}`, null, 400);
        }
      }

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (expirationDays || 30));

      // Filter out users who already have this coupon
      const existingUserCoupons = await db('user_coupons')
        .select('user_id')
        .where('coupon_id', couponId)
        .whereIn('user_id', targetUserIds);
      
      const existingUserIds = existingUserCoupons.map(uc => uc.user_id);
      const newUserIds = targetUserIds.filter(uid => !existingUserIds.includes(uid));

      if (newUserIds.length === 0) {
        return sendError(res, 'ADMIN_COUPON_006', 'All target users already have this coupon', null, 400);
      }

      // Generate QR codes and prepare user coupons data
      const userCouponsData = newUserIds.map(userId => ({
        user_id: userId,
        coupon_id: couponId,
        issued_at: db.fn.now(),
        expires_at: expiresAt.toISOString(),
        status: 'active',
        qr_code_data: `coupon_${couponId}_${userId}_${Date.now()}`,
      }));

      // Insert user coupons and update coupon used quantity
      await db.transaction(async (trx) => {
        // Insert user coupons
        await trx('user_coupons').insert(userCouponsData);
        
        // Update coupon issued quantity (not used_quantity, which is for actual usage)
        await trx('coupons')
          .where('id', couponId)
          .increment('used_quantity', newUserIds.length); // This tracks issued quantity
      });

      log.info('Admin issued coupons in bulk', {
        adminId: adminUser.userId,
        couponId,
        issuedCount: newUserIds.length,
        skippedCount: existingUserIds.length,
      });

      sendSuccess(res, {
        issuedCount: newUserIds.length,
        skippedCount: existingUserIds.length,
        totalTargeted: targetUserIds.length,
        expiresAt: expiresAt.toISOString(),
      }, 'Coupons issued successfully');
      
    } catch (error) {
      log.error('Issue coupons error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }

  /**
   * Get coupon statistics
   */
  async getCouponStatistics(req: Request, res: Response): Promise<void> {
    const timeframe = req.query.timeframe as string || 'month';
    const db = getDatabase();
    
    try {
      // Calculate date range
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

      // Overall statistics
      const overallStats = await db('coupons as c')
        .leftJoin('user_coupons as uc', 'c.id', 'uc.coupon_id')
        .select(
          db.raw('COUNT(DISTINCT c.id) as total_coupons'),
          db.raw('COUNT(DISTINCT CASE WHEN c.status = "active" THEN c.id END) as active_coupons'),
          db.raw('COUNT(uc.id) as total_issued'),
          db.raw('COUNT(CASE WHEN uc.status = "used" THEN 1 END) as total_used'),
          db.raw('SUM(CASE WHEN uc.status = "used" THEN uc.used_amount ELSE 0 END) as total_discount_amount'),
          db.raw('AVG(CASE WHEN uc.status = "used" THEN uc.used_amount END) as avg_discount_amount')
        )
        .first();

      // Period statistics
      const periodStats = await db('user_coupons as uc')
        .join('coupons as c', 'uc.coupon_id', 'c.id')
        .select(
          db.raw('COUNT(*) as period_issued'),
          db.raw('COUNT(CASE WHEN uc.status = "used" THEN 1 END) as period_used'),
          db.raw('SUM(CASE WHEN uc.status = "used" THEN uc.used_amount ELSE 0 END) as period_discount')
        )
        .where('uc.issued_at', '>=', startDate)
        .first();

      // Type distribution
      const typeDistribution = await db('coupons as c')
        .leftJoin('user_coupons as uc', 'c.id', 'uc.coupon_id')
        .select(
          'c.type',
          db.raw('COUNT(DISTINCT c.id) as coupon_count'),
          db.raw('COUNT(uc.id) as issued_count'),
          db.raw('COUNT(CASE WHEN uc.status = "used" THEN 1 END) as used_count')
        )
        .groupBy('c.type')
        .orderBy('issued_count', 'desc');

      // Top performing coupons
      const topCoupons = await db('coupons as c')
        .leftJoin('user_coupons as uc', 'c.id', 'uc.coupon_id')
        .select(
          'c.id',
          'c.name',
          'c.type',
          'c.discount_type',
          'c.discount_value',
          db.raw('COUNT(uc.id) as issued_count'),
          db.raw('COUNT(CASE WHEN uc.status = "used" THEN 1 END) as used_count'),
          db.raw('SUM(CASE WHEN uc.status = "used" THEN uc.used_amount ELSE 0 END) as total_discount'),
          db.raw('CASE WHEN COUNT(uc.id) > 0 THEN ROUND(COUNT(CASE WHEN uc.status = "used" THEN 1 END) * 100.0 / COUNT(uc.id), 1) ELSE 0 END as usage_rate')
        )
        .groupBy('c.id', 'c.name', 'c.type', 'c.discount_type', 'c.discount_value')
        .having(db.raw('COUNT(uc.id)'), '>', 0)
        .orderBy('used_count', 'desc')
        .limit(10);

      // Daily usage trend (for charts)
      const dailyTrend = await db('user_coupons')
        .select(
          db.raw('DATE(issued_at) as date'),
          db.raw('COUNT(*) as issued'),
          db.raw('COUNT(CASE WHEN status = "used" THEN 1 END) as used'),
          db.raw('SUM(CASE WHEN status = "used" THEN used_amount ELSE 0 END) as discount_amount')
        )
        .where('issued_at', '>=', startDate)
        .groupBy(db.raw('DATE(issued_at)'))
        .orderBy('date', 'asc');

      const responseData = {
        timeframe,
        overview: {
          ...overallStats,
          ...periodStats,
          usage_rate: overallStats?.total_issued > 0 ? 
            (parseInt(overallStats.total_used || '0') / parseInt(overallStats.total_issued || '1') * 100).toFixed(1) : '0',
          period_usage_rate: periodStats?.period_issued > 0 ? 
            (parseInt(periodStats.period_used || '0') / parseInt(periodStats.period_issued || '1') * 100).toFixed(1) : '0',
        },
        typeDistribution,
        topCoupons,
        dailyTrend,
        generatedAt: new Date().toISOString(),
      };

      sendSuccess(res, responseData, 'Coupon statistics retrieved successfully');
      
    } catch (error) {
      log.error('Get coupon statistics error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }

  /**
   * Get coupon usage history
   */
  async getCouponUsageHistory(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const db = getDatabase();
    
    try {
      let query = db('user_coupons as uc')
        .join('users as u', 'uc.user_id', 'u.id')
        .leftJoin('businesses as b', 'uc.used_business_id', 'b.id')
        .select(
          'uc.id as user_coupon_id',
          'uc.status',
          'uc.issued_at',
          'uc.used_at',
          'uc.used_amount',
          'uc.expires_at',
          'u.id as user_id',
          'u.name as user_name',
          'u.email as user_email',
          'b.id as business_id',
          'b.business_name'
        )
        .where('uc.coupon_id', id);

      if (status && ['active', 'used', 'expired'].includes(status)) {
        query = query.where('uc.status', status);
      }

      const history = await query
        .orderBy('uc.issued_at', 'desc')
        .limit(limit)
        .offset(offset);

      // Get total count
      let countQuery = db('user_coupons')
        .where('coupon_id', id);
      
      if (status && ['active', 'used', 'expired'].includes(status)) {
        countQuery = countQuery.where('status', status);
      }

      const totalCount = await countQuery.count('* as count').first();
      const total = parseInt(totalCount?.count || '0');

      sendPaginated(res, history, total, page, limit, 'Coupon usage history retrieved successfully');
      
    } catch (error) {
      log.error('Get coupon usage history error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
}

export default new AdminCouponController();