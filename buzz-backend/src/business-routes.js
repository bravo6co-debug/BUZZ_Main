const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, requireAdmin, hashPassword, generateReferralCode } = require('./auth-demo');
const { sendBusinessApprovalSMS, sendBusinessRejectionSMS, generateTempPassword } = require('./services/sms.service');
require('dotenv').config();

const router = express.Router();

// Supabase 클라이언트
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

/**
 * 비즈니스 가입 신청
 * POST /api/business/apply
 */
router.post('/apply', async (req, res) => {
  try {
    const {
      email,
      password,
      businessInfo: {
        name,
        registrationNumber,
        category,
        address,
        phone,
        description,
        bankAccount
      },
      documents // 업로드된 파일 정보 추가
    } = req.body;

    // 필수 필드 검증
    if (!email || !password || !name || !registrationNumber || !category || !address || !phone) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_001',
          message: '필수 정보가 누락되었습니다'
        }
      });
    }

    // 이메일 중복 체크
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'BUSINESS_001',
          message: '이미 등록된 이메일입니다'
        }
      });
    }

    // 사업자등록번호 중복 체크
    const { data: existingBusiness } = await supabase
      .from('business_applications')
      .select('id')
      .eq('business_number', registrationNumber)
      .single();

    if (existingBusiness) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'BUSINESS_002',
          message: '이미 등록된 사업자등록번호입니다'
        }
      });
    }

    // 비밀번호 해싱
    const passwordHash = await hashPassword(password);

    // 비즈니스 신청서 생성
    const applicationData = {
      email,
      password_hash: passwordHash,
      business_name: name,
      business_number: registrationNumber,
      category,
      description: description || '',
      address,
      phone,
      bank_info: bankAccount || {},
      documents: documents || [], // 업로드된 파일 정보 저장
      status: 'pending'
    };

    const { data: application, error } = await supabase
      .from('business_applications')
      .insert(applicationData)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'BUSINESS_003',
          message: '비즈니스 신청서 생성에 실패했습니다',
          details: error.message
        }
      });
    }

    res.status(201).json({
      success: true,
      data: {
        applicationId: application.id,
        status: 'pending',
        message: '비즈니스 가입 신청이 접수되었습니다. 관리자 승인 후 이메일로 안내드립니다.'
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
 * 매장 목록 조회 (공개)
 * GET /api/business/list
 */
router.get('/list', async (req, res) => {
  try {
    const { category, status = 'active', sort = 'recent', page = 1, limit = 20 } = req.query;

    let query = supabase
      .from('businesses')
      .select(`
        id, name, category, description, address, phone, 
        images, rating, review_count, created_at
      `)
      .eq('status', status);

    if (category) {
      query = query.eq('category', category);
    }

    // 정렬
    switch (sort) {
      case 'rating':
        query = query.order('rating', { ascending: false });
        break;
      case 'review':
        query = query.order('review_count', { ascending: false });
        break;
      case 'recent':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // 페이징
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: businesses, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'BUSINESS_004',
          message: '매장 목록 조회에 실패했습니다'
        }
      });
    }

    res.json({
      success: true,
      data: {
        businesses: businesses || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: businesses?.length || 0
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
 * 내 비즈니스 정보 조회 (비즈니스 계정)
 * GET /api/business/my
 */
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    if (req.user.role !== 'business') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_003',
          message: '비즈니스 계정만 접근 가능합니다'
        }
      });
    }

    // 내 비즈니스 정보 조회
    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !business) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BUSINESS_005',
          message: '비즈니스 정보를 찾을 수 없습니다'
        }
      });
    }

    res.json({
      success: true,
      data: {
        business
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

// ========== ADMIN ENDPOINTS ==========

/**
 * 비즈니스 신청서 목록 조회 (관리자)
 * GET /api/business/admin/applications
 */
router.get('/admin/applications', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;

    let query = supabase
      .from('business_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: applications, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'BUSINESS_006',
          message: '신청서 목록 조회에 실패했습니다'
        }
      });
    }

    res.json({
      success: true,
      data: {
        applications: applications || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: applications?.length || 0
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
 * 비즈니스 신청 승인 (관리자)
 * POST /api/business/admin/applications/:id/approve
 */
router.post('/admin/applications/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const applicationId = req.params.id;
    const { approved, businessName, category } = req.body;
    const adminId = req.user.id;

    // 신청서 조회
    const { data: application, error: appError } = await supabase
      .from('business_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BUSINESS_007',
          message: '신청서를 찾을 수 없습니다'
        }
      });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BUSINESS_008',
          message: '이미 처리된 신청서입니다'
        }
      });
    }

    if (approved) {
      // 승인 처리
      try {
        // 임시 비밀번호 생성 (기존 비밀번호 대신 사용)
        const tempPassword = generateTempPassword(8);
        const tempPasswordHash = await hashPassword(tempPassword);

        // 1. 사용자 계정 생성
        const { data: user, error: userError } = await supabase
          .from('users')
          .insert({
            email: application.email,
            name: businessName || application.business_name,
            role: 'business',
            auth_provider: 'email',
            password_hash: tempPasswordHash, // 임시 비밀번호 사용
            is_active: true,
            created_by: adminId
          })
          .select()
          .single();

        if (userError) {
          throw new Error('사용자 계정 생성 실패: ' + userError.message);
        }

        // 2. 비즈니스 정보 생성
        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .insert({
            user_id: user.id,
            name: businessName || application.business_name,
            business_number: application.business_number,
            category: category || application.category,
            description: application.description,
            address: application.address,
            phone: application.phone,
            bank_info: application.bank_info,
            status: 'active',
            rating: 0.0,
            review_count: 0
          })
          .select()
          .single();

        if (businessError) {
          throw new Error('비즈니스 정보 생성 실패: ' + businessError.message);
        }

        // 3. 신청서 상태 업데이트
        await supabase
          .from('business_applications')
          .update({
            status: 'approved',
            reviewed_by: adminId,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', applicationId);

        // 4. SMS 승인 알림 발송
        try {
          const phoneNumber = application.phone;
          const businessName = businessName || application.business_name;
          
          if (phoneNumber) {
            const smsResult = await sendBusinessApprovalSMS(phoneNumber, businessName, tempPassword);
            console.log('SMS 발송 결과:', smsResult.success ? '성공' : smsResult.error);
          }
        } catch (smsError) {
          console.error('SMS 발송 실패:', smsError);
          // SMS 실패가 전체 승인 프로세스를 중단하지 않도록 함
        }

        res.json({
          success: true,
          data: {
            userId: user.id,
            businessId: business.id,
            email: user.email,
            tempPassword: tempPassword, // 개발 시에만 반환 (운영에서는 제거)
            message: '비즈니스 가입이 승인되었습니다. SMS로 임시 비밀번호를 발송했습니다.'
          }
        });

      } catch (error) {
        // 롤백은 수동으로 처리해야 할 수도 있음
        res.status(500).json({
          success: false,
          error: {
            code: 'BUSINESS_009',
            message: '승인 처리 중 오류가 발생했습니다',
            details: error.message
          }
        });
      }
    } else {
      // 반려 처리
      const { reason } = req.body;
      const rejectionReason = reason || '승인 기준 미충족';
      
      await supabase
        .from('business_applications')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      // SMS 반려 알림 발송
      try {
        const phoneNumber = application.phone;
        const businessName = application.business_name;
        
        if (phoneNumber) {
          const smsResult = await sendBusinessRejectionSMS(phoneNumber, businessName, rejectionReason);
          console.log('SMS 발송 결과:', smsResult.success ? '성공' : smsResult.error);
        }
      } catch (smsError) {
        console.error('SMS 발송 실패:', smsError);
        // SMS 실패가 전체 반려 프로세스를 중단하지 않도록 함
      }

      res.json({
        success: true,
        data: {
          message: '비즈니스 신청이 반려되었습니다. SMS로 반려 사유를 발송했습니다.'
        }
      });
    }

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
 * 전체 비즈니스 관리 (관리자)
 * GET /api/business/admin/list
 */
router.get('/admin/list', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;

    let query = supabase
      .from('businesses')
      .select(`
        id, user_id, name, business_number, category, 
        description, address, phone, status, rating, 
        review_count, created_at, updated_at,
        users (email, name, is_active)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: businesses, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'BUSINESS_010',
          message: '비즈니스 목록 조회에 실패했습니다'
        }
      });
    }

    res.json({
      success: true,
      data: {
        businesses: businesses || [],
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

/**
 * 비즈니스 상태 변경 (관리자)
 * PUT /api/business/admin/:id/status
 */
router.put('/admin/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const businessId = req.params.id;
    const { status, reason } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_001',
          message: '유효하지 않은 상태값입니다'
        }
      });
    }

    const { error } = await supabase
      .from('businesses')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId);

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'BUSINESS_011',
          message: '비즈니스 상태 변경에 실패했습니다'
        }
      });
    }

    res.json({
      success: true,
      data: {
        message: `비즈니스 상태가 ${status}로 변경되었습니다`
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