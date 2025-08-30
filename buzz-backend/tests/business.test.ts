import request from 'supertest';
import { Express } from 'express';
import { getTestDb, TEST_USERS, TEST_BUSINESSES, generateTestToken } from './setup';
import app from '../src/app';
import bcrypt from 'bcrypt';

describe('Business Endpoints', () => {
  let server: Express;

  beforeAll(() => {
    server = app;
  });

  describe('POST /api/business/apply', () => {
    it('should submit business application', async () => {
      const applicationData = {
        email: 'newbusiness@example.com',
        password: 'NewBusiness123!',
        confirmPassword: 'NewBusiness123!',
        businessInfo: {
          name: '새로운 카페',
          registrationNumber: '111-22-33333',
          category: 'cafe',
          address: '부산광역시 수영구 광안해변로 219',
          phone: '051-1234-5678',
          bankAccount: {
            bank: '국민은행',
            accountNumber: '123456-78-901234',
            accountHolder: '새로운카페대표'
          }
        },
        documents: [
          'https://example.com/business_license.pdf',
          'https://example.com/bank_account.pdf'
        ]
      };

      const response = await request(server)
        .post('/api/business/apply')
        .send(applicationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.applicationId).toBeDefined();
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.expiresAt).toBeDefined();
    });

    it('should validate business information', async () => {
      const applicationData = {
        email: 'invalid-business@example.com',
        password: 'ValidPassword123!',
        businessInfo: {
          name: '', // Empty name
          registrationNumber: '123', // Invalid format
          category: 'invalid_category'
        }
      };

      const response = await request(server)
        .post('/api/business/apply')
        .send(applicationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toContain('businessInfo.name');
      expect(response.body.error.details).toContain('businessInfo.registrationNumber');
      expect(response.body.error.details).toContain('businessInfo.category');
    });

    it('should reject duplicate email application', async () => {
      const applicationData = {
        email: TEST_USERS.BUSINESS_USER_1.email,
        password: 'Password123!',
        businessInfo: {
          name: '중복 비즈니스',
          registrationNumber: '999-88-77777',
          category: 'restaurant'
        }
      };

      const response = await request(server)
        .post('/api/business/apply')
        .send(applicationData)
        .expect(400);

      expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should validate password strength', async () => {
      const applicationData = {
        email: 'weakpass@example.com',
        password: '123', // Weak password
        businessInfo: {
          name: '약한 비밀번호 테스트',
          registrationNumber: '555-44-33333',
          category: 'cafe'
        }
      };

      const response = await request(server)
        .post('/api/business/apply')
        .send(applicationData)
        .expect(400);

      expect(response.body.error.details).toContain('password');
    });
  });

  describe('GET /api/business/applications/:id', () => {
    it('should get business application status', async () => {
      const db = getTestDb();
      const application = await db('business_applications')
        .where('email', 'business1@example.com')
        .first();

      const response = await request(server)
        .get(`/api/business/applications/${application.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.application.id).toBe(application.id);
      expect(response.body.data.application.status).toBeDefined();
      expect(response.body.data.application.businessInfo).toBeDefined();
    });

    it('should reject request for non-existent application', async () => {
      const response = await request(server)
        .get('/api/business/applications/non-existent-id')
        .expect(404);

      expect(response.body.error.code).toBe('APPLICATION_NOT_FOUND');
    });
  });

  describe('POST /api/business/login', () => {
    it('should login approved business user', async () => {
      const loginData = {
        email: TEST_USERS.BUSINESS_USER_1.email,
        password: TEST_USERS.BUSINESS_USER_1.password
      };

      const response = await request(server)
        .post('/api/business/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('business');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.business).toBeDefined();
    });

    it('should include business information in login response', async () => {
      const loginData = {
        email: TEST_USERS.BUSINESS_USER_1.email,
        password: TEST_USERS.BUSINESS_USER_1.password
      };

      const response = await request(server)
        .post('/api/business/login')
        .send(loginData)
        .expect(200);

      expect(response.body.data.business.id).toBe(TEST_BUSINESSES.CHICKEN_RESTAURANT.id);
      expect(response.body.data.business.businessName).toBe(TEST_BUSINESSES.CHICKEN_RESTAURANT.name);
      expect(response.body.data.business.status).toBe('approved');
    });

    it('should reject login for pending application', async () => {
      // Create a pending application
      const db = getTestDb();
      const pendingApplication = await db('business_applications').insert({
        email: 'pending@example.com',
        password_hash: await bcrypt.hash('Pending123!', 10),
        business_info: {
          name: '대기중인 비즈니스',
          registrationNumber: '777-88-99999',
          category: 'restaurant'
        },
        status: 'pending'
      }).returning('*');

      const loginData = {
        email: 'pending@example.com',
        password: 'Pending123!'
      };

      const response = await request(server)
        .post('/api/business/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error.code).toBe('APPLICATION_PENDING');
    });
  });

  describe('GET /api/business/me', () => {
    it('should get business profile', async () => {
      const token = generateTestToken(TEST_USERS.BUSINESS_USER_1.id, 'business');

      const response = await request(server)
        .get('/api/business/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.business.id).toBe(TEST_BUSINESSES.CHICKEN_RESTAURANT.id);
      expect(response.body.data.business.businessName).toBeDefined();
      expect(response.body.data.business.category).toBeDefined();
      expect(response.body.data.business.status).toBe('approved');
    });

    it('should include business statistics', async () => {
      const token = generateTestToken(TEST_USERS.BUSINESS_USER_1.id, 'business');

      const response = await request(server)
        .get('/api/business/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.qrScanCount).toBeDefined();
      expect(response.body.data.stats.avgRating).toBeDefined();
      expect(response.body.data.stats.reviewCount).toBeDefined();
    });

    it('should reject request from non-business user', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id, 'user');

      const response = await request(server)
        .get('/api/business/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('PUT /api/business/me', () => {
    it('should update business information', async () => {
      const token = generateTestToken(TEST_USERS.BUSINESS_USER_1.id, 'business');
      const updateData = {
        businessName: '업데이트된 치킨집',
        description: '새로운 설명입니다',
        phone: '051-9999-8888',
        businessHours: {
          monday: { open: '10:00', close: '23:00', closed: false },
          tuesday: { open: '10:00', close: '23:00', closed: false },
          wednesday: { open: '10:00', close: '23:00', closed: false },
          thursday: { open: '10:00', close: '23:00', closed: false },
          friday: { open: '10:00', close: '24:00', closed: false },
          saturday: { open: '10:00', close: '24:00', closed: false },
          sunday: { open: '11:00', close: '23:00', closed: false }
        },
        tags: ['치킨', '배달', '테이크아웃', '신메뉴']
      };

      const response = await request(server)
        .put('/api/business/me')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.business.businessName).toBe(updateData.businessName);
      expect(response.body.data.business.description).toBe(updateData.description);
      expect(response.body.data.business.phone).toBe(updateData.phone);
    });

    it('should validate business hours format', async () => {
      const token = generateTestToken(TEST_USERS.BUSINESS_USER_1.id, 'business');
      const updateData = {
        businessHours: {
          monday: { open: '25:00', close: '23:00' } // Invalid hour
        }
      };

      const response = await request(server)
        .put('/api/business/me')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error.details).toContain('businessHours');
    });

    it('should prevent updating restricted fields', async () => {
      const token = generateTestToken(TEST_USERS.BUSINESS_USER_1.id, 'business');
      const updateData = {
        businessNumber: '999-99-99999',
        status: 'suspended',
        ownerId: 'another-user-id'
      };

      const response = await request(server)
        .put('/api/business/me')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error.code).toBe('RESTRICTED_FIELDS');
    });
  });

  describe('GET /api/business/settlements', () => {
    it('should get settlement requests', async () => {
      const token = generateTestToken(TEST_USERS.BUSINESS_USER_1.id, 'business');

      const response = await request(server)
        .get('/api/business/settlements')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.settlements)).toBe(true);
      expect(response.body.data.summary).toBeDefined();
    });

    it('should filter settlements by status', async () => {
      const token = generateTestToken(TEST_USERS.BUSINESS_USER_1.id, 'business');

      const response = await request(server)
        .get('/api/business/settlements?status=pending')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.settlements.forEach((settlement: any) => {
        expect(settlement.status).toBe('pending');
      });
    });

    it('should paginate settlement results', async () => {
      const token = generateTestToken(TEST_USERS.BUSINESS_USER_1.id, 'business');

      const response = await request(server)
        .get('/api/business/settlements?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });
  });

  describe('POST /api/business/settlements', () => {
    it('should create settlement request', async () => {
      const token = generateTestToken(TEST_USERS.BUSINESS_USER_1.id, 'business');
      const settlementData = {
        settlementDate: new Date().toISOString().split('T')[0], // Today
        bankName: '국민은행',
        bankAccount: '123456-78-901234'
      };

      const response = await request(server)
        .post('/api/business/settlements')
        .set('Authorization', `Bearer ${token}`)
        .send(settlementData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.settlement.id).toBeDefined();
      expect(response.body.data.settlement.status).toBe('pending');
      expect(response.body.data.settlement.totalAmount).toBeGreaterThanOrEqual(0);
    });

    it('should calculate settlement amounts correctly', async () => {
      const token = generateTestToken(TEST_USERS.BUSINESS_USER_1.id, 'business');
      
      // First, create some transactions that should be included in settlement
      const db = getTestDb();
      await db('user_coupons').where('used_business_id', TEST_BUSINESSES.CHICKEN_RESTAURANT.id).update({
        used_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // Used yesterday
        used_amount: 3000,
        status: 'used'
      });

      const settlementData = {
        settlementDate: new Date().toISOString().split('T')[0],
        bankName: '신한은행',
        bankAccount: '987-654-321098'
      };

      const response = await request(server)
        .post('/api/business/settlements')
        .set('Authorization', `Bearer ${token}`)
        .send(settlementData)
        .expect(201);

      expect(response.body.data.settlement.couponCount).toBeGreaterThan(0);
      expect(response.body.data.settlement.couponAmount).toBeGreaterThan(0);
      expect(response.body.data.settlement.totalAmount).toBeGreaterThan(0);
    });

    it('should prevent duplicate settlement for same date', async () => {
      const token = generateTestToken(TEST_USERS.BUSINESS_USER_1.id, 'business');
      const settlementDate = new Date().toISOString().split('T')[0];
      
      const settlementData = {
        settlementDate,
        bankName: '하나은행',
        bankAccount: '555-666-777888'
      };

      // First request should succeed
      await request(server)
        .post('/api/business/settlements')
        .set('Authorization', `Bearer ${token}`)
        .send(settlementData)
        .expect(201);

      // Second request for same date should fail
      const response = await request(server)
        .post('/api/business/settlements')
        .set('Authorization', `Bearer ${token}`)
        .send(settlementData)
        .expect(400);

      expect(response.body.error.code).toBe('DUPLICATE_SETTLEMENT_DATE');
    });
  });

  describe('GET /api/business/qr/scan', () => {
    it('should validate and process QR code scan', async () => {
      const token = generateTestToken(TEST_USERS.BUSINESS_USER_1.id, 'business');
      
      const response = await request(server)
        .post('/api/business/qr/scan')
        .set('Authorization', `Bearer ${token}`)
        .send({
          qrData: 'QR_CODE_DATA_001', // From test data
          scanLocation: {
            latitude: 35.1379,
            longitude: 129.0756
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.coupon).toBeDefined();
      expect(response.body.data.discountAmount).toBeDefined();
    });

    it('should reject expired QR codes', async () => {
      const token = generateTestToken(TEST_USERS.BUSINESS_USER_1.id, 'business');
      
      const response = await request(server)
        .post('/api/business/qr/scan')
        .set('Authorization', `Bearer ${token}`)
        .send({
          qrData: 'EXPIRED_QR_CODE'
        })
        .expect(400);

      expect(response.body.error.code).toBe('QR_CODE_EXPIRED');
    });

    it('should reject already used QR codes', async () => {
      const token = generateTestToken(TEST_USERS.BUSINESS_USER_1.id, 'business');
      
      // First scan should succeed
      await request(server)
        .post('/api/business/qr/scan')
        .set('Authorization', `Bearer ${token}`)
        .send({
          qrData: 'QR_CODE_DATA_002'
        })
        .expect(200);

      // Second scan should fail
      const response = await request(server)
        .post('/api/business/qr/scan')
        .set('Authorization', `Bearer ${token}`)
        .send({
          qrData: 'QR_CODE_DATA_002'
        })
        .expect(400);

      expect(response.body.error.code).toBe('QR_CODE_ALREADY_USED');
    });
  });

  describe('GET /api/business/reviews', () => {
    it('should get business reviews', async () => {
      const token = generateTestToken(TEST_USERS.BUSINESS_USER_1.id, 'business');

      const response = await request(server)
        .get('/api/business/reviews')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.reviews)).toBe(true);
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.averageRating).toBeDefined();
      expect(response.body.data.stats.totalCount).toBeDefined();
      expect(response.body.data.stats.ratingDistribution).toBeDefined();
    });

    it('should filter reviews by rating', async () => {
      const token = generateTestToken(TEST_USERS.BUSINESS_USER_1.id, 'business');

      const response = await request(server)
        .get('/api/business/reviews?rating=5')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.reviews.forEach((review: any) => {
        expect(review.rating).toBe(5);
      });
    });

    it('should sort reviews by date', async () => {
      const token = generateTestToken(TEST_USERS.BUSINESS_USER_1.id, 'business');

      const response = await request(server)
        .get('/api/business/reviews?sort=created_at&order=desc')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const reviews = response.body.data.reviews;
      for (let i = 1; i < reviews.length; i++) {
        expect(new Date(reviews[i].createdAt) <= new Date(reviews[i-1].createdAt)).toBe(true);
      }
    });
  });

  describe('GET /api/business/analytics', () => {
    it('should get business analytics', async () => {
      const token = generateTestToken(TEST_USERS.BUSINESS_USER_1.id, 'business');

      const response = await request(server)
        .get('/api/business/analytics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.qrScans).toBeDefined();
      expect(response.body.data.couponsUsed).toBeDefined();
      expect(response.body.data.settlements).toBeDefined();
    });

    it('should filter analytics by date range', async () => {
      const token = generateTestToken(TEST_USERS.BUSINESS_USER_1.id, 'business');
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      const response = await request(server)
        .get(`/api/business/analytics?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dateRange).toBeDefined();
      expect(response.body.data.dateRange.startDate).toBe(startDate.toISOString().split('T')[0]);
      expect(response.body.data.dateRange.endDate).toBe(endDate.toISOString().split('T')[0]);
    });
  });
});