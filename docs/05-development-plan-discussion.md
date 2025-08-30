# Buzz 플랫폼 개발 플랜 토론 기록
> 작성일: 2025-08-30

## 📌 토론 개요

### 참여 문서
1. **01-buzz-workflow.md** - 전체 워크플로우 문서
2. **02-buzz-web-spec.md** - Buzz 모바일웹 상세 기획서
3. **03-buzz-biz-spec.md** - Buzz-Biz 사장님 앱 상세 기획서
4. **04-buzz-admin-spec.md** - Buzz-Admin 관리자 시스템 상세 기획서

### 목표
- 4개 문서를 기반으로 한 통합 개발 플랜 수립
- 서브에이전트를 활용한 최적의 개발 전략 도출
- 실행 가능한 단계별 개발 계획 수립

---

## 🏗️ 수립된 개발 플랜

### 1. 프로젝트 구조 및 폴더 아키텍처

#### 모노레포 구조 (Turborepo 기반)
```
buzzmain/
├── packages/
│   ├── shared/          # 공통 타입, 유틸리티, 컴포넌트
│   ├── ui/             # shadcn/ui 컴포넌트 라이브러리
│   ├── supabase/       # DB 스키마, 마이그레이션, RPC
│   └── config/         # ESLint, TypeScript, Tailwind 설정
├── apps/
│   ├── buzz/           # 모바일웹 (사용자)
│   ├── buzz-biz/       # 사장님 앱
│   └── buzz-admin/     # 관리자 시스템
├── docs/               # API 문서, 아키텍처 가이드
└── tools/              # 배포, 모니터링 스크립트
```

**선정 이유:**
- 코드 재사용성 극대화
- 일관된 개발 환경 관리
- 효율적인 빌드 및 배포 프로세스

### 2. 단계별 개발 순서 (우선순위 기반) - 수정됨

#### Phase 1: 핵심 인프라 구축 + Admin 기초 (4주)
- **Week 1-2**: Supabase 데이터베이스 설계 및 인증 시스템
  - 핵심 테이블 스키마 정의
  - RLS 정책 설정
  - **Google/Kakao OAuth 설정 (Buzz 필수)**
  - **이메일/비밀번호 인증 (Buzz-Biz, Admin)**
  - **2FA 시스템 구현 (Admin)**
- **Week 3**: Admin 기본 구조 및 예산 관리 시스템
  - **Admin 기본 프레임워크 구축**
  - **💰 예산 관리 시스템 (최우선)**
  - **긴급 제어 시스템 구현**
  - **4단계 권한 체계 구현**
- **Week 4**: 공통 패키지 및 리퍼럴 기본 시스템
  - shared 패키지 (타입, 유틸리티)
  - ui 패키지 (기본 컴포넌트)
  - 리퍼럴 추적 기본 로직

#### Phase 2: Buzz 모바일웹 개발 (6주)
- **Week 5-6**: 홈페이지 및 매장 카드 시스템
  - **공평한 매장 로테이션 시스템 구현**
  - 시간대별 카테고리 로테이션
- **Week 7-8**: 마이페이지 (QR, 쿠폰, 마일리지)
  - **팝업 배너 시스템 구현**
  - A/B 테스트 및 타겟팅 기능
- **Week 9-10**: 마케터 페이지 (리퍼럴 허브)
- **Week 10-11**: 커뮤니티 기능

#### Phase 3: Buzz-Biz 앱 개발 (4주)
- **Week 11-12**: QR 스캔 시스템
  - **가입 승인 프로세스 구현**
  - 승인 대기 상태 관리
- **Week 13**: 쿠폰/마일리지 처리
- **Week 14**: 정산 관리

#### Phase 4: Buzz-Admin 시스템 완성 (4주)
- **Week 15**: 리퍼럴 성과 대시보드
- **Week 16**: 매장 관리 시스템
- **Week 17**: 정산 승인 시스템
- **Week 18**: 컨텐츠 관리 (템플릿 기반)

### 3. 시스템 간 연동 전략

#### API 게이트웨이 패턴
- Vercel Functions로 도메인별 API 엔드포인트 구성
- Supabase RPC를 통한 복잡한 비즈니스 로직 처리
- Real-time 구독을 통한 실시간 데이터 동기화

#### 데이터 일관성 보장
- Supabase Transactions 활용
- 이벤트 기반 아키텍처 (Webhook + Queue)
- 낙관적 잠금을 통한 동시성 제어

### 4. 데이터베이스 스키마 설계 방향

#### 핵심 테이블 구조
```sql
-- 사용자 및 리퍼럴
users, referral_codes, referral_visits, referral_conversions

-- 매장 및 비즈니스
businesses, business_categories, business_reviews

-- 쿠폰 및 마일리지
coupons, coupon_uses, mileage_accounts, mileage_transactions

-- 정산
settlements, settlement_requests, settlement_approvals

-- 컨텐츠 관리
content_templates, regional_recommendations, events
```

### 5. 보안 및 성능 최적화 전략

#### 보안
- Supabase RLS (Row Level Security) 정책 적용
- API Rate Limiting (Vercel Edge Functions)
- QR 코드 5분 TTL 및 암호화
- 민감 정보 마스킹 (전화번호, 이메일)

#### 성능
- React Query 캐싱 전략
- 이미지 최적화 (Next.js Image + Vercel)
- 데이터베이스 인덱싱 최적화
- 컴포넌트 레벨 코드 분할

### 6. 개발 일정 요약

- **총 개발 기간**: 18주 (약 4.5개월)
- **Phase 1**: Week 1-4 (인프라 + 공통)
- **Phase 2**: Week 5-10 (Buzz 모바일웹)
- **Phase 3**: Week 11-14 (Buzz-Biz 앱)
- **Phase 4**: Week 15-18 (Buzz-Admin + 통합)

### 7. 핵심 컴포넌트 및 라이브러리

#### UI/UX 라이브러리
- shadcn/ui + Radix UI (접근성 보장)
- Tailwind CSS (일관된 디자인 시스템)
- Framer Motion (마이크로 인터랙션)

#### 기능별 라이브러리
- TanStack Query (서버 상태 관리)
- React Hook Form (폼 처리)
- Zod (스키마 검증)
- QR Scanner (QR 스캔)
- Chart.js (데이터 시각화)

### 8. 테스트 전략

#### 테스트 피라미드
- **Unit Tests**: Vitest (유틸리티, 훅)
- **Integration Tests**: Testing Library (컴포넌트)
- **E2E Tests**: Playwright (핵심 사용자 플로우)
- **API Tests**: Supabase 함수 테스트

#### 핵심 테스트 영역
- 리퍼럴 추적 로직
- QR 스캔 및 처리
- 결제 및 정산 플로우
- 권한 및 보안 검증

### 9. 배포 및 CI/CD 전략

#### 배포 환경
- **Production**: Vercel (모든 앱)
- **Staging**: Vercel Preview (PR별)
- **Development**: 로컬 개발 환경

#### CI/CD 파이프라인 (GitHub Actions)
1. 코드 품질 검사 (ESLint, TypeScript)
2. 자동 테스트 실행
3. 빌드 및 배포 (Turborepo 캐시 활용)
4. 데이터베이스 마이그레이션 (Supabase CLI)

### 10. 모니터링 및 로깅 전략

#### 성능 모니터링
- Vercel Analytics (웹 성능 지표)
- Sentry (에러 추적 및 성능 모니터링)
- Supabase Dashboard (DB 성능)

#### 비즈니스 메트릭 추적
- 리퍼럴 전환율 실시간 대시보드
- QR 스캔 성공률 모니터링
- 정산 처리 시간 추적
- 사용자 행동 분석 (PostHog)

#### 알림 시스템
- 크리티컬 에러 Slack 알림
- 일일 KPI 리포트 자동 생성
- 이상 패턴 탐지 알림

---

## 🔍 추가 고려사항 (분석 예정)

### 1. 리스크 관리
- **기술적 리스크**: Supabase 제한사항, 실시간 처리 병목
- **비즈니스 리스크**: 부정 사용, 예산 초과
- **보안 리스크**: 개인정보 보호, 결제 보안
- **확장성 리스크**: 사용자 급증 대응

### 2. 법적/규제 준수
- 개인정보보호법 (KISA 가이드라인)
- 전자상거래법 (쿠폰/마일리지 관련)
- 정부 시스템 연동 요구사항
- 회계/세무 관련 요구사항

### 3. 사용자 경험 최적화
- 온보딩 프로세스 간소화
- 오프라인 모드 지원 전략
- 접근성 (WCAG 2.1 준수)
- 다국어 지원 고려사항

### 4. 데이터 분석 및 인사이트
- 핵심 KPI 측정 방법
- A/B 테스트 인프라
- 사용자 행동 분석 도구
- 예측 분석 모델 적용

### 5. 비용 최적화
- Supabase 요금제 최적화
- Vercel 사용량 예측
- 이미지/파일 저장소 전략
- 써드파티 서비스 비용

### 6. 파트너십 및 통합
- 결제 게이트웨이 선정
- 카카오/네이버 API 연동
- 지역 상권 시스템 연동
- 정부 포털 연동 방안

### 7. 운영 및 유지보수
- 24/7 모니터링 체계
- 장애 대응 프로세스
- 백업 및 복구 전략
- 버전 관리 및 롤백 계획

### 8. 성장 전략
- MVP 이후 기능 로드맵
- 다른 지역 확장 계획
- 플랫폼 수익 모델
- 커뮤니티 활성화 방안

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

## 💡 결론 및 다음 단계

### 핵심 성공 요소
1. **모노레포 구조**를 통한 효율적인 코드 공유와 관리
2. **단계별 점진적 개발**을 통한 안정적인 시스템 구축
3. **실시간 데이터 동기화**를 통한 원활한 사용자 경험
4. **철저한 보안 및 성능 최적화**

### 다음 진행 사항
1. 상세 데이터베이스 스키마 설계
2. API 명세서 작성
3. UI/UX 상세 디자인
4. 개발 환경 구축
5. Phase 1 개발 착수

---

> 이 문서는 Buzz 플랫폼 개발을 위한 초기 플랜 토론 내용을 정리한 것입니다.
> 실제 개발 과정에서 세부사항은 조정될 수 있습니다.