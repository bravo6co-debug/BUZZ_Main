import express from 'express';
import { getDatabase } from '../config/knex';
import { sendSuccess, sendError, sendPaginated, Errors } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import { adminLimiter } from '../middleware/rateLimit';
import { requireAdmin, requireSuperAdmin } from '../middleware/auth';
import { config } from '../config';
import { log } from '../utils/logger';

const router = express.Router();

// Apply admin rate limiting to all routes
router.use(adminLimiter);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard data
 * @access  Private (Admin)
 */
router.get('/dashboard', requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  
  try {
    // Get overview statistics
    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: totalBusinesses },
      { count: activeReferrers },
    ] = await Promise.all([
      db('users').count('* as count').first(),
      db('users').where('is_active', true).count('* as count').first(),
      db('businesses').count('* as count').first(),
      // Placeholder for active referrers - would need referral stats
      db('users').where('role', 'user').count('* as count').first(),
    ]);

    // Get today's statistics
    const today = new Date().toISOString().split('T')[0];
    const [
      { count: newUsersToday },
      { count: qrScansToday },
      { count: settlementsToday },
    ] = await Promise.all([
      db('users').whereRaw('DATE(created_at) = ?', [today]).count('* as count').first(),
      // Placeholder for QR scans
      Promise.resolve({ count: 0 }),
      db('settlement_requests').whereRaw('DATE(created_at) = ?', [today]).count('* as count').first(),
    ]);

    // Budget information (placeholder - would come from budget_settings table)
    const budget = {
      total: config.budget.monthlyBudget,
      used: Math.floor(config.budget.monthlyBudget * 0.469), // 46.9% used
      remaining: Math.floor(config.budget.monthlyBudget * 0.531),
      executionRate: 46.9,
    };

    // Generate sample alerts
    const alerts = [];
    if (budget.executionRate > 70) {
      alerts.push({
        type: 'budget',
        level: 'warning',
        message: `예산 ${budget.executionRate}% 소진`,
      });
    }

    const dashboardData = {
      overview: {
        totalUsers: parseInt(totalUsers),
        activeUsers: parseInt(activeUsers),
        totalBusinesses: parseInt(totalBusinesses),
        activeReferrers: parseInt(activeReferrers),
      },
      budget,
      todayStats: {
        newUsers: parseInt(newUsersToday),
        qrScans: parseInt(qrScansToday),
        settlements: parseInt(settlementsToday),
        budgetUsed: Math.floor(budget.total / 30), // Daily average
      },
      alerts,
    };

    sendSuccess(res, dashboardData);

  } catch (error) {
    log.error('Dashboard data retrieval error', error);
    throw error;
  }
}));

/**
 * @route   GET /api/admin/users
 * @desc    Get user list (Admin)
 * @access  Private (Admin)
 */
router.get('/users', requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const {
    role,
    status = 'active',
    search,
    page = 1,
    limit = 50,
  } = req.query;

  let query = db('users')
    .select([
      'id',
      'email',
      'name',
      'role',
      'is_active',
      'last_login_at',
      'login_count',
      'created_at',
    ]);

  // Filter by role
  if (role) {
    query = query.where('role', role);
  }

  // Filter by status
  if (status === 'active') {
    query = query.where('is_active', true);
  } else if (status === 'suspended') {
    query = query.where('is_active', false);
  }

  // Search functionality
  if (search) {
    query = query.where(function() {
      this.where('name', 'ilike', `%${search}%`)
          .orWhere('email', 'ilike', `%${search}%`);
    });
  }

  query = query.orderBy('created_at', 'desc');

  // Get total count
  const countQuery = query.clone();
  const [{ count }] = await countQuery.clearSelect().count('* as count');
  const total = parseInt(count);

  // Apply pagination
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const users = await query.limit(parseInt(limit)).offset(offset);

  sendPaginated(res, users, total, parseInt(page), parseInt(limit));
}));

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user details (Admin)
 * @access  Private (Admin)
 */
router.get('/users/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const db = getDatabase();

  const user = await db('users')
    .leftJoin('user_profiles', 'users.id', 'user_profiles.user_id')
    .select([
      'users.*',
      'user_profiles.birth_date',
      'user_profiles.gender',
      'user_profiles.university',
      'user_profiles.referral_code',
      'user_profiles.referrer_id',
      'user_profiles.marketing_agree',
    ])
    .where('users.id', id)
    .first();

  if (!user) {
    return Errors.NOT_FOUND('User').send(res, 404);
  }

  // Get user statistics
  const stats = {
    totalReferrals: 0, // Placeholder
    totalMileage: 0,   // Placeholder
    totalCouponsUsed: 0, // Placeholder
  };

  // Try to get mileage balance
  const mileageAccount = await db('mileage_accounts')
    .where('user_id', id)
    .first();
  
  if (mileageAccount) {
    stats.totalMileage = parseFloat(mileageAccount.balance);
  }

  // Get coupon usage count
  const { count: couponUsageCount } = await db('user_coupons')
    .where('user_id', id)
    .where('status', 'used')
    .count('* as count')
    .first();
  
  stats.totalCouponsUsed = parseInt(couponUsageCount);

  const userData = {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.is_active ? 'active' : 'suspended',
      lastLoginAt: user.last_login_at,
      loginCount: user.login_count,
      createdAt: user.created_at,
    },
    profile: {
      referralCode: user.referral_code,
      referrerId: user.referrer_id,
      university: user.university,
      gender: user.gender,
      birthDate: user.birth_date,
      marketingAgree: user.marketing_agree,
    },
    stats,
  };

  sendSuccess(res, userData);
}));

/**
 * @route   PUT /api/admin/users/:id/status
 * @desc    Change user status (Admin)
 * @access  Private (Admin)
 */
router.put('/users/:id/status', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const adminId = req.user!.userId;
  const db = getDatabase();

  const user = await db('users').where('id', id).first();
  if (!user) {
    return Errors.NOT_FOUND('User').send(res, 404);
  }

  const isActive = status === 'active';
  
  await db('users')
    .where('id', id)
    .update({
      is_active: isActive,
      updated_at: db.fn.now(),
    });

  // Log the action
  log.auth('user_status_changed', id, true, {
    adminId,
    oldStatus: user.is_active ? 'active' : 'suspended',
    newStatus: status,
    reason,
  });

  sendSuccess(res, {
    userId: id,
    status,
    message: `User ${status === 'active' ? 'activated' : 'suspended'} successfully`,
  });
}));

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get audit logs (Admin)
 * @access  Private (Admin)
 */
router.get('/audit-logs', requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const {
    userId,
    action,
    entityType,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = req.query;

  let query = db('audit_logs')
    .leftJoin('users', 'audit_logs.user_id', 'users.id')
    .select([
      'audit_logs.*',
      'users.name as user_name',
      'users.email as user_email',
    ])
    .orderBy('audit_logs.created_at', 'desc');

  // Apply filters
  if (userId) {
    query = query.where('audit_logs.user_id', userId);
  }
  
  if (action) {
    query = query.where('audit_logs.action', action);
  }
  
  if (entityType) {
    query = query.where('audit_logs.entity_type', entityType);
  }
  
  if (startDate) {
    query = query.where('audit_logs.created_at', '>=', startDate);
  }
  
  if (endDate) {
    query = query.where('audit_logs.created_at', '<=', endDate);
  }

  // Get total count
  const countQuery = query.clone();
  const [{ count }] = await countQuery.clearSelect().count('audit_logs.id as count');
  const total = parseInt(count);

  // Apply pagination
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const logs = await query.limit(parseInt(limit)).offset(offset);

  sendPaginated(res, logs, total, parseInt(page), parseInt(limit));
}));

/**
 * @route   GET /api/admin/realtime
 * @desc    Get realtime monitoring data (Admin)
 * @access  Private (Admin)
 */
router.get('/realtime', requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();

  // Mock realtime data - in production this would come from Redis or real-time services
  const realtimeData = {
    activeUsers: Math.floor(Math.random() * 100) + 50,
    qrScansPerMinute: (Math.random() * 5).toFixed(1),
    apiRequestsPerMinute: Math.floor(Math.random() * 50) + 30,
    systemStatus: {
      api: 'healthy',
      database: 'healthy',
      storage: 'healthy',
    },
    recentActivities: [
      {
        type: 'qr_scan',
        businessName: '카페 버즈',
        amount: 5000,
        timestamp: new Date().toISOString(),
      },
      {
        type: 'user_signup',
        userName: '김○○',
        timestamp: new Date(Date.now() - 60000).toISOString(),
      },
      {
        type: 'business_approved',
        businessName: '피자 하우스',
        timestamp: new Date(Date.now() - 120000).toISOString(),
      },
    ],
  };

  // Test database connection for health status
  try {
    await db.raw('SELECT 1');
  } catch (error) {
    realtimeData.systemStatus.database = 'unhealthy';
  }

  sendSuccess(res, realtimeData);
}));

/**
 * @route   GET /api/admin/budget/current
 * @desc    Get current budget status (Admin)
 * @access  Private (Admin)
 */
router.get('/budget/current', requireAdmin, asyncHandler(async (req, res) => {
  // This would typically come from budget_settings and budget_executions tables
  // For now, returning mock data based on the schema
  
  const yearMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  
  const budgetData = {
    yearMonth,
    totalBudget: config.budget.monthlyBudget,
    executed: Math.floor(config.budget.monthlyBudget * 0.469),
    remaining: Math.floor(config.budget.monthlyBudget * 0.531),
    executionRate: 46.9,
    categories: {
      referral: {
        budget: Math.floor(config.budget.monthlyBudget * 0.3),
        executed: Math.floor(config.budget.monthlyBudget * 0.3 * 0.549),
        rate: 54.9,
      },
      coupon: {
        budget: Math.floor(config.budget.monthlyBudget * 0.2),
        executed: Math.floor(config.budget.monthlyBudget * 0.2 * 0.612),
        rate: 61.2,
      },
      event: {
        budget: Math.floor(config.budget.monthlyBudget * 0.3),
        executed: Math.floor(config.budget.monthlyBudget * 0.3 * 0.34),
        rate: 34.0,
      },
      settlement: {
        budget: Math.floor(config.budget.monthlyBudget * 0.2),
        executed: Math.floor(config.budget.monthlyBudget * 0.2 * 0.4),
        rate: 40.0,
      },
    },
    alerts: [],
  };

  // Generate alerts based on thresholds
  Object.entries(budgetData.categories).forEach(([category, data]) => {
    if (data.rate >= config.budget.warningThreshold) {
      budgetData.alerts.push({
        level: data.rate >= config.budget.dangerThreshold ? 'danger' : 'warning',
        message: `${category} 예산 ${data.rate}% 소진`,
        threshold: data.rate >= config.budget.dangerThreshold ? config.budget.dangerThreshold : config.budget.warningThreshold,
      });
    }
  });

  sendSuccess(res, budgetData);
}));

export default router;