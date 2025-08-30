import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Progress } from './ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { 
  Upload, 
  Play, 
  Pause, 
  X, 
  CheckCircle, 
  AlertCircle,
  Clock,
  FileSpreadsheet,
  Users,
  Gift,
  Bell,
  Database,
  UserX,
  Download
} from 'lucide-react'
import { batchProcessService, BatchJob, BatchTemplate } from '../services/batchProcess.service'

export function BatchProcessor() {
  const [activeTab, setActiveTab] = useState('create')
  const [templates, setTemplates] = useState<BatchTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<BatchTemplate | null>(null)
  const [jobs, setJobs] = useState<BatchJob[]>([])
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [adminUser, setAdminUser] = useState<any>(null)

  useEffect(() => {
    loadTemplates()
    loadJobs()
    
    // 로그인한 관리자 정보
    const admin = JSON.parse(localStorage.getItem('admin_user') || '{}')
    setAdminUser(admin)
    
    // 1초마다 진행중인 작업 업데이트
    const interval = setInterval(() => {
      loadJobs()
    }, 1000)
    
    return () => clearInterval(interval)
  }, [])

  const loadTemplates = () => {
    const temps = batchProcessService.getTemplates()
    setTemplates(temps)
  }

  const loadJobs = () => {
    const jobList = batchProcessService.getJobs({ limit: 20 })
    setJobs(jobList)
  }

  const handleTemplateSelect = (templateType: string) => {
    const template = templates.find(t => t.type === templateType)
    setSelectedTemplate(template || null)
    setFormData({})
  }

  const handleCreateJob = () => {
    if (!selectedTemplate) return
    
    const job = batchProcessService.createJob(
      selectedTemplate.type,
      formData,
      adminUser?.id || 'unknown',
      adminUser?.name || 'Unknown Admin'
    )
    
    // 작업 실행
    batchProcessService.executeJob(
      job.id,
      adminUser?.id || 'unknown',
      adminUser?.name || 'Unknown Admin'
    )
    
    loadJobs()
    setActiveTab('monitor')
    setSelectedTemplate(null)
    setFormData({})
  }

  const handleCancelJob = (jobId: string) => {
    if (confirm('작업을 취소하시겠습니까?')) {
      batchProcessService.cancelJob(
        jobId,
        adminUser?.id || 'unknown',
        adminUser?.name || 'Unknown Admin'
      )
      loadJobs()
    }
  }

  const handleDownloadResult = (jobId: string) => {
    try {
      batchProcessService.downloadResult(jobId)
    } catch (error) {
      alert('결과 다운로드에 실패했습니다')
    }
  }

  const getJobIcon = (type: string) => {
    switch (type) {
      case 'user_import': return <Users className="w-4 h-4" />
      case 'coupon_issue': return <Gift className="w-4 h-4" />
      case 'point_grant': return <Gift className="w-4 h-4" />
      case 'notification_send': return <Bell className="w-4 h-4" />
      case 'data_export': return <Database className="w-4 h-4" />
      case 'user_deactivate': return <UserX className="w-4 h-4" />
      default: return <FileSpreadsheet className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700'
      case 'processing': return 'bg-blue-100 text-blue-700'
      case 'failed': return 'bg-red-100 text-red-700'
      case 'cancelled': return 'bg-gray-100 text-gray-700'
      default: return 'bg-yellow-100 text-yellow-700'
    }
  }

  const statistics = batchProcessService.getStatistics()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl text-foreground">일괄 처리</h1>
          <p className="text-muted-foreground mt-1">대량 작업을 자동으로 처리합니다</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">전체 작업</p>
                <p className="text-2xl font-bold">{statistics.total}</p>
              </div>
              <FileSpreadsheet className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">완료</p>
                <p className="text-2xl font-bold text-green-600">
                  {statistics.byStatus.completed || 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">진행중</p>
                <p className="text-2xl font-bold text-blue-600">
                  {statistics.byStatus.processing || 0}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">실패</p>
                <p className="text-2xl font-bold text-red-600">
                  {statistics.byStatus.failed || 0}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="create">새 작업 생성</TabsTrigger>
          <TabsTrigger value="monitor">작업 모니터링</TabsTrigger>
        </TabsList>

        {/* Create Job Tab */}
        <TabsContent value="create">
          <div className="grid grid-cols-2 gap-6">
            {/* Template Selection */}
            <Card>
              <CardHeader>
                <CardTitle>작업 템플릿 선택</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {templates.map(template => (
                    <button
                      key={template.type}
                      onClick={() => handleTemplateSelect(template.type)}
                      className={`w-full p-3 rounded-lg border text-left transition-colors ${
                        selectedTemplate?.type === template.type
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {getJobIcon(template.type)}
                        <div className="flex-1">
                          <p className="font-medium">{template.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Job Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>작업 설정</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedTemplate ? (
                  <div className="space-y-4">
                    {selectedTemplate.fields.map(field => (
                      <div key={field.name}>
                        <Label htmlFor={field.name}>
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        
                        {field.type === 'select' ? (
                          <Select
                            value={formData[field.name] || ''}
                            onValueChange={(value) => 
                              setFormData(prev => ({ ...prev, [field.name]: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={`${field.label} 선택`} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map(option => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field.type === 'file' ? (
                          <div className="border-2 border-dashed rounded-lg p-4 text-center">
                            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              {field.placeholder}
                            </p>
                            <Input
                              type="file"
                              className="mt-2"
                              onChange={(e) => 
                                setFormData(prev => ({ 
                                  ...prev, 
                                  [field.name]: e.target.files?.[0] 
                                }))
                              }
                            />
                          </div>
                        ) : (
                          <Input
                            id={field.name}
                            type={field.type}
                            placeholder={field.placeholder}
                            value={formData[field.name] || ''}
                            onChange={(e) => 
                              setFormData(prev => ({ ...prev, [field.name]: e.target.value }))
                            }
                          />
                        )}
                      </div>
                    ))}
                    
                    <Button 
                      className="w-full" 
                      onClick={handleCreateJob}
                      disabled={!selectedTemplate.fields.every(f => 
                        !f.required || formData[f.name]
                      )}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      작업 시작
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    왼쪽에서 작업 템플릿을 선택하세요
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Monitor Jobs Tab */}
        <TabsContent value="monitor">
          <Card>
            <CardHeader>
              <CardTitle>작업 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    실행된 작업이 없습니다
                  </div>
                ) : (
                  jobs.map(job => (
                    <div 
                      key={job.id} 
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getJobIcon(job.type)}
                          <div>
                            <p className="font-medium">{job.name}</p>
                            <p className="text-sm text-muted-foreground">
                              ID: {job.id}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                          {job.status === 'processing' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelJob(job.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                          {job.status === 'completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadResult(job.id)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {job.status === 'processing' && (
                        <div className="space-y-2">
                          <Progress 
                            value={(job.processedItems / job.totalItems) * 100} 
                          />
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>진행률: {job.processedItems} / {job.totalItems}</span>
                            <span>성공: {job.successCount} / 실패: {job.failedCount}</span>
                          </div>
                        </div>
                      )}

                      {job.status === 'completed' && (
                        <div className="flex gap-4 text-sm">
                          <span>총 {job.totalItems}개 처리</span>
                          <span className="text-green-600">성공: {job.successCount}</span>
                          {job.failedCount > 0 && (
                            <span className="text-red-600">실패: {job.failedCount}</span>
                          )}
                        </div>
                      )}

                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>생성자: {job.createdBy}</span>
                        {job.startedAt && (
                          <span>시작: {new Date(job.startedAt).toLocaleString('ko-KR')}</span>
                        )}
                        {job.completedAt && (
                          <span>완료: {new Date(job.completedAt).toLocaleString('ko-KR')}</span>
                        )}
                      </div>

                      {job.errors && job.errors.length > 0 && (
                        <div className="bg-red-50 rounded p-2">
                          <p className="text-sm font-medium text-red-700 mb-1">오류 목록</p>
                          <ul className="text-xs text-red-600 space-y-1">
                            {job.errors.slice(0, 3).map((error, i) => (
                              <li key={i}>• {error}</li>
                            ))}
                            {job.errors.length > 3 && (
                              <li>... 외 {job.errors.length - 3}개</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}