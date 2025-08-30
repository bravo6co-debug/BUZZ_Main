# 🔗 프론트엔드 연결 가이드

## ⚡ 즉시 연결 가능!

현재 백엔드 API가 완전히 구현되어 프론트엔드 연결만으로 서비스 런칭이 가능합니다.

---

## 🔧 **환경 설정**

### 1. 프론트엔드 환경변수 (.env)
```env
# API 서버
VITE_API_URL=http://localhost:3003

# Supabase (선택사항 - 직접 연결용)
VITE_SUPABASE_URL=https://ssokfehixfpkbgcghkxy.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# OAuth (실제 키로 교체 필요)
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_KAKAO_CLIENT_ID=your_kakao_client_id
```

### 2. API 서비스 클래스 예시
```javascript
// services/api.js
class BuzzAPI {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3003';
    this.token = localStorage.getItem('buzz_token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` })
      },
      ...options
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'API 요청 실패');
    }
    
    return data;
  }

  // 인증
  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    this.token = data.data.token;
    localStorage.setItem('buzz_token', this.token);
    return data;
  }

  async register(userData) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: userData
    });
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  // 사용자
  async updateProfile(profileData) {
    return this.request('/api/users/profile', {
      method: 'PUT',
      body: profileData
    });
  }

  async getReferralStats() {
    return this.request('/api/users/referral-stats');
  }

  async getMileage() {
    return this.request('/api/users/mileage');
  }

  // QR 코드
  async generateCouponQR(couponId) {
    return this.request(`/api/coupons/${couponId}/generate-qr`, {
      method: 'POST'
    });
  }

  async generateMileageQR() {
    return this.request('/api/coupons/mileage/generate-qr', {
      method: 'POST'
    });
  }

  // 비즈니스 (사장님 앱용)
  async verifyQR(qrCode) {
    return this.request('/api/coupons/verify', {
      method: 'POST',
      body: { qrCode }
    });
  }

  async useCoupon(qrCode, purchaseAmount) {
    return this.request('/api/coupons/use', {
      method: 'POST',
      body: { qrCode, purchaseAmount }
    });
  }

  // 관리자 (관리자 앱용)
  async getDashboardStats() {
    return this.request('/api/admin/dashboard/stats');
  }

  async getBudgetStatus() {
    return this.request('/api/admin/budget/status');
  }

  async toggleKillSwitch(enabled, reason) {
    return this.request('/api/admin/budget/kill-switch', {
      method: 'POST',
      body: { enabled, reason }
    });
  }
}

export default new BuzzAPI();
```

---

## 📱 **앱별 핵심 기능 연결**

### 1. Buzz App (사용자)
```javascript
// 홈 화면 - 매장 목록
const stores = await api.request('/api/business/list?category=food&sort=rating');

// 마이페이지 - QR 코드 생성
const qrData = await api.generateMileageQR();
// qrData.data.qrImage를 <img> src에 사용

// 마이페이지 - 쿠폰 목록
const coupons = await api.request('/api/users/coupons');

// 리퍼럴 페이지 - 통계 조회
const stats = await api.getReferralStats();
```

### 2. Buzz-Biz (사장님)
```javascript
// QR 스캔 후 검증
const qrResult = await api.verifyQR(scannedQRCode);

// 쿠폰 사용 처리
const useResult = await api.useCoupon(qrCode, 15000);

// 정산 요청
const settlement = await api.request('/api/settlement/request', {
  method: 'POST',
  body: { amount: 100000, description: '9월 정산 요청' }
});

// 정산 가능 금액 조회
const available = await api.request('/api/settlement/available');
```

### 3. Buzz-Admin (관리자)
```javascript
// 대시보드 KPI
const stats = await api.getDashboardStats();

// 예산 현황
const budget = await api.getBudgetStatus();

// Kill Switch 활성화
await api.toggleKillSwitch(true, '월 예산 한도 초과');

// 사용자 목록
const users = await api.request('/api/admin/users?page=1&limit=20');

// 정산 승인
await api.request(`/api/settlement/admin/${settlementId}/process`, {
  method: 'POST',
  body: { approved: true }
});
```

---

## 🎯 **빠른 연결 체크리스트**

### ✅ 1단계: API 연결 테스트
```javascript
// 서버 상태 확인
const status = await fetch('http://localhost:3003/api/status').then(r => r.json());
console.log('API Status:', status.message);
```

### ✅ 2단계: 로그인 테스트
```javascript
// 테스트 로그인
const login = await api.login('demo@buzz-platform.kr', 'demo123!');
console.log('Login Success:', login.data.user.name);
```

### ✅ 3단계: 데이터 조회 테스트
```javascript
// 사용자 정보
const me = await api.getMe();
console.log('User Info:', me.data.user);

// 매장 목록
const stores = await api.request('/api/business/list');
console.log('Stores:', stores.data.businesses.length);
```

### ✅ 4단계: QR 생성 테스트
```javascript
// 마일리지 QR 생성
const qr = await api.generateMileageQR();
console.log('QR Generated:', qr.data.qrCode);
// qr.data.qrImage를 이미지로 표시
```

---

## 🚀 **배포 환경 설정**

### Production API URL
```env
# production
VITE_API_URL=https://your-domain.vercel.app

# staging  
VITE_API_URL=https://your-staging-domain.vercel.app
```

### CORS 설정 (필요시)
백엔드의 `simple-server.js`에서 프론트엔드 도메인 추가:
```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173', 
    'https://your-frontend-domain.com'  // 추가
  ],
  credentials: true
}));
```

---

## 🎮 **실시간 테스트 방법**

### 1. 백엔드 시작
```bash
cd buzz-backend
node simple-server.js
```

### 2. 프론트엔드에서 연결
```javascript
// 즉시 사용 가능한 엔드포인트들
console.log('✅ 서버 상태:', await fetch('/api/status').then(r => r.json()));
console.log('✅ 매장 목록:', await fetch('/api/business/list').then(r => r.json()));
console.log('✅ 테스트 로그인:', await api.login('demo@buzz-platform.kr', 'demo123!'));
```

---

## 🔥 **핵심 포인트**

1. **즉시 연결 가능**: 환경변수만 설정하면 모든 기능 사용 가능
2. **완전한 API**: 30+개 엔드포인트 모두 구현 완료
3. **실시간 QR**: 5분 만료 시스템으로 보안 강화
4. **관리자 기능**: 대시보드/예산/정산 모든 기능 완비
5. **확장성**: 추가 기능 쉽게 구현 가능

**🎉 백엔드가 100% 준비되어 프론트엔드 개발에만 집중하면 됩니다!**