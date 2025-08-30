# Buzz Platform Complete API Specification
> Version: 2.1.0  
> Date: 2025-08-30  
> Description: Admin 전체 기능 지원을 위한 완전한 API 명세서
> 구현 상태: ✅ 대부분 구현 완료 (Admin Coupon Management 포함)

## 📌 API 개요

### Base URLs
- **Production**: `https://api.buzz-platform.kr`
- **Staging**: `https://staging-api.buzz-platform.kr`
- **Development**: `http://localhost:3000`

### Authentication
- **Type**: Bearer Token (JWT)
- **Header**: `Authorization: Bearer {token}`
- **Token Expiry**: 24 hours
- **Refresh Token Expiry**: 7 days

### Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "timestamp": "2025-08-30T10:00:00Z"
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": {},
    "timestamp": "2025-08-30T10:00:00Z"
  }
}
```

---

## 🔐 1. Authentication & Authorization APIs

### 1.1 Buzz 소셜 로그인 (Google)
```http
POST /api/auth/social/google
```

**Request Body:**
```json
{
  "idToken": "google_id_token",
  "additionalInfo": {
    "phone": "010-1234-5678",
    "university": "부경대학교",
    "referralCode": "BUZZ-ABC123",
    "marketingAgree": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "홍길동",
      "role": "user",
      "referralCode": "BUZZ-XYZ789"
    },
    "tokens": {
      "accessToken": "jwt_token",
      "refreshToken": "refresh_token",
      "expiresIn": 86400
    },
    "rewards": {
      "signupBonus": {
        "mileage": 5000,
        "coupon": {
          "id": "coupon_id",
          "amount": 5000,
          "expiresAt": "2025-09-30"
        }
      }
    }
  }
}
```

### 1.2 Buzz 소셜 로그인 (Kakao)
```http
POST /api/auth/social/kakao
```

**Request Body:**
```json
{
  "accessToken": "kakao_access_token",
  "additionalInfo": {
    "phone": "010-1234-5678",
    "university": "부경대학교",
    "referralCode": "BUZZ-ABC123",
    "marketingAgree": true
  }
}
```

**Response:** (소셜 로그인 공통)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "홍길동",
      "role": "user",
      "authProvider": "google",
      "referralCode": "BUZZ-XYZ789"
    },
    "tokens": {
      "accessToken": "jwt_token",
      "refreshToken": "refresh_token",
      "expiresIn": 86400
    },
    "rewards": {
      "signupBonus": {
        "mileage": 5000,
        "coupon": {
          "id": "coupon_id",
          "amount": 5000,
          "expiresAt": "2025-09-30"
        }
      }
    }
  }
}
```

### 1.3 Buzz-Biz 가입 신청
```http
POST /api/business/apply
```

**Request Body:**
```json
{
  "email": "business@example.com",
  "password": "SecurePass123!",
  "businessInfo": {
    "name": "카페 버즈",
    "registrationNumber": "123-45-67890",
    "category": "cafe",
    "address": "부산 남구 대연동",
    "phone": "051-123-4567",
    "bankAccount": {
      "bankName": "우리은행",
      "accountNumber": "1234567890",
      "accountHolder": "김사장"
    }
  },
  "documents": ["business_license.pdf", "bank_statement.pdf"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "applicationId": "uuid",
    "status": "pending",
    "message": "가입 신청이 접수되었습니다. 관리자 승인 후 이메일로 안내드립니다."
  }
}
```

### 1.4 Buzz-Biz/Admin 로그인 (이메일)
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "business@example.com",
  "password": "SecurePass123!",
  "type": "business" // or "admin"
}
```

### 1.5 토큰 갱신
```http
POST /api/auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

### 1.6 Admin 계정 생성 (최고관리자 전용)
```http
POST /api/admin/users/create
```

**Request Headers:**
```
Authorization: Bearer {super_admin_token}
```

**Request Body:**
```json
{
  "email": "admin@buzz-platform.kr",
  "name": "김관리",
  "role": "admin", // "admin" | "business_manager" | "content_manager"
  "temporaryPassword": "Temp@Pass123",
  "requirePasswordChange": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "admin@buzz-platform.kr",
    "role": "admin",
    "temporaryPassword": "Temp@Pass123",
    "message": "계정이 생성되었습니다. 임시 비밀번호는 24시간 내 변경해야 합니다."
  }
}
```

### 1.7 권한 확인 (Admin)
```http
GET /api/auth/permissions
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "role": "admin",
    "permissions": {
      "budget": ["view", "edit", "delete"],
      "users": ["view", "edit"],
      "settlements": ["view", "approve"]
    }
  }
}
```

---

## 🎯 2. Referral System APIs

### 2.1 리퍼럴 방문 추적
```http
GET /api/referral/track/:code
```

**Query Parameters:**
- `utm_source`: 유입 소스
- `utm_medium`: 유입 매체
- `utm_campaign`: 캠페인명

**Response:**
```json
{
  "success": true,
  "data": {
    "visitId": "uuid",
    "referralCode": "BUZZ-ABC123",
    "visitorCoupon": {
      "amount": 3000,
      "expiresIn": 3600
    }
  }
}
```

### 2.2 리퍼럴 전환 처리
```http
POST /api/referral/convert
```

**Request Body:**
```json
{
  "visitId": "uuid",
  "userId": "uuid"
}
```

### 2.3 내 리퍼럴 통계
```http
GET /api/referral/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "referralCode": "BUZZ-ABC123",
    "stats": {
      "totalVisits": 156,
      "totalConversions": 23,
      "conversionRate": 14.74,
      "totalRewards": 11500,
      "monthlyRank": 3
    },
    "recentActivity": [
      {
        "date": "2025-08-30",
        "visits": 5,
        "conversions": 2,
        "rewards": 1000
      }
    ]
  }
}
```

### 2.4 리퍼럴 분석 (Admin)
```http
GET /api/admin/referral/analytics
```

**Query Parameters:**
- `period`: daily | weekly | monthly
- `startDate`: 2025-08-01
- `endDate`: 2025-08-30

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalCodes": 1247,
      "totalVisits": 8542,
      "totalConversions": 1456,
      "averageConversionRate": 17.04
    },
    "topPerformers": [
      {
        "userId": "uuid",
        "name": "김○○",
        "code": "BUZZ-ABC123",
        "conversions": 23,
        "rewards": 11500
      }
    ],
    "suspiciousActivity": [
      {
        "code": "BUZZ-XYZ789",
        "reason": "abnormal_conversion_rate",
        "details": {
          "conversionRate": 89,
          "averageRate": 17
        }
      }
    ]
  }
}
```

---

## 🏪 3. Business Management APIs

### 3.1 매장 목록 조회
```http
GET /api/businesses
```

**Query Parameters:**
- `category`: cafe | restaurant | shop
- `status`: approved | pending
- `sort`: rating | distance | recent
- `lat`: 35.1234
- `lng`: 129.1234
- `page`: 1
- `limit`: 20

### 3.2 매장 등록 신청
```http
POST /api/business/register
```

**Request Body:**
```json
{
  "businessName": "카페 버즈",
  "businessNumber": "123-45-67890",
  "category": "cafe",
  "description": "편안한 분위기의 카페",
  "address": "부산 남구 대연동",
  "phone": "051-123-4567",
  "businessHours": {
    "mon": "08:00-22:00",
    "tue": "08:00-22:00"
  },
  "images": ["image1.jpg", "image2.jpg"]
}
```

### 3.3 Buzz-Biz 가입 신청 목록 (Admin)
```http
GET /api/admin/business-applications
```

**Query Parameters:**
- `status`: pending | approved | rejected
- `page`: 1
- `limit`: 20

**Response:**
```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "uuid",
        "email": "business@example.com",
        "businessInfo": {
          "name": "카페 버즈",
          "registrationNumber": "123-45-67890",
          "category": "cafe"
        },
        "status": "pending",
        "createdAt": "2025-08-30T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 3,
      "page": 1,
      "limit": 20
    }
  }
}
```

### 3.4 Buzz-Biz 가입 승인 (Admin)
```http
POST /api/admin/business-applications/:id/approve
```

**Request Body:**
```json
{
  "approved": true,
  "businessName": "카페 버즈",
  "category": "cafe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "businessId": "uuid",
    "email": "business@example.com",
    "message": "매장 가입이 승인되었습니다."
  }
}
```

### 3.5 Buzz-Biz 가입 반려 (Admin)
```http
POST /api/admin/business-applications/:id/reject
```

**Request Body:**
```json
{
  "reason": "사업자등록증 확인 불가"
}
```

### 3.6 매장 노출 공평성 관리 (Admin)
```http
GET /api/admin/businesses/exposure-fairness
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalBusinesses": 23,
      "averageExposure": 1234,
      "minExposure": 1180,
      "maxExposure": 1290,
      "fairnessScore": 95.2
    },
    "businesses": [
      {
        "id": "uuid",
        "name": "카페 버즈",
        "exposureCount": 1234,
        "rotationSlot": 3,
        "lastMainExposure": "2025-08-30T08:00:00Z"
      }
    ],
    "rotationSettings": {
      "interval": 14400,
      "guaranteedMinimum": 1000
    }
  }
}
```

### 3.7 매장 노출 설정 (Admin)
```http
PUT /api/admin/businesses/exposure-settings
```

**Request Body:**
```json
{
  "rotationInterval": 14400,
  "guaranteedMinimum": 1000,
  "categoryRotation": true,
  "timeBasedOptimization": true
}
```

---

## 💰 4. Budget Management APIs (Admin)

### 4.1 예산 현황 조회
```http
GET /api/admin/budget/current
```

**Response:**
```json
{
  "success": true,
  "data": {
    "yearMonth": "2025-08",
    "totalBudget": 50000000,
    "executed": 23456789,
    "remaining": 26543211,
    "executionRate": 46.9,
    "categories": {
      "referral": {
        "budget": 15000000,
        "executed": 8234500,
        "rate": 54.9
      },
      "coupon": {
        "budget": 10000000,
        "executed": 6122289,
        "rate": 61.2
      },
      "event": {
        "budget": 15000000,
        "executed": 5100000,
        "rate": 34.0
      },
      "settlement": {
        "budget": 10000000,
        "executed": 4000000,
        "rate": 40.0
      }
    },
    "alerts": [
      {
        "level": "warning",
        "message": "리퍼럴 예산 70% 소진 임박",
        "threshold": 70
      }
    ]
  }
}
```

### 4.2 예산 정책 설정
```http
POST /api/admin/budget/settings
```

**Request Body:**
```json
{
  "yearMonth": "2025-09",
  "totalBudget": 50000000,
  "categories": {
    "referral": 15000000,
    "coupon": 10000000,
    "event": 15000000,
    "settlement": 10000000
  },
  "controls": {
    "dailyLimit": 1666666,
    "warningThreshold": 70,
    "dangerThreshold": 85,
    "criticalThreshold": 95
  }
}
```

### 4.3 긴급 예산 제어
```http
POST /api/admin/budget/emergency/control
```

**Request Body:**
```json
{
  "action": "limit_services",
  "services": ["referral", "new_coupon"],
  "reason": "예산 95% 초과",
  "duration": 3600
}
```

### 4.4 예산 집행 내역
```http
GET /api/admin/budget/executions
```

**Query Parameters:**
- `startDate`: 2025-08-01
- `endDate`: 2025-08-30
- `category`: referral | coupon | event | settlement
- `page`: 1
- `limit`: 50

---

## 🎫 5. Coupon System APIs

### 5.1 내 쿠폰 목록
```http
GET /api/coupons/my
```

**Query Parameters:**
- `status`: active | used | expired
- `sort`: expiry | value

**Response:**
```json
{
  "success": true,
  "data": {
    "coupons": [
      {
        "id": "uuid",
        "name": "신규가입 환영 쿠폰",
        "type": "signup",
        "discountType": "fixed",
        "discountValue": 5000,
        "expiresAt": "2025-09-30",
        "status": "active",
        "qrCode": "COUPON-ABC123"
      }
    ],
    "summary": {
      "active": 3,
      "totalValue": 11000
    }
  }
}
```

### 5.2 쿠폰 QR 생성
```http
POST /api/coupons/:id/generate-qr
```

**Response:**
```json
{
  "success": true,
  "data": {
    "qrCode": "COUPON-ABC123-1693468800",
    "expiresIn": 300,
    "couponInfo": {
      "name": "신규가입 환영 쿠폰",
      "value": 5000
    }
  }
}
```

### 5.3 쿠폰 검증 (Business)
```http
POST /api/business/coupons/verify
```

**Request Body:**
```json
{
  "qrCode": "COUPON-ABC123-1693468800"
}
```

### 5.4 쿠폰 사용 처리 (Business)
```http
POST /api/business/coupons/use
```

**Request Body:**
```json
{
  "qrCode": "COUPON-ABC123-1693468800",
  "purchaseAmount": 15000
}
```

---

## 🎛️ 5.5 Admin Coupon Management APIs

### 5.5.1 어드민 쿠폰 목록 조회
```http
GET /api/admin/coupons
```

**Query Parameters:**
- `status`: active | inactive
- `type`: basic | signup | referral | event
- `search`: 검색어 (쿠폰명)
- `page`: 1
- `limit`: 20

**Response:**
```json
{
  "success": true,
  "data": {
    "coupons": [
      {
        "id": "uuid",
        "name": "신규가입 환영 쿠폰",
        "type": "signup", 
        "discount_type": "fixed",
        "discount_value": 5000,
        "status": "active",
        "total_quantity": 1000,
        "issued_count": 450,
        "used_count": 320,
        "created_at": "2025-08-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

### 5.5.2 쿠폰 통계 조회
```http
GET /api/admin/coupons/statistics
```

**Query Parameters:**
- `timeframe`: week | month | year

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_coupons": 25,
      "active_coupons": 20,
      "total_issued": 12500,
      "total_used": 8200,
      "usage_rate": "65.6",
      "total_discount_amount": 45000000,
      "period_issued": 2100,
      "period_discount": 8500000
    },
    "typeDistribution": [
      {
        "type": "signup",
        "coupon_count": 5,
        "issued_count": 4500,
        "used_count": 3200
      }
    ],
    "topCoupons": [
      {
        "id": "uuid",
        "name": "신규가입 환영 쿠폰",
        "type": "signup",
        "discount_type": "fixed",
        "discount_value": 5000,
        "used_count": 3200,
        "usage_rate": "71.1"
      }
    ],
    "dailyTrend": [
      {
        "date": "2025-08-25",
        "issued": 120,
        "used": 85
      }
    ],
    "generatedAt": "2025-08-30T10:00:00Z"
  }
}
```

### 5.5.3 새 쿠폰 생성
```http
POST /api/admin/coupons
```

**Request Body:**
```json
{
  "name": "추석 이벤트 쿠폰",
  "type": "event",
  "discount_type": "fixed",
  "discount_value": 10000,
  "min_purchase_amount": 30000,
  "max_discount_amount": 10000,
  "valid_from": "2025-09-01T00:00:00Z",
  "valid_until": "2025-09-30T23:59:59Z",
  "total_quantity": 500,
  "applicable_businesses": ["business_id_1", "business_id_2"]
}
```

### 5.5.4 쿠폰 일괄 발급
```http
POST /api/admin/coupons/issue
```

**Request Body:**
```json
{
  "couponId": "coupon_uuid",
  "userFilters": {
    "role": "user",
    "isActive": true,
    "university": "부경대학교",
    "registeredAfter": "2025-08-01T00:00:00Z"
  },
  "expirationDays": 30
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "issuedCount": 1250,
    "targetUsers": 1250,
    "jobId": "bulk_issue_job_uuid",
    "estimatedCompletionTime": "2025-08-30T10:05:00Z"
  }
}
```

### 5.5.5 쿠폰 상세 조회
```http
GET /api/admin/coupons/:id
```

### 5.5.6 쿠폰 수정
```http
PUT /api/admin/coupons/:id
```

### 5.5.7 쿠폰 삭제/비활성화
```http
DELETE /api/admin/coupons/:id
```

### 5.5.8 쿠폰 사용 내역 조회
```http
GET /api/admin/coupons/:id/usage
```

**Query Parameters:**
- `status`: active | used | expired
- `page`: 1
- `limit`: 20

---

## 💳 6. Mileage System APIs

### 6.1 마일리지 잔액 조회
```http
GET /api/mileage/balance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 15000,
    "totalEarned": 25000,
    "totalUsed": 10000,
    "expiringIn30Days": 3000
  }
}
```

### 6.2 마일리지 거래 내역
```http
GET /api/mileage/transactions
```

**Query Parameters:**
- `type`: earn | use | expire
- `startDate`: 2025-08-01
- `endDate`: 2025-08-30
- `page`: 1
- `limit`: 20

### 6.3 마일리지 QR 생성
```http
POST /api/mileage/generate-qr
```

**Response:**
```json
{
  "success": true,
  "data": {
    "qrCode": "MILEAGE-USER123-1693468800",
    "balance": 15000,
    "expiresIn": 300
  }
}
```

### 6.4 마일리지 사용 (Business)
```http
POST /api/business/mileage/use
```

**Request Body:**
```json
{
  "qrCode": "MILEAGE-USER123-1693468800",
  "amount": 5000
}
```

---

## 📊 7. Settlement APIs

### 7.1 정산 요청 (Business)
```http
POST /api/business/settlements/request
```

**Request Body:**
```json
{
  "settlementDate": "2025-08-30",
  "transactions": {
    "coupon": {
      "count": 8,
      "amount": 13000
    },
    "mileage": {
      "count": 30,
      "amount": 32000
    }
  },
  "totalAmount": 45000,
  "bankInfo": {
    "bankName": "우리은행",
    "accountNumber": "1234567890"
  }
}
```

### 7.2 정산 현황 조회 (Business)
```http
GET /api/business/settlements
```

**Query Parameters:**
- `status`: pending | approved | paid | rejected
- `startDate`: 2025-08-01
- `endDate`: 2025-08-30

### 7.3 정산 승인 (Admin)
```http
POST /api/admin/settlements/:id/approve
```

**Request Body:**
```json
{
  "approved": true,
  "adminNote": "검토 완료, 승인"
}
```

### 7.4 정산 대기 목록 (Admin)
```http
GET /api/admin/settlements/pending
```

**Response:**
```json
{
  "success": true,
  "data": {
    "settlements": [
      {
        "id": "uuid",
        "businessName": "카페 버즈",
        "settlementDate": "2025-08-30",
        "totalAmount": 45000,
        "requestedAt": "2025-08-31T10:00:00Z",
        "details": {
          "coupon": {
            "count": 8,
            "amount": 13000
          },
          "mileage": {
            "count": 30,
            "amount": 32000
          }
        }
      }
    ],
    "summary": {
      "totalPending": 4,
      "totalAmount": 180000
    }
  }
}
```

---

## 📝 8. Content Management APIs

### 8.1 홈화면 설정 조회
```http
GET /api/contents/home-config
```

**Response:**
```json
{
  "success": true,
  "data": {
    "banners": [
      {
        "id": "uuid",
        "imageUrl": "banner1.jpg",
        "link": "/events/christmas",
        "displayOrder": 1
      }
    ],
    "featuredBusinesses": ["uuid1", "uuid2", "uuid3"],
    "categoryOrder": ["cafe", "restaurant", "shop"]
  }
}
```

### 8.2 홈화면 설정 변경 (Admin)
```http
PUT /api/admin/contents/home-config
```

**Request Body:**
```json
{
  "banners": [
    {
      "imageUrl": "new-banner.jpg",
      "link": "/events/new-year",
      "displayOrder": 1,
      "scheduledAt": "2025-09-01T00:00:00Z",
      "expiresAt": "2025-09-30T23:59:59Z"
    }
  ],
  "featuredBusinesses": ["uuid1", "uuid2", "uuid3"],
  "categoryOrder": ["restaurant", "cafe", "shop"]
}
```

### 8.3 지역 추천 컨텐츠 목록
```http
GET /api/contents/regional
```

**Query Parameters:**
- `type`: tourist | photospot | restaurant
- `tags`: 해변,야경
- `featured`: true

### 8.4 지역 추천 컨텐츠 생성 (Admin)
```http
POST /api/admin/contents/regional
```

**Request Body:**
```json
{
  "title": "겨울 남구 야경 명소",
  "contentType": "photospot",
  "description": "겨울밤 남구의 아름다운 야경",
  "contentBody": "상세 내용...",
  "images": ["image1.jpg", "image2.jpg"],
  "tags": ["야경", "포토스팟", "겨울"],
  "isFeatured": true,
  "publishedAt": "2025-09-01T00:00:00Z"
}
```

### 8.5 마케터 교육 컨텐츠 목록
```http
GET /api/contents/marketer
```

**Query Parameters:**
- `type`: education | campaign | tips | success_story
- `level`: beginner | intermediate | advanced

### 8.6 마케터 컨텐츠 생성 (Admin)
```http
POST /api/admin/contents/marketer
```

**Request Body:**
```json
{
  "title": "리퍼럴 마케팅 기초 가이드",
  "contentType": "education",
  "contentBody": "리퍼럴 마케팅의 기초...",
  "videoUrl": "https://youtube.com/watch?v=xxx",
  "targetLevel": "beginner",
  "attachments": [
    {
      "name": "guide.pdf",
      "url": "files/guide.pdf"
    }
  ]
}
```

### 8.7 리뷰/평점 관리 API ✅ 신규 추가

#### 8.7.1 매장 리뷰 목록 조회
```http
GET /api/businesses/:businessId/reviews
```

**Query Parameters:**
- `status`: approved | pending | hidden | reported
- `rating`: 1-5
- `page`: 1
- `limit`: 20
- `sortBy`: created_at | rating | helpful_count

**Response:**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "uuid",
        "userId": "uuid",
        "userName": "김○○",
        "rating": 5,
        "content": "분위기 너무 좋아요! 커피도 맛있어요",
        "images": ["review1.jpg", "review2.jpg"],
        "isVerifiedPurchase": true,
        "status": "approved",
        "helpfulCount": 12,
        "createdAt": "2025-08-30T10:00:00Z"
      }
    ],
    "totalReviews": 847,
    "averageRating": 4.3,
    "ratingDistribution": {
      "5": 423,
      "4": 234,
      "3": 156,
      "2": 28,
      "1": 6
    }
  }
}
```

#### 8.7.2 리뷰 작성
```http
POST /api/businesses/:businessId/reviews
```

**Request Body:**
```json
{
  "rating": 5,
  "content": "정말 맛있어요! 분위기도 좋고 직원분들도 친절해요.",
  "images": ["image1.jpg", "image2.jpg"],
  "visitDate": "2025-08-29"
}
```

#### 8.7.3 전체 리뷰 관리 (Admin)
```http
GET /api/admin/reviews
```

**Query Parameters:**
- `status`: approved | pending | hidden | reported
- `businessId`: uuid
- `rating`: 1-5
- `page`: 1
- `limit`: 50
- `sortBy`: created_at | rating | report_count

**Response:**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "uuid",
        "businessId": "uuid",
        "businessName": "강남 맛집",
        "userId": "uuid", 
        "userName": "김○○",
        "rating": 5,
        "content": "정말 맛있어요!",
        "images": ["review1.jpg"],
        "isVerifiedPurchase": true,
        "status": "pending",
        "reportCount": 0,
        "createdAt": "2025-08-30T10:00:00Z"
      }
    ],
    "stats": {
      "totalReviews": 12847,
      "pendingReviews": 24,
      "reportedReviews": 7,
      "averageRating": 4.3
    }
  }
}
```

#### 8.7.4 리뷰 상태 변경 (Admin)
```http
PUT /api/admin/reviews/:reviewId/status
```

**Request Body:**
```json
{
  "status": "approved", // approved | hidden | deleted
  "reason": "부적절한 내용 포함"
}
```

#### 8.7.5 대량 리뷰 처리 (Admin)
```http
PUT /api/admin/reviews/bulk-action
```

**Request Body:**
```json
{
  "reviewIds": ["uuid1", "uuid2", "uuid3"],
  "action": "approve", // approve | hide | delete
  "reason": "대량 승인 처리"
}
```

---

## 🎪 9. Event Management APIs

### 9.1 이벤트 목록
```http
GET /api/events
```

**Query Parameters:**
- `status`: active | upcoming | ended
- `type`: signup | referral | seasonal

### 9.2 이벤트 참여
```http
POST /api/events/:id/participate
```

**Request Body:**
```json
{
  "agreementTerms": true
}
```

### 9.3 이벤트 생성 (Admin)
```http
POST /api/admin/events
```

**Request Body:**
```json
{
  "title": "크리스마스 특별 이벤트",
  "description": "크리스마스 맞이 특별 할인",
  "eventType": "seasonal",
  "bannerImage": "christmas-banner.jpg",
  "benefitConfig": {
    "type": "coupon",
    "amount": 10000,
    "conditions": {
      "minPurchase": 30000
    }
  },
  "participantLimit": 1000,
  "startsAt": "2025-12-20T00:00:00Z",
  "endsAt": "2025-12-25T23:59:59Z"
}
```

### 9.4 QR 이벤트 관리 (Admin)
```http
POST /api/admin/qr-events
```

**Request Body:**
```json
{
  "name": "12월 연말 대박 이벤트",
  "totalQrCount": 10000,
  "prizeConfig": {
    "prizes": [
      {
        "rank": 1,
        "amount": 100000,
        "quantity": 1
      },
      {
        "rank": 2,
        "amount": 10000,
        "quantity": 10
      }
    ]
  },
  "budgetLimit": 3000000,
  "distributionChannels": {
    "university": 30,
    "tourist": 30,
    "online": 40
  },
  "startsAt": "2025-12-01T00:00:00Z",
  "endsAt": "2025-12-31T23:59:59Z"
}
```

---

## ⚙️ 10. System Management APIs (Admin)

### 10.1 시스템 설정 조회
```http
GET /api/admin/system/settings
```

**Query Parameters:**
- `category`: referral | coupon | mileage | security

**Response:**
```json
{
  "success": true,
  "data": {
    "settings": [
      {
        "key": "referral_reward_amount",
        "value": 500,
        "description": "리퍼럴 보상 금액",
        "category": "referral",
        "dataType": "number"
      }
    ]
  }
}
```

### 10.2 시스템 설정 변경
```http
PUT /api/admin/system/settings
```

**Request Body:**
```json
{
  "settings": [
    {
      "key": "referral_reward_amount",
      "value": 300
    },
    {
      "key": "qr_code_ttl_seconds",
      "value": 600
    }
  ]
}
```

### 10.3 보안 설정 관리
```http
GET /api/admin/security/settings
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rateLimit": {
      "perMinute": 60,
      "perHour": 1000
    },
    "loginAttempt": {
      "maxAttempts": 5,
      "lockoutMinutes": 30
    },
    "ipBlacklist": [
      {
        "ip": "192.168.1.100",
        "reason": "Suspicious activity",
        "blockedUntil": "2025-09-01T00:00:00Z"
      }
    ]
  }
}
```

### 10.4 IP 차단 관리
```http
POST /api/admin/security/ip-blacklist
```

**Request Body:**
```json
{
  "ipAddress": "192.168.1.100",
  "reason": "Bot attack detected",
  "duration": 86400
}
```

### 10.5 관리자 권한 설정
```http
POST /api/admin/permissions/assign
```

**Request Body:**
```json
{
  "userId": "uuid",
  "permissionId": "budget_manager_uuid",
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

---

## 👥 11. User Management APIs (Admin)

### 11.1 회원 목록 조회
```http
GET /api/admin/users
```

**Query Parameters:**
- `role`: user | business | admin
- `status`: active | suspended
- `search`: 검색어
- `page`: 1
- `limit`: 50

### 11.2 회원 상세 정보
```http
GET /api/admin/users/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "홍길동",
      "role": "user",
      "status": "active",
      "createdAt": "2025-01-01T00:00:00Z"
    },
    "profile": {
      "referralCode": "BUZZ-ABC123",
      "referrerId": "uuid",
      "university": "부경대학교"
    },
    "stats": {
      "totalReferrals": 23,
      "totalMileage": 15000,
      "totalCouponsUsed": 5
    }
  }
}
```

### 11.3 회원 상태 변경
```http
PUT /api/admin/users/:id/status
```

**Request Body:**
```json
{
  "status": "suspended",
  "reason": "부정 사용 의심"
}
```

### 11.4 감사 로그 조회
```http
GET /api/admin/audit-logs
```

**Query Parameters:**
- `userId`: uuid
- `action`: login | update | delete
- `entityType`: user | business | settlement
- `startDate`: 2025-08-01
- `endDate`: 2025-08-30

---

## 📊 12. Dashboard & Analytics APIs

### 12.1 관리자 대시보드
```http
GET /api/admin/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 1247,
      "activeUsers": 892,
      "totalBusinesses": 23,
      "activeReferrers": 89
    },
    "budget": {
      "total": 50000000,
      "used": 23456789,
      "remaining": 26543211,
      "executionRate": 46.9
    },
    "todayStats": {
      "newUsers": 45,
      "qrScans": 234,
      "settlements": 12,
      "budgetUsed": 1234567
    },
    "alerts": [
      {
        "type": "budget",
        "level": "warning",
        "message": "리퍼럴 예산 70% 초과"
      }
    ]
  }
}
```

### 12.2 실시간 모니터링
```http
GET /api/admin/realtime
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activeUsers": 89,
    "qrScansPerMinute": 3.4,
    "apiRequestsPerMinute": 45,
    "systemStatus": {
      "api": "healthy",
      "database": "healthy",
      "storage": "healthy"
    },
    "recentActivities": [
      {
        "type": "qr_scan",
        "businessName": "카페 버즈",
        "amount": 5000,
        "timestamp": "2025-08-30T10:00:00Z"
      }
    ]
  }
}
```

### 12.3 월간 리포트
```http
GET /api/admin/reports/monthly
```

**Query Parameters:**
- `yearMonth`: 2025-08

**Response:**
```json
{
  "success": true,
  "data": {
    "yearMonth": "2025-08",
    "kpi": {
      "newUsers": {
        "target": 2000,
        "actual": 2456,
        "achievementRate": 122.8
      },
      "activeReferrers": {
        "target": 100,
        "actual": 89,
        "achievementRate": 89.0
      },
      "businessParticipation": {
        "target": 80,
        "actual": 87,
        "achievementRate": 108.75
      }
    },
    "budgetEfficiency": {
      "costPerUser": 9545,
      "referralROI": 2.3,
      "settlementPerBusiness": 434783
    }
  }
}
```

### 12.4 A/B 테스트 관리
```http
POST /api/admin/ab-tests
```

**Request Body:**
```json
{
  "testName": "홈화면 레이아웃 테스트",
  "testType": "home_layout",
  "variantA": {
    "layout": "grid",
    "cardsPerRow": 2
  },
  "variantB": {
    "layout": "list",
    "showThumbnail": true
  },
  "trafficSplit": 50,
  "startsAt": "2025-09-01T00:00:00Z",
  "endsAt": "2025-09-30T23:59:59Z"
}
```

---

## 🔔 13. Notification APIs

### 13.1 알림 목록
```http
GET /api/notifications
```

**Query Parameters:**
- `isRead`: true | false
- `type`: referral | coupon | event | system

### 13.2 알림 읽음 처리
```http
PUT /api/notifications/:id/read
```

### 13.3 공지사항/팝업 조회
```http
GET /api/announcements
```

**Query Parameters:**
- `type`: notice | popup | banner
- `targetAudience`: all | users | businesses

### 13.4 공지사항 생성 (Admin)
```http
POST /api/admin/announcements
```

**Request Body:**
```json
{
  "type": "popup",
  "title": "시스템 점검 안내",
  "content": "12월 1일 새벽 2시-4시 시스템 점검 예정",
  "targetAudience": "all",
  "priority": 1,
  "buttonText": "확인",
  "startsAt": "2025-11-30T00:00:00Z",
  "endsAt": "2025-12-01T23:59:59Z"
}
```

### 13.5 팝업 배너 생성 (Admin)
```http
POST /api/admin/popup-banners
```

**Request Body:**
```json
{
  "announcementId": "uuid",
  "imageUrl": "https://storage.buzz.com/popup-banner-1.jpg",
  "displayPosition": "center",
  "displayFrequency": "once_per_day",
  "animationType": "fade",
  "autoCloseSeconds": 5,
  "showCloseButton": true,
  "backgroundColor": "#000000",
  "overlayOpacity": 0.5,
  "width": 400,
  "height": 600,
  "borderRadius": 12
}
```

### 13.6 활성 팝업 배너 조회 (Buzz App)
```http
GET /api/popup-banners/active
```

**Response:**
```json
{
  "popupBanners": [
    {
      "id": "uuid",
      "announcement": {
        "title": "특별 이벤트",
        "content": "신규 가입시 5000원 추가 적립!",
        "buttonText": "지금 참여하기",
        "buttonLink": "/events/special"
      },
      "imageUrl": "https://storage.buzz.com/popup-banner-1.jpg",
      "displayPosition": "center",
      "displayFrequency": "once_per_day",
      "animationType": "fade",
      "autoCloseSeconds": 5,
      "showCloseButton": true,
      "backgroundColor": "#000000",
      "overlayOpacity": 0.5,
      "width": 400,
      "height": 600,
      "borderRadius": 12,
      "priority": 1
    }
  ]
}
```

### 13.7 팝업 배너 노출 기록
```http
POST /api/popup-banners/:id/impression
```

**Request Body:**
```json
{
  "action": "view",
  "sessionId": "session-123"
}
```

### 13.8 팝업 배너 수정 (Admin)
```http
PUT /api/admin/popup-banners/:id
```

**Request Body:**
```json
{
  "displayPosition": "fullscreen",
  "autoCloseSeconds": 10,
  "animationType": "zoom"
}
```

### 13.9 팝업 배너 삭제 (Admin)
```http
DELETE /api/admin/popup-banners/:id
```

### 13.10 팝업 배너 통계 조회 (Admin)
```http
GET /api/admin/popup-banners/:id/stats
```

**Response:**
```json
{
  "totalViews": 12543,
  "uniqueViews": 8234,
  "clicks": 2341,
  "clickRate": 18.6,
  "closeRate": 42.3,
  "avgViewDuration": 3.2,
  "dailyStats": [
    {
      "date": "2025-08-30",
      "views": 1234,
      "clicks": 234,
      "uniqueUsers": 823
    }
  ]
}
```

---

## 💬 14. Community APIs

### 14.1 게시글 목록
```http
GET /api/community/posts
```

**Query Parameters:**
- `category`: free | tip | review | qna
- `sort`: recent | popular
- `search`: 검색어

### 14.2 게시글 작성
```http
POST /api/community/posts
```

**Request Body:**
```json
{
  "category": "tip",
  "title": "리퍼럴 마케팅 꿀팁",
  "content": "리퍼럴로 월 10만원 버는 방법...",
  "images": ["image1.jpg", "image2.jpg"]
}
```

### 14.3 댓글 작성
```http
POST /api/community/posts/:postId/comments
```

**Request Body:**
```json
{
  "content": "좋은 정보 감사합니다!",
  "parentCommentId": null
}
```

### 14.4 신고 처리 (Admin)
```http
PUT /api/admin/community/reports/:id
```

**Request Body:**
```json
{
  "status": "resolved",
  "actionTaken": "게시글 숨김 처리",
  "hideContent": true
}
```

---

## 🔐 15. Security & Rate Limiting

### Rate Limits
| Endpoint Type | Limit | Window |
|--------------|-------|---------|
| Public API | 60 | 1 minute |
| Authenticated API | 300 | 1 minute |
| Admin API | 600 | 1 minute |
| Auth Endpoints | 10 | 1 minute |

### Error Codes
| Code | Description |
|------|-------------|
| `AUTH_001` | 인증 토큰 없음 |
| `AUTH_002` | 토큰 만료 |
| `AUTH_003` | 권한 부족 |
| `RATE_001` | Rate limit 초과 |
| `VALIDATION_001` | 필수 필드 누락 |
| `VALIDATION_002` | 잘못된 데이터 형식 |
| `BUSINESS_001` | 매장을 찾을 수 없음 |
| `BUDGET_001` | 예산 초과 |
| `BUDGET_002` | 긴급 정지 상태 |

---

## 📚 Webhooks

### Webhook Events
```json
{
  "event": "referral.conversion",
  "data": {
    "referralCode": "BUZZ-ABC123",
    "convertedUserId": "uuid",
    "referrerId": "uuid",
    "rewardAmount": 500
  },
  "timestamp": "2025-08-30T10:00:00Z"
}
```

### Available Events
- `referral.conversion` - 리퍼럴 전환 발생
- `budget.warning` - 예산 경고 임계값 도달
- `settlement.approved` - 정산 승인
- `business.approved` - 매장 승인
- `security.breach` - 보안 위협 감지

---

## 🚀 Deployment

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "timestamp": "2025-08-30T10:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "storage": "connected"
  }
}
```

---

## 📝 Change Log

### Version 2.0.0 (2025-08-30)
- Admin 전체 기능 지원을 위한 API 추가
- 홈화면 설정 관리 API 추가
- 마케터 컨텐츠 관리 API 추가
- 세부 권한 관리 시스템 추가
- 시스템 설정 관리 API 추가
- 보안 설정 및 IP 차단 관리 추가
- A/B 테스트 관리 기능 추가
- 공지사항/팝업 관리 기능 추가
- 커뮤니티 신고 관리 기능 추가

### Version 1.0.0 (2025-08-01)
- 초기 API 설계 및 구현