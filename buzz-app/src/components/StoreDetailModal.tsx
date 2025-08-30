import { useState, useEffect } from "react";
import { X, Star, MapPin, MessageSquare, Navigation, Edit, Trash2, Camera } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { ReviewService, Review } from "../data/reviewData";
import ReviewWriteModal from "./ReviewWriteModal";

interface StoreDetailModalProps {
  store: any;
  onClose: () => void;
}

export default function StoreDetailModal({ store, onClose }: StoreDetailModalProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewStats, setReviewStats] = useState({ totalReviews: 0, averageRating: 0 })
  const [showReviewWrite, setShowReviewWrite] = useState(false)
  const [canWriteReview, setCanWriteReview] = useState(false)

  const images = [
    "/api/placeholder/300/200",
    "/api/placeholder/300/200",
    "/api/placeholder/300/200"
  ];

  useEffect(() => {
    loadReviews()
    checkCanWriteReview()
  }, [store.id])

  const loadReviews = () => {
    const storeReviews = ReviewService.getReviewsByStoreId(store.id)
    const stats = ReviewService.getStoreReviewStats(store.id)
    
    setReviews(storeReviews)
    setReviewStats(stats)
  }

  const checkCanWriteReview = () => {
    const canWrite = ReviewService.canUserReviewStore(store.id)
    setCanWriteReview(canWrite)
  }

  const coupons = [
    { id: 1, title: "아메리카노 3천원 할인", expiry: "2024.12.31" },
    { id: 2, title: "케이크 세트 10% 할인", expiry: "2024.12.31" },
  ];

  const handleReviewWriteClick = () => {
    if (!canWriteReview) {
      toast.error("이미 이 매장에 리뷰를 작성하셨습니다")
      return
    }
    setShowReviewWrite(true)
  }

  const handleReviewSubmitted = () => {
    loadReviews()
    checkCanWriteReview()
  }

  const handleDeleteReview = (reviewId: string) => {
    if (confirm("정말 이 리뷰를 삭제하시겠습니까?")) {
      const success = ReviewService.deleteReview(reviewId)
      if (success) {
        toast.success("리뷰가 삭제되었습니다")
        loadReviews()
        checkCanWriteReview()
      } else {
        toast.error("리뷰 삭제에 실패했습니다")
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3>{store.name}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto">
          {/* Image Slider */}
          <div className="relative">
            <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500">매장 이미지 슬라이더</span>
            </div>
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              1/3
            </div>
          </div>

          {/* Store Info */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1">
                <Star size={16} className="text-yellow-500 fill-current" />
                <span className="font-medium">
                  {reviewStats.totalReviews > 0 ? reviewStats.averageRating.toFixed(1) : store.rating}
                </span>
              </div>
              <span className="text-gray-500 text-sm">
                (리뷰 {reviewStats.totalReviews}개)
              </span>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <MapPin size={16} className="text-gray-500" />
              <span className="text-sm text-gray-600">부산광역시 남구 용호동</span>
            </div>

            {/* Available Coupons */}
            <div className="mb-4">
              <h4 className="font-medium mb-2">🎫 사용가능 쿠폰</h4>
              <div className="space-y-2">
                {coupons.map((coupon) => (
                  <div key={coupon.id} className="border rounded-lg p-2 bg-blue-50">
                    <div className="font-medium text-sm">{coupon.title}</div>
                    <div className="text-xs text-gray-500">유효기간: {coupon.expiry}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-4">
              <Button className="flex-1" size="sm">
                <Navigation size={16} className="mr-2" />
                길찾기
              </Button>
              <Button 
                variant={canWriteReview ? "default" : "outline"} 
                className="flex-1" 
                size="sm"
                onClick={handleReviewWriteClick}
              >
                <MessageSquare size={16} className="mr-2" />
                {canWriteReview ? "리뷰 작성" : "리뷰 보기"}
              </Button>
            </div>

            {/* Reviews */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">⭐ 리뷰</h4>
                {canWriteReview && (
                  <Button size="sm" variant="outline" onClick={handleReviewWriteClick}>
                    <MessageSquare size={14} className="mr-1" />
                    리뷰 작성
                  </Button>
                )}
              </div>
              
              {reviews.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare size={40} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">아직 리뷰가 없습니다</p>
                  {canWriteReview && (
                    <p className="text-xs mt-1">첫 번째 리뷰를 작성해보세요!</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => {
                    const isMyReview = review.userId === 'user-1' // 현재 사용자 ID와 비교
                    
                    return (
                      <div key={review.id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{review.userName}</span>
                            <div className="flex">
                              {[...Array(review.rating)].map((_, i) => (
                                <Star key={i} size={12} className="text-yellow-500 fill-current" />
                              ))}
                            </div>
                            {isMyReview && (
                              <Badge variant="secondary" className="text-xs">내 리뷰</Badge>
                            )}
                            {review.hasReward && (
                              <Badge variant="outline" className="text-xs text-blue-600">
                                +{review.rewardAmount}{review.rewardType === 'point' ? 'P' : '원'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {ReviewService.getTimeAgo(review.createdAt)}
                            </span>
                            {isMyReview && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteReview(review.id)}
                              >
                                <Trash2 size={12} />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-2">{review.comment}</p>
                        
                        {/* 첨부된 사진들 */}
                        {review.photos.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {review.photos.slice(0, 3).map((photo, index) => (
                              <img
                                key={index}
                                src={photo}
                                alt={`리뷰 사진 ${index + 1}`}
                                className="w-12 h-12 object-cover rounded border"
                              />
                            ))}
                            {review.photos.length > 3 && (
                              <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                                <span className="text-xs text-gray-500">+{review.photos.length - 3}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 리뷰 작성 모달 */}
      <ReviewWriteModal
        isOpen={showReviewWrite}
        onClose={() => setShowReviewWrite(false)}
        storeId={store.id}
        storeName={store.name}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </div>
  );
}