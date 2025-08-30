import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog'
import { Checkbox } from './ui/checkbox'
import { StatsCard } from './shared/StatsCard'
import { SearchAndFilter } from './shared/SearchAndFilter'
import { ActionButtons } from './shared/ActionButtons'
import { toast } from 'sonner@2.0.3'
import { 
  Users, 
  Edit,
  Trash2,
  Plus,
  Shield,
  Activity,
  Calendar,
  Eye,
  EyeOff,
  Key
} from 'lucide-react'
import { 
  getAllAdminUsers, 
  createAdminUser, 
  updateAdminUser, 
  deleteAdminUser, 
  AdminUser,
  AVAILABLE_PERMISSIONS,
  PERMISSION_LABELS,
  SUPER_ADMIN
} from '../data/adminData'
import { members } from '../data/systemData'

export function UserManagement() {
  const [activeTab, setActiveTab] = useState('admins')
  const [searchTerm, setSearchTerm] = useState('')
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})

  // 새 관리자 생성 폼 상태
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
    name: '',
    department: '',
    role: 'admin' as const,
    permissions: [] as string[]
  })

  useEffect(() => {
    loadAdminUsers()
  }, [])

  const loadAdminUsers = () => {
    setAdminUsers(getAllAdminUsers())
  }

  const handleCreateAdmin = async () => {
    if (!newAdmin.email || !newAdmin.password || !newAdmin.name || !newAdmin.department) {
      toast.error('모든 필드를 입력해주세요.')
      return
    }

    if (newAdmin.permissions.length === 0) {
      toast.error('최소 하나의 권한을 선택해주세요.')
      return
    }

    // 이메일 중복 체크
    const existingUser = adminUsers.find(user => user.email === newAdmin.email)
    if (existingUser) {
      toast.error('이미 존재하는 이메일입니다.')
      return
    }

    try {
      createAdminUser({
        ...newAdmin,
        status: 'active'
      })
      
      loadAdminUsers()
      setIsCreateDialogOpen(false)
      setNewAdmin({
        email: '',
        password: '',
        name: '',
        department: '',
        role: 'admin',
        permissions: []
      })
      
      toast.success('관리자 계정이 생성되었습니다.')
    } catch (error) {
      toast.error('관리자 계정 생성에 실패했습니다.')
    }
  }

  const handleUpdateAdmin = () => {
    if (!editingAdmin) return

    try {
      updateAdminUser(editingAdmin.id, editingAdmin)
      loadAdminUsers()
      setIsEditDialogOpen(false)
      setEditingAdmin(null)
      toast.success('관리자 정보가 수정되었습니다.')
    } catch (error) {
      toast.error('관리자 정보 수정에 실패했습니다.')
    }
  }

  const handleDeleteAdmin = (admin: AdminUser) => {
    if (admin.id === SUPER_ADMIN.id) {
      toast.error('최고관리자는 삭제할 수 없습니다.')
      return
    }

    try {
      deleteAdminUser(admin.id)
      loadAdminUsers()
      toast.success('관리자 계정이 삭제되었습니다.')
    } catch (error) {
      toast.error('관리자 계정 삭제에 실패했습니다.')
    }
  }

  const handlePermissionChange = (permission: string, checked: boolean) => {
    if (checked) {
      setNewAdmin(prev => ({
        ...prev,
        permissions: [...prev.permissions, permission]
      }))
    } else {
      setNewAdmin(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => p !== permission)
      }))
    }
  }

  const handleEditPermissionChange = (permission: string, checked: boolean) => {
    if (!editingAdmin) return
    
    if (checked) {
      setEditingAdmin(prev => prev ? ({
        ...prev,
        permissions: [...prev.permissions, permission]
      }) : null)
    } else {
      setEditingAdmin(prev => prev ? ({
        ...prev,
        permissions: prev.permissions.filter(p => p !== permission)
      }) : null)
    }
  }

  const togglePasswordVisibility = (adminId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [adminId]: !prev[adminId]
    }))
  }

  const filteredMembers = members.filter(member => 
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredAdmins = adminUsers.filter(admin =>
    admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1>사용자관리</h1>
          <p className="text-muted-foreground mt-1">회원과 관리자 계정을 통합 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                관리자 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>관리자 계정 생성</DialogTitle>
                <DialogDescription>
                  새로운 관리자 계정을 생성합니다. 모든 필드를 입력해주세요.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">관리자명</Label>
                  <Input
                    id="name"
                    value={newAdmin.name}
                    onChange={(e) => setNewAdmin(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="홍길동"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="admin@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="보안이 강한 비밀번호"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">부서</Label>
                  <Input
                    id="department"
                    value={newAdmin.department}
                    onChange={(e) => setNewAdmin(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="운영팀"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label>권한 설정</Label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_PERMISSIONS.map((permission) => (
                    <div key={permission} className="flex items-center space-x-2">
                      <Checkbox
                        id={permission}
                        checked={newAdmin.permissions.includes(permission)}
                        onCheckedChange={(checked) => handlePermissionChange(permission, checked as boolean)}
                      />
                      <Label htmlFor={permission} className="text-sm">
                        {PERMISSION_LABELS[permission as keyof typeof PERMISSION_LABELS]}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleCreateAdmin}>
                  계정 생성
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="admins">관리자 계정 관리</TabsTrigger>
          <TabsTrigger value="members">회원 관리</TabsTrigger>
        </TabsList>

        {/* 관리자 계정 관리 */}
        <TabsContent value="admins" className="space-y-6">
          {/* 관리자 현황 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatsCard
              title="총 관리자"
              value={adminUsers.length.toString()}
              icon={Shield}
              description="활성 계정"
            />
            <StatsCard
              title="최고관리자"
              value="1"
              icon={Key}
              description="시스템 전체 권한"
            />
            <StatsCard
              title="일반관리자"
              value={(adminUsers.length - 1).toString()}
              icon={Users}
              description="제한된 권한"
            />
            <StatsCard
              title="활성 관리자"
              value={adminUsers.filter(admin => admin.status === 'active').length.toString()}
              icon={Activity}
              description="로그인 가능"
            />
          </div>

          <SearchAndFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            placeholder="관리자명 또는 이메일로 검색..."
          />

          {/* 관리자 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>관리자 계정 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>관리자</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead>비밀번호</TableHead>
                    <TableHead>부서</TableHead>
                    <TableHead>권한</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className={admin.role === 'super_admin' ? 'bg-primary text-primary-foreground' : ''}>
                              {admin.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm">{admin.name}</p>
                            {admin.role === 'super_admin' && (
                              <Badge variant="outline" className="text-xs">최고관리자</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono">
                            {showPasswords[admin.id] ? admin.password : '••••••••'}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => togglePasswordVisibility(admin.id)}
                          >
                            {showPasswords[admin.id] ? 
                              <EyeOff className="w-3 h-3" /> : 
                              <Eye className="w-3 h-3" />
                            }
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{admin.department}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {admin.permissions.includes('all') ? (
                            <Badge variant="default" className="text-xs">전체권한</Badge>
                          ) : (
                            admin.permissions.slice(0, 2).map((permission) => (
                              <Badge key={permission} variant="outline" className="text-xs">
                                {PERMISSION_LABELS[permission as keyof typeof PERMISSION_LABELS]}
                              </Badge>
                            ))
                          )}
                          {admin.permissions.length > 2 && !admin.permissions.includes('all') && (
                            <Badge variant="outline" className="text-xs">
                              +{admin.permissions.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={admin.status === 'active' ? 'default' : 'secondary'}>
                          {admin.status === 'active' ? '활성' : '비활성'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {admin.id !== SUPER_ADMIN.id && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setEditingAdmin(admin)
                                  setIsEditDialogOpen(true)
                                }}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>관리자 계정 삭제</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      "{admin.name}" 관리자 계정을 삭제하시겠습니까? 
                                      이 작업은 되돌릴 수 없습니다.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>취소</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteAdmin(admin)}>
                                      삭제
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 수정 다이얼로그 */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>관리자 계정 수정</DialogTitle>
                <DialogDescription>
                  관리자 계정 정보를 수정합니다.
                </DialogDescription>
              </DialogHeader>
              {editingAdmin && (
                <>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">관리자명</Label>
                      <Input
                        id="edit-name"
                        value={editingAdmin.name}
                        onChange={(e) => setEditingAdmin(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-email">이메일</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={editingAdmin.email}
                        onChange={(e) => setEditingAdmin(prev => prev ? ({ ...prev, email: e.target.value }) : null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-password">비밀번호</Label>
                      <Input
                        id="edit-password"
                        type="password"
                        value={editingAdmin.password}
                        onChange={(e) => setEditingAdmin(prev => prev ? ({ ...prev, password: e.target.value }) : null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-department">부서</Label>
                      <Input
                        id="edit-department"
                        value={editingAdmin.department}
                        onChange={(e) => setEditingAdmin(prev => prev ? ({ ...prev, department: e.target.value }) : null)}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>권한 설정</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {AVAILABLE_PERMISSIONS.map((permission) => (
                        <div key={permission} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-${permission}`}
                            checked={editingAdmin.permissions.includes(permission)}
                            onCheckedChange={(checked) => handleEditPermissionChange(permission, checked as boolean)}
                          />
                          <Label htmlFor={`edit-${permission}`} className="text-sm">
                            {PERMISSION_LABELS[permission as keyof typeof PERMISSION_LABELS]}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleUpdateAdmin}>
                  수정 완료
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* 회원 관리 */}
        <TabsContent value="members" className="space-y-6">
          {/* 회원 현황 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatsCard
              title="총 회원 수"
              value="124,847"
              icon={Users}
              trend={{ value: "+12.5% 전월 대비", isPositive: true }}
            />
            <StatsCard
              title="활성 회원"
              value="98,234"
              icon={Activity}
              description="78.7% 활성률"
            />
            <StatsCard
              title="신규 가입"
              value="2,847"
              icon={Calendar}
              description="이번 달"
            />
            <StatsCard
              title="정지 회원"
              value="156"
              icon={Users}
              description="0.1% 정지율"
            />
          </div>

          <SearchAndFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            placeholder="회원명 또는 이메일로 검색..."
          />

          {/* 회원 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>회원 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"><Checkbox /></TableHead>
                    <TableHead>회원명</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>가입일</TableHead>
                    <TableHead>추천수</TableHead>
                    <TableHead>포인트</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell><Checkbox /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>{member.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{member.phone}</TableCell>
                      <TableCell>{member.joinDate}</TableCell>
                      <TableCell>{member.referrals}</TableCell>
                      <TableCell>{member.points.toLocaleString()}P</TableCell>
                      <TableCell>
                        <Badge variant={member.status === 'active' ? 'default' : 'destructive'}>
                          {member.status === 'active' ? '활성' : '정지'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ActionButtons showApprove={false} showReject={false} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}