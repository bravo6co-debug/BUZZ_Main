import React, { useState, useEffect } from 'react';
import { X, Send, Users, Calendar, Filter, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { adminCouponService, AdminCoupon, BulkIssueCouponData, BulkIssueCouponResult } from '../services/adminCoupon.service';
import { toast } from './ui/use-toast';

interface CouponIssueModalProps {
  coupon: AdminCoupon;
  onClose: () => void;
  onIssue: () => void;
}

interface UserFilter {
  role?: 'user' | 'business';
  isActive?: boolean;
  university?: string;
  registeredAfter?: string;
  registeredBefore?: string;
}

export default function CouponIssueModal({ coupon, onClose, onIssue }: CouponIssueModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'target' | 'confirm' | 'result'>('target');
  const [issueResult, setIssueResult] = useState<BulkIssueCouponResult | null>(null);
  
  const [targetType, setTargetType] = useState<'all' | 'filter' | 'specific'>('all');
  const [userFilter, setUserFilter] = useState<UserFilter>({});
  const [specificUserIds, setSpecificUserIds] = useState<string>('');
  const [expirationDays, setExpirationDays] = useState<number>(30);
  
  const [estimatedTargets, setEstimatedTargets] = useState<number>(0);
  const [errors, setErrors] = useState<string[]>([]);

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (expirationDays < 1 || expirationDays > 365) {
      newErrors.push('유효기간은 1-365일 사이여야 합니다.');
    }

    if (targetType === 'specific') {
      if (!specificUserIds.trim()) {
        newErrors.push('사용자 ID를 입력해주세요.');
      } else {
        const userIds = specificUserIds.split(',').map(id => id.trim()).filter(id => id);
        if (userIds.length === 0) {
          newErrors.push('올바른 사용자 ID를 입력해주세요.');
        }
      }
    }

    if (targetType === 'filter') {
      if (userFilter.registeredAfter && userFilter.registeredBefore) {
        if (new Date(userFilter.registeredAfter) >= new Date(userFilter.registeredBefore)) {
          newErrors.push('가입 시작일은 종료일보다 이전이어야 합니다.');
        }
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleNext = () => {
    if (!validateForm()) return;
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const issueData: BulkIssueCouponData = {
        couponId: coupon.id,
        expirationDays,
      };

      if (targetType === 'specific') {
        const userIds = specificUserIds.split(',').map(id => id.trim()).filter(id => id);
        issueData.userIds = userIds;
      } else if (targetType === 'filter') {
        issueData.userFilters = userFilter;
      }
      // 'all' type doesn't need additional parameters

      const response = await adminCouponService.issueCoupons(issueData);
      
      if (response.success && response.data) {
        setIssueResult(response.data);
        setStep('result');
        toast({
          title: '성공',
          description: `${response.data.issuedCount}개의 쿠폰이 발급되었습니다.`,
          variant: 'default'
        });
      } else {
        toast({
          title: '오류',
          description: response.error || '쿠폰 발급에 실패했습니다.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error issuing coupons:', error);
      toast({
        title: '오류',
        description: '쿠폰 발급에 실패했습니다.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    onIssue();
  };

  const formatDiscountText = (coupon: AdminCoupon) => {
    if (coupon.discount_type === 'fixed') {
      return `${coupon.discount_value.toLocaleString()}원 할인`;
    } else {
      const maxText = coupon.max_discount_amount 
        ? ` (최대 ${coupon.max_discount_amount.toLocaleString()}원)` 
        : '';
      return `${coupon.discount_value}% 할인${maxText}`;
    }
  };

  const renderTargetSelection = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            발급 대상 선택
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="targetType"
                value="all"
                checked={targetType === 'all'}
                onChange={(e) => setTargetType(e.target.value as any)}
              />
              <div>
                <p className="font-medium">전체 사용자</p>
                <p className="text-sm text-gray-500">모든 활성 사용자에게 발급</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="targetType"
                value="filter"
                checked={targetType === 'filter'}
                onChange={(e) => setTargetType(e.target.value as any)}
              />
              <div>
                <p className="font-medium">조건별 필터링</p>
                <p className="text-sm text-gray-500">특정 조건에 맞는 사용자에게 발급</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="targetType"
                value="specific"
                checked={targetType === 'specific'}
                onChange={(e) => setTargetType(e.target.value as any)}
              />
              <div>
                <p className="font-medium">특정 사용자</p>
                <p className="text-sm text-gray-500">사용자 ID를 직접 입력하여 발급</p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {targetType === 'filter' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              필터 조건
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>사용자 유형</Label>
              <select
                value={userFilter.role || ''}
                onChange={(e) => setUserFilter(prev => ({ 
                  ...prev, 
                  role: e.target.value as 'user' | 'business' | undefined 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">전체</option>
                <option value="user">일반 사용자</option>
                <option value="business">사업자</option>
              </select>
            </div>

            <div>
              <Label>활성 상태</Label>
              <select
                value={userFilter.isActive === undefined ? '' : userFilter.isActive.toString()}
                onChange={(e) => setUserFilter(prev => ({ 
                  ...prev, 
                  isActive: e.target.value === '' ? undefined : e.target.value === 'true' 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">전체</option>
                <option value="true">활성</option>
                <option value="false">비활성</option>
              </select>
            </div>

            <div>
              <Label htmlFor="university">대학교</Label>
              <Input
                id="university"
                value={userFilter.university || ''}
                onChange={(e) => setUserFilter(prev => ({ ...prev, university: e.target.value || undefined }))}
                placeholder="예: 부경대학교"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="registeredAfter">가입일 (시작)</Label>
                <Input
                  id="registeredAfter"
                  type="date"
                  value={userFilter.registeredAfter || ''}
                  onChange={(e) => setUserFilter(prev => ({ ...prev, registeredAfter: e.target.value || undefined }))}
                />
              </div>
              <div>
                <Label htmlFor="registeredBefore">가입일 (종료)</Label>
                <Input
                  id="registeredBefore"
                  type="date"
                  value={userFilter.registeredBefore || ''}
                  onChange={(e) => setUserFilter(prev => ({ ...prev, registeredBefore: e.target.value || undefined }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {targetType === 'specific' && (
        <Card>
          <CardHeader>
            <CardTitle>특정 사용자 ID</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="userIds">사용자 ID (쉼표로 구분)</Label>
              <textarea
                id="userIds"
                value={specificUserIds}
                onChange={(e) => setSpecificUserIds(e.target.value)}
                placeholder="user-id-1, user-id-2, user-id-3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md h-24 resize-none"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                사용자 ID를 쉼표(,)로 구분하여 입력해주세요.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            쿠폰 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="expirationDays">유효기간 (일) *</Label>
            <Input
              id="expirationDays"
              type="number"
              value={expirationDays}
              onChange={(e) => setExpirationDays(parseInt(e.target.value) || 30)}
              min="1"
              max="365"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              발급일로부터 {expirationDays}일 후 만료됩니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-800">입력 오류</h4>
                <ul className="mt-1 text-sm text-red-700 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderConfirmation = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>쿠폰 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">쿠폰명</p>
              <p className="font-medium">{coupon.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">할인</p>
              <p className="font-medium">{formatDiscountText(coupon)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">유효기간</p>
              <p className="font-medium">발급일로부터 {expirationDays}일</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">타입</p>
              <Badge variant="secondary">{coupon.type}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>발급 대상</CardTitle>
        </CardHeader>
        <CardContent>
          {targetType === 'all' && (
            <p>전체 활성 사용자</p>
          )}
          {targetType === 'filter' && (
            <div className="space-y-2">
              <p>조건별 필터링:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                {userFilter.role && <li>• 사용자 유형: {userFilter.role === 'user' ? '일반 사용자' : '사업자'}</li>}
                {userFilter.isActive !== undefined && <li>• 상태: {userFilter.isActive ? '활성' : '비활성'}</li>}
                {userFilter.university && <li>• 대학교: {userFilter.university}</li>}
                {userFilter.registeredAfter && <li>• 가입일 시작: {userFilter.registeredAfter}</li>}
                {userFilter.registeredBefore && <li>• 가입일 종료: {userFilter.registeredBefore}</li>}
              </ul>
            </div>
          )}
          {targetType === 'specific' && (
            <div>
              <p>특정 사용자 ({specificUserIds.split(',').filter(id => id.trim()).length}명)</p>
              <div className="mt-2 p-2 bg-gray-100 rounded text-sm max-h-24 overflow-y-auto">
                {specificUserIds.split(',').map((id, index) => id.trim()).filter(id => id).join(', ')}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-orange-800">발급 전 확인사항</h4>
              <ul className="mt-1 text-sm text-orange-700 space-y-1">
                <li>• 발급된 쿠폰은 취소할 수 없습니다.</li>
                <li>• 이미 해당 쿠폰을 보유한 사용자는 제외됩니다.</li>
                <li>• 쿠폰 수량 제한이 있는 경우 초과 발급이 불가능합니다.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderResult = () => (
    <div className="space-y-6">
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <h3 className="text-lg font-semibold text-green-800">쿠폰 발급 완료</h3>
              <p className="text-green-700">쿠폰이 성공적으로 발급되었습니다.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {issueResult && (
        <Card>
          <CardHeader>
            <CardTitle>발급 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{issueResult.issuedCount}</p>
                <p className="text-sm text-green-700">발급 성공</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{issueResult.skippedCount}</p>
                <p className="text-sm text-yellow-700">발급 제외</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <span>총 대상자:</span>
                <span className="font-medium">{issueResult.totalTargeted}명</span>
              </div>
              <div className="flex justify-between">
                <span>쿠폰 만료일:</span>
                <span className="font-medium">{new Date(issueResult.expiresAt).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">쿠폰 대량 발급</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-4 mt-4">
            <div className={`flex items-center gap-2 ${step === 'target' ? 'text-blue-600' : step === 'confirm' || step === 'result' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'target' ? 'bg-blue-100 border-2 border-blue-600' : step === 'confirm' || step === 'result' ? 'bg-green-100 border-2 border-green-600' : 'bg-gray-100'}`}>
                1
              </div>
              <span className="text-sm font-medium">대상 선택</span>
            </div>
            <div className="flex-1 h-px bg-gray-300" />
            <div className={`flex items-center gap-2 ${step === 'confirm' ? 'text-blue-600' : step === 'result' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'confirm' ? 'bg-blue-100 border-2 border-blue-600' : step === 'result' ? 'bg-green-100 border-2 border-green-600' : 'bg-gray-100'}`}>
                2
              </div>
              <span className="text-sm font-medium">확인</span>
            </div>
            <div className="flex-1 h-px bg-gray-300" />
            <div className={`flex items-center gap-2 ${step === 'result' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'result' ? 'bg-green-100 border-2 border-green-600' : 'bg-gray-100'}`}>
                3
              </div>
              <span className="text-sm font-medium">완료</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {step === 'target' && renderTargetSelection()}
          {step === 'confirm' && renderConfirmation()}
          {step === 'result' && renderResult()}
        </div>

        <div className="flex justify-between items-center p-6 border-t border-gray-200">
          {step === 'target' && (
            <>
              <Button variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button onClick={handleNext} className="flex items-center gap-2">
                다음
              </Button>
            </>
          )}
          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => setStep('target')}>
                이전
              </Button>
              <Button onClick={handleConfirm} disabled={loading} className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                {loading ? '발급 중...' : '발급하기'}
              </Button>
            </>
          )}
          {step === 'result' && (
            <>
              <div />
              <Button onClick={handleComplete} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                완료
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}