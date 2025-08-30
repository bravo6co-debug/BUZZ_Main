// 팝업 배너 관리 서비스
export interface PopupBanner {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  type: 'center' | 'bottom' | 'top' | 'fullscreen';
  priority: number;
  displayFrequency: 'once_ever' | 'once_per_day' | 'once_per_week' | 'always';
  targetConditions?: {
    minVisits?: number;
    university?: string;
    joinedWithin?: number;
  };
  ctaButton?: {
    text: string;
    link: string;
  };
  startDate: string;
  endDate: string;
  isActive: boolean;
  viewCount: number;
  clickCount: number;
  dismissCount: number;
  conversionRate?: number;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

class PopupBannerService {
  private storageKey = 'popup_banners';
  private analyticsKey = 'popup_analytics';

  // 모든 팝업 배너 조회
  async getAllBanners(): Promise<PopupBanner[]> {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : this.getDefaultBanners();
  }

  // 활성 팝업 배너 조회
  async getActiveBanners(): Promise<PopupBanner[]> {
    const banners = await this.getAllBanners();
    const now = new Date();
    
    return banners.filter(banner => 
      banner.isActive && 
      new Date(banner.startDate) <= now && 
      new Date(banner.endDate) >= now
    );
  }

  // 팝업 배너 생성
  async createBanner(banner: Omit<PopupBanner, 'id' | 'viewCount' | 'clickCount' | 'dismissCount' | 'createdAt'>): Promise<PopupBanner> {
    const banners = await this.getAllBanners();
    
    const newBanner: PopupBanner = {
      ...banner,
      id: `popup_${Date.now()}`,
      viewCount: 0,
      clickCount: 0,
      dismissCount: 0,
      createdAt: new Date().toISOString()
    };
    
    banners.push(newBanner);
    localStorage.setItem(this.storageKey, JSON.stringify(banners));
    
    // 감사 로그 기록
    this.logAudit('CREATE', newBanner.id, banner.createdBy);
    
    return newBanner;
  }

  // 팝업 배너 수정
  async updateBanner(id: string, updates: Partial<PopupBanner>): Promise<PopupBanner | null> {
    const banners = await this.getAllBanners();
    const index = banners.findIndex(b => b.id === id);
    
    if (index === -1) return null;
    
    banners[index] = {
      ...banners[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(this.storageKey, JSON.stringify(banners));
    
    // 감사 로그 기록
    this.logAudit('UPDATE', id, updates.updatedBy || 'system');
    
    return banners[index];
  }

  // 팝업 배너 삭제
  async deleteBanner(id: string, deletedBy: string): Promise<boolean> {
    const banners = await this.getAllBanners();
    const filtered = banners.filter(b => b.id !== id);
    
    if (filtered.length === banners.length) return false;
    
    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
    
    // 감사 로그 기록
    this.logAudit('DELETE', id, deletedBy);
    
    return true;
  }

  // 팝업 배너 통계 업데이트
  async updateAnalytics(bannerId: string, action: 'view' | 'click' | 'dismiss'): Promise<void> {
    const banners = await this.getAllBanners();
    const banner = banners.find(b => b.id === bannerId);
    
    if (!banner) return;
    
    switch (action) {
      case 'view':
        banner.viewCount++;
        break;
      case 'click':
        banner.clickCount++;
        break;
      case 'dismiss':
        banner.dismissCount++;
        break;
    }
    
    // 전환율 계산
    if (banner.viewCount > 0) {
      banner.conversionRate = (banner.clickCount / banner.viewCount) * 100;
    }
    
    localStorage.setItem(this.storageKey, JSON.stringify(banners));
    
    // 분석 데이터 저장
    this.saveAnalyticsEvent(bannerId, action);
  }

  // 팝업 배너 통계 조회
  async getBannerAnalytics(bannerId?: string): Promise<any> {
    const banners = await this.getAllBanners();
    
    if (bannerId) {
      const banner = banners.find(b => b.id === bannerId);
      if (!banner) return null;
      
      return {
        bannerId: banner.id,
        title: banner.title,
        views: banner.viewCount,
        clicks: banner.clickCount,
        dismissals: banner.dismissCount,
        conversionRate: banner.conversionRate || 0,
        status: banner.isActive ? 'active' : 'inactive',
        dateRange: {
          start: banner.startDate,
          end: banner.endDate
        }
      };
    }
    
    // 전체 통계
    const totalViews = banners.reduce((sum, b) => sum + b.viewCount, 0);
    const totalClicks = banners.reduce((sum, b) => sum + b.clickCount, 0);
    const totalDismissals = banners.reduce((sum, b) => sum + b.dismissCount, 0);
    
    return {
      totalBanners: banners.length,
      activeBanners: banners.filter(b => b.isActive).length,
      totalViews,
      totalClicks,
      totalDismissals,
      overallConversionRate: totalViews > 0 ? (totalClicks / totalViews) * 100 : 0,
      topPerformers: banners
        .filter(b => b.viewCount > 0)
        .sort((a, b) => (b.conversionRate || 0) - (a.conversionRate || 0))
        .slice(0, 5)
        .map(b => ({
          id: b.id,
          title: b.title,
          conversionRate: b.conversionRate || 0
        }))
    };
  }

  // A/B 테스트 설정
  async setupABTest(originalId: string, variant: Partial<PopupBanner>): Promise<PopupBanner> {
    const banners = await this.getAllBanners();
    const original = banners.find(b => b.id === originalId);
    
    if (!original) throw new Error('Original banner not found');
    
    const variantBanner: PopupBanner = {
      ...original,
      ...variant,
      id: `${originalId}_variant_${Date.now()}`,
      title: variant.title || `${original.title} (Variant)`,
      priority: original.priority, // 같은 우선순위로 설정
      viewCount: 0,
      clickCount: 0,
      dismissCount: 0,
      createdAt: new Date().toISOString(),
      createdBy: variant.createdBy || original.createdBy
    };
    
    return this.createBanner(variantBanner);
  }

  // 예약 발행
  async scheduleBanner(banner: Omit<PopupBanner, 'id' | 'viewCount' | 'clickCount' | 'dismissCount' | 'createdAt'>, publishDate: Date): Promise<PopupBanner> {
    const scheduledBanner = await this.createBanner({
      ...banner,
      isActive: false,
      startDate: publishDate.toISOString()
    });
    
    // 스케줄러 설정 (실제 구현시 백엔드 크론잡 사용)
    this.scheduleActivation(scheduledBanner.id, publishDate);
    
    return scheduledBanner;
  }

  // 긴급 팝업 발행
  async publishEmergencyBanner(
    message: string, 
    duration: number, // 분 단위
    createdBy: string
  ): Promise<PopupBanner> {
    const now = new Date();
    const endDate = new Date(now.getTime() + duration * 60000);
    
    const emergencyBanner: Omit<PopupBanner, 'id' | 'viewCount' | 'clickCount' | 'dismissCount' | 'createdAt'> = {
      title: '긴급 공지',
      content: message,
      type: 'top',
      priority: 999, // 최고 우선순위
      displayFrequency: 'always',
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      isActive: true,
      createdBy,
      ctaButton: {
        text: '확인',
        link: '#'
      }
    };
    
    return this.createBanner(emergencyBanner);
  }

  // Private 메서드들
  private saveAnalyticsEvent(bannerId: string, action: string): void {
    const events = JSON.parse(localStorage.getItem(this.analyticsKey) || '[]');
    events.push({
      bannerId,
      action,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
    
    // 최근 1000개 이벤트만 유지
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }
    
    localStorage.setItem(this.analyticsKey, JSON.stringify(events));
  }

  private logAudit(action: string, bannerId: string, userId: string): void {
    const auditLog = {
      action: `POPUP_BANNER_${action}`,
      bannerId,
      userId,
      timestamp: new Date().toISOString()
    };
    
    const logs = JSON.parse(localStorage.getItem('popup_audit_logs') || '[]');
    logs.push(auditLog);
    
    // 최근 500개 로그만 유지
    if (logs.length > 500) {
      logs.splice(0, logs.length - 500);
    }
    
    localStorage.setItem('popup_audit_logs', JSON.stringify(logs));
  }

  private scheduleActivation(bannerId: string, publishDate: Date): void {
    const delay = publishDate.getTime() - Date.now();
    
    if (delay > 0) {
      setTimeout(async () => {
        await this.updateBanner(bannerId, { isActive: true });
        console.log(`Banner ${bannerId} activated at scheduled time`);
      }, delay);
    }
  }

  private getDefaultBanners(): PopupBanner[] {
    return [
      {
        id: 'default_welcome',
        title: '환영합니다! 🎉',
        content: 'BUZZ 앱에 가입해주셔서 감사합니다. 첫 구매 시 5,000원 할인 쿠폰을 드려요!',
        type: 'center',
        priority: 10,
        displayFrequency: 'once_ever',
        ctaButton: {
          text: '쿠폰 받기',
          link: '/coupons'
        },
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일 후
        isActive: true,
        viewCount: 0,
        clickCount: 0,
        dismissCount: 0,
        createdAt: new Date().toISOString(),
        createdBy: 'system'
      },
      {
        id: 'default_event',
        title: '🎄 12월 특별 이벤트',
        content: '연말 특별 할인! 모든 매장에서 추가 10% 할인',
        type: 'bottom',
        priority: 8,
        displayFrequency: 'once_per_day',
        startDate: new Date().toISOString(),
        endDate: new Date('2024-12-31').toISOString(),
        isActive: true,
        viewCount: 0,
        clickCount: 0,
        dismissCount: 0,
        createdAt: new Date().toISOString(),
        createdBy: 'system'
      }
    ];
  }
}

export const popupBannerService = new PopupBannerService();