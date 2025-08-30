import { useState, useEffect } from "react"
import { X, Star, Calendar, Gift, Trash2, MessageSquare } from "lucide-react"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Badge } from "./ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { toast } from "sonner"
import { ReviewService, Review, ReviewStats } from "../data/reviewData"

interface MyReviewsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function MyReviewsModal({ isOpen, onClose }: MyReviewsModalProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<ReviewStats>({ 
    totalReviews: 0, 
    averageRating: 0, 
    totalRewardsEarned: 0, 
    photoReviews: 0 
  })
  const [activeTab, setActiveTab] = useState("reviews")

  useEffect(() => {
    if (isOpen) {
      loadMyReviews()
    }
  }, [isOpen])

  const loadMyReviews = () => {
    const myReviews = ReviewService.getMyReviews()
    const myStats = ReviewService.getMyReviewStats()
    
    setReviews(myReviews)
    setStats(myStats)
  }

  const handleDeleteReview = (reviewId: string) => {
    if (confirm("정말 이 리뷰를 삭제하시겠습니까?")) {
      const success = ReviewService.deleteReview(reviewId)
      if (success) {
        toast.success("리뷰가 삭제되었습니다")
        loadMyReviews()
      } else {
        toast.error("리뷰 삭제에 실패했습니다")
      }
    }
  }

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = "blue" 
  }: {
    title: string
    value: string | number
    icon: any
    color?: "blue" | "green" | "purple" | "orange"
  }) => {
    const colorClasses = {
      blue: "bg-blue-50 text-blue-600 border-blue-200",
      green: "bg-green-50 text-green-600 border-green-200",
      purple: "bg-purple-50 text-purple-600 border-purple-200",
      orange: "bg-orange-50 text-orange-600 border-orange-200"
    }

    return (
      <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
        <div className="flex items-center gap-2 mb-1">
          <Icon size={16} />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg">내 리뷰 관리</DialogTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X size={20} />
              </Button>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mx-4 mt-4">
                <TabsTrigger value="reviews">내 리뷰</TabsTrigger>
                <TabsTrigger value="stats">통계</TabsTrigger>
              </TabsList>

              {/* 리뷰 목록 탭 */}
              <TabsContent value="reviews" className="flex-1 overflow-y-auto p-4 m-0">
                {reviews.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">작성한 리뷰가 없습니다</p>
                    <p className="text-xs mt-1">매장을 방문하고 첫 리뷰를 남겨보세요!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((review) => (
                      <div key={review.id} className="border rounded-lg p-3 bg-white">
                        {/* 리뷰 헤더 */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{review.storeName}</h4>
                              <div className="flex">
                                {[...Array(review.rating)].map((_, i) => (
                                  <Star key={i} size={12} className="text-yellow-500 fill-current" />
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                <Calendar size={10} className="mr-1" />
                                {ReviewService.getTimeAgo(review.createdAt)}
                              </Badge>
                              {review.hasReward && (
                                <Badge variant="secondary" className="text-xs text-green-600">
                                  <Gift size={10} className="mr-1" />
                                  +{review.rewardAmount}{review.rewardType === 'point' ? 'P' : '원'}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteReview(review.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>

                        {/* 리뷰 내용 */}
                        <p className="text-sm text-gray-700 mb-2">{review.comment}</p>

                        {/* 첨부된 사진들 */}
                        {review.photos.length > 0 && (
                          <div className="flex gap-1">
                            {review.photos.slice(0, 4).map((photo, index) => (
                              <img
                                key={index}
                                src={photo}
                                alt={`리뷰 사진 ${index + 1}`}
                                className="w-10 h-10 object-cover rounded border"
                              />
                            ))}
                            {review.photos.length > 4 && (
                              <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center">
                                <span className="text-xs text-gray-500">+{review.photos.length - 4}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* 통계 탭 */}
              <TabsContent value="stats" className="flex-1 overflow-y-auto p-4 m-0">
                <div className="space-y-4">
                  {/* 기본 통계 */}
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard
                      title="총 리뷰 수"
                      value={stats.totalReviews}
                      icon={MessageSquare}
                      color="blue"
                    />
                    <StatCard
                      title="평균 별점"
                      value={stats.totalReviews > 0 ? stats.averageRating.toFixed(1) : "0.0"}
                      icon={Star}
                      color="orange"
                    />
                    <StatCard
                      title="사진 리뷰"
                      value={stats.photoReviews}
                      icon={Gift}
                      color="purple"
                    />
                    <StatCard
                      title="획득 포인트"
                      value={`${stats.totalRewardsEarned.toLocaleString()}P`}
                      icon={Gift}
                      color="green"
                    />
                  </div>

                  {/* 리뷰 활동 요약 */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium mb-3 text-blue-800">🎉 리뷰 활동 요약</h4>
                    <div className="space-y-2 text-sm text-blue-700">
                      {stats.totalReviews === 0 ? (
                        <p>아직 리뷰를 작성하지 않았습니다. 첫 리뷰를 작성해보세요!</p>
                      ) : (
                        <>
                          <p>• 총 {stats.totalReviews}개의 리뷰를 작성했습니다</p>
                          <p>• 사진을 포함한 리뷰가 {stats.photoReviews}개입니다</p>
                          <p>• 리뷰 작성으로 총 {stats.totalRewardsEarned}P를 획득했습니다</p>
                          {stats.averageRating >= 4 && (
                            <p>• 평균 별점이 {stats.averageRating.toFixed(1)}점으로 높습니다! 👍</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* 리뷰 팁 */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium mb-3 text-gray-800">💡 더 많은 포인트를 받는 방법</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>• 사진을 첨부하면 추가 50P</p>
                      <p>• 100자 이상 상세한 리뷰 작성 시 25P</p>
                      <p>• 정직하고 도움이 되는 리뷰를 작성해보세요</p>
                    </div>
                  </div>

                  {/* 최근 리뷰 미리보기 */}
                  {reviews.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium mb-3 text-gray-800">📝 최근 리뷰</h4>
                      <div className="space-y-2">
                        {reviews.slice(0, 3).map((review) => (
                          <div key={review.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
                            <div className="flex">
                              {[...Array(review.rating)].map((_, i) => (
                                <Star key={i} size={10} className="text-yellow-500 fill-current" />
                              ))}
                            </div>
                            <span className="font-medium">{review.storeName}</span>
                            <span className="text-gray-500">
                              {ReviewService.getTimeAgo(review.createdAt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}