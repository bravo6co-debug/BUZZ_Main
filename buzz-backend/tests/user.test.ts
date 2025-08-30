import request from 'supertest';
import { Express } from 'express';
import { getTestDb, TEST_USERS, TEST_COUPONS, generateTestToken } from './setup';
import app from '../src/app';

describe('User Endpoints', () => {
  let server: Express;

  beforeAll(() => {
    server = app;
  });

  describe('GET /api/users/me', () => {
    it('should get current user profile', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id);

      const response = await request(server)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(TEST_USERS.TEST_USER_1.id);
      expect(response.body.data.user.email).toBe(TEST_USERS.TEST_USER_1.email);
      expect(response.body.data.profile).toBeDefined();
      expect(response.body.data.profile.referralCode).toBeDefined();
    });

    it('should include mileage balance in profile', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id);

      const response = await request(server)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.mileage).toBeDefined();
      expect(response.body.data.mileage.balance).toBeGreaterThanOrEqual(0);
      expect(response.body.data.mileage.totalEarned).toBeDefined();
    });

    it('should reject request without token', async () => {
      const response = await request(server)
        .get('/api/users/me')
        .expect(401);

      expect(response.body.error.code).toBe('TOKEN_REQUIRED');
    });
  });

  describe('PUT /api/users/me', () => {
    it('should update user profile', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id);
      const updateData = {
        name: '김업데이트',
        phone: '010-9999-8888',
        university: '동명대학교',
        marketingAgree: false
      };

      const response = await request(server)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe(updateData.name);
      expect(response.body.data.user.phone).toBe(updateData.phone);
      expect(response.body.data.profile.university).toBe(updateData.university);
    });

    it('should validate phone number format', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id);
      const updateData = {
        phone: '잘못된전화번호'
      };

      const response = await request(server)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toContain('phone');
    });

    it('should prevent updating immutable fields', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id);
      const updateData = {
        email: 'newemail@example.com',
        role: 'admin',
        referralCode: 'NEWCODE123'
      };

      const response = await request(server)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error.code).toBe('IMMUTABLE_FIELDS');
    });
  });

  describe('GET /api/users/mileage', () => {
    it('should get user mileage information', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id);

      const response = await request(server)
        .get('/api/users/mileage')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.balance).toBeDefined();
      expect(response.body.data.totalEarned).toBeDefined();
      expect(response.body.data.totalUsed).toBeDefined();
      expect(response.body.data.expiringAmount).toBeDefined();
      expect(response.body.data.expiringDate).toBeDefined();
    });

    it('should get mileage transaction history', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id);

      const response = await request(server)
        .get('/api/users/mileage/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.transactions)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter mileage transactions by type', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id);

      const response = await request(server)
        .get('/api/users/mileage/transactions?type=earn')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.transactions.forEach((transaction: any) => {
        expect(transaction.type).toBe('earn');
      });
    });
  });

  describe('POST /api/users/mileage/use', () => {
    it('should use mileage for purchase', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id);
      const useData = {
        amount: 1000,
        businessId: 'biz-1111-2222-3333-444444444444',
        description: '치킨 구매'
      };

      const response = await request(server)
        .post('/api/users/mileage/use')
        .set('Authorization', `Bearer ${token}`)
        .send(useData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction.amount).toBe(-useData.amount);
      expect(response.body.data.transaction.type).toBe('use');
      expect(response.body.data.newBalance).toBeDefined();
    });

    it('should reject usage exceeding balance', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id);
      const db = getTestDb();
      
      // Get current balance
      const account = await db('mileage_accounts')
        .where('user_id', TEST_USERS.TEST_USER_1.id)
        .first();

      const useData = {
        amount: account.balance + 1000, // More than available
        businessId: 'biz-1111-2222-3333-444444444444',
        description: '잔액 초과 사용'
      };

      const response = await request(server)
        .post('/api/users/mileage/use')
        .set('Authorization', `Bearer ${token}`)
        .send(useData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_BALANCE');
    });

    it('should validate minimum usage amount', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id);
      const useData = {
        amount: 50, // Below minimum
        businessId: 'biz-1111-2222-3333-444444444444'
      };

      const response = await request(server)
        .post('/api/users/mileage/use')
        .set('Authorization', `Bearer ${token}`)
        .send(useData)
        .expect(400);

      expect(response.body.error.code).toBe('BELOW_MINIMUM_AMOUNT');
    });
  });

  describe('GET /api/users/coupons', () => {
    it('should get user coupons', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id);

      const response = await request(server)
        .get('/api/users/coupons')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.coupons)).toBe(true);
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.total).toBeDefined();
      expect(response.body.data.stats.active).toBeDefined();
      expect(response.body.data.stats.used).toBeDefined();
      expect(response.body.data.stats.expired).toBeDefined();
    });

    it('should filter coupons by status', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id);

      const response = await request(server)
        .get('/api/users/coupons?status=active')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.coupons.forEach((coupon: any) => {
        expect(coupon.status).toBe('active');
      });
    });

    it('should sort coupons by expiry date', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id);

      const response = await request(server)
        .get('/api/users/coupons?sort=expires_at&order=asc')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const coupons = response.body.data.coupons;
      for (let i = 1; i < coupons.length; i++) {
        expect(new Date(coupons[i].expiresAt) >= new Date(coupons[i-1].expiresAt)).toBe(true);
      }
    });
  });

  describe('GET /api/users/coupons/:id/qr', () => {
    it('should generate QR code for coupon', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id);
      const db = getTestDb();
      
      const userCoupon = await db('user_coupons')
        .where('user_id', TEST_USERS.TEST_USER_1.id)
        .where('status', 'active')
        .first();

      const response = await request(server)
        .get(`/api/users/coupons/${userCoupon.id}/qr`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.qrCode).toBeDefined();
      expect(response.body.data.qrData).toBeDefined();
      expect(response.body.data.expiresAt).toBeDefined();
    });

    it('should reject QR generation for expired coupon', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id);
      const db = getTestDb();
      
      // Create an expired coupon
      const expiredCoupon = await db('user_coupons').insert({
        user_id: TEST_USERS.TEST_USER_1.id,
        coupon_id: TEST_COUPONS.SIGNUP_COUPON.id,
        status: 'expired',
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        issued_at: db.fn.now()
      }).returning('*');

      const response = await request(server)
        .get(`/api/users/coupons/${expiredCoupon[0].id}/qr`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.error.code).toBe('COUPON_EXPIRED');
    });
  });

  describe('GET /api/users/referral', () => {
    it('should get referral information', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id);

      const response = await request(server)
        .get('/api/users/referral')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.referralCode).toBeDefined();
      expect(response.body.data.referralUrl).toBeDefined();
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.totalVisits).toBeDefined();
      expect(response.body.data.stats.totalConversions).toBeDefined();
      expect(response.body.data.stats.conversionRate).toBeDefined();
      expect(response.body.data.stats.totalRewards).toBeDefined();
    });

    it('should get referral rewards history', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id);

      const response = await request(server)
        .get('/api/users/referral/rewards')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.rewards)).toBe(true);
      expect(response.body.data.summary).toBeDefined();
    });
  });

  describe('POST /api/users/referral/visit', () => {
    it('should track referral visit', async () => {
      const visitData = {
        referralCode: 'TESTCODE123',
        utmSource: 'facebook',
        utmMedium: 'social',
        utmCampaign: 'spring2024',
        refererUrl: 'https://facebook.com'
      };

      const response = await request(server)
        .post('/api/users/referral/visit')
        .send(visitData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.visitId).toBeDefined();
      expect(response.body.data.couponOffered).toBeDefined();
    });

    it('should reject invalid referral code', async () => {
      const visitData = {
        referralCode: 'INVALIDCODE123'
      };

      const response = await request(server)
        .post('/api/users/referral/visit')
        .send(visitData)
        .expect(404);

      expect(response.body.error.code).toBe('REFERRAL_CODE_NOT_FOUND');
    });
  });

  describe('DELETE /api/users/me', () => {
    it('should soft delete user account', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_2.id);

      const response = await request(server)
        .delete('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: '더 이상 사용하지 않음' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('탈퇴');

      // Verify user is soft deleted
      const db = getTestDb();
      const user = await db('users').where('id', TEST_USERS.TEST_USER_2.id).first();
      expect(user.deleted_at).not.toBeNull();
      expect(user.is_active).toBe(false);
    });

    it('should anonymize user data on deletion', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_2.id);

      await request(server)
        .delete('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: '개인정보 삭제 요청' })
        .expect(200);

      const db = getTestDb();
      const user = await db('users').where('id', TEST_USERS.TEST_USER_2.id).first();
      expect(user.email).toContain('deleted_');
      expect(user.phone).toBeNull();
      expect(user.name).toBe('탈퇴한 사용자');
    });
  });
});