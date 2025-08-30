import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { 
  DollarSign, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  Settings, 
  Play, 
  Pause,
  QrCode,
  Target,
  Zap,
  Loader2
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { StatsCard } from './shared/StatsCard'
import { budgetApi, eventsApi } from '../services/api.service'
import { budgetControlService } from '../services/budgetControl.service'
import { logAction } from '../services/auditLog.service'
import { budgetData, qrEvents } from '../data/mockData'

export function BudgetManagement() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [budgetOverview, setBudgetOverview] = useState<any>(null)
  const [eventsList, setEventsList] = useState<any[]>(qrEvents)
  const [emergencyControls, setEmergencyControls] = useState<any[]>([])
  const [budgetUsage, setBudgetUsage] = useState<any>(null)
  const [adminUser, setAdminUser] = useState<any>(null)

  useEffect(() => {
    loadBudgetData()
    loadEmergencyControls()
    checkBudgetStatus()
    
    // 로그인한 관리자 정보 가져오기
    const admin = JSON.parse(localStorage.getItem('admin_user') || '{}')
    setAdminUser(admin)
    
    // 5분마다 예산 상태 체크
    const interval = setInterval(() => {
      checkBudgetStatus()
    }, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  const loadBudgetData = async () => {
    try {
      setLoading(true)
      const [budgetResponse, eventsResponse] = await Promise.all([
        budgetApi.getOverview(),
        eventsApi.getEvents()
      ])

      if (budgetResponse.success && budgetResponse.data) {
        setBudgetOverview(budgetResponse.data)
      }

      if (eventsResponse.success && eventsResponse.data) {
        setEventsList(eventsResponse.data)
      }
    } catch (error) {
      console.error('Failed to load budget data:', error)
      // Use mock data as fallback
    } finally {
      setLoading(false)
    }
  }

  const loadEmergencyControls = () => {
    const controls = budgetControlService.getEmergencyControls()
    setEmergencyControls(controls)
  }

  const checkBudgetStatus = async () => {
    const usage = await budgetControlService.checkBudgetStatus()
    setBudgetUsage(usage)
  }

  const toggleEmergencyControl = (id: string) => {
    const control = emergencyControls.find(c => c.id === id)
    if (!control) return
    
    if (control.enabled) {
      // 차단 해제
      budgetControlService.deactivateEmergencyBlock(
        id, 
        adminUser?.id || 'unknown',
        adminUser?.name || 'Unknown Admin'
      )
    } else {
      // 차단 활성화
      const updatedControls = emergencyControls.map(c => 
        c.id === id ? { ...c, enabled: true, blockedSince: new Date().toISOString(), blockedBy: adminUser?.name } : c
      )
      setEmergencyControls(updatedControls)
      
      // 로그 기록
      logAction.emergencyStop(
        adminUser?.id || 'unknown',
        adminUser?.name || 'Unknown Admin',
        control.name
      )
    }
    
    loadEmergencyControls()
  }

  const handleSaveBudgetSettings = async () => {
    try {
      const monthlyBudget = (document.getElementById('monthly-budget') as HTMLInputElement)?.value
      const dailyLimit = (document.getElementById('daily-limit') as HTMLInputElement)?.value
      const warningThreshold = (document.getElementById('warning-threshold') as HTMLInputElement)?.value
      const autoBlock = (document.getElementById('auto-block') as HTMLInputElement)?.checked

      // 서비스에 저장
      budgetControlService.updateSettings({
        monthlyBudget: parseInt(monthlyBudget),
        dailyLimit: parseInt(dailyLimit),
        warningThreshold: parseInt(warningThreshold),
        autoBlockEnabled: autoBlock
      }, adminUser?.id || 'unknown', adminUser?.name || 'Unknown Admin')

      // API 호출 (백엔드 연동시)
      await budgetApi.allocate({
        monthlyBudget: parseInt(monthlyBudget),
        dailyLimit: parseInt(dailyLimit),
        warningThreshold: parseInt(warningThreshold)
      })

      alert('설정이 저장되었습니다')
      checkBudgetStatus()
    } catch (error) {
      console.error('Failed to save budget settings:', error)
      alert('설정 저장에 실패했습니다')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl text-foreground">예산관리</h1>
          <p className="text-muted-foreground mt-1">예산 집행 현황과 정책을 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            정책 설정
          </Button>
          <Button size="sm">
            <AlertTriangle className="w-4 h-4 mr-2" />
            긴급 제어
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">예산 대시보드</TabsTrigger>
          <TabsTrigger value="policy">정책 설정</TabsTrigger>
          <TabsTrigger value="emergency">긴급 제어</TabsTrigger>
          <TabsTrigger value="qr-events">QR 이벤트</TabsTrigger>
        </TabsList>

        {/* 예산 집행 대시보드 */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* 예산 현황 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="이번달 총 예산"
              value="₩100,000,000"
              icon={DollarSign}
              description="지난달과 동일"
            />
            <StatsCard
              title="사용된 예산"
              value="₩95,200,000"
              icon={TrendingUp}
              description="95.2% 사용률"
            />
            <StatsCard
              title="남은 예산"
              value="₩4,800,000"
              icon={TrendingDown}
              description="4.8% 잔여"
            />
            <StatsCard
              title="일평균 사용"
              value="₩3,200,000"
              icon={Target}
              description="목표 대비 적정"
            />
          </div>

          {/* 예산 사용 추이 차트 */}
          <Card>
            <CardHeader>
              <CardTitle>예산 사용 추이</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={budgetData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [
                      new Intl.NumberFormat('ko-KR').format(value as number) + '원'
                    ]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="budget" 
                    stackId="1" 
                    stroke="#e2e8f0" 
                    fill="#e2e8f0" 
                    name="총 예산"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="spent" 
                    stackId="2" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    name="사용 예산"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="remaining" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="잔여 예산"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 정책 설정 */}
        <TabsContent value="policy" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>예산 한도 설정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="monthly-budget">월간 예산 (원)</Label>
                  <Input id="monthly-budget" defaultValue="100000000" />
                </div>
                <div>
                  <Label htmlFor="daily-limit">일일 한도 (원)</Label>
                  <Input id="daily-limit" defaultValue="5000000" />
                </div>
                <div>
                  <Label htmlFor="warning-threshold">경고 임계값 (%)</Label>
                  <Input id="warning-threshold" defaultValue="90" />
                </div>
                <Button onClick={handleSaveBudgetSettings}>설정 저장</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>자동 제어 설정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>예산 초과 시 자동 중단</Label>
                    <p className="text-sm text-muted-foreground">일일 한도 초과 시 자동으로 리퍼럴 중단</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>경고 알림 발송</Label>
                    <p className="text-sm text-muted-foreground">임계값 도달 시 관리자에게 알림</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>주말 예산 제한</Label>
                    <p className="text-sm text-muted-foreground">주말에는 예산 사용량을 50%로 제한</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 긴급 제어 센터 */}
        <TabsContent value="emergency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-500" />
                긴급 제어 센터
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {emergencyControls.map((control) => (
                  <div key={control.id} className={`p-4 border rounded-lg ${
                    control.level === 'critical' ? 'border-red-200 bg-red-50' :
                    control.level === 'warning' ? 'border-orange-200 bg-orange-50' :
                    'border-blue-200 bg-blue-50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm">{control.name}</h3>
                      <Switch 
                        checked={control.enabled} 
                        onCheckedChange={() => toggleEmergencyControl(control.id)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{control.description}</p>
                    <Badge 
                      variant={control.enabled ? 'default' : 'secondary'}
                      className="mt-2"
                    >
                      {control.enabled ? '활성화' : '비활성화'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* QR 이벤트 배포 관리 */}
        <TabsContent value="qr-events" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg">QR 이벤트 관리</h3>
            <Button>
              <QrCode className="w-4 h-4 mr-2" />
              새 이벤트 생성
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {qrEvents.map((event) => (
              <Card key={event.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg">{event.name}</h4>
                        <Badge 
                          variant={
                            event.status === 'active' ? 'default' :
                            event.status === 'paused' ? 'secondary' : 'outline'
                          }
                        >
                          {event.status === 'active' ? '진행중' :
                           event.status === 'paused' ? '일시정지' : '비활성'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">코드: {event.code}</p>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">예산</p>
                          <p className="text-sm">₩{event.budget.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">사용</p>
                          <p className="text-sm">₩{event.used.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">참여자</p>
                          <p className="text-sm">{event.participants.toLocaleString()}명</p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${(event.used / event.budget) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {((event.used / event.budget) * 100).toFixed(1)}% 사용
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        {event.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button variant="outline" size="sm">수정</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}