import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { DollarSign, Ticket, TrendingUp, Gift, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

interface RewardSelectorProps {
  open: boolean;
  onClose: () => void;
  onRewardClaimed?: () => void;
}

export default function RewardSelector({ open, onClose, onRewardClaimed }: RewardSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [availableRewards, setAvailableRewards] = useState<any>(null);
  const [selectedReward, setSelectedReward] = useState<'mileage' | 'discount_qr'>('mileage');
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      loadAvailableRewards();
    }
  }, [open]);

  const loadAvailableRewards = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/referral/available-rewards', {
        headers: {
          'Authorization': `Bearer ${user?.token || ''}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableRewards(data.data);
      } else {
        toast.error('리워드 정보를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Error loading rewards:', error);
      toast.error('리워드 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async () => {
    if (!availableRewards?.unclaimedReferrals) {
      toast.error('받을 수 있는 리워드가 없습니다.');
      return;
    }

    try {
      setClaiming(true);
      const response = await fetch('/api/referral/claim-reward', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rewardType: selectedReward,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (selectedReward === 'mileage') {
          toast.success(`🎉 ${data.data.amount.toLocaleString()}P가 적립되었습니다!`);
        } else {
          toast.success(`🎫 ${data.data.discountPercentage}% 할인 QR코드가 생성되었습니다!`);
          // Show QR code in a new modal or download
          showDiscountQR(data.data);
        }
        
        onRewardClaimed?.();
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.message || '리워드 수령에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast.error('리워드 수령에 실패했습니다.');
    } finally {
      setClaiming(false);
    }
  };

  const showDiscountQR = (qrData: any) => {
    // Open new window or modal to show QR code
    const qrWindow = window.open('', '_blank', 'width=400,height=500');
    if (qrWindow) {
      qrWindow.document.write(`
        <html>
          <head>
            <title>BUZZ 할인 QR코드</title>
            <style>
              body { 
                font-family: sans-serif; 
                text-align: center; 
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .qr-container {
                background: white;
                border-radius: 20px;
                padding: 30px;
                margin: 20px auto;
                max-width: 350px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.2);
              }
              .discount-badge {
                background: #10b981;
                color: white;
                padding: 10px 20px;
                border-radius: 50px;
                font-size: 24px;
                font-weight: bold;
                display: inline-block;
                margin: 20px 0;
              }
              .code {
                font-family: monospace;
                font-size: 18px;
                color: #333;
                background: #f3f4f6;
                padding: 10px;
                border-radius: 8px;
                margin: 10px 0;
              }
              .valid-until {
                color: #666;
                font-size: 14px;
                margin-top: 20px;
              }
              .qr-placeholder {
                width: 200px;
                height: 200px;
                background: #f0f0f0;
                margin: 20px auto;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px dashed #ccc;
                border-radius: 10px;
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <h2 style="color: #333; margin-top: 0;">🎉 BUZZ 할인 쿠폰</h2>
              <div class="discount-badge">${qrData.discountPercentage}% 할인</div>
              <div class="qr-placeholder">
                <div style="color: #999;">QR Code<br>${qrData.code}</div>
              </div>
              <div class="code">${qrData.code}</div>
              <div class="valid-until">
                유효기간: ${new Date(qrData.validUntil).toLocaleDateString('ko-KR')}까지
              </div>
              <p style="color: #666; font-size: 12px; margin-top: 20px;">
                이 QR코드를 매장에서 제시하시면<br>할인을 받으실 수 있습니다.
              </p>
            </div>
          </body>
        </html>
      `);
    }
  };

  if (!availableRewards) {
    return null;
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'gold': return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
      case 'silver': return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
      default: return 'bg-gradient-to-r from-orange-400 to-red-500 text-white';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="text-purple-600" />
            리워드 선택
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-40 bg-gray-200 rounded animate-pulse" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current Status */}
            <Card className={`${getTierColor(availableRewards.tier)} border-0`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm opacity-90">현재 등급</div>
                    <div className="text-2xl font-bold capitalize">{availableRewards.tier}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm opacity-90">미수령 리퍼럴</div>
                    <div className="text-3xl font-bold">{availableRewards.unclaimedReferrals}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {availableRewards.unclaimedReferrals > 0 ? (
              <>
                {/* Reward Selection Tabs */}
                <Tabs value={selectedReward} onValueChange={(v) => setSelectedReward(v as any)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="mileage">
                      <DollarSign size={16} className="mr-2" />
                      마일리지
                    </TabsTrigger>
                    <TabsTrigger value="discount_qr">
                      <Ticket size={16} className="mr-2" />
                      할인 QR
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="mileage" className="space-y-3">
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                          <DollarSign className="text-green-600" size={20} />
                          마일리지 적립
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">기본 적립</span>
                            <span className="font-medium">
                              {availableRewards.unclaimedReferrals} × 500P
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">등급 보너스</span>
                            <span className="font-medium text-green-600">
                              +{availableRewards.availableRewards.mileage.tierBonus}
                            </span>
                          </div>
                          <div className="border-t pt-2 flex justify-between">
                            <span className="font-medium">총 적립 예정</span>
                            <span className="text-xl font-bold text-green-600">
                              {availableRewards.availableRewards.mileage.amount.toLocaleString()}P
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <TrendingUp className="text-blue-600 mt-0.5" size={16} />
                        <div className="text-sm text-blue-800">
                          마일리지는 즉시 적립되며, BUZZ 앱 내 모든 서비스에서 사용 가능합니다.
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="discount_qr" className="space-y-3">
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                          <Ticket className="text-purple-600" size={20} />
                          할인 QR코드
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">추천 인원</span>
                            <span className="font-medium">
                              {availableRewards.unclaimedReferrals}명
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">할인율</span>
                            <span className="text-xl font-bold text-purple-600">
                              {availableRewards.availableRewards.discountQR.discountPercentage}% 할인
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">유효기간</span>
                            <span className="font-medium">30일</span>
                          </div>
                        </div>

                        {/* Discount Tier Info */}
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs text-gray-500 space-y-1">
                            <div>• 3명 이상: 15% 할인</div>
                            <div>• 5명 이상: 20% 할인</div>
                            <div>• 10명 이상: 30% 할인</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {availableRewards.availableRewards.discountQR.minimumReferrals > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="text-yellow-600 mt-0.5" size={16} />
                          <div className="text-sm text-yellow-800">
                            더 높은 할인율을 받으려면 {availableRewards.availableRewards.discountQR.minimumReferrals}명을 더 추천해주세요!
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Ticket className="text-purple-600 mt-0.5" size={16} />
                        <div className="text-sm text-purple-800">
                          QR코드는 제휴 매장에서 사용 가능하며, 1회 사용 후 소멸됩니다.
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Active Discount Codes */}
                {availableRewards.activeDiscounts?.length > 0 && (
                  <Card className="bg-gray-50">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Clock size={16} />
                        보유 중인 할인 코드
                      </h4>
                      <div className="space-y-2">
                        {availableRewards.activeDiscounts.map((discount: any, index: number) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="font-mono">{discount.code}</span>
                            <Badge variant="secondary">
                              {discount.discount_percentage}% (~{new Date(discount.valid_until).toLocaleDateString()})
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Claim Button */}
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={claimReward}
                  disabled={claiming || availableRewards.unclaimedReferrals === 0}
                >
                  {claiming ? (
                    '처리 중...'
                  ) : selectedReward === 'mileage' ? (
                    `${availableRewards.availableRewards.mileage.amount.toLocaleString()}P 받기`
                  ) : (
                    `${availableRewards.availableRewards.discountQR.discountPercentage}% 할인 QR 받기`
                  )}
                </Button>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <Gift size={48} className="mx-auto" />
                </div>
                <h3 className="font-medium mb-2">받을 수 있는 리워드가 없습니다</h3>
                <p className="text-sm text-gray-600">
                  친구를 추천하면 리워드를 받을 수 있습니다!
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}