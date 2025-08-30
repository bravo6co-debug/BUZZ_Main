import { useState, useEffect } from "react";
import { LogIn, LogOut, Users, Star, Tag, RefreshCw, QrCode, MessageSquare, Bell, ChevronLeft, ChevronRight, Clock, MapPin, Gift, Ticket, Store } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Card, CardContent } from "./ui/card";
import CommunityModal from "./CommunityModal";
import StoreDetailModal from "./StoreDetailModal";
import QRScanner from "./QRScanner";
import WriteReviewModal from "./WriteReviewModal";
import NotificationCenter, { useNotifications } from "./NotificationCenter";
import LoginPromptModal from "./LoginPromptModal";
import LoginPage from "./LoginPage";
import InfiniteStoreList from "./InfiniteStoreList";
import StoreSearchBar from "./StoreSearchBar";
import { businessApi, couponApi } from "../services/api.service";
import { businessService } from "../services/business.service";
import { timeBasedDisplayService, BusinessWithTimeSlots } from "../services/timeBasedDisplay.service";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import QRCode from "qrcode";
import { 
  getActiveCoupons, 
  formatDiscountText, 
  getDaysUntilExpiry, 
  isExpiringSoon,
  Coupon 
} from "../data/couponData";

export default function HomePage() {
  const { isLoggedIn, logout } = useAuth();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showLoginPage, setShowLoginPage] = useState(false);
  const [loginPromptMessage, setLoginPromptMessage] = useState("");
  const [showCommunity, setShowCommunity] = useState(false);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [stores, setStores] = useState<BusinessWithTimeSlots[]>([]);
  const [recommendedStores, setRecommendedStores] = useState<BusinessWithTimeSlots[]>([]);
  const [popularStores, setPopularStores] = useState<BusinessWithTimeSlots[]>([]);
  const [currentTimeSlot, setCurrentTimeSlot] = useState<string | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('all');
  const [timeMessage, setTimeMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [totalStores, setTotalStores] = useState(0);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showCouponQR, setShowCouponQR] = useState(false);
  const [showCouponList, setShowCouponList] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [couponQRUrl, setCouponQRUrl] = useState<string>("");
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [activeCoupons, setActiveCoupons] = useState<Coupon[]>([]);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [selectedStoreForReview, setSelectedStoreForReview] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, addNotification, unreadCount } = useNotifications();

  // 배너 데이터
  const banners = [
    { 
      id: 1, 
      title: "12월 특별 이벤트", 
      subtitle: "신규 가입시 10,000P 즉시 지급!",
      emoji: "🎄",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    },
    { 
      id: 2, 
      title: "오늘의 맛집", 
      subtitle: "인기 음식점 최대 30% 할인",
      emoji: "🍔",
      gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
    },
    { 
      id: 3, 
      title: "카페 타임", 
      subtitle: "아메리카노 1+1 이벤트",
      emoji: "☕",
      gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
    },
  ];

  // 오늘의 추천 데이터
  const todayRecommendations = {
    dining: { title: "오늘의 할인 맛집", icon: "🍽️", stores: [] },
    cafe: { title: "오늘의 카페", icon: "☕", stores: [] },
    hotplace: { title: "오늘의 HOT플레이스", icon: "🔥", stores: [] }
  };

  // 매장 데이터 로드
  useEffect(() => {
    loadInitialData();
  }, []);

  // 시간대별 필터링 업데이트
  useEffect(() => {
    const updateTimeBasedDisplay = () => {
      const slot = timeBasedDisplayService.getCurrentTimeSlot();
      setCurrentTimeSlot(slot);
      if (!selectedTimeSlot) {
        setSelectedTimeSlot(slot); // 처음에는 현재 시간대로 설정
      }
      setTimeMessage(timeBasedDisplayService.getCurrentTimeMessage());
    };

    updateTimeBasedDisplay();
    const interval = setInterval(updateTimeBasedDisplay, 60000); // 1분마다 업데이트
    
    return () => clearInterval(interval);
  }, []);


  // 배너 자동 전환
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // 쿠폰 데이터 로드 (로그인한 경우에만)
  useEffect(() => {
    if (isLoggedIn) {
      const coupons = getActiveCoupons();
      setActiveCoupons(coupons);
    } else {
      setActiveCoupons([]);
    }
  }, [isLoggedIn]);

  // 추천 매장 로드 함수
  const loadFeaturedStores = async () => {
    try {
      setLoading(true);
      
      // Supabase에서 모든 비즈니스 데이터 가져오기
      const supabaseResponse = await businessService.getBusinesses({
        limit: 50,
        category: selectedCategory === "전체" ? undefined : selectedCategory
      });
      
      if (supabaseResponse.success && supabaseResponse.data && supabaseResponse.data.length > 0) {
        // Supabase 데이터 사용
        let filteredStores = selectedCategory === "전체" 
          ? supabaseResponse.data 
          : supabaseResponse.data.filter((store: any) => store.category === selectedCategory);
        
        // 실제 시간대 데이터 사용 (DB에서 가져온 데이터)
        filteredStores = filteredStores.map((store: any) => ({
          ...store,
          coupon: "3천원", // 임시 쿠폰 데이터
          image: store.image_url || "/api/placeholder/120/120",
          displayTimeSlots: store.display_time_slots || {
            morning: true,
            lunch: true,
            dinner: true,
            night: true
          }
        }));
        
        // 전체 매장 저장
        setAllStores(filteredStores);
        
        // 선택된 시간대로 필터링 (없으면 현재 시간대)
        const targetSlot = selectedTimeSlot || timeBasedDisplayService.getCurrentTimeSlot();
        if (targetSlot) {
          const timeFilteredStores = targetSlot === 'all' 
            ? filteredStores
            : timeBasedDisplayService.filterByTimeSlot(filteredStores, targetSlot as any);
          const fairStores = timeBasedDisplayService.shuffleForFairness(timeFilteredStores);
          setStores(fairStores);
          
          // 추천 매장 설정
          const recommendations = targetSlot === 'all'
            ? timeBasedDisplayService.shuffleForFairness(filteredStores).slice(0, 3)
            : timeBasedDisplayService.getTimeBasedRecommendations(filteredStores, 3);
          setRecommendedStores(recommendations);
        }
      } else {
        // Supabase 데이터가 없으면 기존 API 시도
        const response = await businessApi.getFeaturedBusinesses();
        
        if (response.success && response.data) {
          const filteredStores = selectedCategory === "전체" 
            ? response.data 
            : response.data.filter((store: any) => store.category === selectedCategory);
          
          // Mock 시간대 데이터 추가
          const storesWithTimeSlots = filteredStores.map((store: any) => ({
            ...store,
            displayTimeSlots: {
              morning: Math.random() > 0.3,
              lunch: Math.random() > 0.2,
              dinner: Math.random() > 0.3,
              night: Math.random() > 0.5
            }
          }));
          
          // 전체 매장 저장
          setAllStores(storesWithTimeSlots);
          
          // 선택된 시간대로 필터링
          const targetSlot = selectedTimeSlot || timeBasedDisplayService.getCurrentTimeSlot();
          if (targetSlot) {
            const timeFilteredStores = targetSlot === 'all'
              ? storesWithTimeSlots
              : timeBasedDisplayService.filterByTimeSlot(storesWithTimeSlots, targetSlot as any);
            const fairStores = timeBasedDisplayService.shuffleForFairness(timeFilteredStores);
            setStores(fairStores);
            setRecommendedStores(timeBasedDisplayService.getTimeBasedRecommendations(storesWithTimeSlots, 3));
          }
        } else {
          // 둘 다 실패시 기본 데이터
          setStores([
            { id: "store-1", name: "카페 브라운", rating: 4.5, coupon: "3천원", image: "/api/placeholder/120/120", category: "카페" },
            { id: "store-2", name: "맛있는 식당", rating: 4.2, coupon: "5천원", image: "/api/placeholder/120/120", category: "음식점" },
            { id: "store-3", name: "힐링 카페", rating: 4.8, coupon: "할인", image: "/api/placeholder/120/120", category: "카페" },
          ]);
        }
      }
    } catch (error) {
      console.error("Failed to load stores:", error);
      
      // 에러 시 기본 데이터 사용
      const defaultStores = [
        { 
          id: "store-1", 
          name: "카페 브라운", 
          rating: 4.5, 
          coupon: "3천원", 
          image: "/api/placeholder/120/120", 
          category: "카페",
          displayTimeSlots: { morning: true, lunch: true, dinner: false, night: true },
          status: 'active' as const,
          address: '부산 남구',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        { 
          id: "store-2", 
          name: "맛있는 식당", 
          rating: 4.2, 
          coupon: "5천원", 
          image: "/api/placeholder/120/120", 
          category: "음식점",
          displayTimeSlots: { morning: false, lunch: true, dinner: true, night: false },
          status: 'active' as const,
          address: '부산 남구',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        { 
          id: "store-3", 
          name: "힐링 카페", 
          rating: 4.8, 
          coupon: "할인", 
          image: "/api/placeholder/120/120", 
          category: "카페",
          displayTimeSlots: { morning: true, lunch: false, dinner: true, night: true },
          status: 'active' as const,
          address: '부산 남구',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
      ];
      
      setAllStores(defaultStores);
      
      const targetSlot = selectedTimeSlot || timeBasedDisplayService.getCurrentTimeSlot();
      if (targetSlot) {
        const timeFilteredStores = targetSlot === 'all'
          ? defaultStores
          : timeBasedDisplayService.filterByTimeSlot(defaultStores, targetSlot as any);
        const fairStores = timeBasedDisplayService.shuffleForFairness(timeFilteredStores);
        setStores(fairStores);
        setRecommendedStores(timeBasedDisplayService.getTimeBasedRecommendations(defaultStores, 3));
      }
    } finally {
      setLoading(false);
    }
  };

  const categories = ["전체", "카페", "음식점", "기타"];

  // 로그인 필요한 기능 체크
  const requireAuth = (action: () => void, message: string = "이 기능을 사용하려면 로그인이 필요합니다") => {
    if (!isLoggedIn) {
      setLoginPromptMessage(message);
      setShowLoginPrompt(true);
      return false;
    }
    action();
    return true;
  };

  // 초기 데이터 로드
  const loadInitialData = async () => {
    await Promise.all([
      loadInitialStores(),
      loadPopularStores(),
      loadRecommendations()
    ]);
  };

  // 초기 매장 로드 (무한 스크롤용)
  const loadInitialStores = async () => {
    try {
      setLoading(true);
      
      const result = await businessService.getAllBusinessesWithPagination({
        limit: 20,
        offset: 0,
        category: selectedCategory !== '전체' ? selectedCategory : undefined,
        search: searchQuery || undefined,
        timeSlot: selectedTimeSlot === 'all' ? undefined : selectedTimeSlot as any
      });
      
      if (result.success) {
        setStores(result.data.map((store: any) => ({
          ...store,
          coupon: "3천원", // 임시 쿠폰 데이터
          image: store.image_url || "/api/placeholder/120/120"
        })));
        setTotalStores(result.total);
      } else {
        // Fallback to default data
        const defaultStores = [
          { 
            id: "store-1", 
            name: "카페 브라운", 
            rating: 4.5, 
            coupon: "3천원", 
            image: "/api/placeholder/120/120", 
            category: "카페",
            displayTimeSlots: { morning: true, lunch: true, dinner: false, night: true },
            status: 'active' as const,
            address: '부산 남구',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          { 
            id: "store-2", 
            name: "맛있는 식당", 
            rating: 4.2, 
            coupon: "5천원", 
            image: "/api/placeholder/120/120", 
            category: "음식점",
            displayTimeSlots: { morning: false, lunch: true, dinner: true, night: false },
            status: 'active' as const,
            address: '부산 남구',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        
        setStores(defaultStores);
        setTotalStores(defaultStores.length);
      }
    } catch (error) {
      console.error('Failed to load initial stores:', error);
    } finally {
      setLoading(false);
    }
  };

  // 인기 매장 로드
  const loadPopularStores = async () => {
    try {
      const result = await businessService.getPopularBusinesses(6);
      if (result.success && result.data) {
        setPopularStores(result.data.map((store: any) => ({
          ...store,
          coupon: "3천원", // 임시 쿠폰 데이터
          image: store.image_url || "/api/placeholder/120/120"
        })));
      }
    } catch (error) {
      console.error('Failed to load popular stores:', error);
    }
  };

  // 시간대별 추천 매장 로드
  const loadRecommendations = async () => {
    try {
      const result = await businessService.getAllBusinessesWithPagination({
        limit: 3,
        offset: 0,
        timeSlot: selectedTimeSlot !== 'all' ? selectedTimeSlot as any : undefined
      });
      
      if (result.success && result.data) {
        setRecommendedStores(result.data.map((store: any) => ({
          ...store,
          coupon: "3천원",
          image: store.image_url || "/api/placeholder/120/120"
        })));
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };

  // 무한 스크롤을 위한 추가 매장 로드
  const loadMoreStores = async (offset: number) => {
    try {
      const result = await businessService.getAllBusinessesWithPagination({
        limit: 20,
        offset,
        category: selectedCategory !== '전체' ? selectedCategory : undefined,
        search: searchQuery || undefined,
        timeSlot: selectedTimeSlot === 'all' ? undefined : selectedTimeSlot as any
      });
      
      if (result.success) {
        const newStores = result.data.map((store: any) => ({
          ...store,
          coupon: "3천원",
          image: store.image_url || "/api/placeholder/120/120"
        }));
        
        return {
          stores: newStores,
          hasMore: result.hasMore,
          total: result.total
        };
      } else {
        return {
          stores: [],
          hasMore: false,
          total: 0
        };
      }
    } catch (error) {
      console.error('Failed to load more stores:', error);
      throw error;
    }
  };

  // 처음 무한 스크롤 데이터 로드
  const reloadStores = async () => {
    setLoading(true);
    try {
      const result = await loadMoreStores(0);
      setStores(result.stores);
      setTotalStores(result.total);
    } catch (error) {
      console.error('Failed to reload stores:', error);
    } finally {
      setLoading(false);
    }
  };

  // 검색어나 선택 옵션 변경 시 재로드
  useEffect(() => {
    if (!loading) {
      reloadStores();
    }
  }, [searchQuery, selectedCategory, selectedTimeSlot]);

  const handleQRScan = async (data: string) => {
    setShowQRScanner(false);
    try {
      // Process QR code data
      if (data.startsWith('BUZZ_COUPON_')) {
        const couponId = data.replace('BUZZ_COUPON_', '');
        await couponApi.useCoupon(couponId);
        toast.success('쿠폰이 사용되었습니다!');
        
        // 실시간 알림 추가
        addNotification({
          type: 'success',
          title: '쿠폰 사용 완료',
          message: '3,000원 할인 쿠폰이 성공적으로 사용되었습니다.',
          read: false,
          icon: '🎫'
        });
      } else if (data.startsWith('BUZZ_MILEAGE_')) {
        toast.success('마일리지가 사용되었습니다!');
        
        // 실시간 알림 추가  
        addNotification({
          type: 'qr',
          title: 'QR 마일리지 사용',
          message: '1,000P가 사용되었습니다. 잔액: 11,500P',
          read: false,
          icon: '💰'
        });
      } else {
        toast.info('QR 코드 데이터: ' + data);
      }
    } catch (error) {
      toast.error('QR 코드 처리 실패');
    }
  };

  return (
    <div className="p-4 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl">🏠 홈</h1>
        </div>
        <div className="flex gap-2">
          {isLoggedIn && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowNotifications(true)}
                className="relative"
              >
                <Bell size={16} className="mr-1" />
                알림
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowCouponList(true)}
                className="relative"
              >
                <Ticket size={16} className="mr-1" />
                내 쿠폰
                {activeCoupons.length > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                  >
                    {activeCoupons.length}
                  </Badge>
                )}
              </Button>
            </>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => requireAuth(() => setShowCommunity(true), "커뮤니티 기능을 사용하려면 로그인이 필요합니다")}
          >
            <Users size={16} className="mr-1" />
            커뮤니티
          </Button>
          {isLoggedIn ? (
            <Button 
              variant="outline" 
              size="sm"
              onClick={logout}
            >
              <LogOut size={16} className="mr-1" />
              로그아웃
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowLoginPage(true)}
            >
              <LogIn size={16} className="mr-1" />
              로그인
            </Button>
          )}
        </div>
      </div>

      {/* Main Banner Carousel */}
      <div className="mb-6">
        <div className="relative h-40 rounded-xl overflow-hidden shadow-lg">
          <div 
            className="h-full flex items-center justify-center p-6"
            style={{ background: banners[currentBannerIndex].gradient }}
          >
            <div className="text-center text-white">
              <div className="text-4xl mb-3">{banners[currentBannerIndex].emoji}</div>
              <h3 className="text-xl font-bold mb-2 drop-shadow-md">
                {banners[currentBannerIndex].title}
              </h3>
              <p className="text-sm opacity-95 drop-shadow">
                {banners[currentBannerIndex].subtitle}
              </p>
            </div>
          </div>
          <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2">
            {banners.map((_, index) => (
              <button
                key={index}
                className={`rounded-full transition-all ${
                  index === currentBannerIndex 
                    ? 'w-8 h-2 bg-white shadow-md' 
                    : 'w-2 h-2 bg-white/60 hover:bg-white/80'
                }`}
                onClick={() => setCurrentBannerIndex(index)}
                aria-label={`배너 ${index + 1}`}
              />
            ))}
          </div>
          <button
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm text-white rounded-full p-2 hover:bg-white/30 transition-colors"
            onClick={() => setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length)}
            aria-label="이전 배너"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm text-white rounded-full p-2 hover:bg-white/30 transition-colors"
            onClick={() => setCurrentBannerIndex((prev) => (prev + 1) % banners.length)}
            aria-label="다음 배너"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Real-time Event Banner with Time Message */}
      <Card className="mb-6 border-orange-200 bg-orange-50">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="text-orange-500" size={20} />
              <div>
                <p className="text-sm font-medium text-orange-900">{timeMessage}</p>
                <p className="text-xs text-orange-700">
                  {currentTimeSlot ? 
                    `${timeBasedDisplayService.getTimeSlotName(currentTimeSlot as any)} 시간대 추천 매장을 확인하세요` : 
                    '24시간 운영 매장을 확인하세요'}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="text-orange-700 border-orange-300">
              보기
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Time Slot Selector and Recommendations */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Clock size={18} />
            시간대 추천
          </h2>
          <div className="flex gap-1">
            <Button
              variant={selectedTimeSlot === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeSlot('all')}
              className="text-xs px-2 py-1"
            >
              전체
            </Button>
            <Button
              variant={selectedTimeSlot === 'morning' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeSlot('morning')}
              className={`text-xs px-2 py-1 ${currentTimeSlot === 'morning' ? 'ring-2 ring-blue-400' : ''}`}
            >
              아침
            </Button>
            <Button
              variant={selectedTimeSlot === 'lunch' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeSlot('lunch')}
              className={`text-xs px-2 py-1 ${currentTimeSlot === 'lunch' ? 'ring-2 ring-blue-400' : ''}`}
            >
              점심
            </Button>
            <Button
              variant={selectedTimeSlot === 'dinner' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeSlot('dinner')}
              className={`text-xs px-2 py-1 ${currentTimeSlot === 'dinner' ? 'ring-2 ring-blue-400' : ''}`}
            >
              저녁
            </Button>
            <Button
              variant={selectedTimeSlot === 'night' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeSlot('night')}
              className={`text-xs px-2 py-1 ${currentTimeSlot === 'night' ? 'ring-2 ring-blue-400' : ''}`}
            >
              밤
            </Button>
          </div>
        </div>
        
        {/* Show selected time slot info */}
        {selectedTimeSlot && selectedTimeSlot !== 'all' && (
          <div className="text-sm text-gray-600 mb-3">
            {selectedTimeSlot === currentTimeSlot ? (
              <span className="text-blue-600 font-medium">🔵 현재 시간대</span>
            ) : (
              <span>{timeBasedDisplayService.getTimeSlotName(selectedTimeSlot as any)} 시간대 매장</span>
            )}
          </div>
        )}
        
        {recommendedStores.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {recommendedStores.slice(0, 3).map((store) => (
              <Card 
                key={store.id} 
                className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedStore(store)}
              >
                <div className="text-center">
                  <div className="w-full h-16 bg-gray-200 rounded mb-2 flex items-center justify-center">
                    <span className="text-xs text-gray-500">이미지</span>
                  </div>
                  <p className="text-xs font-medium truncate">{store.name}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Star size={10} className="text-yellow-500 fill-current" />
                    <span className="text-xs">{store.rating || 4.0}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 text-sm">
            {selectedTimeSlot && selectedTimeSlot !== 'all' 
              ? `${timeBasedDisplayService.getTimeSlotName(selectedTimeSlot as any)} 시간대에 운영하는 매장이 없습니다`
              : '추천 매장이 없습니다'}
          </div>
        )}
      </div>

      {/* Popular Stores Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2">
            ⭐ 인기 매장
          </h2>
        </div>
        
        {popularStores.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {popularStores.map((store) => (
              <div 
                key={store.id}
                className="bg-white rounded-lg border p-3 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedStore(store)}
              >
                <div className="w-full h-20 bg-gray-200 rounded-md mb-2 flex items-center justify-center overflow-hidden">
                  {store.image_url ? (
                    <img 
                      src={store.image_url} 
                      alt={store.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-xs text-gray-500">매장 이미지</span>
                  )}
                </div>
                <div className="text-sm font-medium mb-1 truncate" title={store.name}>
                  {store.name}
                </div>
                <div className="flex items-center gap-1 mb-2">
                  <Star size={12} className="text-yellow-500 fill-current" />
                  <span className="text-xs">{store.rating || 4.0}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  🎫 {store.coupon || '할인'}
                </Badge>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <StoreSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categories={categories}
          selectedTimeSlot={selectedTimeSlot}
          onTimeSlotChange={setSelectedTimeSlot}
          totalStores={totalStores}
        />
      </div>

      {/* All Stores - Infinite Scroll */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2">
            🏪 모든 매장
          </h2>
        </div>
        
        <InfiniteStoreList
          initialStores={stores}
          loadMore={loadMoreStores}
          onStoreSelect={setSelectedStore}
          onReviewClick={(store) => requireAuth(() => {
            setSelectedStoreForReview(store);
            setShowWriteReview(true);
          }, "리뷰를 작성하려면 로그인이 필요합니다")}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          selectedTimeSlot={selectedTimeSlot}
        />
      </div>


      {/* Community Modal */}
      {showCommunity && (
        <CommunityModal onClose={() => setShowCommunity(false)} />
      )}

      {/* Store Detail Modal */}
      {selectedStore && (
        <StoreDetailModal 
          store={selectedStore} 
          onClose={() => setSelectedStore(null)} 
        />
      )}

      {/* QR Scanner */}
      {showQRScanner && (
        <QRScanner 
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      )}

      {/* Coupon List Modal */}
      <Dialog open={showCouponList} onOpenChange={setShowCouponList}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="text-primary" size={20} />
              내 쿠폰 목록 ({activeCoupons.length}개)
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            {activeCoupons.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Ticket size={48} className="mx-auto mb-3 text-gray-300" />
                <p>사용 가능한 쿠폰이 없습니다</p>
                <Button variant="link" className="mt-2">
                  이벤트 확인하기
                </Button>
              </div>
            ) : (
              activeCoupons.map(coupon => {
                const daysLeft = getDaysUntilExpiry(coupon);
                const expiring = isExpiringSoon(coupon);
                
                return (
                  <Card 
                    key={coupon.id} 
                    className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
                    onClick={async () => {
                      setSelectedCoupon(coupon);
                      const qrData = `BUZZ_COUPON_${coupon.id}_${Date.now()}`;
                      try {
                        const qrUrl = await QRCode.toDataURL(qrData, {
                          width: 200,
                          margin: 1,
                          color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                          }
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
                          <h4 className="font-medium">{coupon.name}</h4>
                          <p className="text-xs text-gray-500 mt-1">{coupon.description}</p>
                        </div>
                        {expiring && (
                          <Badge variant="destructive" className="text-xs animate-pulse">
                            D-{daysLeft}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="font-bold">
                          {formatDiscountText(coupon)}
                        </Badge>
                        {coupon.minPurchaseAmount && (
                          <span className="text-xs text-gray-500">
                            최소 {coupon.minPurchaseAmount.toLocaleString()}원
                          </span>
                        )}
                      </div>
                      
                      {coupon.businessNames && (
                        <div className="flex items-center gap-1 text-xs text-blue-600">
                          <Store size={12} />
                          <span className="font-medium">{coupon.businessNames.join(', ')}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                        <Clock size={12} />
                        <span>~{new Date(coupon.validUntil).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Coupon QR Modal */}
      {showCouponQR && selectedCoupon && (
        <Dialog open={showCouponQR} onOpenChange={(open) => {
          setShowCouponQR(open);
          if (!open) {
            setSelectedCoupon(null);
            setCouponQRUrl("");
          }
        }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-center">
                {selectedCoupon.name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="text-center space-y-4">
              <div className="relative">
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
                {isExpiringSoon(selectedCoupon) && (
                  <Badge variant="destructive" className="absolute top-2 right-2">
                    D-{getDaysUntilExpiry(selectedCoupon)}
                  </Badge>
                )}
              </div>
              
              <div className="space-y-3">
                <Badge variant="secondary" className="text-lg font-bold">
                  {formatDiscountText(selectedCoupon)}
                </Badge>
                
                <p className="text-sm text-gray-600">{selectedCoupon.description}</p>
                
                <div className="space-y-2 text-sm">
                  {selectedCoupon.minPurchaseAmount && (
                    <div className="flex justify-between text-gray-500">
                      <span>최소 주문:</span>
                      <span className="font-medium">{selectedCoupon.minPurchaseAmount.toLocaleString()}원</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-gray-500">
                    <span>유효기간:</span>
                    <span className="font-medium">~{new Date(selectedCoupon.validUntil).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>
                
                {selectedCoupon.businessNames && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium mb-1">사용 가능 매장</p>
                    <p className="text-sm text-blue-700 font-bold">
                      {selectedCoupon.businessNames.join(', ')}
                    </p>
                  </div>
                )}
                
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    💡 매장에서 이 QR코드를 보여주세요
                  </p>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCouponQR(false);
                  setShowCouponList(true);
                }}
                className="w-full"
              >
                쿠폰 목록으로 돌아가기
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Write Review Modal */}
      {showWriteReview && selectedStoreForReview && (
        <WriteReviewModal
          isOpen={showWriteReview}
          onClose={() => {
            setShowWriteReview(false);
            setSelectedStoreForReview(null);
          }}
          businessName={selectedStoreForReview.name}
          onSubmit={(reviewData) => {
            console.log('리뷰 제출:', reviewData);
            toast.success(`${selectedStoreForReview.name}에 대한 리뷰가 작성되었습니다!`);
            
            // 실시간 알림 추가
            addNotification({
              type: 'review',
              title: '리뷰 작성 완료!',
              message: `${selectedStoreForReview.name}에 대한 리뷰가 성공적으로 작성되었습니다. 50P가 적립됩니다.`,
              read: false,
              icon: '⭐'
            });
          }}
        />
      )}

      {/* Notification Center */}
      {showNotifications && (
        <NotificationCenter
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
        />
      )}

      {/* Login Prompt Modal */}
      <LoginPromptModal
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        onLogin={() => {
          setShowLoginPrompt(false);
          setShowLoginPage(true);
        }}
        message={loginPromptMessage}
      />

      {/* Login Page Modal */}
      {showLoginPage && (
        <div className="fixed inset-0 z-50 bg-white">
          <LoginPage 
            onLogin={() => {
              setShowLoginPage(false);
              window.location.reload(); // Reload to update auth state
            }}
            onClose={() => setShowLoginPage(false)}
            showCloseButton={true}
          />
        </div>
      )}
    </div>
  );
}