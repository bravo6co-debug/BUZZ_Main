import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { 
  Store, 
  Camera, 
  Clock, 
  Phone, 
  Bell, 
  Shield, 
  Globe, 
  HelpCircle, 
  BarChart3, 
  Users, 
  ChevronRight,
  MessageSquare,
  LogOut,
  ArrowLeft,
  Settings,
  Smartphone,
  TrendingUp
} from 'lucide-react';
import { BusinessHoursScreen } from './BusinessHoursScreen';
import { StoreEditScreen } from './StoreEditScreen';
import BusinessRegistrationModal from './BusinessRegistrationModal';
import { businessService } from '../services/business.service';

interface SettingsScreenProps {
  onLogout?: () => void;
}

export function SettingsScreen({ onLogout }: SettingsScreenProps) {
  const [currentScreen, setCurrentScreen] = useState<'main' | 'business-hours' | 'store-edit'>('main');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [businessData, setBusinessData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  // 개별 설정 항목 제거 - 수정 버튼으로 일괄 처리

  const appSettings = [
    { icon: Bell, label: '알림 설정', action: 'notifications', hasSwitch: true, enabled: true },
    { icon: Shield, label: '자동 로그인', action: 'auto-login', hasSwitch: true, enabled: false },
    { icon: Globe, label: '언어 설정', action: 'language' },
    { icon: HelpCircle, label: '고객지원', action: 'support' }
  ];

  const analyticsSettings = [
    { icon: BarChart3, label: '월간 리포트', action: 'monthly-report' },
    { icon: Users, label: '고객 분석', action: 'customer-analysis' }
  ];

  // Fetch business data on component mount
  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        setIsLoading(true);
        const business = await businessService.getCurrentBusiness();
        setBusinessData(business);
      } catch (error) {
        console.error('Error fetching business data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinessData();
  }, []);

  const handleEditClick = () => {
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (updatedData: any) => {
    // Refresh business data after successful update
    businessService.getCurrentBusiness().then(setBusinessData);
    setIsEditModalOpen(false);
  };

  const formatBusinessDataForEdit = () => {
    if (!businessData) return {};
    
    const addressParts = businessData.address?.split(' ') || [];
    const detailAddress = addressParts.slice(3).join(' '); // Assuming first 3 parts are main address
    const mainAddress = addressParts.slice(0, 3).join(' ');
    
    return {
      businessName: businessData.name || '',
      businessNumber: businessData.business_number || '',
      ownerName: businessData.owner_name || '',
      phoneNumber: businessData.phone || '',
      email: businessData.email || '',
      address: mainAddress || businessData.address || '',
      detailAddress: detailAddress || '',
      postalCode: '', // May need to extract from address or store separately
      category: businessData.category || '',
      description: businessData.description || '',
      displayTimeSlots: businessData.display_time_slots || {
        morning: false,
        lunch: false,
        dinner: false,
        night: false
      }
    };
  };

  const handleSettingClick = (action: string) => {
    if (action === 'set-hours') {
      setCurrentScreen('business-hours');
    } else {
      console.log(`Setting clicked: ${action}`);
    }
  };

  // Show BusinessHoursScreen if selected
  if (currentScreen === 'business-hours') {
    return (
      <div>
        <div className="flex items-center gap-2 p-4 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentScreen('main')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="font-semibold">영업시간 설정</h2>
        </div>
        <BusinessHoursScreen />
      </div>
    );
  }

  // Show StoreEditScreen if selected
  if (currentScreen === 'store-edit') {
    return <StoreEditScreen onBack={() => setCurrentScreen('main')} />;
  }

  const renderSettingItem = (item: any, showSwitch = false, enabled = false) => (
    <div 
      key={item.action}
      className="flex items-center justify-between py-3 px-4 hover:bg-accent/50 rounded-lg cursor-pointer transition-colors"
      onClick={() => !showSwitch && handleSettingClick(item.action)}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <item.icon className="w-4 h-4 text-primary" strokeWidth={2.5} />
        </div>
        <span className="font-medium">{item.label}</span>
      </div>
      {showSwitch ? (
        <Switch checked={enabled} onCheckedChange={() => handleSettingClick(item.action)} />
      ) : (
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-transparent px-4 pt-6 pb-4">
        <div className="flex items-center justify-center gap-2">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-primary" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold">설정</h1>
        </div>
        <p className="text-sm text-muted-foreground text-center mt-1">매장 및 앱 설정을 관리하세요</p>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-4 space-y-4">

        {/* Store Info */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" strokeWidth={2.5} />
              </div>
              <h3 className="font-semibold">매장 정보</h3>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleEditClick}
              className="text-primary border-primary hover:bg-primary/10"
              disabled={isLoading}
            >
              {isLoading ? '로딩...' : '수정'}
            </Button>
          </div>
        
        {/* Current Store Info Display */}
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          {isLoading ? (
            <div className="text-center py-4">
              <div className="text-sm text-muted-foreground">매장 정보를 불러오는 중...</div>
            </div>
          ) : businessData ? (
            <div className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">매장명:</span>
                <span className="ml-2 font-medium">{businessData.name || '미설정'}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">업종:</span>
                <span className="ml-2 font-medium">{businessData.category || '미설정'}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">안내 문구:</span>
                <div className="mt-1 text-sm font-medium text-primary leading-relaxed">
                  {businessData.description || '안내 문구가 설정되지 않았습니다.'}
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">주소:</span>
                <span className="ml-2 font-medium">{businessData.address || '미설정'}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">연락처:</span>
                <span className="ml-2 font-medium">{businessData.phone || '미설정'}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-sm text-muted-foreground">매장 정보를 불러올 수 없습니다.</div>
            </div>
          )}
        </div>
        </Card>

        {/* App Settings */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary" strokeWidth={2.5} />
            </div>
            <h3 className="font-semibold">앱 설정</h3>
          </div>
          <div className="space-y-1">
            {appSettings.map((item) => 
              renderSettingItem(item, item.hasSwitch, item.enabled)
            )}
          </div>
        </Card>

        {/* Analytics */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" strokeWidth={2.5} />
            </div>
            <h3 className="font-semibold">통계 보기</h3>
          </div>
          <div className="space-y-1">
            {analyticsSettings.map((item) => renderSettingItem(item))}
          </div>
        </Card>

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">총 고객 수</p>
                <p className="text-lg font-bold mt-1">1,247명</p>
              </div>
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" strokeWidth={2.5} />
              </div>
            </div>
          </Card>
          <Card className="p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">이번 달 방문</p>
                <p className="text-lg font-bold mt-1">348명</p>
              </div>
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-primary" strokeWidth={2.5} />
              </div>
            </div>
          </Card>
        </div>

        {/* Logout Button */}
        <Card className="p-4">
          <Button 
            onClick={onLogout}
            variant="outline"
            className="w-full h-12 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 font-medium"
          >
            <LogOut className="w-4 h-4 mr-2" strokeWidth={2.5} />
            로그아웃
          </Button>
        </Card>

        {/* App Info */}
        <div className="text-center pt-4 pb-2">
          <p className="text-xs text-muted-foreground">Buzz-Biz v1.0.0</p>
          <p className="text-xs text-muted-foreground mt-1">© 2024 Buzz-Biz. All rights reserved.</p>
        </div>
      </div>

      {/* Business Registration Modal for Editing */}
      <BusinessRegistrationModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditSubmit}
        mode="edit"
        initialData={formatBusinessDataForEdit()}
      />
    </div>
  );
}