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
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">BUZZ Business</h1>
            <p className="text-sm text-muted-foreground mt-2">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login screen if not logged in
  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const tabs = [
    { id: 'home' as TabType, icon: Home, label: '홈' },
    { id: 'qr' as TabType, icon: QrCode, label: 'QR스캔' },
    { id: 'settlement' as TabType, icon: CreditCard, label: '정산' },
    { id: 'settings' as TabType, icon: Settings, label: '설정' }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {renderScreen()}
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-border bg-card shadow-lg">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-2 text-center transition-all duration-200 relative ${
                activeTab === tab.id
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/5'
              }`}
            >
              {activeTab === tab.id && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
              )}
              <div className="flex flex-col items-center gap-1.5">
                <tab.icon className={`transition-all duration-200 ${
                  activeTab === tab.id ? 'w-5 h-5' : 'w-5 h-5'
                }`} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                <span className={`text-xs font-medium transition-all duration-200 ${
                  activeTab === tab.id ? 'opacity-100' : 'opacity-80'
                }`}>{tab.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}