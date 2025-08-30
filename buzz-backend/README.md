# Buzz Platform Backend

Buzz 플랫폼의 백엔드 API 서버입니다. Node.js + Express + TypeScript + PostgreSQL을 기반으로 구축되었습니다.

## 🏗️ 아키텍처

### 기술 스택
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Knex.js
- **Authentication**: JWT
- **Logging**: Winston
- **Validation**: express-validator, Joi
- **Security**: Helmet, CORS, Rate limiting
- **Documentation**: Swagger (선택사항)

### 디렉토리 구조
```
buzz-backend/
├── src/
│   ├── config/           # 설정 파일들
│   │   ├── database.ts   # DB 설정
│   │   ├── knex.ts       # Knex 연결
│   │   └── index.ts      # 전체 설정
│   ├── controllers/      # 컨트롤러 (향후 추가)
│   ├── middleware/       # 미들웨어
│   │   ├── auth.ts       # 인증/인가
│   │   ├── validation.ts # 데이터 검증
│   │   ├── rateLimit.ts  # Rate limiting
│   │   └── errorHandler.ts # 에러 처리
│   ├── models/           # 모델 (향후 추가)
│   ├── routes/           # API 라우터
│   │   ├── auth.ts       # 인증 관련
│   │   ├── businesses.ts # 매장 관련
│   │   ├── admin.ts      # 관리자 관련
│   │   └── health.ts     # 헬스체크
│   ├── services/         # 비즈니스 로직 (향후 추가)
│   ├── utils/            # 유틸리티 함수들
│   │   ├── auth.ts       # 인증 유틸리티
│   │   ├── response.ts   # 응답 유틸리티
│   │   └── logger.ts     # 로깅 유틸리티
│   ├── types/            # TypeScript 타입 정의
│   │   └── index.ts      # 전체 타입
│   ├── migrations/       # DB 마이그레이션 (향후 추가)
│   ├── seeds/            # DB 시드 데이터 (향후 추가)
│   ├── tests/            # 테스트 코드 (향후 추가)
│   ├── app.ts            # Express 앱 설정
│   └── server.ts         # 서버 실행
├── docs/                 # API 문서
├── logs/                 # 로그 파일들
├── uploads/              # 업로드된 파일들
├── .env.example          # 환경변수 예제
├── .gitignore
├── package.json
├── tsconfig.json
├── knexfile.js           # Knex 설정
└── README.md
```

## 🚀 시작하기

### 필수 요구사항
- Node.js 18.0.0 이상
- npm 9.0.0 이상
- PostgreSQL 12 이상

### 1. 저장소 클론 및 의존성 설치
```bash
cd C:\dev-project\buzz-main\buzz-backend
npm install
```

### 2. 환경변수 설정
```bash
# .env.example을 .env로 복사
cp .env.example .env

# .env 파일을 열어서 실제 값들로 수정
```

#### 주요 환경변수
```bash
# 서버 설정
NODE_ENV=development
PORT=3000
HOST=localhost

# 데이터베이스 설정
DATABASE_URL=postgresql://username:password@localhost:5432/buzz_platform
DB_HOST=localhost
DB_PORT=5432
DB_NAME=buzz_platform
DB_USER=postgres
DB_PASSWORD=your_password

# JWT 설정
JWT_SECRET=your_very_long_random_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here

# OAuth 설정 (선택사항)
GOOGLE_CLIENT_ID=your_google_client_id
KAKAO_CLIENT_ID=your_kakao_client_id
```

### 3. 데이터베이스 설정
```bash
# PostgreSQL 데이터베이스 생성
createdb buzz_platform

# 스키마 적용 (06-database-schema-complete.sql 파일 사용)
psql -d buzz_platform -f ../06-database-schema-complete.sql

# 또는 Knex 마이그레이션 사용 (향후 구현)
npm run migrate
npm run seed
```

### 4. 개발 서버 실행
```bash
# TypeScript 컴파일 + 개발 서버 실행 (nodemon)
npm run dev

# 또는 프로덕션 빌드 후 실행
npm run build
npm start
```

서버가 성공적으로 시작되면 다음 주소에서 접근할 수 있습니다:
- API: http://localhost:3000/api
- Health Check: http://localhost:3000/health
- API Health: http://localhost:3000/api/health

## 📚 API 문서

### 기본 응답 형식
```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "timestamp": "2025-08-30T10:00:00Z"
}
```

### 에러 응답 형식
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

### 주요 API 엔드포인트

#### 인증 (Authentication)
- `POST /api/auth/social/google` - Google 소셜 로그인
- `POST /api/auth/social/kakao` - Kakao 소셜 로그인
- `POST /api/auth/login` - 이메일 로그인 (비즈니스/관리자)
- `POST /api/auth/refresh` - 토큰 갱신
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/me` - 현재 사용자 정보
- `GET /api/auth/permissions` - 사용자 권한 정보

#### 비즈니스 (Businesses)
- `GET /api/businesses` - 매장 목록 조회
- `GET /api/businesses/:id` - 매장 상세 조회
- `POST /api/business/apply` - Buzz-Biz 가입 신청
- `POST /api/business/register` - 매장 등록 신청

#### 관리자 (Admin)
- `GET /api/admin/dashboard` - 관리자 대시보드
- `GET /api/admin/users` - 사용자 목록
- `GET /api/admin/users/:id` - 사용자 상세 정보
- `PUT /api/admin/users/:id/status` - 사용자 상태 변경
- `GET /api/admin/business-applications` - 비즈니스 가입 신청 목록
- `POST /api/admin/business-applications/:id/approve` - 가입 신청 승인
- `POST /api/admin/business-applications/:id/reject` - 가입 신청 반려
- `GET /api/admin/audit-logs` - 감사 로그 조회
- `GET /api/admin/realtime` - 실시간 모니터링
- `GET /api/admin/budget/current` - 현재 예산 현황

#### 헬스체크 (Health)
- `GET /health` - 기본 헬스체크
- `GET /api/health` - API 헬스체크
- `GET /api/health/detailed` - 상세 헬스체크

## 🔐 인증 및 보안

### JWT 토큰
- **Access Token**: 24시간 유효
- **Refresh Token**: 7일 유효
- 헤더 형식: `Authorization: Bearer <token>`

### 권한 레벨
1. **USER** - 일반 사용자 (Buzz 앱)
2. **BUSINESS** - 비즈니스 사용자 (Buzz-Biz)
3. **ADMIN** - 관리자 (Buzz-Admin)

### 보안 기능
- Rate Limiting (IP 기반)
- CORS 설정
- Helmet 보안 헤더
- 입력 데이터 검증
- SQL Injection 방지
- XSS 방지

## 📊 로깅 및 모니터링

### 로그 레벨
- **ERROR**: 에러 및 예외
- **WARN**: 경고
- **INFO**: 일반 정보
- **HTTP**: HTTP 요청
- **DEBUG**: 디버그 정보

### 로그 파일
- `logs/error-YYYY-MM-DD.log` - 에러 로그
- `logs/combined-YYYY-MM-DD.log` - 전체 로그
- `logs/http-YYYY-MM-DD.log` - HTTP 요청 로그

## 🧪 테스트

```bash
# 전체 테스트 실행
npm test

# 테스트 watch 모드
npm run test:watch

# 테스트 커버리지
npm run test:coverage
```

## 🔧 개발 도구

### 스크립트
- `npm run dev` - 개발 서버 실행 (nodemon)
- `npm run build` - TypeScript 컴파일
- `npm start` - 프로덕션 서버 실행
- `npm run lint` - ESLint 실행
- `npm run lint:fix` - ESLint 자동 수정
- `npm run format` - Prettier 포맷팅

### 데이터베이스 관리
- `npm run migrate` - 마이그레이션 실행
- `npm run migrate:rollback` - 마이그레이션 롤백
- `npm run seed` - 시드 데이터 삽입
- `npm run db:reset` - DB 리셋 (롤백 + 마이그레이션 + 시드)

## 🚢 배포

### 프로덕션 빌드
```bash
npm run build
NODE_ENV=production npm start
```

### 환경별 설정
- **Development**: `.env`
- **Staging**: `.env.staging`
- **Production**: 환경변수 또는 `.env.production`

### 필수 환경변수 (프로덕션)
```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=very_secure_secret
JWT_REFRESH_SECRET=very_secure_refresh_secret
```

## 🤝 기여하기

1. 기능 브랜치 생성: `git checkout -b feature/amazing-feature`
2. 변경사항 커밋: `git commit -m 'Add amazing feature'`
3. 브랜치 푸시: `git push origin feature/amazing-feature`
4. Pull Request 생성

### 코딩 컨벤션
- TypeScript strict 모드 사용
- ESLint + Prettier 설정 준수
- 함수 및 클래스에 JSDoc 주석 추가
- 에러 처리 필수
- 모든 API는 적절한 HTTP 상태 코드 반환

## 📋 TODO

### 현재 구현된 기능
- ✅ 기본 서버 설정 및 미들웨어
- ✅ JWT 인증 시스템
- ✅ 사용자 및 비즈니스 관리
- ✅ 관리자 대시보드 기본 기능
- ✅ 에러 처리 및 로깅
- ✅ API 검증 및 보안

### 향후 구현 예정
- ⏳ 쿠폰 시스템 API
- ⏳ 마일리지 시스템 API  
- ⏳ 정산 시스템 API
- ⏳ 컨텐츠 관리 API
- ⏳ QR 코드 관리 API
- ⏳ 리퍼럴 시스템 API
- ⏳ 알림 시스템
- ⏳ 예산 관리 시스템
- ⏳ 실제 OAuth 연동 (Google, Kakao)
- ⏳ Redis 캐싱
- ⏳ 파일 업로드 (S3 연동)
- ⏳ 이메일 발송
- ⏳ 테스트 코드
- ⏳ API 문서화 (Swagger)

## 📞 지원

문제가 발생하거나 질문이 있으시면:
1. GitHub Issues 생성
2. 로그 파일 확인
3. API 응답의 에러 코드 확인

---

**Buzz Platform Backend v1.0.0**  
Built with ❤️ for efficient referral marketing platform