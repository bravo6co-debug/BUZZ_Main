# Buzz Platform Security Policy Document
> Version: 1.0.0  
> Date: 2025-08-30  
> Classification: CONFIDENTIAL

## 📌 Executive Summary

이 문서는 Buzz 플랫폼의 보안 정책 및 구현 가이드라인을 정의합니다. 모든 개발자, 운영자, 관리자는 이 정책을 준수해야 합니다.

---

## 🔐 1. 인증 및 권한 관리 (Authentication & Authorization)

### 1.1 인증 방식

#### 서비스별 인증 체계

##### Buzz (일반 사용자)
- **인증 방식**: 소셜 로그인 전용
  - Google OAuth 2.0
  - Kakao OAuth 2.0
- **토큰 검증**: ID Token 필수 검증
- **회원가입**: 즉시 활성화 (승인 불필요)

##### Buzz-Biz (사장님)
- **인증 방식**: 이메일/비밀번호
- **가입 프로세스**:
  1. 가입 신청 접수 (pending)
  2. Admin 검토 및 승인
  3. 승인 후 로그인 가능
- **보안 강화**: 사업자등록번호 검증

##### Buzz-Admin (관리자)
- **계정 생성**: 최고관리자가 직접 생성
- **초기 비밀번호**: 임시 발급 (24시간 유효)
- **첫 로그인**: 비밀번호 변경 필수
- **2FA**: 필수 설정

#### JWT Token 정책
```typescript
interface TokenPolicy {
  accessToken: {
    algorithm: 'RS256',
    expiresIn: '24h',
    issuer: 'buzz-platform',
    audience: ['buzz-web', 'buzz-biz', 'buzz-admin']
  },
  refreshToken: {
    expiresIn: '7d',
    rotation: true,  // 사용 시마다 새 토큰 발급
    storage: 'httpOnly secure cookie'
  }
}
```

#### 패스워드 정책 (Buzz-Biz, Admin)
- **최소 길이**: 8자
- **복잡도**: 대문자, 소문자, 숫자, 특수문자 중 3가지 이상
- **변경 주기**: 
  - Admin: 90일 필수
  - Buzz-Biz: 180일 권장
- **재사용 금지**: 최근 5개 패스워드
- **암호화**: bcrypt (rounds: 12)

#### 2FA (Two-Factor Authentication)
- **Admin 계정**: 필수
- **Business 계정**: 권장
- **User 계정**: 미지원 (소셜 로그인 사용)
- **방식**: TOTP (Time-based One-Time Password)

### 1.2 권한 관리 (RBAC - Role Based Access Control)

#### 역할 정의
```typescript
enum Roles {
  // Admin 계열 (레벨 1-4)
  SUPER_ADMIN = 'super_admin',           // 최고관리자 (레벨 1)
  ADMIN = 'admin',                       // 관리자 (레벨 2)
  BUSINESS_MANAGER = 'business_manager', // 매장관리자 (레벨 3)
  CONTENT_MANAGER = 'content_manager',   // 컨텐츠관리자 (레벨 4)
  
  // 일반 사용자
  BUSINESS = 'business',                 // 매장 소유자 (Buzz-Biz)
  USER = 'user'                         // 일반 사용자 (Buzz)
}
```

#### 권한 매트릭스 (업데이트)
| 기능 영역 | 최고관리자 | 관리자 | 매장관리자 | 컨텐츠관리자 | Business | User |
|----------|-----------|--------|------------|-------------|----------|------|
| **시스템 설정** | CRUD | - | - | - | - | - |
| **관리자 계정** | CRUD | - | - | - | - | - |
| **사용자 관리** | CRUD | CRUD | - | - | - | - |
| **매장 승인** | CRUD | CRUD | CRU | - | - | - |
| **매장 관리** | CRUD | CRUD | CRU | - | RU (own) | R |
| **정산 관리** | CRUD | CRUD | R | - | R (own) | - |
| **컨텐츠 관리** | CRUD | CRUD | - | CRUD | - | R |
| **이벤트 관리** | CRUD | CRUD | - | CRUD | - | R |
| **예산 관리** | CRUD | R | - | - | - | - |
| **리퍼럴 관리** | CRUD | R | - | - | - | - |
| **감사 로그** | R | R | - | - | - | - |

---

## 🛡️ 2. 데이터 보호 (Data Protection)

### 2.1 암호화 (Encryption)

#### 전송 중 암호화 (In Transit)
- **프로토콜**: TLS 1.3 이상
- **인증서**: EV SSL Certificate
- **HSTS**: max-age=31536000; includeSubDomains; preload
- **최소 암호화 수준**: AES-256-GCM

#### 저장 시 암호화 (At Rest)
```typescript
interface EncryptionPolicy {
  database: {
    method: 'AES-256-CBC',
    keyRotation: '90 days',
    fields: ['phone', 'email', 'bankAccount', 'businessNumber']
  },
  files: {
    method: 'AES-256-GCM',
    storage: 'encrypted S3 bucket'
  },
  backup: {
    method: 'AES-256-CBC',
    keyStorage: 'AWS KMS'
  }
}
```

### 2.2 개인정보 보호 (PII - Personally Identifiable Information)

#### 마스킹 규칙
```typescript
const maskingRules = {
  phone: '010-****-5678',      // 중간 4자리 마스킹
  email: 'us**@example.com',   // @ 앞 중간 부분 마스킹
  name: '홍*동',               // 중간 글자 마스킹
  businessNumber: '***-**-67890' // 앞 5자리 마스킹
};
```

#### 데이터 보존 정책
- **활성 사용자**: 무제한
- **비활성 사용자**: 1년 후 익명화
- **탈퇴 사용자**: 즉시 익명화 (법적 의무 데이터 제외)
- **로그 데이터**: 90일
- **백업 데이터**: 30일

### 2.3 데이터 접근 제어

#### Row Level Security (RLS)
```sql
-- 사용자는 자신의 데이터만 조회 가능
CREATE POLICY user_data_policy ON users
  FOR SELECT USING (auth.uid() = id);

-- 매장 소유자는 자신의 매장 데이터만 수정 가능
CREATE POLICY business_update_policy ON businesses
  FOR UPDATE USING (owner_id = auth.uid());

-- Admin은 모든 데이터 접근 가능
CREATE POLICY admin_full_access ON ALL TABLES
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );
```

---

## 🚨 3. 위협 방어 (Threat Prevention)

### 3.1 OWASP Top 10 대응

#### A01: Broken Access Control
- JWT 토큰 검증 미들웨어
- RBAC 기반 권한 체크
- API 레벨 권한 검증

#### A02: Cryptographic Failures
- 강력한 암호화 알고리즘 사용
- 안전한 키 관리 (AWS KMS)
- 민감 데이터 암호화

#### A03: Injection
```typescript
// SQL Injection 방지
const safeQuery = {
  text: 'SELECT * FROM users WHERE email = $1',
  values: [email] // Parameterized query
};

// NoSQL Injection 방지
const sanitized = validator.escape(userInput);
```

#### A04: Insecure Design
- 보안 설계 리뷰 프로세스
- Threat Modeling
- Security by Design 원칙

#### A05: Security Misconfiguration
```yaml
# 보안 헤더 설정
security_headers:
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Content-Security-Policy: default-src 'self'
  Referrer-Policy: strict-origin-when-cross-origin
```

### 3.2 DDoS 방어

#### Rate Limiting
```typescript
const rateLimits = {
  global: {
    windowMs: 60 * 1000,  // 1분
    max: 60               // 최대 60 요청
  },
  auth: {
    windowMs: 60 * 1000,
    max: 5,
    skipSuccessfulRequests: false
  },
  api: {
    windowMs: 60 * 1000,
    max: 300
  }
};
```

#### IP 차단 정책
```typescript
interface IPBlockingPolicy {
  autoBlock: {
    enabled: true,
    threshold: 100,        // 분당 100회 초과
    duration: 3600,        // 1시간 차단
    escalation: [
      { attempts: 3, duration: 3600 },     // 1시간
      { attempts: 5, duration: 86400 },    // 24시간
      { attempts: 10, duration: 'permanent' }
    ]
  }
}
```

### 3.3 봇 공격 방어

#### 리퍼럴 남용 방지
```typescript
const antiAbuseRules = {
  referral: {
    maxDailyConversions: 10,      // 일일 최대 전환
    minTimeBetweenConversions: 300, // 5분 간격
    suspiciousPatterns: [
      'same_ip_multiple_accounts',
      'rapid_succession_signups',
      'similar_user_agents'
    ]
  }
};
```

#### CAPTCHA 정책
- 로그인 3회 실패 시
- 빠른 연속 가입 시도
- 의심스러운 패턴 감지 시

---

## 🔍 4. 감사 및 모니터링 (Audit & Monitoring)

### 4.1 로깅 정책

#### 필수 로그 항목
```typescript
interface AuditLog {
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  result: 'success' | 'failure';
  ipAddress: string;
  userAgent: string;
  metadata: {
    oldValue?: any;
    newValue?: any;
    reason?: string;
  };
}
```

#### 로그 레벨
- **CRITICAL**: 시스템 장애, 데이터 유출
- **ERROR**: 처리 실패, 권한 위반
- **WARNING**: 비정상 패턴, 임계값 초과
- **INFO**: 일반 작업, 사용자 활동
- **DEBUG**: 개발 환경에서만 사용

### 4.2 실시간 모니터링

#### 모니터링 지표
```typescript
const monitoringMetrics = {
  security: {
    failedLogins: { threshold: 10, window: '5m' },
    unauthorizedAccess: { threshold: 5, window: '1m' },
    suspiciousPatterns: { threshold: 3, window: '10m' }
  },
  performance: {
    apiResponseTime: { threshold: 2000, unit: 'ms' },
    errorRate: { threshold: 0.01, unit: 'percentage' }
  },
  business: {
    abnormalReferrals: { threshold: 50, window: '1h' },
    budgetUsage: { threshold: 0.9, unit: 'percentage' }
  }
};
```

#### 알림 체계
1. **Level 1** (Info): 대시보드 표시
2. **Level 2** (Warning): 이메일 알림
3. **Level 3** (Critical): SMS + 전화 알림
4. **Level 4** (Emergency): 자동 차단 + 긴급 연락

---

## 🆘 5. 사고 대응 (Incident Response)

### 5.1 사고 대응 프로세스

#### 단계별 대응
1. **탐지** (Detection)
   - 자동 모니터링 알림
   - 사용자 신고
   - 정기 보안 점검

2. **분류** (Triage)
   ```typescript
   enum IncidentSeverity {
     P1 = 'Critical - 즉시 대응',
     P2 = 'High - 1시간 내 대응',
     P3 = 'Medium - 24시간 내 대응',
     P4 = 'Low - 정기 처리'
   }
   ```

3. **격리** (Containment)
   - 영향받은 시스템 격리
   - 추가 피해 방지
   - 증거 보존

4. **제거** (Eradication)
   - 원인 제거
   - 취약점 패치
   - 시스템 정화

5. **복구** (Recovery)
   - 서비스 복구
   - 모니터링 강화
   - 정상 운영 확인

6. **사후 분석** (Post-Incident)
   - 원인 분석 보고서
   - 개선 사항 도출
   - 정책 업데이트

### 5.2 비상 연락망

```typescript
const emergencyContacts = {
  securityTeam: {
    primary: 'security@buzz-platform.kr',
    phone: '010-XXXX-XXXX',
    escalation: ['CTO', 'CEO']
  },
  externalSupport: {
    kisa: '118',  // 한국인터넷진흥원
    police: '112' // 사이버수사대
  }
};
```

---

## 📋 6. 컴플라이언스 (Compliance)

### 6.1 법적 준수 사항

#### 개인정보보호법
- 개인정보 수집 최소화
- 명시적 동의 획득
- 안전한 보관 및 파기
- 개인정보 처리방침 공개

#### 정보통신망법
- 본인확인 절차
- 스팸 방지
- 해킹 방지 조치
- 로그 기록 보관 (3개월)

#### 전자상거래법
- 거래 기록 보존 (5년)
- 소비자 권익 보호
- 약관 명시

### 6.2 내부 정책

#### 보안 교육
- **신규 입사자**: 입사 1주일 내
- **정기 교육**: 분기별 1회
- **사고 발생 시**: 즉시 재교육

#### 보안 점검
- **일일 점검**: 자동화 스캔
- **주간 점검**: 로그 리뷰
- **월간 점검**: 취약점 스캔
- **연간 점검**: 모의 해킹

---

## 🔧 7. 보안 설정 가이드

### 7.1 환경 변수 관리

```bash
# .env.production (절대 커밋하지 말 것)
DATABASE_URL=postgresql://encrypted_connection_string
JWT_SECRET=use_aws_secrets_manager
ENCRYPTION_KEY=use_aws_kms
API_KEY=rotate_monthly
```

### 7.2 Dependencies 관리

```json
{
  "scripts": {
    "audit": "npm audit",
    "audit:fix": "npm audit fix",
    "check:deps": "npm-check-updates",
    "security:scan": "snyk test"
  }
}
```

### 7.3 보안 테스트

```typescript
// 보안 테스트 체크리스트
const securityTests = [
  'SQL Injection',
  'XSS (Cross-Site Scripting)',
  'CSRF (Cross-Site Request Forgery)',
  'Authentication Bypass',
  'Authorization Flaws',
  'Session Management',
  'Input Validation',
  'Error Handling',
  'Cryptographic Issues',
  'Business Logic Flaws'
];
```

---

## 📊 8. 보안 메트릭스

### 8.1 KPI (Key Performance Indicators)

| 지표 | 목표 | 측정 주기 |
|-----|------|----------|
| 평균 패치 시간 | < 24시간 | 월간 |
| 보안 사고 발생 | 0건 | 월간 |
| 취약점 발견-수정 시간 | < 72시간 | 주간 |
| 보안 교육 이수율 | 100% | 분기 |
| 침투 테스트 통과율 | > 95% | 연간 |

### 8.2 보안 대시보드

```typescript
interface SecurityDashboard {
  realtime: {
    activeThreats: number;
    blockedIPs: number;
    failedLogins: number;
    suspiciousActivities: Alert[];
  };
  daily: {
    securityEvents: number;
    patchesApplied: number;
    vulnerabilitiesFound: number;
    incidentsResolved: number;
  };
  trends: {
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
    complianceScore: number; // 0-100
    riskScore: number; // 0-100
  };
}
```

---

## 🚀 9. 구현 체크리스트

### 9.1 개발 단계
- [ ] 보안 요구사항 분석
- [ ] Threat Modeling
- [ ] 보안 설계 검토
- [ ] 시큐어 코딩 가이드라인 적용
- [ ] 코드 리뷰 (보안 관점)

### 9.2 테스트 단계
- [ ] 정적 분석 (SAST)
- [ ] 동적 분석 (DAST)
- [ ] 의존성 스캔
- [ ] 침투 테스트
- [ ] 보안 회귀 테스트

### 9.3 배포 단계
- [ ] 환경 변수 확인
- [ ] 보안 설정 검증
- [ ] SSL/TLS 인증서 확인
- [ ] 방화벽 규칙 설정
- [ ] 모니터링 활성화

### 9.4 운영 단계
- [ ] 실시간 모니터링
- [ ] 정기 취약점 스캔
- [ ] 로그 분석
- [ ] 보안 패치 적용
- [ ] 사고 대응 훈련

---

## 📝 10. 보안 정책 버전 관리

### 버전 히스토리
| 버전 | 날짜 | 변경 사항 | 승인자 |
|------|------|----------|--------|
| 1.0.0 | 2025-08-30 | 초기 보안 정책 수립 | CTO |

### 정책 검토 주기
- **정기 검토**: 분기별
- **임시 검토**: 중대 보안 사고 발생 시
- **갱신 주기**: 연 1회 이상

---

## 🔗 참고 문서

### 외부 표준
- OWASP Top 10 (2021)
- ISO 27001/27002
- NIST Cybersecurity Framework
- CIS Controls

### 내부 문서
- 개인정보 처리방침
- 정보보호 관리체계
- 비상 대응 매뉴얼
- 보안 교육 자료

---

## ⚠️ 중요 공지

**이 문서는 기밀 문서입니다.**
- 외부 공개 금지
- 인가된 직원만 열람 가능
- 무단 복사 및 배포 금지
- 문서 폐기 시 완전 삭제 필수

**문의처**
- 보안팀: security@buzz-platform.kr
- 긴급 연락: 010-XXXX-XXXX