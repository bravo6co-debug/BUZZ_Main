import { useState } from "react"
import { X, Star, Camera, Gift, AlertCircle } from "lucide-react"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Textarea } from "./ui/textarea"
import { Badge } from "./ui/badge"
import { toast } from "sonner"
import { ReviewService } from "../data/reviewData"

interface ReviewWriteModalProps {
  isOpen: boolean
  onClose: () => void
  storeId: string
  storeName: string
  onReviewSubmitted: () => void
}

export default function ReviewWriteModal({ 
  isOpen, 
  onClose, 
  storeId, 
  storeName, 
  onReviewSubmitted 
}: ReviewWriteModalProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState("")
  const [photos, setPhotos] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    // 실제로는 파일을 서버에 업로드해야 하지만, 여기서는 mock URL을 생성
    const newPhotos: string[] = []
    Array.from(files).forEach((file) => {
      const mockUrl = `/api/placeholder/300/200?file=${file.name}`
      newPhotos.push(mockUrl)
    })

    setPhotos(prev => [...prev, ...newPhotos].slice(0, 5)) // 최대 5장
  }

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const calculateReward = () => {
    let points = 50 // 기본 리뷰 작성 보상
    
    if (photos.length > 0) {
      points += 50 // 사진 첨부 보상
    }
    
    if (comment.length >= 100) {
      points += 25 // 긴 리뷰 보상
    }
    
    return points
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("별점을 선택해주세요")
      return
    }

    if (comment.trim().length < 10) {
      toast.error("리뷰는 최소 10자 이상 작성해주세요")
      return
    }

    setIsSubmitting(true)

    try {
      const newReview = ReviewService.createReview({
        storeId,
        storeName,
        rating,
        comment: comment.trim(),
        photos,
        hasReward: true,
        rewardType: 'point',
        rewardAmount: calculateReward()
      })

      toast.success(
        `리뷰가 등록되었습니다!\n${newReview.rewardAmount}P를 받으셨어요 🎉`, 
        { duration: 4000 }
      )

      // 폼 초기화
      setRating(0)
      setComment("")
      setPhotos([])
      
      onReviewSubmitted()
      onClose()

    } catch (error) {
      toast.error("리뷰 등록에 실패했습니다")
    } finally {
      setIsSubmitting(false)
    }
  }

  const rewardPoints = calculateReward()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg">리뷰 작성</DialogTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X size={20} />
              </Button>
            </div>
            <div className="text-sm text-gray-600">{storeName}</div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* 예상 보상 안내 */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-700">예상 보상</span>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {rewardPoints}P
                </Badge>
              </div>
              <div className="text-xs text-blue-600 space-y-1">
                <div>• 기본 리뷰: 50P</div>
                {photos.length > 0 && <div>• 사진 첨부: +50P</div>}
                {comment.length >= 100 && <div>• 상세 리뷰(100자+): +25P</div>}
              </div>
            </div>

            {/* 별점 선택 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">별점을 선택해주세요</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="p-1 transition-all hover:scale-110"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                  >
                    <Star
                      size={28}
                      className={
                        star <= (hoverRating || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "fill-gray-200 text-gray-200"
                      }
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  {rating > 0 && (
                    <span>
                      {rating === 5 && "최고예요!"}
                      {rating === 4 && "좋아요!"}
                      {rating === 3 && "보통이에요"}
                      {rating === 2 && "별로예요"}
                      {rating === 1 && "아쉬워요"}
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* 리뷰 작성 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                리뷰를 작성해주세요
                <span className="text-xs text-gray-500 ml-1">
                  ({comment.length}/500자)
                </span>
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 500))}
                placeholder="매장에 대한 솔직한 후기를 남겨주세요&#10;&#10;• 음식의 맛, 서비스, 분위기 등&#10;• 다른 고객들에게 도움이 되는 정보&#10;• 재방문 의사나 추천 이유"
                className="min-h-[100px] resize-none"
              />
              {comment.length >= 100 && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <AlertCircle size={12} />
                  <span>상세한 리뷰로 추가 포인트를 받으세요!</span>
                </div>
              )}
            </div>

            {/* 사진 첨부 */}
            <div className="space-y-3">
              <label className="text-sm font-medium">사진 첨부 (선택)</label>
              
              {/* 업로드 버튼 */}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <label
                  htmlFor="photo-upload"
                  className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <Camera size={16} />
                  <span className="text-sm">사진 추가</span>
                </label>
                <span className="text-xs text-gray-500">
                  최대 5장, 사진 첨부 시 +50P
                </span>
              </div>

              {/* 업로드된 사진들 */}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photo}
                        alt={`리뷰 사진 ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg border"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 주의사항 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-xs text-gray-600 space-y-1">
                <div className="font-medium mb-1">리뷰 작성 시 주의사항:</div>
                <div>• 허위 리뷰나 스팸성 리뷰는 삭제될 수 있습니다</div>
                <div>• 욕설, 비방, 광고성 내용은 금지됩니다</div>
                <div>• 개인정보가 포함된 사진은 업로드하지 마세요</div>
                <div>• 한 매장당 하나의 리뷰만 작성 가능합니다</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={onClose}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button 
                className="flex-1"
                onClick={handleSubmit}
                disabled={isSubmitting || rating === 0}
              >
                {isSubmitting ? "등록 중..." : "리뷰 등록"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}