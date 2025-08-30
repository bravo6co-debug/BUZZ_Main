import { Request, Response } from 'express';
import { getDatabase } from '../config/knex';
import { sendSuccess, sendError, Errors, sendPaginated } from '../utils/response';
import { SettlementStatus, BusinessStatus, UserRole } from '../types';
import { log } from '../utils/logger';

export class SettlementController {
  /**
   * Request settlement (Business users)
   */
  async requestSettlement(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { settlementDate, bankInfo, transactions } = req.body;
    const db = getDatabase();
    
    try {
      // Get business owned by user
      const business = await db('businesses')
        .where('owner_id', userId)
        .where('status', BusinessStatus.APPROVED)
        .first();
      
      if (!business) {
        return Errors.NOT_FOUND('Business').send(res, 404);
      }
      
      // Check if there's already a pending settlement
      const pendingSettlement = await db('settlements')
        .where('business_id', business.id)
        .where('status', SettlementStatus.PENDING)
        .first();
      
      if (pendingSettlement) {
        return sendError(res, 'SETTLEMENT_002', 'There is already a pending settlement request', null, 409);
      }
      
      // Validate settlement date (should be in the past and within last 30 days)
      const requestDate = new Date(settlementDate);
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      if (requestDate > now || requestDate < thirtyDaysAgo) {
        return sendError(res, 'SETTLEMENT_003', 'Invalid settlement date. Must be within last 30 days', null, 400);
      }
      
      // Calculate amounts from actual transaction data
      const couponUsage = await db('user_coupons')
        .where('used_business_id', business.id)
        .where('used_at', '>=', requestDate)
        .where('used_at', '<', new Date(requestDate.getTime() + 24 * 60 * 60 * 1000))
        .select(
          db.raw('COUNT(*) as count'),
          db.raw('SUM(used_amount) as amount')
        )
        .first();
      
      const mileageUsage = await db('mileage_transactions')
        .where('business_id', business.id)
        .where('type', 'use')
        .where('created_at', '>=', requestDate)
        .where('created_at', '<', new Date(requestDate.getTime() + 24 * 60 * 60 * 1000))
        .select(
          db.raw('COUNT(*) as count'),
          db.raw('SUM(amount) as amount')
        )
        .first();
      
      const couponAmount = parseFloat(couponUsage?.amount || '0');
      const mileageAmount = parseFloat(mileageUsage?.amount || '0');
      const totalAmount = couponAmount + mileageAmount;
      
      if (totalAmount <= 0) {
        return sendError(res, 'SETTLEMENT_004', 'No transactions found for the specified date', null, 400);
      }
      
      // Create settlement request
      const settlementData = {
        business_id: business.id,
        settlement_date: requestDate,
        coupon_count: parseInt(couponUsage?.count || '0'),
        coupon_amount: couponAmount,
        mileage_count: parseInt(mileageUsage?.count || '0'),
        mileage_amount: mileageAmount,
        total_amount: totalAmount,
        bank_name: bankInfo.bankName,
        bank_account: bankInfo.accountNumber,
        status: SettlementStatus.PENDING,
        requested_at: db.fn.now(),
      };
      
      const [settlement] = await db('settlements')
        .insert(settlementData)
        .returning('*');
      
      log.info('Settlement request created', {
        settlementId: settlement.id,
        businessId: business.id,
        userId,
        totalAmount,
        settlementDate: requestDate,
      });
      
      sendSuccess(res, {
        settlementId: settlement.id,
        totalAmount: settlement.total_amount,
        couponAmount: settlement.coupon_amount,
        mileageAmount: settlement.mileage_amount,
        status: settlement.status,
        requestedAt: settlement.requested_at,
        estimatedPaymentDate: this.calculateEstimatedPaymentDate(),
        message: '정산 요청이 완료되었습니다. 승인 후 2-3일 내에 입금됩니다.',
      }, 'Settlement request created successfully', 201);
      
    } catch (error) {
      log.error('Settlement request error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Get settlement history (Business users)
   */
  async getSettlements(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const offset = (page - 1) * limit;
    const db = getDatabase();
    
    try {
      let query: any;
      
      // Check user role to determine query approach
      if (req.user!.role === UserRole.ADMIN) {
        // Admin can see all settlements
        query = db('settlements as s')
          .join('businesses as b', 's.business_id', 'b.id')
          .join('users as u', 'b.owner_id', 'u.id')
          .select(
            's.*',
            'b.business_name',
            'b.category',
            'u.name as owner_name',
            'u.email as owner_email'
          );
      } else {
        // Business users can only see their own settlements
        query = db('settlements as s')
          .join('businesses as b', 's.business_id', 'b.id')
          .select('s.*', 'b.business_name', 'b.category')
          .where('b.owner_id', userId);
      }
      
      // Apply status filter
      if (status && Object.values(SettlementStatus).includes(status as SettlementStatus)) {
        query = query.where('s.status', status);
      }
      
      // Get settlements with pagination
      const settlements = await query
        .orderBy('s.requested_at', 'desc')
        .limit(limit)
        .offset(offset);
      
      // Get total count
      let countQuery: any;
      
      if (req.user!.role === UserRole.ADMIN) {
        countQuery = db('settlements as s')
          .join('businesses as b', 's.business_id', 'b.id');
      } else {
        countQuery = db('settlements as s')
          .join('businesses as b', 's.business_id', 'b.id')
          .where('b.owner_id', userId);
      }
      
      if (status && Object.values(SettlementStatus).includes(status as SettlementStatus)) {
        countQuery = countQuery.where('s.status', status);
      }
      
      const totalCount = await countQuery.count('* as count').first();
      const total = parseInt(totalCount?.count || '0');
      
      // Calculate summary statistics
      let summaryQuery: any;
      
      if (req.user!.role === UserRole.ADMIN) {
        summaryQuery = db('settlements as s')
          .join('businesses as b', 's.business_id', 'b.id');
      } else {
        summaryQuery = db('settlements as s')
          .join('businesses as b', 's.business_id', 'b.id')
          .where('b.owner_id', userId);
      }
      
      const summary = await summaryQuery
        .select(
          db.raw('SUM(CASE WHEN s.status = "pending" THEN s.total_amount ELSE 0 END) as pending_amount'),
          db.raw('SUM(CASE WHEN s.status = "approved" THEN s.total_amount ELSE 0 END) as approved_amount'),
          db.raw('SUM(CASE WHEN s.status = "paid" THEN s.total_amount ELSE 0 END) as paid_amount'),
          db.raw('COUNT(CASE WHEN s.status = "pending" THEN 1 END) as pending_count'),
          db.raw('COUNT(CASE WHEN s.status = "approved" THEN 1 END) as approved_count'),
          db.raw('COUNT(CASE WHEN s.status = "paid" THEN 1 END) as paid_count')
        )
        .first();
      
      const responseData = {
        settlements: settlements.map(s => ({
          ...s,
          statusDisplayName: this.getStatusDisplayName(s.status),
          canCancel: s.status === SettlementStatus.PENDING,
          canApprove: req.user!.role === UserRole.ADMIN && s.status === SettlementStatus.PENDING,
        })),
        summary: {
          pendingAmount: parseFloat(summary?.pending_amount || '0'),
          approvedAmount: parseFloat(summary?.approved_amount || '0'),
          paidAmount: parseFloat(summary?.paid_amount || '0'),
          pendingCount: parseInt(summary?.pending_count || '0'),
          approvedCount: parseInt(summary?.approved_count || '0'),
          paidCount: parseInt(summary?.paid_count || '0'),
        },
      };
      
      sendPaginated(res, [responseData], total, page, limit, 'Settlements retrieved successfully');
      
    } catch (error) {
      log.error('Get settlements error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Get settlement details by ID
   */
  async getSettlementById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.userId;
    const db = getDatabase();
    
    try {
      let query = db('settlements as s')
        .join('businesses as b', 's.business_id', 'b.id')
        .join('users as u', 'b.owner_id', 'u.id')
        .select(
          's.*',
          'b.business_name',
          'b.category',
          'b.address',
          'u.name as owner_name',
          'u.email as owner_email'
        )
        .where('s.id', id);
      
      // Non-admin users can only see their own settlements
      if (req.user!.role !== UserRole.ADMIN) {
        query = query.where('b.owner_id', userId);
      }
      
      const settlement = await query.first();
      
      if (!settlement) {
        return Errors.NOT_FOUND('Settlement').send(res, 404);
      }
      
      // Get detailed transaction data for the settlement period
      const settlementDate = new Date(settlement.settlement_date);
      const nextDay = new Date(settlementDate.getTime() + 24 * 60 * 60 * 1000);
      
      // Get coupon transactions
      const couponTransactions = await db('user_coupons as uc')
        .join('coupons as c', 'uc.coupon_id', 'c.id')
        .join('users as u', 'uc.user_id', 'u.id')
        .select(
          'uc.id',
          'uc.used_at',
          'uc.used_amount',
          'c.name as coupon_name',
          'u.name as user_name'
        )
        .where('uc.used_business_id', settlement.business_id)
        .where('uc.used_at', '>=', settlementDate)
        .where('uc.used_at', '<', nextDay)
        .orderBy('uc.used_at', 'desc');
      
      // Get mileage transactions
      const mileageTransactions = await db('mileage_transactions as mt')
        .join('users as u', 'mt.user_id', 'u.id')
        .select(
          'mt.id',
          'mt.amount',
          'mt.description',
          'mt.created_at',
          'u.name as user_name'
        )
        .where('mt.business_id', settlement.business_id)
        .where('mt.type', 'use')
        .where('mt.created_at', '>=', settlementDate)
        .where('mt.created_at', '<', nextDay)
        .orderBy('mt.created_at', 'desc');
      
      const responseData = {
        ...settlement,
        statusDisplayName: this.getStatusDisplayName(settlement.status),
        canCancel: settlement.status === SettlementStatus.PENDING && req.user!.role !== UserRole.ADMIN,
        canApprove: req.user!.role === UserRole.ADMIN && settlement.status === SettlementStatus.PENDING,
        canReject: req.user!.role === UserRole.ADMIN && settlement.status === SettlementStatus.PENDING,
        canMarkPaid: req.user!.role === UserRole.ADMIN && settlement.status === SettlementStatus.APPROVED,
        transactions: {
          coupons: couponTransactions,
          mileage: mileageTransactions,
        },
        timeline: this.generateSettlementTimeline(settlement),
      };
      
      sendSuccess(res, responseData, 'Settlement details retrieved successfully');
      
    } catch (error) {
      log.error('Get settlement details error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Cancel settlement request (Business users only, pending status only)
   */
  async cancelSettlement(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { reason } = req.body;
    const db = getDatabase();
    
    try {
      // Get settlement with business owner check
      const settlement = await db('settlements as s')
        .join('businesses as b', 's.business_id', 'b.id')
        .select('s.*', 'b.business_name')
        .where('s.id', id)
        .where('b.owner_id', userId)
        .where('s.status', SettlementStatus.PENDING)
        .first();
      
      if (!settlement) {
        return Errors.NOT_FOUND('Settlement or not cancellable').send(res, 404);
      }
      
      // Update settlement status
      await db('settlements')
        .where('id', id)
        .update({
          status: 'cancelled',
          rejection_reason: reason || 'Cancelled by business owner',
          updated_at: db.fn.now(),
        });
      
      log.info('Settlement cancelled', {
        settlementId: id,
        userId,
        businessId: settlement.business_id,
        reason,
      });
      
      sendSuccess(res, {
        settlementId: id,
        status: 'cancelled',
        message: '정산 요청이 취소되었습니다.',
      }, 'Settlement cancelled successfully');
      
    } catch (error) {
      log.error('Cancel settlement error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Helper method to get status display name
   */
  private getStatusDisplayName(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': '승인 대기',
      'approved': '승인됨',
      'rejected': '거절됨',
      'paid': '지급완료',
      'cancelled': '취소됨',
    };
    
    return statusMap[status] || status;
  }
  
  /**
   * Helper method to calculate estimated payment date
   */
  private calculateEstimatedPaymentDate(): string {
    const now = new Date();
    // Add 5 business days
    let businessDays = 0;
    let currentDate = new Date(now);
    
    while (businessDays < 5) {
      currentDate.setDate(currentDate.getDate() + 1);
      const dayOfWeek = currentDate.getDay();
      
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++;
      }
    }
    
    return currentDate.toISOString();
  }
  
  /**
   * Helper method to generate settlement timeline
   */
  private generateSettlementTimeline(settlement: any): Array<any> {
    const timeline = [
      {
        step: 'requested',
        title: '정산 요청',
        timestamp: settlement.requested_at,
        completed: true,
        description: '정산이 요청되었습니다.',
      },
    ];
    
    if (settlement.status === 'approved' || settlement.status === 'paid') {
      timeline.push({
        step: 'approved',
        title: '승인 완료',
        timestamp: settlement.approved_at,
        completed: true,
        description: '관리자가 정산을 승인했습니다.',
      });
    }
    
    if (settlement.status === 'paid') {
      timeline.push({
        step: 'paid',
        title: '지급 완료',
        timestamp: settlement.paid_at,
        completed: true,
        description: '정산 금액이 지급되었습니다.',
      });
    }
    
    if (settlement.status === 'rejected') {
      timeline.push({
        step: 'rejected',
        title: '승인 거절',
        timestamp: settlement.updated_at,
        completed: true,
        description: settlement.rejection_reason || '정산 요청이 거절되었습니다.',
      });
    }
    
    return timeline;
  }
}

export default new SettlementController();