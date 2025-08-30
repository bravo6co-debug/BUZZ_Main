import { Request, Response } from 'express';
import { getDatabase } from '../config/knex';
import { sendSuccess, sendError, Errors, sendPaginated } from '../utils/response';
import { hashPassword, comparePassword } from '../utils/auth';
import { UserRole, BusinessStatus, ApplicationStatus } from '../types';
import { log } from '../utils/logger';

export class BusinessController {
  /**
   * Apply for business account
   */
  async apply(req: Request, res: Response): Promise<void> {
    const { email, password, businessInfo, documents } = req.body;
    const db = getDatabase();
    
    try {
      // Check if email already exists
      const existingUser = await db('users')
        .where('email', email)
        .first();
      
      if (existingUser) {
        return Errors.DUPLICATE_ENTRY('Email').send(res, 409);
      }
      
      // Check if business registration number already exists
      const existingApplication = await db('business_applications')
        .where('business_info->registrationNumber', businessInfo.registrationNumber)
        .where('status', '!=', ApplicationStatus.REJECTED)
        .first();
      
      if (existingApplication) {
        return Errors.DUPLICATE_ENTRY('Business registration number').send(res, 409);
      }
      
      // Hash password
      const passwordHash = await hashPassword(password);
      
      // Create business application
      const applicationData = {
        email,
        password_hash: passwordHash,
        business_info: businessInfo,
        documents: documents || [],
        status: ApplicationStatus.PENDING,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      };
      
      const [application] = await db('business_applications')
        .insert(applicationData)
        .returning('*');
      
      log.info('Business application submitted', {
        applicationId: application.id,
        email,
        businessName: businessInfo.name,
      });
      
      sendSuccess(res, {
        applicationId: application.id,
        status: application.status,
        submittedAt: application.created_at,
        expiresAt: application.expires_at,
        message: '사업자 등록 신청이 완료되었습니다. 승인까지 3-5일 소요됩니다.',
      }, 'Business application submitted successfully', 201);
      
    } catch (error) {
      log.error('Business application error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Check application status
   */
  async getApplicationStatus(req: Request, res: Response): Promise<void> {
    const { email } = req.query;
    const db = getDatabase();
    
    if (!email) {
      return sendError(res, 'VALIDATION_003', 'Email is required', null, 400);
    }
    
    try {
      const application = await db('business_applications')
        .where('email', email as string)
        .orderBy('created_at', 'desc')
        .first();
      
      if (!application) {
        return Errors.NOT_FOUND('Business application').send(res, 404);
      }
      
      const responseData = {
        applicationId: application.id,
        email: application.email,
        businessInfo: application.business_info,
        status: application.status,
        submittedAt: application.created_at,
        reviewedAt: application.reviewed_at,
        reviewedBy: application.reviewed_by,
        rejectionReason: application.rejection_reason,
        expiresAt: application.expires_at,
      };
      
      // If approved, also include the created user/business info
      if (application.status === ApplicationStatus.APPROVED && application.approved_user_id) {
        const user = await db('users')
          .where('id', application.approved_user_id)
          .first();
        
        if (user) {
          responseData['approvedAccount'] = {
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        }
      }
      
      sendSuccess(res, responseData, 'Application status retrieved successfully');
      
    } catch (error) {
      log.error('Get application status error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Business account login
   */
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;
    const db = getDatabase();
    
    try {
      // Find business user
      const user = await db('users')
        .where('email', email)
        .where('role', UserRole.BUSINESS)
        .where('is_active', true)
        .first();
      
      if (!user || !user.password_hash) {
        log.auth('business_login_failed', email, false, { reason: 'user_not_found' });
        return Errors.INVALID_CREDENTIALS().send(res, 401);
      }
      
      // Verify password
      const isValidPassword = await comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        log.auth('business_login_failed', user.id, false, { reason: 'invalid_password' });
        return Errors.INVALID_CREDENTIALS().send(res, 401);
      }
      
      // Get business info
      const business = await db('businesses')
        .where('owner_id', user.id)
        .first();
      
      if (!business) {
        return sendError(res, 'BUSINESS_002', 'Business account not found', null, 404);
      }
      
      if (business.status !== BusinessStatus.APPROVED) {
        return Errors.BUSINESS_NOT_APPROVED().send(res, 403);
      }
      
      // Update login statistics
      await db('users')
        .where('id', user.id)
        .update({
          last_login_at: db.fn.now(),
          login_count: db.raw('login_count + 1'),
        });
      
      log.auth('business_login_success', user.id, true, { businessId: business.id });
      
      sendSuccess(res, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        business: {
          id: business.id,
          businessName: business.business_name,
          category: business.category,
          status: business.status,
          qrScanCount: business.qr_scan_count,
          avgRating: business.avg_rating,
          reviewCount: business.review_count,
        },
      }, 'Business login successful');
      
    } catch (error) {
      log.error('Business login error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Get business dashboard data
   */
  async getDashboard(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const db = getDatabase();
    
    try {
      // Get business info
      const business = await db('businesses')
        .where('owner_id', userId)
        .first();
      
      if (!business) {
        return Errors.NOT_FOUND('Business').send(res, 404);
      }
      
      // Get today's statistics
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // Get coupon usage stats
      const couponStats = await db('user_coupons')
        .where('used_business_id', business.id)
        .select(
          db.raw('COUNT(*) as total_used'),
          db.raw('SUM(used_amount) as total_amount'),
          db.raw('COUNT(CASE WHEN used_at >= ? THEN 1 END) as today_used', [startOfToday]),
          db.raw('SUM(CASE WHEN used_at >= ? THEN used_amount ELSE 0 END) as today_amount', [startOfToday])
        )
        .first();
      
      // Get mileage usage stats
      const mileageStats = await db('mileage_transactions')
        .where('business_id', business.id)
        .where('type', 'use')
        .select(
          db.raw('COUNT(*) as total_transactions'),
          db.raw('SUM(amount) as total_amount'),
          db.raw('COUNT(CASE WHEN created_at >= ? THEN 1 END) as today_transactions', [startOfToday]),
          db.raw('SUM(CASE WHEN created_at >= ? THEN amount ELSE 0 END) as today_amount', [startOfToday])
        )
        .first();
      
      // Get pending settlement amount
      const pendingSettlement = await db('settlements')
        .where('business_id', business.id)
        .whereIn('status', ['pending', 'approved'])
        .sum('total_amount as amount')
        .first();
      
      // Get recent transactions (last 10)
      const recentTransactions = await db.raw(`
        SELECT 'coupon' as type, used_at as created_at, used_amount as amount, 'Coupon Usage' as description
        FROM user_coupons 
        WHERE used_business_id = ? AND used_at IS NOT NULL
        UNION ALL
        SELECT 'mileage' as type, created_at, amount, description
        FROM mileage_transactions 
        WHERE business_id = ? AND type = 'use'
        ORDER BY created_at DESC
        LIMIT 10
      `, [business.id, business.id]);
      
      const dashboardData = {
        business: {
          id: business.id,
          businessName: business.business_name,
          category: business.category,
          status: business.status,
          qrScanCount: business.qr_scan_count,
          avgRating: business.avg_rating,
          reviewCount: business.review_count,
        },
        stats: {
          coupons: {
            totalUsed: parseInt(couponStats?.total_used || '0'),
            totalAmount: parseFloat(couponStats?.total_amount || '0'),
            todayUsed: parseInt(couponStats?.today_used || '0'),
            todayAmount: parseFloat(couponStats?.today_amount || '0'),
          },
          mileage: {
            totalTransactions: parseInt(mileageStats?.total_transactions || '0'),
            totalAmount: parseFloat(mileageStats?.total_amount || '0'),
            todayTransactions: parseInt(mileageStats?.today_transactions || '0'),
            todayAmount: parseFloat(mileageStats?.today_amount || '0'),
          },
          settlement: {
            pendingAmount: parseFloat(pendingSettlement?.amount || '0'),
          },
        },
        recentTransactions: recentTransactions[0] || [],
      };
      
      sendSuccess(res, dashboardData, 'Dashboard data retrieved successfully');
      
    } catch (error) {
      log.error('Get business dashboard error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Get settlement history
   */
  async getSettlements(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const offset = (page - 1) * limit;
    const db = getDatabase();
    
    try {
      // Get business ID
      const business = await db('businesses')
        .select('id')
        .where('owner_id', userId)
        .first();
      
      if (!business) {
        return Errors.NOT_FOUND('Business').send(res, 404);
      }
      
      // Build query
      let query = db('settlements')
        .where('business_id', business.id);
      
      if (status && ['pending', 'approved', 'rejected', 'paid'].includes(status)) {
        query = query.where('status', status);
      }
      
      // Get settlements with pagination
      const settlements = await query
        .orderBy('requested_at', 'desc')
        .limit(limit)
        .offset(offset);
      
      // Get total count
      let countQuery = db('settlements')
        .where('business_id', business.id);
      
      if (status && ['pending', 'approved', 'rejected', 'paid'].includes(status)) {
        countQuery = countQuery.where('status', status);
      }
      
      const totalCount = await countQuery.count('* as count').first();
      const total = parseInt(totalCount?.count || '0');
      
      sendPaginated(res, settlements, total, page, limit, 'Settlements retrieved successfully');
      
    } catch (error) {
      log.error('Get settlements error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Request settlement
   */
  async requestSettlement(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { settlementDate, bankInfo, transactions } = req.body;
    const db = getDatabase();
    
    try {
      // Get business ID
      const business = await db('businesses')
        .where('owner_id', userId)
        .first();
      
      if (!business) {
        return Errors.NOT_FOUND('Business').send(res, 404);
      }
      
      if (business.status !== BusinessStatus.APPROVED) {
        return Errors.BUSINESS_NOT_APPROVED().send(res, 403);
      }
      
      // Calculate total amount
      const couponAmount = transactions?.coupon?.amount || 0;
      const mileageAmount = transactions?.mileage?.amount || 0;
      const totalAmount = couponAmount + mileageAmount;
      
      if (totalAmount <= 0) {
        return sendError(res, 'SETTLEMENT_001', 'Settlement amount must be greater than 0', null, 400);
      }
      
      // Create settlement request
      const settlementData = {
        business_id: business.id,
        settlement_date: new Date(settlementDate),
        coupon_count: transactions?.coupon?.count || 0,
        coupon_amount: couponAmount,
        mileage_count: transactions?.mileage?.count || 0,
        mileage_amount: mileageAmount,
        total_amount: totalAmount,
        bank_name: bankInfo.bankName,
        bank_account: bankInfo.accountNumber,
        status: 'pending',
        requested_at: db.fn.now(),
      };
      
      const [settlement] = await db('settlements')
        .insert(settlementData)
        .returning('*');
      
      log.info('Settlement request created', {
        settlementId: settlement.id,
        businessId: business.id,
        totalAmount,
      });
      
      sendSuccess(res, {
        settlementId: settlement.id,
        status: settlement.status,
        totalAmount: settlement.total_amount,
        requestedAt: settlement.requested_at,
        message: '정산 요청이 완료되었습니다. 승인까지 2-3일 소요됩니다.',
      }, 'Settlement request created successfully', 201);
      
    } catch (error) {
      log.error('Settlement request error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
}

export default new BusinessController();