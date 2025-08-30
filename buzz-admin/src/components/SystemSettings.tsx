import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Slider } from './ui/slider'
import { StatsCard } from './shared/StatsCard'
import { RewardPolicyEditModal } from './RewardPolicyEditModal'
import { 
  Settings, 
  Shield, 
  Activity, 
  AlertTriangle, 
  Cpu,
  HardDrive,
  Wifi,
  Lock,
  Key,
  Eye,
  Plus,
  Edit,
  BarChart3
} from 'lucide-react'
import { systemStatus, securitySettings, monitoringAlerts } from '../data/systemData'
import { RewardPolicy, RewardPolicyService } from '../data/rewardPolicyData'

export function SystemSettings() {
  const [activeTab, setActiveTab] = useState('policies')
  const [sessionTimeout, setSessionTimeout] = useState([30])
  const [maxLoginAttempts, setMaxLoginAttempts] = useState([5])
  const [rewardPolicies, setRewardPolicies] = useState<RewardPolicy[]>([])
  const [editingPolicy, setEditingPolicy] = useState<RewardPolicy | undefined>()
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    loadRewardPolicies()
  }, [])

  const loadRewardPolicies = () => {
    setRewardPolicies(RewardPolicyService.getPolicies())
  }

  const handlePolicyEdit = (policy: RewardPolicy) => {
    setEditingPolicy(policy)
    setIsModalOpen(true)
  }

  const handlePolicyCreate = () => {
    setEditingPolicy(undefined)
    setIsModalOpen(true)
  }

  const handlePolicySave = (policy: RewardPolicy) => {
    loadRewardPolicies()
  }

  const handlePolicyToggle = (policyId: string, isActive: boolean) => {
    if (isActive) {
      RewardPolicyService.activatePolicy(policyId, '관리자', '정책 활성화')
    } else {
      RewardPolicyService.deactivatePolicy(policyId, '관리자', '정책 비활성화')
    }
    loadRewardPolicies()
  }

  const policySummary = RewardPolicyService.getPolicySummary()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl text-foreground">시스템설정</h1>
          <p className="text-muted-foreground mt-1">시스템 정책, 보안, 모니터링을 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Activity className="w-4 h-4 mr-2" />
            시스템 상태
          </Button>
          <Button size="sm">
            <Settings className="w-4 h-4 mr-2" />
            고급 설정
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="policies">정책 및 보상 설정</TabsTrigger>
          <TabsTrigger value="monitoring">시스템 모니터링</TabsTrigger>
          <TabsTrigger value="security">보안 설정</TabsTrigger>
        </TabsList>

        {/* 정책 및 보상 설정 */}
        <TabsContent value="policies" className="space-y-6">
          {/* 정책 요약 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatsCard
              title="총 정책 수"
              value={`${policySummary.totalPolicies}개`}
              icon={BarChart3}
            />
            <StatsCard
              title="활성 정책"
              value={`${policySummary.activePolicies}개`}
              icon={Activity}
            />
            <StatsCard
              title="비활성 정책"
              value={`${policySummary.inactivePolicies}개`}
              icon={AlertTriangle}
            />
            <StatsCard
              title="예상 예산"
              value={`${policySummary.totalBudgetAllocated.toLocaleString()}원`}
              icon={Settings}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>통합 보상 정책 관리</CardTitle>
              <Button onClick={handlePolicyCreate} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                새 정책 추가
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rewardPolicies.map((policy) => (
                  <div key={policy.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium">{policy.name}</h4>
                        <Badge variant={policy.status === 'active' ? 'default' : 'secondary'}>
                          {policy.status === 'active' ? '활성' : '비활성'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {policy.type === 'referral_recommender' ? '리퍼럴 추천인' :
                           policy.type === 'referral_referee' ? '리퍼럴 피추천인' :
                           policy.type === 'review' ? '리뷰' :
                           policy.type === 'store_visit' ? '매장방문' :
                           policy.type === 'qr_first_use' ? 'QR첫사용' :
                           policy.type === 'repeat_purchase' ? '재구매' :
                           policy.type === 'signup' ? '신규가입' : '사용자정의'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{policy.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>우선순위: {policy.priority}</span>
                        {policy.conditions.maxRewards && (
                          <span>최대 {policy.conditions.maxRewards}회</span>
                        )}
                        {policy.conditions.minOrderAmount && (
                          <span>최소주문 {policy.conditions.minOrderAmount.toLocaleString()}원</span>
                        )}
                        <span>수정: {new Date(policy.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {policy.reward.amount.toLocaleString()}
                          {policy.reward.currency || policy.reward.unit}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {policy.reward.type === 'point' ? '포인트' :
                           policy.reward.type === 'cash' ? '현금' :
                           policy.reward.type === 'coupon' ? '쿠폰' : '할인'}
                        </Badge>
                      </div>
                      <Switch
                        checked={policy.status === 'active'}
                        onCheckedChange={(checked) => handlePolicyToggle(policy.id, checked)}
                      />
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handlePolicyEdit(policy)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        수정
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>시스템 한도 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>일일 최대 리퍼럴 수</Label>
                <Input defaultValue="1000" className="mt-2" />
              </div>
              <div>
                <Label>월간 최대 예산 (원)</Label>
                <Input defaultValue="100000000" className="mt-2" />
              </div>
              <div>
                <Label>매장당 최대 월 정산 (원)</Label>
                <Input defaultValue="10000000" className="mt-2" />
              </div>
              <Button>설정 저장</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 시스템 모니터링 */}
        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatsCard
              title="CPU 사용률"
              value={`${systemStatus.cpu}%`}
              icon={Cpu}
            />
            <StatsCard
              title="메모리 사용률"
              value={`${systemStatus.memory}%`}
              icon={HardDrive}
            />
            <StatsCard
              title="디스크 사용률"
              value={`${systemStatus.disk}%`}
              icon={HardDrive}
            />
            <StatsCard
              title="네트워크 상태"
              value={`${systemStatus.network}%`}
              icon={Wifi}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>시스템 알림</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monitoringAlerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`p-3 rounded-lg border-l-4 ${
                      alert.severity === 'high' ? 'border-red-500 bg-red-50' :
                      alert.severity === 'medium' ? 'border-orange-500 bg-orange-50' :
                      'border-blue-500 bg-blue-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <AlertTriangle 
                          className={`w-4 h-4 ${
                            alert.severity === 'high' ? 'text-red-500' :
                            alert.severity === 'medium' ? 'text-orange-500' :
                            'text-blue-500'
                          }`} 
                        />
                        <span className="text-sm">{alert.message}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{alert.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 보안 설정 */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                보안 정책
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securitySettings.map((setting) => (
                  <div key={setting.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm">{setting.name}</h4>
                        <Badge variant={
                          setting.level === 'high' ? 'destructive' :
                          setting.level === 'medium' ? 'secondary' : 'outline'
                        }>
                          {setting.level === 'high' ? '높음' :
                           setting.level === 'medium' ? '보통' : '낮음'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{setting.description}</p>
                    </div>
                    <Switch defaultChecked={setting.enabled} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  인증 설정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>세션 타임아웃 (분)</Label>
                  <div className="mt-2">
                    <Slider
                      value={sessionTimeout}
                      onValueChange={setSessionTimeout}
                      max={120}
                      min={5}
                      step={5}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>5분</span>
                      <span>{sessionTimeout[0]}분</span>
                      <span>120분</span>
                    </div>
                  </div>
                </div>
                <div>
                  <Label>최대 로그인 시도 횟수</Label>
                  <div className="mt-2">
                    <Slider
                      value={maxLoginAttempts}
                      onValueChange={setMaxLoginAttempts}
                      max={10}
                      min={3}
                      step={1}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>3회</span>
                      <span>{maxLoginAttempts[0]}회</span>
                      <span>10회</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  API 보안
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="api-key">API 키 관리</Label>
                  <div className="flex gap-2 mt-2">
                    <Input id="api-key" value="sk-1234****" disabled />
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="rate-limit">API 요청 제한 (분당)</Label>
                  <Input id="rate-limit" defaultValue="1000" className="mt-2" />
                </div>
                <Button size="sm">새 API 키 생성</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 보상 정책 편집 모달 */}
      <RewardPolicyEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        policy={editingPolicy}
        onSave={handlePolicySave}
      />
    </div>
  )
}