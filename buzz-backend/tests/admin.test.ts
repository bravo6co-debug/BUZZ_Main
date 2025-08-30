import request from 'supertest';
import { Express } from 'express';
import { getTestDb, TEST_USERS, generateTestToken } from './setup';
import app from '../src/app';

describe('Admin Endpoints', () => {
  let server: Express;

  beforeAll(() => {
    server = app;
  });

  describe('Authentication & Authorization', () => {
    it('should allow super admin access to all endpoints', async () => {
      const token = generateTestToken(TEST_USERS.SUPER_ADMIN.id, 'admin');

      const response = await request(server)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should restrict access based on admin roles', async () => {
      const token = generateTestToken(TEST_USERS.CONTENT_MANAGER.id, 'admin');

      // Content manager should NOT access user management
      const response = await request(server)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should reject non-admin users', async () => {
      const token = generateTestToken(TEST_USERS.TEST_USER_1.id, 'user');

      const response = await request(server)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error.code).toBe('ADMIN_ACCESS_REQUIRED');
    });
  });

  describe('GET /api/admin/dashboard', () => {
    it('should get admin dashboard overview', async () => {
      const token = generateTestToken(TEST_USERS.SUPER_ADMIN.id, 'admin');

      const response = await request(server)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.totalUsers).toBeDefined();
      expect(response.body.data.stats.totalBusinesses).toBeDefined();
      expect(response.body.data.stats.pendingApplications).toBeDefined();
      expect(response.body.data.stats.monthlyRevenue).toBeDefined();
      expect(response.body.data.recentActivities).toBeDefined();
      expect(response.body.data.budgetStatus).toBeDefined();
    });

    it('should include budget alerts', async () => {
      const token = generateTestToken(TEST_USERS.SUPER_ADMIN.id, 'admin');

      const response = await request(server)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.budgetAlerts).toBeDefined();
      expect(Array.isArray(response.body.data.budgetAlerts)).toBe(true);
    });
  });

  describe('User Management', () => {
    describe('GET /api/admin/users', () => {
      it('should get paginated user list', async () => {
        const token = generateTestToken(TEST_USERS.ADMIN.id, 'admin');

        const response = await request(server)
          .get('/api/admin/users?page=1&limit=10')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.users)).toBe(true);
        expect(response.body.data.pagination).toBeDefined();
        expect(response.body.data.pagination.page).toBe(1);
        expect(response.body.data.pagination.limit).toBe(10);
      });

      it('should filter users by role', async () => {
        const token = generateTestToken(TEST_USERS.ADMIN.id, 'admin');

        const response = await request(server)
          .get('/api/admin/users?role=business')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.users.forEach((user: any) => {
          expect(user.role).toBe('business');
        });
      });

      it('should search users by email or name', async () => {
        const token = generateTestToken(TEST_USERS.ADMIN.id, 'admin');

        const response = await request(server)
          .get('/api/admin/users?search=testuser1')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.users.length).toBeGreaterThan(0);
      });
    });

    describe('GET /api/admin/users/:id', () => {
      it('should get detailed user information', async () => {
        const token = generateTestToken(TEST_USERS.ADMIN.id, 'admin');

        const response = await request(server)
          .get(`/api/admin/users/${TEST_USERS.TEST_USER_1.id}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.id).toBe(TEST_USERS.TEST_USER_1.id);
        expect(response.body.data.profile).toBeDefined();
        expect(response.body.data.mileage).toBeDefined();
        expect(response.body.data.coupons).toBeDefined();
        expect(response.body.data.referralStats).toBeDefined();
        expect(response.body.data.activityLog).toBeDefined();
      });
    });

    describe('PUT /api/admin/users/:id', () => {
      it('should update user information', async () => {
        const token = generateTestToken(TEST_USERS.ADMIN.id, 'admin');
        const updateData = {
          isActive: false,
          adminNote: '테스트 계정 비활성화'
        };

        const response = await request(server)
          .put(`/api/admin/users/${TEST_USERS.TEST_USER_2.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.isActive).toBe(false);
      });

      it('should log admin action in audit trail', async () => {
        const token = generateTestToken(TEST_USERS.ADMIN.id, 'admin');
        const db = getTestDb();

        await request(server)
          .put(`/api/admin/users/${TEST_USERS.TEST_USER_2.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ isActive: true })
          .expect(200);

        // Check audit log was created
        const auditLog = await db('audit_logs')
          .where('user_id', TEST_USERS.ADMIN.id)
          .where('entity_type', 'user')
          .where('entity_id', TEST_USERS.TEST_USER_2.id)
          .orderBy('created_at', 'desc')
          .first();

        expect(auditLog).toBeDefined();
        expect(auditLog.action).toBe('update_user');
      });
    });

    describe('POST /api/admin/users/:id/mileage', () => {
      it('should adjust user mileage balance', async () => {
        const token = generateTestToken(TEST_USERS.ADMIN.id, 'admin');
        const adjustmentData = {
          amount: 1000,
          type: 'earn',
          description: '관리자 추가 지급',
          reason: 'customer_service_compensation'
        };

        const response = await request(server)
          .post(`/api/admin/users/${TEST_USERS.TEST_USER_1.id}/mileage`)
          .set('Authorization', `Bearer ${token}`)
          .send(adjustmentData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.transaction.amount).toBe(1000);
        expect(response.body.data.transaction.type).toBe('earn');
        expect(response.body.data.newBalance).toBeDefined();
      });

      it('should validate adjustment amount', async () => {
        const token = generateTestToken(TEST_USERS.ADMIN.id, 'admin');
        const adjustmentData = {
          amount: -999999, // Excessive negative amount
          type: 'use',
          description: '잘못된 조정'
        };

        const response = await request(server)
          .post(`/api/admin/users/${TEST_USERS.TEST_USER_1.id}/mileage`)
          .set('Authorization', `Bearer ${token}`)
          .send(adjustmentData)
          .expect(400);

        expect(response.body.error.code).toBe('INVALID_ADJUSTMENT_AMOUNT');
      });
    });
  });

  describe('Business Management', () => {
    describe('GET /api/admin/business/applications', () => {
      it('should get pending business applications', async () => {
        const token = generateTestToken(TEST_USERS.BUSINESS_MANAGER.id, 'admin');

        const response = await request(server)
          .get('/api/admin/business/applications?status=pending')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.applications)).toBe(true);
        response.body.data.applications.forEach((app: any) => {
          expect(app.status).toBe('pending');
        });
      });
    });

    describe('PUT /api/admin/business/applications/:id/approve', () => {
      it('should approve business application', async () => {
        const token = generateTestToken(TEST_USERS.BUSINESS_MANAGER.id, 'admin');
        const db = getTestDb();
        
        // Create a pending application
        const pendingApp = await db('business_applications').insert({
          email: 'approve-test@example.com',
          password_hash: 'hashedpassword123',
          business_info: {
            name: '승인 테스트 업체',
            registrationNumber: '123-45-67890',
            category: 'restaurant',
            address: '부산시 테스트구 승인로 123'
          },
          status: 'pending'
        }).returning('*');

        const response = await request(server)
          .put(`/api/admin/business/applications/${pendingApp[0].id}/approve`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            adminNote: '모든 서류가 완벽합니다.'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.application.status).toBe('approved');
        expect(response.body.data.user).toBeDefined();
        expect(response.body.data.business).toBeDefined();
      });
    });

    describe('PUT /api/admin/business/applications/:id/reject', () => {
      it('should reject business application', async () => {
        const token = generateTestToken(TEST_USERS.BUSINESS_MANAGER.id, 'admin');
        const db = getTestDb();
        
        const pendingApp = await db('business_applications').insert({
          email: 'reject-test@example.com',
          password_hash: 'hashedpassword123',
          business_info: {
            name: '거절 테스트 업체',
            registrationNumber: '999-88-77777',
            category: 'cafe'
          },
          status: 'pending'
        }).returning('*');

        const response = await request(server)
          .put(`/api/admin/business/applications/${pendingApp[0].id}/reject`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            rejectionReason: '사업자등록증이 유효하지 않습니다.',
            adminNote: '서류 재제출 필요'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.application.status).toBe('rejected');
        expect(response.body.data.application.rejectionReason).toBeDefined();
      });

      it('should require rejection reason', async () => {
        const token = generateTestToken(TEST_USERS.BUSINESS_MANAGER.id, 'admin');
        
        const response = await request(server)
          .put(`/api/admin/business/applications/some-id/reject`)
          .set('Authorization', `Bearer ${token}`)
          .send({})
          .expect(400);

        expect(response.body.error.details).toContain('rejectionReason');
      });
    });

    describe('GET /api/admin/businesses', () => {
      it('should get businesses with filters', async () => {
        const token = generateTestToken(TEST_USERS.BUSINESS_MANAGER.id, 'admin');

        const response = await request(server)
          .get('/api/admin/businesses?status=approved&category=restaurant')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.businesses)).toBe(true);
        response.body.data.businesses.forEach((business: any) => {
          expect(business.status).toBe('approved');
          expect(business.category).toBe('restaurant');
        });
      });
    });

    describe('PUT /api/admin/businesses/:id/suspend', () => {
      it('should suspend business', async () => {
        const token = generateTestToken(TEST_USERS.BUSINESS_MANAGER.id, 'admin');
        const suspensionData = {
          reason: '고객 신고 다수 접수',
          duration: 30 // days
        };

        const response = await request(server)
          .put(`/api/admin/businesses/${TEST_USERS.BUSINESS_USER_1.id}/suspend`)
          .set('Authorization', `Bearer ${token}`)
          .send(suspensionData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.business.status).toBe('suspended');
        expect(response.body.data.business.suspensionReason).toBe(suspensionData.reason);
      });
    });
  });

  describe('Budget Management', () => {
    describe('GET /api/admin/budget', () => {
      it('should get current budget status', async () => {
        const token = generateTestToken(TEST_USERS.SUPER_ADMIN.id, 'admin');

        const response = await request(server)
          .get('/api/admin/budget')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.currentMonth).toBeDefined();
        expect(response.body.data.budget).toBeDefined();
        expect(response.body.data.execution).toBeDefined();
        expect(response.body.data.alerts).toBeDefined();
        expect(response.body.data.projections).toBeDefined();
      });
    });

    describe('POST /api/admin/budget', () => {
      it('should set monthly budget', async () => {
        const token = generateTestToken(TEST_USERS.SUPER_ADMIN.id, 'admin');
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const yearMonth = nextMonth.toISOString().substring(0, 7);

        const budgetData = {
          yearMonth,
          totalBudget: 15000000,
          referralBudget: 4000000,
          couponBudget: 6000000,
          eventBudget: 3000000,
          settlementBudget: 2000000
        };

        const response = await request(server)
          .post('/api/admin/budget')
          .set('Authorization', `Bearer ${token}`)
          .send(budgetData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.budget.yearMonth).toBe(yearMonth);
        expect(response.body.data.budget.totalBudget).toBe(15000000);
      });

      it('should validate budget allocation', async () => {
        const token = generateTestToken(TEST_USERS.SUPER_ADMIN.id, 'admin');
        const budgetData = {
          yearMonth: '2024-06',
          totalBudget: 1000000,
          referralBudget: 500000,
          couponBudget: 400000,
          eventBudget: 300000, // Total exceeds totalBudget
          settlementBudget: 200000
        };

        const response = await request(server)
          .post('/api/admin/budget')
          .set('Authorization', `Bearer ${token}`)
          .send(budgetData)
          .expect(400);

        expect(response.body.error.code).toBe('BUDGET_ALLOCATION_EXCEEDED');
      });
    });

    describe('GET /api/admin/budget/controls', () => {
      it('should get budget control rules', async () => {
        const token = generateTestToken(TEST_USERS.SUPER_ADMIN.id, 'admin');

        const response = await request(server)
          .get('/api/admin/budget/controls')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.controls)).toBe(true);
        response.body.data.controls.forEach((control: any) => {
          expect(control.controlType).toBeDefined();
          expect(control.thresholdPercentage).toBeDefined();
          expect(control.action).toBeDefined();
        });
      });
    });

    describe('PUT /api/admin/budget/controls/:id', () => {
      it('should update budget control rule', async () => {
        const token = generateTestToken(TEST_USERS.SUPER_ADMIN.id, 'admin');
        const db = getTestDb();
        
        const control = await db('budget_controls').where('control_type', 'budget_warning').first();
        const updateData = {
          thresholdPercentage: 75, // Changed from 70 to 75
          actionParams: {
            level: 'warning',
            channels: ['email', 'sms', 'slack']
          }
        };

        const response = await request(server)
          .put(`/api/admin/budget/controls/${control.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.control.thresholdPercentage).toBe(75);
      });
    });
  });

  describe('Settlement Management', () => {
    describe('GET /api/admin/settlements', () => {
      it('should get settlement requests', async () => {
        const token = generateTestToken(TEST_USERS.ADMIN.id, 'admin');

        const response = await request(server)
          .get('/api/admin/settlements')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.settlements)).toBe(true);
        expect(response.body.data.summary).toBeDefined();
      });

      it('should filter by settlement status', async () => {
        const token = generateTestToken(TEST_USERS.ADMIN.id, 'admin');

        const response = await request(server)
          .get('/api/admin/settlements?status=pending')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.settlements.forEach((settlement: any) => {
          expect(settlement.status).toBe('pending');
        });
      });
    });

    describe('PUT /api/admin/settlements/:id/approve', () => {
      it('should approve settlement request', async () => {
        const token = generateTestToken(TEST_USERS.ADMIN.id, 'admin');
        const db = getTestDb();
        
        const settlement = await db('settlement_requests').insert({
          business_id: TEST_USERS.BUSINESS_USER_1.id,
          settlement_date: new Date().toISOString().split('T')[0],
          total_amount: 50000,
          bank_name: '국민은행',
          bank_account: '123-456-789',
          status: 'pending'
        }).returning('*');

        const response = await request(server)
          .put(`/api/admin/settlements/${settlement[0].id}/approve`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            adminNote: '정산 내역 확인 완료'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.settlement.status).toBe('approved');
      });
    });

    describe('PUT /api/admin/settlements/:id/paid', () => {
      it('should mark settlement as paid', async () => {
        const token = generateTestToken(TEST_USERS.ADMIN.id, 'admin');
        const db = getTestDb();
        
        // First create and approve a settlement
        const settlement = await db('settlement_requests').insert({
          business_id: TEST_USERS.BUSINESS_USER_1.id,
          settlement_date: new Date().toISOString().split('T')[0],
          total_amount: 30000,
          bank_name: '신한은행',
          bank_account: '987-654-321',
          status: 'approved',
          approved_at: db.fn.now(),
          approved_by: TEST_USERS.ADMIN.id
        }).returning('*');

        const response = await request(server)
          .put(`/api/admin/settlements/${settlement[0].id}/paid`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            transactionId: 'TXN20240101001',
            adminNote: '계좌이체 완료'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.settlement.status).toBe('paid');
        expect(response.body.data.settlement.paidAt).toBeDefined();
      });
    });
  });

  describe('Analytics & Reports', () => {
    describe('GET /api/admin/analytics/overview', () => {
      it('should get analytics overview', async () => {
        const token = generateTestToken(TEST_USERS.SUPER_ADMIN.id, 'admin');

        const response = await request(server)
          .get('/api/admin/analytics/overview')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.userMetrics).toBeDefined();
        expect(response.body.data.businessMetrics).toBeDefined();
        expect(response.body.data.financialMetrics).toBeDefined();
        expect(response.body.data.growthTrends).toBeDefined();
      });

      it('should support date range filtering', async () => {
        const token = generateTestToken(TEST_USERS.SUPER_ADMIN.id, 'admin');
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

        const response = await request(server)
          .get(`/api/admin/analytics/overview?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.data.dateRange.startDate).toBe(startDate.toISOString().split('T')[0]);
        expect(response.body.data.dateRange.endDate).toBe(endDate.toISOString().split('T')[0]);
      });
    });

    describe('POST /api/admin/reports/generate', () => {
      it('should generate custom report', async () => {
        const token = generateTestToken(TEST_USERS.SUPER_ADMIN.id, 'admin');
        const reportRequest = {
          reportType: 'user_activity',
          dateRange: {
            startDate: '2024-01-01',
            endDate: '2024-01-31'
          },
          filters: {
            userRole: 'user',
            minMileage: 1000
          },
          format: 'csv'
        };

        const response = await request(server)
          .post('/api/admin/reports/generate')
          .set('Authorization', `Bearer ${token}`)
          .send(reportRequest)
          .expect(202);

        expect(response.body.success).toBe(true);
        expect(response.body.data.reportId).toBeDefined();
        expect(response.body.data.status).toBe('processing');
        expect(response.body.data.estimatedCompletion).toBeDefined();
      });
    });
  });

  describe('System Management', () => {
    describe('GET /api/admin/system/settings', () => {
      it('should get system settings', async () => {
        const token = generateTestToken(TEST_USERS.SUPER_ADMIN.id, 'admin');

        const response = await request(server)
          .get('/api/admin/system/settings')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.settings).toBeDefined();
        expect(Array.isArray(response.body.data.settings)).toBe(true);
      });

      it('should filter settings by category', async () => {
        const token = generateTestToken(TEST_USERS.SUPER_ADMIN.id, 'admin');

        const response = await request(server)
          .get('/api/admin/system/settings?category=referral')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.settings.forEach((setting: any) => {
          expect(setting.category).toBe('referral');
        });
      });
    });

    describe('PUT /api/admin/system/settings/:key', () => {
      it('should update system setting', async () => {
        const token = generateTestToken(TEST_USERS.SUPER_ADMIN.id, 'admin');
        const updateData = {
          value: 600, // Updated from 500
          description: '업데이트된 리퍼럴 보상 금액'
        };

        const response = await request(server)
          .put('/api/admin/system/settings/referral_reward_amount')
          .set('Authorization', `Bearer ${token}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.setting.value).toBe(600);
      });

      it('should validate setting value type', async () => {
        const token = generateTestToken(TEST_USERS.SUPER_ADMIN.id, 'admin');
        const updateData = {
          value: 'invalid_number' // Should be number
        };

        const response = await request(server)
          .put('/api/admin/system/settings/referral_reward_amount')
          .set('Authorization', `Bearer ${token}`)
          .send(updateData)
          .expect(400);

        expect(response.body.error.code).toBe('INVALID_SETTING_VALUE_TYPE');
      });
    });

    describe('GET /api/admin/audit-logs', () => {
      it('should get audit logs with pagination', async () => {
        const token = generateTestToken(TEST_USERS.SUPER_ADMIN.id, 'admin');

        const response = await request(server)
          .get('/api/admin/audit-logs?page=1&limit=20')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.logs)).toBe(true);
        expect(response.body.data.pagination).toBeDefined();
      });

      it('should filter audit logs by user', async () => {
        const token = generateTestToken(TEST_USERS.SUPER_ADMIN.id, 'admin');

        const response = await request(server)
          .get(`/api/admin/audit-logs?userId=${TEST_USERS.ADMIN.id}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.logs.forEach((log: any) => {
          expect(log.userId).toBe(TEST_USERS.ADMIN.id);
        });
      });

      it('should filter audit logs by action', async () => {
        const token = generateTestToken(TEST_USERS.SUPER_ADMIN.id, 'admin');

        const response = await request(server)
          .get('/api/admin/audit-logs?action=update_user')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.logs.forEach((log: any) => {
          expect(log.action).toBe('update_user');
        });
      });
    });
  });
});