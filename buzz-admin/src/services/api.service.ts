// API Service Module for Buzz Admin
import { API_CONFIG, API_ENDPOINTS, getAuthHeaders, createApiUrl } from '../config/api.config';

// Response 타입 정의
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

// API 요청 클래스
class ApiService {
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
    params?: Record<string, string>,
    retried = false
  ): Promise<ApiResponse<T>> {
    const url = createApiUrl(endpoint, params);
    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      // 토큰 만료 처리
      if (!response.ok && data.error?.code === 'AUTH_001' && !retried) {
        try {
          await authApi.refreshToken();
          return this.request<T>(endpoint, options, params, true);
        } catch (refreshError) {
          authApi.logout();
          window.location.href = '/admin';
          throw data;
        }
      }

      if (!response.ok) {
        throw data;
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      
      // 네트워크 오류 처리
      if (error instanceof TypeError) {
        throw {
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: '서버 연결에 실패했습니다.',
          },
          timestamp: new Date().toISOString(),
        };
      }
      
      throw error;
    }
  }

  // GET 요청
  async get<T = any>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' }, params);
  }

  // POST 요청
  async post<T = any>(endpoint: string, data?: any, params?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      params
    );
  }

  // PUT 요청
  async put<T = any>(endpoint: string, data?: any, params?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      params
    );
  }

  // DELETE 요청
  async delete<T = any>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' }, params);
  }
}

// API 서비스 인스턴스
export const apiService = new ApiService();

// 인증 관련 API
export const authApi = {
  // 로그인
  async login(email: string, password: string) {
    const response = await apiService.post(API_ENDPOINTS.AUTH.LOGIN, {
      email,
      password,
    });
    
    if (response.data?.tokens) {
      localStorage.setItem(API_CONFIG.TOKEN_KEY, response.data.tokens.accessToken);
      localStorage.setItem(API_CONFIG.REFRESH_TOKEN_KEY, response.data.tokens.refreshToken);
      localStorage.setItem(API_CONFIG.ADMIN_KEY, JSON.stringify(response.data.admin));
    }
    
    return response;
  },

  // 2FA 인증
  async verify2FA(code: string) {
    return apiService.post(API_ENDPOINTS.AUTH.VERIFY_2FA, { code });
  },

  // 토큰 갱신
  async refreshToken() {
    const refreshToken = localStorage.getItem(API_CONFIG.REFRESH_TOKEN_KEY);
    if (!refreshToken) throw new Error('No refresh token');

    const response = await apiService.post(API_ENDPOINTS.AUTH.REFRESH, {
      refreshToken,
    });
    
    if (response.data?.tokens) {
      localStorage.setItem(API_CONFIG.TOKEN_KEY, response.data.tokens.accessToken);
    }
    
    return response;
  },

  // 로그아웃
  logout() {
    localStorage.removeItem(API_CONFIG.TOKEN_KEY);
    localStorage.removeItem(API_CONFIG.REFRESH_TOKEN_KEY);
    localStorage.removeItem(API_CONFIG.ADMIN_KEY);
    localStorage.removeItem('buzz_admin_logged_in');
  },
};

// 대시보드 API
export const dashboardApi = {
  // 대시보드 개요
  async getOverview() {
    return apiService.get(API_ENDPOINTS.DASHBOARD.OVERVIEW);
  },

  // 통계
  async getStats(period?: string) {
    const params = period ? `?period=${period}` : '';
    return apiService.get(`${API_ENDPOINTS.DASHBOARD.STATS}${params}`);
  },

  // 최근 활동
  async getRecentActivities() {
    return apiService.get(API_ENDPOINTS.DASHBOARD.RECENT_ACTIVITIES);
  },

  // 알림
  async getAlerts() {
    return apiService.get(API_ENDPOINTS.DASHBOARD.ALERTS);
  },
};

// 사용자 관리 API
export const usersApi = {
  // 사용자 목록
  async getUsers(params?: { page?: number; limit?: number; search?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    
    return apiService.get(`${API_ENDPOINTS.USERS.LIST}?${queryParams.toString()}`);
  },

  // 사용자 상세
  async getDetail(id: string) {
    return apiService.get(API_ENDPOINTS.USERS.DETAIL, { id });
  },

  // 사용자 생성
  async createUser(data: any) {
    return apiService.post(API_ENDPOINTS.USERS.CREATE, data);
  },

  // 사용자 수정
  async updateUser(id: string, data: any) {
    return apiService.put(API_ENDPOINTS.USERS.UPDATE, data, { id });
  },

  // 사용자 차단
  async blockUser(id: string) {
    return apiService.post(API_ENDPOINTS.USERS.BLOCK, {}, { id });
  },

  // 사용자 차단 해제
  async unblockUser(id: string) {
    return apiService.post(API_ENDPOINTS.USERS.UNBLOCK, {}, { id });
  },
};

// 사업자 관리 API
export const businessesApi = {
  // 사업자 목록
  async getBusinesses(params?: { page?: number; limit?: number; status?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    
    return apiService.get(`${API_ENDPOINTS.BUSINESSES.LIST}?${queryParams.toString()}`);
  },

  // 사업자 상세
  async getDetail(id: string) {
    return apiService.get(API_ENDPOINTS.BUSINESSES.DETAIL, { id });
  },

  // 사업자 승인
  async approve(id: string) {
    return apiService.post(API_ENDPOINTS.BUSINESSES.APPROVE, {}, { id });
  },

  // 사업자 거절
  async reject(id: string, reason: string) {
    return apiService.post(API_ENDPOINTS.BUSINESSES.REJECT, { reason }, { id });
  },

  // 사업자 정지
  async suspend(id: string, reason: string) {
    return apiService.post(API_ENDPOINTS.BUSINESSES.SUSPEND, { reason }, { id });
  },
};

// 예산 관리 API
export const budgetApi = {
  // 예산 개요
  async getOverview() {
    return apiService.get(API_ENDPOINTS.BUDGET.OVERVIEW);
  },

  // 예산 할당
  async allocate(data: any) {
    return apiService.post(API_ENDPOINTS.BUDGET.ALLOCATE, data);
  },

  // 예산 내역
  async getHistory(params?: { page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    return apiService.get(`${API_ENDPOINTS.BUDGET.HISTORY}?${queryParams.toString()}`);
  },

  // 예산 요청 목록
  async getRequests() {
    return apiService.get(API_ENDPOINTS.BUDGET.REQUESTS);
  },

  // 예산 요청 승인
  async approveRequest(id: string) {
    return apiService.post(API_ENDPOINTS.BUDGET.APPROVE_REQUEST, {}, { id });
  },

  // 예산 요청 거절
  async rejectRequest(id: string, reason: string) {
    return apiService.post(API_ENDPOINTS.BUDGET.REJECT_REQUEST, { reason }, { id });
  },
};

// 정산 관리 API
export const settlementApi = {
  // 대기 중인 정산
  async getPending() {
    return apiService.get(API_ENDPOINTS.SETTLEMENT.PENDING);
  },

  // 정산 내역
  async getHistory(params?: { page?: number; limit?: number; status?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    
    return apiService.get(`${API_ENDPOINTS.SETTLEMENT.HISTORY}?${queryParams.toString()}`);
  },

  // 정산 상세
  async getDetail(id: string) {
    return apiService.get(API_ENDPOINTS.SETTLEMENT.DETAIL, { id });
  },

  // 정산 승인
  async approve(id: string) {
    return apiService.post(API_ENDPOINTS.SETTLEMENT.APPROVE, {}, { id });
  },

  // 정산 거절
  async reject(id: string, reason: string) {
    return apiService.post(API_ENDPOINTS.SETTLEMENT.REJECT, { reason }, { id });
  },

  // 정산 처리
  async process(settlements: string[]) {
    return apiService.post(API_ENDPOINTS.SETTLEMENT.PROCESS, { settlements });
  },
};

// 쿠폰 관리 API
export const couponApi = {
  // 쿠폰 목록
  async getCoupons(params?: { page?: number; limit?: number; type?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type) queryParams.append('type', params.type);
    
    return apiService.get(`${API_ENDPOINTS.COUPONS.LIST}?${queryParams.toString()}`);
  },

  // 쿠폰 생성
  async createCoupon(data: any) {
    return apiService.post(API_ENDPOINTS.COUPONS.CREATE, data);
  },

  // 쿠폰 수정
  async updateCoupon(id: string, data: any) {
    return apiService.put(API_ENDPOINTS.COUPONS.UPDATE, data, { id });
  },

  // 쿠폰 삭제
  async deleteCoupon(id: string) {
    return apiService.delete(API_ENDPOINTS.COUPONS.DELETE, { id });
  },

  // 쿠폰 통계
  async getStatistics() {
    return apiService.get(API_ENDPOINTS.COUPONS.STATISTICS);
  },

  // 대량 쿠폰 생성
  async batchCreate(data: any) {
    return apiService.post(API_ENDPOINTS.COUPONS.BATCH_CREATE, data);
  },
};

// 이벤트 관리 API
export const eventsApi = {
  // 이벤트 목록
  async getEvents(params?: { page?: number; limit?: number; status?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    
    return apiService.get(`${API_ENDPOINTS.EVENTS.LIST}?${queryParams.toString()}`);
  },

  // 이벤트 생성
  async createEvent(data: any) {
    return apiService.post(API_ENDPOINTS.EVENTS.CREATE, data);
  },

  // 이벤트 수정
  async updateEvent(id: string, data: any) {
    return apiService.put(API_ENDPOINTS.EVENTS.UPDATE, data, { id });
  },

  // 이벤트 삭제
  async deleteEvent(id: string) {
    return apiService.delete(API_ENDPOINTS.EVENTS.DELETE, { id });
  },

  // 참가자 목록
  async getParticipants(id: string) {
    return apiService.get(API_ENDPOINTS.EVENTS.PARTICIPANTS, { id });
  },

  // QR 배포
  async distributeQR(id: string, data: any) {
    return apiService.post(API_ENDPOINTS.EVENTS.QR_DISTRIBUTION, data, { id });
  },
};

// 리포트 API
export const reportsApi = {
  // 리포트 생성
  async generate(data: any) {
    return apiService.post(API_ENDPOINTS.REPORTS.GENERATE, data);
  },

  // 리포트 목록
  async getReports() {
    return apiService.get(API_ENDPOINTS.REPORTS.LIST);
  },

  // 리포트 다운로드
  async download(id: string) {
    return apiService.get(API_ENDPOINTS.REPORTS.DOWNLOAD, { id });
  },

  // 리포트 스케줄 설정
  async schedule(data: any) {
    return apiService.post(API_ENDPOINTS.REPORTS.SCHEDULE, data);
  },
};

// 로그 API
export const logsApi = {
  // 시스템 로그
  async getSystemLogs(params?: { page?: number; limit?: number; level?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.level) queryParams.append('level', params.level);
    
    return apiService.get(`${API_ENDPOINTS.LOGS.SYSTEM}?${queryParams.toString()}`);
  },

  // 감사 로그
  async getAuditLogs(params?: { page?: number; limit?: number; user?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.user) queryParams.append('user', params.user);
    
    return apiService.get(`${API_ENDPOINTS.LOGS.AUDIT}?${queryParams.toString()}`);
  },

  // 접근 로그
  async getAccessLogs(params?: { page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    return apiService.get(`${API_ENDPOINTS.LOGS.ACCESS}?${queryParams.toString()}`);
  },

  // 에러 로그
  async getErrorLogs(params?: { page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    return apiService.get(`${API_ENDPOINTS.LOGS.ERROR}?${queryParams.toString()}`);
  },
};

export default apiService;