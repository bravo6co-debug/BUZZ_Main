import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff, 
  BarChart, 
  Calendar,
  AlertCircle,
  Target,
  Clock,
  MousePointer
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { popupBannerService, PopupBanner } from '../services/popupBanner.service';

export default function PopupBannerManager() {
  const [banners, setBanners] = useState<PopupBanner[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<PopupBanner | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    imageUrl: '',
    type: 'center' as PopupBanner['type'],
    priority: 5,
    displayFrequency: 'once_per_day' as PopupBanner['displayFrequency'],
    ctaText: '',
    ctaLink: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true,
    // Target conditions
    minVisits: 0,
    university: '',
    joinedWithin: 0
  });

  useEffect(() => {
    loadBanners();
    loadAnalytics();
  }, []);

  const loadBanners = async () => {
    try {
      setLoading(true);
      const data = await popupBannerService.getAllBanners();
      setBanners(data);
    } catch (error) {
      toast.error('배너 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const data = await popupBannerService.getBannerAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const handleCreate = async () => {
    try {
      const bannerData: any = {
        title: formData.title,
        content: formData.content,
        type: formData.type,
        priority: formData.priority,
        displayFrequency: formData.displayFrequency,
        startDate: formData.startDate,
        endDate: formData.endDate,
        isActive: formData.isActive,
        createdBy: 'admin'
      };

      if (formData.imageUrl) {
        bannerData.imageUrl = formData.imageUrl;
      }

      if (formData.ctaText && formData.ctaLink) {
        bannerData.ctaButton = {
          text: formData.ctaText,
          link: formData.ctaLink
        };
      }

      // Add target conditions if specified
      const targetConditions: any = {};
      if (formData.minVisits > 0) targetConditions.minVisits = formData.minVisits;
      if (formData.university) targetConditions.university = formData.university;
      if (formData.joinedWithin > 0) targetConditions.joinedWithin = formData.joinedWithin;
      
      if (Object.keys(targetConditions).length > 0) {
        bannerData.targetConditions = targetConditions;
      }

      await popupBannerService.createBanner(bannerData);
      toast.success('팝업 배너가 생성되었습니다');
      setShowCreateDialog(false);
      resetForm();
      loadBanners();
      loadAnalytics();
    } catch (error) {
      toast.error('팝업 배너 생성에 실패했습니다');
    }
  };

  const handleUpdate = async () => {
    if (!selectedBanner) return;

    try {
      const updates: any = {
        title: formData.title,
        content: formData.content,
        type: formData.type,
        priority: formData.priority,
        displayFrequency: formData.displayFrequency,
        startDate: formData.startDate,
        endDate: formData.endDate,
        isActive: formData.isActive,
        updatedBy: 'admin'
      };

      if (formData.imageUrl) {
        updates.imageUrl = formData.imageUrl;
      }

      if (formData.ctaText && formData.ctaLink) {
        updates.ctaButton = {
          text: formData.ctaText,
          link: formData.ctaLink
        };
      }

      await popupBannerService.updateBanner(selectedBanner.id, updates);
      toast.success('팝업 배너가 수정되었습니다');
      setShowEditDialog(false);
      resetForm();
      loadBanners();
    } catch (error) {
      toast.error('팝업 배너 수정에 실패했습니다');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 배너를 삭제하시겠습니까?')) return;

    try {
      await popupBannerService.deleteBanner(id, 'admin');
      toast.success('팝업 배너가 삭제되었습니다');
      loadBanners();
      loadAnalytics();
    } catch (error) {
      toast.error('팝업 배너 삭제에 실패했습니다');
    }
  };

  const handleToggleActive = async (banner: PopupBanner) => {
    try {
      await popupBannerService.updateBanner(banner.id, {
        isActive: !banner.isActive,
        updatedBy: 'admin'
      });
      toast.success(`배너가 ${!banner.isActive ? '활성화' : '비활성화'}되었습니다`);
      loadBanners();
    } catch (error) {
      toast.error('상태 변경에 실패했습니다');
    }
  };

  const handleEmergencyBanner = async () => {
    const message = prompt('긴급 공지 내용을 입력하세요:');
    if (!message) return;

    const duration = prompt('표시 시간을 입력하세요 (분):', '30');
    if (!duration) return;

    try {
      await popupBannerService.publishEmergencyBanner(message, parseInt(duration), 'admin');
      toast.success('긴급 팝업이 발행되었습니다');
      loadBanners();
    } catch (error) {
      toast.error('긴급 팝업 발행에 실패했습니다');
    }
  };

  const openEditDialog = (banner: PopupBanner) => {
    setSelectedBanner(banner);
    setFormData({
      title: banner.title,
      content: banner.content,
      imageUrl: banner.imageUrl || '',
      type: banner.type,
      priority: banner.priority,
      displayFrequency: banner.displayFrequency,
      ctaText: banner.ctaButton?.text || '',
      ctaLink: banner.ctaButton?.link || '',
      startDate: banner.startDate.split('T')[0],
      endDate: banner.endDate.split('T')[0],
      isActive: banner.isActive,
      minVisits: banner.targetConditions?.minVisits || 0,
      university: banner.targetConditions?.university || '',
      joinedWithin: banner.targetConditions?.joinedWithin || 0
    });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      imageUrl: '',
      type: 'center',
      priority: 5,
      displayFrequency: 'once_per_day',
      ctaText: '',
      ctaLink: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true,
      minVisits: 0,
      university: '',
      joinedWithin: 0
    });
    setSelectedBanner(null);
  };

  const getTypeColor = (type: PopupBanner['type']) => {
    const colors = {
      center: 'bg-blue-100 text-blue-800',
      bottom: 'bg-green-100 text-green-800',
      top: 'bg-yellow-100 text-yellow-800',
      fullscreen: 'bg-purple-100 text-purple-800'
    };
    return colors[type];
  };

  const getFrequencyLabel = (freq: PopupBanner['displayFrequency']) => {
    const labels = {
      once_ever: '1회만',
      once_per_day: '하루 1회',
      once_per_week: '주 1회',
      always: '항상'
    };
    return labels[freq];
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">팝업 배너 관리</h1>
        <div className="flex gap-2">
          <Button 
            variant="destructive"
            onClick={handleEmergencyBanner}
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            긴급 공지
          </Button>
          <Button onClick={() => setShowAnalyticsDialog(true)}>
            <BarChart className="mr-2 h-4 w-4" />
            통계
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            새 배너
          </Button>
        </div>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">전체 배너</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalBanners}</div>
              <p className="text-xs text-gray-500">활성: {analytics.activeBanners}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">총 노출</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalViews.toLocaleString()}</div>
              <p className="text-xs text-gray-500">
                <Eye className="inline h-3 w-3" /> 조회수
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">총 클릭</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalClicks.toLocaleString()}</div>
              <p className="text-xs text-gray-500">
                <MousePointer className="inline h-3 w-3" /> 클릭수
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">전환율</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.overallConversionRate.toFixed(1)}%</div>
              <p className="text-xs text-gray-500">평균 CTR</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Banner List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">제목</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">타입</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">빈도</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">기간</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">성과</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {banners.map((banner) => (
                  <tr key={banner.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Switch
                        checked={banner.isActive}
                        onCheckedChange={() => handleToggleActive(banner)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{banner.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {banner.content}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getTypeColor(banner.type)}>
                        {banner.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getFrequencyLabel(banner.displayFrequency)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(banner.startDate).toLocaleDateString('ko-KR')}
                        <span>~</span>
                        {new Date(banner.endDate).toLocaleDateString('ko-KR')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div>노출: {banner.viewCount}</div>
                        <div>클릭: {banner.clickCount}</div>
                        {banner.conversionRate && (
                          <div className="font-medium text-blue-600">
                            CTR: {banner.conversionRate.toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(banner)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(banner.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {banners.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                등록된 팝업 배너가 없습니다
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setShowEditDialog(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showEditDialog ? '팝업 배너 수정' : '새 팝업 배너'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="space-y-2">
              <Label htmlFor="title">제목</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="팝업 제목을 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">내용</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="팝업 내용을 입력하세요"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">이미지 URL (선택)</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            {/* Display Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>표시 타입</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="center">중앙</SelectItem>
                    <SelectItem value="bottom">하단</SelectItem>
                    <SelectItem value="top">상단</SelectItem>
                    <SelectItem value="fullscreen">전체화면</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>표시 빈도</Label>
                <Select
                  value={formData.displayFrequency}
                  onValueChange={(value: any) => setFormData({ ...formData, displayFrequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once_ever">1회만</SelectItem>
                    <SelectItem value="once_per_day">하루 1회</SelectItem>
                    <SelectItem value="once_per_week">주 1회</SelectItem>
                    <SelectItem value="always">항상</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">우선순위 (1-10)</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                max="10"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
              />
            </div>

            {/* CTA Button */}
            <div className="space-y-2">
              <Label>CTA 버튼 (선택)</Label>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="버튼 텍스트"
                  value={formData.ctaText}
                  onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                />
                <Input
                  placeholder="링크 URL"
                  value={formData.ctaLink}
                  onChange={(e) => setFormData({ ...formData, ctaLink: e.target.value })}
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">시작일</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">종료일</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            {/* Target Conditions */}
            <div className="space-y-2">
              <Label>타겟팅 조건 (선택)</Label>
              <div className="space-y-3 p-3 border rounded-lg">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">최소 방문 횟수</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.minVisits}
                      onChange={(e) => setFormData({ ...formData, minVisits: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">대학교</Label>
                    <Input
                      placeholder="부산대학교"
                      value={formData.university}
                      onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">가입 후 일수</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.joinedWithin}
                      onChange={(e) => setFormData({ ...formData, joinedWithin: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">즉시 활성화</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              setShowEditDialog(false);
              resetForm();
            }}>
              취소
            </Button>
            <Button onClick={showEditDialog ? handleUpdate : handleCreate}>
              {showEditDialog ? '수정' : '생성'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={showAnalyticsDialog} onOpenChange={setShowAnalyticsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>팝업 배너 통계</DialogTitle>
          </DialogHeader>
          
          {analytics && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">전체 성과</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">총 노출:</span>
                        <span className="font-medium">{analytics.totalViews.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">총 클릭:</span>
                        <span className="font-medium">{analytics.totalClicks.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">총 닫기:</span>
                        <span className="font-medium">{analytics.totalDismissals.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">평균 CTR:</span>
                        <span className="font-medium text-blue-600">
                          {analytics.overallConversionRate.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">상위 성과 배너</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analytics.topPerformers.map((banner: any, index: number) => (
                        <div key={banner.id} className="flex justify-between items-center">
                          <span className="text-sm truncate flex-1">
                            {index + 1}. {banner.title}
                          </span>
                          <Badge variant="secondary">
                            {banner.conversionRate.toFixed(1)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}