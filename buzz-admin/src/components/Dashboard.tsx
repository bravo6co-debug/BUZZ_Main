import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { StatsCard } from './shared/StatsCard'
import { 
  Users, 
  TrendingUp, 
  Store, 
  DollarSign, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Eye
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { monthlyData, referralData, storeStatusData, recentNotifications } from '../data/mockData'

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl text-foreground">대시보드</h1>
          <p className="text-muted-foreground mt-1">시스템 운영 현황을 한눈에 확인하세요</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            실시간 모니터링
          </Button>
          <Button size="sm">데이터 새로고침</Button>
        </div>
      </div>

      {/* 운영 현황 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="전체 회원수"
          value="124,847"
          icon={Users}
          trend={{ value: "+12.5% 전월 대비", isPositive: true }}
        />
        <StatsCard
          title="활성 리퍼럴"
          value="8,924"
          icon={TrendingUp}
          trend={{ value: "+8.2% 이번 주", isPositive: true }}
        />
        <StatsCard
          title="이번달 가입"
          value="2,847"
          icon={Users}
          trend={{ value: "-3.1% 지난달 대비", isPositive: false }}
        />
        <StatsCard
          title="이번달 예산 사용률"
          value="95.2%"
          icon={DollarSign}
          description="예산 한계 근접"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 예산 집행 현황 */}
        <Card>
          <CardHeader>
            <CardTitle>예산 집행 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [
                    new Intl.NumberFormat('ko-KR').format(value as number) + '원',
                    value === monthlyData[0]?.budget ? '예산' : '집행'
                  ]}
                />
                <Bar dataKey="budget" fill="#e2e8f0" name="예산" />
                <Bar dataKey="spent" fill="#3b82f6" name="집행" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 리퍼럴 활동 추이 */}
        <Card>
          <CardHeader>
            <CardTitle>주간 리퍼럴 활동</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={referralData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  dot={{ fill: '#22c55e' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 매장 현황 & 실시간 알림 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 매장 현황 */}
        <Card>
          <CardHeader>
            <CardTitle>매장 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>등록 매장</span>
                <span className="text-lg">1,370</span>
              </div>
              <div className="flex justify-between items-center">
                <span>활성 매장</span>
                <span className="text-lg text-green-600">1,247</span>
              </div>
              <div className="flex justify-between items-center">
                <span>정산 요청</span>
                <span className="text-lg text-orange-600">89</span>
              </div>
            </div>
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={storeStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    dataKey="value"
                  >
                    {storeStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 실시간 알림 */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>실시간 알림</CardTitle>
            <Button variant="outline" size="sm">모두 보기</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentNotifications.map((notification) => (
                <div key={notification.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="mt-0.5">
                    {notification.type === 'warning' && <AlertCircle className="w-4 h-4 text-orange-500" />}
                    {notification.type === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {notification.type === 'info' && <Clock className="w-4 h-4 text-blue-500" />}
                    {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-foreground truncate">{notification.title}</p>
                      <span className="text-xs text-muted-foreground">{notification.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}