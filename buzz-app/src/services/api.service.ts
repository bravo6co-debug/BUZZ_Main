// API Service Module for Buzz App
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
          window.location.href = '/';
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
            message: '네트워크 연결을 확인해주세요.',
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

// 인증 관련 API (실제 백엔드 API 매핑)
export const authApi = {
  // 회원가입
  async register(userData: {
    email: string;
    password: string;
    name: string;
    marketingConsent?: boolean;
    referralCode?: string;
  }) {
    const response = await apiService.post(API_ENDPOINTS.AUTH.REGISTER, userData);
    
    if (response.data?.token) {
      localStorage.setItem(API_CONFIG.TOKEN_KEY, response.data.token);
      localStorage.setItem('buzz_logged_in', 'true');
    }
    
    return response;
  },

  // 로그인
  async login(email: string, password: string) {
    const response = await apiService.post(API_ENDPOINTS.AUTH.LOGIN, {
      email,
      password,
    });
    
    if (response.data?.token) {
      localStorage.setItem(API_CONFIG.TOKEN_KEY, response.data.token);
      localStorage.setItem('buzz_logged_in', 'true');
    }
    
    return response;
  },

  // Google 로그인 (데모)
  async googleLogin(idToken: string, additionalInfo?: any) {
    const response = await apiService.post(API_ENDPOINTS.AUTH.GOOGLE_LOGIN, {
      idToken,
      additionalInfo,
    });
    
    if (response.data?.token) {
      localStorage.setItem(API_CONFIG.TOKEN_KEY, response.data.token);
      localStorage.setItem('buzz_logged_in', 'true');
    }
    
    return response;
  },

  // 테스트 로그인 (데모용)
  async testLogin(email: string) {
    const response = await apiService.post(API_ENDPOINTS.AUTH.TEST_LOGIN, {
      email,
    });
    
    if (response.data?.token || response.data?.user) {
      // 임시 토큰 저장 (실제로는 response.data.token 사용)
      localStorage.setItem(API_CONFIG.TOKEN_KEY, response.data?.token || 'fake-jwt-token');
      localStorage.setItem('buzz_logged_in', 'true');
    }
    
    return response;
  },

  // 내 정보 조회
  async getMe() {
    return apiService.get(API_ENDPOINTS.AUTH.ME);
  },

  // 로그아웃
  logout() {
    localStorage.removeItem(API_CONFIG.TOKEN_KEY);
    localStorage.removeItem(API_CONFIG.REFRESH_TOKEN_KEY);
    localStorage.removeItem('buzz_logged_in');
  },
};

// 매장 관련 API (실제 백엔드 API 매핑)
export const businessApi = {
  // 매장 목록 조회 (공개)
  async getBusinesses(params?: { 
    page?: number; 
    limit?: number; 
    category?: string; 
    status?: string; 
    sort?: string; 
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.category) queryParams.append('category', params.category);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.sort) queryParams.append('sort', params.sort);
    
    return apiService.get(`${API_ENDPOINTS.BUSINESSES.LIST}?${queryParams.toString()}`);
  },

  // 매장 등록 신청
  async applyBusiness(businessData: {
    email: string;
    password: string;
    businessInfo: {
      name: string;
      registrationNumber: string;
      category: string;
      address: string;
      phone: string;
      description?: string;
      bankAccount?: any;
    };
  }) {
    return apiService.post(API_ENDPOINTS.BUSINESSES.APPLY, businessData);
  },
};

// 사용자 관리 API (실제 백엔드 API 매핑)
export const userApi = {
  // 프로필 수정
  async updateProfile(profileData: {
    name?: string;
    university?: string;
    marketingConsent?: boolean;
  }) {
    return apiService.put(API_ENDPOINTS.USERS.PROFILE, profileData);
  },

  // 리퍼럴 통계 조회
  async getReferralStats() {
    return apiService.get(API_ENDPOINTS.USERS.REFERRAL_STATS);
  },

  // 리퍼럴 링크 생성
  async getReferralLink(params?: { platform?: string }) {
    const queryParams = params ? new URLSearchParams(params).toString() : '';
    return apiService.get(`${API_ENDPOINTS.USERS.REFERRAL_LINK}?${queryParams}`);
  },

  // 내 쿠폰 목록
  async getMyCoupons(params?: { status?: string; page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    return apiService.get(`${API_ENDPOINTS.USERS.COUPONS}?${queryParams.toString()}`);
  },

  // 마일리지 정보 조회
  async getMileage() {
    return apiService.get(API_ENDPOINTS.USERS.MILEAGE);
  },

  // 마일리지 거래 내역
  async getMileageTransactions(params?: { page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    return apiService.get(`${API_ENDPOINTS.USERS.TRANSACTIONS}?${queryParams.toString()}`);
  },
};

// 쿠폰 & QR 관련 API (실제 백엔드 API 매핑)
export const couponApi = {
  // 쿠폰 QR 코드 생성
  async generateQR(couponId: string) {
    return apiService.post(API_ENDPOINTS.COUPONS.GENERATE_QR, {}, { id: couponId });
  },

  // 마일리지 QR 코드 생성
  async generateMileageQR() {
    return apiService.post(API_ENDPOINTS.COUPONS.MILEAGE_QR);
  },

  // QR 코드 검증 (비즈니스용)
  async verifyQR(qrCode: string) {
    return apiService.post(API_ENDPOINTS.COUPONS.VERIFY, { qrCode });
  },

  // 쿠폰 사용 처리 (비즈니스용)
  async useCoupon(qrCode: string, purchaseAmount: number) {
    return apiService.post(API_ENDPOINTS.COUPONS.USE, { qrCode, purchaseAmount });
  },

  // 마일리지 사용 처리 (비즈니스용)
  async useMileage(qrCode: string, amount: number) {
    return apiService.post(API_ENDPOINTS.COUPONS.MILEAGE_USE, { qrCode, amount });
  },
};

// 테스트 & 상태 API (실제 백엔드 API 매핑)
export const testApi = {
  // API 상태 조회
  async getStatus() {
    return apiService.get(API_ENDPOINTS.TEST.STATUS);
  },

  // 헬스 체크
  async getHealth() {
    return apiService.get(API_ENDPOINTS.TEST.HEALTH);
  },

  // 테스트 사용자 목록
  async getTestUsers() {
    return apiService.get(API_ENDPOINTS.TEST.USERS);
  },

  // 테스트 사용자 생성
  async createTestUser() {
    return apiService.post(API_ENDPOINTS.TEST.CREATE_USER);
  },
};

export default apiService;