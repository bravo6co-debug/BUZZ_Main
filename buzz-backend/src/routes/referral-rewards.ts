import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import QRCode from 'qrcode';
import { authenticateUser } from '../middleware/auth';

const router = Router();

// Get available rewards for user
router.get('/available-rewards', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    // Get user's referral stats
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('referral_count, total_referrals, reward_claimed, reward_type')
      .eq('user_id', userId)
      .single();

    if (profileError) throw profileError;

    // Calculate unclaimed referrals
    const unclaimedReferrals = (profile?.total_referrals || 0) - (profile?.referral_count || 0);

    // Get user's tier
    const tier = getTierFromReferrals(profile?.total_referrals || 0);

    // Get active discount codes
    const { data: activeDiscounts } = await supabase
      .from('discount_codes')
      .select('code, discount_percentage, valid_until')
      .eq('user_id', userId)
      .eq('is_used', false)
      .gte('valid_until', new Date().toISOString());

    // Calculate available rewards
    const availableRewards = {
      mileage: calculateMileageReward(unclaimedReferrals, tier),
      discountQR: calculateDiscountReward(unclaimedReferrals)
    };

    res.json({
      success: true,
      data: {
        unclaimedReferrals,
        tier,
        availableRewards,
        activeDiscounts: activeDiscounts || [],
        lastClaimedAt: profile?.reward_claimed_at
      }
    });
  } catch (error) {
    console.error('Error fetching available rewards:', error);
    res.status(500).json({ 
      success: false, 
      message: '리워드 정보를 불러오는데 실패했습니다.' 
    });
  }
});

// Claim reward
router.post('/claim-reward', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { rewardType } = req.body;

    // Get user's current stats
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('referral_count, total_referrals')
      .eq('user_id', userId)
      .single();

    if (profileError) throw profileError;

    const unclaimedReferrals = (profile?.total_referrals || 0) - (profile?.referral_count || 0);

    if (unclaimedReferrals <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: '받을 수 있는 리워드가 없습니다.' 
      });
    }

    let rewardData: any = {};

    if (rewardType === 'mileage') {
      // Calculate and add mileage
      const tier = getTierFromReferrals(profile?.total_referrals || 0);
      const mileageReward = calculateMileageReward(unclaimedReferrals, tier);
      
      // Update user's mileage
      const { error: mileageError } = await supabase
        .from('user_profiles')
        .update({
          mileage: supabase.raw(`mileage + ${mileageReward.amount}`),
          referral_count: profile?.total_referrals,
          reward_claimed: true,
          reward_claimed_at: new Date().toISOString(),
          reward_type: 'mileage'
        })
        .eq('user_id', userId);

      if (mileageError) throw mileageError;

      // Record transaction
      await supabase
        .from('mileage_history')
        .insert({
          user_id: userId,
          amount: mileageReward.amount,
          type: 'earned',
          description: `리퍼럴 리워드 (${unclaimedReferrals}명 추천)`,
          referral_reward: true
        });

      rewardData = { 
        type: 'mileage', 
        amount: mileageReward.amount 
      };

    } else if (rewardType === 'discount_qr') {
      // Generate discount QR code
      const discountReward = calculateDiscountReward(unclaimedReferrals);
      
      if (discountReward.discountPercentage === 0) {
        return res.status(400).json({ 
          success: false, 
          message: '할인 QR코드를 받으려면 최소 3명을 추천해야 합니다.' 
        });
      }

      // Generate unique discount code
      const discountCode = generateDiscountCode();
      
      // Create QR code data
      const qrData = {
        type: 'discount',
        code: discountCode,
        discount: discountReward.discountPercentage,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };

      // Generate QR code image
      const qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Save discount code to database
      const { error: discountError } = await supabase
        .from('discount_codes')
        .insert({
          code: discountCode,
          user_id: userId,
          discount_percentage: discountReward.discountPercentage,
          referral_count: unclaimedReferrals,
          valid_until: qrData.validUntil.toISOString(),
          is_used: false
        });

      if (discountError) throw discountError;

      // Update user profile
      await supabase
        .from('user_profiles')
        .update({
          referral_count: profile?.total_referrals,
          reward_claimed: true,
          reward_claimed_at: new Date().toISOString(),
          reward_type: 'discount_qr'
        })
        .eq('user_id', userId);

      rewardData = {
        type: 'discount_qr',
        code: discountCode,
        discountPercentage: discountReward.discountPercentage,
        qrCodeImage,
        validUntil: qrData.validUntil
      };
    } else {
      return res.status(400).json({ 
        success: false, 
        message: '잘못된 리워드 타입입니다.' 
      });
    }

    res.json({
      success: true,
      data: rewardData,
      message: '리워드가 성공적으로 지급되었습니다!'
    });

  } catch (error) {
    console.error('Error claiming reward:', error);
    res.status(500).json({ 
      success: false, 
      message: '리워드 수령에 실패했습니다.' 
    });
  }
});

// Get QR code for discount
router.get('/discount-qr/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    // Get discount details
    const { data: discount, error } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('code', code)
      .single();

    if (error || !discount) {
      return res.status(404).json({ 
        success: false, 
        message: '할인 코드를 찾을 수 없습니다.' 
      });
    }

    // Check if expired
    if (new Date(discount.valid_until) < new Date()) {
      return res.status(400).json({ 
        success: false, 
        message: '만료된 할인 코드입니다.' 
      });
    }

    // Generate QR code
    const qrData = {
      type: 'discount',
      code: discount.code,
      discount: discount.discount_percentage,
      validUntil: discount.valid_until
    };

    const qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      success: true,
      data: {
        qrCodeImage,
        code: discount.code,
        discountPercentage: discount.discount_percentage,
        validUntil: discount.valid_until,
        isUsed: discount.is_used
      }
    });

  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ 
      success: false, 
      message: 'QR 코드 생성에 실패했습니다.' 
    });
  }
});

// Helper functions
function getTierFromReferrals(totalReferrals: number): string {
  if (totalReferrals >= 50) return 'platinum';
  if (totalReferrals >= 20) return 'gold';
  if (totalReferrals >= 10) return 'silver';
  return 'bronze';
}

function calculateMileageReward(referrals: number, tier: string) {
  const baseReward = referrals * 500; // 500P per referral
  let tierBonus = 0;

  switch (tier) {
    case 'platinum':
      tierBonus = Math.floor(baseReward * 0.5); // 50% bonus
      break;
    case 'gold':
      tierBonus = Math.floor(baseReward * 0.3); // 30% bonus
      break;
    case 'silver':
      tierBonus = Math.floor(baseReward * 0.15); // 15% bonus
      break;
    default:
      tierBonus = 0;
  }

  return {
    amount: baseReward + tierBonus,
    baseReward,
    tierBonus
  };
}

function calculateDiscountReward(referrals: number) {
  let discountPercentage = 0;
  let minimumReferrals = 0;

  if (referrals >= 10) {
    discountPercentage = 30;
  } else if (referrals >= 5) {
    discountPercentage = 20;
    minimumReferrals = 10 - referrals; // Need this many more for 30%
  } else if (referrals >= 3) {
    discountPercentage = 15;
    minimumReferrals = 5 - referrals; // Need this many more for 20%
  } else {
    discountPercentage = 0;
    minimumReferrals = 3 - referrals; // Need this many more for 15%
  }

  return {
    discountPercentage,
    minimumReferrals,
    referralsUsed: referrals
  };
}

function generateDiscountCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'BUZZ-DC-';
  
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code;
}

export default router;