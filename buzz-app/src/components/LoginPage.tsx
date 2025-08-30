import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { signInWithEmail, signUp } from "../lib/supabase";
import { toast } from "sonner";
import { X } from "lucide-react";

interface LoginPageProps {
  onLogin: () => void;
  onClose?: () => void;  // Optional close handler
  showCloseButton?: boolean;  // Whether to show close button
  referralCode?: string | null;  // Referral code from invitation link
}

export default function LoginPage({ onLogin, onClose, showCloseButton = false, referralCode }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailConfirmationPending, setEmailConfirmationPending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("이메일과 비밀번호를 입력해주세요");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await signInWithEmail(email, password);
      
      if (error) {
        // Check if it's an email confirmation error
        if (error.message === 'Email not confirmed') {
          setEmailConfirmationPending(true);
          setPendingEmail(email);
          toast.error("이메일 인증이 필요합니다. 가입하신 이메일을 확인해주세요.");
        } else {
          toast.error(error.message || "로그인에 실패했습니다");
        }
        console.error("Login error:", error);
      } else if (data?.user) {
        toast.success("로그인 성공!");
        onLogin();
      }
    } catch (error) {
      toast.error("로그인 중 오류가 발생했습니다");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !name) {
      toast.error("모든 필드를 입력해주세요");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다");
      return;
    }

    if (password.length < 6) {
      toast.error("비밀번호는 최소 6자 이상이어야 합니다");
      return;
    }

    setIsLoading(true);
    try {
      // Include referral code in signup metadata
      const metadata: any = { name };
      if (referralCode) {
        metadata.referralCode = referralCode;
        console.log('Signing up with referral code:', referralCode);
      }
      
      const { data, error } = await signUp(email, password, metadata);
      
      if (error) {
        toast.error(error.message || "회원가입에 실패했습니다");
        console.error("Signup error:", error);
      } else if (data?.user) {
        // Set email confirmation pending state
        setEmailConfirmationPending(true);
        setPendingEmail(email);
        
        // Clear stored referral code after successful signup
        if (referralCode) {
          localStorage.removeItem('referralCode');
          toast.success("리퍼럴 가입 성공! 이메일을 확인하여 계정을 활성화해주세요.");
        } else {
          toast.success("회원가입 성공! 이메일을 확인하여 계정을 활성화해주세요.");
        }
      }
    } catch (error) {
      toast.error("회원가입 중 오류가 발생했습니다");
      console.error("Signup error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md relative">
        {/* Close button */}
        {showCloseButton && onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 z-10 bg-white/80 backdrop-blur-sm hover:bg-white/90"
            onClick={onClose}
          >
            <X size={24} />
          </Button>
        )}
        
        {/* App Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📱</div>
          <h1 className="text-3xl font-bold text-primary mb-2">BUZZ</h1>
          <p className="text-muted-foreground">지역 기반 모바일 서비스</p>
        </div>

        {/* Email Confirmation Pending Notice */}
        {emailConfirmationPending && (
          <Card className="mb-4 border-yellow-400 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📧</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 mb-1">이메일 확인 필요</h3>
                  <p className="text-sm text-yellow-800 mb-2">
                    {pendingEmail}로 인증 메일을 발송했습니다.
                  </p>
                  <p className="text-xs text-yellow-700">
                    이메일을 확인하여 계정을 활성화해주세요. 
                    인증 완료 후 로그인이 가능합니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Login/Signup Form */}
        <Card>
          <CardHeader className="text-center pb-4">
            <h2>시작하기</h2>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">로그인</TabsTrigger>
                <TabsTrigger value="signup">회원가입</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4 mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">이메일</label>
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">비밀번호</label>
                    <Input
                      type="password"
                      placeholder="비밀번호를 입력하세요"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "로그인 중..." : "로그인"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4 mt-6">
                {/* Referral code notification */}
                {referralCode && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center">
                      <span className="text-green-600 text-sm font-medium">
                        🎉 리퍼럴 코드: {referralCode}
                      </span>
                    </div>
                    <p className="text-green-700 text-xs mt-1">
                      회원가입 시 특별 혜택을 받으실 수 있습니다!
                    </p>
                  </div>
                )}
                
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">이름</label>
                    <Input
                      type="text"
                      placeholder="이름을 입력하세요"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">이메일</label>
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">비밀번호</label>
                    <Input
                      type="password"
                      placeholder="비밀번호를 입력하세요"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">비밀번호 확인</label>
                    <Input
                      type="password"
                      placeholder="비밀번호를 다시 입력하세요"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "회원가입 중..." : "회원가입"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Quick Login for Demo or Close button */}
            <div className="mt-6 pt-4 border-t">
              {showCloseButton && onClose ? (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={onClose}
                >
                  닫기
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={onLogin}
                >
                  🚀 빠른 체험하기
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}