import { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { Login } from './components/Login'
import { Dashboard } from './components/Dashboard'
import { BudgetManagement } from './components/BudgetManagement'
import { ReferralManagement } from './components/ReferralManagement'
import { StoreManagement } from './components/StoreManagement'
import { SettlementManagement } from './components/SettlementManagement'
import { ContentManagement } from './components/ContentManagement'
import { ReviewManagement } from './components/ReviewManagement'
import { SystemSettings } from './components/SystemSettings'
import { UserManagement } from './components/UserManagement'
import { findAdminUser, AdminUser } from './data/adminData'

interface User {
  email: string
  name: string
  role: 'super_admin' | 'admin'
  permissions: string[]
}

export default function App() {
  const [activeModule, setActiveModule] = useState('dashboard')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  // 로컬 스토리지에서 인증 상태 확인
  useEffect(() => {
    const savedAuth = localStorage.getItem('auth')
    const savedUser = localStorage.getItem('user')
    
    if (savedAuth === 'true' && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        setIsAuthenticated(true)
        setUser(parsedUser)
      } catch (error) {
        // 저장된 데이터가 잘못된 경우 초기화
        localStorage.removeItem('auth')
        localStorage.removeItem('user')
      }
    }
  }, [])

  const handleLogin = (email: string, password: string) => {
    const adminUser = findAdminUser(email, password)
    
    if (!adminUser) {
      return false // 로그인 실패
    }
    
    // 마지막 로그인 시간 업데이트 (실제 환경에서는 API 호출)
    const userData: User = {
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
      permissions: adminUser.permissions
    }
    
    setIsAuthenticated(true)
    setUser(userData)
    
    // 로컬 스토리지에 인증 상태 저장
    localStorage.setItem('auth', 'true')
    localStorage.setItem('user', JSON.stringify(userData))
    
    return true // 로그인 성공
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setUser(null)
    setActiveModule('dashboard') // 기본 모듈로 리셋
    
    // 로컬 스토리지에서 인증 상태 제거
    localStorage.removeItem('auth')
    localStorage.removeItem('user')
  }

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard />
      case 'budget':
        return <BudgetManagement />
      case 'referral':
        return <ReferralManagement />
      case 'store':
        return <StoreManagement />
      case 'settlement':
        return <SettlementManagement />
      case 'content':
        return <ContentManagement />
      case 'review':
        return <ReviewManagement />
      case 'system':
        return <SystemSettings />
      case 'user':
        return <UserManagement />
      default:
        return <Dashboard />
    }
  }

  // 인증되지 않은 경우 로그인 화면 표시
  if (!isAuthenticated || !user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        activeModule={activeModule} 
        setActiveModule={setActiveModule}
        user={user}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {renderActiveModule()}
        </div>
      </main>
    </div>
  )
}