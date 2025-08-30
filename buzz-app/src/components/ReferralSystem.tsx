import { useState, useEffect } from 'react';
import { Share2, Copy, Users, TrendingUp, Gift, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { userApi } from '../services/api.service';

interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  rank: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  tierBenefits?: {
    rewardBonus: number;
    couponsPerMonth: number;
  };
}

export default function ReferralSystem() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      setLoading(true);
      const [statsResponse, linkResponse] = await Promise.all([
        userApi.getReferralStats(),
        userApi.getReferralLink()
      ]);

      if (statsResponse.success) {
        // 백엔드 응답 구조에 맞게 수정
        const referralData: ReferralStats = {
          referralCode: statsResponse.data.referralCode || 'BUZZ-123456',
          totalReferrals: statsResponse.data.totalReferrals || 0,
          activeReferrals: statsResponse.data.activeReferrals || 0,
          totalEarnings: statsResponse.data.totalEarnings || 0,
          pendingEarnings: statsResponse.data.pendingRewards || 0,
          rank: statsResponse.data.currentRank || 0,
          tier: calculateTier(statsResponse.data.totalReferrals || 0),
          tierBenefits: undefined
        };
        setStats(referralData);
        setShareUrl(linkResponse.success ? linkResponse.data.shareUrl : `https://buzz.app/join?ref=${referralData.referralCode}`);
      }
    } catch (error) {
      // Use mock data if API fails
      const mockStats: ReferralStats = {
        referralCode: 'BUZZ-123456',
        totalReferrals: 12,
        activeReferrals: 8,
        totalEarnings: 45000,
        pendingEarnings: 5000,
        rank: 15,
        tier: 'silver'
      };
      setStats(mockStats);
      setShareUrl(`https://buzz.app/join?ref=${mockStats.referralCode}`);
    } finally {
      setLoading(false);
    }
  };

  // 리퍼럴 수에 따른 티어 계산
  const calculateTier = (totalReferrals: number): 'bronze' | 'silver' | 'gold' | 'platinum' => {
    if (totalReferrals >= 50) return 'platinum';
    if (totalReferrals >= 25) return 'gold';
    if (totalReferrals >= 10) return 'silver';
    return 'bronze';
  };

  const copyReferralCode = () => {
    if (stats?.referralCode) {
      navigator.clipboard.writeText(stats.referralCode);
      setCopied(true);
      toast.success('리퍼럴 코드가 복사되었습니다!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareReferralLink = async (platform: string) => {
    try {
      const link = shareUrl;
      
      switch (platform) {
        case 'kakao':
          window.open(`https://story.kakao.com/share?url=${encodeURIComponent(link)}`);
          break;
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`);
          break;
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}&text=BUZZ 앱을 사용해보세요!`);
          break;
        case 'copy':
          navigator.clipboard.writeText(link);
          toast.success('링크가 복사되었습니다!');
          break;
        default:
          if (navigator.share) {
            await navigator.share({
              title: 'BUZZ 리퍼럴',
              text: 'BUZZ 앱을 사용해보세요!',
              url: link
            });
          }
      }
      
      // Track referral share (실제 구현시 백엔드에 추적 API 추가)
      console.log('Referral shared:', { code: stats?.referralCode, platform, action: 'share' });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'bg-orange-500';
      case 'silver': return 'bg-gray-400';
      case 'gold': return 'bg-yellow-500';
      case 'platinum': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getTierBenefits = (tier: string, tierBenefits?: any) => {
    // 백엔드에서 받은 tierBenefits가 있으면 사용, 없으면 기본값
    if (tierBenefits) {
      const { rewardBonus, couponsPerMonth } = tierBenefits;
      if (couponsPerMonth === -1) {
        return `${rewardBonus}% 리워드 + 무제한 쿠폰`;
      } else if (couponsPerMonth > 0) {
        return `${rewardBonus}% 리워드 + 월 ${couponsPerMonth}회 쿠폰`;
      } else {
        return `기본 ${rewardBonus}% 리워드`;
      }
    }
    
    // Fallback to static values
    switch (tier) {
      case 'bronze': return '기본 5% 리워드';
      case 'silver': return '10% 리워드 + 월 1회 쿠폰';
      case 'gold': return '15% 리워드 + 월 3회 쿠폰';
      case 'platinum': return '20% 리워드 + 무제한 쿠폰';
      default: return '리워드 없음';
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-48 bg-gray-200 rounded-lg"></div>
          <div className="h-24 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Referral Code Card */}
      <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>나의 리퍼럴 코드</span>
            <Badge className={`${getTierColor(stats?.tier || 'bronze')} text-white`}>
              {stats?.tier?.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="text-2xl font-bold font-mono">{stats?.referralCode}</div>
            <Button
              variant="secondary"
              size="icon"
              onClick={copyReferralCode}
              className="bg-white/20 hover:bg-white/30 text-white"
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </Button>
          </div>
          <p className="text-sm opacity-90">{getTierBenefits(stats?.tier || 'bronze', stats?.tierBenefits)}</p>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={20} className="text-blue-500" />
              <span className="text-sm text-gray-600">총 리퍼럴</span>
            </div>
            <div className="text-2xl font-bold">{stats?.totalReferrals}</div>
            <div className="text-xs text-gray-500">활성: {stats?.activeReferrals}명</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={20} className="text-green-500" />
              <span className="text-sm text-gray-600">총 수익</span>
            </div>
            <div className="text-2xl font-bold">{stats?.totalEarnings?.toLocaleString()}원</div>
            <div className="text-xs text-gray-500">대기: {stats?.pendingEarnings?.toLocaleString()}원</div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Gift size={20} className="text-purple-500" />
              <span className="text-sm text-gray-600">이번 달 순위</span>
            </div>
            <Badge variant="outline">TOP {stats?.rank}</Badge>
          </div>
          <div className="bg-gray-100 rounded-full h-2 mb-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
              style={{ width: `${Math.min(100, (100 - (stats?.rank || 100)) * 2)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            상위 {Math.min(100, (stats?.rank || 100))}% 달성 중
          </p>
        </CardContent>
      </Card>

      {/* Share Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Share2 size={20} />
            친구 초대하기
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => shareReferralLink('kakao')}
              className="bg-yellow-50 hover:bg-yellow-100"
            >
              카카오톡
            </Button>
            <Button
              variant="outline"
              onClick={() => shareReferralLink('copy')}
            >
              링크 복사
            </Button>
            <Button
              variant="outline"
              onClick={() => shareReferralLink('facebook')}
              className="bg-blue-50 hover:bg-blue-100"
            >
              페이스북
            </Button>
            <Button
              variant="outline"
              onClick={() => shareReferralLink('twitter')}
              className="bg-sky-50 hover:bg-sky-100"
            >
              트위터
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Benefits Info */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-2">리퍼럴 혜택</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>• 친구 가입 시 5,000원 즉시 적립</li>
            <li>• 친구 첫 구매 시 구매금액의 10% 적립</li>
            <li>• 월간 리퍼럴 10명 달성 시 보너스 20,000원</li>
            <li>• 티어 업그레이드로 더 많은 혜택 획득</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}