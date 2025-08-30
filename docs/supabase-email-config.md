# Supabase 이메일 인증 설정 가이드

## 문제
- 회원가입 후 로그인 시 "Email not confirmed" 에러 발생
- Supabase는 기본적으로 이메일 인증을 요구함

## 해결 방법

### 방법 1: Supabase 대시보드에서 이메일 인증 비활성화 (개발용)

1. [Supabase Dashboard](https://app.supabase.com) 접속
2. 프로젝트 선택
3. Authentication → Settings → Email Auth 이동
4. "Enable email confirmations" 옵션 비활성화
5. Save 클릭

### 방법 2: 이메일 서비스 설정 (프로덕션용)

1. Authentication → Settings → SMTP Settings
2. 이메일 서비스 제공자 정보 입력:
   - Host: smtp.gmail.com (Gmail 사용 시)
   - Port: 587
   - Username: your-email@gmail.com
   - Password: 앱 비밀번호 (2단계 인증 필요)
   - Sender email: your-email@gmail.com
   - Sender name: BUZZ

### 방법 3: 개발 환경에서 테스트 계정 사용

```javascript
// 테스트 계정 (이메일 인증 없이 사용 가능)
email: test@test.com
password: test123
```

### 방법 4: Supabase SQL Editor에서 직접 사용자 확인

```sql
-- Supabase SQL Editor에서 실행
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'your-email@example.com';
```

## 현재 구현된 기능

1. **이메일 확인 대기 UI**: 회원가입 후 이메일 확인 안내 메시지 표시
2. **에러 메시지 한글화**: "Email not confirmed" → "이메일 인증이 필요합니다"
3. **테스트 계정 지원**: test@test.com으로 개발 테스트 가능

## 추가 설정 (선택사항)

### 이메일 템플릿 커스터마이징

1. Authentication → Email Templates
2. 각 템플릿 수정:
   - Confirm signup: 회원가입 확인 이메일
   - Reset password: 비밀번호 재설정 이메일
   - Magic Link: 매직 링크 로그인 이메일

### 리다이렉트 URL 설정

1. Authentication → URL Configuration
2. Site URL: https://your-domain.com
3. Redirect URLs에 추가:
   - http://localhost:5173/* (개발용)
   - https://your-domain.com/* (프로덕션용)

## 트러블슈팅

### 이메일이 오지 않는 경우
- 스팸 폴더 확인
- SMTP 설정 재확인
- Supabase 로그 확인 (Settings → Logs)

### 이미 가입된 이메일인데 확인이 안 된 경우
- Supabase Dashboard → Authentication → Users
- 해당 사용자 찾기
- Actions → Confirm email manually