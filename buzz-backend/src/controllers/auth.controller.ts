import { Request, Response } from 'express';
import { getDatabase } from '../config/knex';
import { config } from '../config';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken, 
  hashPassword, 
  comparePassword,
  generateReferralCode,
  generateTemporaryPassword
} from '../utils/auth';
import { sendSuccess, sendError, Errors } from '../utils/response';
import { UserRole, AuthProvider } from '../types';
import { log } from '../utils/logger';

export class AuthController {
  /**
   * Google social login
   */
  async googleLogin(req: Request, res: Response): Promise<void> {
    const { idToken, additionalInfo } = req.body;
    const db = getDatabase();
    
    try {
      // TODO: Implement actual Google OAuth verification
      // For now, simulate the process
      
      // Mock Google user data (in production, this would come from Google API)
      const googleUserData = {
        id: '12345',
        email: 'user@gmail.com',
        name: '사용자',
        picture: 'https://example.com/avatar.jpg',
        verified_email: true,
      };
      
      log.auth('google_login_attempt', googleUserData.email, false, { idToken: !!idToken });
      
      // Check if user exists
      let user = await db('users')
        .where('email', googleUserData.email)
        .where('auth_provider', AuthProvider.GOOGLE)
        .first();
      
      let isNewUser = false;
      
      if (!user) {
        // Create new user
        isNewUser = true;
        const referralCode = generateReferralCode();
        
        // Start transaction
        await db.transaction(async (trx) => {
          // Insert user
          const [newUser] = await trx('users')
            .insert({
              email: googleUserData.email,
              name: googleUserData.name,
              role: UserRole.USER,
              auth_provider: AuthProvider.GOOGLE,
              provider_id: googleUserData.id,
              avatar_url: googleUserData.picture,
              is_active: true,
              login_count: 1,
              last_login_at: trx.fn.now(),
              created_at: trx.fn.now(),
              updated_at: trx.fn.now(),
            })
            .returning('*');
          
          // Create user profile
          await trx('user_profiles')
            .insert({
              user_id: newUser.id,
              referral_code: referralCode,
              referrer_id: additionalInfo?.referralCode ? 
                await this.getUserByReferralCode(trx, additionalInfo.referralCode) : null,
              marketing_agree: additionalInfo?.marketingAgree || false,
              terms_agreed_at: trx.fn.now(),
              privacy_agreed_at: trx.fn.now(),
              university: additionalInfo?.university || null,
              phone: additionalInfo?.phone || null,
              created_at: trx.fn.now(),
            });
          
          // Create mileage account
          await trx('mileage_accounts')
            .insert({
              user_id: newUser.id,
              balance: config.business.signupBonusMileage,
              total_earned: config.business.signupBonusMileage,
              total_used: 0,
              total_expired: 0,
              updated_at: trx.fn.now(),
            });
          
          // Add signup bonus transaction
          await trx('mileage_transactions')
            .insert({
              user_id: newUser.id,
              type: 'earn',
              amount: config.business.signupBonusMileage,
              balance_before: 0,
              balance_after: config.business.signupBonusMileage,
              description: '회원가입 보너스',
              reference_type: 'signup',
              created_at: trx.fn.now(),
            });
          
          user = newUser;
        });
      } else {
        // Update login statistics
        await db('users')
          .where('id', user.id)
          .update({
            last_login_at: db.fn.now(),
            login_count: db.raw('login_count + 1'),
            avatar_url: googleUserData.picture,
          });
      }
      
      // Generate tokens
      const tokens = {
        accessToken: generateAccessToken({
          userId: user.id,
          email: user.email,
          role: user.role,
        }),
        refreshToken: generateRefreshToken({
          userId: user.id,
          email: user.email,
          role: user.role,
        }),
        expiresIn: 86400,
      };
      
      // Get user profile
      const profile = await db('user_profiles')
        .where('user_id', user.id)
        .first();
      
      const responseData: any = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatar_url,
          referralCode: profile?.referral_code,
        },
        tokens,
        isNewUser,
      };
      
      // Add signup rewards for new users
      if (isNewUser) {
        // Fetch the actual issued coupon from database
        const userCoupon = await db('user_coupons')
          .join('coupons', 'user_coupons.coupon_id', 'coupons.id')
          .where('user_coupons.user_id', user.id)
          .where('coupons.type', 'signup')
          .select(
            'user_coupons.id as coupon_instance_id',
            'user_coupons.qr_code_data',
            'user_coupons.expires_at',
            'user_coupons.status',
            'coupons.name',
            'coupons.discount_value',
            'coupons.discount_type'
          )
          .first();
        
        responseData.rewards = {
          signupBonus: {
            mileage: config.business.signupBonusMileage,
            coupon: userCoupon ? {
              id: userCoupon.coupon_instance_id,
              name: userCoupon.name,
              amount: userCoupon.discount_value,
              type: userCoupon.discount_type,
              qrCode: userCoupon.qr_code_data,
              status: userCoupon.status,
              expiresAt: userCoupon.expires_at,
            } : null,
          },
        };
      }
      
      log.auth('google_login_success', user.id, true, { isNewUser });
      
      sendSuccess(res, responseData, 'Login successful');
      
    } catch (error) {
      log.error('Google login error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Kakao social login
   */
  async kakaoLogin(req: Request, res: Response): Promise<void> {
    const { accessToken, additionalInfo } = req.body;
    
    try {
      // TODO: Implement Kakao OAuth verification
      log.auth('kakao_login_attempt', 'unknown', false, { accessToken: !!accessToken });
      
      // For now, return not implemented
      return sendError(res, 'AUTH_005', 'Kakao login not yet implemented', null, 501);
      
    } catch (error) {
      log.error('Kakao login error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Email login for business and admin users
   */
  async emailLogin(req: Request, res: Response): Promise<void> {
    const { email, password, type } = req.body;
    const db = getDatabase();
    
    try {
      // Find user by email and role
      const user = await db('users')
        .where('email', email)
        .whereIn('role', type === 'admin' ? ['admin'] : ['business'])
        .where('is_active', true)
        .first();
      
      if (!user || !user.password_hash) {
        log.auth('email_login_failed', email, false, { reason: 'user_not_found', type });
        return Errors.INVALID_CREDENTIALS().send(res, 401);
      }
      
      // Verify password
      const isValidPassword = await comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        log.auth('email_login_failed', user.id, false, { reason: 'invalid_password' });
        return Errors.INVALID_CREDENTIALS().send(res, 401);
      }
      
      // Update login statistics
      await db('users')
        .where('id', user.id)
        .update({
          last_login_at: db.fn.now(),
          login_count: db.raw('login_count + 1'),
        });
      
      // Generate tokens
      const tokens = {
        accessToken: generateAccessToken({
          userId: user.id,
          email: user.email,
          role: user.role,
        }),
        refreshToken: generateRefreshToken({
          userId: user.id,
          email: user.email,
          role: user.role,
        }),
        expiresIn: 86400,
      };
      
      log.auth('email_login_success', user.id, true, { type, role: user.role });
      
      sendSuccess(res, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePassword: user.must_change_password,
        },
        tokens,
      }, 'Login successful');
      
    } catch (error) {
      log.error('Email login error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Refresh access token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;
    
    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);
      
      // Generate new access token
      const accessToken = generateAccessToken({
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      });
      
      sendSuccess(res, {
        accessToken,
        expiresIn: 86400,
      }, 'Token refreshed successfully');
      
    } catch (error) {
      log.auth('token_refresh_failed', 'unknown', false, { error: error.message });
      return Errors.TOKEN_EXPIRED().send(res, 401);
    }
  }
  
  /**
   * Logout user
   */
  async logout(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    
    try {
      // TODO: Implement token blacklisting with Redis
      // For now, just log the logout
      
      log.auth('logout', userId, true);
      
      sendSuccess(res, null, 'Logout successful');
      
    } catch (error) {
      log.error('Logout error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Verify 2FA code
   */
  async verify2FA(req: Request, res: Response): Promise<void> {
    const { code, userId } = req.body;
    const db = getDatabase();
    
    try {
      // TODO: Implement actual 2FA verification
      // For now, simulate the process
      
      if (code === '123456') {
        // Valid code
        await db('users')
          .where('id', userId)
          .update({
            '2fa_verified_at': db.fn.now(),
          });
        
        sendSuccess(res, {
          verified: true,
        }, '2FA verification successful');
      } else {
        // Invalid code
        sendError(res, 'AUTH_006', 'Invalid 2FA code', null, 400);
      }
      
    } catch (error) {
      log.error('2FA verification error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Helper method to get user by referral code
   */
  private async getUserByReferralCode(trx: any, referralCode: string): Promise<string | null> {
    try {
      const profile = await trx('user_profiles')
        .where('referral_code', referralCode)
        .first();
      
      return profile ? profile.user_id : null;
    } catch (error) {
      return null;
    }
  }
}

export default new AuthController();