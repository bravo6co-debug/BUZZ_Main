// 일괄 처리 서비스
import { auditLogService } from './auditLog.service';

export interface BatchJob {
  id: string;
  type: 'user_import' | 'coupon_issue' | 'point_grant' | 'notification_send' | 'data_export' | 'user_deactivate';
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalItems: number;
  processedItems: number;
  successCount: number;
  failedCount: number;
  startedAt?: string;
  completedAt?: string;
  createdBy: string;
  parameters: any;
  errors?: string[];
  result?: any;
}

export interface BatchTemplate {
  type: string;
  name: string;
  description: string;
  fields: BatchField[];
}

export interface BatchField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'file' | 'date';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

class BatchProcessService {
  private readonly JOBS_KEY = 'batch_jobs';
  private currentJob: BatchJob | null = null;
  private processInterval: NodeJS.Timeout | null = null;

  // 일괄 작업 템플릿
  getTemplates(): BatchTemplate[] {
    return [
      {
        type: 'user_import',
        name: '사용자 일괄 등록',
        description: 'CSV 파일로 여러 사용자를 한번에 등록합니다',
        fields: [
          {
            name: 'file',
            label: 'CSV 파일',
            type: 'file',
            required: true,
            placeholder: 'email,name,phone,university'
          }
        ]
      },
      {
        type: 'coupon_issue',
        name: '쿠폰 일괄 발급',
        description: '선택한 사용자들에게 쿠폰을 일괄 발급합니다',
        fields: [
          {
            name: 'userGroup',
            label: '대상 그룹',
            type: 'select',
            required: true,
            options: ['전체 사용자', '신규 가입자', '활성 사용자', '비활성 사용자', '특정 대학']
          },
          {
            name: 'couponType',
            label: '쿠폰 종류',
            type: 'select',
            required: true,
            options: ['기본 할인', '이벤트 쿠폰', '신규 가입 쿠폰']
          },
          {
            name: 'discountAmount',
            label: '할인 금액',
            type: 'number',
            required: true,
            placeholder: '5000'
          },
          {
            name: 'expiryDays',
            label: '유효 기간(일)',
            type: 'number',
            required: true,
            placeholder: '30'
          }
        ]
      },
      {
        type: 'point_grant',
        name: '포인트 일괄 지급',
        description: '선택한 사용자들에게 포인트를 일괄 지급합니다',
        fields: [
          {
            name: 'userGroup',
            label: '대상 그룹',
            type: 'select',
            required: true,
            options: ['전체 사용자', '이벤트 참여자', '리뷰 작성자', '특정 기간 가입자']
          },
          {
            name: 'points',
            label: '지급 포인트',
            type: 'number',
            required: true,
            placeholder: '1000'
          },
          {
            name: 'reason',
            label: '지급 사유',
            type: 'text',
            required: true,
            placeholder: '이벤트 보상'
          }
        ]
      },
      {
        type: 'notification_send',
        name: '알림 일괄 발송',
        description: '푸시 알림을 일괄 발송합니다',
        fields: [
          {
            name: 'recipients',
            label: '수신 대상',
            type: 'select',
            required: true,
            options: ['전체', '활성 사용자', '특정 지역', '특정 대학']
          },
          {
            name: 'title',
            label: '알림 제목',
            type: 'text',
            required: true,
            placeholder: '중요 공지사항'
          },
          {
            name: 'message',
            label: '알림 내용',
            type: 'text',
            required: true,
            placeholder: '알림 메시지 내용을 입력하세요'
          },
          {
            name: 'link',
            label: '링크 URL',
            type: 'text',
            required: false,
            placeholder: 'https://...'
          }
        ]
      },
      {
        type: 'data_export',
        name: '데이터 내보내기',
        description: '선택한 데이터를 파일로 내보냅니다',
        fields: [
          {
            name: 'dataType',
            label: '데이터 종류',
            type: 'select',
            required: true,
            options: ['사용자 목록', '매장 목록', '거래 내역', '리퍼럴 데이터', '쿠폰 사용 내역']
          },
          {
            name: 'format',
            label: '파일 형식',
            type: 'select',
            required: true,
            options: ['CSV', 'Excel', 'JSON']
          },
          {
            name: 'dateFrom',
            label: '시작일',
            type: 'date',
            required: false
          },
          {
            name: 'dateTo',
            label: '종료일',
            type: 'date',
            required: false
          }
        ]
      },
      {
        type: 'user_deactivate',
        name: '사용자 일괄 비활성화',
        description: '조건에 맞는 사용자를 일괄 비활성화합니다',
        fields: [
          {
            name: 'criteria',
            label: '비활성화 기준',
            type: 'select',
            required: true,
            options: ['6개월 이상 미접속', '1년 이상 미접속', '이메일 미인증', '휴면 요청']
          },
          {
            name: 'sendNotification',
            label: '사전 알림 발송',
            type: 'select',
            required: true,
            options: ['발송', '미발송']
          }
        ]
      }
    ];
  }

  // 일괄 작업 생성
  createJob(type: string, parameters: any, userId: string, userName: string): BatchJob {
    const job: BatchJob = {
      id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: type as any,
      name: this.getJobName(type),
      status: 'pending',
      totalItems: 0,
      processedItems: 0,
      successCount: 0,
      failedCount: 0,
      createdBy: userName,
      parameters,
      errors: []
    };

    const jobs = this.getJobs();
    jobs.unshift(job);
    this.saveJobs(jobs);

    // 감사 로그
    auditLogService.log({
      userId,
      userName,
      action: 'BATCH_JOB_CREATED',
      category: 'system',
      details: { jobId: job.id, type: job.type },
      status: 'success'
    });

    return job;
  }

  // 일괄 작업 실행
  async executeJob(jobId: string, userId: string, userName: string): Promise<void> {
    const jobs = this.getJobs();
    const job = jobs.find(j => j.id === jobId);

    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status !== 'pending') {
      throw new Error('Job already processed');
    }

    // 상태 업데이트
    job.status = 'processing';
    job.startedAt = new Date().toISOString();
    this.saveJobs(jobs);

    // 비동기 처리 시작
    this.currentJob = job;
    this.processJob(job, userId, userName);
  }

  // 작업 처리 (시뮬레이션)
  private async processJob(job: BatchJob, userId: string, userName: string) {
    // 실제 구현시 각 타입별 처리 로직
    const mockData = this.getMockDataForJob(job);
    job.totalItems = mockData.length;

    // 순차 처리 시뮬레이션
    for (let i = 0; i < mockData.length; i++) {
      if (job.status === 'cancelled') {
        break;
      }

      try {
        // 각 항목 처리 (시뮬레이션)
        await this.processItem(job.type, mockData[i], job.parameters);
        job.successCount++;
      } catch (error) {
        job.failedCount++;
        job.errors?.push(`Item ${i + 1}: ${error}`);
      }

      job.processedItems++;

      // 진행률 업데이트
      if (job.processedItems % 10 === 0 || job.processedItems === job.totalItems) {
        this.updateJobProgress(job);
      }

      // 처리 지연 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 완료 처리
    job.status = job.status === 'cancelled' ? 'cancelled' : 
                 job.failedCount > 0 ? 'failed' : 'completed';
    job.completedAt = new Date().toISOString();
    
    this.updateJobProgress(job);

    // 감사 로그
    auditLogService.log({
      userId,
      userName,
      action: 'BATCH_JOB_COMPLETED',
      category: 'system',
      details: { 
        jobId: job.id, 
        type: job.type,
        success: job.successCount,
        failed: job.failedCount
      },
      status: job.status === 'completed' ? 'success' : 'failed'
    });

    this.currentJob = null;
  }

  // 개별 항목 처리
  private async processItem(type: string, item: any, parameters: any): Promise<void> {
    // 실제 구현시 각 타입별 처리
    switch (type) {
      case 'user_import':
        // 사용자 등록 API 호출
        break;
      case 'coupon_issue':
        // 쿠폰 발급 API 호출
        break;
      case 'point_grant':
        // 포인트 지급 API 호출
        break;
      case 'notification_send':
        // 알림 발송 API 호출
        break;
      case 'data_export':
        // 데이터 추출 처리
        break;
      case 'user_deactivate':
        // 사용자 비활성화 API 호출
        break;
    }

    // 랜덤 실패 시뮬레이션 (10% 확률)
    if (Math.random() < 0.1) {
      throw new Error('Processing failed');
    }
  }

  // Mock 데이터 생성
  private getMockDataForJob(job: BatchJob): any[] {
    const count = Math.floor(Math.random() * 50) + 10; // 10-60개
    return Array(count).fill(null).map((_, i) => ({
      id: i + 1,
      data: `Item ${i + 1}`
    }));
  }

  // 작업 진행률 업데이트
  private updateJobProgress(job: BatchJob): void {
    const jobs = this.getJobs();
    const index = jobs.findIndex(j => j.id === job.id);
    if (index !== -1) {
      jobs[index] = job;
      this.saveJobs(jobs);
    }
  }

  // 작업 취소
  cancelJob(jobId: string, userId: string, userName: string): void {
    const jobs = this.getJobs();
    const job = jobs.find(j => j.id === jobId);

    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status !== 'processing') {
      throw new Error('Only processing jobs can be cancelled');
    }

    job.status = 'cancelled';
    this.updateJobProgress(job);

    // 감사 로그
    auditLogService.log({
      userId,
      userName,
      action: 'BATCH_JOB_CANCELLED',
      category: 'system',
      details: { jobId: job.id, type: job.type },
      status: 'warning'
    });
  }

  // 작업 목록 조회
  getJobs(filters?: {
    type?: string;
    status?: string;
    createdBy?: string;
    limit?: number;
  }): BatchJob[] {
    const stored = localStorage.getItem(this.JOBS_KEY);
    let jobs: BatchJob[] = stored ? JSON.parse(stored) : [];

    if (filters) {
      if (filters.type) {
        jobs = jobs.filter(j => j.type === filters.type);
      }
      if (filters.status) {
        jobs = jobs.filter(j => j.status === filters.status);
      }
      if (filters.createdBy) {
        jobs = jobs.filter(j => j.createdBy === filters.createdBy);
      }
      if (filters.limit) {
        jobs = jobs.slice(0, filters.limit);
      }
    }

    return jobs;
  }

  // 작업 상세 조회
  getJob(jobId: string): BatchJob | null {
    const jobs = this.getJobs();
    return jobs.find(j => j.id === jobId) || null;
  }

  // 작업 저장
  private saveJobs(jobs: BatchJob[]): void {
    // 최대 100개까지만 보관
    if (jobs.length > 100) {
      jobs = jobs.slice(0, 100);
    }
    localStorage.setItem(this.JOBS_KEY, JSON.stringify(jobs));
  }

  // 작업 이름 가져오기
  private getJobName(type: string): string {
    const templates = this.getTemplates();
    const template = templates.find(t => t.type === type);
    return template?.name || type;
  }

  // 작업 통계
  getStatistics(): {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    recentJobs: BatchJob[];
  } {
    const jobs = this.getJobs();
    
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};

    jobs.forEach(job => {
      byStatus[job.status] = (byStatus[job.status] || 0) + 1;
      byType[job.type] = (byType[job.type] || 0) + 1;
    });

    return {
      total: jobs.length,
      byStatus,
      byType,
      recentJobs: jobs.slice(0, 5)
    };
  }

  // 결과 다운로드
  downloadResult(jobId: string): void {
    const job = this.getJob(jobId);
    if (!job || job.status !== 'completed') {
      throw new Error('Job not completed');
    }

    // 실제 구현시 파일 생성 및 다운로드
    const result = {
      jobId: job.id,
      type: job.type,
      completedAt: job.completedAt,
      totalItems: job.totalItems,
      successCount: job.successCount,
      failedCount: job.failedCount,
      errors: job.errors
    };

    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_result_${jobId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// 싱글톤 인스턴스
export const batchProcessService = new BatchProcessService();