# Buzz 플랫폼 - 전체 워크플로우 문서
> Version: 3.2  
> Last Updated: 2025-08-30  
> Status: 개발 진행 중 (75% 완료) - Supabase DB 구축 완료!

## 📋 프로젝트 개요

### 시스템 구성
- **buzz** (모바일웹) - 일반 사용자용 플랫폼 ✅ UI 구현
- **buzz-biz** (사장님 앱) - 매장 사업자용 앱 ✅ UI 구현  
- **buzz-admin** (관리자 웹) - 정부 관리자용 시스템 ✅ UI 구현

### 핵심 목표
정부 주도 지역경제 활성화를 위한 선순환 바이럴 마케팅 시스템

### 현재 구현 상태
| 구분 | 완료 | 진행 중 |
|------|------|--------|
| **Frontend** | ✅ UI/UX + API 연동 준비 (75%) | 고급 기능 완성 |
| **Backend** | 구조 설계 완료 | 🔄 **외주팀 개발 중** (5개 핵심 기능) |
| **Database** | ✅ **Supabase 46개 테이블 완료** (100%) | - |
| **인증** | JWT/2FA 구조 완료 | 🔄 Google/Kakao OAuth 외주 개발 중 |

---

## 🔄 전체 워크플로우

### 1. 사용자 가입 및 리퍼럴 플로우

#### 1.1 Buzz 사용자 가입 (소셜 로그인)
```
리퍼럴 링크 접속 → 방문 추적 → 기본 할인 쿠폰 지급
     ↓
Google/Kakao 소셜 로그인 → 추가 정보 입력 (전화번호, 대학교)
     ↓
리퍼럴 코드 자동생성 → 가입 추가 쿠폰 + 마일리지 지급
     ↓
추천인에게 리퍼럴 보상 지급
```

**상세 단계:**
1. **A사용자**가 마케터 페이지에서 리퍼럴 링크 생성
2. **B사용자**가 리퍼럴 링크로 buzz 접속
3. **시스템**이 방문 추적하고 기본 할인 쿠폰(3,000원) 지급
4. **B사용자**가 Google/Kakao 소셜 로그인으로 회원가입
5. **시스템**이 B에게 리퍼럴 코드 자동 생성 + 추가 쿠폰(5,000원) + 마일리지(5,000P) 지급
6. **시스템**이 A에게 리퍼럴 보상(500P) 지급

#### 1.2 Buzz-Biz 사장님 가입 (승인 프로세스) ✅ 백엔드 구현 완료
```
가입 신청 (이메일/비밀번호) → 사업자 정보 입력 → 서류 업로드
     ↓
Admin 검토 대기 (pending) → 관리자 승인/반려
     ↓
승인시 계정 활성화 → 로그인 가능
```
**구현된 기능:**
- ✅ 이메일/비밀번호 인증 시스템 
- ✅ 사업자 승인 프로세스 API
- ✅ Admin 승인/반려 시스템
- ❌ 파일 업로드 기능 (사업자등록증, 통장사본) - 미구현
- ❌ 이메일 알림 - 미구현

#### 1.3 Admin 관리자 계정
```
최고관리자가 계정 생성 → 임시 비밀번호 발급 (24시간 유효)
     ↓
첫 로그인시 비밀번호 변경 필수 → 2FA 설정 필수
     ↓
4단계 권한 체계에 따른 접근 제어
```

### 2. 매장 이용 플로우

```
사용자(쿠폰/마일리지) → 매장 방문 → QR 스캔 → 할인 적용 → 결제 완료 → 리뷰 작성
```

**할인 쿠폰 사용:** ✅ 백엔드 API 구현 완료
1. 사용자가 보유 쿠폰 QR 표시 ✅ UI 구현
2. 사장님이 buzz-biz로 QR 스캔 ❌ 카메라 연동 필요
3. 쿠폰 정보 확인 (할인액, 유효기간 등) ✅ API 구현 완료
4. "사용하기" 버튼으로 쿠폰 사용 처리 ✅ API 구현 완료
5. 할인 적용하여 결제 ✅ API 로직 구현

**마일리지 사용:** ✅ 백엔드 API 구현 완료
1. 사용자가 마일리지 QR 표시 (5분 만료) ❌ 실시간 만료 미구현
2. 사장님이 buzz-biz 마일리지 모드로 QR 스캔 ❌ 카메라 연동 필요
3. 사용자 정보 및 잔액 확인 ✅ API 구현 완료
4. 사용할 금액 입력 ✅ UI + API 구현
5. 마일리지 차감 처리 ✅ API 구현 완료

**리뷰/평점 시스템:** ✅ 백엔드 API 완전 구현
1. 매장 방문 후 사용자가 별점(1-5) 및 리뷰 작성 ✅ API 구현 완료
2. 이미지 업로드 기능 (최대 3장) ✅ API 구현 완료
3. 구매 인증 확인 (verified_purchase) ✅ API 로직 구현
4. Admin에서 리뷰 승인/숨김/신고 처리 ✅ UI + API 구현 완료
5. buzz-biz에서 매장별 리뷰 관리 대시보드 ✅ API 구현 완료

### 3. 정산 플로우

```
매장 일일 집계 → 정산 요청 → admin 검토 → 승인/지급
```

1. **매장**: 일일 마일리지/쿠폰 사용 내역 집계
2. **매장**: buzz-biz에서 정산 요청
3. **admin**: 정산 요청 검토 및 승인
4. **admin**: 매장에 정산금 지급

### 4. 컨텐츠 관리 플로우

```
admin 템플릿 작성 → 컨텐츠 발행 → buzz 표시 → 사용자 이용
```

**지역추천/이벤트:**
1. **admin**이 템플릿 기반으로 컨텐츠 작성
2. 이미지, 텍스트, 기간 설정
3. buzz 앱 해당 페이지에 자동 표시

### 5. 리뷰 관리 플로우 ✅ 신규 추가

```
사용자 리뷰 작성 → admin 검토 → 승인/반려 → buzz/biz 표시
```

**리뷰 생성:**
1. **사용자**: 매장 방문 후 리뷰 작성 (별점 1-5, 텍스트, 이미지)
2. **시스템**: 구매 인증 여부 확인 (verified_purchase 플래그)
3. **시스템**: 자동 스팸 필터링 및 부적절한 내용 감지

**리뷰 관리 (Admin):** ✅ UI 구현 완료
1. **admin**이 전체 리뷰 현황 대시보드 확인
2. 신고된 리뷰 및 보류 리뷰 검토
3. 리뷰 승인/숨김/삭제 처리
4. 매장별 평점 및 리뷰 통계 관리

**리뷰 표시:**
1. **buzz**: 매장 상세에서 리뷰 목록 표시
2. **buzz-biz**: 매장별 리뷰 대시보드에서 관리
3. **평점 집계**: 실시간 평균 평점 계산 및 업데이트

---

## 🎯 핵심 시스템 연동도

### 데이터 흐름
```
buzz (사용자) ←→ Supabase ←→ buzz-admin (관리)
                    ↕
              buzz-biz (매장)
```

### API 연동 포인트
- **리퍼럴 추적**: 실시간 방문/가입 데이터
- **QR 처리**: 쿠폰/마일리지 실시간 검증 및 사용
- **정산 관리**: 매장별 일일/월별 집계
- **컨텐츠 동기화**: admin → buzz 실시간 반영
- **리뷰 관리**: 사용자 작성 → admin 검토 → 승인/반려 처리
- **평점 집계**: 실시간 평균 평점 계산 및 매장 랭킹 업데이트

---

## 🏗️ 기술 스택

### 공통
- **Database**: Supabase (PostgreSQL + Auth + Real-time)
- **Deployment**: Vercel
- **Language**: TypeScript

### Frontend
- **Framework**: React 18 + Vite
- **UI Library**: Radix UI + Tailwind CSS (shadcn/ui)
- **State Management**: TanStack Query
- **Routing**: Wouter

### Backend
- **Runtime**: Node.js + Express.js
- **API**: Vercel Functions
- **Authentication**: Supabase Auth

---

## 📊 핵심 성과 지표 (KPI)

### 리퍼럴 성과
- 리퍼럴 전환율 > 15%
- 활성 리퍼러 > 100명/월
- 바이럴 계수 > 2.5명

### 비즈니스 성과
- 매장 QR 활용률 > 80%
- 마일리지 사용률 > 70%
- 고객 재방문율 > 40%

### 시스템 안정성
- QR 스캔 성공률 > 95%
- 결제 처리 성공률 > 99%
- 앱 응답 속도 < 2초

---

## 🚨 예산 긴급 제어 메커니즘 (Admin 최우선 기능)

### 시스템 레벨 제어
```typescript
// 예산 상태 실시간 체크
interface BudgetControl {
  status: 'normal' | 'warning' | 'danger' | 'critical' | 'blocked';
  remainingBudget: number;
  consumptionRate: number; // 시간당 소비율
  
  // 자동 제어 트리거
  triggers: {
    at70Percent: () => void;  // 주의 알림
    at85Percent: () => void;  // 보상 감소
    at95Percent: () => void;  // 서비스 제한
    at98Percent: () => void;  // 긴급 정지
    at100Percent: () => void; // 완전 차단
  };
}

// 서비스별 Kill Switch
interface ServiceKillSwitch {
  referral: {
    enabled: boolean;
    rewardAmount: number;
    dailyLimit: number;
    override: () => void;
  };
  
  coupon: {
    newSignup: boolean;
    event: boolean;
    useExisting: boolean;
    override: () => void;
  };
  
  qrEvent: {
    scanning: boolean;
    winRate: number;
    maxPrize: number;
    override: () => void;
  };
}
```

### 비상 프로토콜 (Admin에서 제어)
1. **봇 공격 감지시**: 자동 10분 정지 → 패턴 분석 → 재개
2. **급증 감지시**: 실시간 한도 50% 감소 → 모니터링
3. **예산 초과 임박시**: 단계적 서비스 축소
4. **완전 소진시**: 기존 쿠폰만 허용, 신규 중단

**Note**: 모든 예산 제어는 Admin 시스템에서 실시간으로 관리되며, Phase 1에서 최우선으로 구현

---

## 🚀 개발 로드맵 (수정됨)

### ✅ 완료된 작업
- **Frontend UI/UX**: 3개 앱 모두 기본 UI 구현 완료
- **컴포넌트 라이브러리**: shadcn/ui 기반 구축
- **네비게이션 구조**: 화면 간 이동 구현
- **Mock 데이터**: 프로토타입용 데이터 구조
- **리뷰 관리 시스템**: buzz-admin에 완전한 리뷰 관리 탭 구현
  - 리뷰 통계 대시보드 (총 리뷰수, 평균 평점, 보류/신고 건수)
  - 리뷰 필터링 및 검색 기능 (상태별, 평점별)
  - 리뷰 승인/숨김/삭제 처리 UI
  - 대량 작업 기능 (선택된 리뷰 일괄 처리)

### 🔄 진행 중 작업 (현재 단계)

#### Phase 1: 백엔드 기반 구축 (3주) ✅ 완료
- **Week 1**: ✅ Node.js/Express 서버 설정
- **Week 2**: ✅ PostgreSQL/Supabase 연결
- **Week 3**: ✅ 인증 시스템 구현
  - ⚠️ Google/Kakao OAuth (Buzz) - 구조만 완성
  - ✅ 이메일/비밀번호 (Buzz-Biz, Admin)
  - ✅ JWT 토큰 관리
  - ✅ 2FA (Admin)

### 📋 향후 개발 계획

#### Phase 2: 핵심 API 구현 (4주) ✅ 완료
- ✅ 사용자 관리 API
- ✅ QR 코드 생성/검증 API
- ✅ 쿠폰/마일리지 처리 API
- ✅ 정산 관리 API
- ✅ 리퍼럴 추적 API
- ✅ **리뷰/평점 관리 API** - 완전 구현 완료
  - ✅ 리뷰 CRUD 작업 (생성/조회/수정/삭제)
  - ✅ 평점 집계 및 실시간 업데이트
  - ✅ 리뷰 승인/신고 처리 로직
  - ✅ 이미지 업로드 및 관리

#### Phase 3: 프론트-백 연동 (3주)
- API 호출 로직 추가
- 상태 관리 (Redux/Zustand)
- 실시간 업데이트 (WebSocket)
- 에러 처리 및 로딩 상태

#### Phase 4: 고급 기능 (2주)
- QR 스캔 카메라 연동
- 파일 업로드 (AWS S3)
- 푸시 알림 (FCM)
- 실시간 예산 모니터링

### 현재 상황: 총 진행률 75% 완료

## 💾 Supabase 데이터베이스 구축 완료 (NEW!)

### 완전 구축된 46개 테이블 시스템
```sql
📊 핵심 테이블 구성 (46개)
├── 👤 사용자 관리 (8개 테이블)
│   ├── users, user_profiles, user_preferences
│   ├── referral_codes, user_referrals, referral_rewards
│   └── user_sessions, user_activity_logs
├── 🏪 비즈니스 관리 (12개 테이블)  
│   ├── businesses, business_categories, business_hours
│   ├── business_applications, business_documents
│   ├── qr_codes, business_qr_settings
│   └── business_analytics, revenue_reports
├── 🎫 쿠폰 시스템 (10개 테이블)
│   ├── coupons, coupon_templates, coupon_categories
│   ├── user_coupons, coupon_usage_history
│   └── coupon_campaigns, promotion_rules
├── 💰 마일리지 시스템 (8개 테이블)
│   ├── mileage_accounts, mileage_transactions
│   ├── mileage_exchange_rates, earning_rules
│   └── settlement_requests, payment_history
├── ⭐ 리뷰 시스템 (5개 테이블)
│   ├── reviews, review_images, review_likes
│   ├── review_reports, business_ratings
└── 🔧 시스템 관리 (3개 테이블)
    ├── admin_users, system_settings
    └── audit_logs
```

### 🔗 실시간 연결 준비 완료
- ✅ **Row Level Security (RLS)** 정책 설정
- ✅ **실시간 구독** 시스템 준비  
- ✅ **백업 및 복구** 시스템 구축
- ✅ **API 자동 생성** (Supabase Auto API)

### 예상 완료: 백엔드 외주 완성시 즉시 런칭 가능 (현재 75% 완료)

---

## 🔄 외주 백엔드 개발 현황 (NEW!)

### 진행 중인 핵심 5개 기능
```typescript
🔧 외주 개발팀 작업 중
├── 🔐 인증 시스템
│   ├── Google OAuth 2.0 연동
│   ├── Kakao OAuth 2.0 연동  
│   ├── JWT 토큰 발급/갱신 시스템
│   └── 2FA (Two-Factor Authentication)
├── 👥 사용자 관리 기능
│   ├── 프로필 CRUD 시스템
│   ├── 리퍼럴 코드 생성/추적
│   └── 권한별 접근 제어
├── 🏪 비즈니스 등록 시스템
│   ├── 사업자 신청/승인 프로세스
│   ├── 서류 업로드 및 검증
│   └── 매장 정보 관리
├── 🎫 쿠폰/마일리지 시스템
│   ├── 쿠폰 발급 및 사용 로직
│   ├── 마일리지 적립/차감 시스템
│   └── QR 코드 생성/검증
└── ⚡ 프론트엔드 백엔드 연결
    ├── RESTful API 구현
    ├── 에러 응답 표준화
    └── API 문서화
```

### 🚀 두 가지 런칭 옵션

#### 옵션 A: 외주 백엔드 완성 대기 ⏳
```
장점: 완전한 백엔드 API 시스템
단점: 대기 시간 발생
예상: 외주 완성 후 2주 내 런칭
```

#### 옵션 B: Supabase 직접 연결 🎯 **추천**
```
장점: 즉시 런칭, 사용자 테스트 가능
방식: 프론트엔드에서 Supabase 직접 연결
예상: 1주 내 완전 동작 시스템
마이그레이션: 외주 완성시 API 교체만
```

---

## 🎯 기존 구현된 백엔드 기능 상세

### 완전 구현된 API 시스템
1. **인증 시스템**
   - JWT 토큰 기반 인증
   - 리프레시 토큰 구현
   - 2FA (Two-Factor Authentication)
   - 역할 기반 권한 관리 (User/Business/Admin)

2. **QR 코드 시스템**
   - 쿠폰 QR 생성 및 검증
   - 마일리지 QR 생성 및 검증
   - QR 코드 보안 (암호화/만료 시간)

3. **쿠폰 관리 시스템**
   - 쿠폰 생성/수정/삭제
   - 사용자별 쿠폰 발급
   - 쿠폰 사용 처리 및 검증
   - 할인 계산 로직

4. **마일리지 시스템**
   - 마일리지 적립/사용 처리
   - 잔액 조회 및 히스토리
   - 마일리지 적립 기회 관리
   - 만료 처리 시스템

5. **리뷰 시스템**
   - 리뷰 CRUD (생성/조회/수정/삭제)
   - 이미지 업로드 (최대 3장)
   - 리뷰 신고 및 승인 시스템
   - 도움됨/도움안됨 평가

6. **사업자 관리**
   - 사업자 등록 및 승인 프로세스
   - 사업자별 통계 및 정산
   - QR 스캔 로그 관리

7. **리퍼럴 시스템**
   - 추천 코드 생성 및 관리
   - 추천 보상 지급 로직
   - 리퍼럴 추적 및 통계

### 데이터베이스 스키마
- 완전한 PostgreSQL 마이그레이션 파일
- 인덱싱 및 성능 최적화
- 외래 키 제약 조건
- 트리거 및 함수 구현