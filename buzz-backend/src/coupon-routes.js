const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, requireAdmin } = require('./auth-demo');
const QRCode = require('qrcode');
require('dotenv').config();

const router = express.Router();

// Supabase 클라이언트
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

/**
 * QR 코드 생성 함수
 */
function generateQRCodeString(type, id, userId) {
  const timestamp = Date.now();
  return `${type}-${id}-${userId}-${timestamp}`;
}

/**
 * 내 쿠폰 QR 코드 생성
 * POST /api/coupons/:id/generate-qr
 */
router.post('/:id/generate-qr', authenticateToken, async (req, res) => {
  try {
    const couponId = req.params.id;
    const userId = req.user.id;

    // 쿠폰 유효성 확인
    const { data: userCoupon, error: couponError } = await supabase
      .from('user_coupons')
      .select(`
        id, status, expires_at,
        coupons (name, discount_type, discount_value, min_purchase_amount)
      `)
      .eq('id', couponId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (couponError || !userCoupon) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COUPON_001',
          message: '사용 가능한 쿠폰을 찾을 수 없습니다'
        }
      });
    }

    // 쿠폰 만료 확인
    const now = new Date();
    const expiresAt = new Date(userCoupon.expires_at);
    if (expiresAt < now) {
      // 만료된 쿠폰 상태 업데이트
      await supabase
        .from('user_coupons')
        .update({ status: 'expired' })
        .eq('id', couponId);

      return res.status(400).json({
        success: false,
        error: {
          code: 'COUPON_002',
          message: '만료된 쿠폰입니다'
        }
      });
    }

    // QR 코드 생성 (5분 유효)
    const qrCode = generateQRCodeString('COUPON', couponId, userId);
    const qrExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5분 후

    // QR 코드 데이터베이스에 저장
    const { error: qrError } = await supabase
      .from('qr_codes')
      .insert({
        user_id: userId,
        code_type: 'coupon',
        qr_code: qrCode,
        payload: {
          couponId: couponId,
          userId: userId,
          couponInfo: {
            name: userCoupon.coupons?.name,
            discountType: userCoupon.coupons?.discount_type,
            discountValue: userCoupon.coupons?.discount_value,
            minPurchaseAmount: userCoupon.coupons?.min_purchase_amount
          }
        },
        expires_at: qrExpiresAt.toISOString(),
        status: 'active'
      });

    if (qrError) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'COUPON_003',
          message: 'QR 코드 생성에 실패했습니다'
        }
      });
    }

    // QR 코드 이미지 생성
    let qrImageUrl;
    try {
      qrImageUrl = await QRCode.toDataURL(qrCode);
    } catch (qrImageError) {
      qrImageUrl = null;
    }

    res.json({
      success: true,
      data: {
        qrCode: qrCode,
        qrImage: qrImageUrl,
        expiresIn: 300, // 5분
        expiresAt: qrExpiresAt.toISOString(),
        couponInfo: {
          name: userCoupon.coupons?.name || '쿠폰',
          discountType: userCoupon.coupons?.discount_type,
          discountValue: userCoupon.coupons?.discount_value,
          minPurchaseAmount: userCoupon.coupons?.min_purchase_amount
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
 * 마일리지 QR 코드 생성
 * POST /api/mileage/generate-qr
 */
router.post('/mileage/generate-qr', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 마일리지 잔액 확인
    const { data: mileageAccount, error: mileageError } = await supabase
      .from('mileage_accounts')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (mileageError || !mileageAccount) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MILEAGE_001',
          message: '마일리지 계정을 찾을 수 없습니다'
        }
      });
    }

    if (mileageAccount.balance <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MILEAGE_002',
          message: '사용 가능한 마일리지가 없습니다'
        }
      });
    }

    // QR 코드 생성 (5분 유효)
    const qrCode = generateQRCodeString('MILEAGE', 'USER', userId);
    const qrExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5분 후

    // QR 코드 데이터베이스에 저장
    const { error: qrError } = await supabase
      .from('qr_codes')
      .insert({
        user_id: userId,
        code_type: 'mileage',
        qr_code: qrCode,
        payload: {
          userId: userId,
          balance: mileageAccount.balance
        },
        expires_at: qrExpiresAt.toISOString(),
        status: 'active'
      });

    if (qrError) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'MILEAGE_003',
          message: 'QR 코드 생성에 실패했습니다'
        }
      });
    }

    // QR 코드 이미지 생성
    let qrImageUrl;
    try {
      qrImageUrl = await QRCode.toDataURL(qrCode);
    } catch (qrImageError) {
      qrImageUrl = null;
    }

    res.json({
      success: true,
      data: {
        qrCode: qrCode,
        qrImage: qrImageUrl,
        balance: mileageAccount.balance,
        expiresIn: 300, // 5분
        expiresAt: qrExpiresAt.toISOString()
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

// ========== BUSINESS ENDPOINTS ==========

/**
 * QR 코드 검증 (Business)
 * POST /api/coupons/verify
 */
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const { qrCode } = req.body;
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

    if (!qrCode) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_001',
          message: 'QR 코드가 필요합니다'
        }
      });
    }

    // QR 코드 조회
    const { data: qrData, error: qrError } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('qr_code', qrCode)
      .eq('status', 'active')
      .single();

    if (qrError || !qrData) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'QR_001',
          message: '유효하지 않은 QR 코드입니다'
        }
      });
    }

    // QR 코드 만료 확인
    const now = new Date();
    const expiresAt = new Date(qrData.expires_at);
    if (expiresAt < now) {
      // 만료된 QR 코드 상태 업데이트
      await supabase
        .from('qr_codes')
        .update({ status: 'expired' })
        .eq('id', qrData.id);

      return res.status(400).json({
        success: false,
        error: {
          code: 'QR_002',
          message: '만료된 QR 코드입니다'
        }
      });
    }

    // QR 코드 타입별 정보 반환
    let responseData = {
      qrCode: qrCode,
      type: qrData.code_type,
      userId: qrData.user_id,
      expiresAt: qrData.expires_at
    };

    if (qrData.code_type === 'coupon') {
      responseData.coupon = qrData.payload.couponInfo;
    } else if (qrData.code_type === 'mileage') {
      responseData.balance = qrData.payload.balance;
    }

    res.json({
      success: true,
      data: responseData
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
 * 쿠폰 사용 처리 (Business)
 * POST /api/coupons/use
 */
router.post('/use', authenticateToken, async (req, res) => {
  try {
    const { qrCode, purchaseAmount } = req.body;
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

    if (!qrCode || !purchaseAmount) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_001',
          message: 'QR 코드와 구매 금액이 필요합니다'
        }
      });
    }

    // QR 코드 검증
    const { data: qrData, error: qrError } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('qr_code', qrCode)
      .eq('status', 'active')
      .eq('code_type', 'coupon')
      .single();

    if (qrError || !qrData) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'QR_001',
          message: '유효하지 않은 쿠폰 QR 코드입니다'
        }
      });
    }

    const couponInfo = qrData.payload.couponInfo;
    const couponId = qrData.payload.couponId;

    // 최소 구매 금액 확인
    if (purchaseAmount < couponInfo.minPurchaseAmount) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'COUPON_004',
          message: `최소 구매 금액은 ${couponInfo.minPurchaseAmount.toLocaleString()}원입니다`
        }
      });
    }

    // 할인 금액 계산
    let discountAmount = 0;
    if (couponInfo.discountType === 'fixed') {
      discountAmount = couponInfo.discountValue;
    } else if (couponInfo.discountType === 'percentage') {
      discountAmount = Math.floor(purchaseAmount * (couponInfo.discountValue / 100));
    }

    const finalAmount = Math.max(0, purchaseAmount - discountAmount);

    // 비즈니스 정보 조회
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('user_id', businessUserId)
      .single();

    // 쿠폰 사용 처리
    const { error: useError } = await supabase
      .from('user_coupons')
      .update({
        status: 'used',
        used_at: new Date().toISOString(),
        used_amount: discountAmount,
        business_id: business?.id
      })
      .eq('id', couponId);

    if (useError) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'COUPON_005',
          message: '쿠폰 사용 처리에 실패했습니다'
        }
      });
    }

    // QR 코드 사용 처리
    await supabase
      .from('qr_codes')
      .update({
        status: 'used',
        used_at: new Date().toISOString(),
        business_id: business?.id
      })
      .eq('id', qrData.id);

    res.json({
      success: true,
      data: {
        message: '쿠폰이 성공적으로 사용되었습니다',
        coupon: {
          name: couponInfo.name,
          discountAmount: discountAmount,
          originalAmount: purchaseAmount,
          finalAmount: finalAmount
        },
        business: business?.name,
        usedAt: new Date().toISOString()
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
 * 마일리지 사용 처리 (Business)
 * POST /api/mileage/use
 */
router.post('/mileage/use', authenticateToken, async (req, res) => {
  try {
    const { qrCode, amount } = req.body;
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

    if (!qrCode || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_001',
          message: '유효한 QR 코드와 사용 금액이 필요합니다'
        }
      });
    }

    // QR 코드 검증
    const { data: qrData, error: qrError } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('qr_code', qrCode)
      .eq('status', 'active')
      .eq('code_type', 'mileage')
      .single();

    if (qrError || !qrData) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'QR_001',
          message: '유효하지 않은 마일리지 QR 코드입니다'
        }
      });
    }

    const userId = qrData.user_id;

    // 마일리지 잔액 확인
    const { data: mileageAccount, error: mileageError } = await supabase
      .from('mileage_accounts')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (mileageError || !mileageAccount) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MILEAGE_001',
          message: '마일리지 계정을 찾을 수 없습니다'
        }
      });
    }

    if (mileageAccount.balance < amount) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MILEAGE_004',
          message: `잔액이 부족합니다. 현재 잔액: ${mileageAccount.balance.toLocaleString()}P`
        }
      });
    }

    const newBalance = mileageAccount.balance - amount;

    // 비즈니스 정보 조회
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('user_id', businessUserId)
      .single();

    // 마일리지 계정 업데이트
    const { error: updateError } = await supabase
      .from('mileage_accounts')
      .update({
        balance: newBalance,
        total_used: mileageAccount.total_used + amount,
        last_transaction_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'MILEAGE_005',
          message: '마일리지 사용 처리에 실패했습니다'
        }
      });
    }

    // 거래 내역 기록
    await supabase
      .from('mileage_transactions')
      .insert({
        user_id: userId,
        business_id: business?.id,
        transaction_type: 'use',
        amount: amount,
        balance_after: newBalance,
        description: `${business?.name || '매장'}에서 마일리지 사용`,
        qr_code: qrCode
      });

    // QR 코드 사용 처리
    await supabase
      .from('qr_codes')
      .update({
        status: 'used',
        used_at: new Date().toISOString(),
        business_id: business?.id
      })
      .eq('id', qrData.id);

    res.json({
      success: true,
      data: {
        message: '마일리지가 성공적으로 사용되었습니다',
        transaction: {
          usedAmount: amount,
          newBalance: newBalance,
          business: business?.name,
          usedAt: new Date().toISOString()
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