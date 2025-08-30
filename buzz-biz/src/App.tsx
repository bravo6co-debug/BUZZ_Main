import React, { useState, useEffect } from 'react';
import { Home, QrCode, CreditCard, Settings } from 'lucide-react';
import { LoginScreen } from './components/LoginScreen';
import { HomeScreen } from './components/HomeScreen';
import { QRScanScreen } from './components/QRScanScreen';
import { SettlementScreen } from './components/SettlementScreen';
import { SettingsScreen } from './components/SettingsScreen';

type TabType = 'home' | 'qr' | 'settlement' | 'settings';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('home');

  useEffect(() => {
    const checkLoginStatus = () => {
      const loggedIn = localStorage.getItem('buzz_biz_logged_in') === 'true';
      setIsLoggedIn(loggedIn);
      setIsLoading(false);
    };

    setTimeout(checkLoginStatus, 500);
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('buzz_biz_logged_in');
    localStorage.removeItem('buzz_biz_business_info');
    setIsLoggedIn(false);
    setActiveTab('home');
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'qr':
        return <QRScanScreen />;
      case 'settlement':
        return <SettlementScreen />;
      case 'settings':
        return <SettingsScreen onLogout={handleLogout} />;
      default:
        return <HomeScreen />;
    }
  };

  // Show loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🏪</div>
          <h1 className="text-2xl mb-2">BUZZ Business</h1>
          <div className="animate-pulse text-gray-600">로딩 중...</div>
        </div>
      </div>
    );
  }

  // Show login screen if not logged in
  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const tabs = [
    { id: 'home' as TabType, icon: Home, label: '🏠 홈' },
    { id: 'qr' as TabType, icon: QrCode, label: '📸 QR스캔' },
    { id: 'settlement' as TabType, icon: CreditCard, label: '💳 정산' },
    { id: 'settings' as TabType, icon: Settings, label: '⚙️ 설정' }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {renderScreen()}
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-border bg-card">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-2 text-center transition-colors ${
                activeTab === tab.id
                  ? 'text-primary bg-accent/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <tab.icon className="w-5 h-5" />
                <span className="text-xs">{tab.label.split(' ')[1]}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}