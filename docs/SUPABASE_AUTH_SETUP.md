# Supabase Auth 설정 가이드

## 📋 개요
BUZZ 플랫폼의 Supabase 인증 시스템 설정 및 문제 해결 가이드입니다.

## 🔧 초기 설정

### 1. 환경 변수 설정
`.env` 파일에 다음 변수들을 설정하세요:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key  # Admin 작업용
```

### 2. Auth와 Public 테이블 동기화

Supabase의 auth.users와 public.users 테이블을 자동으로 동기화하려면:

1. **Supabase Dashboard SQL Editor에서 실행:**
   ```bash
   # scripts/setup-auth-trigger.sql 파일의 내용을 
   # Supabase Dashboard > SQL Editor에서 실행
   ```

2. **기존 사용자 동기화:**
   ```bash
   node scripts/sync-auth-users.js
   ```

3. **동기화 상태 확인:**
   ```bash
   node scripts/check-auth-sync.js
   ```

## 🏢 Buzz-Biz 회원가입 프로세스

### 회원가입 흐름
1. **사용자가 가입 신청** → business_applications 테이블에 저장
2. **관리자가 승인** → Supabase Auth 계정 생성 + businesses 테이블에 데이터 이관
3. **임시 비밀번호 SMS 발송** → 사용자가 로그인
4. **첫 로그인 시 비밀번호 변경**

### 테스트 데이터 생성

```bash
# 테스트 신청서 생성
node scripts/create-test-application.js

# 신청서 승인 처리
node scripts/approve-test-application.js

# Auth 계정과 비즈니스 생성
node scripts/create-auth-and-business.js
```

## 🔍 문제 해결

### 로그인 실패 시 확인사항

1. **Auth와 Public 동기화 확인:**
   ```bash
   node scripts/check-auth-sync.js
   ```

2. **테이블 구조 확인:**
   ```bash
   node scripts/check-table-structure.js
   ```

3. **신청서 및 비즈니스 상태 확인:**
   ```bash
   node scripts/check-applications.js
   ```

### 일반적인 문제들

#### 문제: "insert or update on table 'businesses' violates foreign key constraint"
**원인:** auth.users와 public.users가 동기화되지 않음
**해결:** 
```bash
node scripts/sync-auth-users.js
```

#### 문제: "Could not find the 'column_name' column"
**원인:** 테이블 스키마 불일치
**해결:** Supabase Dashboard에서 테이블 구조 확인 및 수정

#### 문제: "A user with this email address has already been registered"
**원인:** 중복 이메일
**해결:** 기존 사용자 확인 후 처리
```bash
node scripts/check-auth-sync.js
```

## 📊 데이터베이스 구조

### business_applications (신청서)
- business_name: 사업자명
- business_number: 사업자등록번호
- owner_name: 대표자명
- phone: 연락처
- email: 이메일
- status: pending/approved/rejected

### businesses (승인된 비즈니스)
- owner_id: Auth user ID (FK)
- business_name: 사업자명
- business_number: 사업자등록번호
- verification_status: 승인 상태

### users (Public 사용자)
- id: Auth user ID (PK)
- email: 이메일
- name: 이름

## 🚀 배포 체크리스트

- [ ] 환경 변수 설정 완료
- [ ] setup-auth-trigger.sql 실행 완료
- [ ] Auth와 Public 테이블 동기화 확인
- [ ] 회원가입 → 승인 → 로그인 테스트 완료
- [ ] SMS 서비스 설정 (SOLAPI)

## 📞 지원

문제가 지속되면:
1. `node scripts/check-auth-sync.js` 실행 결과 확인
2. Supabase Dashboard > Logs 확인
3. Auth 트리거 및 함수 확인