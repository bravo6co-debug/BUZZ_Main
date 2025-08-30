export interface ReferralMission {
  id: string
  title: string
  description: string
  type: 'signup' | 'first_qr_use' | 'repeat_purchase' | 'review' | 'custom'
  status: 'active' | 'inactive' | 'completed'
  reward: {
    type: 'point' | 'cash' | 'coupon'
    amount: number
    currency?: string
    description: string
  }
  conditions: {
    minAmount?: number
    maxRewards?: number
    validPeriod?: string
    targetAudience?: string[]
  }
  budget: {
    allocated: number
    used: number
    remaining: number
  }
  performance: {
    totalParticipants: number
    successfulReferrals: number
    totalRewardsPaid: number
    conversionRate: number
  }
  createdAt: string
  updatedAt: string
  createdBy: string
}

// 미션별 보상 설정 템플릿
export const REWARD_TEMPLATES = {
  signup: {
    type: 'point' as const,
    amount: 1000,
    description: '신규 회원 가입 시 추천인에게 지급'
  },
  first_qr_use: {
    type: 'cash' as const,
    amount: 5000,
    description: '추천받은 회원의 첫 QR코드 사용 시 추천인에게 지급'
  },
  repeat_purchase: {
    type: 'point' as const,
    amount: 500,
    description: '추천받은 회원의 재구매 시 추천인에게 지급'
  },
  review: {
    type: 'coupon' as const,
    amount: 3000,
    description: '리뷰 작성 시 쿠폰 지급'
  }
}

// 샘플 미션 데이터
export const referralMissions: ReferralMission[] = [
  {
    id: 'mission-001',
    title: '신규 회원 추천',
    description: '친구를 초대하여 회원가입을 완료하면 포인트 지급',
    type: 'signup',
    status: 'active',
    reward: {
      type: 'point',
      amount: 1000,
      description: '신규 회원 가입 완료 시 1,000P 지급'
    },
    conditions: {
      maxRewards: 50,
      validPeriod: '2024-12-31',
      targetAudience: ['일반회원', 'VIP회원']
    },
    budget: {
      allocated: 1000000,
      used: 450000,
      remaining: 550000
    },
    performance: {
      totalParticipants: 1250,
      successfulReferrals: 450,
      totalRewardsPaid: 450000,
      conversionRate: 36.0
    },
    createdAt: '2024-01-15',
    updatedAt: '2024-08-25',
    createdBy: '김운영'
  },
  {
    id: 'mission-002',
    title: 'QR코드 첫 사용 미션',
    description: '추천받은 회원이 첫 QR할인코드를 사용하면 현금 보상 지급',
    type: 'first_qr_use',
    status: 'active',
    reward: {
      type: 'cash',
      amount: 5000,
      currency: 'KRW',
      description: '추천받은 회원의 첫 QR코드 사용 시 5,000원 지급'
    },
    conditions: {
      minAmount: 30000,
      maxRewards: 200,
      validPeriod: '2024-12-31'
    },
    budget: {
      allocated: 2000000,
      used: 875000,
      remaining: 1125000
    },
    performance: {
      totalParticipants: 680,
      successfulReferrals: 175,
      totalRewardsPaid: 875000,
      conversionRate: 25.7
    },
    createdAt: '2024-02-01',
    updatedAt: '2024-08-20',
    createdBy: '이마케팅'
  },
  {
    id: 'mission-003',
    title: '리뷰 작성 미션',
    description: '구매 후 리뷰를 작성하면 쿠폰 지급',
    type: 'review',
    status: 'active',
    reward: {
      type: 'coupon',
      amount: 3000,
      description: '리뷰 작성 완료 시 3,000원 쿠폰 지급'
    },
    conditions: {
      maxRewards: 500,
      validPeriod: '2024-12-31',
      minAmount: 10000
    },
    budget: {
      allocated: 1500000,
      used: 420000,
      remaining: 1080000
    },
    performance: {
      totalParticipants: 890,
      successfulReferrals: 140,
      totalRewardsPaid: 420000,
      conversionRate: 15.7
    },
    createdAt: '2024-06-01',
    updatedAt: '2024-08-20',
    createdBy: '김리뷰'
  }
]

// 미션 관리 함수들
export const getMissions = (): ReferralMission[] => {
  const saved = localStorage.getItem('referral_missions')
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      return referralMissions
    }
  }
  return referralMissions
}

export const saveMissions = (missions: ReferralMission[]) => {
  localStorage.setItem('referral_missions', JSON.stringify(missions))
}

export const createMission = (missionData: Omit<ReferralMission, 'id' | 'createdAt' | 'updatedAt'>): ReferralMission => {
  const newMission: ReferralMission = {
    ...missionData,
    id: `mission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0]
  }
  
  const currentMissions = getMissions()
  const updatedMissions = [...currentMissions, newMission]
  saveMissions(updatedMissions)
  
  return newMission
}

export const updateMission = (id: string, updates: Partial<ReferralMission>): boolean => {
  const currentMissions = getMissions()
  const missionIndex = currentMissions.findIndex(mission => mission.id === id)
  
  if (missionIndex === -1) return false
  
  currentMissions[missionIndex] = {
    ...currentMissions[missionIndex],
    ...updates,
    updatedAt: new Date().toISOString().split('T')[0]
  }
  
  saveMissions(currentMissions)
  return true
}

export const deleteMission = (id: string): boolean => {
  const currentMissions = getMissions()
  const filteredMissions = currentMissions.filter(mission => mission.id !== id)
  
  if (filteredMissions.length === currentMissions.length) return false
  
  saveMissions(filteredMissions)
  return true
}

// 예산 및 성과 분석
export const getMissionSummary = () => {
  const missions = getMissions()
  
  return {
    totalMissions: missions.length,
    activeMissions: missions.filter(m => m.status === 'active').length,
    totalBudgetAllocated: missions.reduce((sum, m) => sum + m.budget.allocated, 0),
    totalBudgetUsed: missions.reduce((sum, m) => sum + m.budget.used, 0),
    totalRewardsPaid: missions.reduce((sum, m) => sum + m.performance.totalRewardsPaid, 0),
    totalParticipants: missions.reduce((sum, m) => sum + m.performance.totalParticipants, 0),
    totalSuccessfulReferrals: missions.reduce((sum, m) => sum + m.performance.successfulReferrals, 0),
    averageConversionRate: missions.length > 0 
      ? missions.reduce((sum, m) => sum + m.performance.conversionRate, 0) / missions.length 
      : 0
  }
}