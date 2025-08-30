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

// ========== BUSINESS SETTLEMENT ENDPOINTS ==========

/**
 * 정산 요청 생성 (Business)
 * POST /api/settlement/request
 */
router.post('/request', authenticateToken, async (req, res) => {
  try {
    const businessUserId = req.user.id;
    const { amount, description, bankAccount } = req.body;

    if (req.user.role !== 'business') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_003',
          message: '비즈니스 계정만 접근 가능합니다'
        }
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_001',
          message: '유효한 정산 금액이 필요합니다'
        }
      });
    }

    // 비즈니스 정보 조회
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, bank_info')
      .eq('user_id', businessUserId)
      .single();

    if (businessError || !business) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SETTLEMENT_001',
          message: '비즈니스 정보를 찾을 수 없습니다'
        }
      });
    }

    // 정산 가능 금액 확인 (사용된 쿠폰/마일리지 총액)
    const { data: couponUsage } = await supabase
      .from('user_coupons')
      .select('used_amount')
      .eq('business_id', business.id)
      .eq('status', 'used');

    const { data: mileageUsage } = await supabase
      .from('mileage_transactions')
      .select('amount')
      .eq('business_id', business.id)
      .eq('transaction_type', 'use');

    const totalCouponAmount = couponUsage?.reduce((sum, c) => sum + (c.used_amount || 0), 0) || 0;
    const totalMileageAmount = mileageUsage?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0;
    const totalEarnings = totalCouponAmount + totalMileageAmount;

    // 이미 정산 요청된 금액 확인
    const { data: pendingSettlements } = await supabase
      .from('settlements')
      .select('amount')
      .eq('business_id', business.id)
      .in('status', ['pending', 'approved']);

    const pendingAmount = pendingSettlements?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
    const availableAmount = totalEarnings - pendingAmount;

    if (amount > availableAmount) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SETTLEMENT_002',
          message: `정산 가능 금액을 초과했습니다. 사용 가능: ${availableAmount.toLocaleString()}원`
        }
      });
    }

    // 정산 요청 생성
    const settlementData = {
      business_id: business.id,
      amount: amount,
      description: description || '정산 요청',
      bank_account: bankAccount || business.bank_info,
      status: 'pending',
      requested_at: new Date().toISOString()
    };

    const { data: settlement, error: settlementError } = await supabase
      .from('settlements')
      .insert(settlementData)
      .select()
      .single();

    if (settlementError) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SETTLEMENT_003',
          message: '정산 요청 생성에 실패했습니다',
          details: settlementError.message
        }
      });
    }

    res.status(201).json({
      success: true,
      data: {
        settlementId: settlement.id,
        amount: amount,
        status: 'pending',
        message: '정산 요청이 성공적으로 접수되었습니다',
        availableAmount: availableAmount - amount,
        requestedAt: settlement.requested_at
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
 * 내 정산 내역 조회 (Business)
 * GET /api/settlement/my
 */
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const businessUserId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    if (req.user.role !== 'business') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_003',
          message: '비즈니스 계정만 접근 가능합니다'
        }
      });
    }

    // 비즈니스 정보 조회
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', businessUserId)
      .single();

    if (!business) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SETTLEMENT_001',
          message: '비즈니스 정보를 찾을 수 없습니다'
        }
      });
    }

    let query = supabase
      .from('settlements')
      .select('*')
      .eq('business_id', business.id)
      .order('requested_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: settlements, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SETTLEMENT_004',
          message: '정산 내역 조회에 실패했습니다'
        }
      });
    }

    // 정산 통계
    const { data: allSettlements } = await supabase
      .from('settlements')
      .select('amount, status')
      .eq('business_id', business.id);

    const stats = {
      total: allSettlements?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0,
      pending: allSettlements?.filter(s => s.status === 'pending').reduce((sum, s) => sum + (s.amount || 0), 0) || 0,
      completed: allSettlements?.filter(s => s.status === 'completed').reduce((sum, s) => sum + (s.amount || 0), 0) || 0,
      rejected: allSettlements?.filter(s => s.status === 'rejected').reduce((sum, s) => sum + (s.amount || 0), 0) || 0
    };

    res.json({
      success: true,
      data: {
        settlements: settlements || [],
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: settlements?.length || 0
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
 * 정산 가능 금액 조회 (Business)
 * GET /api/settlement/available
 */
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const businessUserId = req.user.id;

    if (req.user.role !== 'business') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_003',
          message: '비즈니스 계정만 접근 가능합니다'
        }
      });
    }

    // 비즈니스 정보 조회
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('user_id', businessUserId)
      .single();

    if (!business) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SETTLEMENT_001',
          message: '비즈니스 정보를 찾을 수 없습니다'
        }
      });
    }

    // 수익 계산
    const [
      { data: couponUsage },
      { data: mileageUsage },
      { data: settlements }
    ] = await Promise.all([
      supabase
        .from('user_coupons')
        .select('used_amount, used_at')
        .eq('business_id', business.id)
        .eq('status', 'used'),
      supabase
        .from('mileage_transactions')
        .select('amount, created_at')
        .eq('business_id', business.id)
        .eq('transaction_type', 'use'),
      supabase
        .from('settlements')
        .select('amount, status')
        .eq('business_id', business.id)
        .in('status', ['pending', 'approved', 'completed'])
    ]);

    const totalCouponEarnings = couponUsage?.reduce((sum, c) => sum + (c.used_amount || 0), 0) || 0;
    const totalMileageEarnings = mileageUsage?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0;
    const totalEarnings = totalCouponEarnings + totalMileageEarnings;

    const totalSettlements = settlements?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
    const availableAmount = Math.max(0, totalEarnings - totalSettlements);

    // 이번 달 수익
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const monthlyCouponEarnings = couponUsage
      ?.filter(c => new Date(c.used_at) >= currentMonth)
      .reduce((sum, c) => sum + (c.used_amount || 0), 0) || 0;

    const monthlyMileageEarnings = mileageUsage
      ?.filter(m => new Date(m.created_at) >= currentMonth)
      .reduce((sum, m) => sum + (m.amount || 0), 0) || 0;

    res.json({
      success: true,
      data: {
        business: {
          id: business.id,
          name: business.name
        },
        earnings: {
          total: totalEarnings,
          coupon: totalCouponEarnings,
          mileage: totalMileageEarnings,
          monthly: monthlyCouponEarnings + monthlyMileageEarnings
        },
        settlements: {
          total: totalSettlements,
          pending: settlements?.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.amount, 0) || 0,
          completed: settlements?.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.amount, 0) || 0
        },
        available: availableAmount,
        timestamp: new Date().toISOString()
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

// ========== ADMIN SETTLEMENT ENDPOINTS ==========

/**
 * 모든 정산 요청 조회 (Admin)
 * GET /api/settlement/admin/list
 */
router.get('/admin/list', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;

    let query = supabase
      .from('settlements')
      .select(`
        id, amount, description, status, requested_at, processed_at,
        businesses (name, business_number, bank_info),
        users (name, email)
      `)
      .order('requested_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: settlements, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SETTLEMENT_005',
          message: '정산 목록 조회에 실패했습니다'
        }
      });
    }

    res.json({
      success: true,
      data: {
        settlements: settlements || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: settlements?.length || 0
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
 * 정산 요청 승인/반려 (Admin)
 * POST /api/settlement/admin/:id/process
 */
router.post('/admin/:id/process', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settlementId = req.params.id;
    const { approved, reason } = req.body;
    const adminId = req.user.id;

    if (typeof approved !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_001',
          message: '승인 여부가 필요합니다'
        }
      });
    }

    // 정산 요청 조회
    const { data: settlement, error: settlementError } = await supabase
      .from('settlements')
      .select('*, businesses(name)')
      .eq('id', settlementId)
      .single();

    if (settlementError || !settlement) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SETTLEMENT_006',
          message: '정산 요청을 찾을 수 없습니다'
        }
      });
    }

    if (settlement.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SETTLEMENT_007',
          message: '이미 처리된 정산 요청입니다'
        }
      });
    }

    const updateData = {
      status: approved ? 'approved' : 'rejected',
      processed_at: new Date().toISOString(),
      processed_by: adminId,
      rejection_reason: approved ? null : (reason || '승인 기준 미충족'),
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('settlements')
      .update(updateData)
      .eq('id', settlementId);

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SETTLEMENT_008',
          message: '정산 요청 처리에 실패했습니다'
        }
      });
    }

    res.json({
      success: true,
      data: {
        settlementId: settlementId,
        businessName: settlement.businesses?.name,
        amount: settlement.amount,
        status: updateData.status,
        message: approved 
          ? '정산 요청이 승인되었습니다' 
          : '정산 요청이 반려되었습니다',
        processedAt: updateData.processed_at
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
 * 정산 완료 처리 (Admin)
 * POST /api/settlement/admin/:id/complete
 */
router.post('/admin/:id/complete', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settlementId = req.params.id;
    const { transactionId, completedAt } = req.body;
    const adminId = req.user.id;

    // 정산 요청 조회
    const { data: settlement, error: settlementError } = await supabase
      .from('settlements')
      .select('*, businesses(name)')
      .eq('id', settlementId)
      .single();

    if (settlementError || !settlement) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SETTLEMENT_006',
          message: '정산 요청을 찾을 수 없습니다'
        }
      });
    }

    if (settlement.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SETTLEMENT_009',
          message: '승인된 정산 요청만 완료 처리할 수 있습니다'
        }
      });
    }

    const updateData = {
      status: 'completed',
      completed_at: completedAt || new Date().toISOString(),
      completed_by: adminId,
      transaction_id: transactionId,
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('settlements')
      .update(updateData)
      .eq('id', settlementId);

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SETTLEMENT_010',
          message: '정산 완료 처리에 실패했습니다'
        }
      });
    }

    res.json({
      success: true,
      data: {
        settlementId: settlementId,
        businessName: settlement.businesses?.name,
        amount: settlement.amount,
        status: 'completed',
        transactionId: transactionId,
        message: '정산이 완료되었습니다',
        completedAt: updateData.completed_at
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
 * 정산 통계 (Admin)
 * GET /api/settlement/admin/stats
 */
router.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // 전체 정산 통계
    const { data: allSettlements } = await supabase
      .from('settlements')
      .select('amount, status, requested_at, completed_at');

    const stats = {
      total: {
        count: allSettlements?.length || 0,
        amount: allSettlements?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0
      },
      byStatus: {
        pending: {
          count: allSettlements?.filter(s => s.status === 'pending').length || 0,
          amount: allSettlements?.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.amount, 0) || 0
        },
        approved: {
          count: allSettlements?.filter(s => s.status === 'approved').length || 0,
          amount: allSettlements?.filter(s => s.status === 'approved').reduce((sum, s) => sum + s.amount, 0) || 0
        },
        completed: {
          count: allSettlements?.filter(s => s.status === 'completed').length || 0,
          amount: allSettlements?.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.amount, 0) || 0
        },
        rejected: {
          count: allSettlements?.filter(s => s.status === 'rejected').length || 0,
          amount: allSettlements?.filter(s => s.status === 'rejected').reduce((sum, s) => sum + s.amount, 0) || 0
        }
      }
    };

    // 이번 달 통계
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const monthlySettlements = allSettlements?.filter(s => 
      new Date(s.requested_at) >= currentMonth
    ) || [];

    const monthlyStats = {
      count: monthlySettlements.length,
      amount: monthlySettlements.reduce((sum, s) => sum + (s.amount || 0), 0),
      completed: monthlySettlements.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.amount, 0)
    };

    res.json({
      success: true,
      data: {
        overall: stats,
        monthly: monthlyStats,
        avgProcessingTime: 0, // 계산 로직 추가 가능
        timestamp: new Date().toISOString()
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