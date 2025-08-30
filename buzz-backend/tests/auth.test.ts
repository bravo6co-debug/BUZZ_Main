import request from 'supertest';
import { Express } from 'express';
import { getTestDb, TEST_USERS, generateTestToken } from './setup';
import app from '../src/app';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

describe('Authentication Endpoints', () => {
  let server: Express;

  beforeAll(() => {
    server = app;
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with Google OAuth', async () => {
      const userData = {
        email: 'newuser@gmail.com',
        name: '새로운 사용자',
        authProvider: 'google',
        providerId: 'google_newuser123',
        avatarUrl: 'https://example.com/avatar.jpg',
        university: '부경대학교',
        marketingAgree: true
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.name).toBe(userData.name);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.referralCode).toBeDefined();
    });

    it('should register a new user with Kakao OAuth', async () => {
      const userData = {
        email: 'kakaouser@kakao.com',
        name: '카카오 사용자',
        authProvider: 'kakao',
        providerId: 'kakao_user456',
        university: '동의대학교',
        marketingAgree: false
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.authProvider).toBe('kakao');
    });

    it('should register with referral code', async () => {
      const db = getTestDb();
      const referrer = await db('user_profiles').where('user_id', TEST_USERS.TEST_USER_1.id).first();

      const userData = {
        email: 'referred@gmail.com',
        name: '추천받은 사용자',
        authProvider: 'google',
        providerId: 'google_referred789',
        university: '부경대학교',
        referralCode: referrer.referral_code
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.referralReward).toBeDefined();
      expect(response.body.data.signupBonus).toBeDefined();
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        email: TEST_USERS.TEST_USER_1.email,
        name: '중복 사용자',
        authProvider: 'google',
        providerId: 'google_duplicate123'
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should validate required fields', async () => {
      const response = await request(server)
        .post('/api/auth/register')
        .send({
          name: '이름만 있음'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toContain('email');
      expect(response.body.error.details).toContain('authProvider');
    });
  });

  describe('POST /api/auth/login/social', () => {
    it('should login existing user with Google', async () => {
      const loginData = {
        authProvider: 'google',
        providerId: 'google_123456789',
        email: TEST_USERS.TEST_USER_1.email
      };

      const response = await request(server)
        .post('/api/auth/login/social')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(TEST_USERS.TEST_USER_1.email);
      expect(response.body.data.token).toBeDefined();
    });

    it('should create new user on first social login', async () => {
      const loginData = {
        authProvider: 'google',
        providerId: 'google_newlogin123',
        email: 'newlogin@gmail.com',
        name: '새로운 로그인',
        avatarUrl: 'https://example.com/new-avatar.jpg'
      };

      const response = await request(server)
        .post('/api/auth/login/social')
        .send(loginData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.isNewUser).toBe(true);
    });

    it('should update last login time', async () => {
      const db = getTestDb();
      const userBefore = await db('users').where('id', TEST_USERS.TEST_USER_1.id).first();

      const loginData = {
        authProvider: 'google',
        providerId: 'google_123456789',
        email: TEST_USERS.TEST_USER_1.email
      };

      await request(server)
        .post('/api/auth/login/social')
        .send(loginData)
        .expect(200);

      const userAfter = await db('users').where('id', TEST_USERS.TEST_USER_1.id).first();
      expect(new Date(userAfter.last_login_at)).toBeInstanceOf(Date);
      expect(userAfter.login_count).toBe(userBefore.login_count + 1);
    });
  });

  describe('POST /api/auth/login/email', () => {
    it('should login business user with email and password', async () => {
      const loginData = {
        email: TEST_USERS.BUSINESS_USER_1.email,
        password: TEST_USERS.BUSINESS_USER_1.password
      };

      const response = await request(server)
        .post('/api/auth/login/email')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(TEST_USERS.BUSINESS_USER_1.email);
      expect(response.body.data.user.role).toBe('business');
      expect(response.body.data.token).toBeDefined();
    });

    it('should login admin user with email and password', async () => {
      const loginData = {
        email: TEST_USERS.SUPER_ADMIN.email,
        password: TEST_USERS.SUPER_ADMIN.password
      };

      const response = await request(server)
        .post('/api/auth/login/email')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('admin');
      expect(response.body.data.adminRoles).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const loginData = {
        email: TEST_USERS.BUSINESS_USER_1.email,
        password: 'wrongpassword'
      };

      const response = await request(server)
        .post('/api/auth/login/email')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login for inactive user', async () => {
      const db = getTestDb();
      await db('users')
        .where('id', TEST_USERS.BUSINESS_USER_2.id)
        .update({ is_active: false });

      const loginData = {
        email: TEST_USERS.BUSINESS_USER_2.email,
        password: TEST_USERS.BUSINESS_USER_2.password
      };

      const response = await request(server)
        .post('/api/auth/login/email')
        .send(loginData)
        .expect(401);

      expect(response.body.error.code).toBe('ACCOUNT_INACTIVE');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh valid token', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id);

      const response = await request(server)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.id).toBe(TEST_USERS.TEST_USER_1.id);
    });

    it('should reject invalid token', async () => {
      const response = await request(server)
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject missing token', async () => {
      const response = await request(server)
        .post('/api/auth/refresh')
        .expect(401);

      expect(response.body.error.code).toBe('TOKEN_REQUIRED');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user successfully', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id);

      const response = await request(server)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('로그아웃되었습니다');
    });
  });

  describe('JWT Token Validation', () => {
    it('should validate token structure', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret') as any;

      expect(decoded.userId).toBe(TEST_USERS.TEST_USER_1.id);
      expect(decoded.role).toBe('user');
      expect(decoded.email).toBe(TEST_USERS.TEST_USER_1.email);
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        {
          userId: TEST_USERS.TEST_USER_1.id,
          role: 'user',
          email: TEST_USERS.TEST_USER_1.email
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(server)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to login attempts', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      };

      // Make multiple failed login attempts
      const promises = Array(6).fill(0).map(() => 
        request(server)
          .post('/api/auth/login/email')
          .send(loginData)
      );

      const responses = await Promise.all(promises);
      
      // First 5 should be 401 (unauthorized), 6th should be 429 (too many requests)
      expect(responses.slice(0, 5).every(r => r.status === 401)).toBe(true);
      expect(responses[5].status).toBe(429);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in response', async () => {
      const response = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${generateTestToken(TEST_USERS.TEST_USER_1.id)}`);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });
});