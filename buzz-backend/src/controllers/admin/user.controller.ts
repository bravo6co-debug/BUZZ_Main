import { Request, Response } from 'express';
import { getDatabase } from '../../config/knex';
import { sendSuccess, sendError, Errors, sendPaginated } from '../../utils/response';
import { hashPassword } from '../../utils/auth';
import { UserRole, BusinessStatus, ApplicationStatus } from '../../types';
import { log } from '../../utils/logger';

export class AdminUserController {
  /**
   * Get all users with filters and pagination
   */
  async getUsers(req: Request, res: Response): Promise<void> {
    const {
      role,
      status,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const db = getDatabase();
    
    try {
      let query = db('users as u')
        .leftJoin('user_profiles as up', 'u.id', 'up.user_id')
        .leftJoin('businesses as b', 'u.id', 'b.owner_id')
        .select(
          'u.id',
          'u.email',
          'u.name',
          'u.phone',
          'u.role',
          'u.auth_provider',
          'u.avatar_url',
          'u.is_active',
          'u.login_count',
          'u.last_login_at',
          'u.created_at',
          'u.updated_at',
          'up.referral_code',
          'up.university',
          'up.marketing_agree',
          'b.business_name',
          'b.status as business_status'
        );
      
      // Apply filters
      if (role && Object.values(UserRole).includes(role as UserRole)) {
        query = query.where('u.role', role);
      }
      
      if (status === 'active') {
        query = query.where('u.is_active', true);
      } else if (status === 'inactive') {
        query = query.where('u.is_active', false);
      }
      
      if (search) {
        query = query.where((builder) => {
          builder
            .where('u.email', 'like', `%${search}%`)
            .orWhere('u.name', 'like', `%${search}%`)
            .orWhere('u.phone', 'like', `%${search}%`)
            .orWhere('b.business_name', 'like', `%${search}%`);
        });
      }
      
      // Apply sorting
      const validSortFields = ['created_at', 'name', 'email', 'login_count', 'last_login_at'];
      const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'created_at';
      const order = sortOrder === 'asc' ? 'asc' : 'desc';
      
      query = query.orderBy(`u.${sortField}`, order);
      
      // Get users with pagination
      const users = await query
        .limit(parseInt(limit as string))
        .offset(offset);
      
      // Get total count
      let countQuery = db('users as u')
        .leftJoin('businesses as b', 'u.id', 'b.owner_id');
      
      if (role && Object.values(UserRole).includes(role as UserRole)) {
        countQuery = countQuery.where('u.role', role);
      }
      
      if (status === 'active') {
        countQuery = countQuery.where('u.is_active', true);
      } else if (status === 'inactive') {
        countQuery = countQuery.where('u.is_active', false);
      }
      
      if (search) {
        countQuery = countQuery.where((builder) => {
          builder
            .where('u.email', 'like', `%${search}%`)
            .orWhere('u.name', 'like', `%${search}%`)
            .orWhere('u.phone', 'like', `%${search}%`)
            .orWhere('b.business_name', 'like', `%${search}%`);
        });
      }
      
      const totalCount = await countQuery.count('* as count').first();
      const total = parseInt(totalCount?.count || '0');
      
      // Enhance user data with additional info
      const enhancedUsers = await Promise.all(
        users.map(async (user) => {
          // Get mileage balance for regular users
          let mileageBalance = 0;
          if (user.role === UserRole.USER) {
            const mileageAccount = await db('mileage_accounts')
              .where('user_id', user.id)
              .first();
            mileageBalance = mileageAccount?.balance || 0;
          }
          
          // Get coupon count for regular users
          let activeCoupons = 0;
          if (user.role === UserRole.USER) {
            const couponCount = await db('user_coupons')
              .where('user_id', user.id)
              .where('status', 'active')
              .count('* as count')
              .first();
            activeCoupons = parseInt(couponCount?.count || '0');
          }
          
          // Get referral count
          let referralCount = 0;
          if (user.role === UserRole.USER) {
            const referrals = await db('user_profiles')
              .where('referrer_id', user.id)
              .count('* as count')
              .first();
            referralCount = parseInt(referrals?.count || '0');
          }
          
          return {
            ...user,
            stats: {
              mileageBalance,
              activeCoupons,
              referralCount,
            },
            displayStatus: this.getUserDisplayStatus(user),
          };
        })
      );
      
      sendPaginated(res, enhancedUsers, total, parseInt(page as string), parseInt(limit as string), 'Users retrieved successfully');
      
    } catch (error) {
      log.error('Get users error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Update user information
   */
  async updateUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const adminId = req.user!.userId;
    const { name, email, phone, role, isActive, businessStatus, notes } = req.body;
    const db = getDatabase();
    
    try {
      // Get current user data
      const currentUser = await db('users')
        .where('id', id)
        .first();
      
      if (!currentUser) {
        return Errors.NOT_FOUND('User').send(res, 404);
      }
      
      // Validate role change
      if (role && role !== currentUser.role) {
        this.validateRoleChange(currentUser.role, role);
      }
      
      // Validate email uniqueness if changed
      if (email && email !== currentUser.email) {
        const existingUser = await db('users')
          .where('email', email)
          .where('id', '!=', id)
          .first();
        
        if (existingUser) {
          return Errors.DUPLICATE_ENTRY('Email').send(res, 409);
        }
      }
      
      await db.transaction(async (trx) => {
        // Update user table
        const userUpdates: any = {
          updated_at: trx.fn.now(),
        };
        
        if (name) userUpdates.name = name;
        if (email) userUpdates.email = email;
        if (phone !== undefined) userUpdates.phone = phone;
        if (role) userUpdates.role = role;
        if (isActive !== undefined) userUpdates.is_active = isActive;
        
        await trx('users')
          .where('id', id)
          .update(userUpdates);
        
        // Update business status if user is a business owner
        if (businessStatus && currentUser.role === UserRole.BUSINESS) {
          await trx('businesses')
            .where('owner_id', id)
            .update({
              status: businessStatus,
              updated_at: trx.fn.now(),
            });
        }
        
        // Log admin action
        await trx('admin_activity_logs')
          .insert({
            admin_id: adminId,
            action: 'user_updated',
            target_type: 'user',
            target_id: id,
            details: JSON.stringify({
              changes: { name, email, phone, role, isActive, businessStatus },
              notes,
            }),
            created_at: trx.fn.now(),
          });
      });
      
      // Get updated user data
      const updatedUser = await this.getUserById(id);
      
      log.info('User updated by admin', {
        adminId,
        userId: id,
        changes: { name, email, phone, role, isActive, businessStatus },
      });
      
      sendSuccess(res, updatedUser, 'User updated successfully');
      
    } catch (error) {
      log.error('Update user error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Delete/deactivate user
   */
  async deleteUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const adminId = req.user!.userId;
    const { permanent = false, reason } = req.body;
    const db = getDatabase();
    
    try {
      // Get user data
      const user = await db('users')
        .where('id', id)
        .first();
      
      if (!user) {
        return Errors.NOT_FOUND('User').send(res, 404);
      }
      
      // Prevent deletion of other admins (unless super admin)
      if (user.role === UserRole.ADMIN && req.user!.role !== 'super_admin') {
        return sendError(res, 'AUTH_004', 'Cannot delete admin users', null, 403);
      }
      
      await db.transaction(async (trx) => {
        if (permanent) {
          // Soft delete - set deleted_at timestamp
          await trx('users')
            .where('id', id)
            .update({
              is_active: false,
              deleted_at: trx.fn.now(),
              updated_at: trx.fn.now(),
            });
          
          // Deactivate business if business user
          if (user.role === UserRole.BUSINESS) {
            await trx('businesses')
              .where('owner_id', id)
              .update({
                status: BusinessStatus.SUSPENDED,
                suspension_reason: `User account deleted: ${reason || 'No reason provided'}`,
                updated_at: trx.fn.now(),
              });
          }
          
          // Expire active coupons
          await trx('user_coupons')
            .where('user_id', id)
            .where('status', 'active')
            .update({
              status: 'expired',
              updated_at: trx.fn.now(),
            });
          
        } else {
          // Just deactivate
          await trx('users')
            .where('id', id)
            .update({
              is_active: false,
              updated_at: trx.fn.now(),
            });
        }
        
        // Log admin action
        await trx('admin_activity_logs')
          .insert({
            admin_id: adminId,
            action: permanent ? 'user_deleted' : 'user_deactivated',
            target_type: 'user',
            target_id: id,
            details: JSON.stringify({
              reason,
              permanent,
              userEmail: user.email,
              userRole: user.role,
            }),
            created_at: trx.fn.now(),
          });
      });
      
      log.info(`User ${permanent ? 'deleted' : 'deactivated'} by admin`, {
        adminId,
        userId: id,
        userEmail: user.email,
        reason,
        permanent,
      });
      
      sendSuccess(res, {
        userId: id,
        action: permanent ? 'deleted' : 'deactivated',
        message: permanent ? '사용자가 삭제되었습니다.' : '사용자가 비활성화되었습니다.',
      }, `User ${permanent ? 'deleted' : 'deactivated'} successfully`);
      
    } catch (error) {
      log.error('Delete user error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Get user details by ID
   */
  async getUserDetails(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    
    try {
      const user = await this.getUserById(id);
      
      if (!user) {
        return Errors.NOT_FOUND('User').send(res, 404);
      }
      
      sendSuccess(res, user, 'User details retrieved successfully');
      
    } catch (error) {
      log.error('Get user details error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Reset user password (admin only)
   */
  async resetUserPassword(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const adminId = req.user!.userId;
    const { temporaryPassword, requirePasswordChange = true } = req.body;
    const db = getDatabase();
    
    try {
      // Get user
      const user = await db('users')
        .where('id', id)
        .first();
      
      if (!user) {
        return Errors.NOT_FOUND('User').send(res, 404);
      }
      
      // Only allow password reset for email-based accounts
      if (user.auth_provider !== 'email') {
        return sendError(res, 'AUTH_007', 'Cannot reset password for social login accounts', null, 400);
      }
      
      // Generate new password hash
      const newPasswordHash = await hashPassword(temporaryPassword);
      
      // Update user password
      await db.transaction(async (trx) => {
        await trx('users')
          .where('id', id)
          .update({
            password_hash: newPasswordHash,
            must_change_password: requirePasswordChange,
            updated_at: trx.fn.now(),
          });
        
        // Log admin action
        await trx('admin_activity_logs')
          .insert({
            admin_id: adminId,
            action: 'password_reset',
            target_type: 'user',
            target_id: id,
            details: JSON.stringify({
              userEmail: user.email,
              requirePasswordChange,
            }),
            created_at: trx.fn.now(),
          });
      });
      
      log.info('User password reset by admin', {
        adminId,
        userId: id,
        userEmail: user.email,
        requirePasswordChange,
      });
      
      sendSuccess(res, {
        message: '사용자 비밀번호가 재설정되었습니다.',
        temporaryPassword: temporaryPassword,
        requirePasswordChange,
      }, 'Password reset successfully');
      
    } catch (error) {
      log.error('Reset user password error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Get user activity logs
   */
  async getUserActivity(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const db = getDatabase();
    
    try {
      // Get mileage transactions
      const mileageTransactions = await db('mileage_transactions')
        .select('id', 'type', 'amount', 'description', 'created_at')
        .where('user_id', id)
        .orderBy('created_at', 'desc')
        .limit(10);
      
      // Get coupon usage
      const couponUsage = await db('user_coupons as uc')
        .join('coupons as c', 'uc.coupon_id', 'c.id')
        .select('uc.id', 'uc.status', 'uc.used_at', 'c.name as coupon_name')
        .where('uc.user_id', id)
        .orderBy('uc.issued_at', 'desc')
        .limit(10);
      
      // Get login history (would be from a login_logs table in real implementation)
      const loginHistory = [
        {
          id: 1,
          loginAt: new Date().toISOString(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          success: true,
        }
      ];
      
      // Get admin actions on this user
      const adminActions = await db('admin_activity_logs')
        .join('users as admin', 'admin_activity_logs.admin_id', 'admin.id')
        .select(
          'admin_activity_logs.action',
          'admin_activity_logs.details',
          'admin_activity_logs.created_at',
          'admin.name as admin_name'
        )
        .where('admin_activity_logs.target_type', 'user')
        .where('admin_activity_logs.target_id', id)
        .orderBy('admin_activity_logs.created_at', 'desc')
        .limit(10);
      
      const activityData = {
        mileageTransactions,
        couponUsage,
        loginHistory,
        adminActions,
      };
      
      sendSuccess(res, activityData, 'User activity retrieved successfully');
      
    } catch (error) {
      log.error('Get user activity error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Helper method to get user by ID with full details
   */
  private async getUserById(userId: string): Promise<any | null> {
    const db = getDatabase();
    
    const user = await db('users as u')
      .leftJoin('user_profiles as up', 'u.id', 'up.user_id')
      .leftJoin('businesses as b', 'u.id', 'b.owner_id')
      .select(
        'u.*',
        'up.birth_date',
        'up.gender',
        'up.university',
        'up.referral_code',
        'up.referrer_id',
        'up.marketing_agree',
        'b.id as business_id',
        'b.business_name',
        'b.category as business_category',
        'b.status as business_status',
        'b.avg_rating as business_rating'
      )
      .where('u.id', userId)
      .first();
    
    if (!user) return null;
    
    // Get additional stats
    const mileageAccount = await db('mileage_accounts')
      .where('user_id', userId)
      .first();
    
    const couponCount = await db('user_coupons')
      .where('user_id', userId)
      .select(
        db.raw('COUNT(CASE WHEN status = "active" THEN 1 END) as active'),
        db.raw('COUNT(CASE WHEN status = "used" THEN 1 END) as used'),
        db.raw('COUNT(CASE WHEN status = "expired" THEN 1 END) as expired')
      )
      .first();
    
    const referralCount = await db('user_profiles')
      .where('referrer_id', userId)
      .count('* as count')
      .first();
    
    return {
      ...user,
      stats: {
        mileage: {
          balance: mileageAccount?.balance || 0,
          totalEarned: mileageAccount?.total_earned || 0,
          totalUsed: mileageAccount?.total_used || 0,
        },
        coupons: {
          active: parseInt(couponCount?.active || '0'),
          used: parseInt(couponCount?.used || '0'),
          expired: parseInt(couponCount?.expired || '0'),
        },
        referrals: {
          total: parseInt(referralCount?.count || '0'),
        },
      },
      displayStatus: this.getUserDisplayStatus(user),
    };
  }
  
  /**
   * Helper method to get user display status
   */
  private getUserDisplayStatus(user: any): string {
    if (!user.is_active) return 'inactive';
    if (user.role === UserRole.BUSINESS && user.business_status) {
      return user.business_status;
    }
    return 'active';
  }
  
  /**
   * Helper method to validate role change
   */
  private validateRoleChange(currentRole: string, newRole: string): void {
    // Define valid role transitions
    const validTransitions: { [key: string]: string[] } = {
      [UserRole.USER]: [UserRole.BUSINESS], // Users can become business users
      [UserRole.BUSINESS]: [UserRole.USER], // Business users can revert to regular users
      [UserRole.ADMIN]: [], // Admins cannot change roles via this endpoint
    };
    
    if (!validTransitions[currentRole]?.includes(newRole)) {
      throw new Error(`Invalid role transition from ${currentRole} to ${newRole}`);
    }
  }
}

export default new AdminUserController();