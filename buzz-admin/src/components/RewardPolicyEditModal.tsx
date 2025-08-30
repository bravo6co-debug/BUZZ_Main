import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { X, Save, AlertCircle, Clock } from 'lucide-react'
import { RewardPolicy, RewardType, PolicyType, RewardPolicyService } from '../data/rewardPolicyData'

interface RewardPolicyEditModalProps {
  isOpen: boolean
  onClose: () => void
  policy?: RewardPolicy
  onSave: (policy: RewardPolicy) => void
}

const POLICY_TYPE_OPTIONS = [
  { value: 'referral_recommender' as PolicyType, label: '리퍼럴 추천인 보상' },
  { value: 'referral_referee' as PolicyType, label: '리퍼럴 피추천인 보상' },
  { value: 'review' as PolicyType, label: '리뷰 작성 보상' },
  { value: 'store_visit' as PolicyType, label: '매장 방문 보상' },
  { value: 'qr_first_use' as PolicyType, label: 'QR 첫 사용 보상' },
  { value: 'repeat_purchase' as PolicyType, label: '재구매 보상' },
  { value: 'signup' as PolicyType, label: '신규 가입 보상' },
  { value: 'custom' as PolicyType, label: '사용자 정의' }
]

const REWARD_TYPE_OPTIONS = [
  { value: 'point' as RewardType, label: '포인트' },
  { value: 'cash' as RewardType, label: '현금' },
  { value: 'coupon' as RewardType, label: '쿠폰' },
  { value: 'discount' as RewardType, label: '할인' }
]

export function RewardPolicyEditModal({ isOpen, onClose, policy, onSave }: RewardPolicyEditModalProps) {
  const [formData, setFormData] = useState<Partial<RewardPolicy>>({
    type: 'custom',
    name: '',
    description: '',
    reward: {
      type: 'point',
      amount: 0,
      currency: 'KRW',
      unit: 'P'
    },
    conditions: {
      minAmount: undefined,
      maxRewards: undefined,
      validPeriod: '',
      targetAudience: [],
      photoRequired: false,
      minOrderAmount: undefined
    },
    status: 'active',
    priority: 1
  })

  const [errors, setErrors] = useState<string[]>([])
  const [conflicts, setConflicts] = useState<string[]>([])

  useEffect(() => {
    if (policy) {
      setFormData(policy)
    } else {
      // 신규 생성 시 기본값 설정
      setFormData({
        type: 'custom',
        name: '',
        description: '',
        reward: {
          type: 'point',
          amount: 0,
          currency: 'KRW',
          unit: 'P'
        },
        conditions: {
          minAmount: undefined,
          maxRewards: undefined,
          validPeriod: '',
          targetAudience: [],
          photoRequired: false,
          minOrderAmount: undefined
        },
        status: 'active',
        priority: 1
      })
    }
    setErrors([])
    setConflicts([])
  }, [policy, isOpen])

  const validateForm = (): boolean => {
    const newErrors: string[] = []

    if (!formData.name?.trim()) {
      newErrors.push('정책 이름을 입력해주세요')
    }

    if (!formData.description?.trim()) {
      newErrors.push('정책 설명을 입력해주세요')
    }

    if (!formData.reward?.amount || formData.reward.amount <= 0) {
      newErrors.push('보상 금액은 0보다 커야 합니다')
    }

    if (formData.conditions?.minOrderAmount && formData.conditions.minOrderAmount <= 0) {
      newErrors.push('최소 주문 금액은 0보다 커야 합니다')
    }

    if (formData.conditions?.maxRewards && formData.conditions.maxRewards <= 0) {
      newErrors.push('최대 보상 횟수는 0보다 커야 합니다')
    }

    setErrors(newErrors)

    // 정책 충돌 검사
    if (formData.type) {
      const policyConflicts = RewardPolicyService.validatePolicyConflicts({
        ...formData,
        id: policy?.id
      } as RewardPolicy)
      setConflicts(policyConflicts)
    }

    return newErrors.length === 0 && conflicts.length === 0
  }

  const handleSave = () => {
    if (!validateForm()) return

    try {
      let savedPolicy: RewardPolicy

      if (policy) {
        // 기존 정책 업데이트
        const success = RewardPolicyService.updatePolicy(
          policy.id,
          formData,
          '관리자',
          '정책 수정'
        )
        if (!success) {
          setErrors(['정책 업데이트에 실패했습니다'])
          return
        }
        savedPolicy = RewardPolicyService.getPolicyById(policy.id)!
      } else {
        // 신규 정책 생성
        savedPolicy = RewardPolicyService.createPolicy(
          formData as Omit<RewardPolicy, 'id' | 'createdAt' | 'updatedAt' | 'changeHistory'>,
          '관리자'
        )
      }

      onSave(savedPolicy)
      onClose()
    } catch (error) {
      setErrors(['정책 저장 중 오류가 발생했습니다'])
    }
  }

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const updateRewardData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      reward: {
        ...prev.reward!,
        [field]: value
      }
    }))
  }

  const updateConditionsData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      conditions: {
        ...prev.conditions!,
        [field]: value
      }
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {policy ? '보상 정책 수정' : '새 보상 정책 생성'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* 오류 및 충돌 표시 */}
          {(errors.length > 0 || conflicts.length > 0) && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700">수정이 필요합니다</span>
                </div>
                {errors.map((error, index) => (
                  <p key={index} className="text-xs text-red-600">• {error}</p>
                ))}
                {conflicts.map((conflict, index) => (
                  <p key={index} className="text-xs text-orange-600">• {conflict}</p>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="policyType">정책 유형</Label>
              <Select
                value={formData.type}
                onValueChange={(value: PolicyType) => updateFormData('type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="정책 유형을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_TYPE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">우선순위</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                max="10"
                value={formData.priority || 1}
                onChange={(e) => updateFormData('priority', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="name">정책 이름</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => updateFormData('name', e.target.value)}
              placeholder="예: 리뷰 작성 보상"
            />
          </div>

          <div>
            <Label htmlFor="description">정책 설명</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => updateFormData('description', e.target.value)}
              placeholder="정책에 대한 자세한 설명을 입력하세요"
            />
          </div>

          {/* 보상 설정 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">보상 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="rewardType">보상 유형</Label>
                  <Select
                    value={formData.reward?.type}
                    onValueChange={(value: RewardType) => updateRewardData('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="보상 유형" />
                    </SelectTrigger>
                    <SelectContent>
                      {REWARD_TYPE_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="amount">보상 금액</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="100"
                    value={formData.reward?.amount || 0}
                    onChange={(e) => updateRewardData('amount', parseInt(e.target.value))}
                  />
                </div>

                <div>
                  <Label htmlFor="currency">통화/단위</Label>
                  <Input
                    id="currency"
                    value={formData.reward?.currency || formData.reward?.unit || 'KRW'}
                    onChange={(e) => {
                      if (formData.reward?.type === 'point') {
                        updateRewardData('unit', e.target.value)
                      } else {
                        updateRewardData('currency', e.target.value)
                      }
                    }}
                    placeholder="KRW, P 등"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 조건 설정 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">보상 조건</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minOrderAmount">최소 주문 금액</Label>
                  <Input
                    id="minOrderAmount"
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.conditions?.minOrderAmount || ''}
                    onChange={(e) => updateConditionsData('minOrderAmount', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="선택사항"
                  />
                </div>

                <div>
                  <Label htmlFor="maxRewards">최대 보상 횟수</Label>
                  <Input
                    id="maxRewards"
                    type="number"
                    min="1"
                    value={formData.conditions?.maxRewards || ''}
                    onChange={(e) => updateConditionsData('maxRewards', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="무제한"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="validPeriod">유효 기간</Label>
                <Input
                  id="validPeriod"
                  type="date"
                  value={formData.conditions?.validPeriod || ''}
                  onChange={(e) => updateConditionsData('validPeriod', e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="photoRequired"
                  checked={formData.conditions?.photoRequired || false}
                  onCheckedChange={(checked) => updateConditionsData('photoRequired', checked)}
                />
                <Label htmlFor="photoRequired">사진 첨부 필수 (리뷰 등)</Label>
              </div>
            </CardContent>
          </Card>

          {/* 정책 상태 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="status"
                checked={formData.status === 'active'}
                onCheckedChange={(checked) => updateFormData('status', checked ? 'active' : 'inactive')}
              />
              <Label htmlFor="status">정책 활성화</Label>
            </div>

            {policy && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  수정: {new Date(policy.updatedAt).toLocaleDateString()}
                </div>
                {policy.modifiedBy && (
                  <span>by {policy.modifiedBy}</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={errors.length > 0}>
            <Save className="w-4 h-4 mr-2" />
            저장
          </Button>
        </div>
      </div>
    </div>
  )
}