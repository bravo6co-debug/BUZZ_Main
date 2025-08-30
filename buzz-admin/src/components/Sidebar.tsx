import { cn } from './ui/utils'
import { Button } from './ui/button'
import { 
  BarChart3, 
  CreditCard, 
  Users, 
  Store, 
  Calculator, 
  FileText, 
  Settings, 
  UserCog,
  Bell,
  Search,
  LogOut,
  Star
} from 'lucide-react'

interface User {
  email: string
  name: string
  role: 'super_admin' | 'admin'
  permissions: string[]
}

interface SidebarProps {
  activeModule: string
  setActiveModule: (module: string) => void
  user: User
  onLogout: () => void
}

const menuItems = [
  { id: 'dashboard', label: '대시보드', icon: BarChart3 },
  { id: 'budget', label: '예산관리', icon: CreditCard },
  { id: 'referral', label: '리퍼럴관리', icon: Users },
  { id: 'store', label: '매장관리', icon: Store },
  { id: 'settlement', label: '정산관리', icon: Calculator },
  { id: 'content', label: '컨텐츠관리', icon: FileText },
  { id: 'review', label: '리뷰관리', icon: Star },
  { id: 'system', label: '시스템설정', icon: Settings },
  { id: 'user', label: '사용자관리', icon: UserCog },
]

export function Sidebar({ activeModule, setActiveModule, user, onLogout }: SidebarProps) {
  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl text-foreground">BUZZ 관리시스템</h1>
        <p className="text-sm text-muted-foreground mt-1">Admin Dashboard</p>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="메뉴 검색..."
            className="w-full pl-10 pr-4 py-2 bg-input-background rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.id}
                variant={activeModule === item.id ? 'default' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3 h-10',
                  activeModule === item.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-foreground hover:bg-accent'
                )}
                onClick={() => setActiveModule(item.id)}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Button>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground text-sm">
              {user.name.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user.role === 'super_admin' ? '최고관리자' : '관리자'} • {user.email}
            </p>
          </div>
        </div>
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
            <Bell className="w-4 h-4" />
            알림 설정
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </Button>
        </div>
      </div>
    </div>
  )
}