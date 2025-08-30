export interface AdminUser {
  id: string
  email: string
  password: string
  name: string
  role: 'super_admin' | 'admin'
  department: string
  status: 'active' | 'inactive'
  createdAt: string
  lastLogin?: string
  permissions: string[]
}

// 초기 최고관리자 계정 (변경 불가)
export const SUPER_ADMIN: AdminUser = {
  id: 'super-admin-001',
  email: 'superadmin@company.com',
  password: 'SuperAdmin123!',
  name: '최고관리자',
  role: 'super_admin',
  department: '시스템관리',
  status: 'active',
  createdAt: '2024-01-01',
  permissions: ['all']
}

// 생성된 관리자 계정들 (로컬스토리지에 저장됨)
export const getAdminUsers = (): AdminUser[] => {
  const saved = localStorage.getItem('admin_users')
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      return []
    }
  }
  return []
}

export const saveAdminUsers = (users: AdminUser[]) => {
  localStorage.setItem('admin_users', JSON.stringify(users))
}

export const getAllAdminUsers = (): AdminUser[] => {
  return [SUPER_ADMIN, ...getAdminUsers()]
}

export const findAdminUser = (email: string, password: string): AdminUser | null => {
  const allUsers = getAllAdminUsers()
  return allUsers.find(user => 
    user.email === email && 
    user.password === password && 
    user.status === 'active'
  ) || null
}

export const createAdminUser = (userData: Omit<AdminUser, 'id' | 'createdAt'>): AdminUser => {
  const newUser: AdminUser = {
    ...userData,
    id: `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString().split('T')[0]
  }
  
  const currentUsers = getAdminUsers()
  const updatedUsers = [...currentUsers, newUser]
  saveAdminUsers(updatedUsers)
  
  return newUser
}

export const updateAdminUser = (id: string, updates: Partial<AdminUser>): boolean => {
  if (id === SUPER_ADMIN.id) {
    return false // 최고관리자는 수정 불가
  }
  
  const currentUsers = getAdminUsers()
  const userIndex = currentUsers.findIndex(user => user.id === id)
  
  if (userIndex === -1) return false
  
  currentUsers[userIndex] = { ...currentUsers[userIndex], ...updates }
  saveAdminUsers(currentUsers)
  
  return true
}

export const deleteAdminUser = (id: string): boolean => {
  if (id === SUPER_ADMIN.id) {
    return false // 최고관리자는 삭제 불가
  }
  
  const currentUsers = getAdminUsers()
  const filteredUsers = currentUsers.filter(user => user.id !== id)
  saveAdminUsers(filteredUsers)
  
  return true
}

// 기본 권한 목록
export const AVAILABLE_PERMISSIONS = [
  'dashboard_view',
  'budget_manage',
  'referral_manage', 
  'store_manage',
  'settlement_manage',
  'content_manage',
  'system_settings',
  'user_manage'
]

export const PERMISSION_LABELS = {
  dashboard_view: '대시보드 조회',
  budget_manage: '예산 관리',
  referral_manage: '리퍼럴 관리',
  store_manage: '매장 관리', 
  settlement_manage: '정산 관리',
  content_manage: '컨텐츠 관리',
  system_settings: '시스템 설정',
  user_manage: '사용자 관리'
}