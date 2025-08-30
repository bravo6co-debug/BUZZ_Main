const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, generateReferralCode } = require('./auth-demo');
require('dotenv').config();

const router = express.Router();

// Supabase 클라이언트
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

/**
 * 사용자 프로필 업데이트
 * PUT /api/users/profile
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, university, marketing_agree } = req.body;

    // 사용자 기본 정보 업데이트
    if (name) {
      const { error: userError } = await supabase
        .from('users')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (userError) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'USER_004',
            message: '사용자 정보 업데이트에 실패했습니다'
          }
        });
      }
    }

    // 프로필 정보 업데이트
    const profileUpdates = {};
    if (university !== undefined) profileUpdates.university = university;
    if (marketing_agree !== undefined) profileUpdates.marketing_agree = marketing_agree;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update(profileUpdates)
        .eq('user_id', userId);

      if (profileError) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'USER_005',
            message: '프로필 업데이트에 실패했습니다'
          }
        });
      }
    }

    res.json({
      success: true,
      data: {
        message: '프로필이 업데이트되었습니다'
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
 * 내 리퍼럴 통계 조회
 * GET /api/users/referral-stats
 */
router.get('/referral-stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 내 리퍼럴 코드 조회
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('referral_code')
      .eq('user_id', userId)
      .single();

    if (!profile?.referral_code) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REFERRAL_001',
          message: '리퍼럴 코드를 찾을 수 없습니다'
        }
      });
    }

    // 리퍼럴 방문 수 조회
    const { count: visitCount } = await supabase
      .from('referral_visits')
      .select('id', { count: 'exact' })
      .eq('referral_code', profile.referral_code);

    // 리퍼럴 전환 수 조회
    const { count: conversionCount } = await supabase
      .from('referral_visits')
      .select('id', { count: 'exact' })
      .eq('referral_code', profile.referral_code)
      .eq('is_converted', true);

    // 내가 추천한 사용자 수
    const { count: referredUserCount } = await supabase
      .from('user_profiles')
      .select('user_id', { count: 'exact' })
      .eq('referrer_id', userId);

    // 총 보상 금액 (리퍼럴 보상)
    const { data: rewards } = await supabase
      .from('referral_rewards')
      .select('amount')
      .eq('referrer_id', userId)
      .eq('status', 'approved');

    const totalRewards = rewards?.reduce((sum, reward) => sum + reward.amount, 0) || 0;

    // 전환율 계산
    const conversionRate = visitCount > 0 ? ((conversionCount || 0) / visitCount * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        referralCode: profile.referral_code,
        stats: {
          totalVisits: visitCount || 0,
          totalConversions: conversionCount || 0,
          conversionRate: parseFloat(conversionRate),
          referredUsers: referredUserCount || 0,
          totalRewards: totalRewards
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
 * 리퍼럴 링크 생성
 * GET /api/users/referral-link
 */
router.get('/referral-link', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 내 리퍼럴 코드 조회
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('referral_code')
      .eq('user_id', userId)
      .single();

    if (!profile?.referral_code) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REFERRAL_001',
          message: '리퍼럴 코드를 찾을 수 없습니다'
        }
      });
    }

    // 다양한 플랫폼별 리퍼럴 링크 생성
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const referralCode = profile.referral_code;
    
    const links = {
      web: `${baseUrl}?ref=${referralCode}`,
      kakao: `https://talk-api.kakao.com/v1/api/talk/send?template_object={...}&ref=${referralCode}`,
      instagram: `${baseUrl}?ref=${referralCode}&utm_source=instagram`,
      youtube: `${baseUrl}?ref=${referralCode}&utm_source=youtube`,
      blog: `${baseUrl}?ref=${referralCode}&utm_source=blog`
    };

    res.json({
      success: true,
      data: {
        referralCode: referralCode,
        links: links,
        shortUrl: `buzz.kr/r/${referralCode}` // 나중에 단축 URL 서비스 연동
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
 * 내 쿠폰 목록 조회
 * GET /api/users/coupons
 */
router.get('/coupons', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = 'all' } = req.query;

    let query = supabase
      .from('user_coupons')
      .select(`
        id, qr_code, status, used_at, expires_at, created_at,
        coupons (
          id, name, description, discount_type, discount_value, min_purchase_amount
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: userCoupons, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'COUPON_001',
          message: '쿠폰 조회에 실패했습니다'
        }
      });
    }

    // 상태별 쿠폰 수 계산
    const summary = {
      active: userCoupons.filter(c => c.status === 'active').length,
      used: userCoupons.filter(c => c.status === 'used').length,
      expired: userCoupons.filter(c => c.status === 'expired').length,
      total: userCoupons.length
    };

    res.json({
      success: true,
      data: {
        coupons: userCoupons.map(uc => ({
          id: uc.id,
          name: uc.coupons?.name || '쿠폰',
          description: uc.coupons?.description,
          discountType: uc.coupons?.discount_type,
          discountValue: uc.coupons?.discount_value,
          minPurchaseAmount: uc.coupons?.min_purchase_amount,
          status: uc.status,
          qrCode: uc.qr_code,
          usedAt: uc.used_at,
          expiresAt: uc.expires_at,
          createdAt: uc.created_at
        })),
        summary
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
 * 내 마일리지 정보 조회
 * GET /api/users/mileage
 */
router.get('/mileage', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 마일리지 계정 정보 조회
    const { data: mileageAccount } = await supabase
      .from('mileage_accounts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!mileageAccount) {
      // 마일리지 계정이 없으면 생성
      const { data: newAccount, error: createError } = await supabase
        .from('mileage_accounts')
        .insert({
          user_id: userId,
          balance: 0,
          total_earned: 0,
          total_used: 0
        })
        .select()
        .single();

      if (createError) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'MILEAGE_001',
            message: '마일리지 계정 생성에 실패했습니다'
          }
        });
      }

      return res.json({
        success: true,
        data: {
          balance: 0,
          totalEarned: 0,
          totalUsed: 0,
          expiringIn30Days: 0
        }
      });
    }

    // 30일 내 만료 예정 마일리지 조회
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { data: expiringTransactions } = await supabase
      .from('mileage_transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('transaction_type', 'earn')
      .lt('expires_at', thirtyDaysFromNow.toISOString())
      .gt('expires_at', new Date().toISOString());

    const expiringAmount = expiringTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

    res.json({
      success: true,
      data: {
        balance: mileageAccount.balance,
        totalEarned: mileageAccount.total_earned,
        totalUsed: mileageAccount.total_used,
        expiringIn30Days: expiringAmount,
        lastTransactionAt: mileageAccount.last_transaction_at
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
 * 마일리지 거래 내역 조회
 * GET /api/users/mileage/transactions
 */
router.get('/mileage/transactions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type = 'all', page = 1, limit = 20 } = req.query;

    let query = supabase
      .from('mileage_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (type !== 'all') {
      query = query.eq('transaction_type', type);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: transactions, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'MILEAGE_002',
          message: '마일리지 거래 내역 조회에 실패했습니다'
        }
      });
    }

    res.json({
      success: true,
      data: {
        transactions: transactions.map(t => ({
          id: t.id,
          type: t.transaction_type,
          amount: t.amount,
          balanceAfter: t.balance_after,
          description: t.description,
          expiresAt: t.expires_at,
          createdAt: t.created_at
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
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

module.exports = router;