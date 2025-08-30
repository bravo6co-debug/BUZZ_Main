// 예산 자동 차단 서비스
import { auditLogService, logAction } from './auditLog.service';

export interface BudgetSettings {
  monthlyBudget: number;
  dailyLimit: number;
  warningThreshold: number; // 경고 임계값 (%)
  autoBlockEnabled: boolean;
  blockedEvents: string[]; // 차단된 이벤트 ID 목록
}

export interface BudgetUsage {
  date: string;
  totalUsed: number;
  dailyUsed: number;
  remainingBudget: number;
  remainingDaily: number;
  usagePercentage: number;
  status: 'normal' | 'warning' | 'exceeded' | 'blocked';
}

export interface EmergencyControl {
  id: string;
  name: string;
  description: string;
  type: 'all_events' | 'new_signups' | 'referral_rewards' | 'qr_events';
  enabled: boolean;
  blockedSince?: string;
  blockedBy?: string;
}

class BudgetControlService {
  private readonly SETTINGS_KEY = 'budget_settings';
  private readonly USAGE_KEY = 'budget_usage';
  private readonly EMERGENCY_KEY = 'emergency_controls';
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeSettings();
    this.startMonitoring();
  }

  // 초기 설정
  private initializeSettings() {
    const existing = localStorage.getItem(this.SETTINGS_KEY);
    if (!existing) {
      const defaultSettings: BudgetSettings = {
        monthlyBudget: 10000000, // 1천만원
        dailyLimit: 500000, // 50만원
        warningThreshold: 80, // 80%
        autoBlockEnabled: true,
        blockedEvents: []
      };
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(defaultSettings));
    }
  }

  // 예산 모니터링 시작
  private startMonitoring() {
    // 5분마다 예산 체크
    this.checkInterval = setInterval(() => {
      this.checkBudgetStatus();
    }, 5 * 60 * 1000);

    // 초기 체크
    this.checkBudgetStatus();
  }

  // 예산 상태 체크 및 자동 차단
  async checkBudgetStatus(): Promise<BudgetUsage> {
    const settings = this.getSettings();
    const usage = this.getCurrentUsage();

    // 일일 한도 초과 체크
    if (usage.dailyUsed >= settings.dailyLimit) {
      if (settings.autoBlockEnabled) {
        this.activateEmergencyBlock('daily_limit_exceeded');
        logAction.budgetExceeded('daily_limit', usage.dailyUsed);
      }
      usage.status = 'blocked';
    }
    // 월 예산 초과 체크
    else if (usage.totalUsed >= settings.monthlyBudget) {
      if (settings.autoBlockEnabled) {
        this.activateEmergencyBlock('monthly_budget_exceeded');
        logAction.budgetExceeded('monthly_budget', usage.totalUsed);
      }
      usage.status = 'exceeded';
    }
    // 경고 임계값 체크
    else if (usage.usagePercentage >= settings.warningThreshold) {
      usage.status = 'warning';
      // 관리자에게 알림 (실제 구현시 이메일/SMS 등)
      console.warn(`Budget warning: ${usage.usagePercentage}% used`);
    }

    this.saveUsage(usage);
    return usage;
  }

  // 예산 설정 조회
  getSettings(): BudgetSettings {
    const stored = localStorage.getItem(this.SETTINGS_KEY);
    return stored ? JSON.parse(stored) : this.initializeSettings();
  }

  // 예산 설정 업데이트
  updateSettings(settings: Partial<BudgetSettings>, userId: string, userName: string): void {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updated));
    
    // 감사 로그
    logAction.budgetUpdate(userId, userName, current, updated);
    
    // 설정 변경시 즉시 체크
    this.checkBudgetStatus();
  }

  // 현재 사용량 조회
  getCurrentUsage(): BudgetUsage {
    const settings = this.getSettings();
    const today = new Date().toISOString().split('T')[0];
    
    // 실제 구현시 DB에서 조회
    const storedUsage = localStorage.getItem(this.USAGE_KEY);
    const usageData = storedUsage ? JSON.parse(storedUsage) : {};
    
    const todayUsage = usageData[today] || { daily: 0, total: 0 };
    
    // 이번달 총 사용량 계산
    const currentMonth = new Date().toISOString().slice(0, 7);
    let monthlyTotal = 0;
    
    Object.keys(usageData).forEach(date => {
      if (date.startsWith(currentMonth)) {
        monthlyTotal += usageData[date].daily || 0;
      }
    });

    const usagePercentage = (monthlyTotal / settings.monthlyBudget) * 100;

    return {
      date: today,
      totalUsed: monthlyTotal,
      dailyUsed: todayUsage.daily,
      remainingBudget: Math.max(0, settings.monthlyBudget - monthlyTotal),
      remainingDaily: Math.max(0, settings.dailyLimit - todayUsage.daily),
      usagePercentage,
      status: 'normal'
    };
  }

  // 사용량 기록
  recordUsage(amount: number, eventType: string): boolean {
    const settings = this.getSettings();
    const usage = this.getCurrentUsage();

    // 차단 상태 확인
    if (usage.status === 'blocked' || usage.status === 'exceeded') {
      console.error('Budget exceeded, transaction blocked');
      return false;
    }

    // 긴급 차단 상태 확인
    const emergencyControls = this.getEmergencyControls();
    const relevantControl = emergencyControls.find(c => 
      c.type === 'all_events' || c.type === eventType
    );
    
    if (relevantControl?.enabled) {
      console.error(`Emergency block active for ${eventType}`);
      return false;
    }

    // 한도 체크
    if (usage.dailyUsed + amount > settings.dailyLimit) {
      console.error('Daily limit would be exceeded');
      return false;
    }

    if (usage.totalUsed + amount > settings.monthlyBudget) {
      console.error('Monthly budget would be exceeded');
      return false;
    }

    // 사용량 업데이트
    const today = new Date().toISOString().split('T')[0];
    const storedUsage = localStorage.getItem(this.USAGE_KEY);
    const usageData = storedUsage ? JSON.parse(storedUsage) : {};
    
    if (!usageData[today]) {
      usageData[today] = { daily: 0, total: 0 };
    }
    
    usageData[today].daily += amount;
    usageData[today].total = usage.totalUsed + amount;
    
    localStorage.setItem(this.USAGE_KEY, JSON.stringify(usageData));

    // 사용 후 상태 체크
    this.checkBudgetStatus();

    return true;
  }

  // 사용량 저장
  private saveUsage(usage: BudgetUsage): void {
    const storedUsage = localStorage.getItem(this.USAGE_KEY);
    const usageData = storedUsage ? JSON.parse(storedUsage) : {};
    
    usageData[usage.date] = {
      daily: usage.dailyUsed,
      total: usage.totalUsed,
      status: usage.status
    };
    
    localStorage.setItem(this.USAGE_KEY, JSON.stringify(usageData));
  }

  // 긴급 차단 활성화
  activateEmergencyBlock(reason: string): void {
    const controls = this.getEmergencyControls();
    
    // 모든 이벤트 차단
    const allEventsControl = controls.find(c => c.type === 'all_events');
    if (allEventsControl) {
      allEventsControl.enabled = true;
      allEventsControl.blockedSince = new Date().toISOString();
      allEventsControl.blockedBy = 'system';
      
      this.saveEmergencyControls(controls);
      
      // 알림
      console.error(`EMERGENCY BLOCK ACTIVATED: ${reason}`);
      logAction.emergencyStop('system', 'System', reason);
    }
  }

  // 긴급 차단 해제
  deactivateEmergencyBlock(controlId: string, userId: string, userName: string): void {
    const controls = this.getEmergencyControls();
    const control = controls.find(c => c.id === controlId);
    
    if (control) {
      control.enabled = false;
      control.blockedSince = undefined;
      control.blockedBy = undefined;
      
      this.saveEmergencyControls(controls);
      
      auditLogService.log({
        userId,
        userName,
        action: 'EMERGENCY_BLOCK_DEACTIVATED',
        category: 'budget',
        details: { controlId, controlType: control.type },
        status: 'success'
      });
    }
  }

  // 긴급 제어 목록 조회
  getEmergencyControls(): EmergencyControl[] {
    const stored = localStorage.getItem(this.EMERGENCY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    // 기본 긴급 제어 목록
    const defaultControls: EmergencyControl[] = [
      {
        id: 'ec1',
        name: '전체 이벤트 차단',
        description: '모든 포인트/쿠폰 지급 차단',
        type: 'all_events',
        enabled: false
      },
      {
        id: 'ec2',
        name: '신규 가입 보상 차단',
        description: '신규 가입시 포인트 지급 차단',
        type: 'new_signups',
        enabled: false
      },
      {
        id: 'ec3',
        name: '리퍼럴 보상 차단',
        description: '추천 보상 지급 차단',
        type: 'referral_rewards',
        enabled: false
      },
      {
        id: 'ec4',
        name: 'QR 이벤트 차단',
        description: 'QR 스캔 이벤트 보상 차단',
        type: 'qr_events',
        enabled: false
      }
    ];

    this.saveEmergencyControls(defaultControls);
    return defaultControls;
  }

  // 긴급 제어 저장
  private saveEmergencyControls(controls: EmergencyControl[]): void {
    localStorage.setItem(this.EMERGENCY_KEY, JSON.stringify(controls));
  }

  // 예산 사용 통계
  getUsageStatistics(period: 'daily' | 'weekly' | 'monthly' = 'monthly'): any {
    const storedUsage = localStorage.getItem(this.USAGE_KEY);
    const usageData = storedUsage ? JSON.parse(storedUsage) : {};
    
    const now = new Date();
    const stats: any[] = [];
    
    if (period === 'daily') {
      // 최근 7일
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        stats.push({
          date: dateStr,
          amount: usageData[dateStr]?.daily || 0
        });
      }
    } else if (period === 'weekly') {
      // 최근 4주
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i * 7 + weekStart.getDay()));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        let weekTotal = 0;
        for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          weekTotal += usageData[dateStr]?.daily || 0;
        }
        
        stats.push({
          week: `Week ${4 - i}`,
          amount: weekTotal
        });
      }
    } else {
      // 최근 12개월
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        const monthStr = date.toISOString().slice(0, 7);
        
        let monthTotal = 0;
        Object.keys(usageData).forEach(dateStr => {
          if (dateStr.startsWith(monthStr)) {
            monthTotal += usageData[dateStr]?.daily || 0;
          }
        });
        
        stats.push({
          month: monthStr,
          amount: monthTotal
        });
      }
    }
    
    return stats;
  }

  // 서비스 종료시 정리
  destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

// 싱글톤 인스턴스
export const budgetControlService = new BudgetControlService();