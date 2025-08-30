import request from 'supertest';
import { Express } from 'express';
import { getTestDb, TEST_USERS, generateTestToken, resetTestDb } from '../setup';
import app from '../../src/app';

describe('Integration Tests - Complete User Flows', () => {
  let server: Express;
  let newUserToken: string;
  let newUserId: string;
  let businessToken: string;
  let adminToken: string;

  beforeAll(() => {
    server = app;
    adminToken = generateTestToken(TEST_USERS.SUPER_ADMIN.id, 'admin');
    businessToken = generateTestToken(TEST_USERS.BUSINESS_USER_1.id, 'business');
  });

  beforeEach(async () => {
    await resetTestDb();
  });

  describe('Complete User Journey', () => {
    it('should handle complete user registration and referral flow', async () => {
      // 1. User visits referral link
      const visitResponse = await request(server)
        .post('/api/users/referral/visit')
        .send({
          referralCode: 'TESTREF123',
          utmSource: 'facebook',
          utmMedium: 'social'
        });

      expect(visitResponse.status).toBe(200);
      expect(visitResponse.body.data.couponOffered).toBeDefined();

      // 2. User registers with Google OAuth
      const registerResponse = await request(server)
        .post('/api/auth/register')
        .send({
          email: 'newintegrationuser@gmail.com',
          name: '통합테스트 사용자',
          authProvider: 'google',
          providerId: 'google_integration123',
          university: '부경대학교',
          referralCode: 'TESTREF123',
          marketingAgree: true
        })
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      newUserToken = registerResponse.body.data.token;
      newUserId = registerResponse.body.data.user.id;
      
      // Should receive signup bonuses
      expect(registerResponse.body.data.signupBonus).toBeDefined();
      expect(registerResponse.body.data.referralReward).toBeDefined();

      // 3. Check user profile has correct information
      const profileResponse = await request(server)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(200);

      expect(profileResponse.body.data.user.email).toBe('newintegrationuser@gmail.com');
      expect(profileResponse.body.data.profile.university).toBe('부경대학교');
      expect(profileResponse.body.data.mileage.balance).toBeGreaterThan(0);

      // 4. User receives coupons
      const couponsResponse = await request(server)
        .get('/api/users/coupons')
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(200);

      expect(couponsResponse.body.data.coupons.length).toBeGreaterThan(0);
      expect(couponsResponse.body.data.stats.active).toBeGreaterThan(0);

      // 5. Check referral stats were updated
      const referralResponse = await request(server)
        .get('/api/users/referral')
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(200);

      expect(referralResponse.body.data.referralCode).toBeDefined();
      expect(referralResponse.body.data.stats).toBeDefined();
    });

    it('should handle mileage earning and spending flow', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id);

      // 1. Check initial balance
      const initialResponse = await request(server)
        .get('/api/users/mileage')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const initialBalance = initialResponse.body.data.balance;

      // 2. Earn mileage from QR scan (simulated by business)
      const db = getTestDb();
      await db('mileage_transactions').insert({
        user_id: TEST_USERS.TEST_USER_1.id,
        business_id: TEST_USERS.BUSINESS_USER_1.id,
        type: 'earn',
        amount: 500,
        balance_before: initialBalance,
        balance_after: initialBalance + 500,
        description: 'QR 스캔 마일리지 적립',
        reference_type: 'qr_scan'
      });

      await db('mileage_accounts')
        .where('user_id', TEST_USERS.TEST_USER_1.id)
        .update({
          balance: initialBalance + 500,
          total_earned: db.raw('total_earned + 500')
        });

      // 3. Check updated balance
      const updatedResponse = await request(server)
        .get('/api/users/mileage')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(updatedResponse.body.data.balance).toBe(initialBalance + 500);

      // 4. Use mileage for purchase
      const useResponse = await request(server)
        .post('/api/users/mileage/use')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 300,
          businessId: TEST_USERS.BUSINESS_USER_1.id,
          description: '치킨 구매 시 마일리지 사용'
        })
        .expect(200);

      expect(useResponse.body.data.newBalance).toBe(initialBalance + 500 - 300);

      // 5. Check transaction history
      const historyResponse = await request(server)
        .get('/api/users/mileage/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(historyResponse.body.data.transactions.length).toBeGreaterThan(1);
      const latestTransaction = historyResponse.body.data.transactions[0];
      expect(latestTransaction.type).toBe('use');
      expect(latestTransaction.amount).toBe(-300);
    });

    it('should handle coupon generation and redemption flow', async () => {
      const userToken = generateTestToken(TEST_USERS.TEST_USER_1.id);
      const businessToken = generateTestToken(TEST_USERS.BUSINESS_USER_1.id, 'business');

      // 1. Get user's available coupon
      const couponsResponse = await request(server)
        .get('/api/users/coupons?status=active')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(couponsResponse.body.data.coupons.length).toBeGreaterThan(0);
      const coupon = couponsResponse.body.data.coupons[0];

      // 2. Generate QR code for coupon
      const qrResponse = await request(server)
        .get(`/api/users/coupons/${coupon.id}/qr`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(qrResponse.body.data.qrCode).toBeDefined();
      expect(qrResponse.body.data.qrData).toBeDefined();
      const qrData = qrResponse.body.data.qrData;

      // 3. Business scans QR code
      const scanResponse = await request(server)
        .post('/api/business/qr/scan')
        .set('Authorization', `Bearer ${businessToken}`)
        .send({
          qrData: qrData,
          purchaseAmount: 15000,
          scanLocation: {
            latitude: 35.1379,
            longitude: 129.0756
          }
        })
        .expect(200);

      expect(scanResponse.body.success).toBe(true);
      expect(scanResponse.body.data.coupon.id).toBe(coupon.id);
      expect(scanResponse.body.data.discountAmount).toBeGreaterThan(0);

      // 4. Verify coupon is now used
      const usedCouponsResponse = await request(server)
        .get('/api/users/coupons?status=used')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const usedCoupon = usedCouponsResponse.body.data.coupons.find((c: any) => c.id === coupon.id);
      expect(usedCoupon).toBeDefined();
      expect(usedCoupon.status).toBe('used');
      expect(usedCoupon.usedAt).toBeDefined();

      // 5. Verify it appears in business settlement data
      const settlementResponse = await request(server)
        .get('/api/business/settlements')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      // Should have coupon usage data for settlement calculation
      expect(settlementResponse.body.data.summary.couponCount).toBeGreaterThan(0);
      expect(settlementResponse.body.data.summary.couponAmount).toBeGreaterThan(0);
    });
  });

  describe('Business Application to Settlement Flow', () => {
    it('should handle complete business application and approval flow', async () => {
      let applicationId: string;

      // 1. Submit business application
      const applicationResponse = await request(server)
        .post('/api/business/apply')
        .send({
          email: 'newbusiness@integration.com',
          password: 'NewBusiness123!',
          confirmPassword: 'NewBusiness123!',
          businessInfo: {
            name: '통합테스트 카페',
            registrationNumber: '111-22-33333',
            category: 'cafe',
            address: '부산광역시 해운대구 해운대해변로 999',
            phone: '051-9999-8888',
            bankAccount: {
              bank: '국민은행',
              accountNumber: '123456-78-999999',
              accountHolder: '통합테스트카페대표'
            }
          },
          documents: ['https://example.com/business_license.pdf']
        })
        .expect(201);

      expect(applicationResponse.body.success).toBe(true);
      applicationId = applicationResponse.body.data.applicationId;

      // 2. Admin reviews and approves application
      const approvalResponse = await request(server)
        .put(`/api/admin/business/applications/${applicationId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          adminNote: '모든 서류 확인 완료'
        })
        .expect(200);

      expect(approvalResponse.body.success).toBe(true);
      expect(approvalResponse.body.data.user).toBeDefined();
      expect(approvalResponse.body.data.business).toBeDefined();

      const approvedUserId = approvalResponse.body.data.user.id;
      const approvedBusinessId = approvalResponse.body.data.business.id;

      // 3. Business owner can now login
      const loginResponse = await request(server)
        .post('/api/business/login')
        .send({
          email: 'newbusiness@integration.com',
          password: 'NewBusiness123!'
        })
        .expect(200);

      expect(loginResponse.body.data.business.id).toBe(approvedBusinessId);
      const businessToken = loginResponse.body.data.token;

      // 4. Business updates profile
      const updateResponse = await request(server)
        .put('/api/business/me')
        .set('Authorization', `Bearer ${businessToken}`)
        .send({
          description: '신선한 커피와 베이글을 제공하는 아늑한 카페입니다.',
          businessHours: {
            monday: { open: '08:00', close: '20:00', closed: false },
            tuesday: { open: '08:00', close: '20:00', closed: false },
            wednesday: { open: '08:00', close: '20:00', closed: false },
            thursday: { open: '08:00', close: '20:00', closed: false },
            friday: { open: '08:00', close: '21:00', closed: false },
            saturday: { open: '09:00', close: '21:00', closed: false },
            sunday: { open: '09:00', close: '20:00', closed: false }
          },
          tags: ['커피', '베이글', '브런치', '와이파이']
        })
        .expect(200);

      expect(updateResponse.body.data.business.description).toContain('아늑한 카페');

      // 5. Simulate coupon usage for settlement
      const db = getTestDb();
      const testCoupon = await db('user_coupons')
        .where('user_id', TEST_USERS.TEST_USER_1.id)
        .where('status', 'active')
        .first();

      await db('user_coupons')
        .where('id', testCoupon.id)
        .update({
          used_at: new Date(),
          used_business_id: approvedBusinessId,
          used_amount: 3000,
          status: 'used'
        });

      // 6. Business requests settlement
      const settlementResponse = await request(server)
        .post('/api/business/settlements')
        .set('Authorization', `Bearer ${businessToken}`)
        .send({
          settlementDate: new Date().toISOString().split('T')[0],
          bankName: '국민은행',
          bankAccount: '123456-78-999999'
        })
        .expect(201);

      expect(settlementResponse.body.data.settlement.couponCount).toBe(1);
      expect(settlementResponse.body.data.settlement.couponAmount).toBe(3000);
      expect(settlementResponse.body.data.settlement.status).toBe('pending');

      const settlementId = settlementResponse.body.data.settlement.id;

      // 7. Admin approves settlement
      const settlementApprovalResponse = await request(server)
        .put(`/api/admin/settlements/${settlementId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          adminNote: '정산 내역 확인 완료'
        })
        .expect(200);

      expect(settlementApprovalResponse.body.data.settlement.status).toBe('approved');

      // 8. Admin marks settlement as paid
      const paidResponse = await request(server)
        .put(`/api/admin/settlements/${settlementId}/paid`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          transactionId: 'TXN_INTEGRATION_001',
          adminNote: '계좌이체 완료'
        })
        .expect(200);

      expect(paidResponse.body.data.settlement.status).toBe('paid');
      expect(paidResponse.body.data.settlement.paidAt).toBeDefined();

      // 9. Business can see completed settlement
      const finalSettlementResponse = await request(server)
        .get('/api/business/settlements')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      const paidSettlement = finalSettlementResponse.body.data.settlements.find(
        (s: any) => s.id === settlementId
      );
      expect(paidSettlement.status).toBe('paid');
    });
  });

  describe('Admin Management Flow', () => {
    it('should handle complete admin management workflow', async () => {
      const adminToken = generateTestToken(TEST_USERS.SUPER_ADMIN.id, 'admin');

      // 1. Admin gets dashboard overview
      const dashboardResponse = await request(server)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(dashboardResponse.body.data.stats).toBeDefined();
      expect(dashboardResponse.body.data.budgetStatus).toBeDefined();

      // 2. Admin manages user
      const userUpdateResponse = await request(server)
        .put(`/api/admin/users/${TEST_USERS.TEST_USER_2.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: false,
          adminNote: '테스트 계정 임시 비활성화'
        })
        .expect(200);

      expect(userUpdateResponse.body.data.user.isActive).toBe(false);

      // 3. Admin adjusts user mileage
      const mileageAdjustmentResponse = await request(server)
        .post(`/api/admin/users/${TEST_USERS.TEST_USER_1.id}/mileage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 2000,
          type: 'earn',
          description: '고객 서비스 보상',
          reason: 'customer_service_compensation'
        })
        .expect(200);

      expect(mileageAdjustmentResponse.body.data.transaction.amount).toBe(2000);

      // 4. Admin sets budget for next month
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const yearMonth = nextMonth.toISOString().substring(0, 7);

      const budgetResponse = await request(server)
        .post('/api/admin/budget')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          yearMonth,
          totalBudget: 20000000,
          referralBudget: 5000000,
          couponBudget: 8000000,
          eventBudget: 4000000,
          settlementBudget: 3000000
        })
        .expect(201);

      expect(budgetResponse.body.data.budget.totalBudget).toBe(20000000);

      // 5. Admin updates system settings
      const settingUpdateResponse = await request(server)
        .put('/api/admin/system/settings/referral_reward_amount')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          value: 750,
          description: '리퍼럴 보상 금액 상향 조정'
        })
        .expect(200);

      expect(settingUpdateResponse.body.data.setting.value).toBe(750);

      // 6. Admin checks audit logs to verify actions
      const auditResponse = await request(server)
        .get(`/api/admin/audit-logs?userId=${TEST_USERS.SUPER_ADMIN.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(auditResponse.body.data.logs.length).toBeGreaterThan(0);
      const recentActions = auditResponse.body.data.logs.map((log: any) => log.action);
      expect(recentActions).toContain('update_user');
      expect(recentActions).toContain('adjust_mileage');
      expect(recentActions).toContain('set_budget');
      expect(recentActions).toContain('update_system_setting');

      // 7. Admin generates analytics report
      const reportResponse = await request(server)
        .post('/api/admin/reports/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reportType: 'monthly_summary',
          dateRange: {
            startDate: '2024-01-01',
            endDate: '2024-01-31'
          },
          format: 'pdf'
        })
        .expect(202);

      expect(reportResponse.body.data.reportId).toBeDefined();
      expect(reportResponse.body.data.status).toBe('processing');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent coupon usage attempts', async () => {
      const userToken = generateTestToken(TEST_USERS.TEST_USER_1.id);
      const businessToken = generateTestToken(TEST_USERS.BUSINESS_USER_1.id, 'business');

      // Get user's coupon and generate QR
      const couponsResponse = await request(server)
        .get('/api/users/coupons?status=active')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const coupon = couponsResponse.body.data.coupons[0];
      
      const qrResponse = await request(server)
        .get(`/api/users/coupons/${coupon.id}/qr`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const qrData = qrResponse.body.data.qrData;

      // Simulate concurrent scan attempts
      const scanPromises = [
        request(server)
          .post('/api/business/qr/scan')
          .set('Authorization', `Bearer ${businessToken}`)
          .send({ qrData, purchaseAmount: 15000 }),
        request(server)
          .post('/api/business/qr/scan')
          .set('Authorization', `Bearer ${businessToken}`)
          .send({ qrData, purchaseAmount: 20000 })
      ];

      const results = await Promise.all(scanPromises.map(p => 
        p.then(res => ({ success: true, status: res.status, body: res.body }))
         .catch(err => ({ success: false, status: err.status, body: err.response?.body }))
      ));

      // One should succeed, one should fail
      const successCount = results.filter(r => r.status === 200).length;
      const errorCount = results.filter(r => r.status === 400).length;
      
      expect(successCount).toBe(1);
      expect(errorCount).toBe(1);
    });

    it('should handle rate limiting on registration', async () => {
      // Create multiple registration attempts rapidly
      const registrationPromises = Array(10).fill(0).map((_, index) => 
        request(server)
          .post('/api/auth/register')
          .send({
            email: `ratelimit${index}@example.com`,
            name: `Rate Limit User ${index}`,
            authProvider: 'google',
            providerId: `google_ratelimit${index}`,
            university: '부경대학교'
          })
      );

      const results = await Promise.all(registrationPromises.map(p => 
        p.then(res => res.status)
         .catch(err => err.status)
      ));

      // Some should succeed (201), some should be rate limited (429)
      const successCount = results.filter(status => status === 201).length;
      const rateLimitedCount = results.filter(status => status === 429).length;

      expect(successCount).toBeLessThan(10); // Not all should succeed
      expect(rateLimitedCount).toBeGreaterThan(0); // Some should be rate limited
    });

    it('should handle database transaction rollback on error', async () => {
      const adminToken = generateTestToken(TEST_USERS.SUPER_ADMIN.id, 'admin');
      const db = getTestDb();

      // Get initial user count
      const initialUserCount = await db('users').count('* as count').first();

      // Try to create a user with invalid data that should trigger rollback
      const response = await request(server)
        .post('/api/admin/users/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          profile: {
            // Missing required fields that should cause error
            referralCode: null // This should cause the transaction to rollback
          }
        });

      // Request should fail
      expect([400, 500]).toContain(response.status);

      // User count should remain the same (transaction rolled back)
      const finalUserCount = await db('users').count('* as count').first();
      expect(finalUserCount.count).toEqual(initialUserCount.count);
    });
  });

  describe('Performance and Load Tests', () => {
    it('should handle multiple concurrent user requests', async () => {
      const tokens = [
        generateTestToken(TEST_USERS.TEST_USER_1.id),
        generateTestToken(TEST_USERS.TEST_USER_2.id),
        generateTestToken(TEST_USERS.BUSINESS_USER_1.id, 'business'),
        generateTestToken(TEST_USERS.BUSINESS_USER_2.id, 'business')
      ];

      // Create multiple concurrent requests
      const requests = tokens.map(token => 
        request(server)
          .get('/api/users/me')
          .set('Authorization', `Bearer ${token}`)
      );

      const results = await Promise.all(requests);
      
      // All requests should succeed
      results.forEach(result => {
        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
      });
    });

    it('should handle pagination with large datasets', async () => {
      const adminToken = generateTestToken(TEST_USERS.SUPER_ADMIN.id, 'admin');

      // Test pagination with large page sizes
      const response = await request(server)
        .get('/api/admin/users?page=1&limit=100')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.limit).toBe(100);
      
      // Response time should be reasonable (less than 2 seconds)
      // This is more of a benchmark than a strict test
      expect(response.header['x-response-time']).toBeDefined();
    });
  });
});