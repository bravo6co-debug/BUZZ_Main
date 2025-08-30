import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { 
  FileDown, 
  Filter, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Clock,
  User,
  Activity
} from 'lucide-react'
import { auditLogService, AuditLog } from '../services/auditLog.service'

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    dateRange: 'today'
  })
  const [statistics, setStatistics] = useState<any>(null)

  useEffect(() => {
    loadLogs()
    loadStatistics()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [logs, filters])

  const loadLogs = () => {
    setLoading(true)
    try {
      const allLogs = auditLogService.getLogs({ limit: 500 })
      setLogs(allLogs)
    } finally {
      setLoading(false)
    }
  }

  const loadStatistics = () => {
    const stats = auditLogService.getStatistics(7)
    setStatistics(stats)
  }

  const applyFilters = () => {
    let filtered = [...logs]

    // 카테고리 필터
    if (filters.category !== 'all') {
      filtered = filtered.filter(log => log.category === filters.category)
    }

    // 상태 필터
    if (filters.status !== 'all') {
      filtered = filtered.filter(log => log.status === filters.status)
    }

    // 날짜 필터
    const now = new Date()
    if (filters.dateRange === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      filtered = filtered.filter(log => new Date(log.timestamp) >= today)
    } else if (filters.dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(log => new Date(log.timestamp) >= weekAgo)
    } else if (filters.dateRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(log => new Date(log.timestamp) >= monthAgo)
    }

    setFilteredLogs(filtered)
  }

  const exportLogs = (format: 'json' | 'csv') => {
    const data = auditLogService.exportLogs(format)
    const blob = new Blob([data], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearOldLogs = () => {
    if (confirm('30일 이전 로그를 모두 삭제하시겠습니까?')) {
      const deleted = auditLogService.clearOldLogs(30)
      alert(`${deleted}개의 로그가 삭제되었습니다`)
      loadLogs()
      loadStatistics()
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      default:
        return null
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'auth': return 'bg-blue-100 text-blue-700'
      case 'budget': return 'bg-green-100 text-green-700'
      case 'user': return 'bg-purple-100 text-purple-700'
      case 'store': return 'bg-yellow-100 text-yellow-700'
      case 'content': return 'bg-pink-100 text-pink-700'
      case 'system': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl text-foreground">감사 로그</h1>
          <p className="text-muted-foreground mt-1">시스템 활동 기록 및 감사 추적</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportLogs('csv')}>
            <FileDown className="w-4 h-4 mr-2" />
            CSV 내보내기
          </Button>
          <Button variant="outline" onClick={() => exportLogs('json')}>
            <FileDown className="w-4 h-4 mr-2" />
            JSON 내보내기
          </Button>
          <Button variant="outline" onClick={clearOldLogs}>
            오래된 로그 삭제
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">전체 로그</p>
                  <p className="text-2xl font-bold">{statistics.totalLogs}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">성공</p>
                  <p className="text-2xl font-bold text-green-600">
                    {statistics.byStatus.success || 0}
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
                  <p className="text-sm text-muted-foreground">실패</p>
                  <p className="text-2xl font-bold text-red-600">
                    {statistics.byStatus.failed || 0}
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">경고</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {statistics.byStatus.warning || 0}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            필터
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select 
              value={filters.category} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="auth">인증</SelectItem>
                <SelectItem value="budget">예산</SelectItem>
                <SelectItem value="user">사용자</SelectItem>
                <SelectItem value="store">매장</SelectItem>
                <SelectItem value="content">컨텐츠</SelectItem>
                <SelectItem value="system">시스템</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.status} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="success">성공</SelectItem>
                <SelectItem value="failed">실패</SelectItem>
                <SelectItem value="warning">경고</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.dateRange} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="기간" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">오늘</SelectItem>
                <SelectItem value="week">최근 7일</SelectItem>
                <SelectItem value="month">최근 30일</SelectItem>
                <SelectItem value="all">전체</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={loadLogs} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>로그 목록 ({filteredLogs.length}개)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">시간</TableHead>
                  <TableHead className="w-20">상태</TableHead>
                  <TableHead className="w-24">카테고리</TableHead>
                  <TableHead className="w-32">사용자</TableHead>
                  <TableHead className="w-40">액션</TableHead>
                  <TableHead>상세</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      로그가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.slice(0, 100).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(log.timestamp).toLocaleString('ko-KR')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(log.status)}
                          <span className="text-xs">{log.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryColor(log.category)}>
                          {log.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.userName}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {log.action}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {typeof log.details === 'object' 
                          ? JSON.stringify(log.details).substring(0, 100) + '...'
                          : log.details}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Failures */}
      {statistics?.recentFailures?.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              최근 실패 기록
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {statistics.recentFailures.slice(0, 5).map((log: AuditLog) => (
                <div key={log.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm">{log.action}</span>
                    <span className="text-xs text-muted-foreground">by {log.userName}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString('ko-KR')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}