// 감사 로그 서비스
export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  category: 'budget' | 'user' | 'store' | 'content' | 'system' | 'auth';
  details: any;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failed' | 'warning';
  changes?: {
    before: any;
    after: any;
  };
}

class AuditLogService {
  private readonly STORAGE_KEY = 'audit_logs';
  private readonly MAX_LOGS = 10000; // 최대 로그 수

  // 로그 기록
  async log(params: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const log: AuditLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        ...params
      };

      const logs = this.getLogs();
      logs.unshift(log); // 최신 로그를 앞에 추가

      // 최대 로그 수 제한
      if (logs.length > this.MAX_LOGS) {
        logs.splice(this.MAX_LOGS);
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));

      // 중요 이벤트는 콘솔에도 기록
      if (params.status === 'failed' || params.category === 'auth') {
        console.log('[AUDIT]', log);
      }
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  // 로그 조회
  getLogs(filters?: {
    category?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: string;
    limit?: number;
  }): AuditLog[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      let logs: AuditLog[] = stored ? JSON.parse(stored) : [];

      if (filters) {
        // 카테고리 필터
        if (filters.category) {
          logs = logs.filter(log => log.category === filters.category);
        }

        // 사용자 필터
        if (filters.userId) {
          logs = logs.filter(log => log.userId === filters.userId);
        }

        // 날짜 범위 필터
        if (filters.startDate) {
          logs = logs.filter(log => 
            new Date(log.timestamp) >= filters.startDate!
          );
        }

        if (filters.endDate) {
          logs = logs.filter(log => 
            new Date(log.timestamp) <= filters.endDate!
          );
        }

        // 상태 필터
        if (filters.status) {
          logs = logs.filter(log => log.status === filters.status);
        }

        // 개수 제한
        if (filters.limit) {
          logs = logs.slice(0, filters.limit);
        }
      }

      return logs;
    } catch (error) {
      console.error('Failed to read audit logs:', error);
      return [];
    }
  }

  // 로그 통계
  getStatistics(days: number = 7): {
    totalLogs: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
    recentFailures: AuditLog[];
  } {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = this.getLogs({
      startDate
    });

    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    logs.forEach(log => {
      // 카테고리별 집계
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
      
      // 상태별 집계
      byStatus[log.status] = (byStatus[log.status] || 0) + 1;
    });

    const recentFailures = logs
      .filter(log => log.status === 'failed')
      .slice(0, 10);

    return {
      totalLogs: logs.length,
      byCategory,
      byStatus,
      recentFailures
    };
  }

  // 로그 내보내기
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    const logs = this.getLogs();

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    } else {
      // CSV 형식
      const headers = ['ID', 'Timestamp', 'User', 'Action', 'Category', 'Status', 'Details'];
      const rows = logs.map(log => [
        log.id,
        log.timestamp,
        log.userName,
        log.action,
        log.category,
        log.status,
        JSON.stringify(log.details)
      ]);

      return [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
    }
  }

  // 로그 삭제 (관리 목적)
  clearOldLogs(daysToKeep: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const logs = this.getLogs();
    const filtered = logs.filter(log => 
      new Date(log.timestamp) > cutoffDate
    );

    const deletedCount = logs.length - filtered.length;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));

    return deletedCount;
  }
}

// 싱글톤 인스턴스
export const auditLogService = new AuditLogService();

// 헬퍼 함수들
export const logAction = {
  // 인증 관련
  login: (userId: string, userName: string, success: boolean) => {
    auditLogService.log({
      userId,
      userName,
      action: 'LOGIN',
      category: 'auth',
      details: { success },
      status: success ? 'success' : 'failed'
    });
  },

  logout: (userId: string, userName: string) => {
    auditLogService.log({
      userId,
      userName,
      action: 'LOGOUT',
      category: 'auth',
      details: {},
      status: 'success'
    });
  },

  // 예산 관련
  budgetUpdate: (userId: string, userName: string, before: any, after: any) => {
    auditLogService.log({
      userId,
      userName,
      action: 'BUDGET_UPDATE',
      category: 'budget',
      details: { 
        type: 'budget_settings',
        amount: after.monthlyBudget 
      },
      changes: { before, after },
      status: 'success'
    });
  },

  budgetExceeded: (eventId: string, amount: number) => {
    auditLogService.log({
      userId: 'system',
      userName: 'System',
      action: 'BUDGET_EXCEEDED',
      category: 'budget',
      details: { eventId, amount },
      status: 'warning'
    });
  },

  // 사용자 관리
  userCreate: (userId: string, userName: string, newUser: any) => {
    auditLogService.log({
      userId,
      userName,
      action: 'USER_CREATE',
      category: 'user',
      details: { newUser },
      status: 'success'
    });
  },

  userUpdate: (userId: string, userName: string, targetUserId: string, changes: any) => {
    auditLogService.log({
      userId,
      userName,
      action: 'USER_UPDATE',
      category: 'user',
      details: { targetUserId, changes },
      status: 'success'
    });
  },

  userDelete: (userId: string, userName: string, targetUserId: string) => {
    auditLogService.log({
      userId,
      userName,
      action: 'USER_DELETE',
      category: 'user',
      details: { targetUserId },
      status: 'success'
    });
  },

  // 매장 관리
  storeApprove: (userId: string, userName: string, storeId: string) => {
    auditLogService.log({
      userId,
      userName,
      action: 'STORE_APPROVE',
      category: 'store',
      details: { storeId },
      status: 'success'
    });
  },

  storeReject: (userId: string, userName: string, storeId: string, reason: string) => {
    auditLogService.log({
      userId,
      userName,
      action: 'STORE_REJECT',
      category: 'store',
      details: { storeId, reason },
      status: 'success'
    });
  },

  // 컨텐츠 관리
  contentCreate: (userId: string, userName: string, contentType: string, contentId: string) => {
    auditLogService.log({
      userId,
      userName,
      action: 'CONTENT_CREATE',
      category: 'content',
      details: { contentType, contentId },
      status: 'success'
    });
  },

  contentUpdate: (userId: string, userName: string, contentType: string, contentId: string) => {
    auditLogService.log({
      userId,
      userName,
      action: 'CONTENT_UPDATE',
      category: 'content',
      details: { contentType, contentId },
      status: 'success'
    });
  },

  contentDelete: (userId: string, userName: string, contentType: string, contentId: string) => {
    auditLogService.log({
      userId,
      userName,
      action: 'CONTENT_DELETE',
      category: 'content',
      details: { contentType, contentId },
      status: 'success'
    });
  },

  // 시스템 관련
  systemSettingChange: (userId: string, userName: string, setting: string, value: any) => {
    auditLogService.log({
      userId,
      userName,
      action: 'SYSTEM_SETTING_CHANGE',
      category: 'system',
      details: { setting, value },
      status: 'success'
    });
  },

  emergencyStop: (userId: string, userName: string, target: string) => {
    auditLogService.log({
      userId,
      userName,
      action: 'EMERGENCY_STOP',
      category: 'system',
      details: { target },
      status: 'warning'
    });
  }
};