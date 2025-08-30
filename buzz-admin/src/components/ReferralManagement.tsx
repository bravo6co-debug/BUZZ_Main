import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { StatsCard } from './shared/StatsCard'
import { SearchAndFilter } from './shared/SearchAndFilter'
import { toast } from 'sonner@2.0.3'
import { 
  Plus,
  Edit,
  Trash2,
  TrendingUp, 
  Users, 
  AlertTriangle, 
  Shield,
  BarChart3,
  Activity,
  DollarSign,
  Target,
  Gift,
  Eye,
  Filter
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { 
  getMissions, 
  createMission, 
  updateMission, 
  deleteMission, 
  getMissionSummary,
  ReferralMission, 
  REWARD_TEMPLATES 
} from '../data/referralMissionData'
import { RewardPolicyService, PolicyType } from '../data/rewardPolicyData'

const performanceData = [
  { date: '01/01', newReferrals: 245, conversions: 156, revenue: 2340000 },
  { date: '01/02', newReferrals: 189, conversions: 134, revenue: 2010000 },
  { date: '01/03', newReferrals: 312, conversions: 201, revenue: 3015000 },
  { date: '01/04', newReferrals: 278, conversions: 178, revenue: 2670000 },
  { date: '01/05', newReferrals: 356, conversions: 234, revenue: 3510000 },
  { date: '01/06', newReferrals: 289, conversions: 189, revenue: 2835000 },
  { date: '01/07', newReferrals: 401, conversions: 267, revenue: 4005000 },
]

export function ReferralManagement() {
  const [activeTab, setActiveTab] = useState('missions')
  const [searchTerm, setSearchTerm] = useState('')
  const [missions, setMissions] = useState<ReferralMission[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingMission, setEditingMission] = useState<ReferralMission | null>(null)

  // 새 미션 생성 폼 상태
  const [newMission, setNewMission] = useState({
    title: '',
    description: '',
    type: 'signup' as const,
    reward: {
      type: 'point' as const,
      amount: 0,
      currency: 'KRW',
      description: ''
    },
    conditions: {
      minAmount: 0,
      maxRewards: 0,
      validPeriod: '',
      targetAudience: [] as string[]
    },
    budget: {
      allocated: 0,
      used: 0,
      remaining: 0
    },
    performance: {
      totalParticipants: 0,
      successfulReferrals: 0,
      totalRewardsPaid: 0,
      conversionRate: 0
    },
    status: 'active' as const,
    createdBy: '관리자'
  })

  useEffect(() => {
    loadMissions()
  }, [])

  const loadMissions = () => {
    setMissions(getMissions())
  }

  const handleCreateMission = async () => {
    if (!newMission.title || !newMission.description || newMission.reward.amount <= 0) {
      toast.error('모든 필드를 올바르게 입력해주세요.')
      return
    }

    // 통합 보상 정책과의 충돌 검증
    const policyType = mapMissionTypeToPolicy(newMission.type)
    if (policyType) {
      const basePolicy = RewardPolicyService.getPolicyByType(policyType)
      if (basePolicy) {
        // 보상 금액이 기준 정책을 초과하는지 확인
        if (newMission.reward.amount > basePolicy.reward.amount * 1.5) {
          toast.error(`이 미션의 보상은 기준 정책(${basePolicy.reward.amount.toLocaleString()}${basePolicy.reward.currency || basePolicy.reward.unit})의 1.5배를 초과할 수 없습니다.`)
          return
        }
        
        // 조건도 기준 정책을 참고하도록 제안
        if (basePolicy.conditions.minOrderAmount && newMission.conditions.minAmount && 
            newMission.conditions.minAmount < basePolicy.conditions.minOrderAmount) {
          const confirmed = confirm(`기준 정책에서는 최소 주문 금액이 ${basePolicy.conditions.minOrderAmount.toLocaleString()}원입니다. 계속하시겠습니까?`)
          if (!confirmed) return
        }
      }
    }

    try {
      const missionData = {
        ...newMission,
        budget: {
          ...newMission.budget,
          remaining: newMission.budget.allocated
        }
      }
      
      createMission(missionData)
      loadMissions()
      setIsCreateDialogOpen(false)
      resetNewMission()
      toast.success('미션이 생성되었습니다.')
    } catch (error) {
      toast.error('미션 생성에 실패했습니다.')
    }
  }

  // 미션 타입을 정책 타입으로 매핑하는 함수
  const mapMissionTypeToPolicy = (missionType: string): PolicyType | null => {
    switch (missionType) {
      case 'signup': return 'signup'
      case 'first_qr_use': return 'qr_first_use'
      case 'repeat_purchase': return 'repeat_purchase'
      case 'review': return 'review'
      default: return null
    }
  }

  const handleUpdateMission = () => {
    if (!editingMission) return

    try {
      updateMission(editingMission.id, editingMission)
      loadMissions()
      setIsEditDialogOpen(false)
      setEditingMission(null)
      toast.success('미션이 수정되었습니다.')
    } catch (error) {
      toast.error('미션 수정에 실패했습니다.')
    }
  }

  const handleDeleteMission = (mission: ReferralMission) => {
    try {
      deleteMission(mission.id)
      loadMissions()
      toast.success('미션이 삭제되었습니다.')
    } catch (error) {
      toast.error('미션 삭제에 실패했습니다.')
    }
  }

  const resetNewMission = () => {
    setNewMission({
      title: '',
      description: '',
      type: 'signup',
      reward: {
        type: 'point',
        amount: 0,
        currency: 'KRW',
        description: ''
      },
      conditions: {
        minAmount: 0,
        maxRewards: 0,
        validPeriod: '',
        targetAudience: []
      },
      budget: {
        allocated: 0,
        used: 0,
        remaining: 0
      },
      performance: {
        totalParticipants: 0,
        successfulReferrals: 0,
        totalRewardsPaid: 0,
        conversionRate: 0
      },
      status: 'active',
      createdBy: '관리자'
    })
  }

  const applyRewardTemplate = (type: keyof typeof REWARD_TEMPLATES) => {
    // 먼저 통합 보상 정책에서 기준을 찾아서 적용
    const policyType = mapMissionTypeToPolicy(type)
    const basePolicy = policyType ? RewardPolicyService.getPolicyByType(policyType) : null
    
    let rewardData
    if (basePolicy) {
      // 기준 정책이 있으면 해당 정책을 기본값으로 사용
      rewardData = {
        type: basePolicy.reward.type,
        amount: basePolicy.reward.amount,
        currency: basePolicy.reward.currency,
        unit: basePolicy.reward.unit,
        description: `${basePolicy.name} 기반 보상`
      }
      
      // 조건도 기준 정책에서 가져오기
      setNewMission(prev => ({
        ...prev,
        reward: {
          ...prev.reward,
          ...rewardData
        },
        conditions: {
          ...prev.conditions,
          minAmount: basePolicy.conditions.minOrderAmount || prev.conditions.minAmount,
          maxRewards: basePolicy.conditions.maxRewards || prev.conditions.maxRewards
        }
      }))
      
      // 사용자에게 기준 정책 적용됨을 알림
      toast.info(`기준 정책(${basePolicy.name})이 적용되었습니다. 보상: ${basePolicy.reward.amount.toLocaleString()}${basePolicy.reward.currency || basePolicy.reward.unit}`)
    } else {
      // 기준 정책이 없으면 기존 템플릿 사용
      const template = REWARD_TEMPLATES[type]
      setNewMission(prev => ({
        ...prev,
        reward: {
          ...prev.reward,
          ...template
        }
      }))
    }
  }

  const filteredMissions = missions.filter(mission =>
    mission.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mission.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const summary = getMissionSummary()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1>리퍼럴관리</h1>
          <p className="text-muted-foreground mt-1">리퍼럴 미션과 보상을 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                미션 생성
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>새 리퍼럴 미션 생성</DialogTitle>
                <DialogDescription>
                  새로운 리퍼럴 미션과 보상을 설정합니다.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* 기본 정보 */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">미션 제목</Label>
                    <Input
                      id="title"
                      value={newMission.title}
                      onChange={(e) => setNewMission(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="예: 친구 초대 미션"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">미션 설명</Label>
                    <Textarea
                      id="description"
                      value={newMission.description}
                      onChange={(e) => setNewMission(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="미션에 대한 자세한 설명을 입력하세요"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">미션 유형</Label>
                    <Select
                      value={newMission.type}
                      onValueChange={(value) => {
                        setNewMission(prev => ({ ...prev, type: value as any }))
                        applyRewardTemplate(value as keyof typeof REWARD_TEMPLATES)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="signup">신규 가입</SelectItem>
                        <SelectItem value="first_qr_use">QR코드 첫 사용</SelectItem>
                        <SelectItem value="repeat_purchase">재구매</SelectItem>
                        <SelectItem value="review">리뷰 작성</SelectItem>
                        <SelectItem value="custom">사용자 정의</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* 기준 정책 안내 */}
                    {(() => {
                      const policyType = mapMissionTypeToPolicy(newMission.type)
                      const basePolicy = policyType ? RewardPolicyService.getPolicyByType(policyType) : null
                      if (basePolicy) {
                        return (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Shield className="w-4 h-4 text-blue-500" />
                              <span className="text-sm font-medium text-blue-700">기준 정책 적용됨</span>
                            </div>
                            <p className="text-xs text-blue-600">
                              {basePolicy.name}: {basePolicy.reward.amount.toLocaleString()}{basePolicy.reward.currency || basePolicy.reward.unit}
                              {basePolicy.conditions.minOrderAmount && ` (최소주문: ${basePolicy.conditions.minOrderAmount.toLocaleString()}원)`}
                              {basePolicy.conditions.maxRewards && ` (최대 ${basePolicy.conditions.maxRewards}회)`}
                            </p>
                            <p className="text-xs text-blue-500 mt-1">
                              이 미션의 보상은 기준 정책의 1.5배를 초과할 수 없습니다.
                            </p>
                          </div>
                        )
                      }
                      return null
                    })()}
                  </div>
                </div>

                {/* 보상 설정 */}
                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="text-sm">보상 설정</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reward-type">보상 유형</Label>
                      <Select
                        value={newMission.reward.type}
                        onValueChange={(value) => setNewMission(prev => ({
                          ...prev,
                          reward: { ...prev.reward, type: value as any }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="point">포인트</SelectItem>
                          <SelectItem value="cash">현금</SelectItem>
                          <SelectItem value="coupon">쿠폰</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reward-amount">보상 금액</Label>
                      <Input
                        id="reward-amount"
                        type="number"
                        value={newMission.reward.amount}
                        onChange={(e) => setNewMission(prev => ({
                          ...prev,
                          reward: { ...prev.reward, amount: parseInt(e.target.value) || 0 }
                        }))}
                        placeholder="1000"
                      />
                    </div>
                    {newMission.reward.type === 'cash' && (
                      <div className="space-y-2">
                        <Label htmlFor="currency">통화</Label>
                        <Select
                          value={newMission.reward.currency || 'KRW'}
                          onValueChange={(value) => setNewMission(prev => ({
                            ...prev,
                            reward: { ...prev.reward, currency: value }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="KRW">KRW (원)</SelectItem>
                            <SelectItem value="USD">USD (달러)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reward-description">보상 설명</Label>
                    <Input
                      id="reward-description"
                      value={newMission.reward.description}
                      onChange={(e) => setNewMission(prev => ({
                        ...prev,
                        reward: { ...prev.reward, description: e.target.value }
                      }))}
                      placeholder="보상에 대한 설명"
                    />
                  </div>
                </div>

                {/* 조건 및 예산 설정 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="text-sm">조건 설정</h4>
                    <div className="space-y-2">
                      <Label htmlFor="min-amount">최소 구매 금액</Label>
                      <Input
                        id="min-amount"
                        type="number"
                        value={newMission.conditions.minAmount}
                        onChange={(e) => setNewMission(prev => ({
                          ...prev,
                          conditions: { ...prev.conditions, minAmount: parseInt(e.target.value) || 0 }
                        }))}
                        placeholder="30000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max-rewards">최대 보상 횟수</Label>
                      <Input
                        id="max-rewards"
                        type="number"
                        value={newMission.conditions.maxRewards}
                        onChange={(e) => setNewMission(prev => ({
                          ...prev,
                          conditions: { ...prev.conditions, maxRewards: parseInt(e.target.value) || 0 }
                        }))}
                        placeholder="100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valid-period">유효 기간</Label>
                      <Input
                        id="valid-period"
                        type="date"
                        value={newMission.conditions.validPeriod}
                        onChange={(e) => setNewMission(prev => ({
                          ...prev,
                          conditions: { ...prev.conditions, validPeriod: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="text-sm">예산 설정</h4>
                    <div className="space-y-2">
                      <Label htmlFor="allocated-budget">할당 예산</Label>
                      <Input
                        id="allocated-budget"
                        type="number"
                        value={newMission.budget.allocated}
                        onChange={(e) => setNewMission(prev => ({
                          ...prev,
                          budget: { ...prev.budget, allocated: parseInt(e.target.value) || 0 }
                        }))}
                        placeholder="1000000"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>예상 최대 지출: {(newMission.reward.amount * (newMission.conditions.maxRewards || 0)).toLocaleString()}원</p>
                      <p>단위당 비용: {newMission.reward.amount.toLocaleString()}원</p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleCreateMission}>
                  미션 생성
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            리포트 생성
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="missions">미션 및 보상 관리</TabsTrigger>
          <TabsTrigger value="performance">성과 모니터링</TabsTrigger>
          <TabsTrigger value="security">부정 사용 탐지</TabsTrigger>
        </TabsList>

        {/* 미션 및 보상 관리 */}
        <TabsContent value="missions" className="space-y-6">
          {/* 미션 현황 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatsCard
              title="총 미션 수"
              value={summary.totalMissions.toString()}
              icon={Target}
              description="활성 및 비활성 포함"
            />
            <StatsCard
              title="활성 미션"
              value={summary.activeMissions.toString()}
              icon={Activity}
              trend={{ value: `${summary.activeMissions}/${summary.totalMissions}`, isPositive: true }}
            />
            <StatsCard
              title="총 할당 예산"
              value={`₩${(summary.totalBudgetAllocated / 1000000).toFixed(1)}M`}
              icon={DollarSign}
              description="전체 미션 예산"
            />
            <StatsCard
              title="예산 사용률"
              value={`${summary.totalBudgetAllocated > 0 ? ((summary.totalBudgetUsed / summary.totalBudgetAllocated) * 100).toFixed(1) : 0}%`}
              icon={TrendingUp}
              description={`₩${(summary.totalBudgetUsed / 1000000).toFixed(1)}M 사용`}
            />
          </div>

          <SearchAndFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            placeholder="미션 제목 또는 설명으로 검색..."
          />

          {/* 미션 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>리퍼럴 미션 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>미션</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>보상</TableHead>
                    <TableHead>예산 현황</TableHead>
                    <TableHead>성과</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMissions.map((mission) => (
                    <TableRow key={mission.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm">{mission.title}</p>
                          <p className="text-xs text-muted-foreground">{mission.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {mission.type === 'signup' && '신규가입'}
                          {mission.type === 'first_qr_use' && 'QR코드첫사용'}
                          {mission.type === 'repeat_purchase' && '재구매'}
                          {mission.type === 'review' && '리뷰작성'}
                          {mission.type === 'custom' && '사용자정의'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Gift className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-sm">
                              {mission.reward.amount.toLocaleString()}
                              {mission.reward.type === 'point' && 'P'}
                              {mission.reward.type === 'cash' && '원'}
                              {mission.reward.type === 'coupon' && '원 쿠폰'}
                            </p>
                            <p className="text-xs text-muted-foreground">{mission.reward.description}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>사용: ₩{mission.budget.used.toLocaleString()}</span>
                            <span>전체: ₩{mission.budget.allocated.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ 
                                width: `${mission.budget.allocated > 0 ? (mission.budget.used / mission.budget.allocated) * 100 : 0}%` 
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p>참여: {mission.performance.totalParticipants.toLocaleString()}</p>
                          <p>성공: {mission.performance.successfulReferrals.toLocaleString()}</p>
                          <p>전환율: {mission.performance.conversionRate.toFixed(1)}%</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={mission.status === 'active' ? 'default' : 'secondary'}>
                          {mission.status === 'active' ? '활성' : '비활성'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setEditingMission(mission)
                              setIsEditDialogOpen(true)
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>미션 삭제</AlertDialogTitle>
                                <AlertDialogDescription>
                                  "{mission.title}" 미션을 삭제하시겠습니까? 
                                  이 작업은 되돌릴 수 없습니다.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteMission(mission)}>
                                  삭제
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 수정 다이얼로그 */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>미션 수정</DialogTitle>
                <DialogDescription>
                  미션 정보와 보상을 수정합니다.
                </DialogDescription>
              </DialogHeader>
              {editingMission && (
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-title">미션 제목</Label>
                      <Input
                        id="edit-title"
                        value={editingMission.title}
                        onChange={(e) => setEditingMission(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-description">미션 설명</Label>
                      <Textarea
                        id="edit-description"
                        value={editingMission.description}
                        onChange={(e) => setEditingMission(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                      />
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="text-sm">보상 설정</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-reward-amount">보상 금액</Label>
                        <Input
                          id="edit-reward-amount"
                          type="number"
                          value={editingMission.reward.amount}
                          onChange={(e) => setEditingMission(prev => prev ? ({
                            ...prev,
                            reward: { ...prev.reward, amount: parseInt(e.target.value) || 0 }
                          }) : null)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-status">상태</Label>
                        <Select
                          value={editingMission.status}
                          onValueChange={(value) => setEditingMission(prev => prev ? ({ ...prev, status: value as any }) : null)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">활성</SelectItem>
                            <SelectItem value="inactive">비활성</SelectItem>
                            <SelectItem value="completed">완료</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleUpdateMission}>
                  수정 완료
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* 성과 모니터링 */}
        <TabsContent value="performance" className="space-y-6">
          {/* 핵심 지표 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatsCard
              title="총 참여자"
              value={summary.totalParticipants.toLocaleString()}
              icon={Users}
              trend={{ value: "+15.2% 이번 주", isPositive: true }}
            />
            <StatsCard
              title="성공 리퍼럴"
              value={summary.totalSuccessfulReferrals.toLocaleString()}
              icon={TrendingUp}
              description="전환 완료"
            />
            <StatsCard
              title="평균 전환율"
              value={`${summary.averageConversionRate.toFixed(1)}%`}
              icon={Activity}
              trend={{ value: "+2.1% 전월 대비", isPositive: true }}
            />
            <StatsCard
              title="총 보상 지급"
              value={`₩${(summary.totalRewardsPaid / 1000000).toFixed(1)}M`}
              icon={DollarSign}
              description="누적 지급액"
            />
          </div>

          {/* 성과 추이 차트 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>일별 리퍼럴 성과</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="newReferrals" stroke="#3b82f6" name="신규 리퍼럴" />
                    <Line type="monotone" dataKey="conversions" stroke="#22c55e" name="전환" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>일별 수익</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [new Intl.NumberFormat('ko-KR').format(value as number) + '원', '수익']} />
                    <Bar dataKey="revenue" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 부정 사용 탐지 */}
        <TabsContent value="security" className="space-y-6">
          {/* 보안 알림 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              title="고위험 감지"
              value="2"
              icon={AlertTriangle}
              description="즉시 조치 필요"
            />
            <StatsCard
              title="중위험 감지"
              value="7"
              icon={AlertTriangle}
              description="검토 권장"
            />
            <StatsCard
              title="정상 상태"
              value="1,891"
              icon={Shield}
              description="안전한 코드"
            />
          </div>

          {/* 의심 활동 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>최근 의심 활동</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <div>
                        <h4 className="text-sm">비정상적 사용 패턴</h4>
                        <p className="text-xs text-muted-foreground">미션: 신규 회원 추천</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">2시간 전</span>
                      <Badge variant="destructive">긴급</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">짧은 시간 내 대량 리퍼럴 발생</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">조사</Button>
                    <Button size="sm" variant="outline">미션 일시정지</Button>
                    <Button size="sm" variant="outline">무시</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}