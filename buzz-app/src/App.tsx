import { useState, useEffect } from "react";
import { Toaster } from "./components/ui/sonner";
import BottomNavigation from "./components/BottomNavigation";
import HomePage from "./components/HomePage";
import LocalRecommendationsPage from "./components/LocalRecommendationsPage";
import EventsPage from "./components/EventsPage";
import MyPage from "./components/MyPage";
import MarketerPage from "./components/MarketerPage";
import LoginPage from "./components/LoginPage";
import PopupBanner from "./components/PopupBanner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { testConnection } from "./lib/supabase";
import { toast } from "sonner";

function AppContent() {
  const [activeTab, setActiveTab] = useState('home');
  const [showLoginPage, setShowLoginPage] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const { isLoggedIn, loading, logout } = useAuth();

  // Handle referral links and test Supabase connection on mount
  useEffect(() => {
    // Check for referral code in URL
    const handleReferralLink = () => {
      const path = window.location.pathname;
      const inviteMatch = path.match(/^\/invite\/([^\/]+)$/);
      
      if (inviteMatch) {
        const code = inviteMatch[1];
        console.log('Referral code detected:', code);
        
        // Store referral code for signup
        setReferralCode(code);
        localStorage.setItem('referralCode', code);
        
        // Track referral visit
        trackReferralVisit(code);
        
        // Show welcome message
        toast.success("🎉 리퍼럴 링크로 접속하셨습니다! 회원가입 시 특별 혜택을 받으실 수 있습니다.", {
          duration: 5000
        });
        
        // Redirect to home page
        window.history.replaceState({}, '', '/');
      } else {
        // Check for stored referral code
        const storedCode = localStorage.getItem('referralCode');
        if (storedCode) {
          setReferralCode(storedCode);
        }
      }
    };
    
    handleReferralLink();

    // Test Supabase connection
    testConnection().then(result => {
      console.log('Supabase connection test:', result);
    });
  }, []);

  // Track referral visit
  const trackReferralVisit = async (code: string) => {
    try {
      const response = await fetch('/api/referral/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referralCode: code,
          metadata: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          }
        })
      });
      
      if (response.ok) {
        console.log('Referral visit tracked successfully');
      }
    } catch (error) {
      console.error('Failed to track referral visit:', error);
    }
  };

  // Show loading screen while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📱</div>
          <h1 className="text-2xl mb-2">BUZZ</h1>
          <div className="animate-pulse text-muted-foreground">로딩 중...</div>
        </div>
      </div>
    );
  }

  // Handle tab changes - show login for protected tabs
  const handleTabChange = (tab: string) => {
    if (tab === 'my' && !isLoggedIn) {
      setShowLoginPage(true);
    } else {
      setActiveTab(tab);
      setShowLoginPage(false);
    }
  };

  // Handle successful login
  const handleLoginSuccess = () => {
    setShowLoginPage(false);
    setActiveTab('my'); // Navigate to MyPage after login
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    setActiveTab('home');
    setShowLoginPage(false);
  };

  // Show login page if requested
  if (showLoginPage) {
    return (
      <LoginPage 
        onLogin={handleLoginSuccess}
        onClose={() => {
          setShowLoginPage(false);
          setActiveTab('home'); // Go back to home
        }}
        showCloseButton={true}
        referralCode={referralCode}
      />
    );
  }

  // Render current page based on active tab
  const renderCurrentPage = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage />;
      case 'local':
        return <LocalRecommendationsPage />;
      case 'events':
        return <EventsPage />;
      case 'my':
        // Double-check auth for MyPage
        return isLoggedIn ? (
          <MyPage onLogout={handleLogout} />
        ) : (
          <LoginPage 
            onLogin={handleLoginSuccess}
            onClose={() => setActiveTab('home')}
            showCloseButton={true}
            referralCode={referralCode}
          />
        );
      case 'marketer':
        return <MarketerPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile app container */}
      <div className="max-w-md mx-auto min-h-screen bg-white relative">
        {/* Page content */}
        <main className="pb-16">
          {renderCurrentPage()}
        </main>

        {/* Bottom Navigation */}
        <BottomNavigation 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
        />
      </div>
      
      {/* Popup Banner */}
      <PopupBanner />
      
      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}

// Main App component with AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}