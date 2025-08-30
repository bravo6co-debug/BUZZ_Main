import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { Eye, EyeOff, Shield } from 'lucide-react'
import { signInAdmin } from '../lib/supabase'

interface LoginProps {
  onLogin: (email: string, password: string) => boolean
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // 간단한 validation
    if (!email || !password) {
      setError('이메일과 비밀번호를 모두 입력해주세요.')
      setIsLoading(false)
      return
    }

    try {
      // 먼저 로컬 관리자 계정 확인
      const localSuccess = onLogin(email, password)
      
      if (localSuccess) {
        // 로컬 로그인 성공
        setIsLoading(false)
        return
      }
      
      // 로컬 로그인 실패시 Supabase 시도
      const { data, error: authError } = await signInAdmin(email, password)
      
      if (authError || !data) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
        setIsLoading(false)
        return
      }

      // Supabase 로그인 성공
      const success = onLogin(email, password)
      if (!success) {
        setError('로그인 처리 중 오류가 발생했습니다.')
      }
    } catch (err) {
      console.error('Login error:', err)
      // 로컬 로그인 폴백
      const localSuccess = onLogin(email, password)
      if (!localSuccess) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-center">관리자 로그인</CardTitle>
          <CardDescription className="text-center">
            BUZZ 관리자 시스템에 로그인하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 border border-border rounded"
              />
              <Label htmlFor="remember" className="text-sm">
                로그인 상태 유지
              </Label>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </Button>
          </form>
          <div className="space-y-2">
            <div className="text-center">
              <p className="text-muted-foreground">
                최고관리자: superadmin@company.com / SuperAdmin123!
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                관리자 계정은 최고관리자가 생성합니다
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}