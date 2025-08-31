import { useState, useEffect } from "react";
import { Copy, Share, BarChart3, BookOpen, Trophy, Eye, Users, DollarSign, TrendingUp, Play, Award, Star, Gift } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Progress } from "./ui/progress";
import PerformanceModal from "./PerformanceModal";
import ReferralSystem from "./ReferralSystem";
import RewardSelector from "./RewardSelector";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

export default function MarketerPage() {
  const [showPerformance, setShowPerformance] = useState(false);
  const [showEducation, setShowEducation] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [showReferralSystem, setShowReferralSystem] = useState(false);
  const [showRewardSelector, setShowRewardSelector] = useState(false);
  const [copied, setCopied] = useState(false);
  const [referralData, setReferralData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();

  const referralLink = referralData?.shareUrl || "https://buzz.app/invite/loading...";

  // Load referral data on component mount
  useEffect(() => {
    if (user) {
      loadReferralData();
    }
  }, [user]);

  const loadReferralData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/referral/code', {
        headers: {
          'Authorization': `Bearer ${user?.token || ''}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReferralData(data);
        console.log('Referral data loaded:', data);
      } else {
        console.error('Failed to load referral data:', response.status);
        // Fallback data for development
        setReferralData({
          referralCode: 'BUZZ-DEV123',
          shareUrl: 'https://buzz.app/invite/BUZZ-DEV123',
          qrCodeUrl: '/api/referral/qr/BUZZ-DEV123',
          stats: {
            totalReferrals: 0,
            monthlyReferrals: 0,
            totalMileageEarned: 0,
          },
          tier: 'bronze',
          rewards: {
            recommenderReward: 500,
            refereeReward: 3000,
          }
        });
      }
    } catch (error) {
      console.error('Error loading referral data:', error);
      toast.error('리퍼럴 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('링크가 클립보드에 복사되었습니다!');
    } catch (err) {
      console.error('복사 실패:', err);
      toast.error('링크 복사에 실패했습니다.');
    }
  };

  const shareToKakao = () => {
    const message = `🎉 BUZZ에서 특별 혜택을 받아보세요!\n\n친구를 초대하면 둘 다 포인트 적립!\n${referralLink}`;
    const kakaoUrl = `https://story.kakao.com/share?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`;
    window.open(kakaoUrl, '_blank');
    toast.success('카카오톡 공유 창이 열렸습니다!');
  };

  const shareToThreads = () => {
    const message = `🎉 BUZZ 리퍼럴로 특별 혜택 받으세요! ${referralLink}`;
    const threadsUrl = `https://www.threads.net/intent/post?text=${encodeURIComponent(message)}`;
    window.open(threadsUrl, '_blank');
    toast.success('Threads 공유 창이 열렸습니다!');
  };

  const shareToBlog = () => {
    const title = '🎉 BUZZ 리퍼럴 혜택 안내';
    const content = `안녕하세요! BUZZ 앱을 소개해드리려고 합니다.\n\n이 링크를 통해 가입하시면 특별 혜택을 받으실 수 있어요!\n\n${referralLink}\n\n함께 BUZZ를 즐겨보아요! 🚀`;
    
    // 네이버 블로그 공유
    const naverBlogUrl = `https://blog.naver.com/PostWriteForm.nhn?title=${encodeURIComponent(title)}&content=${encodeURIComponent(content)}`;
    window.open(naverBlogUrl, '_blank');
    toast.success('블로그 작성 창이 열렸습니다!');
  };

  const shareToYoutube = () => {
    toast.info('유튜브 영상 설명란에 리퍼럴 링크를 추가해보세요!');
    handleCopyLink(); // 링크 복사도 함께 실행
  };

  const shareButtons = [
    { 
      icon: "💬", 
      label: "카카오톡", 
      color: "bg-yellow-400 text-black",
      action: () => shareToKakao()
    },
    { 
      icon: "🧵", 
      label: "쓰레드", 
      color: "bg-black text-white",
      action: () => shareToThreads()
    },
    { 
      icon: "📝", 
      label: "블로그", 
      color: "bg-orange-500 text-white",
      action: () => shareToBlog()
    },
    { 
      icon: "📹", 
      label: "유튜브", 
      color: "bg-red-600 text-white",
      action: () => shareToYoutube()
    },
  ];

  const performanceData = referralData ? {
    visitors: referralData.stats?.totalReferrals || 0,
    signups: referralData.stats?.monthlyReferrals || 0, 
    revenue: referralData.stats?.totalMileageEarned || 0,
    conversionRate: referralData.stats?.totalReferrals > 0 ? 
      (referralData.stats?.monthlyReferrals / referralData.stats?.totalReferrals * 100) : 0,
    rank: referralData.rank || 999
  } : {
    visitors: 0,
    signups: 0,
    revenue: 0,
    conversionRate: 0,
    rank: 999
  };

  return (
    <div className="p-4 pb-20">
      {/* Header */}
      <div className="mb-6">
        <h1 className="flex items-center gap-2">
          🎓 마케터
        </h1>
      </div>

      {/* Referral System Button */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-4 mb-6 text-white">
        <h2 className="flex items-center gap-2 mb-2 text-blue-600">
          🚀 리퍼럴 시스템
        </h2>
        <p className="text-sm mb-3 text-blue-600">친구를 초대하고 보상을 받으세요!</p>
        <Button 
          variant="secondary"
          className="w-full"
          onClick={() => setShowReferralSystem(true)}
        >
          <Share size={16} className="mr-2" />
          리퍼럴 대시보드 열기
        </Button>
      </div>

      {/* Referral Link */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <h2 className="flex items-center gap-2 mb-3">
          🔗 내 리퍼럴 링크
          {loading ? (
            <div className="w-12 h-5 bg-gray-200 rounded animate-pulse"></div>
          ) : referralData && (
            <Badge variant="outline" className="text-xs capitalize">
              {referralData.tier}
            </Badge>
          )}
        </h2>
        <div className="flex gap-2">
          <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-sm font-mono border">
            {loading ? (
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              referralLink
            )}
          </div>
          <Button 
            size="sm" 
            onClick={handleCopyLink}
            className={copied ? "bg-green-600 hover:bg-green-700" : ""}
            disabled={loading}
          >
            <Copy size={16} className="mr-1" />
            {copied ? "복사됨!" : "복사"}
          </Button>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <h2 className="flex items-center gap-2 mb-3">
          📤 공유하기
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {shareButtons.map((button, index) => (
            <Button
              key={index}
              variant="outline"
              className={`flex items-center justify-center gap-2 h-12 ${button.color} border-0 hover:scale-105 transition-transform`}
              onClick={button.action}
              disabled={loading}
            >
              <span className="text-lg">{button.icon}</span>
              <span className="font-semibold">{button.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Performance Overview */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <h2 className="flex items-center gap-2 mb-4">
          📊 내 성과
        </h2>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Eye size={16} className="text-blue-600" />
              <span className="text-sm text-gray-600">방문</span>
            </div>
            {loading ? (
              <div className="h-6 w-8 bg-gray-200 rounded animate-pulse mx-auto"></div>
            ) : (
              <div className="font-medium">{performanceData.visitors}명</div>
            )}
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users size={16} className="text-green-600" />
              <span className="text-sm text-gray-600">가입</span>
            </div>
            {loading ? (
              <div className="h-6 w-8 bg-gray-200 rounded animate-pulse mx-auto"></div>
            ) : (
              <div className="font-medium">{performanceData.signups}명</div>
            )}
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <DollarSign size={16} className="text-purple-600" />
              <span className="text-sm text-gray-600">수익</span>
            </div>
            {loading ? (
              <div className="h-6 w-12 bg-gray-200 rounded animate-pulse mx-auto"></div>
            ) : (
              <div className="font-medium">{performanceData.revenue.toLocaleString()}원</div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-orange-600" />
            {loading ? (
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              <span className="text-sm">전환율 {performanceData.conversionRate.toFixed(1)}%</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Trophy size={16} className="text-yellow-600" />
            {loading ? (
              <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              <span className="text-sm">순위 #{performanceData.rank}</span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            className="flex-1" 
            variant="outline"
            onClick={() => setShowPerformance(true)}
          >
            <BarChart3 size={16} className="mr-2" />
            상세 보기
          </Button>
          <Button 
            className="flex-1" 
            variant="default"
            onClick={() => setShowRewardSelector(true)}
            disabled={loading}
          >
            <Gift size={16} className="mr-2" />
            리워드 받기
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          className="h-12"
          onClick={() => setShowEducation(true)}
        >
          <BookOpen size={16} className="mr-2" />
          마케팅 공부하기
        </Button>
        <Button 
          variant="outline" 
          className="h-12"
          onClick={() => setShowRanking(true)}
        >
          <Trophy size={16} className="mr-2" />
          랭킹보기
        </Button>
      </div>

      {/* Tips Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <div className="flex items-start gap-3">
          <span className="text-blue-600 text-xl">💡</span>
          <div>
            <h3 className="font-medium text-blue-800 mb-1">마케팅 팁!</h3>
            <p className="text-sm text-blue-700 leading-relaxed">
              SNS에 매장 후기와 함께 리퍼럴 링크를 공유하면 전환율이 높아집니다. 
              특히 인스타그램 스토리나 블로그 포스팅을 활용해보세요.
            </p>
          </div>
        </div>
      </div>

      {/* Performance Modal */}
      {showPerformance && (
        <PerformanceModal 
          data={performanceData}
          onClose={() => setShowPerformance(false)} 
        />
      )}

      {/* Education Modal */}
      {showEducation && (
        <Dialog open={showEducation} onOpenChange={setShowEducation}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                📚 마케팅 교육
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Progress */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">학습 진도</span>
                  <span className="text-sm text-blue-600">3/8 완료</span>
                </div>
                <Progress value={37.5} className="mb-2" />
                <p className="text-sm text-blue-700">곧 중급 과정이 열립니다! 🎉</p>
              </div>

              {/* Course List */}
              <div className="space-y-3">
                <h4 className="font-medium">📖 기초 과정</h4>
                
                {[
                  { title: "리퍼럴 마케팅 기초", completed: true, duration: "10분" },
                  { title: "SNS 활용 전략", completed: true, duration: "15분" },
                  { title: "컨텐츠 제작 가이드", completed: true, duration: "20분" },
                  { title: "타겟 오디언스 분석", completed: false, duration: "12분" },
                ].map((course, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      course.completed 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {course.completed ? '✓' : <Play size={14} />}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{course.title}</div>
                      <div className="text-xs text-gray-500">{course.duration}</div>
                    </div>
                    <Button size="sm" variant={course.completed ? "outline" : "default"}>
                      {course.completed ? "복습" : "학습"}
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  🏆 중급 과정
                  <Badge variant="outline" className="text-xs">곧 오픈</Badge>
                </h4>
                
                {[
                  { title: "고급 분석 도구 활용", locked: true, duration: "25분" },
                  { title: "A/B 테스트 실전", locked: true, duration: "30분" },
                ].map((course, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg opacity-50">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      🔒
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{course.title}</div>
                      <div className="text-xs text-gray-500">{course.duration}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600">🎯</span>
                  <div>
                    <h5 className="font-medium text-yellow-800 text-sm">오늘의 미션</h5>
                    <p className="text-xs text-yellow-700 mt-1">
                      "타겟 오디언스 분석" 강의를 수강하고 3,000P를 받아보세요!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Referral System Modal */}
      {showReferralSystem && (
        <Dialog open={showReferralSystem} onOpenChange={setShowReferralSystem}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto p-0">
            <DialogHeader className="p-4 pb-0">
              <DialogTitle className="flex items-center gap-2">
                🚀 리퍼럴 시스템
              </DialogTitle>
            </DialogHeader>
            <ReferralSystem />
          </DialogContent>
        </Dialog>
      )}

      {/* Reward Selector Modal */}
      {showRewardSelector && (
        <RewardSelector 
          open={showRewardSelector}
          onClose={() => setShowRewardSelector(false)}
          onRewardClaimed={() => {
            loadReferralData(); // Reload data after claiming reward
          }}
        />
      )}

      {/* Ranking Modal */}
      {showRanking && (
        <Dialog open={showRanking} onOpenChange={setShowRanking}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                🏆 마케터 랭킹
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* My Ranking */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">내 순위</div>
                    <div className="text-2xl font-bold text-blue-600">#{performanceData.rank}</div>
                    <div className="text-sm text-gray-600">상위 15%</div>
                  </div>
                  <div className="text-4xl">🎯</div>
                </div>
              </div>

              {/* Top Marketers */}
              <div>
                <h4 className="font-medium mb-3">🥇 상위 마케터</h4>
                <div className="space-y-2">
                  {[
                    { rank: 1, name: "김○○", points: 45000, badge: "🥇" },
                    { rank: 2, name: "이○○", points: 42300, badge: "🥈" },
                    { rank: 3, name: "박○○", points: 38900, badge: "🥉" },
                    { rank: 4, name: "최○○", points: 35600, badge: "⭐" },
                    { rank: 5, name: "정○○", points: 33200, badge: "⭐" },
                  ].map((marketer, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 text-center">
                        <span className="text-lg">{marketer.badge}</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{marketer.name}</div>
                        <div className="text-xs text-gray-500">{marketer.points.toLocaleString()}점</div>
                      </div>
                      <div className="text-sm text-gray-600">#{marketer.rank}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ranking Categories */}
              <div>
                <h4 className="font-medium mb-3">📊 카테고리별 순위</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <div className="font-medium text-green-800">#8</div>
                    <div className="text-sm text-green-600">신규 가입</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <div className="font-medium text-blue-800">#15</div>
                    <div className="text-sm text-blue-600">전환율</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <div className="font-medium text-purple-800">#12</div>
                    <div className="text-sm text-purple-600">수익</div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg text-center">
                    <div className="font-medium text-orange-800">#6</div>
                    <div className="text-sm text-orange-600">활동량</div>
                  </div>
                </div>
              </div>

              {/* Rewards */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600">🏅</span>
                  <div>
                    <h5 className="font-medium text-yellow-800 text-sm">이번 달 보상</h5>
                    <p className="text-xs text-yellow-700 mt-1">
                      TOP 10 진입시 특별 보상! 현재 2단계 상승하면 달성 가능합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}