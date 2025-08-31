import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { 
  ArrowLeft, 
  Store, 
  MapPin, 
  Phone, 
  Clock,
  Tag,
  DollarSign,
  Users,
  Car,
  Globe,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StoreEditScreenProps {
  onBack: () => void;
}

export function StoreEditScreen({ onBack }: StoreEditScreenProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    address: '',
    address_detail: '',
    contact_phone: '',
    business_hours: {
      mon: { open: '09:00', close: '22:00' },
      tue: { open: '09:00', close: '22:00' },
      wed: { open: '09:00', close: '22:00' },
      thu: { open: '09:00', close: '22:00' },
      fri: { open: '09:00', close: '23:00' },
      sat: { open: '10:00', close: '23:00' },
      sun: { open: '10:00', close: '21:00' }
    },
    tags: [] as string[],
    menu_items: [] as string[],
    price_range: '',
    seats: 0,
    parking: '',
    sns: {
      instagram: '',
      facebook: ''
    }
  });

  const categories = ['카페', '한식', '중식', '일식', '양식', '주점', '베이커리', '치킨', '피자', '기타'];
  const commonTags = ['인기맛집', '청결인증', '주차가능', '배달가능', '예약필수', '24시간', '키즈존', '반려동물'];

  useEffect(() => {
    loadBusinessData();
  }, []);

  const loadBusinessData = async () => {
    setLoading(true);
    try {
      // Get business info from localStorage or session
      const businessInfo = JSON.parse(localStorage.getItem('buzz_biz_business_info') || '{}');
      
      if (businessInfo.business_number) {
        // Fetch from Supabase
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('business_number', businessInfo.business_number)
          .single();

        if (data && !error) {
          setFormData({
            name: data.business_name || '',
            category: data.category || '',
            description: data.description || '',
            address: data.address || '',
            address_detail: data.address_detail || '',
            contact_phone: data.phone || '',
            business_hours: data.business_hours || formData.business_hours,
            tags: data.tags || [],
            menu_items: data.menu_items || [],
            price_range: data.price_range || '',
            seats: data.seats || 0,
            parking: data.parking || '',
            sns: data.sns || { instagram: '', facebook: '' }
          });
        }
      }
    } catch (error) {
      console.error('Error loading business data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const businessInfo = JSON.parse(localStorage.getItem('buzz_biz_business_info') || '{}');
      
      if (!businessInfo.business_number) {
        throw new Error('사업자 정보를 찾을 수 없습니다.');
      }

      const updateData: any = {
          business_name: formData.name,
          category: formData.category,
          description: formData.description,
          address: formData.address,
          address_detail: formData.address_detail,
          phone: formData.contact_phone,
          business_hours: formData.business_hours,
          tags: formData.tags,
          updated_at: new Date().toISOString()
      };

      // 테이블에 없을 수 있는 컬럼들은 제외
      // menu_items, price_range, seats, parking, sns는 별도 확인 필요

      const { error } = await supabase
        .from('businesses')
        .update(updateData)
        .eq('business_number', businessInfo.business_number);

      if (error) throw error;

      setMessage({ type: 'success', text: '매장 정보가 성공적으로 저장되었습니다!' });
      
      // Update localStorage
      localStorage.setItem('buzz_biz_business_info', JSON.stringify({
        ...businessInfo,
        ...formData
      }));

      setTimeout(() => {
        setMessage(null);
      }, 3000);
      
    } catch (error: any) {
      console.error('Error saving business data:', error);
      setMessage({ type: 'error', text: error.message || '저장 중 오류가 발생했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTagToggle = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleMenuItemChange = (index: number, value: string) => {
    const newMenuItems = [...formData.menu_items];
    newMenuItems[index] = value;
    setFormData(prev => ({ ...prev, menu_items: newMenuItems }));
  };

  const addMenuItem = () => {
    setFormData(prev => ({ ...prev, menu_items: [...prev.menu_items, ''] }));
  };

  const removeMenuItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      menu_items: prev.menu_items.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b bg-white sticky top-0 z-10">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="font-semibold flex-1">매장 정보 수정</h2>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          size="sm"
          className="bg-primary text-white"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4 mr-1" />
              저장
            </>
          )}
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div className={`mx-4 mt-4 p-3 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Form */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Basic Info */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">기본 정보</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">매장명</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="매장 이름을 입력하세요"
              />
            </div>

            <div>
              <Label htmlFor="category">카테고리</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="">선택하세요</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="description">매장 소개</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="매장을 소개하는 문구를 입력하세요"
                rows={3}
              />
            </div>
          </div>
        </Card>

        {/* Location */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">위치 정보</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="address">주소</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="예: 서울특별시 강남구 테헤란로 123"
              />
            </div>

            <div>
              <Label htmlFor="address_detail">상세 주소</Label>
              <Input
                id="address_detail"
                value={formData.address_detail}
                onChange={(e) => setFormData(prev => ({ ...prev, address_detail: e.target.value }))}
                placeholder="예: 3층 301호"
              />
            </div>

            <div>
              <Label htmlFor="contact_phone">연락처</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                placeholder="예: 02-1234-5678"
              />
            </div>
          </div>
        </Card>

        {/* Tags */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">태그</h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {commonTags.map(tag => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  formData.tags.includes(tag)
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </Card>

        {/* Menu Items */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">메뉴</h3>
            </div>
            <Button size="sm" variant="outline" onClick={addMenuItem}>
              + 추가
            </Button>
          </div>
          
          <div className="space-y-2">
            {formData.menu_items.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={item}
                  onChange={(e) => handleMenuItemChange(index, e.target.value)}
                  placeholder="메뉴 이름"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeMenuItem(index)}
                  className="text-red-500"
                >
                  삭제
                </Button>
              </div>
            ))}
            
            {formData.menu_items.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                메뉴를 추가해주세요
              </p>
            )}
          </div>

          <div className="mt-4">
            <Label htmlFor="price_range">가격대</Label>
            <Input
              id="price_range"
              value={formData.price_range}
              onChange={(e) => setFormData(prev => ({ ...prev, price_range: e.target.value }))}
              placeholder="예: 5,000원 ~ 15,000원"
            />
          </div>
        </Card>

        {/* Facilities */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">시설 정보</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="seats">좌석 수</Label>
              <Input
                id="seats"
                type="number"
                value={formData.seats}
                onChange={(e) => setFormData(prev => ({ ...prev, seats: parseInt(e.target.value) || 0 }))}
                placeholder="예: 30"
              />
            </div>

            <div>
              <Label htmlFor="parking">주차 정보</Label>
              <Input
                id="parking"
                value={formData.parking}
                onChange={(e) => setFormData(prev => ({ ...prev, parking: e.target.value }))}
                placeholder="예: 주차 가능 (5대)"
              />
            </div>
          </div>
        </Card>

        {/* SNS */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">SNS</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={formData.sns.instagram}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sns: { ...prev.sns, instagram: e.target.value }
                }))}
                placeholder="@username"
              />
            </div>

            <div>
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                value={formData.sns.facebook}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sns: { ...prev.sns, facebook: e.target.value }
                }))}
                placeholder="fb.com/pagename"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}