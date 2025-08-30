import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Input } from './ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { supabase } from '../lib/supabase'
import smsService from '../services/smsService'
import { 
  Store, 
  MapPin, 
  Search, 
  Filter,
  Eye,
  Check,
  X,
  Clock,
  Star,
  TrendingUp,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Settings,
  BarChart3
} from 'lucide-react'

interface BusinessApplication {
  id: string
  business_name: string
  business_number: string
  owner_name: string
  phone: string
  email: string
  category: string
  address: string
  description: string
  documents: any[]
  display_time_slots: any
  status: 'pending' | 'reviewing' | 'approved' | 'rejected'
  applied_at: string
  reviewed_at?: string
  reviewed_by?: string
  rejection_reason?: string
}

const activeStores = [
  { id: 1, name: '서울 닭갈비', owner: '정수연', location: '서울 종로구', category: '한식', joinDate: '2024-12-15', rating: 4.8, reviews: 156, revenue: 2340000, status: 'active', exposureRank: 3 },
  { id: 2, name: '명동 떡볶이', owner: '최민지', location: '서울 중구', category: '분식', joinDate: '2024-11-20', rating: 4.6, reviews: 234, revenue: 1890000, status: 'active', exposureRank: 1 },
  { id: 3, name: '이태원 피자', owner: '한동현', location: '서울 용산구', category: '양식', joinDate: '2024-10-05', rating: 4.9, reviews: 89, revenue: 3120000, status: 'active', exposureRank: 2 },
  { id: 4, name: '청담 스시', owner: '윤서아', location: '서울 강남구', category: '일식', joinDate: '2024-09-12', rating: 4.7, reviews: 67, revenue: 4560000, status: 'suspended', exposureRank: null },
]

const storeExposureData = [
  { 
    id: 1, 
    name: '서울 닭갈비', 
    owner: '정수연', 
    location: '서울 종로구', 
    category: '한식',
    dailyExposureHours: 4.8, 
    weeklyViews: 12500, 
    avgExposureTime: 2.4,
    exposureRank: 3,
    baselineDeviation: +25, // 기준 대비 +25% 노출
    lastExposure: '15분 전',
    status: 'over_exposed' // over_exposed, under_exposed, normal
  },
  { 
    id: 2, 
    name: '명동 떡볶이', 
    owner: '최민지', 
    location: '서울 중구', 
    category: '분식',
    dailyExposureHours: 1.2, 
    weeklyViews: 3200, 
    avgExposureTime: 1.8,
    exposureRank: 12,
    baselineDeviation: -40, // 기준 대비 -40% 노출
    lastExposure: '2시간 전',
    status: 'under_exposed'
  },
  { 
    id: 3, 
    name: '이태원 피자', 
    owner: '한동현', 
    location: '서울 용산구', 
    category: '양식',
    dailyExposureHours: 3.6, 
    weeklyViews: 8900, 
    avgExposureTime: 2.2,
    exposureRank: 5,
    baselineDeviation: +12,
    lastExposure: '30분 전',
    status: 'normal'
  },
  { 
    id: 4, 
    name: '청담 스시', 
    owner: '윤서아', 
    location: '서울 강남구', 
    category: '일식',
    dailyExposureHours: 0.8, 
    weeklyViews: 1800, 
    avgExposureTime: 1.1,
    exposureRank: 18,
    baselineDeviation: -65,
    lastExposure: '4시간 전',
    status: 'under_exposed'
  },
  { 
    id: 5, 
    name: '홍대 버거', 
    owner: '김태영', 
    location: '서울 마포구', 
    category: '패스트푸드',
    dailyExposureHours: 5.2, 
    weeklyViews: 15600, 
    avgExposureTime: 3.1,
    exposureRank: 1,
    baselineDeviation: +45,
    lastExposure: '5분 전',
    status: 'over_exposed'
  },
  { 
    id: 6, 
    name: '부산 곰탕', 
    owner: '박해진', 
    location: '부산 해운대구', 
    category: '한식',
    dailyExposureHours: 2.9, 
    weeklyViews: 7100, 
    avgExposureTime: 2.1,
    exposureRank: 7,
    baselineDeviation: -5,
    lastExposure: '45분 전',
    status: 'normal'
  }
]

export function StoreManagement() {
  const [activeTab, setActiveTab] = useState('approval')
  const [searchTerm, setSearchTerm] = useState('')
  const [exposureFilter, setExposureFilter] = useState('all') // all, over_exposed, under_exposed, normal
  const [pendingApplications, setPendingApplications] = useState<BusinessApplication[]>([])
  const [loading, setLoading] = useState(false)

  // 신청서 데이터 로드
  const fetchPendingApplications = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('business_applications')
        .select('*')
        .in('status', ['pending', 'reviewing'])
        .order('applied_at', { ascending: false })

      if (error) {
        console.error('Error fetching applications:', error)
        return
      }

      setPendingApplications(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingApplications()
  }, [])

  const handleApprove = async (applicationId: string) => {
    const application = pendingApplications.find(a => a.id === applicationId)
    if (!application) return

    setLoading(true)
    try {
      // 1. 임시 비밀번호 생성
      const tempPassword = Math.random().toString(36).slice(-8).toUpperCase()
      
      // 2. Supabase Auth에 사용자 계정 생성
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: application.email,
        password: tempPassword,
        email_confirm: true, // 이메일 확인 건너뛰기
        user_metadata: {
          business_name: application.business_name,
          business_number: application.business_number,
          owner_name: application.owner_name,
          phone: application.phone,
          role: 'business_owner'
        }
      })

      if (authError) {
        console.error('Auth 계정 생성 실패:', authError)
        // 이미 존재하는 이메일인 경우 기존 사용자 조회
        if (authError.message?.includes('already exists')) {
          const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
          if (!listError && users) {
            const existingUser = users.find(u => u.email === application.email)
            if (existingUser) {
              authData = { user: existingUser }
            } else {
              throw new Error('기존 사용자를 찾을 수 없습니다')
            }
          } else {
            throw authError
          }
        } else {
          throw authError
        }
      }

      // 3. business_applications 상태를 'approved'로 업데이트
      const { error: updateError } = await supabase
        .from('business_applications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          // reviewed_by는 현재 로그인한 관리자 ID (추후 구현)
        })
        .eq('id', applicationId)

      if (updateError) throw updateError

      // 4. businesses 테이블에 새 비즈니스 생성 (Auth owner_id 사용)
      const insertData = {
        owner_id: authData.user.id, // Supabase Auth에서 생성된 실제 owner_id 사용
        business_name: application.business_name,  // name이 아닌 business_name 사용
        business_number: application.business_number,
        category: application.category,
        address: application.address,
        phone: application.phone,
        verification_status: 'approved'
      }
      
      // 선택적 필드들
      if (application.description) {
        insertData.description = application.description
      }

      // 선택적 컬럼들은 존재할 때만 추가
      if (application.display_time_slots) {
        insertData.business_hours = application.display_time_slots
      }

      const { error: insertError } = await supabase
        .from('businesses')
        .insert(insertData)

      if (insertError) {
        console.error('Insert error details:', insertError)
        // businesses 테이블 삽입 실패 시 Auth 계정 삭제 (롤백)
        await supabase.auth.admin.deleteUser(authData.user.id)
        throw insertError
      }

      // 5. 임시 비밀번호 SMS 발송
      
      console.log(`매장 승인: ${application.business_name}`)
      console.log(`사업자등록번호: ${application.business_number}`)
      console.log(`SMS 발송: ${application.phone}`)
      console.log(`임시 비밀번호: ${tempPassword}`)
      
      // SMS 전송
      try {
        const smsResult = await smsService.sendApprovalSms(application, tempPassword)
        if (smsResult.success) {
          alert(`✅ 승인 완료!\n\n매장: ${application.business_name}\n사업자번호: ${application.business_number}\n임시 비밀번호: ${tempPassword}\n\n📱 SMS 전송 완료: ${application.phone}`)
        } else {
          alert(`✅ 승인 완료!\n\n매장: ${application.business_name}\n사업자번호: ${application.business_number}\n임시 비밀번호: ${tempPassword}\n\n⚠️ SMS 전송 실패: ${smsResult.error}`)
        }
      } catch (smsError) {
        console.error('SMS 전송 중 오류:', smsError)
        alert(`✅ 승인 완료!\n\n매장: ${application.business_name}\n사업자번호: ${application.business_number}\n임시 비밀번호: ${tempPassword}\n\n⚠️ SMS 전송 중 오류 발생`)
      }
      
      // 목록 새로고침
      fetchPendingApplications()
    } catch (error: any) {
      console.error('Approval error:', error)
      alert('승인 처리 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (applicationId: string, reason?: string) => {
    const application = pendingApplications.find(a => a.id === applicationId)
    if (!application) return

    const rejectReason = reason || prompt('거부 사유를 입력하세요:')
    if (!rejectReason) return

    setLoading(true)
    try {
      // business_applications 상태를 'rejected'로 업데이트
      const { error } = await supabase
        .from('business_applications')
        .update({
          status: 'rejected',
          rejection_reason: rejectReason,
          reviewed_at: new Date().toISOString(),
          // reviewed_by는 현재 로그인한 관리자 ID (추후 구현)
        })
        .eq('id', applicationId)

      if (error) throw error

      console.log(`매장 거부: ${application.business_name}`)
      console.log(`거부 사유: ${rejectReason}`)
      
      // SMS 전송
      try {
        const smsResult = await smsService.sendRejectionSms(application, rejectReason)
        if (smsResult.success) {
          alert(`❌ 가입 거부\n\n매장: ${application.business_name}\n사유: ${rejectReason}\n\n📱 SMS 전송 완료: ${application.phone}`)
        } else {
          alert(`❌ 가입 거부\n\n매장: ${application.business_name}\n사유: ${rejectReason}\n\n⚠️ SMS 전송 실패: ${smsResult.error}`)
        }
      } catch (smsError) {
        console.error('SMS 전송 중 오류:', smsError)
        alert(`❌ 가입 거부\n\n매장: ${application.business_name}\n사유: ${rejectReason}\n\n⚠️ SMS 전송 중 오류 발생`)
      }
      
      // 목록 새로고침
      fetchPendingApplications()
    } catch (error: any) {
      console.error('Rejection error:', error)
      alert('거부 처리 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExposureAdjust = (storeId: number, action: 'increase' | 'decrease') => {
    console.log('노출 조정:', storeId, action)
  }

  const filteredActiveStores = activeStores.filter(store => 
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.location.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredExposureData = storeExposureData.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.location.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = exposureFilter === 'all' || store.status === exposureFilter
    
    return matchesSearch && matchesFilter
  })

  // 노출 불균형 통계 계산
  const exposureStats = {
    overExposed: storeExposureData.filter(s => s.status === 'over_exposed').length,
    underExposed: storeExposureData.filter(s => s.status === 'under_exposed').length,
    normal: storeExposureData.filter(s => s.status === 'normal').length,
    avgDeviation: storeExposureData.reduce((sum, s) => sum + Math.abs(s.baselineDeviation), 0) / storeExposureData.length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl text-foreground">매장관리</h1>
          <p className="text-muted-foreground mt-1">매장 승인과 노출 관리를 통합적으로 운영합니다</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <TrendingUp className="w-4 h-4 mr-2" />
            노출 분석
          </Button>
          <Button size="sm">
            <Store className="w-4 h-4 mr-2" />
            매장 현황
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="approval">매장 승인 관리</TabsTrigger>
          <TabsTrigger value="exposure">노출 공평성 관리</TabsTrigger>
          <TabsTrigger value="overview">매장 현황 조회</TabsTrigger>
        </TabsList>

        {/* 매장 승인 관리 */}
        <TabsContent value="approval" className="space-y-6">
          {/* 승인 대기 현황 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">승인 대기</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl text-orange-600">{pendingApplications.length}</div>
                <p className="text-xs text-muted-foreground">실시간 데이터</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">이번 주 승인</CardTitle>
                <Check className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl text-green-600">28</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+12%</span> 전주 대비
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">거부율</CardTitle>
                <X className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl">8.3%</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">-2.1%</span> 전월 대비
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 승인 대기 매장 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>승인 대기 매장</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>매장명</TableHead>
                    <TableHead>사장님</TableHead>
                    <TableHead>사업자번호</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>위치</TableHead>
                    <TableHead>카테고리</TableHead>
                    <TableHead>신청일</TableHead>
                    <TableHead>서류</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          <span className="text-muted-foreground">데이터를 불러오는 중...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : pendingApplications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <span className="text-muted-foreground">승인 대기 중인 신청서가 없습니다.</span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingApplications.map((application) => (
                      <TableRow key={application.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback>{application.business_name[0]}</AvatarFallback>
                            </Avatar>
                            <span>{application.business_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{application.owner_name}</TableCell>
                        <TableCell>
                          <span className="text-sm font-mono">{application.business_number}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{application.phone}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm">{application.address}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{application.category}</Badge>
                        </TableCell>
                        <TableCell>{new Date(application.applied_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground">
                            {application.documents?.length || 0}개 서류
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={application.status === 'pending' ? 'secondary' : 'default'}>
                            {application.status === 'pending' ? '대기중' : '검토중'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleApprove(application.id)}
                              disabled={loading}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleReject(application.id)}
                              disabled={loading}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 노출 공평성 관리 */}
        <TabsContent value="exposure" className="space-y-6">
          {/* 노출 불균형 현황 요약 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">과다 노출 매장</CardTitle>
                <ArrowUp className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl text-red-600">{exposureStats.overExposed}</div>
                <p className="text-xs text-muted-foreground">기준 대비 +20% 이상</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">부족 노출 매장</CardTitle>
                <ArrowDown className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl text-orange-600">{exposureStats.underExposed}</div>
                <p className="text-xs text-muted-foreground">기준 대비 -20% 이하</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">정상 노출 매장</CardTitle>
                <Check className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl text-green-600">{exposureStats.normal}</div>
                <p className="text-xs text-muted-foreground">±20% 범위 내</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">평균 편차</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl">±{exposureStats.avgDeviation.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">전체 매장 기준</p>
              </CardContent>
            </Card>
          </div>

          {/* 검색 및 필터 */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="매장명, 사장님, 위치로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant={exposureFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExposureFilter('all')}
              >
                전체
              </Button>
              <Button 
                variant={exposureFilter === 'over_exposed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExposureFilter('over_exposed')}
              >
                과다노출
              </Button>
              <Button 
                variant={exposureFilter === 'under_exposed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExposureFilter('under_exposed')}
              >
                부족노출
              </Button>
              <Button 
                variant={exposureFilter === 'normal' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExposureFilter('normal')}
              >
                정상
              </Button>
            </div>
          </div>

          {/* 매장별 노출 불균형 분석 */}
          <Card>
            <CardHeader>
              <CardTitle>매장별 노출 불균형 현황</CardTitle>
              <p className="text-sm text-muted-foreground">
                기준 노출량 대비 과다/부족 노출 매장을 식별하고 조정합니다
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>매장명</TableHead>
                    <TableHead>위치</TableHead>
                    <TableHead>일일 노출시간</TableHead>
                    <TableHead>주간 조회수</TableHead>
                    <TableHead>노출 순위</TableHead>
                    <TableHead>기준 편차</TableHead>
                    <TableHead>마지막 노출</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExposureData.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>{store.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm">{store.name}</p>
                            <p className="text-xs text-muted-foreground">{store.owner}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{store.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{store.dailyExposureHours}h</span>
                          <div className="w-12 bg-muted rounded-full h-1">
                            <div 
                              className={`h-1 rounded-full ${
                                store.status === 'over_exposed' ? 'bg-red-500' :
                                store.status === 'under_exposed' ? 'bg-orange-500' :
                                'bg-green-500'
                              }`}
                              style={{ 
                                width: `${Math.min((store.dailyExposureHours / 6) * 100, 100)}%` 
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{store.weeklyViews.toLocaleString()}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">#{store.exposureRank}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {store.baselineDeviation > 0 ? (
                            <ArrowUp className="w-3 h-3 text-red-500" />
                          ) : store.baselineDeviation < 0 ? (
                            <ArrowDown className="w-3 h-3 text-orange-500" />
                          ) : (
                            <div className="w-3 h-3" />
                          )}
                          <span className={`text-sm ${
                            store.baselineDeviation > 20 ? 'text-red-600' :
                            store.baselineDeviation < -20 ? 'text-orange-600' :
                            'text-muted-foreground'
                          }`}>
                            {store.baselineDeviation > 0 ? '+' : ''}{store.baselineDeviation}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{store.lastExposure}</span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            store.status === 'over_exposed' ? 'destructive' :
                            store.status === 'under_exposed' ? 'secondary' :
                            'default'
                          }
                        >
                          {store.status === 'over_exposed' ? '과다노출' :
                           store.status === 'under_exposed' ? '부족노출' :
                           '정상'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {store.status === 'over_exposed' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleExposureAdjust(store.id, 'decrease')}
                              title="노출 감소"
                            >
                              <ArrowDown className="w-3 h-3 text-orange-500" />
                            </Button>
                          )}
                          {store.status === 'under_exposed' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleExposureAdjust(store.id, 'increase')}
                              title="노출 증가"
                            >
                              <ArrowUp className="w-3 h-3 text-green-500" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline" title="상세 분석">
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" title="노출 설정">
                            <Settings className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 매장 현황 조회 */}
        <TabsContent value="overview" className="space-y-6">
          {/* 검색 */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="매장명, 사장님, 위치로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              필터
            </Button>
          </div>

          {/* 매장 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>등록 매장 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>매장명</TableHead>
                    <TableHead>사장님</TableHead>
                    <TableHead>위치</TableHead>
                    <TableHead>가입일</TableHead>
                    <TableHead>평점</TableHead>
                    <TableHead>리뷰</TableHead>
                    <TableHead>월 수익</TableHead>
                    <TableHead>노출 순위</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActiveStores.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>{store.name[0]}</AvatarFallback>
                          </Avatar>
                          <span>{store.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{store.owner}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{store.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>{store.joinDate}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                          <span className="text-sm">{store.rating}</span>
                        </div>
                      </TableCell>
                      <TableCell>{store.reviews}</TableCell>
                      <TableCell>₩{store.revenue.toLocaleString()}</TableCell>
                      <TableCell>
                        {store.exposureRank ? (
                          <Badge variant="outline">#{store.exposureRank}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={store.status === 'active' ? 'default' : 'destructive'}>
                          {store.status === 'active' ? '활성' : '정지'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          <Eye className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}