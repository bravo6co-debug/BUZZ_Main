# Vercel 환경변수 설정 가이드

## ⚠️ 중요: Vercel에 배포하기 전 필수 설정

### 1. Vercel Dashboard에서 환경변수 추가

각 프로젝트별로 다음 환경변수를 설정해야 합니다:

#### 🔵 buzz-app
```
VITE_SUPABASE_URL=https://ssokfehixfpkbgcghkxy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzb2tmZWhpeGZwa2JnY2doa3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NDIwOTcsImV4cCI6MjA3MjExODA5N30.U8DM6l6_P-cDMzAIZab_xZ3RlD80IshB3YGFkBt5K2g
VITE_API_URL=http://localhost:3003
```

#### 🟢 buzz-biz
```
VITE_SUPABASE_URL=https://ssokfehixfpkbgcghkxy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzb2tmZWhpeGZwa2JnY2doa3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NDIwOTcsImV4cCI6MjA3MjExODA5N30.U8DM6l6_P-cDMzAIZab_xZ3RlD80IshB3YGFkBt5K2g
VITE_API_URL=http://localhost:3003
```

#### 🔴 buzz-admin
```
VITE_SUPABASE_URL=https://ssokfehixfpkbgcghkxy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzb2tmZWhpeGZwa2JnY2doa3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NDIwOTcsImV4cCI6MjA3MjExODA5N30.U8DM6l6_P-cDMzAIZab_xZ3RlD80IshB3YGFkBt5K2g
VITE_API_URL=http://localhost:3003

# Admin 전용 (절대 노출 금지!)
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzb2tmZWhpeGZwa2JnY2doa3h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU0MjA5NywiZXhwIjoyMDcyMTE4MDk3fQ.dv-uD0BUu9pzk-4In56-A5UO3WJSaDVZhs-16Xr9bfQ
```

### 2. Vercel에서 환경변수 설정 방법

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. 프로젝트 선택
3. Settings → Environment Variables
4. 각 변수 추가:
   - Key: 변수명 (예: VITE_SUPABASE_URL)
   - Value: 값
   - Environment: Production, Preview, Development 모두 체크
5. Save 클릭

### 3. Supabase Dashboard 설정

1. [Supabase Dashboard](https://app.supabase.com) 접속
2. SQL Editor에서 실행:
   ```sql
   -- scripts/setup-auth-trigger.sql 내용을 복사하여 실행
   ```

### 4. 배포 확인

```bash
# Git 푸시 후 자동 배포 확인
git push origin main

# Vercel Dashboard에서 배포 상태 확인
# Build Logs에서 에러 없는지 확인
```

### 5. 배포 후 테스트

#### buzz-app (일반 사용자)
- 회원가입 테스트
- 로그인 테스트
- 프로필 조회 테스트

#### buzz-biz (사업자)
- 사업자 가입 신청
- 관리자 승인 대기
- SMS 비밀번호 수신
- 로그인 테스트

#### buzz-admin (관리자)
- 가입 신청 목록 확인
- 승인/거부 처리
- SMS 발송 확인

### ⚠️ 주의사항

1. **SUPABASE_SERVICE_KEY는 절대 클라이언트에 노출되면 안됩니다**
   - buzz-admin 서버사이드에서만 사용
   - 프론트엔드 코드에 포함 금지

2. **API_URL 설정**
   - 개발: http://localhost:3003
   - 프로덕션: 실제 백엔드 URL로 변경 필요

3. **CORS 설정**
   - Supabase Dashboard → Authentication → URL Configuration
   - Redirect URLs에 Vercel 도메인 추가

### 📞 문제 발생 시

1. Vercel Build Logs 확인
2. Supabase Logs 확인
3. 브라우저 콘솔 에러 확인
4. 네트워크 탭에서 API 호출 확인