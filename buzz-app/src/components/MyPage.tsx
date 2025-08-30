import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { User, Settings, Heart, History, HelpCircle, LogOut, ChevronRight, QrCode, Wallet, MessageSquare, Star, Camera, Ticket, Clock, Store } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import MyReviewsModal from "./MyReviewsModal";
import { ReviewService, ReviewStats } from "../data/reviewData";
import FileUpload from "./FileUpload";
import { storageService } from "../services/storage.service";
import { toast } from "sonner";
import { 
  getActiveCoupons, 
  getCouponById, 
  formatDiscountText, 
  getDaysUntilExpiry, 
  isExpiringSoon,
  Coupon 
} from "../data/couponData";

interface MyPageProps {
  onLogout: () => void;
}

export default function MyPage({ onLogout }: MyPageProps) {
  const [showCouponQR, setShowCouponQR] = useState(false);
  const [showMileageQR, setShowMileageQR] = useState(false);
  const [showMyReviews, setShowMyReviews] = useState(false);
  const [showProfileUpload, setShowProfileUpload] = useState(false);
  const [showCouponList, setShowCouponList] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string>("");
  const [mileageQRExpiry, setMileageQRExpiry] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [couponQRUrl, setCouponQRUrl] = useState<string>("");
  const [mileageQRUrl, setMileageQRUrl] = useState<string>("");
  const [activeCoupons, setActiveCoupons] = useState<Coupon[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats>({
    totalReviews: 0,
    averageRating: 0,
    totalRewardsEarned: 0,
    photoReviews: 0
  });

  useEffect(() => {
    loadReviewStats();
    loadCoupons();
  }, []);

  const loadCoupons = () => {
    const coupons = getActiveCoupons();
    setActiveCoupons(coupons);
  };

  // 마일리지 QR 만료 타이머
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (mileageQRExpiry) {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const expiryTime = mileageQRExpiry.getTime();
        const timeLeft = Math.max(0, expiryTime - now);
        
        setRemainingTime(Math.floor(timeLeft / 1000));

        if (timeLeft <= 0) {
          setShowMileageQR(false);
          setMileageQRExpiry(null);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mileageQRExpiry]);

  const loadReviewStats = () => {
    const stats = ReviewService.getMyReviewStats();
    setReviewStats(stats);
  };

  const handleShowMileageQR = async () => {
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // 5분 후
    const mileageData = `BUZZ_MILEAGE_${Date.now()}`;
    
    try {
      const qrUrl = await QRCode.toDataURL(mileageData, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setMileageQRUrl(qrUrl);
    } catch (err) {
      console.error('QR code generation error:', err);
    }
    
    setMileageQRExpiry(expiryTime);
    setShowMileageQR(true);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProfileImageUpload = async (files: File[]) => {
    if (files.length === 0) return;
    
    const file = files[0];
    const result = await storageService.uploadProfileImage(file);
    
    if (result.success) {
      setProfileImageUrl(result.url || '');
      setShowProfileUpload(false);
      toast.success('프로필 이미지가 업데이트되었습니다');
    } else {
      toast.error(result.error || '프로필 이미지 업로드 실패');
    }
  };

  const userStats = [
    { 
      label: "내 리뷰", 
      count: reviewStats.totalReviews, 
      icon: "💬",
      onClick: () => setShowMyReviews(true)
    },
    { label: "찜한 매장", count: 8, icon: "❤️" },
    { label: "보유 쿠폰", count: activeCoupons.length, icon: "🎫", onClick: () => setShowCouponList(true) },
    { 
      label: "포인트", 
      count: `${(12500 + reviewStats.totalRewardsEarned).toLocaleString()}P`, 
      icon: "💰" 
    }
  ] as Array<{
    label: string;
    count: number | string;
    icon: string;
    onClick?: () => void;
  }>;

  const menuItems = [
    { icon: MessageSquare, label: "내 리뷰", hasChevron: true, onClick: () => setShowMyReviews(true) },
    { icon: History, label: "이용 내역", hasChevron: true },
    { icon: Heart, label: "찜한 매장", hasChevron: true },
    { icon: Settings, label: "설정", hasChevron: true },
    { icon: HelpCircle, label: "고객센터", hasChevron: true },
  ] as Array<{
    icon: any;
    label: string;
    hasChevron: boolean;
    onClick?: () => void;
  }>;

  // 최근 리뷰 활동과 기존 활동을 결합
  const myReviews = ReviewService.getMyReviews().slice(0, 2); // 최근 2개 리뷰만
  const reviewActivities = myReviews.map(review => ({
    id: `review-${review.id}`,
    type: "review",
    store: review.storeName,
    action: "리뷰 작성",
    time: ReviewService.getTimeAgo(review.createdAt),
    points: `+${review.rewardAmount || 0}P`
  }));

  const otherActivities = [
    { id: 2, type: "coupon", store: "맛있는 식당", action: "쿠폰 사용", time: "1일 전", points: "-3,000원" },
    { id: 3, type: "like", store: "힐링 카페", action: "매장 찜", time: "2일 전", points: "" },
    { id: 4, type: "visit", store: "브런치 카페", action: "매장 방문", time: "3일 전", points: "+50P" },
  ];

  const recentActivity = [...reviewActivities, ...otherActivities].slice(0, 4);

  return (
    <div className="p-4 pb-20">
      {/* Profile Section */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <Avatar className="w-16 h-16">
              <AvatarImage src={profileImageUrl || "/api/placeholder/64/64"} />
              <AvatarFallback>
                <User size={24} />
              </AvatarFallback>
            </Avatar>
            <button
              className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white shadow-lg hover:bg-primary/90 transition-colors"
              onClick={() => setShowProfileUpload(true)}
            >
              <Camera size={14} />
            </button>
          </div>
          <div className="flex-1">
            <h2 className="font-medium mb-1">김○○ 님</h2>
            <p className="text-sm text-gray-600">buzz_user@email.com</p>
            <Button variant="outline" size="sm" className="mt-2">
              프로필 수정
            </Button>
          </div>
        </div>

        {/* User Stats */}
        <div className="grid grid-cols-4 gap-3">
          {userStats.map((stat, index) => (
            <button
              key={index}
              className="text-center p-2 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => {
                if (stat.label === "포인트") handleShowMileageQR();
                if (stat.onClick) stat.onClick();
              }}
            >
              <div className="text-lg mb-1">{stat.icon}</div>
              <div className="text-sm font-medium">{stat.count}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="bg-white rounded-lg border mb-6">
        {menuItems.map((item, index) => (
          <div key={index}>
            <button 
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              onClick={() => {
                if (item.onClick) item.onClick();
              }}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} className="text-gray-600" />
                <span>{item.label}</span>
              </div>
              {item.hasChevron && <ChevronRight size={16} className="text-gray-400" />}
            </button>
            {index < menuItems.length - 1 && <Separator />}
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border mb-6">
        <div className="p-4 border-b">
          <h3 className="font-medium">최근 활동</h3>
        </div>
        <div className="divide-y">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{activity.store}</span>
                    {activity.points && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        activity.points.startsWith('+') 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {activity.points}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{activity.action}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
                <div className="text-2xl">
                  {activity.type === 'review' && '💬'}
                  {activity.type === 'coupon' && '🎫'}
                  {activity.type === 'like' && '❤️'}
                  {activity.type === 'visit' && '📍'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Button 
          variant="outline" 
          className="flex flex-col items-center gap-2 h-20"
          onClick={() => setShowCouponList(true)}
        >
          <Ticket size={24} />
          <span className="text-sm">내 쿠폰</span>
        </Button>
        <Button 
          variant="outline" 
          className="flex flex-col items-center gap-2 h-20"
          onClick={handleShowMileageQR}
        >
          <Wallet size={24} />
          <span className="text-sm">마일리지 QR</span>
        </Button>
      </div>

      {/* Logout Button */}
      <Button 
        variant="outline" 
        className="w-full text-red-600 border-red-200 hover:bg-red-50"
        onClick={onLogout}
      >
        <LogOut size={16} className="mr-2" />
        로그아웃
      </Button>

      {/* Coupon List Modal */}
      <Dialog open={showCouponList} onOpenChange={setShowCouponList}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="text-primary" size={20} />
              내 쿠폰 목록
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            {activeCoupons.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                사용 가능한 쿠폰이 없습니다
              </div>
            ) : (
              activeCoupons.map(coupon => {
                const daysLeft = getDaysUntilExpiry(coupon);
                const expiring = isExpiringSoon(coupon);
                
                return (
                  <Card 
                    key={coupon.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={async () => {
                      setSelectedCoupon(coupon);
                      const qrData = `BUZZ_COUPON_${coupon.id}_${Date.now()}`;
                      try {
                        const qrUrl = await QRCode.toDataURL(qrData, {
                          width: 200,
                          margin: 1
                        });
                        setCouponQRUrl(qrUrl);
                      } catch (err) {
                        console.error('QR generation error:', err);
                      }
                      setShowCouponList(false);
                      setShowCouponQR(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{coupon.name}</h4>
                          <p className="text-xs text-gray-500 mt-1">{coupon.description}</p>
                        </div>
                        {expiring && (
                          <Badge variant="destructive" className="text-xs">
                            D-{daysLeft}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {formatDiscountText(coupon)}
                        </Badge>
                        {coupon.minPurchaseAmount && (
                          <span className="text-xs text-gray-500">
                            {coupon.minPurchaseAmount.toLocaleString()}원 이상
                          </span>
                        )}
                      </div>
                      
                      {coupon.businessNames && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Store size={12} />
                          <span>{coupon.businessNames.join(', ')}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                        <Clock size={12} />
                        <span>~{new Date(coupon.validUntil).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
          
          <div className="text-center pt-2">
            <Button variant="outline" onClick={() => setShowCouponList(false)}>
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Coupon QR Modal */}
      {showCouponQR && selectedCoupon && (
        <Dialog open={showCouponQR} onOpenChange={(open) => {
          setShowCouponQR(open);
          if (!open) setSelectedCoupon(null);
        }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-center">
                {selectedCoupon.name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="text-center space-y-4">
              <div className="w-48 h-48 bg-white border-2 border-gray-200 rounded-lg mx-auto flex items-center justify-center">
                {couponQRUrl ? (
                  <img 
                    src={couponQRUrl} 
                    alt="쿠폰 QR 코드" 
                    className="w-40 h-40"
                  />
                ) : (
                  <div className="w-40 h-40 bg-gray-200 animate-pulse flex items-center justify-center">
                    <span className="text-gray-500">생성 중...</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Badge variant="secondary" className="text-sm">
                  {formatDiscountText(selectedCoupon)}
                </Badge>
                <p className="text-sm text-gray-600">{selectedCoupon.description}</p>
                
                {selectedCoupon.minPurchaseAmount && (
                  <p className="text-xs text-gray-500">
                    최소 주문: {selectedCoupon.minPurchaseAmount.toLocaleString()}원
                  </p>
                )}
                
                {selectedCoupon.businessNames && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-700">
                      사용 가능 매장: {selectedCoupon.businessNames.join(', ')}
                    </p>
                  </div>
                )}
                
                <p className="text-xs text-gray-400">
                  유효기간: ~{new Date(selectedCoupon.validUntil).toLocaleDateString()}
                </p>
                
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    💡 매장에서 이 QR코드를 보여주세요
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Mileage QR Modal */}
      {showMileageQR && (
        <Dialog open={showMileageQR} onOpenChange={setShowMileageQR}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                💰 마일리지 QR 코드
              </DialogTitle>
            </DialogHeader>
            
            <div className="text-center space-y-4">
              <div className="w-48 h-48 bg-white border-2 border-gray-200 rounded-lg mx-auto flex items-center justify-center">
                {mileageQRUrl ? (
                  <img 
                    src={mileageQRUrl} 
                    alt="마일리지 QR 코드" 
                    className="w-40 h-40"
                  />
                ) : (
                  <div className="w-40 h-40 bg-gray-200 animate-pulse flex items-center justify-center">
                    <span className="text-gray-500">생성 중...</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <p className="font-medium">마일리지 적립/사용 QR 코드</p>
                <p className="text-sm text-gray-600">매장에서 QR코드를 스캔하여 포인트를 적립하거나 사용하세요</p>
                
                {/* 실시간 만료 타이머 */}
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                  <div className="flex items-center justify-center gap-2 text-red-700">
                    <span className="text-lg">⏰</span>
                    <span className="font-mono text-lg font-bold">
                      {formatTime(remainingTime)}
                    </span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">
                    남은 시간 (5분 후 만료)
                  </p>
                </div>
                
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-700">
                    💰 보유 포인트: 12,500P
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* My Reviews Modal */}
      <MyReviewsModal
        isOpen={showMyReviews}
        onClose={() => {
          setShowMyReviews(false)
          loadReviewStats() // 모달 닫을 때 통계 새로고침
        }}
      />

      {/* Profile Image Upload Modal */}
      <Dialog open={showProfileUpload} onOpenChange={setShowProfileUpload}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>프로필 이미지 변경</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <FileUpload
              onUpload={handleProfileImageUpload}
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              multiple={false}
              maxFiles={1}
              maxSize={5}
              fileType="image"
              preview={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}