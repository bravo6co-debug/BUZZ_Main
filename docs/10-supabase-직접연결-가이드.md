# 🚀 Supabase 직접 연결 구현 가이드

> **작성일**: 2025-08-30  
> **대상**: 개발팀  
> **목표**: 백엔드 API 대기 없이 1주 내 완전 동작하는 시스템 구축

## 📋 개요

현재 Supabase 데이터베이스(46개 테이블)가 완전 구축된 상황에서, 외주 백엔드 완성을 기다리지 않고 프론트엔드에서 직접 Supabase를 연결하여 즉시 동작하는 시스템을 만드는 가이드입니다.

### 🎯 목표
- **1주 내** 완전 동작하는 베타 서비스 런칭
- 실제 사용자 테스트 가능
- 외주 백엔드 완성시 **간단한 API 교체**로 마이그레이션

---

## 🏗️ 아키텍처 전략

### 현재 상황
```
📱 Frontend (✅ 완료) ← Mock API → 🔄 Backend (외주 중) ← 💾 Supabase DB (✅ 완료)
```

### 목표 아키텍처
```
📱 Frontend (✅ 완료) ← 직접 연결 → 💾 Supabase DB (✅ 완료)
```

### 최종 마이그레이션
```
📱 Frontend (✅ 완료) ← API 교체 → ✅ Backend API ← 💾 Supabase DB (✅ 완료)
```

---

## 📅 1주 구현 일정

### Day 1-2: Supabase 클라이언트 설정
```typescript
🔧 각 앱에 Supabase 클라이언트 추가
├── 📦 @supabase/supabase-js 설치
├── ⚙️ 환경 변수 설정
├── 🔗 클라이언트 초기화
└── 🧪 연결 테스트
```

### Day 3-4: 핵심 기능 구현
```typescript
🚀 필수 기능 연결
├── 🔐 인증 시스템 (Supabase Auth)
├── 🏪 매장 데이터 CRUD
├── 🎫 쿠폰/마일리지 시스템
└── 👤 사용자 프로필 관리
```

### Day 5-6: 실시간 기능 및 고급 기능
```typescript
⚡ 실시간 및 고급 기능
├── 📡 실시간 알림 (Realtime)
├── 📱 QR 코드 생성/검증
├── ⭐ 리뷰 시스템 연동
└── 📊 통계 데이터 처리
```

### Day 7: 통합 테스트 및 베타 런칭
```typescript
🎉 최종 점검 및 런칭
├── 🧪 전체 기능 테스트
├── 🔒 보안 검증
├── 🚀 베타 배포
└── 📈 모니터링 설정
```

---

## 🛠️ 구현 단계별 가이드

### Step 1: Supabase 클라이언트 설정

#### 1.1 패키지 설치
```bash
# 각 앱 디렉토리에서 실행
cd buzz-app && npm install @supabase/supabase-js
cd buzz-biz && npm install @supabase/supabase-js  
cd buzz-admin && npm install @supabase/supabase-js
```

#### 1.2 환경 변수 설정
```typescript
// .env 파일에 추가
VITE_SUPABASE_URL=https://ssokfehixfpkbgcghkxy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzb2tmZWhpeGZwa2JnY2doa3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NDIwOTcsImV4cCI6MjA3MjExODA5N30.U8DM6l6_P-cDMzAIZab_xZ3RlD80IshB3YGFkBt5K2g
```

#### 1.3 Supabase 클라이언트 생성
```typescript
// src/lib/supabase.ts (각 앱에 생성)
import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
```

### Step 2: 인증 시스템 구현

#### 2.1 소셜 로그인 (Buzz App)
```typescript
// src/services/auth.service.ts
import { supabase } from '../lib/supabase'

export const authService = {
  // Google 로그인
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { data, error }
  },

  // Kakao 로그인 (Supabase에서 설정 필요)
  async signInWithKakao() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { data, error }
  },

  // 로그아웃
  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // 현재 사용자 정보
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  }
}
```

#### 2.2 이메일/비밀번호 인증 (Buzz-Biz, Admin)
```typescript
// 사업자/관리자 로그인
export const businessAuthService = {
  async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  async signUp(email: string, password: string, metadata: any) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    return { data, error }
  }
}
```

### Step 3: 데이터 서비스 구현

#### 3.1 매장 관리 서비스
```typescript
// src/services/business.service.ts
import { supabase } from '../lib/supabase'

export const businessService = {
  // 추천 매장 조회
  async getFeaturedBusinesses() {
    const { data, error } = await supabase
      .from('businesses')
      .select(`
        *,
        business_categories(*),
        reviews(rating)
      `)
      .eq('status', 'active')
      .eq('featured', true)
      .limit(10)
    
    return { data, error }
  },

  // 매장 상세 정보
  async getBusinessDetail(id: string) {
    const { data, error } = await supabase
      .from('businesses')
      .select(`
        *,
        business_categories(*),
        reviews(*),
        business_hours(*)
      `)
      .eq('id', id)
      .single()
    
    return { data, error }
  },

  // 매장 등록
  async createBusiness(businessData: any) {
    const { data, error } = await supabase
      .from('businesses')
      .insert([businessData])
      .select()
    
    return { data, error }
  }
}
```

#### 3.2 쿠폰 관리 서비스
```typescript
// src/services/coupon.service.ts
export const couponService = {
  // 내 쿠폰 목록
  async getMyCoupons(userId: string) {
    const { data, error } = await supabase
      .from('user_coupons')
      .select(`
        *,
        coupons(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
    
    return { data, error }
  },

  // 쿠폰 사용
  async useCoupon(userCouponId: string) {
    const { data, error } = await supabase.rpc('use_coupon', {
      user_coupon_id: userCouponId
    })
    
    return { data, error }
  },

  // QR 코드 생성 (임시 데이터)
  async generateCouponQR(couponId: string) {
    const qrData = `BUZZ_COUPON_${couponId}_${Date.now()}`
    return { 
      data: { qr_code: qrData, expires_at: Date.now() + 5 * 60 * 1000 },
      error: null 
    }
  }
}
```

#### 3.3 마일리지 관리 서비스
```typescript
// src/services/mileage.service.ts
export const mileageService = {
  // 마일리지 잔액 조회
  async getBalance(userId: string) {
    const { data, error } = await supabase
      .from('mileage_accounts')
      .select('balance')
      .eq('user_id', userId)
      .single()
    
    return { data, error }
  },

  // 마일리지 사용
  async useMileage(userId: string, amount: number, businessId: string) {
    const { data, error } = await supabase.rpc('use_mileage', {
      p_user_id: userId,
      p_amount: amount,
      p_business_id: businessId
    })
    
    return { data, error }
  },

  // 마일리지 적립
  async earnMileage(userId: string, amount: number, source: string) {
    const { data, error } = await supabase.rpc('earn_mileage', {
      p_user_id: userId,
      p_amount: amount,
      p_source: source
    })
    
    return { data, error }
  }
}
```

### Step 4: 실시간 기능 구현

#### 4.1 실시간 알림 시스템
```typescript
// src/services/notification.service.ts
export const notificationService = {
  // 실시간 알림 구독
  subscribeToNotifications(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
  },

  // 알림 읽음 처리
  async markAsRead(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
    
    return { error }
  }
}
```

#### 4.2 실시간 QR 상태 업데이트
```typescript
// QR 코드 실시간 만료 처리
export const qrService = {
  subscribeToQRUpdates(qrId: string, callback: (payload: any) => void) {
    return supabase
      .channel('qr_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'qr_codes',
          filter: `id=eq.${qrId}`
        },
        callback
      )
      .subscribe()
  }
}
```

### Step 5: 기존 API 서비스 교체

#### 5.1 API 서비스 파일 수정
```typescript
// src/services/api.service.ts 기존 파일을 수정
import { supabase } from '../lib/supabase'
import { businessService } from './business.service'
import { couponService } from './coupon.service'
import { mileageService } from './mileage.service'

// 기존 API 호출을 Supabase 서비스로 교체
export const businessApi = {
  getFeaturedBusinesses: businessService.getFeaturedBusinesses,
  getBusinessDetail: businessService.getBusinessDetail,
  // ... 기타 메소드들
}

export const couponApi = {
  getMyCoupons: (userId: string) => couponService.getMyCoupons(userId),
  useCoupon: couponService.useCoupon,
  // ... 기타 메소드들
}
```

---

## 🔒 보안 및 권한 설정

### Row Level Security (RLS) 정책 예시
```sql
-- 사용자는 자신의 데이터만 조회 가능
CREATE POLICY "Users can view own data" ON user_profiles
FOR SELECT USING (auth.uid() = user_id);

-- 매장 데이터는 공개
CREATE POLICY "Anyone can view active businesses" ON businesses
FOR SELECT USING (status = 'active');

-- 관리자만 모든 데이터 접근 가능
CREATE POLICY "Admins can access all data" ON businesses
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);
```

---

## 🧪 테스트 시나리오

### Day 7: 통합 테스트 체크리스트

#### ✅ 기본 기능 테스트
- [ ] Google/Kakao 소셜 로그인 동작
- [ ] 매장 목록 조회 및 필터링  
- [ ] 쿠폰 발급 및 사용
- [ ] 마일리지 적립 및 사용
- [ ] QR 코드 생성 및 만료

#### ✅ 실시간 기능 테스트
- [ ] 실시간 알림 수신
- [ ] QR 상태 실시간 업데이트
- [ ] 매장 정보 실시간 동기화

#### ✅ 보안 테스트
- [ ] RLS 정책 동작 확인
- [ ] 권한별 데이터 접근 제한
- [ ] 토큰 자동 갱신

#### ✅ 성능 테스트
- [ ] 페이지 로딩 속도 (<2초)
- [ ] API 응답 시간 체크
- [ ] 대용량 데이터 처리

---

## 🔄 추후 마이그레이션 계획

### 외주 백엔드 완성시 교체 절차

#### Step 1: API 엔드포인트 준비
```typescript
// 환경변수로 API 모드 전환
const USE_BACKEND_API = import.meta.env.VITE_USE_BACKEND_API === 'true'

export const businessApi = {
  async getFeaturedBusinesses() {
    if (USE_BACKEND_API) {
      // 기존 fetch API 사용
      return await fetch('/api/businesses/featured')
    } else {
      // Supabase 직접 연결
      return await businessService.getFeaturedBusinesses()
    }
  }
}
```

#### Step 2: 점진적 마이그레이션
```bash
# Phase 1: 읽기 전용 API부터 교체
VITE_MIGRATE_READ_API=true

# Phase 2: 쓰기 API 교체  
VITE_MIGRATE_WRITE_API=true

# Phase 3: 완전 교체
VITE_USE_BACKEND_API=true
```

#### Step 3: 데이터 일관성 검증
- 백엔드 API와 Supabase 데이터 동기화 확인
- 실시간 기능 호환성 테스트
- 성능 벤치마크 비교

---

## 📊 예상 성과

### 1주 후 달성 가능한 목표
- ✅ **완전 동작하는 베타 서비스**: 실제 사용자 테스트 가능
- ✅ **실시간 사용자 피드백**: UX/UI 개선 데이터 수집  
- ✅ **마케팅 자료 준비**: 동작하는 시스템으로 홍보 가능
- ✅ **투자 유치 준비**: 완성도 있는 데모 시연 가능

### 기술적 이점
- 🚀 **빠른 개발 속도**: 백엔드 없이 즉시 개발 가능
- 🔄 **유연한 마이그레이션**: 추후 쉬운 백엔드 교체
- 📊 **실제 데이터 수집**: 진짜 사용 패턴 분석 가능
- 🛡️ **검증된 보안**: Supabase 보안 시스템 활용

---

## 🚀 시작하기

### 즉시 시작 가능한 작업
1. **환경 변수 설정** (10분)
2. **Supabase 클라이언트 설치** (30분)  
3. **기본 인증 구현** (2시간)
4. **매장 데이터 연동** (3시간)

### 첫날 목표
오늘 시작하면 **하루 만에 로그인과 매장 조회가 동작하는 시스템**을 만들 수 있습니다!

**지금 바로 시작해서 1주 후 완전한 베타 서비스를 런칭하시겠습니까?** 🚀