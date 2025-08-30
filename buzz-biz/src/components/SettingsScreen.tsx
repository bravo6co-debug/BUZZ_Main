import React, { useState } from 'react';
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
  ArrowLeft
} from 'lucide-react';
import { BusinessHoursScreen } from './BusinessHoursScreen';

interface SettingsScreenProps {
  onLogout?: () => void;
}

export function SettingsScreen({ onLogout }: SettingsScreenProps) {
  const [currentScreen, setCurrentScreen] = useState<'main' | 'business-hours'>('main');
  const storeSettings = [
    { icon: MessageSquare, label: '매장 안내 문구', action: 'edit-notice' },
    { icon: Camera, label: '사진 관리', action: 'manage-photos' },
    { icon: Clock, label: '영업시간 설정', action: 'set-hours' },
    { icon: Phone, label: '연락처 수정', action: 'edit-contact' }
  ];

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

  const renderSettingItem = (item: any, showSwitch = false, enabled = false) => (
    <div 
      key={item.action}
      className="flex items-center justify-between py-3 px-4 hover:bg-accent/50 rounded-lg cursor-pointer transition-colors"
      onClick={() => !showSwitch && handleSettingClick(item.action)}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
          <item.icon className="w-4 h-4 text-primary" />
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
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-xl font-semibold">⚙️ 설정</h1>
        <p className="text-sm text-muted-foreground mt-1">매장 및 앱 설정을 관리하세요</p>
      </div>

      {/* Store Info */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Store className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">🏪 매장 정보</h3>
        </div>
        
        {/* Current Store Info Display */}
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">매장명:</span>
              <span className="ml-2 font-medium">카페 버즈</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">안내 문구:</span>
              <div className="mt-1 text-sm font-medium text-primary leading-relaxed">
                "신선한 원두로 내린 커피와 함께<br/>달콤한 디저트를 즐겨보세요 ☕️🧁"
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">영업시간:</span>
              <span className="ml-2 font-medium">09:00 - 22:00</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">연락처:</span>
              <span className="ml-2 font-medium">02-1234-5678</span>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          {storeSettings.map((item) => renderSettingItem(item))}
        </div>
      </Card>

      {/* App Settings */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">📱 앱 설정</h3>
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
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">📊 통계 보기</h3>
        </div>
        <div className="space-y-1">
          {analyticsSettings.map((item) => renderSettingItem(item))}
        </div>
      </Card>

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 text-center">
          <Users className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">총 고객 수</p>
          <p className="font-semibold">1,247명</p>
        </Card>
        <Card className="p-4 text-center">
          <BarChart3 className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">이번 달 방문</p>
          <p className="font-semibold">348명</p>
        </Card>
      </div>

      {/* Logout Button */}
      <Card className="p-4">
        <Button 
          onClick={onLogout}
          variant="outline"
          className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
        >
          <LogOut className="w-4 h-4 mr-2" />
          로그아웃
        </Button>
      </Card>

      {/* App Info */}
      <div className="text-center pt-4">
        <p className="text-xs text-muted-foreground">Buzz-Biz v1.0.0</p>
        <p className="text-xs text-muted-foreground mt-1">© 2024 Buzz-Biz. All rights reserved.</p>
      </div>
    </div>
  );
}