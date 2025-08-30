export type RewardType = 'point' | 'cash' | 'coupon' | 'discount'
export type PolicyType = 'referral_recommender' | 'referral_referee' | 'review' | 'store_visit' | 'qr_first_use' | 'repeat_purchase' | 'signup' | 'custom'

export interface RewardPolicy {
  id: string
  type: PolicyType
  name: string
  description: string
  reward: {
    type: RewardType
    amount: number
    currency?: string
    unit?: string
  }
  conditions: {
    minAmount?: number
    maxRewards?: number
    validPeriod?: string
    targetAudience?: string[]
    photoRequired?: boolean
    minOrderAmount?: number
  }
  status: 'active' | 'inactive'
  priority: number
  createdAt: string
  updatedAt: string
  createdBy: string
  modifiedBy?: string
  changeHistory: PolicyChangeHistory[]
}

export interface PolicyChangeHistory {
  id: string
  policyId: string
  changedBy: string
  changedAt: string
  action: 'create' | 'update' | 'deactivate' | 'activate'
  changes: {
    field: string
    oldValue: any
    newValue: any
  }[]
  reason?: string
}

export interface PolicyTemplate {
  id: string
  name: string
  description: string
  policies: Omit<RewardPolicy, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'modifiedBy' | 'changeHistory'>[]
}

// 기본 통합 보상 정책
export const defaultRewardPolicies: RewardPolicy[] = [
  {
    id: 'policy-referral-recommender',
    type: 'referral_recommender',
    name: '리퍼럴 추천인 보상',
    description: '친구를 성공적으로 추천한 회원에게 지급하는 보상',
    reward: {
      type: 'cash',
      amount: 5000,
      currency: 'KRW'
    },
    conditions: {
      minOrderAmount: 30000,
      maxRewards: 10,
      validPeriod: '2024-12-31'
    },
    status: 'active',
    priority: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: '시스템',
    changeHistory: []
  },
  {
    id: 'policy-referral-referee',
    type: 'referral_referee',
    name: '리퍼럴 피추천인 보상',
    description: '추천을 받고 가입한 신규 회원에게 지급하는 보상',
    reward: {
      type: 'cash',
      amount: 3000,
      currency: 'KRW'
    },
    conditions: {
      minOrderAmount: 20000,
      maxRewards: 1,
      validPeriod: '2024-12-31'
    },
    status: 'active',
    priority: 2,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: '시스템',
    changeHistory: []
  },
  {
    id: 'policy-review',
    type: 'review',
    name: '리뷰 작성 보상',
    description: '주문 후 리뷰를 작성한 회원에게 지급하는 보상',
    reward: {
      type: 'coupon',
      amount: 3000,
      currency: 'KRW'
    },
    conditions: {
      photoRequired: true,
      minOrderAmount: 10000,
      maxRewards: 3
    },
    status: 'active',
    priority: 3,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: '시스템',
    changeHistory: []
  },
  {
    id: 'policy-store-visit',
    type: 'store_visit',
    name: '매장 방문 보상',
    description: '매장을 방문하고 체크인한 회원에게 지급하는 보상',
    reward: {
      type: 'point',
      amount: 500,
      unit: 'P'
    },
    conditions: {
      maxRewards: 1
    },
    status: 'active',
    priority: 4,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: '시스템',
    changeHistory: []
  },
  {
    id: 'policy-qr-first-use',
    type: 'qr_first_use',
    name: 'QR 첫 사용 보상',
    description: '추천받은 회원이 처음으로 QR 코드를 사용했을 때 추천인에게 지급',
    reward: {
      type: 'cash',
      amount: 5000,
      currency: 'KRW'
    },
    conditions: {
      minOrderAmount: 30000,
      maxRewards: 1
    },
    status: 'active',
    priority: 5,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: '시스템',
    changeHistory: []
  },
  {
    id: 'policy-signup',
    type: 'signup',
    name: '신규 가입 보상',
    description: '신규 회원 가입 완료 시 지급하는 환영 보상',
    reward: {
      type: 'point',
      amount: 1000,
      unit: 'P'
    },
    conditions: {
      maxRewards: 1
    },
    status: 'active',
    priority: 6,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: '시스템',
    changeHistory: []
  },
  {
    id: 'policy-repeat-purchase',
    type: 'repeat_purchase',
    name: '재구매 보상',
    description: '추천받은 회원이 재구매할 때 추천인에게 지급하는 보상',
    reward: {
      type: 'point',
      amount: 500,
      unit: 'P'
    },
    conditions: {
      minOrderAmount: 10000,
      maxRewards: 5
    },
    status: 'active',
    priority: 7,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: '시스템',
    changeHistory: []
  }
]

// 정책 템플릿
export const policyTemplates: PolicyTemplate[] = [
  {
    id: 'template-basic',
    name: '기본 보상 템플릿',
    description: '일반적인 서비스에 적합한 기본 보상 정책',
    policies: [
      {
        type: 'referral_recommender',
        name: '리퍼럴 추천인 보상',
        description: '친구를 성공적으로 추천한 회원에게 지급하는 보상',
        reward: { type: 'cash', amount: 3000, currency: 'KRW' },
        conditions: { minOrderAmount: 20000, maxRewards: 5 },
        status: 'active',
        priority: 1
      }
    ]
  },
  {
    id: 'template-premium',
    name: '프리미엄 보상 템플릿',
    description: '높은 보상으로 고객 충성도를 높이는 정책',
    policies: [
      {
        type: 'referral_recommender',
        name: '리퍼럴 추천인 보상',
        description: '친구를 성공적으로 추천한 회원에게 지급하는 보상',
        reward: { type: 'cash', amount: 10000, currency: 'KRW' },
        conditions: { minOrderAmount: 50000, maxRewards: 3 },
        status: 'active',
        priority: 1
      }
    ]
  }
]

// 정책 관리 클래스
export class RewardPolicyService {
  private static readonly STORAGE_KEY = 'reward_policies'
  private static readonly HISTORY_KEY = 'policy_change_history'

  static getPolicies(): RewardPolicy[] {
    const saved = localStorage.getItem(this.STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return defaultRewardPolicies
      }
    }
    return defaultRewardPolicies
  }

  static savePolicies(policies: RewardPolicy[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(policies))
  }

  static getPolicyById(id: string): RewardPolicy | null {
    const policies = this.getPolicies()
    return policies.find(policy => policy.id === id) || null
  }

  static getPolicyByType(type: PolicyType): RewardPolicy | null {
    const policies = this.getPolicies()
    return policies.find(policy => policy.type === type && policy.status === 'active') || null
  }

  static updatePolicy(id: string, updates: Partial<RewardPolicy>, changedBy: string, reason?: string): boolean {
    const policies = this.getPolicies()
    const policyIndex = policies.findIndex(policy => policy.id === id)
    
    if (policyIndex === -1) return false

    const oldPolicy = { ...policies[policyIndex] }
    const changes: PolicyChangeHistory['changes'] = []

    // 변경사항 추적
    Object.entries(updates).forEach(([key, newValue]) => {
      const oldValue = (oldPolicy as any)[key]
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          oldValue,
          newValue
        })
      }
    })

    if (changes.length === 0) return false

    // 변경 이력 추가
    const changeHistory: PolicyChangeHistory = {
      id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      policyId: id,
      changedBy,
      changedAt: new Date().toISOString(),
      action: 'update',
      changes,
      reason
    }

    policies[policyIndex] = {
      ...policies[policyIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
      modifiedBy: changedBy,
      changeHistory: [...policies[policyIndex].changeHistory, changeHistory]
    }

    this.savePolicies(policies)
    return true
  }

  static createPolicy(policyData: Omit<RewardPolicy, 'id' | 'createdAt' | 'updatedAt' | 'changeHistory'>, createdBy: string): RewardPolicy {
    const newPolicy: RewardPolicy = {
      ...policyData,
      id: `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy,
      changeHistory: [{
        id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        policyId: '',
        changedBy: createdBy,
        changedAt: new Date().toISOString(),
        action: 'create',
        changes: []
      }]
    }

    newPolicy.changeHistory[0].policyId = newPolicy.id

    const currentPolicies = this.getPolicies()
    const updatedPolicies = [...currentPolicies, newPolicy]
    this.savePolicies(updatedPolicies)

    return newPolicy
  }

  static deactivatePolicy(id: string, deactivatedBy: string, reason?: string): boolean {
    return this.updatePolicy(id, { status: 'inactive' }, deactivatedBy, reason)
  }

  static activatePolicy(id: string, activatedBy: string, reason?: string): boolean {
    return this.updatePolicy(id, { status: 'active' }, activatedBy, reason)
  }

  static validatePolicyConflicts(newPolicy: Partial<RewardPolicy>): string[] {
    const existingPolicies = this.getPolicies().filter(p => p.status === 'active')
    const conflicts: string[] = []

    if (newPolicy.type) {
      const sameTypePolicy = existingPolicies.find(p => p.type === newPolicy.type && p.id !== newPolicy.id)
      if (sameTypePolicy) {
        conflicts.push(`동일한 유형의 활성화된 정책이 이미 존재합니다: ${sameTypePolicy.name}`)
      }
    }

    return conflicts
  }

  static getRewardAmount(policyType: PolicyType): number {
    const policy = this.getPolicyByType(policyType)
    return policy?.reward.amount || 0
  }

  static isEligibleForReward(policyType: PolicyType, context: any): boolean {
    const policy = this.getPolicyByType(policyType)
    if (!policy || policy.status !== 'active') return false

    const conditions = policy.conditions

    // 최소 주문 금액 검증
    if (conditions.minOrderAmount && context.orderAmount < conditions.minOrderAmount) {
      return false
    }

    // 최대 보상 횟수 검증
    if (conditions.maxRewards && context.rewardCount >= conditions.maxRewards) {
      return false
    }

    // 사진 필수 검증 (리뷰의 경우)
    if (conditions.photoRequired && !context.hasPhoto) {
      return false
    }

    return true
  }

  static getPolicySummary() {
    const policies = this.getPolicies()
    const activePolicies = policies.filter(p => p.status === 'active')
    
    return {
      totalPolicies: policies.length,
      activePolicies: activePolicies.length,
      inactivePolicies: policies.length - activePolicies.length,
      totalBudgetAllocated: activePolicies.reduce((sum, p) => {
        const maxAmount = p.conditions.maxRewards ? p.reward.amount * p.conditions.maxRewards : p.reward.amount
        return sum + maxAmount
      }, 0),
      policyTypes: activePolicies.map(p => p.type)
    }
  }
}