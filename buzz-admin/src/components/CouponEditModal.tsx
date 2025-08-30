import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Calendar, DollarSign, Percent, Users, Building } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { adminCouponService, AdminCoupon, CreateCouponData, UpdateCouponData } from '../services/adminCoupon.service';
import { toast } from './ui/use-toast';

interface CouponEditModalProps {
  coupon: AdminCoupon | null; // null means creating new coupon
  onClose: () => void;
  onSave: () => void;
}

interface Business {
  id: string;
  business_name: string;
  category: string;
  address: string;
}

export default function CouponEditModal({ coupon, onClose, onSave }: CouponEditModalProps) {
  const isEditing = !!coupon;
  const [loading, setLoading] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'basic' as 'basic' | 'signup' | 'referral' | 'event',
    discount_type: 'fixed' as 'fixed' | 'percentage',
    discount_value: 0,
    min_purchase_amount: '',
    max_discount_amount: '',
    valid_from: '',
    valid_until: '',
    total_quantity: '',
    status: 'active' as 'active' | 'inactive',
    description: ''
  });

  const [errors, setErrors] = useState<string[]>([]);

  // Initialize form data
  useEffect(() => {
    if (coupon) {
      setFormData({
        name: coupon.name,
        type: coupon.type,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_purchase_amount: coupon.min_purchase_amount?.toString() || '',
        max_discount_amount: coupon.max_discount_amount?.toString() || '',
        valid_from: coupon.valid_from ? new Date(coupon.valid_from).toISOString().split('T')[0] : '',
        valid_until: coupon.valid_until ? new Date(coupon.valid_until).toISOString().split('T')[0] : '',
        total_quantity: coupon.total_quantity?.toString() || '',
        status: coupon.status,
        description: ''
      });
      setSelectedBusinesses(coupon.applicable_businesses || []);
    }
  }, [coupon]);

  // Load businesses
  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      const response = await adminCouponService.getBusinessesForCoupon();
      if (response.success && response.data) {
        setBusinesses(response.data);
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
    }
  };

  const validateForm = () => {
    const newErrors: string[] = [];

    if (!formData.name.trim()) {
      newErrors.push('쿠폰명을 입력해주세요.');
    }

    if (formData.name.length < 2 || formData.name.length > 200) {
      newErrors.push('쿠폰명은 2-200자 사이여야 합니다.');
    }

    if (!formData.discount_value || formData.discount_value <= 0) {
      newErrors.push('할인 값을 입력해주세요.');
    }

    if (formData.discount_type === 'percentage' && formData.discount_value > 100) {
      newErrors.push('퍼센트 할인율은 100%를 초과할 수 없습니다.');
    }

    if (formData.min_purchase_amount && parseFloat(formData.min_purchase_amount) < 0) {
      newErrors.push('최소 구매 금액은 0 이상이어야 합니다.');
    }

    if (formData.max_discount_amount && parseFloat(formData.max_discount_amount) < 0) {
      newErrors.push('최대 할인 금액은 0 이상이어야 합니다.');
    }

    if (formData.total_quantity && parseInt(formData.total_quantity) < 1) {
      newErrors.push('총 수량은 1 이상이어야 합니다.');
    }

    if (formData.valid_from && formData.valid_until) {
      if (new Date(formData.valid_from) >= new Date(formData.valid_until)) {
        newErrors.push('유효 시작일은 종료일보다 이전이어야 합니다.');
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        name: formData.name.trim(),
        type: formData.type,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        min_purchase_amount: formData.min_purchase_amount ? parseFloat(formData.min_purchase_amount) : undefined,
        max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : undefined,
        valid_from: formData.valid_from || undefined,
        valid_until: formData.valid_until || undefined,
        total_quantity: formData.total_quantity ? parseInt(formData.total_quantity) : undefined,
        applicable_businesses: selectedBusinesses.length > 0 ? selectedBusinesses : undefined,
        ...(isEditing && { status: formData.status })
      };

      let response;
      if (isEditing) {
        response = await adminCouponService.updateCoupon(coupon.id, submitData as UpdateCouponData);
      } else {
        response = await adminCouponService.createCoupon(submitData as CreateCouponData);
      }

      if (response.success) {
        toast({
          title: '성공',
          description: `쿠폰이 ${isEditing ? '수정' : '생성'}되었습니다.`,
          variant: 'default'
        });
        onSave();
      } else {
        toast({
          title: '오류',
          description: response.error || `쿠폰 ${isEditing ? '수정' : '생성'}에 실패했습니다.`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error saving coupon:', error);
      toast({
        title: '오류',
        description: `쿠폰 ${isEditing ? '수정' : '생성'}에 실패했습니다.`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors([]);
  };

  const toggleBusinessSelection = (businessId: string) => {
    setSelectedBusinesses(prev => 
      prev.includes(businessId) 
        ? prev.filter(id => id !== businessId)
        : [...prev, businessId]
    );
  };

  const previewDiscount = () => {
    if (!formData.discount_value) return '';
    
    if (formData.discount_type === 'fixed') {
      return `${formData.discount_value.toLocaleString()}원 할인`;
    } else {
      const maxText = formData.max_discount_amount 
        ? ` (최대 ${parseFloat(formData.max_discount_amount).toLocaleString()}원)` 
        : '';
      return `${formData.discount_value}% 할인${maxText}`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {isEditing ? '쿠폰 수정' : '새 쿠폰 생성'}
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {errors.length > 0 && (
            <Card className="mb-6 border-red-200 bg-red-50">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Basic Info */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">기본 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">쿠폰명 *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="예: 신규 가입 축하 쿠폰"
                      maxLength={200}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.name.length}/200자
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="type">쿠폰 타입 *</Label>
                    <select
                      id="type"
                      value={formData.type}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="basic">기본 쿠폰</option>
                      <option value="signup">가입 쿠폰</option>
                      <option value="referral">추천 쿠폰</option>
                      <option value="event">이벤트 쿠폰</option>
                    </select>
                  </div>

                  {isEditing && (
                    <div>
                      <Label htmlFor="status">상태</Label>
                      <select
                        id="status"
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="active">활성</option>
                        <option value="inactive">비활성</option>
                      </select>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    할인 설정
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="discount_type">할인 타입 *</Label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="discount_type"
                          value="fixed"
                          checked={formData.discount_type === 'fixed'}
                          onChange={(e) => handleInputChange('discount_type', e.target.value)}
                        />
                        <DollarSign className="w-4 h-4" />
                        정액 할인
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="discount_type"
                          value="percentage"
                          checked={formData.discount_type === 'percentage'}
                          onChange={(e) => handleInputChange('discount_type', e.target.value)}
                        />
                        <Percent className="w-4 h-4" />
                        정률 할인
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="discount_value">
                      할인 값 * {formData.discount_type === 'percentage' ? '(%)' : '(원)'}
                    </Label>
                    <Input
                      id="discount_value"
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) => handleInputChange('discount_value', parseFloat(e.target.value) || 0)}
                      placeholder={formData.discount_type === 'percentage' ? '10' : '5000'}
                      min="0"
                      max={formData.discount_type === 'percentage' ? 100 : undefined}
                      required
                    />
                    {previewDiscount() && (
                      <p className="text-sm text-blue-600 mt-1">
                        미리보기: {previewDiscount()}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="min_purchase_amount">최소 구매 금액 (원)</Label>
                    <Input
                      id="min_purchase_amount"
                      type="number"
                      value={formData.min_purchase_amount}
                      onChange={(e) => handleInputChange('min_purchase_amount', e.target.value)}
                      placeholder="10000"
                      min="0"
                    />
                  </div>

                  {formData.discount_type === 'percentage' && (
                    <div>
                      <Label htmlFor="max_discount_amount">최대 할인 금액 (원)</Label>
                      <Input
                        id="max_discount_amount"
                        type="number"
                        value={formData.max_discount_amount}
                        onChange={(e) => handleInputChange('max_discount_amount', e.target.value)}
                        placeholder="10000"
                        min="0"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Additional Settings */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    유효 기간
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="valid_from">시작일</Label>
                    <Input
                      id="valid_from"
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => handleInputChange('valid_from', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="valid_until">종료일</Label>
                    <Input
                      id="valid_until"
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => handleInputChange('valid_until', e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    날짜를 지정하지 않으면 제한없이 사용 가능합니다.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    발급 설정
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="total_quantity">총 발급 수량</Label>
                    <Input
                      id="total_quantity"
                      type="number"
                      value={formData.total_quantity}
                      onChange={(e) => handleInputChange('total_quantity', e.target.value)}
                      placeholder="1000"
                      min="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      미지정시 무제한 발급 가능
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    적용 매장 ({selectedBusinesses.length}개 선택)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-3">
                    <p className="text-sm text-gray-600">
                      매장을 선택하지 않으면 모든 매장에서 사용 가능합니다.
                    </p>
                  </div>
                  <div className="max-h-48 overflow-y-auto border rounded-md">
                    {businesses.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        매장 정보를 불러오는 중...
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {businesses.map((business) => (
                          <div
                            key={business.id}
                            className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${
                              selectedBusinesses.includes(business.id) ? 'bg-blue-50 border-blue-200 border' : ''
                            }`}
                            onClick={() => toggleBusinessSelection(business.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{business.business_name}</p>
                                <p className="text-xs text-gray-500">{business.category} • {business.address}</p>
                              </div>
                              <input
                                type="checkbox"
                                checked={selectedBusinesses.includes(business.id)}
                                onChange={() => toggleBusinessSelection(business.id)}
                                className="ml-2"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedBusinesses.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">선택된 매장:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedBusinesses.map((businessId) => {
                          const business = businesses.find(b => b.id === businessId);
                          return business ? (
                            <Badge key={businessId} variant="secondary" className="text-xs">
                              {business.business_name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={loading} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {loading ? '저장 중...' : isEditing ? '수정' : '생성'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}