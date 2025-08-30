import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Avatar, AvatarFallback } from './ui/avatar'
import { 
  Star,
  Eye,
  Check,
  X,
  Trash2,
  ThumbsUp,
  Image as ImageIcon
} from 'lucide-react'

const reviewStats = {
  totalReviews: 12847,
  avgRating: 4.3,
  todayReviews: 89,
  pendingReviews: 24,
  reportedReviews: 7,
  verifiedReviews: 9234
}

const reviews = [
  { 
    id: 1, 
    storeName: '강남 맛집', 
    userName: '김○○',
    rating: 5,
    content: '정말 맛있어요! 분위기도 좋고 직원분들도 친절해요. 다음에 또 방문하고 싶습니다.',
    images: 2,
    likes: 45,
    date: '2025-01-25',
    status: 'approved', // approved, pending, hidden, reported
    isVerified: true
  },
  { 
    id: 2, 
    storeName: '홍대 카페', 
    userName: '이○○',
    rating: 4,
    content: '커피가 맛있고 디저트도 훌륭해요. 조금 시끄러운 편이지만 전체적으로 만족합니다.',
    images: 1,
    likes: 23,
    date: '2025-01-24',
    status: 'approved',
    isVerified: true
  },
  { 
    id: 3, 
    storeName: '부산 해물집', 
    userName: '박○○',
    rating: 2,
    content: '기대했던 것보다 별로였어요. 가격 대비 양도 적고 서비스도 아쉬웠습니다.',
    images: 0,
    likes: 5,
    date: '2025-01-23',
    status: 'reported',
    isVerified: false,
    reportReason: '욕설/비방'
  },
  { 
    id: 4, 
    storeName: '명동 떡볶이', 
    userName: '최○○',
    rating: 5,
    content: '떡볶이 맛집! 양도 많고 가격도 착해요. 학생들에게 추천합니다.',
    images: 3,
    likes: 67,
    date: '2025-01-22',
    status: 'pending',
    isVerified: true
  },
  { 
    id: 5, 
    storeName: '서울역 피자', 
    userName: '정○○',
    rating: 3,
    content: '보통 수준이에요. 특별하지는 않지만 나쁘지도 않습니다.',
    images: 1,
    likes: 12,
    date: '2025-01-21',
    status: 'approved',
    isVerified: false
  }
]

export function ReviewManagement() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl text-foreground">리뷰관리</h1>
          <p className="text-muted-foreground mt-1">전체 리뷰를 관리하고 승인/숨김 처리를 합니다</p>
        </div>
      </div>

      {/* 리뷰 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">전체 리뷰</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewStats.totalReviews.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">평균 평점</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-current" />
              <span className="text-2xl font-bold">{reviewStats.avgRating}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">오늘 리뷰</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+{reviewStats.todayReviews}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">승인 대기</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{reviewStats.pendingReviews}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">신고된 리뷰</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{reviewStats.reportedReviews}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">인증 리뷰</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{reviewStats.verifiedReviews.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* 리뷰 필터 */}
      <div className="flex gap-2">
        <Input 
          placeholder="매장명, 사용자명, 내용으로 검색..."
          className="max-w-sm"
        />
        <Select defaultValue="all">
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="pending">승인 대기</SelectItem>
            <SelectItem value="approved">승인됨</SelectItem>
            <SelectItem value="hidden">숨김</SelectItem>
            <SelectItem value="reported">신고됨</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all">
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 평점</SelectItem>
            <SelectItem value="5">⭐ 5점</SelectItem>
            <SelectItem value="4">⭐ 4점</SelectItem>
            <SelectItem value="3">⭐ 3점</SelectItem>
            <SelectItem value="2">⭐ 2점</SelectItem>
            <SelectItem value="1">⭐ 1점</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 리뷰 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>리뷰 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>매장</TableHead>
                <TableHead>작성자</TableHead>
                <TableHead>평점</TableHead>
                <TableHead className="min-w-[300px]">내용</TableHead>
                <TableHead>좋아요</TableHead>
                <TableHead>작성일</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell className="font-medium">{review.storeName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback>{review.userName[0]}</AvatarFallback>
                      </Avatar>
                      <span>{review.userName}</span>
                      {review.isVerified && (
                        <Badge variant="outline" className="text-xs">인증</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-4 h-4 ${i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[300px]">
                      <p className="text-sm truncate">{review.content}</p>
                      {review.images > 0 && (
                        <span className="text-xs text-muted-foreground">
                          <ImageIcon className="w-3 h-3 inline mr-1" />
                          {review.images}개 사진
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      <span className="text-sm">{review.likes}</span>
                    </div>
                  </TableCell>
                  <TableCell>{review.date}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        review.status === 'approved' ? 'default' :
                        review.status === 'pending' ? 'secondary' :
                        review.status === 'reported' ? 'destructive' :
                        'outline'
                      }
                    >
                      {review.status === 'approved' ? '승인됨' :
                       review.status === 'pending' ? '대기중' :
                       review.status === 'reported' ? '신고됨' :
                       '숨김'}
                    </Badge>
                    {review.status === 'reported' && review.reportReason && (
                      <p className="text-xs text-red-600 mt-1">{review.reportReason}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {review.status === 'pending' && (
                        <>
                          <Button size="sm" variant="outline" title="승인">
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" title="거부">
                            <X className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      {review.status === 'reported' && (
                        <>
                          <Button size="sm" variant="outline" title="무시">
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" title="숨김">
                            <Eye className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      {review.status === 'approved' && (
                        <Button size="sm" variant="outline" title="숨김">
                          <Eye className="w-3 h-3" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" title="삭제">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}