import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Switch } from './ui/switch'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { 
  MapPin, 
  Calendar, 
  Eye, 
  Edit, 
  Trash2,
  Copy,
  Play,
  Pause,
  Megaphone,
  Image as ImageIcon,
  Plus,
  Save,
  MonitorSpeaker,
  Target,
  TrendingUp,
  Users,
  MousePointer,
  Settings
} from 'lucide-react'

const regionRecommendations = [
  { id: 1, region: '강남구', title: '강남 핫플레이스 맛집', content: '트렌디한 강남의 숨은 맛집들을 소개합니다', status: 'active', views: 15420, lastUpdate: '2025-01-20' },
  { id: 2, region: '홍대', title: '홍대 청춘 맛집', content: '젊음이 넘치는 홍대의 인기 맛집 코스', status: 'active', views: 12380, lastUpdate: '2025-01-18' },
  { id: 3, region: '명동', title: '명동 관광 맛집', content: '외국인 관광객도 사랑하는 명동 맛집', status: 'draft', views: 0, lastUpdate: '2025-01-15' },
]

const events = [
  { id: 1, title: '신년 특별 할인 이벤트', description: '새해를 맞아 전 매장 특별 할인', startDate: '2025-01-01', endDate: '2025-01-31', status: 'active', participants: 2847 },
  { id: 2, title: '리뷰 작성 이벤트', description: '리뷰 작성 시 적립금 지급', startDate: '2025-01-15', endDate: '2025-02-15', status: 'active', participants: 1592 },
  { id: 3, title: '친구 추천 이벤트', description: '친구 추천 시 양쪽 모두 혜택', startDate: '2025-02-01', endDate: '2025-02-28', status: 'scheduled', participants: 0 },
]


const popupBanners = [
  { 
    id: 1, 
    title: '신년 특별 할인 이벤트', 
    description: '전 매장 최대 30% 할인 혜택을 놓치지 마세요!',
    imageUrl: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=400&h=300',
    type: 'promotion', // promotion, event, notice, survey
    status: 'active', // active, inactive, scheduled, expired
    priority: 'high', // high, medium, low
    displaySettings: {
      showOnStartup: true,
      showDaily: false,
      showOnce: false,
      delaySeconds: 2
    },
    targetAudience: {
      newUsers: true,
      returningUsers: true,
      regions: ['서울', '부산', '대구']
    },
    schedule: {
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      startTime: '00:00',
      endTime: '23:59'
    },
    performance: {
      impressions: 125400,
      clicks: 8960,
      ctr: 7.14,
      conversions: 1280
    },
    createdAt: '2025-01-01',
    updatedAt: '2025-01-20',
    createdBy: '마케팅팀'
  },
  { 
    id: 2, 
    title: '앱 업데이트 안내', 
    description: '새로운 기능이 추가된 앱 업데이트를 확인해보세요.',
    imageUrl: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=300',
    type: 'notice',
    status: 'active',
    priority: 'medium',
    displaySettings: {
      showOnStartup: false,
      showDaily: true,
      showOnce: false,
      delaySeconds: 0
    },
    targetAudience: {
      newUsers: false,
      returningUsers: true,
      regions: ['전국']
    },
    schedule: {
      startDate: '2025-01-15',
      endDate: '2025-02-15',
      startTime: '09:00',
      endTime: '21:00'
    },
    performance: {
      impressions: 45200,
      clicks: 2260,
      ctr: 5.0,
      conversions: 890
    },
    createdAt: '2025-01-15',
    updatedAt: '2025-01-18',
    createdBy: '개발팀'
  },
  { 
    id: 3, 
    title: '고객 만족도 설문조사', 
    description: '서비스 개선을 위한 고객 의견을 들려주세요.',
    imageUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=300',
    type: 'survey',
    status: 'scheduled',
    priority: 'low',
    displaySettings: {
      showOnStartup: false,
      showDaily: false,
      showOnce: true,
      delaySeconds: 5
    },
    targetAudience: {
      newUsers: false,
      returningUsers: true,
      regions: ['서울', '경기']
    },
    schedule: {
      startDate: '2025-02-01',
      endDate: '2025-02-28',
      startTime: '10:00',
      endTime: '18:00'
    },
    performance: {
      impressions: 0,
      clicks: 0,
      ctr: 0,
      conversions: 0
    },
    createdAt: '2025-01-18',
    updatedAt: '2025-01-20',
    createdBy: 'CS팀'
  }
]

const marketerContents = [
  { id: 1, title: '1월 맛집 트렌드 분석', author: '마케팅팀', content: '2025년 1월 맛집 트렌드와 인사이트', publishDate: '2025-01-20', status: 'published', views: 3420 },
  { id: 2, title: '지역별 매출 분석 리포트', author: '데이터팀', content: '12월 지역별 매출 현황과 분석', publishDate: '2025-01-18', status: 'published', views: 2180 },
  { id: 3, title: '신규 매장 온보딩 가이드', author: '운영팀', content: '신규 매장 등록 및 운영 가이드', publishDate: '2025-01-15', status: 'draft', views: 0 },
]

export function ContentManagement() {
  const [activeTab, setActiveTab] = useState('regional')
  const [newRegionTitle, setNewRegionTitle] = useState('')
  const [newRegionContent, setNewRegionContent] = useState('')
  const [popupFilter, setPopupFilter] = useState('all') // all, active, inactive, scheduled
  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false)

  // 새 팝업배너 폼 상태
  const [newPopup, setNewPopup] = useState({
    title: '',
    description: '',
    type: 'promotion',
    priority: 'medium',
    imageUrl: '',
    displaySettings: {
      showOnStartup: false,
      showDaily: false,
      showOnce: true,
      delaySeconds: 0
    },
    targetAudience: {
      newUsers: true,
      returningUsers: true,
      regions: []
    },
    schedule: {
      startDate: '',
      endDate: '',
      startTime: '00:00',
      endTime: '23:59'
    }
  })

  const handleTogglePopupStatus = (bannerId: number) => {
    console.log('팝업 상태 변경:', bannerId)
  }

  const handleDeletePopup = (bannerId: number) => {
    console.log('팝업 삭제:', bannerId)
  }

  const handleDuplicatePopup = (bannerId: number) => {
    console.log('팝업 복사:', bannerId)
  }

  const handleCreatePopup = () => {
    console.log('새 팝업배너 생성:', newPopup)
    setIsCreatePopupOpen(false)
    // 폼 초기화
    setNewPopup({
      title: '',
      description: '',
      type: 'promotion',
      priority: 'medium',
      imageUrl: '',
      displaySettings: {
        showOnStartup: false,
        showDaily: false,
        showOnce: true,
        delaySeconds: 0
      },
      targetAudience: {
        newUsers: true,
        returningUsers: true,
        regions: []
      },
      schedule: {
        startDate: '',
        endDate: '',
        startTime: '00:00',
        endTime: '23:59'
      }
    })
  }

  const filteredPopups = popupBanners.filter(popup => {
    if (popupFilter === 'all') return true
    return popup.status === popupFilter
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl text-foreground">컨텐츠관리</h1>
          <p className="text-muted-foreground mt-1">앱 내 모든 컨텐츠를 관리하고 운영합니다</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <ImageIcon className="w-4 h-4 mr-2" />
            컨텐츠 통계
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            새 컨텐츠 생성
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="regional">지역추천 관리</TabsTrigger>
          <TabsTrigger value="events">이벤트 관리</TabsTrigger>
          <TabsTrigger value="popup">팝업배너 관리</TabsTrigger>
          <TabsTrigger value="marketer">마케터 컨텐츠</TabsTrigger>
        </TabsList>



        {/* 지역추천 관리 */}
        <TabsContent value="regional" className="space-y-6">
          {/* 새 지역추천 작성 */}
          <Card>
            <CardHeader>
              <CardTitle>새 지역추천 작성</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="region-title">제목</Label>
                  <Input 
                    id="region-title"
                    placeholder="지역추천 제목을 입력하세요"
                    value={newRegionTitle}
                    onChange={(e) => setNewRegionTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="region-select">지역 선택</Label>
                  <Input id="region-select" placeholder="지역을 선택하세요" />
                </div>
              </div>
              <div>
                <Label htmlFor="region-content">내용</Label>
                <Textarea 
                  id="region-content"
                  placeholder="지역추천 내용을 입력하세요"
                  value={newRegionContent}
                  onChange={(e) => setNewRegionContent(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button>
                  <Save className="w-4 h-4 mr-2" />
                  저장
                </Button>
                <Button variant="outline">미리보기</Button>
              </div>
            </CardContent>
          </Card>

          {/* 기존 지역추천 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>기존 지역추천</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {regionRecommendations.map((recommendation) => (
                  <div key={recommendation.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{recommendation.region}</span>
                          <Badge variant={recommendation.status === 'active' ? 'default' : 'secondary'}>
                            {recommendation.status === 'active' ? '활성' : '임시저장'}
                          </Badge>
                        </div>
                        <h4 className="text-lg mb-1">{recommendation.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{recommendation.content}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>조회수: {recommendation.views.toLocaleString()}</span>
                          <span>마지막 수정: {recommendation.lastUpdate}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 이벤트 관리 */}
        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>진행 중인 이벤트</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {event.startDate} ~ {event.endDate}
                          </span>
                          <Badge variant={
                            event.status === 'active' ? 'default' : 
                            event.status === 'scheduled' ? 'secondary' : 'outline'
                          }>
                            {event.status === 'active' ? '진행중' : 
                             event.status === 'scheduled' ? '예정' : '종료'}
                          </Badge>
                        </div>
                        <h4 className="text-lg mb-1">{event.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                        <p className="text-xs text-muted-foreground">
                          참여자: {event.participants.toLocaleString()}명
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 팝업배너 관리 */}
        <TabsContent value="popup" className="space-y-6">
          {/* 팝업배너 현황 요약 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">총 팝업배너</CardTitle>
                <MonitorSpeaker className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl">{popupBanners.length}</div>
                <p className="text-xs text-muted-foreground">전체 등록된 배너</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">활성 배너</CardTitle>
                <Target className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl text-green-600">
                  {popupBanners.filter(p => p.status === 'active').length}
                </div>
                <p className="text-xs text-muted-foreground">현재 노출 중</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">평균 CTR</CardTitle>
                <MousePointer className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl text-blue-600">
                  {(popupBanners.reduce((sum, p) => sum + p.performance.ctr, 0) / popupBanners.length).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">전체 평균</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">총 노출수</CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl text-orange-600">
                  {Math.round(popupBanners.reduce((sum, p) => sum + p.performance.impressions, 0) / 1000)}K
                </div>
                <p className="text-xs text-muted-foreground">누적 노출</p>
              </CardContent>
            </Card>
          </div>

          {/* 필터 및 액션 */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button 
                variant={popupFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPopupFilter('all')}
              >
                전체
              </Button>
              <Button 
                variant={popupFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPopupFilter('active')}
              >
                활성
              </Button>
              <Button 
                variant={popupFilter === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPopupFilter('inactive')}
              >
                비활성
              </Button>
              <Button 
                variant={popupFilter === 'scheduled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPopupFilter('scheduled')}
              >
                예약
              </Button>
            </div>
            <Dialog open={isCreatePopupOpen} onOpenChange={setIsCreatePopupOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  새 팝업배너
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>새 팝업배너 생성</DialogTitle>
                  <DialogDescription>
                    새로운 팝업배너를 생성하고 노출 조건을 설정합니다.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* 기본 정보 */}
                  <div className="space-y-4">
                    <h4 className="text-sm">기본 정보</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="popup-title">제목</Label>
                        <Input
                          id="popup-title"
                          value={newPopup.title}
                          onChange={(e) => setNewPopup(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="팝업배너 제목을 입력하세요"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="popup-type">유형</Label>
                        <Select
                          value={newPopup.type}
                          onValueChange={(value) => setNewPopup(prev => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="promotion">프로모션</SelectItem>
                            <SelectItem value="event">이벤트</SelectItem>
                            <SelectItem value="notice">공지사항</SelectItem>
                            <SelectItem value="survey">설문조사</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="popup-description">설명</Label>
                      <Textarea
                        id="popup-description"
                        value={newPopup.description}
                        onChange={(e) => setNewPopup(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="팝업배너 내용을 입력하세요"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="popup-priority">우선순위</Label>
                        <Select
                          value={newPopup.priority}
                          onValueChange={(value) => setNewPopup(prev => ({ ...prev, priority: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">높음</SelectItem>
                            <SelectItem value="medium">보통</SelectItem>
                            <SelectItem value="low">낮음</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="popup-image">이미지 URL</Label>
                        <Input
                          id="popup-image"
                          value={newPopup.imageUrl}
                          onChange={(e) => setNewPopup(prev => ({ ...prev, imageUrl: e.target.value }))}
                          placeholder="이미지 URL을 입력하세요"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 노출 설정 */}
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="text-sm">노출 설정</h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="show-startup"
                            checked={newPopup.displaySettings.showOnStartup}
                            onCheckedChange={(checked) => setNewPopup(prev => ({
                              ...prev,
                              displaySettings: { ...prev.displaySettings, showOnStartup: checked }
                            }))}
                          />
                          <Label htmlFor="show-startup">앱 시작 시 표시</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="show-daily"
                            checked={newPopup.displaySettings.showDaily}
                            onCheckedChange={(checked) => setNewPopup(prev => ({
                              ...prev,
                              displaySettings: { ...prev.displaySettings, showDaily: checked }
                            }))}
                          />
                          <Label htmlFor="show-daily">매일 표시</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="show-once"
                            checked={newPopup.displaySettings.showOnce}
                            onCheckedChange={(checked) => setNewPopup(prev => ({
                              ...prev,
                              displaySettings: { ...prev.displaySettings, showOnce: checked }
                            }))}
                          />
                          <Label htmlFor="show-once">한 번만 표시</Label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="delay-seconds">지연 시간 (초)</Label>
                        <Input
                          id="delay-seconds"
                          type="number"
                          value={newPopup.displaySettings.delaySeconds}
                          onChange={(e) => setNewPopup(prev => ({
                            ...prev,
                            displaySettings: { ...prev.displaySettings, delaySeconds: parseInt(e.target.value) || 0 }
                          }))}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 타겟 설정 */}
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="text-sm">타겟 설정</h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="target-new"
                            checked={newPopup.targetAudience.newUsers}
                            onCheckedChange={(checked) => setNewPopup(prev => ({
                              ...prev,
                              targetAudience: { ...prev.targetAudience, newUsers: checked }
                            }))}
                          />
                          <Label htmlFor="target-new">신규 사용자</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="target-returning"
                            checked={newPopup.targetAudience.returningUsers}
                            onCheckedChange={(checked) => setNewPopup(prev => ({
                              ...prev,
                              targetAudience: { ...prev.targetAudience, returningUsers: checked }
                            }))}
                          />
                          <Label htmlFor="target-returning">기존 사용자</Label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="target-regions">타겟 지역</Label>
                        <Input
                          id="target-regions"
                          placeholder="예: 서울, 부산, 대구 (쉼표로 구분)"
                          onChange={(e) => setNewPopup(prev => ({
                            ...prev,
                            targetAudience: { ...prev.targetAudience, regions: e.target.value.split(',').map(r => r.trim()) }
                          }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 일정 설정 */}
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="text-sm">일정 설정</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start-date">시작일</Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={newPopup.schedule.startDate}
                          onChange={(e) => setNewPopup(prev => ({
                            ...prev,
                            schedule: { ...prev.schedule, startDate: e.target.value }
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end-date">종료일</Label>
                        <Input
                          id="end-date"
                          type="date"
                          value={newPopup.schedule.endDate}
                          onChange={(e) => setNewPopup(prev => ({
                            ...prev,
                            schedule: { ...prev.schedule, endDate: e.target.value }
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="start-time">시작 시간</Label>
                        <Input
                          id="start-time"
                          type="time"
                          value={newPopup.schedule.startTime}
                          onChange={(e) => setNewPopup(prev => ({
                            ...prev,
                            schedule: { ...prev.schedule, startTime: e.target.value }
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end-time">종료 시간</Label>
                        <Input
                          id="end-time"
                          type="time"
                          value={newPopup.schedule.endTime}
                          onChange={(e) => setNewPopup(prev => ({
                            ...prev,
                            schedule: { ...prev.schedule, endTime: e.target.value }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreatePopupOpen(false)}>
                    취소
                  </Button>
                  <Button onClick={handleCreatePopup}>
                    생성
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* 팝업배너 목록 */}
          <div className="grid grid-cols-1 gap-6">
            {filteredPopups.map((popup) => (
              <Card key={popup.id}>
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    {/* 배너 이미지 */}
                    <div className="w-32 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img 
                        src={popup.imageUrl} 
                        alt={popup.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* 배너 정보 */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3>{popup.title}</h3>
                            <Badge variant={
                              popup.type === 'promotion' ? 'default' :
                              popup.type === 'event' ? 'secondary' :
                              popup.type === 'notice' ? 'outline' :
                              'destructive'
                            }>
                              {popup.type === 'promotion' ? '프로모션' :
                               popup.type === 'event' ? '이벤트' :
                               popup.type === 'notice' ? '공지' :
                               '설문'}
                            </Badge>
                            <Badge variant={
                              popup.priority === 'high' ? 'destructive' :
                              popup.priority === 'medium' ? 'secondary' :
                              'outline'
                            }>
                              {popup.priority === 'high' ? '높음' :
                               popup.priority === 'medium' ? '보통' :
                               '낮음'}
                            </Badge>
                            <Badge variant={
                              popup.status === 'active' ? 'default' :
                              popup.status === 'scheduled' ? 'secondary' :
                              'outline'
                            }>
                              {popup.status === 'active' ? '활성' :
                               popup.status === 'scheduled' ? '예약' :
                               popup.status === 'inactive' ? '비활성' :
                               '만료'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{popup.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>기간: {popup.schedule.startDate} ~ {popup.schedule.endDate}</span>
                            <span>작성자: {popup.createdBy}</span>
                            <span>수정일: {popup.updatedAt}</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" title="미리보기">
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" title="수정">
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" title="복사" onClick={() => handleDuplicatePopup(popup.id)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" title="설정">
                            <Settings className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            title={popup.status === 'active' ? '비활성화' : '활성화'}
                            onClick={() => handleTogglePopupStatus(popup.id)}
                          >
                            {popup.status === 'active' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          </Button>
                          <Button size="sm" variant="outline" title="삭제" onClick={() => handleDeletePopup(popup.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* 노출 설정 정보 */}
                      <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">노출 설정</p>
                          <div className="text-xs space-y-1">
                            {popup.displaySettings.showOnStartup && <span className="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded mr-1">앱시작시</span>}
                            {popup.displaySettings.showDaily && <span className="inline-block bg-green-100 text-green-800 px-2 py-0.5 rounded mr-1">매일</span>}
                            {popup.displaySettings.showOnce && <span className="inline-block bg-orange-100 text-orange-800 px-2 py-0.5 rounded mr-1">한번만</span>}
                            {popup.displaySettings.delaySeconds > 0 && <span className="inline-block bg-gray-100 text-gray-800 px-2 py-0.5 rounded">{popup.displaySettings.delaySeconds}초 후</span>}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">타겟 대상</p>
                          <div className="text-xs space-y-1">
                            {popup.targetAudience.newUsers && <span className="inline-block bg-purple-100 text-purple-800 px-2 py-0.5 rounded mr-1">신규</span>}
                            {popup.targetAudience.returningUsers && <span className="inline-block bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded mr-1">기존</span>}
                            <div className="text-xs text-muted-foreground">지역: {popup.targetAudience.regions.join(', ')}</div>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">성과</p>
                          <div className="text-xs space-y-1">
                            <div>노출: {popup.performance.impressions.toLocaleString()}</div>
                            <div>클릭: {popup.performance.clicks.toLocaleString()} (CTR: {popup.performance.ctr}%)</div>
                            <div>전환: {popup.performance.conversions.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 마케터 컨텐츠 */}
        <TabsContent value="marketer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5" />
                마케터 컨텐츠
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {marketerContents.map((content) => (
                  <div key={content.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-muted-foreground">{content.author}</span>
                          <Badge variant={content.status === 'published' ? 'default' : 'secondary'}>
                            {content.status === 'published' ? '발행됨' : '임시저장'}
                          </Badge>
                        </div>
                        <h4 className="text-lg mb-1">{content.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{content.content}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>발행일: {content.publishDate}</span>
                          <span>조회수: {content.views.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}