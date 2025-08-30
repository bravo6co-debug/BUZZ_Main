// API Configuration for Buzz Admin
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3003',
  TIMEOUT: 30000,
  VERSION: '/api',
  TOKEN_KEY: 'buzz_admin_access_token',
  REFRESH_TOKEN_KEY: 'buzz_admin_refresh_token',
  ADMIN_KEY: 'buzz_admin_info',
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
  
  // 관리자 대시보드 (실제 구현된 백엔드 API)
  DASHBOARD: {
    STATS: '/admin/dashboard/stats',
    RECENT_ACTIVITY: '/admin/dashboard/recent-activity',
  },
  
  // 사용자 관리 (실제 구현된 백엔드 API)
  USERS: {
    LIST: '/admin/users',
    DETAIL: '/admin/users/:id',
    UPDATE_STATUS: '/admin/users/:id/status',
  },
  
  // 비즈니스 관리 (실제 구현된 백엔드 API)
  BUSINESSES: {
    LIST: '/business/list',
    APPLICATIONS: '/business/admin/applications',
    APPROVE: '/business/admin/applications/:id/approve',
    ADMIN_LIST: '/business/admin/list',
    UPDATE_STATUS: '/business/admin/:id/status',
  },
  
  // 예산 관리 (실제 구현된 백엔드 API)
  BUDGET: {
    STATUS: '/admin/budget/status',
    KILL_SWITCH: '/admin/budget/kill-switch',
  },
  
  // 정산 관리 (실제 구현된 백엔드 API)
  SETTLEMENT: {
    LIST: '/settlement/admin/list',
    PROCESS: '/settlement/admin/:id/process',
    COMPLETE: '/settlement/admin/:id/complete',
    STATS: '/settlement/admin/stats',
  },
  
  // 이벤트 관리 (Mock API)
  EVENTS: {
    LIST: '/events',
    CREATE: '/events',
    UPDATE: '/events/:id',
    DELETE: '/events/:id',
    PARTICIPANTS: '/events/:id/participants',
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