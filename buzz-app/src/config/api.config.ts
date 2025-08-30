// API Configuration for Buzz App
// 백엔드 개발 완료 후 VITE_API_URL 환경변수만 변경하면 됩니다

export const API_CONFIG = {
  // Mock API 서버 (개발용)
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3003',
  
  // API 타임아웃 설정
  TIMEOUT: 30000,
  
  // API 버전
  VERSION: '/api',
  
  // 인증 토큰 키
  TOKEN_KEY: 'buzz_access_token',
  REFRESH_TOKEN_KEY: 'buzz_refresh_token',
};

// API 엔드포인트 (백엔드 API와 완전 매핑됨)
export const API_ENDPOINTS = {
  // 인증 (실제 구현된 백엔드 API)
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    GOOGLE_LOGIN: '/auth/social/google',
    KAKAO_LOGIN: '/auth/social/kakao', 
    ME: '/auth/me',
    TEST_LOGIN: '/auth/test-login',
  },
  
  // 사용자 관리 (실제 구현된 백엔드 API)
  USERS: {
    PROFILE: '/users/profile',
    REFERRAL_STATS: '/users/referral-stats',
    REFERRAL_LINK: '/users/referral-link',
    COUPONS: '/users/coupons',
    MILEAGE: '/users/mileage',
    TRANSACTIONS: '/users/mileage/transactions',
  },
  
  // 매장 (실제 구현된 백엔드 API)  
  BUSINESSES: {
    LIST: '/business/list',
    APPLY: '/business/apply',
    MY: '/business/my',
  },
  
  // 쿠폰 & QR (실제 구현된 백엔드 API)
  COUPONS: {
    GENERATE_QR: '/coupons/:id/generate-qr',
    MILEAGE_QR: '/coupons/mileage/generate-qr',
    VERIFY: '/coupons/verify',
    USE: '/coupons/use',
    MILEAGE_USE: '/coupons/mileage/use',
  },
  
  // 테스트 & 상태
  TEST: {
    STATUS: '/status',
    HEALTH: '/health',
    USERS: '/test/users',
    CREATE_USER: '/test/create-user',
  },
};

// API 헤더 생성 함수
export const getAuthHeaders = () => {
  const token = localStorage.getItem(API_CONFIG.TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// API URL 생성 함수
export const createApiUrl = (endpoint: string, params?: Record<string, string>) => {
  let url = `${API_CONFIG.BASE_URL}${API_CONFIG.VERSION}${endpoint}`;
  
  if (params) {
    Object.keys(params).forEach(key => {
      url = url.replace(`:${key}`, params[key]);
    });
  }
  
  return url;
};