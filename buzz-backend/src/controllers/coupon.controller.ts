import { Request, Response } from 'express';
import { getDatabase } from '../config/knex';
import { sendSuccess, sendError, Errors, sendPaginated } from '../utils/response';
import { UserCouponStatus, BusinessStatus } from '../types';
import { log } from '../utils/logger';

export class CouponController {
  /**
   * Get user's coupons
   */
  async getUserCoupons(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const db = getDatabase();
    
    try {
      let query = db('user_coupons as uc')
        .join('coupons as c', 'uc.coupon_id', 'c.id')
        .leftJoin('businesses as b', 'uc.used_business_id', 'b.id')
        .select(
          'uc.id as user_coupon_id',
          'uc.status',
          'uc.issued_at',
          'uc.used_at',
          'uc.used_amount',
          'uc.expires_at',
          'uc.qr_code_data',
          'c.id as coupon_id',
          'c.name',
          'c.type',
          'c.discount_type',
          'c.discount_value',
          'c.min_purchase_amount',
          'c.max_discount_amount',
          'c.applicable_businesses',
          'b.business_name as used_business_name'
        )
        .where('uc.user_id', userId);
      
      // Filter by status if provided
      if (status && ['active', 'used', 'expired'].includes(status)) {
        query = query.where('uc.status', status);
      }
      
      const coupons = await query
        .orderBy('uc.issued_at', 'desc')
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
      
      // Transform the data to include applicable businesses info
      const transformedCoupons = await Promise.all(
        coupons.map(async (coupon) => {
          let applicableBusinesses = [];
          
          if (coupon.applicable_businesses && coupon.applicable_businesses.length > 0) {
            applicableBusinesses = await db('businesses')
              .select('id', 'business_name', 'category', 'address')
              .whereIn('id', coupon.applicable_businesses)
              .where('status', BusinessStatus.APPROVED);
          }
          
          return {
            ...coupon,
            applicableBusinesses,
            isExpiringSoon: coupon.status === 'active' && 
              new Date(coupon.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          };
        })
      );
      
      sendPaginated(res, transformedCoupons, total, page, limit, 'User coupons retrieved successfully');
      
    } catch (error) {
      log.error('Get user coupons error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Use a coupon
   */
  async useCoupon(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { qrCode, purchaseAmount, businessId } = req.body;
    const db = getDatabase();
    
    try {
      // Decode QR code to get user coupon ID
      // In a real implementation, you'd decode the QR code properly
      // For now, assume QR code contains the user_coupon_id
      const userCouponId = qrCode; // Simplified for demo
      
      // Get coupon details
      const userCoupon = await db('user_coupons as uc')
        .join('coupons as c', 'uc.coupon_id', 'c.id')
        .select(
          'uc.*',
          'c.name',
          'c.discount_type',
          'c.discount_value',
          'c.min_purchase_amount',
          'c.max_discount_amount',
          'c.applicable_businesses'
        )
        .where('uc.id', userCouponId)
        .where('uc.user_id', userId)
        .first();
      
      if (!userCoupon) {
        return Errors.NOT_FOUND('Coupon').send(res, 404);
      }
      
      // Validate coupon status
      if (userCoupon.status !== UserCouponStatus.ACTIVE) {
        return sendError(res, 'COUPON_002', 'Coupon is not active', null, 400);
      }
      
      // Check if coupon is expired
      if (new Date(userCoupon.expires_at) < new Date()) {
        // Update coupon status to expired
        await db('user_coupons')
          .where('id', userCouponId)
          .update({ status: UserCouponStatus.EXPIRED });
        
        return Errors.COUPON_EXPIRED().send(res, 400);
      }
      
      // Validate business
      const business = await db('businesses')
        .where('id', businessId)
        .where('status', BusinessStatus.APPROVED)
        .first();
      
      if (!business) {
        return Errors.NOT_FOUND('Business').send(res, 404);
      }
      
      // Check if coupon is applicable to this business
      if (userCoupon.applicable_businesses && 
          userCoupon.applicable_businesses.length > 0 && 
          !userCoupon.applicable_businesses.includes(businessId)) {
        return sendError(res, 'COUPON_003', 'Coupon not applicable to this business', null, 400);
      }
      
      // Validate minimum purchase amount
      if (userCoupon.min_purchase_amount && purchaseAmount < userCoupon.min_purchase_amount) {
        return sendError(res, 'COUPON_004', 
          `Minimum purchase amount is ₩${userCoupon.min_purchase_amount.toLocaleString()}`, 
          null, 400);
      }
      
      // Calculate discount amount
      let discountAmount = 0;
      
      if (userCoupon.discount_type === 'fixed') {
        discountAmount = userCoupon.discount_value;
      } else if (userCoupon.discount_type === 'percentage') {
        discountAmount = (purchaseAmount * userCoupon.discount_value) / 100;
      }
      
      // Apply maximum discount limit
      if (userCoupon.max_discount_amount && discountAmount > userCoupon.max_discount_amount) {
        discountAmount = userCoupon.max_discount_amount;
      }
      
      // Make sure discount doesn't exceed purchase amount
      if (discountAmount > purchaseAmount) {
        discountAmount = purchaseAmount;
      }
      
      // Use the coupon
      await db.transaction(async (trx) => {
        // Update user coupon status
        await trx('user_coupons')
          .where('id', userCouponId)
          .update({
            status: UserCouponStatus.USED,
            used_at: trx.fn.now(),
            used_business_id: businessId,
            used_amount: discountAmount,
          });
        
        // Update coupon used quantity
        await trx('coupons')
          .where('id', userCoupon.coupon_id)
          .increment('used_quantity', 1);
        
        // Update business scan count
        await trx('businesses')
          .where('id', businessId)
          .increment('qr_scan_count', 1);
        
        // Log coupon usage for analytics
        await trx('coupon_usage_logs')
          .insert({
            user_coupon_id: userCouponId,
            user_id: userId,
            business_id: businessId,
            purchase_amount: purchaseAmount,
            discount_amount: discountAmount,
            used_at: trx.fn.now(),
          });
      });
      
      log.info('Coupon used successfully', {
        userCouponId,
        userId,
        businessId,
        discountAmount,
        purchaseAmount,
      });
      
      sendSuccess(res, {
        discountAmount,
        finalAmount: purchaseAmount - discountAmount,
        businessName: business.business_name,
        couponName: userCoupon.name,
        message: `₩${discountAmount.toLocaleString()} 할인이 적용되었습니다.`,
      }, 'Coupon used successfully');
      
    } catch (error) {
      log.error('Use coupon error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Get coupon details by ID
   */
  async getCouponDetails(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.userId;
    const db = getDatabase();
    
    try {
      // Get user coupon details
      const userCoupon = await db('user_coupons as uc')
        .join('coupons as c', 'uc.coupon_id', 'c.id')
        .leftJoin('businesses as b', 'uc.used_business_id', 'b.id')
        .select(
          'uc.id as user_coupon_id',
          'uc.status',
          'uc.issued_at',
          'uc.used_at',
          'uc.used_amount',
          'uc.expires_at',
          'uc.qr_code_data',
          'c.id as coupon_id',
          'c.name',
          'c.type',
          'c.discount_type',
          'c.discount_value',
          'c.min_purchase_amount',
          'c.max_discount_amount',
          'c.applicable_businesses',
          'c.valid_from',
          'c.valid_until',
          'b.business_name as used_business_name',
          'b.address as used_business_address'
        )
        .where('uc.id', id)
        .where('uc.user_id', userId)
        .first();
      
      if (!userCoupon) {
        return Errors.NOT_FOUND('Coupon').send(res, 404);
      }
      
      // Get applicable businesses if specified
      let applicableBusinesses = [];
      if (userCoupon.applicable_businesses && userCoupon.applicable_businesses.length > 0) {
        applicableBusinesses = await db('businesses')
          .select('id', 'business_name', 'category', 'address', 'avg_rating')
          .whereIn('id', userCoupon.applicable_businesses)
          .where('status', BusinessStatus.APPROVED);
      }
      
      // Calculate coupon validity
      const now = new Date();
      const isExpired = new Date(userCoupon.expires_at) < now;
      const isExpiringSoon = !isExpired && 
        new Date(userCoupon.expires_at) < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const responseData = {
        ...userCoupon,
        applicableBusinesses,
        validity: {
          isExpired,
          isExpiringSoon,
          daysUntilExpiry: isExpired ? 0 : 
            Math.ceil((new Date(userCoupon.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        },
        usage: {
          canUse: userCoupon.status === UserCouponStatus.ACTIVE && !isExpired,
          conditions: {
            minPurchase: userCoupon.min_purchase_amount,
            maxDiscount: userCoupon.max_discount_amount,
          },
        },
      };
      
      sendSuccess(res, responseData, 'Coupon details retrieved successfully');
      
    } catch (error) {
      log.error('Get coupon details error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Get available coupons for user (coupons they can claim)
   */
  async getAvailableCoupons(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const db = getDatabase();
    
    try {
      // Get available coupons (active coupons that user hasn't claimed yet)
      const availableCoupons = await db('coupons as c')
        .leftJoin('user_coupons as uc', function() {
          this.on('c.id', 'uc.coupon_id').andOn('uc.user_id', userId);
        })
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
          'c.applicable_businesses'
        )
        .where('c.status', 'active')
        .where(function() {
          this.whereNull('c.valid_from').orWhere('c.valid_from', '<=', db.fn.now());
        })
        .where(function() {
          this.whereNull('c.valid_until').orWhere('c.valid_until', '>=', db.fn.now());
        })
        .whereNull('uc.id') // User hasn't claimed this coupon yet
        .where(function() {
          this.whereNull('c.total_quantity')
            .orWhereRaw('c.used_quantity < c.total_quantity');
        })
        .limit(limit)
        .offset(offset);
      
      // Get total count
      const totalCount = await db('coupons as c')
        .leftJoin('user_coupons as uc', function() {
          this.on('c.id', 'uc.coupon_id').andOn('uc.user_id', userId);
        })
        .where('c.status', 'active')
        .where(function() {
          this.whereNull('c.valid_from').orWhere('c.valid_from', '<=', db.fn.now());
        })
        .where(function() {
          this.whereNull('c.valid_until').orWhere('c.valid_until', '>=', db.fn.now());
        })
        .whereNull('uc.id')
        .where(function() {
          this.whereNull('c.total_quantity')
            .orWhereRaw('c.used_quantity < c.total_quantity');
        })
        .count('* as count')
        .first();
      
      const total = parseInt(totalCount?.count || '0');
      
      // Get applicable business names for each coupon
      const enrichedCoupons = await Promise.all(
        availableCoupons.map(async (coupon) => {
          let applicableBusinesses = [];
          
          if (coupon.applicable_businesses && coupon.applicable_businesses.length > 0) {
            applicableBusinesses = await db('businesses')
              .select('business_name')
              .whereIn('id', coupon.applicable_businesses)
              .where('status', BusinessStatus.APPROVED)
              .limit(3); // Show only first 3 business names
          }
          
          const remainingQuantity = coupon.total_quantity ? 
            coupon.total_quantity - coupon.used_quantity : null;
          
          return {
            ...coupon,
            applicableBusinessNames: applicableBusinesses.map(b => b.business_name),
            remainingQuantity,
            availabilityRate: coupon.total_quantity ? 
              ((coupon.total_quantity - coupon.used_quantity) / coupon.total_quantity * 100).toFixed(1) : null,
          };
        })
      );
      
      sendPaginated(res, enrichedCoupons, total, page, limit, 'Available coupons retrieved successfully');
      
    } catch (error) {
      log.error('Get available coupons error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
}

export default new CouponController();