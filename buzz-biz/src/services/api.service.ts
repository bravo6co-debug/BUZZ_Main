// API Service Module for Buzz Biz
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

// 인증 관련 API
export const authApi = {
  // 로그인
  async login(businessNumber: string, password: string) {
    const response = await apiService.post(API_ENDPOINTS.AUTH.LOGIN, {
      businessNumber,
      password,
    });
    
    if (response.data?.tokens) {
      localStorage.setItem(API_CONFIG.TOKEN_KEY, response.data.tokens.accessToken);
      localStorage.setItem(API_CONFIG.REFRESH_TOKEN_KEY, response.data.tokens.refreshToken);
      localStorage.setItem(API_CONFIG.BUSINESS_KEY, JSON.stringify(response.data.business));
    }
    
    return response;
  },

  // 회원가입
  async signup(signupData: any) {
    return apiService.post(API_ENDPOINTS.AUTH.SIGNUP, signupData);
  },

  // 비즈니스 등록 신청 (실제 API)
  async applyBusiness(applicationData: any) {
    return apiService.post('/api/business/apply', applicationData);
  },

  // 비즈니스 등록 신청 (직접 Supabase 사용)
  async applyBusinessDirect(applicationData: any) {
    // Supabase를 직접 사용하여 business_applications 테이블에 데이터 삽입
    const { businessInfo, displayTimeSlots, documents, ...otherData } = applicationData;
    
    // business_applications 구조에 맞게 데이터 매핑
    const mappedData = {
      email: otherData.email,
      password_hash: otherData.password, // 실제로는 해시화 필요
      business_name: businessInfo.name,
      business_number: businessInfo.registrationNumber,
      category: businessInfo.category,
      description: businessInfo.description || '',
      address: businessInfo.address,
      phone: businessInfo.phone,
      bank_info: businessInfo.bankAccount || {},
      documents: documents || [],
      display_time_slots: displayTimeSlots || {
        morning: false,
        lunch: false,
        dinner: false,
        night: false
      },
      status: 'pending'
    };

    return {
      success: true,
      data: mappedData,
      message: '신청이 접수되었습니다.',
      timestamp: new Date().toISOString()
    };
  },

  // 사업자 인증
  async verifyBusiness(businessNumber: string) {
    return apiService.post(API_ENDPOINTS.AUTH.VERIFY_BUSINESS, { businessNumber });
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
    localStorage.removeItem(API_CONFIG.BUSINESS_KEY);
    localStorage.removeItem('buzz_biz_logged_in');
  },
};

// 매장 관리 API
export const businessApi = {
  // 매장 프로필 조회
  async getProfile() {
    return apiService.get(API_ENDPOINTS.BUSINESS.PROFILE);
  },

  // 매장 정보 수정
  async updateProfile(data: any) {
    return apiService.put(API_ENDPOINTS.BUSINESS.UPDATE, data);
  },

  // 매장 통계 조회
  async getStats(period?: string) {
    const params = period ? `?period=${period}` : '';
    return apiService.get(`${API_ENDPOINTS.BUSINESS.STATS}${params}`);
  },

  // 영업시간 관리
  async updateHours(hours: any) {
    return apiService.put(API_ENDPOINTS.BUSINESS.HOURS, hours);
  },

  // 메뉴 관리
  async updateMenu(menu: any) {
    return apiService.put(API_ENDPOINTS.BUSINESS.MENU, menu);
  },
};

// QR 스캔 API (실제 백엔드 API와 매핑)
export const qrApi = {
  // QR 코드 검증 (백엔드 /api/coupons/verify)
  async validate(qrData: string) {
    return apiService.post(API_ENDPOINTS.QR.VERIFY, { qrCode: qrData });
  },

  // 쿠폰 사용 처리 (백엔드 /api/coupons/use)
  async process(qrData: string, action: string) {
    if (action === 'use_coupon') {
      // 쿠폰 사용 - 구매 금액 필요 (임시로 10000원 사용)
      return apiService.post(API_ENDPOINTS.QR.USE_COUPON, { 
        qrCode: qrData, 
        purchaseAmount: 10000 
      });
    } else if (action === 'use_mileage') {
      // 마일리지 사용 - 사용할 금액 필요 (임시로 1000원 사용)
      return apiService.post(API_ENDPOINTS.QR.USE_MILEAGE, { 
        qrCode: qrData, 
        amount: 1000 
      });
    }
    throw new Error('Unknown action: ' + action);
  },

  // QR 스캔 (validate와 동일)
  async scan(qrData: string) {
    return this.validate(qrData);
  },

  // QR 스캔 내역 (실제 구현시 백엔드에 추가 필요)
  async getHistory(params?: { page?: number; limit?: number }) {
    // Mock 데이터 반환 (실제 구현시 백엔드 API 추가)
    return {
      success: true,
      data: {
        history: [],
        pagination: { page: 1, limit: 20, total: 0 }
      },
      timestamp: new Date().toISOString()
    };
  },
};

// 쿠폰 관리 API
export const couponApi = {
  // 쿠폰 목록
  async getCoupons() {
    return apiService.get(API_ENDPOINTS.COUPONS.LIST);
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

  // 쿠폰 사용 내역
  async getUsageHistory(id: string) {
    return apiService.get(API_ENDPOINTS.COUPONS.USAGE, { id });
  },
};

// 정산 API (실제 백엔드 API와 매핑)
export const settlementApi = {
  // 정산 가능 금액 조회 (백엔드 /api/settlement/available)
  async getCurrent() {
    return apiService.get(API_ENDPOINTS.SETTLEMENT.AVAILABLE);
  },

  // 정산 내역 (백엔드 /api/settlement/my)
  async getHistory(params?: { page?: number; limit?: number; status?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    
    return apiService.get(`${API_ENDPOINTS.SETTLEMENT.MY}?${queryParams.toString()}`);
  },

  // 정산 요청 (백엔드 /api/settlement/request)
  async requestSettlement(data: { amount: number; description?: string; bankAccount?: any }) {
    return apiService.post(API_ENDPOINTS.SETTLEMENT.REQUEST, data);
  },
};

// 매출 분석 API
export const analyticsApi = {
  // 매출 분석
  async getRevenue(period: string) {
    return apiService.get(`${API_ENDPOINTS.ANALYTICS.REVENUE}?period=${period}`);
  },

  // 고객 분석
  async getCustomers(period: string) {
    return apiService.get(`${API_ENDPOINTS.ANALYTICS.CUSTOMERS}?period=${period}`);
  },

  // 상품 분석
  async getProducts(period: string) {
    return apiService.get(`${API_ENDPOINTS.ANALYTICS.PRODUCTS}?period=${period}`);
  },

  // 트렌드 분석
  async getTrends() {
    return apiService.get(API_ENDPOINTS.ANALYTICS.TRENDS);
  },
};

// 고객 관리 API
export const customerApi = {
  // 고객 목록
  async getCustomers(params?: { page?: number; limit?: number; search?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    
    return apiService.get(`${API_ENDPOINTS.CUSTOMERS.LIST}?${queryParams.toString()}`);
  },

  // 고객 상세
  async getDetail(id: string) {
    return apiService.get(API_ENDPOINTS.CUSTOMERS.DETAIL, { id });
  },

  // 고객 마일리지
  async getMileage(id: string) {
    return apiService.get(API_ENDPOINTS.CUSTOMERS.MILEAGE, { id });
  },

  // 고객 이용 내역
  async getHistory(id: string) {
    return apiService.get(API_ENDPOINTS.CUSTOMERS.HISTORY, { id });
  },
};

// 알림 API
export const notificationApi = {
  // 알림 목록
  async getNotifications() {
    return apiService.get(API_ENDPOINTS.NOTIFICATIONS.LIST);
  },

  // 알림 읽음 처리
  async markAsRead(id: string) {
    return apiService.post(API_ENDPOINTS.NOTIFICATIONS.READ, {}, { id });
  },

  // 알림 설정
  async updateSettings(settings: any) {
    return apiService.put(API_ENDPOINTS.NOTIFICATIONS.SETTINGS, settings);
  },
};

// 파일 업로드 API
export const uploadApi = {
  // 비즈니스 서류 업로드
  async uploadBusinessDocuments(files: File[]) {
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('documents', file);
    });

    try {
      const url = createApiUrl('/api/upload/business-documents');
      const headers = getAuthHeaders();

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers
          // Content-Type은 FormData일 때 자동으로 설정됨
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw data;
      }

      return data;
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  },

  // 업로드 서비스 상태 확인
  async checkUploadService() {
    return apiService.get('/api/upload/health');
  }
};

export default apiService;