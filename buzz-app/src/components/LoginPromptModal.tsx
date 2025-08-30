import { LogIn, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  message?: string;
}

export default function LoginPromptModal({
  isOpen,
  onClose,
  onLogin,
  message = "이 기능을 사용하려면 로그인이 필요합니다"
}: LoginPromptModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">로그인이 필요합니다</DialogTitle>
          <DialogDescription className="text-center pt-4">
            {message}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="text-center">
            <div className="text-4xl mb-4">🔒</div>
            <p className="text-sm text-gray-600 mb-6">
              로그인하시면 다음과 같은 기능을 사용할 수 있습니다:
            </p>
            <ul className="text-sm text-left space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>쿠폰 발급 및 사용</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>리뷰 작성 및 포인트 적립</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>마일리지 적립 및 사용</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>커뮤니티 활동</span>
              </li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={onLogin}
              className="w-full"
              size="lg"
            >
              <LogIn className="mr-2 h-4 w-4" />
              로그인
            </Button>
            
            <Button 
              onClick={onLogin}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              회원가입
            </Button>
          </div>
          
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full"
          >
            나중에 하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}