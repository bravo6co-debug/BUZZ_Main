# 🚀 Buzz 플랫폼 프론트엔드 API 연동 가이드

> **버전**: v2.0.0  
> **작성일**: 2025-08-30  
> **대상**: 프론트엔드 개발자  
> **목적**: Mock API → 실제 API 서버 연동

---

## 📋 목차

1. [개요 및 현황](#1-개요-및-현황)
2. [API 서버 전환 가이드](#2-api-서버-전환-가이드)
3. [인증 시스템 연동](#3-인증-시스템-연동)
4. [화면별 API 매핑](#4-화면별-api-매핑)
5. [코드 예시](#5-코드-예시)
6. [테스트 가이드](#6-테스트-가이드)
7. [트러블슈팅](#7-트러블슈팅)

---

## 1. 개요 및 현황

### 🎯 연동 목표
Mock API 서버에서 실제 백엔드 API 서버로 전환하여 **실제 데이터베이스 연동** 완성

### 📊 현재 상황
| 구분 | Mock 서버 | 실제 API 서버 |
|------|----------|-------------|
| **URL** | `http://localhost:3003` | `http://localhost:3000` |
| **데이터** | 정적 Mock 데이터 | PostgreSQL 실제 데이터 |
| **인증** | Mock JWT 토큰 | 실제 JWT + 소셜 로그인 |
| **API 개수** | 100+ 엔드포인트 | 100+ 엔드포인트 (동일) |
| **응답 형식** | 표준 JSON | **동일한 응답 형식** ✅ |

### ✅ 호환성 보장
- **응답 형식 100% 동일**: Mock과 실제 API 응답 구조가 완전히 동일
- **엔드포인트 경로 동일**: 모든 API 경로가 Mock과 동일
- **에러 처리 동일**: 에러 코드 및 메시지 형식 동일

---

## 2. API 서버 전환 가이드

### 🔄 전환 절차 (3단계)

#### Step 1: 환경 설정 파일 수정

**`.env` 파일 수정**
```bash
# 개발 환경
REACT_APP_API_BASE_URL=http://localhost:3000/api
# 또는 Vue/Angular의 경우
VUE_APP_API_BASE_URL=http://localhost:3000/api
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

#### Step 2: API 클라이언트 설정 변경

**기존 (Mock 서버)**
```javascript
const API_BASE_URL = 'http://localhost:3003/api';
```

**변경 후 (실제 API 서버)**
```javascript
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';
```

#### Step 3: 실제 API 서버 실행 확인

```bash
# 백엔드 서버 실행 확인
curl http://localhost:3000/api/health

# 예상 응답
{
  "status": "healthy",
  "version": "2.0.0",
  "timestamp": "2025-08-30T10:00:00Z"
}
```

### 🌍 환경별 설정

#### 개발 환경 (Development)
```javascript
// config/api.js
const config = {
  development: {
    apiBaseUrl: 'http://localhost:3000/api',
    mockMode: false
  },
  mock: {
    apiBaseUrl: 'http://localhost:3003/api', 
    mockMode: true
  }
};

export const API_CONFIG = config[process.env.NODE_ENV || 'development'];
```

#### 운영 환경 (Production)
```javascript
const config = {
  production: {
    apiBaseUrl: 'https://api.buzz-platform.kr/api',
    mockMode: false
  }
};
```

---

## 3. 인증 시스템 연동

### 🔐 JWT 토큰 처리

#### 토큰 저장 및 관리
```javascript
// utils/auth.js
class AuthService {
  // 토큰 저장
  setTokens(accessToken, refreshToken) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }
  
  // 토큰 조회
  getAccessToken() {
    return localStorage.getItem('accessToken');
  }
  
  // 토큰 삭제 (로그아웃)
  clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
  
  // 토큰 유효성 검사
  isTokenValid() {
    const token = this.getAccessToken();
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } catch {
      return false;
    }
  }
}

export const authService = new AuthService();
```

#### Axios 인터셉터 설정
```javascript
// api/client.js
import axios from 'axios';
import { authService } from '../utils/auth';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  timeout: 10000,
});

// 요청 인터셉터 - 토큰 자동 첨부
apiClient.interceptors.request.use(
  (config) => {
    const token = authService.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터 - 토큰 만료 처리
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 시 리프레시 시도
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // 원래 요청 재시도
        const originalRequest = error.config;
        originalRequest.headers.Authorization = `Bearer ${authService.getAccessToken()}`;
        return apiClient(originalRequest);
      } else {
        // 리프레시 실패 시 로그아웃
        authService.clearTokens();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// 토큰 갱신
async function refreshAccessToken() {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await axios.post('/api/auth/refresh', { refreshToken });
    
    if (response.data.success) {
      authService.setTokens(
        response.data.data.accessToken,
        response.data.data.refreshToken
      );
      return true;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }
  return false;
}

export default apiClient;
```

### 🔑 소셜 로그인 연동

#### Google 로그인
```javascript
// components/auth/GoogleLogin.js
import { GoogleLogin } from '@react-oauth/google';
import apiClient from '../../api/client';

function GoogleLoginButton() {
  const handleGoogleLogin = async (credentialResponse) => {
    try {
      const response = await apiClient.post('/auth/social/google', {
        idToken: credentialResponse.credential,
        additionalInfo: {
          phone: userInfo.phone,
          university: userInfo.university,
          referralCode: userInfo.referralCode,
          marketingAgree: userInfo.marketingAgree
        }
      });
      
      if (response.data.success) {
        const { user, tokens, rewards } = response.data.data;
        
        // 토큰 저장
        authService.setTokens(tokens.accessToken, tokens.refreshToken);
        
        // 사용자 정보 저장
        setUser(user);
        
        // 보상 알림 (신규가입인 경우)
        if (rewards?.signupBonus) {
          showRewardNotification(rewards.signupBonus);
        }
        
        // 홈으로 이동
        navigate('/home');
      }
    } catch (error) {
      console.error('Google login failed:', error);
      showError('로그인에 실패했습니다.');
    }
  };
  
  return (
    <GoogleLogin
      onSuccess={handleGoogleLogin}
      onError={() => showError('Google 로그인에 실패했습니다.')}
    />
  );
}
```

#### Kakao 로그인
```javascript
// components/auth/KakaoLogin.js
function KakaoLoginButton() {
  const handleKakaoLogin = async () => {
    try {
      // Kakao SDK를 통한 로그인
      const authObj = await window.Kakao.Auth.login();
      
      const response = await apiClient.post('/auth/social/kakao', {
        accessToken: authObj.access_token,
        additionalInfo: {
          phone: userInfo.phone,
          university: userInfo.university,
          referralCode: userInfo.referralCode,
          marketingAgree: userInfo.marketingAgree
        }
      });
      
      if (response.data.success) {
        const { user, tokens, rewards } = response.data.data;
        
        authService.setTokens(tokens.accessToken, tokens.refreshToken);
        setUser(user);
        
        if (rewards?.signupBonus) {
          showRewardNotification(rewards.signupBonus);
        }
        
        navigate('/home');
      }
    } catch (error) {
      console.error('Kakao login failed:', error);
      showError('카카오 로그인에 실패했습니다.');
    }
  };
  
  return (
    <button onClick={handleKakaoLogin} className="kakao-login-btn">
      카카오 로그인
    </button>
  );
}
```

---

## 4. 화면별 API 매핑

### 📱 Buzz-App (사용자 앱)

#### 🏠 홈 화면 (`HomePage.tsx`)
```javascript
// 필요한 API 엔드포인트
const homePageAPIs = [
  // 추천 매장 목록
  'GET /api/stores?featured=true&limit=6',
  
  // 홈 화면 설정 (배너, 노출 순서)
  'GET /api/contents/home-config',
  
  // 활성 팝업 배너
  'GET /api/popup-banners/active',
  
  // 사용자 기본 정보 (마일리지, 쿠폰 개수)
  'GET /api/users/profile'
];

// 실제 구현 예시
useEffect(() => {
  const loadHomeData = async () => {
    try {
      setLoading(true);
      
      const [storesRes, configRes, bannersRes, profileRes] = await Promise.all([
        apiClient.get('/stores?featured=true&limit=6'),
        apiClient.get('/contents/home-config'),
        apiClient.get('/popup-banners/active'),
        apiClient.get('/users/profile')
      ]);
      
      if (storesRes.data.success) {
        setFeaturedStores(storesRes.data.data.stores);
      }
      
      if (configRes.data.success) {
        setHomeConfig(configRes.data.data);
      }
      
      if (bannersRes.data.success) {
        setPopupBanners(bannersRes.data.data.popupBanners);
      }
      
      if (profileRes.data.success) {
        setUserProfile(profileRes.data.data);
      }
      
    } catch (error) {
      console.error('Failed to load home data:', error);
      showError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  loadHomeData();
}, []);
```

#### 📍 지역 추천 화면 (`LocalRecommendationsPage.tsx`)
```javascript
const localRecommendationAPIs = [
  // 지역 컨텐츠 목록
  'GET /api/contents/regional?type=photospot&featured=true',
  'GET /api/contents/regional?type=foodtour&featured=true',
  
  // 특정 컨텐츠 상세
  'GET /api/contents/regional/:id'
];

// 구현 예시
const loadRegionalContent = async (type = '', featured = false) => {
  try {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (featured) params.append('featured', 'true');
    
    const response = await apiClient.get(`/contents/regional?${params}`);
    
    if (response.data.success) {
      setRegionalContent(response.data.data);
    }
  } catch (error) {
    console.error('Failed to load regional content:', error);
  }
};
```

#### 🎪 이벤트 화면 (`EventsPage.tsx`)
```javascript
const eventsPageAPIs = [
  // 진행 중인 이벤트 목록
  'GET /api/events?status=active',
  
  // 이벤트 참여
  'POST /api/events/:id/participate',
  
  // QR 이벤트 (스캔 시)
  'POST /api/qr/scan'
];

// 이벤트 참여 예시
const participateInEvent = async (eventId) => {
  try {
    const response = await apiClient.post(`/events/${eventId}/participate`, {
      agreementTerms: true
    });
    
    if (response.data.success) {
      showSuccess('이벤트 참여가 완료되었습니다!');
      loadEvents(); // 목록 새로고침
    }
  } catch (error) {
    if (error.response?.data?.error?.code === 'EVENT_001') {
      showError('이미 참여한 이벤트입니다.');
    } else {
      showError('이벤트 참여에 실패했습니다.');
    }
  }
};
```

#### 👤 마이페이지 (`MyPage.tsx`)
```javascript
const myPageAPIs = [
  // 프로필 정보
  'GET /api/users/profile',
  'PUT /api/users/profile',
  
  // 마일리지 관련
  'GET /api/mileage/balance',
  'GET /api/mileage/transactions',
  'POST /api/mileage/generate-qr',
  
  // 쿠폰 관련
  'GET /api/coupons/my',
  'POST /api/coupons/:id/generate-qr',
  
  // 리퍼럴 통계
  'GET /api/referral/stats'
];

// 마일리지 QR 생성 예시
const generateMileageQR = async () => {
  try {
    const response = await apiClient.post('/mileage/generate-qr');
    
    if (response.data.success) {
      const { qrCode, balance, expiresIn } = response.data.data;
      setQrData({ qrCode, balance, expiresIn });
      setShowQRModal(true);
    }
  } catch (error) {
    if (error.response?.data?.error?.code === 'MILEAGE_001') {
      showError('마일리지가 부족합니다.');
    } else {
      showError('QR 코드 생성에 실패했습니다.');
    }
  }
};
```

#### 🎓 마케터 페이지 (`MarketerPage.tsx`)
```javascript
const marketerPageAPIs = [
  // 리퍼럴 통계
  'GET /api/referral/stats',
  
  // 리퍼럴 순위
  'GET /api/referral/leaderboard',
  
  // 마케터 교육 컨텐츠
  'GET /api/contents/marketer?type=education',
  
  // 리퍼럴 추적 (링크 생성)
  'POST /api/referral/track'
];

// 리퍼럴 링크 생성 및 공유
const shareReferralLink = async (platform) => {
  try {
    const response = await apiClient.post('/referral/track', {
      utm_source: platform,
      utm_medium: 'social',
      utm_campaign: 'referral_share'
    });
    
    if (response.data.success) {
      const { visitId, referralCode } = response.data.data;
      const shareUrl = `https://buzz.app/ref/${referralCode}?visit=${visitId}`;
      
      // 플랫폼별 공유 로직
      if (platform === 'kakao') {
        shareToKakao(shareUrl);
      } else if (platform === 'copy') {
        await navigator.clipboard.writeText(shareUrl);
        showSuccess('링크가 복사되었습니다!');
      }
    }
  } catch (error) {
    showError('공유 링크 생성에 실패했습니다.');
  }
};
```

### 🏢 Buzz-Admin (관리자 패널)

#### 📊 대시보드 (`Dashboard.tsx`)
```javascript
const adminDashboardAPIs = [
  // 메인 대시보드 데이터
  'GET /api/admin/dashboard',
  
  // 실시간 모니터링
  'GET /api/admin/realtime',
  
  // 월간 리포트
  'GET /api/admin/reports/monthly?yearMonth=2025-08'
];

// 대시보드 데이터 로딩
useEffect(() => {
  const loadDashboardData = async () => {
    try {
      const [dashboardRes, realtimeRes, reportRes] = await Promise.all([
        apiClient.get('/admin/dashboard'),
        apiClient.get('/admin/realtime'),
        apiClient.get('/admin/reports/monthly?yearMonth=2025-08')
      ]);
      
      setDashboardData(dashboardRes.data.data);
      setRealtimeData(realtimeRes.data.data);
      setMonthlyReport(reportRes.data.data);
      
    } catch (error) {
      console.error('Dashboard data loading failed:', error);
    }
  };
  
  loadDashboardData();
  
  // 실시간 데이터 자동 새로고침 (30초마다)
  const interval = setInterval(() => {
    loadRealtimeData();
  }, 30000);
  
  return () => clearInterval(interval);
}, []);
```

#### 💰 예산 관리 (`BudgetManagement.tsx`)
```javascript
const budgetManagementAPIs = [
  // 현재 예산 상태
  'GET /api/admin/budget/current',
  
  // 예산 정책 설정
  'POST /api/admin/budget/settings',
  
  // 긴급 제어
  'POST /api/admin/budget/emergency/control',
  
  // 예산 집행 내역
  'GET /api/admin/budget/executions?startDate=2025-08-01&endDate=2025-08-31'
];

// 긴급 예산 제어 예시
const emergencyControl = async (action, services, reason) => {
  try {
    const response = await apiClient.post('/admin/budget/emergency/control', {
      action, // 'pause' | 'resume' | 'stop'
      services, // ['referral', 'coupons', 'events']
      reason,
      duration: action === 'pause' ? 3600 : null // 1시간 일시정지
    });
    
    if (response.data.success) {
      showSuccess(`${action === 'pause' ? '일시정지' : '중단'} 처리되었습니다.`);
      loadBudgetData(); // 데이터 새로고침
    }
  } catch (error) {
    showError('긴급 제어 처리에 실패했습니다.');
  }
};
```

#### 🏪 매장 관리 (`StoreManagement.tsx`)
```javascript
const storeManagementAPIs = [
  // 매장 승인 대기 목록
  'GET /api/admin/business-applications?status=pending',
  
  // 매장 승인/반려
  'POST /api/admin/business-applications/:id/approve',
  'POST /api/admin/business-applications/:id/reject',
  
  // 노출 공평성 관리
  'GET /api/admin/businesses/exposure-fairness',
  'PUT /api/admin/businesses/exposure-settings'
];

// 매장 승인 처리 예시
const approveBusinessApplication = async (applicationId, businessData) => {
  try {
    const response = await apiClient.post(
      `/admin/business-applications/${applicationId}/approve`,
      {
        approved: true,
        businessName: businessData.name,
        category: businessData.category
      }
    );
    
    if (response.data.success) {
      showSuccess('매장 승인이 완료되었습니다.');
      loadPendingApplications(); // 목록 새로고침
      
      // 승인 알림 발송 (선택사항)
      sendApprovalNotification(response.data.data.email);
    }
  } catch (error) {
    showError('승인 처리에 실패했습니다.');
  }
};
```

#### 📝 컨텐츠 관리 (`ContentManagement.tsx`)
```javascript
const contentManagementAPIs = [
  // 홈 화면 설정
  'GET /api/contents/home-config',
  'PUT /api/admin/contents/home-config',
  
  // 지역 컨텐츠 관리
  'GET /api/contents/regional',
  'POST /api/admin/contents/regional',
  'PUT /api/admin/contents/regional/:id',
  
  // 팝업 배너 관리
  'GET /api/popup-banners/active',
  'POST /api/admin/popup-banners',
  'PUT /api/admin/popup-banners/:id',
  'DELETE /api/admin/popup-banners/:id',
  'GET /api/admin/popup-banners/:id/stats'
];

// 팝업 배너 생성 예시
const createPopupBanner = async (bannerData) => {
  try {
    const response = await apiClient.post('/admin/popup-banners', {
      announcementId: bannerData.announcementId,
      imageUrl: bannerData.imageUrl,
      displayPosition: bannerData.position, // 'center' | 'bottom' | 'top' | 'fullscreen'
      displayFrequency: bannerData.frequency, // 'always' | 'daily' | 'weekly' | 'once'
      targetAudience: bannerData.target, // 'all' | 'new_users' | 'referrers'
      startsAt: bannerData.startsAt,
      endsAt: bannerData.endsAt
    });
    
    if (response.data.success) {
      showSuccess('팝업 배너가 생성되었습니다.');
      loadPopupBanners();
    }
  } catch (error) {
    showError('팝업 배너 생성에 실패했습니다.');
  }
};
```

---

## 5. 코드 예시

### 🔧 API 호출 공통 패턴

#### 표준 API 호출 함수
```javascript
// api/services/baseService.js
class BaseService {
  constructor(apiClient) {
    this.client = apiClient;
  }
  
  // GET 요청
  async get(endpoint, params = {}) {
    try {
      const response = await this.client.get(endpoint, { params });
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  // POST 요청
  async post(endpoint, data = {}) {
    try {
      const response = await this.client.post(endpoint, data);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  // PUT 요청
  async put(endpoint, data = {}) {
    try {
      const response = await this.client.put(endpoint, data);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  // DELETE 요청
  async delete(endpoint) {
    try {
      const response = await this.client.delete(endpoint);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  // 성공 응답 처리
  handleResponse(response) {
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error?.message || 'API 호출에 실패했습니다.');
    }
  }
  
  // 에러 처리
  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      const errorMsg = data.error?.message || `HTTP ${status} 에러`;
      const errorCode = data.error?.code || 'UNKNOWN_ERROR';
      
      return {
        message: errorMsg,
        code: errorCode,
        status,
        details: data.error?.details
      };
    }
    
    return {
      message: error.message || '네트워크 오류',
      code: 'NETWORK_ERROR',
      status: 0
    };
  }
}
```

#### 각 도메인별 서비스 클래스
```javascript
// api/services/authService.js
import { BaseService } from './baseService';

class AuthService extends BaseService {
  // Google 소셜 로그인
  async googleLogin(idToken, additionalInfo) {
    return await this.post('/auth/social/google', {
      idToken,
      additionalInfo
    });
  }
  
  // Kakao 소셜 로그인
  async kakaoLogin(accessToken, additionalInfo) {
    return await this.post('/auth/social/kakao', {
      accessToken,
      additionalInfo
    });
  }
  
  // 이메일 로그인
  async emailLogin(email, password, type) {
    return await this.post('/auth/login', {
      email,
      password,
      type // 'business' | 'admin'
    });
  }
  
  // 토큰 갱신
  async refreshToken(refreshToken) {
    return await this.post('/auth/refresh', {
      refreshToken
    });
  }
  
  // 로그아웃
  async logout() {
    return await this.post('/auth/logout');
  }
}

// api/services/userService.js
class UserService extends BaseService {
  // 프로필 조회
  async getProfile() {
    return await this.get('/users/profile');
  }
  
  // 프로필 수정
  async updateProfile(profileData) {
    return await this.put('/users/profile', profileData);
  }
  
  // 마일리지 잔액 조회
  async getMileageBalance() {
    return await this.get('/mileage/balance');
  }
  
  // 마일리지 거래 내역
  async getMileageTransactions(params) {
    return await this.get('/mileage/transactions', params);
  }
  
  // 마일리지 QR 생성
  async generateMileageQR() {
    return await this.post('/mileage/generate-qr');
  }
  
  // 내 쿠폰 목록
  async getMyCoupons(params) {
    return await this.get('/coupons/my', params);
  }
  
  // 쿠폰 QR 생성
  async generateCouponQR(couponId) {
    return await this.post(`/coupons/${couponId}/generate-qr`);
  }
  
  // 리퍼럴 통계
  async getReferralStats() {
    return await this.get('/referral/stats');
  }
}

// api/services/storeService.js
class StoreService extends BaseService {
  // 매장 목록
  async getStores(params) {
    return await this.get('/stores', params);
  }
  
  // 매장 검색
  async searchStores(params) {
    return await this.get('/stores/search', params);
  }
  
  // 매장 상세 정보
  async getStoreDetail(storeId) {
    return await this.get(`/stores/${storeId}`);
  }
  
  // 매장 카테고리
  async getStoreCategories() {
    return await this.get('/stores/categories');
  }
  
  // 매장 리뷰 작성
  async createStoreReview(storeId, reviewData) {
    return await this.post(`/stores/${storeId}/review`, reviewData);
  }
}
```

### 🎯 React Hook 패턴
```javascript
// hooks/useApi.js
import { useState, useEffect } from 'react';

export function useApi(apiCall, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await apiCall();
        
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, dependencies);
  
  return { data, loading, error, refetch: () => fetchData() };
}

// 사용 예시
function HomePage() {
  const { 
    data: stores, 
    loading: storesLoading, 
    error: storesError 
  } = useApi(() => storeService.getStores({ featured: true, limit: 6 }), []);
  
  const { 
    data: homeConfig, 
    loading: configLoading 
  } = useApi(() => contentService.getHomeConfig(), []);
  
  if (storesLoading || configLoading) {
    return <LoadingSpinner />;
  }
  
  if (storesError) {
    return <ErrorMessage message={storesError.message} />;
  }
  
  return (
    <div>
      <FeaturedStores stores={stores} />
      <HomeConfiguration config={homeConfig} />
    </div>
  );
}
```

### 📱 상태 관리 연동 (Context API)
```javascript
// context/AuthContext.js
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../utils/auth';
import apiClient from '../api/client';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return { 
        ...state, 
        user: action.payload.user, 
        isAuthenticated: true, 
        loading: false 
      };
    case 'LOGIN_FAILURE':
      return { 
        ...state, 
        error: action.payload, 
        loading: false, 
        isAuthenticated: false 
      };
    case 'LOGOUT':
      return { 
        user: null, 
        isAuthenticated: false, 
        loading: false, 
        error: null 
      };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    default:
      return state;
  }
};

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isAuthenticated: false,
    loading: true,
    error: null
  });
  
  // 초기 인증 상태 확인
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = authService.getAccessToken();
      
      if (token && authService.isTokenValid()) {
        try {
          const response = await apiClient.get('/users/profile');
          if (response.data.success) {
            dispatch({ 
              type: 'LOGIN_SUCCESS', 
              payload: { user: response.data.data } 
            });
          }
        } catch (error) {
          authService.clearTokens();
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        dispatch({ type: 'LOGOUT' });
      }
    };
    
    checkAuthStatus();
  }, []);
  
  const login = async (loginData) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      let response;
      
      if (loginData.type === 'google') {
        response = await apiClient.post('/auth/social/google', loginData);
      } else if (loginData.type === 'kakao') {
        response = await apiClient.post('/auth/social/kakao', loginData);
      } else {
        response = await apiClient.post('/auth/login', loginData);
      }
      
      if (response.data.success) {
        const { user, tokens } = response.data.data;
        
        authService.setTokens(tokens.accessToken, tokens.refreshToken);
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user } });
        
        return { success: true, user, rewards: response.data.data.rewards };
      }
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE', payload: error.message });
      return { success: false, error: error.message };
    }
  };
  
  const logout = () => {
    authService.clearTokens();
    dispatch({ type: 'LOGOUT' });
  };
  
  const updateUser = (userData) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
  };
  
  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      logout,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

---

## 6. 테스트 가이드

### 🧪 테스트 계정 정보

#### Mock 서버 테스트 계정
| 구분 | 이메일 | 비밀번호 | 역할 | 비고 |
|------|--------|----------|------|------|
| **사용자** | user1@example.com | - | user | Google 소셜 로그인 |
| **사용자** | user2@example.com | - | user | Kakao 소셜 로그인 |
| **관리자** | admin@buzz-platform.kr | Admin123! | admin | 이메일 로그인 |
| **사업자** | business@example.com | Business123! | business | 이메일 로그인 |
| **정지된 사용자** | suspended@example.com | - | user | 부정 사용 의심 계정 |

#### 실제 API 서버 테스트 계정
| 구분 | 이메일 | 비밀번호 | 역할 | 비고 |
|------|--------|----------|------|------|
| **Super Admin** | superadmin@buzz.com | BuzzAdmin2024! | super_admin | 전체 권한 |
| **Admin** | admin@buzz.com | BuzzAdmin2024! | admin | 일반 관리 |
| **Business Manager** | business.manager@buzz.com | BuzzAdmin2024! | business_manager | 매장 관리 |
| **Content Manager** | content.manager@buzz.com | BuzzAdmin2024! | content_manager | 컨텐츠 관리 |
| **사업자 1** | business1@example.com | Business123! | business | 테스트 레스토랑 |
| **사업자 2** | business2@example.com | Business456! | business | 테스트 카페 |

### 📊 API 테스트 시나리오

#### 1단계: 기본 연결 테스트
```bash
# Health Check
curl http://localhost:3000/api/health

# 예상 응답
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

#### 2단계: 인증 테스트
```javascript
// 관리자 로그인 테스트
const loginTest = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@buzz.com',
        password: 'BuzzAdmin2024!',
        type: 'admin'
      })
    });
    
    const data = await response.json();
    console.log('Login response:', data);
    
    if (data.success) {
      console.log('✅ 로그인 성공');
      console.log('Access Token:', data.data.tokens.accessToken);
      
      // 토큰을 localStorage에 저장
      localStorage.setItem('accessToken', data.data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
    } else {
      console.log('❌ 로그인 실패:', data.error.message);
    }
  } catch (error) {
    console.error('❌ 로그인 오류:', error);
  }
};
```

#### 3단계: 인증된 API 테스트
```javascript
// 대시보드 데이터 조회 테스트
const dashboardTest = async () => {
  try {
    const token = localStorage.getItem('accessToken');
    
    const response = await fetch('http://localhost:3000/api/admin/dashboard', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ 대시보드 데이터 조회 성공');
      console.log('총 사용자:', data.data.overview.totalUsers);
      console.log('예산 사용률:', data.data.budget.executionRate + '%');
    } else {
      console.log('❌ 데이터 조회 실패:', data.error.message);
    }
  } catch (error) {
    console.error('❌ API 호출 오류:', error);
  }
};
```

### 📮 Postman 컬렉션

Postman 컬렉션 JSON 파일 다운로드: 
- **개발용**: `postman-collection-dev.json`
- **운영용**: `postman-collection-prod.json`

```json
{
  "info": {
    "name": "Buzz Platform API",
    "description": "Complete API collection for Buzz Platform",
    "version": "2.0.0"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{accessToken}}",
        "type": "string"
      }
    ]
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000/api",
      "type": "string"
    },
    {
      "key": "accessToken",
      "value": "",
      "type": "string"
    }
  ],
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Admin Login",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/auth/login",
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"admin@buzz.com\",\n  \"password\": \"BuzzAdmin2024!\",\n  \"type\": \"admin\"\n}"
            }
          }
        }
      ]
    }
  ]
}
```

---

## 7. 트러블슈팅

### ⚠️ 자주 발생하는 문제들

#### 🔴 문제 1: CORS 에러
**증상**
```
Access to fetch at 'http://localhost:3000/api/stores' from origin 'http://localhost:3001' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**해결방법**
```javascript
// 1. 백엔드 서버 CORS 설정 확인 (이미 설정됨)
// 2. 프론트엔드에서 프록시 설정 추가

// package.json에 proxy 설정 추가
{
  "name": "buzz-frontend",
  "proxy": "http://localhost:3000",
  // ...
}

// 또는 vite.config.js에 프록시 설정
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
```

#### 🔴 문제 2: 인증 토큰 에러
**증상**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_001",
    "message": "Invalid or expired token"
  }
}
```

**해결방법**
```javascript
// 1. 토큰 유효성 확인
const token = localStorage.getItem('accessToken');
console.log('Current token:', token);

// 2. 토큰 디코딩하여 만료시간 확인
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token expires at:', new Date(payload.exp * 1000));

// 3. 토큰 갱신 시도
const refreshToken = localStorage.getItem('refreshToken');
const response = await fetch('/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
});

// 4. 갱신 실패 시 재로그인 유도
if (!response.ok) {
  localStorage.clear();
  window.location.href = '/login';
}
```

#### 🔴 문제 3: API 응답 형식 차이
**증상**
```javascript
// 예상한 응답
{ success: true, data: {...} }

// 실제 응답  
{ error: "Something went wrong" }
```

**해결방법**
```javascript
// API 응답 검증 함수
const validateResponse = (response) => {
  // 응답이 표준 형식인지 확인
  if (response.data && typeof response.data.success !== 'undefined') {
    return response.data;
  }
  
  // 비표준 응답을 표준 형식으로 변환
  return {
    success: response.status === 200,
    data: response.data,
    error: response.status !== 200 ? { 
      message: response.statusText || 'Unknown error',
      code: 'API_ERROR'
    } : null,
    timestamp: new Date().toISOString()
  };
};

// axios 인터셉터에서 사용
apiClient.interceptors.response.use(
  response => ({ ...response, data: validateResponse(response) }),
  error => Promise.reject(error)
);
```

#### 🔴 문제 4: 개발 서버 접속 불가
**증상**
```
ECONNREFUSED 127.0.0.1:3000
```

**해결방법**
```bash
# 1. 백엔드 서버 실행 상태 확인
curl http://localhost:3000/api/health

# 2. 백엔드 서버 실행
cd c:\dev-project\buzz-main\buzz-backend
npm run dev

# 3. 포트 충돌 확인
netstat -ano | findstr :3000

# 4. 포트 변경 (필요시)
# .env 파일에서 PORT=3001로 변경
```

#### 🔴 문제 5: 데이터베이스 연결 오류
**증상**
```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR", 
    "message": "Database connection failed"
  }
}
```

**해결방법**
```bash
# 1. PostgreSQL 서비스 실행 확인
sc query postgresql-x64-13

# 2. 데이터베이스 연결 테스트
psql -h localhost -U postgres -d buzz_platform

# 3. 마이그레이션 실행
cd c:\dev-project\buzz-main\buzz-backend
npm run db:migrate

# 4. 시드 데이터 생성
npm run db:seed
```

### 🛠️ 디버깅 도구

#### 브라우저 개발자 도구 활용
```javascript
// API 호출 디버깅
const debugApi = (url, options) => {
  console.group(`🔍 API Call: ${options.method || 'GET'} ${url}`);
  console.log('Request options:', options);
  
  return fetch(url, options)
    .then(response => {
      console.log('Response status:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('Response data:', data);
      console.groupEnd();
      return data;
    })
    .catch(error => {
      console.error('API Error:', error);
      console.groupEnd();
      throw error;
    });
};

// 사용 예시
debugApi('/api/users/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

#### 네트워크 모니터링
```javascript
// 네트워크 요청 로깅
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('🌐 Network Request:', args[0]);
  return originalFetch.apply(this, args)
    .then(response => {
      console.log('📡 Network Response:', response.status, response.statusText);
      return response;
    });
};
```

---

## 🎯 마무리 체크리스트

### ✅ 연동 완료 확인

- [ ] **환경 설정**
  - [ ] .env 파일에 API_BASE_URL 설정
  - [ ] 개발/운영 환경 분리 설정
  
- [ ] **인증 시스템**  
  - [ ] JWT 토큰 저장/조회 구현
  - [ ] axios 인터셉터 설정
  - [ ] 토큰 갱신 로직 구현
  - [ ] 소셜 로그인 연동 (Google/Kakao)
  
- [ ] **API 호출**
  - [ ] 모든 화면의 API 연동 완료
  - [ ] 에러 처리 구현
  - [ ] 로딩 상태 처리
  
- [ ] **테스트**
  - [ ] 각 화면별 기능 테스트
  - [ ] 에러 시나리오 테스트
  - [ ] 토큰 만료 시나리오 테스트

### 📞 지원 요청

문제가 해결되지 않을 경우:
1. **로그 확인**: 브라우저 개발자 도구 Console 탭
2. **네트워크 확인**: Network 탭에서 API 호출 상태 확인  
3. **백엔드 상태 확인**: `http://localhost:3000/api/health` 접속
4. **백엔드 개발자에게 연락**: 구체적인 에러 메시지와 함께

---

**🎉 성공적인 API 연동을 위해 화이팅! 🎉**

> 이 가이드를 따라 진행하시면 Mock API에서 실제 API로 완벽하게 전환할 수 있습니다.  
> URL 변경 한 번으로 실제 데이터베이스와 연동된 완전한 시스템이 완성됩니다!