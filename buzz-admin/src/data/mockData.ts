// Dashboard Mock Data
export const monthlyData = [
  { month: '1월', budget: 85000000, spent: 72000000 },
  { month: '2월', budget: 90000000, spent: 78000000 },
  { month: '3월', budget: 95000000, spent: 85000000 },
  { month: '4월', budget: 88000000, spent: 82000000 },
  { month: '5월', budget: 92000000, spent: 89000000 },
  { month: '6월', budget: 100000000, spent: 95000000 },
]

export const referralData = [
  { day: '월', value: 2400 },
  { day: '화', value: 1398 },
  { day: '수', value: 9800 },
  { day: '목', value: 3908 },
  { day: '금', value: 4800 },
  { day: '토', value: 3800 },
  { day: '일', value: 4300 },
]

export const storeStatusData = [
  { name: '활성', value: 1247, color: '#22c55e' },
  { name: '대기', value: 89, color: '#f59e0b' },
  { name: '정지', value: 34, color: '#ef4444' },
]

export const recentNotifications = [
  { id: 1, type: 'warning', title: '예산 한계 근접', message: '이번 달 예산 사용률이 95%에 도달했습니다.', time: '5분 전' },
  { id: 2, type: 'success', title: '신규 매장 승인', message: '강남점이 승인되어 활성화되었습니다.', time: '1시간 전' },
  { id: 3, type: 'info', title: '정산 요청', message: '15건의 정산 요청이 대기 중입니다.', time: '2시간 전' },
  { id: 4, type: 'error', title: '부정 사용 감지', message: '리퍼럴 코드 REF123에서 의심스러운 활동이 감지되었습니다.', time: '3시간 전' },
]

// Budget Management Mock Data
export const budgetData = [
  { date: '01/01', budget: 100000000, spent: 85000000, remaining: 15000000 },
  { date: '01/02', budget: 100000000, spent: 87000000, remaining: 13000000 },
  { date: '01/03', budget: 100000000, spent: 89000000, remaining: 11000000 },
  { date: '01/04', budget: 100000000, spent: 92000000, remaining: 8000000 },
  { date: '01/05', budget: 100000000, spent: 95000000, remaining: 5000000 },
]

export const qrEvents = [
  { id: 1, name: '신년 특별 이벤트', code: 'NY2025', status: 'active', budget: 5000000, used: 3200000, participants: 1284 },
  { id: 2, name: '신규 회원 가입', code: 'NEW2025', status: 'active', budget: 10000000, used: 8900000, participants: 2847 },
  { id: 3, name: '추천인 보너스', code: 'REF2025', status: 'paused', budget: 8000000, used: 4500000, participants: 1659 },
  { id: 4, name: '매장 리뷰 적립', code: 'REVIEW', status: 'inactive', budget: 3000000, used: 0, participants: 0 },
]

export const emergencyControls = [
  { id: 1, name: '전체 리퍼럴 중단', description: '모든 리퍼럴 활동을 즉시 중단합니다', status: false, level: 'critical' },
  { id: 2, name: '신규 가입 제한', description: '신규 회원 가입을 일시 중단합니다', status: false, level: 'warning' },
  { id: 3, name: '예산 자동 차단', description: '일일 예산 한도 도달 시 자동 차단', status: true, level: 'info' },
  { id: 4, name: '긴급 알림 활성화', description: '예산 90% 도달 시 긴급 알림 발송', status: true, level: 'info' },
]

// Referral Management Mock Data
export const performanceData = [
  { date: '01/01', newReferrals: 245, conversions: 156, revenue: 2340000 },
  { date: '01/02', newReferrals: 189, conversions: 134, revenue: 2010000 },
  { date: '01/03', newReferrals: 312, conversions: 201, revenue: 3015000 },
  { date: '01/04', newReferrals: 278, conversions: 178, revenue: 2670000 },
  { date: '01/05', newReferrals: 356, conversions: 234, revenue: 3510000 },
  { date: '01/06', newReferrals: 289, conversions: 189, revenue: 2835000 },
  { date: '01/07', newReferrals: 401, conversions: 267, revenue: 4005000 },
]

export const codeAnalysis = [
  { code: 'REF2025A', creator: '김영희', uses: 1247, conversions: 892, revenue: 13380000, conversionRate: 71.5, status: 'active', suspicion: 'low' },
  { code: 'REF2025B', creator: '이철수', uses: 983, conversions: 654, revenue: 9810000, conversionRate: 66.5, status: 'active', suspicion: 'low' },
  { code: 'REF2025C', creator: '박민수', uses: 756, conversions: 398, revenue: 5970000, conversionRate: 52.6, status: 'active', suspicion: 'medium' },
  { code: 'REF2025D', creator: '정수연', uses: 2134, conversions: 156, revenue: 2340000, conversionRate: 7.3, status: 'suspended', suspicion: 'high' },
  { code: 'REF2025E', creator: '최민지', uses: 892, conversions: 623, revenue: 9345000, conversionRate: 69.8, status: 'active', suspicion: 'low' },
]

export const suspiciousActivities = [
  { id: 1, code: 'REF2025D', issue: '비정상적 사용 패턴', description: '짧은 시간 내 대량 사용', severity: 'high', time: '2시간 전' },
  { id: 2, code: 'REF2025F', issue: '중복 IP 주소', description: '동일 IP에서 반복 사용', severity: 'medium', time: '4시간 전' },
  { id: 3, code: 'REF2025G', issue: '낮은 전환율', description: '평균 대비 현저히 낮은 전환율', severity: 'medium', time: '6시간 전' },
  { id: 4, code: 'REF2025H', issue: '봇 의심 활동', description: '자동화된 요청 패턴 감지', severity: 'high', time: '8시간 전' },
]

export const topPerformers = [
  { rank: 1, code: 'REF2025A', creator: '김영희', revenue: 13380000, color: '#22c55e' },
  { rank: 2, code: 'REF2025E', creator: '최민지', revenue: 9345000, color: '#3b82f6' },
  { rank: 3, code: 'REF2025B', creator: '이철수', revenue: 9810000, color: '#f59e0b' },
  { rank: 4, code: 'REF2025C', creator: '박민수', revenue: 5970000, color: '#ef4444' },
]