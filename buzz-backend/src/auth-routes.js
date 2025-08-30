const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { generateToken, hashPassword, verifyPassword, generateReferralCode, authenticateToken } = require('./auth-demo');
require('dotenv').config();

const router = express.Router();

// Supabase 클라이언트
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration in auth routes');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

/**
 * 데모용 회원가입 (이메일)
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone, university } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_001',
          message: '이메일, 비밀번호, 이름은 필수입니다'
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
          code: 'USER_001',
          message: '이미 가입된 이메일입니다'
        }
      });
    }

    // 비밀번호 해싱
    const passwordHash = await hashPassword(password);
    
    // 리퍼럴 코드 생성
    const referralCode = generateReferralCode();

    // 사용자 생성
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email,
        name,
        phone,
        role: 'user',
        auth_provider: 'email',
        password_hash: passwordHash,
        is_active: true
      })
      .select()
      .single();

    if (userError) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'USER_002',
          message: '사용자 생성에 실패했습니다',
          details: userError.message
        }
      });
    }

    // 사용자 프로필 생성
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: user.id,
        university,
        referral_code: referralCode,
        marketing_agree: true,
        terms_agreed_at: new Date().toISOString(),
        privacy_agreed_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Profile creation failed:', profileError);
    }

    // JWT 토큰 생성
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          referralCode: referralCode
        },
        token,
        message: '회원가입이 완료되었습니다'
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
 * 데모용 로그인 (이메일)
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_001',
          message: '이메일과 비밀번호를 입력해주세요'
        }
      });
    }

    // 사용자 조회
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_004',
          message: '이메일 또는 비밀번호가 올바르지 않습니다'
        }
      });
    }

    // 비밀번호 검증
    if (user.password_hash) {
      const isValidPassword = await verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_004',
            message: '이메일 또는 비밀번호가 올바르지 않습니다'
          }
        });
      }
    }

    // 리퍼럴 코드 조회
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('referral_code')
      .eq('user_id', user.id)
      .single();

    // 로그인 정보 업데이트
    await supabase
      .from('users')
      .update({
        last_login_at: new Date().toISOString(),
        login_count: user.login_count + 1
      })
      .eq('id', user.id);

    // JWT 토큰 생성
    const token = generateToken(user);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          referralCode: profile?.referral_code
        },
        token,
        message: '로그인 되었습니다'
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
 * 데모용 소셜 로그인 (Google)
 * POST /api/auth/social/google
 */
router.post('/social/google', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_001',
          message: '이메일과 이름이 필요합니다'
        }
      });
    }

    // 기존 사용자 확인
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user) {
      // 새 사용자 생성
      const referralCode = generateReferralCode();
      
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email,
          name,
          role: 'user',
          auth_provider: 'google',
          is_active: true
        })
        .select()
        .single();

      if (userError) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'USER_002',
            message: '사용자 생성에 실패했습니다'
          }
        });
      }

      // 프로필 생성
      await supabase
        .from('user_profiles')
        .insert({
          user_id: newUser.id,
          referral_code: referralCode,
          marketing_agree: true,
          terms_agreed_at: new Date().toISOString(),
          privacy_agreed_at: new Date().toISOString()
        });

      user = newUser;
    }

    // JWT 토큰 생성
    const token = generateToken(user);

    // 리퍼럴 코드 조회
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('referral_code')
      .eq('user_id', user.id)
      .single();

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          referralCode: profile?.referral_code
        },
        token,
        message: 'Google 로그인 되었습니다'
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
 * 내 정보 조회
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 사용자 정보 조회
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role, avatar_url, created_at')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_003',
          message: '사용자 정보를 찾을 수 없습니다'
        }
      });
    }

    // 프로필 정보 별도 조회
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('referral_code, university, marketing_agree')
      .eq('user_id', userId)
      .single();

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar_url: user.avatar_url,
          created_at: user.created_at,
          referral_code: profile?.referral_code,
          university: profile?.university,
          marketing_agree: profile?.marketing_agree
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