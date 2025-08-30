import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Star, Upload, X, Camera } from "lucide-react";
import FileUpload from "./FileUpload";
import { storageService } from "../services/storage.service";
import { toast } from "sonner";

interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessName?: string;
  onSubmit?: (reviewData: ReviewData) => void;
}

export interface ReviewData {
  businessId: string;
  rating: number;
  content: string;
  visitPurpose: string;
  tags: string[];
  visitCount: number;
  images: File[];
}

export default function WriteReviewModal({ isOpen, onClose, businessName = "매장", onSubmit }: WriteReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState("");
  const [visitPurpose, setVisitPurpose] = useState("");
  const [visitCount, setVisitCount] = useState(1);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const predefinedTags = [
    "맛있어요", "친절해요", "깔끔해요", "분위기 좋아요", 
    "가성비 좋아요", "재방문 의사", "추천해요", "빠른 서비스",
    "주차 편리", "접근성 좋음"
  ];

  const handleImageUpload = async (files: File[]) => {
    setImages(files);
  };

  const handleImageRemove = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    if (rating === 0) {
      alert("별점을 선택해주세요.");
      return;
    }

    if (content.trim().length < 10) {
      alert("리뷰는 10자 이상 작성해주세요.");
      return;
    }

    const reviewData: ReviewData = {
      businessId: "business-1", // 실제로는 props로 받아야 함
      rating,
      content: content.trim(),
      visitPurpose: visitPurpose.trim(),
      tags: selectedTags,
      visitCount,
      images
    };

    onSubmit?.(reviewData);
    
    // 폼 초기화
    setRating(0);
    setContent("");
    setVisitPurpose("");
    setSelectedTags([]);
    setVisitCount(1);
    setImages([]);
    setImagePreviews([]);
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="text-yellow-500" size={20} />
            {businessName} 리뷰 작성
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 별점 선택 */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">이 매장은 어떠셨나요?</p>
            <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="transition-colors"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    size={32}
                    className={`${
                      star <= (hoverRating || rating)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-yellow-600">
                {rating === 1 && "아쉬워요"}
                {rating === 2 && "별로예요"}
                {rating === 3 && "보통이에요"}
                {rating === 4 && "좋아요"}
                {rating === 5 && "최고예요!"}
              </p>
            )}
          </div>

          {/* 방문 정보 */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                방문 목적
              </label>
              <Input
                placeholder="예: 점심식사, 친구와 만남, 데이트 등"
                value={visitPurpose}
                onChange={(e) => setVisitPurpose(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                방문 횟수
              </label>
              <Input
                type="number"
                min="1"
                max="100"
                value={visitCount}
                onChange={(e) => setVisitCount(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          {/* 리뷰 내용 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              리뷰 내용 *
            </label>
            <Textarea
              placeholder="솔직한 리뷰를 작성해주세요. (최소 10자)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 mt-1">
              {content.length}/1000자
            </p>
          </div>

          {/* 태그 선택 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              태그 선택 (선택사항)
            </label>
            <div className="flex flex-wrap gap-2">
              {predefinedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    selectedTags.includes(tag)
                      ? "bg-blue-100 border-blue-300 text-blue-700"
                      : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* 이미지 업로드 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              사진 첨부 (최대 3장)
            </label>
            
            <FileUpload
              onUpload={handleImageUpload}
              onRemove={handleImageRemove}
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              multiple={true}
              maxFiles={3}
              maxSize={5}
              fileType="image"
              preview={true}
              compact={true}
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || content.trim().length < 10}
              className="flex-1"
            >
              리뷰 작성
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}