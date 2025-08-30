import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Avatar, AvatarFallback } from './ui/avatar'
import { 
  Calculator, 
  Clock, 
  Check, 
  X, 
  Eye, 
  FileText,
  DollarSign,
  AlertCircle,
  Download,
  Loader2
} from 'lucide-react'
import { settlementApi } from '../services/api.service'

const settlementRequests = [
  { id: 1, storeName: '강남 맛집', owner: '김영희', amount: 2340000, period: '2025-01', requestDate: '2025-01-25', status: 'pending', documents: 3 },
  { id: 2, storeName: '홍대 카페', owner: '이철수', amount: 1890000, period: '2025-01', requestDate: '2025-01-24', status: 'reviewing', documents: 2 },
  { id: 3, storeName: '부산 해물집', owner: '박민수', amount: 3120000, period: '2025-01', requestDate: '2025-01-23', status: 'pending', documents: 4 },
]

const settlementHistory = [
  { id: 1, storeName: '서울 닭갈비', owner: '정수연', amount: 2180000, period: '2024-12', processDate: '2025-01-05', status: 'approved', approver: '관리자1' },
  { id: 2, storeName: '명동 떡볶이', owner: '최민지', amount: 1650000, period: '2024-12', processDate: '2025-01-04', status: 'approved', approver: '관리자2' },
  { id: 3, storeName: '청담 스시', owner: '윤서아', amount: 4200000, period: '2024-12', processDate: '2025-01-03', status: 'rejected', approver: '관리자1' },
]

const monthlyStats = [
  { month: '2024-09', totalRequests: 245, approved: 234, rejected: 11, totalAmount: 890000000 },
  { month: '2024-10', totalRequests: 267, approved: 251, rejected: 16, totalAmount: 920000000 },
  { month: '2024-11', totalRequests: 289, approved: 276, rejected: 13, totalAmount: 1020000000 },
  { month: '2024-12', totalRequests: 312, approved: 298, rejected: 14, totalAmount: 1150000000 },
  { month: '2025-01', totalRequests: 156, approved: 89, rejected: 5, totalAmount: 580000000 },
]

export function SettlementManagement() {
  const [activeTab, setActiveTab] = useState('requests')
  const [loading, setLoading] = useState(false)
  const [pendingRequests, setPendingRequests] = useState(settlementRequests)
  const [historyData, setHistoryData] = useState(settlementHistory)

  useEffect(() => {
    loadSettlementData()
  }, [])

  const loadSettlementData = async () => {
    try {
      setLoading(true)
      const [pendingResponse, historyResponse] = await Promise.all([
        settlementApi.getPending(),
        settlementApi.getHistory()
      ])

      if (pendingResponse.success && pendingResponse.data) {
        setPendingRequests(pendingResponse.data)
      }

      if (historyResponse.success && historyResponse.data) {
        setHistoryData(historyResponse.data)
      }
    } catch (error) {
      console.error('Failed to load settlement data:', error)
      // Use mock data as fallback
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId: number) => {
    try {
      setLoading(true)
      const response = await settlementApi.approve(requestId.toString())
      
      if (response.success) {
        alert('정산이 승인되었습니다')
        await loadSettlementData() // Reload data
      }
    } catch (error) {
      console.error('Failed to approve settlement:', error)
      alert('정산 승인에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (requestId: number) => {
    const reason = prompt('거부 사유를 입력하세요:')
    if (!reason) return

    try {
      setLoading(true)
      const response = await settlementApi.reject(requestId.toString(), reason)
      
      if (response.success) {
        alert('정산이 거부되었습니다')
        await loadSettlementData() // Reload data
      }
    } catch (error) {
      console.error('Failed to reject settlement:', error)
      alert('정산 거부에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl text-foreground">정산관리</h1>
          <p className="text-muted-foreground mt-1">매장별 정산 요청을 처리하고 내역을 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            엑셀 다운로드
          </Button>
          <Button size="sm">
            <FileText className="w-4 h-4 mr-2" />
            정산 리포트
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests">정산 요청 처리</TabsTrigger>
          <TabsTrigger value="history">정산 내역 검토</TabsTrigger>
          <TabsTrigger value="stats">정산 통계</TabsTrigger>
        </TabsList>

        {/* 정산 요청 처리 */}
        <TabsContent value="requests" className="space-y-6">
          {/* 요청 현황 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">대기 중인 요청</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl text-orange-600">89</div>
                <p className="text-xs text-muted-foreground">평균 처리 시간 2.3일</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">총 정산 금액</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl">₩2.3B</div>
                <p className="text-xs text-muted-foreground">이번 달 요청 금액</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">승인율</CardTitle>
                <Check className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl text-green-600">94.2%</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+1.2%</span> 전월 대비
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">문제 요청</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl text-red-600">7</div>
                <p className="text-xs text-muted-foreground">서류 미비/검토 필요</p>
              </CardContent>
            </Card>
          </div>

          {/* 정산 요청 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>대기 중인 정산 요청</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>매장명</TableHead>
                    <TableHead>사장님</TableHead>
                    <TableHead>정산 금액</TableHead>
                    <TableHead>정산 기간</TableHead>
                    <TableHead>요청일</TableHead>
                    <TableHead>서류</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : pendingRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>{request.storeName[0]}</AvatarFallback>
                          </Avatar>
                          <span>{request.storeName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{request.owner}</TableCell>
                      <TableCell className="text-right">
                        ₩{request.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>{request.period}</TableCell>
                      <TableCell>{request.requestDate}</TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {request.documents}개
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={request.status === 'pending' ? 'secondary' : 'default'}>
                          {request.status === 'pending' ? '대기중' : '검토중'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleApprove(request.id)}>
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleReject(request.id)}>
                            <X className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="w-3 h-3" />
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

        {/* 정산 내역 검토 */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>최근 정산 처리 내역</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>매장명</TableHead>
                    <TableHead>사장님</TableHead>
                    <TableHead>정산 금액</TableHead>
                    <TableHead>정산 기간</TableHead>
                    <TableHead>처리일</TableHead>
                    <TableHead>승인자</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData.map((history) => (
                    <TableRow key={history.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>{history.storeName[0]}</AvatarFallback>
                          </Avatar>
                          <span>{history.storeName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{history.owner}</TableCell>
                      <TableCell className="text-right">
                        ₩{history.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>{history.period}</TableCell>
                      <TableCell>{history.processDate}</TableCell>
                      <TableCell>{history.approver}</TableCell>
                      <TableCell>
                        <Badge variant={history.status === 'approved' ? 'default' : 'destructive'}>
                          {history.status === 'approved' ? '승인' : '거부'}
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

        {/* 정산 통계 */}
        <TabsContent value="stats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>월별 정산 통계</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>월</TableHead>
                    <TableHead>총 요청</TableHead>
                    <TableHead>승인</TableHead>
                    <TableHead>거부</TableHead>
                    <TableHead>승인율</TableHead>
                    <TableHead>총 금액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyStats.map((stat) => (
                    <TableRow key={stat.month}>
                      <TableCell>{stat.month}</TableCell>
                      <TableCell>{stat.totalRequests}</TableCell>
                      <TableCell className="text-green-600">{stat.approved}</TableCell>
                      <TableCell className="text-red-600">{stat.rejected}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{((stat.approved / stat.totalRequests) * 100).toFixed(1)}%</span>
                          <div className="w-16 bg-muted rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${(stat.approved / stat.totalRequests) * 100}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        ₩{(stat.totalAmount / 1000000).toFixed(0)}M
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