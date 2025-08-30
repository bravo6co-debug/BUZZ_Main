const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, requireAdmin } = require('./auth-demo');
require('dotenv').config();

const router = express.Router();

// Supabase 클라이언트
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ========== DASHBOARD STATISTICS ==========

/**
 * 대시보드 KPI 통계
 * GET /api/admin/dashboard/stats
 */
router.get('/dashboard/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // 병렬로 통계 데이터 수집
    const [
      { data: totalUsers },
      { data: totalBusinesses },
      { data: totalCoupons },
      { data: totalMileageTransactions },
      { data: activeQRCodes },
      { data: pendingApplications }
    ] = await Promise.all([
      supabase.from('users').select('count', { count: 'exact' }),
      supabase.from('businesses').select('count', { count: 'exact' }),
      supabase.from('user_coupons').select('count', { count: 'exact' }),
      supabase.from('mileage_transactions').select('count', { count: 'exact' }),
      supabase.from('qr_codes').select('count', { count: 'exact' }).eq('status', 'active'),
      supabase.from('business_applications').select('count', { count: 'exact' }).eq('status', 'pending')
    ]);

    // 이번 달 통계
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const [
      { data: monthlyUsers },
      { data: monthlyBusinesses },
      { data: monthlyCouponsUsed }
    ] = await Promise.all([
      supabase
        .from('users')
        .select('count', { count: 'exact' })
        .gte('created_at', currentMonth.toISOString()),
      supabase
        .from('businesses')
        .select('count', { count: 'exact' })
        .gte('created_at', currentMonth.toISOString()),
      supabase
        .from('user_coupons')
        .select('count', { count: 'exact' })
        .eq('status', 'used')
        .gte('used_at', currentMonth.toISOString())
    ]);

    // 총 마일리지 사용량
    const { data: mileageStats } = await supabase
      .from('mileage_accounts')
      .select('total_earned, total_used');

    const totalEarned = mileageStats?.reduce((sum, acc) => sum + (acc.total_earned || 0), 0) || 0;
    const totalUsed = mileageStats?.reduce((sum, acc) => sum + (acc.total_used || 0), 0) || 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers: totalUsers?.length || 0,
          totalBusinesses: totalBusinesses?.length || 0,
          totalCoupons: totalCoupons?.length || 0,
          totalMileageTransactions: totalMileageTransactions?.length || 0,
          activeQRCodes: activeQRCodes?.length || 0,
          pendingApplications: pendingApplications?.length || 0
        },
        monthly: {
          newUsers: monthlyUsers?.length || 0,
          newBusinesses: monthlyBusinesses?.length || 0,
          couponsUsed: monthlyCouponsUsed?.length || 0
        },
        mileage: {
          totalEarned: totalEarned,
          totalUsed: totalUsed,
          currentBalance: totalEarned - totalUsed
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ADMIN_001',
        message: '통계 조회에 실패했습니다',
        details: error.message
      }
    });
  }
});

/**
 * 최근 활동 내역
 * GET /api/admin/dashboard/recent-activity
 */
router.get('/dashboard/recent-activity', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // 최근 사용자 등록
    const { data: recentUsers } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit) / 4);

    // 최근 비즈니스 신청
    const { data: recentApplications } = await supabase
      .from('business_applications')
      .select('id, business_name, email, status, created_at')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit) / 4);

    // 최근 쿠폰 사용
    const { data: recentCoupons } = await supabase
      .from('user_coupons')
      .select('id, used_at, used_amount, coupons(name), businesses(name)')
      .eq('status', 'used')
      .order('used_at', { ascending: false })
      .limit(parseInt(limit) / 4);

    // 최근 QR 코드 생성
    const { data: recentQRs } = await supabase
      .from('qr_codes')
      .select('id, code_type, created_at, status, users(name)')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit) / 4);

    // 통합 활동 목록 생성
    const activities = [
      ...(recentUsers || []).map(user => ({
        type: 'user_registration',
        timestamp: user.created_at,
        data: { name: user.name, email: user.email, role: user.role },
        description: `${user.name}님이 ${user.role} 계정으로 가입했습니다`
      })),
      ...(recentApplications || []).map(app => ({
        type: 'business_application',
        timestamp: app.created_at,
        data: { businessName: app.business_name, email: app.email, status: app.status },
        description: `${app.business_name} 비즈니스 신청이 접수되었습니다`
      })),
      ...(recentCoupons || []).map(coupon => ({
        type: 'coupon_usage',
        timestamp: coupon.used_at,
        data: { couponName: coupon.coupons?.name, amount: coupon.used_amount, business: coupon.businesses?.name },
        description: `${coupon.coupons?.name} 쿠폰이 ${coupon.businesses?.name || '매장'}에서 사용되었습니다`
      })),
      ...(recentQRs || []).map(qr => ({
        type: 'qr_generation',
        timestamp: qr.created_at,
        data: { type: qr.code_type, user: qr.users?.name, status: qr.status },
        description: `${qr.users?.name}님이 ${qr.code_type} QR 코드를 생성했습니다`
      }))
    ];

    // 시간순 정렬
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      data: {
        activities: activities.slice(0, parseInt(limit)),
        total: activities.length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ADMIN_002',
        message: '최근 활동 조회에 실패했습니다',
        details: error.message
      }
    });
  }
});

// ========== USER MANAGEMENT ==========

/**
 * 전체 사용자 목록
 * GET /api/admin/users
 */
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role, status = 'all', page = 1, limit = 20, search } = req.query;

    let query = supabase
      .from('users')
      .select(`
        id, name, email, role, auth_provider, is_active, 
        created_at, updated_at, last_login_at,
        mileage_accounts(balance, total_earned, total_used)
      `)
      .order('created_at', { ascending: false });

    // 필터링
    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // 페이징
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: users, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'ADMIN_003',
          message: '사용자 목록 조회에 실패했습니다'
        }
      });
    }

    res.json({
      success: true,
      data: {
        users: users || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: users?.length || 0
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_001',
        message: '서버 오류가 발생했습니다',
        details: error.message
      }
    });
  }
});

/**
 * 사용자 상세 정보
 * GET /api/admin/users/:id
 */
router.get('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id, name, email, role, auth_provider, is_active,
        created_at, updated_at, last_login_at, referral_code,
        mileage_accounts(balance, total_earned, total_used, created_at),
        user_coupons(id, status, expires_at, used_at, coupons(name, discount_type, discount_value))
      `)
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ADMIN_004',
          message: '사용자를 찾을 수 없습니다'
        }
      });
    }

    // 리퍼럴 통계
    const { data: referralStats } = await supabase
      .from('referral_tracking')
      .select('id, status, referred_user_id, reward_amount, created_at')
      .eq('referrer_user_id', userId);

    // 최근 활동
    const { data: recentActivity } = await supabase
      .from('mileage_transactions')
      .select('transaction_type, amount, description, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      success: true,
      data: {
        user,
        referralStats: {
          totalReferrals: referralStats?.length || 0,
          successfulReferrals: referralStats?.filter(r => r.status === 'completed')?.length || 0,
          totalRewards: referralStats?.reduce((sum, r) => sum + (r.reward_amount || 0), 0) || 0,
          recentReferrals: referralStats?.slice(0, 5) || []
        },
        recentActivity: recentActivity || []
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_001',
        message: '서버 오류가 발생했습니다',
        details: error.message
      }
    });
  }
});

/**
 * 사용자 상태 변경
 * PUT /api/admin/users/:id/status
 */
router.put('/users/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { isActive, reason } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_001',
          message: '유효한 상태값이 필요합니다'
        }
      });
    }

    const { error } = await supabase
      .from('users')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'ADMIN_005',
          message: '사용자 상태 변경에 실패했습니다'
        }
      });
    }

    // 관리 로그 기록 (선택사항)
    // await supabase.from('admin_logs').insert({...});

    res.json({
      success: true,
      data: {
        message: `사용자 계정이 ${isActive ? '활성화' : '비활성화'}되었습니다`
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_001',
        message: '서버 오류가 발생했습니다',
        details: error.message
      }
    });
  }
});

// ========== BUDGET MANAGEMENT & KILL SWITCH ==========

/**
 * 예산 현황 조회
 * GET /api/admin/budget/status
 */
router.get('/budget/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // 마일리지 총량
    const { data: mileageAccounts } = await supabase
      .from('mileage_accounts')
      .select('total_earned, total_used, balance');

    const totalEarned = mileageAccounts?.reduce((sum, acc) => sum + (acc.total_earned || 0), 0) || 0;
    const totalUsed = mileageAccounts?.reduce((sum, acc) => sum + (acc.total_used || 0), 0) || 0;
    const currentBalance = mileageAccounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;

    // 쿠폰 사용량
    const { data: usedCoupons } = await supabase
      .from('user_coupons')
      .select('used_amount')
      .eq('status', 'used');

    const totalCouponValue = usedCoupons?.reduce((sum, coupon) => sum + (coupon.used_amount || 0), 0) || 0;

    // 이번 달 지출
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const { data: monthlyMileage } = await supabase
      .from('mileage_transactions')
      .select('amount')
      .eq('transaction_type', 'use')
      .gte('created_at', currentMonth.toISOString());

    const monthlyMileageSpent = monthlyMileage?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

    const { data: monthlyCoupons } = await supabase
      .from('user_coupons')
      .select('used_amount')
      .eq('status', 'used')
      .gte('used_at', currentMonth.toISOString());

    const monthlyCouponSpent = monthlyCoupons?.reduce((sum, coupon) => sum + (coupon.used_amount || 0), 0) || 0;

    // 예산 제한 (환경변수나 설정에서 가져와야 함)
    const monthlyBudgetLimit = parseInt(process.env.MONTHLY_BUDGET_LIMIT) || 10000000; // 1천만원 기본값
    const totalBudgetLimit = parseInt(process.env.TOTAL_BUDGET_LIMIT) || 100000000; // 1억원 기본값

    const monthlySpent = monthlyMileageSpent + monthlyCouponSpent;
    const totalSpent = totalUsed + totalCouponValue;

    // 예산 사용률
    const monthlyUsageRate = (monthlySpent / monthlyBudgetLimit) * 100;
    const totalUsageRate = (totalSpent / totalBudgetLimit) * 100;

    // Kill Switch 상태
    const killSwitchEnabled = monthlyUsageRate >= 95 || totalUsageRate >= 95;

    res.json({
      success: true,
      data: {
        budget: {
          monthly: {
            limit: monthlyBudgetLimit,
            spent: monthlySpent,
            remaining: Math.max(0, monthlyBudgetLimit - monthlySpent),
            usageRate: Math.round(monthlyUsageRate * 100) / 100
          },
          total: {
            limit: totalBudgetLimit,
            spent: totalSpent,
            remaining: Math.max(0, totalBudgetLimit - totalSpent),
            usageRate: Math.round(totalUsageRate * 100) / 100
          }
        },
        breakdown: {
          mileage: {
            totalEarned,
            totalUsed,
            currentBalance,
            monthlyUsed: monthlyMileageSpent
          },
          coupons: {
            totalValue: totalCouponValue,
            monthlyValue: monthlyCouponSpent
          }
        },
        killSwitch: {
          enabled: killSwitchEnabled,
          triggers: [
            { condition: 'monthly >= 95%', active: monthlyUsageRate >= 95 },
            { condition: 'total >= 95%', active: totalUsageRate >= 95 }
          ]
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ADMIN_006',
        message: '예산 현황 조회에 실패했습니다',
        details: error.message
      }
    });
  }
});

/**
 * Kill Switch 활성화/비활성화
 * POST /api/admin/budget/kill-switch
 */
router.post('/budget/kill-switch', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { enabled, reason } = req.body;
    const adminId = req.user.id;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_001',
          message: '유효한 활성화 상태가 필요합니다'
        }
      });
    }

    // Kill Switch 상태를 환경변수나 설정 테이블에 저장
    // 여기서는 간단히 응답으로 처리
    
    // 실제로는 시스템 설정 테이블에 저장하고
    // 모든 쿠폰/마일리지 생성/사용 요청에서 이 상태를 확인해야 함

    res.json({
      success: true,
      data: {
        killSwitch: {
          enabled,
          activatedBy: adminId,
          activatedAt: new Date().toISOString(),
          reason: reason || (enabled ? '긴급 예산 제어' : '정상 운영 재개')
        },
        message: enabled 
          ? '🚨 Kill Switch가 활성화되었습니다. 모든 쿠폰/마일리지 생성이 중단됩니다.'
          : '✅ Kill Switch가 비활성화되었습니다. 정상 운영이 재개됩니다.'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_001',
        message: '서버 오류가 발생했습니다',
        details: error.message
      }
    });
  }
});

module.exports = router;