// API Configuration for Buzz Biz
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3003',
  TIMEOUT: 30000,
  VERSION: '/api',
  TOKEN_KEY: 'buzz_biz_access_token',
  REFRESH_TOKEN_KEY: 'buzz_biz_refresh_token',
  BUSINESS_KEY: 'buzz_biz_business_info',
};

// API Endpoints (실제 백엔드 API와 매핑됨)
export const API_ENDPOINTS = {
  // 인증 (실제 구현된 백엔드 API)
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    TEST_LOGIN: '/auth/test-login',
    ME: '/auth/me',
  },
  
  // 비즈니스 관리 (실제 구현된 백엔드 API)
  BUSINESS: {
    APPLY: '/business/apply',
    LIST: '/business/list',
    MY: '/business/my',
  },
  
  // QR & 쿠폰 스캔 (실제 구현된 백엔드 API)
  QR: {
    VERIFY: '/coupons/verify',
    USE_COUPON: '/coupons/use',
    USE_MILEAGE: '/coupons/mileage/use',
  },
  
  // 정산 (실제 구현된 백엔드 API)
  SETTLEMENT: {
    REQUEST: '/settlement/request',
    MY: '/settlement/my',
    AVAILABLE: '/settlement/available',
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