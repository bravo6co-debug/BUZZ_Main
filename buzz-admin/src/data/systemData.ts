// System Settings Mock Data
export const systemStatus = {
  cpu: 72,
  memory: 85,
  disk: 45,
  network: 98
}

export const securitySettings = [
  { id: 1, name: '2단계 인증 강제', description: '모든 관리자 계정에 2FA 필수', enabled: true, level: 'high' },
  { id: 2, name: 'IP 화이트리스트', description: '허용된 IP에서만 접근 가능', enabled: true, level: 'high' },
  { id: 3, name: '세션 타임아웃', description: '30분 비활성 시 자동 로그아웃', enabled: true, level: 'medium' },
  { id: 4, name: '로그인 실패 제한', description: '5회 실패 시 계정 잠금', enabled: true, level: 'medium' },
  { id: 5, name: 'API 요청 제한', description: '분당 최대 1000건 요청', enabled: false, level: 'low' },
]

export const rewardPolicies = [
  { id: 1, type: 'referral', name: '리퍼럴 추천인 보상', amount: 5000, unit: '원', condition: '신규 가입 시' },
  { id: 2, type: 'referral', name: '리퍼럴 피추천인 보상', amount: 3000, unit: '원', condition: '첫 주문 시' },
  { id: 3, type: 'review', name: '리뷰 작성 보상', amount: 1000, unit: '원', condition: '사진 포함 리뷰' },
  { id: 4, type: 'visit', name: '매장 방문 보상', amount: 500, unit: '포인트', condition: '체크인 시' },
]

export const monitoringAlerts = [
  { id: 1, type: 'error', message: 'API 응답 시간 증가', time: '5분 전', severity: 'high' },
  { id: 2, type: 'warning', message: '메모리 사용률 85% 초과', time: '12분 전', severity: 'medium' },
  { id: 3, type: 'info', message: '정기 백업 완료', time: '1시간 전', severity: 'low' },
  { id: 4, type: 'error', message: '데이터베이스 연결 실패', time: '2시간 전', severity: 'high' },
]

// User Management Mock Data
export const members = [
  { id: 1, name: '김영희', email: 'younghee@email.com', phone: '010-1234-5678', joinDate: '2024-12-15', status: 'active', referrals: 12, points: 45000, lastLogin: '2025-01-25 14:30' },
  { id: 2, name: '이철수', email: 'cheolsu@email.com', phone: '010-2345-6789', joinDate: '2024-11-20', status: 'active', referrals: 8, points: 32000, lastLogin: '2025-01-24 09:15' },
  { id: 3, name: '박민수', email: 'minsu@email.com', phone: '010-3456-7890', joinDate: '2024-10-05', status: 'suspended', referrals: 3, points: 12000, lastLogin: '2025-01-20 16:45' },
  { id: 4, name: '정수연', email: 'suyeon@email.com', phone: '010-4567-8901', joinDate: '2024-09-12', status: 'active', referrals: 25, points: 89000, lastLogin: '2025-01-25 11:20' },
]

export const admins = [
  { id: 1, name: '관리자1', email: 'admin1@company.com', role: 'super_admin', permissions: ['all'], lastLogin: '2025-01-25 15:30', status: 'active' },
  { id: 2, name: '관리자2', email: 'admin2@company.com', role: 'admin', permissions: ['users', 'stores', 'content'], lastLogin: '2025-01-25 10:45', status: 'active' },
  { id: 3, name: '매장관리자', email: 'store@company.com', role: 'store_manager', permissions: ['stores'], lastLogin: '2025-01-24 14:20', status: 'active' },
  { id: 4, name: '컨텐츠관리자', email: 'content@company.com', role: 'content_manager', permissions: ['content'], lastLogin: '2025-01-23 16:10', status: 'inactive' },
]

export const auditLogs = [
  { id: 1, user: '관리자1', action: '매장 승인', target: '강남 맛집', timestamp: '2025-01-25 15:30:45', ip: '192.168.1.100', result: 'success' },
  { id: 2, user: '관리자2', action: '사용자 정지', target: '박민수', timestamp: '2025-01-25 14:20:12', ip: '192.168.1.101', result: 'success' },
  { id: 3, user: '매장관리자', action: '정산 승인', target: '홍대 카페', timestamp: '2025-01-25 11:15:33', ip: '192.168.1.102', result: 'success' },
  { id: 4, user: '관리자1', action: '로그인 시도', target: '시스템', timestamp: '2025-01-25 10:05:21', ip: '192.168.1.100', result: 'failed' },
]

export const rolePermissions = {
  super_admin: { name: '최고관리자', permissions: ['전체 권한'] },
  admin: { name: '관리자', permissions: ['사용자 관리', '매장 관리', '컨텐츠 관리', '정산 관리'] },
  store_manager: { name: '매장관리자', permissions: ['매장 관리', '정산 관리'] },
  content_manager: { name: '컨텐츠관리자', permissions: ['컨텐츠 관리'] },
}