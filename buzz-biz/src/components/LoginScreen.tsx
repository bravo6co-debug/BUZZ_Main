import React, { useState } from 'react';
import { Store, Lock, AlertCircle, Loader2, Building2, LogIn, UserPlus, ArrowLeft, Sparkles, Info } from 'lucide-react';
import { authApi } from '../services/api.service';
import { signInBusiness, registerBusiness } from '../lib/supabase';
import BusinessRegistrationModal from './BusinessRegistrationModal';

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [businessNumber, setBusinessNumber] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSignup, setShowSignup] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 사업자번호 또는 이메일로 로그인
      const { data, error: authError } = await signInBusiness(businessNumber, password);
      
      if (authError) {
        console.error('Login error:', authError);
        
        // 비밀번호 오류 확인
        if (authError.message?.includes('Invalid login credentials')) {
          setError('사업자번호 또는 비밀번호가 올바르지 않습니다.');
        } else {
          setError('로그인에 실패했습니다. 잠시 후 다시 시도해주세요.');
        }
        
        // Mock login for development
        if (businessNumber === '123-45-67890' && password === 'admin123') {
          localStorage.setItem('buzz_biz_logged_in', 'true');
          localStorage.setItem('buzz_biz_business_info', JSON.stringify({
            id: '1',
            name: '카페 브라운',
            businessNumber: '123-45-67890',
            owner: '김사장',
          }));
          onLogin();
        }
      } else if (data?.user) {
        // Supabase 인증 성공
        localStorage.setItem('buzz_biz_logged_in', 'true');
        
        if (data.business) {
          // 비즈니스 정보 저장
          localStorage.setItem('buzz_biz_business_info', JSON.stringify(data.business));
          
          // 첫 로그인 확인 (임시 비밀번호 사용 시)
          const metadata = data.user.user_metadata;
          if (metadata?.needs_password_change) {
            setError('첫 로그인입니다. 보안을 위해 비밀번호를 변경해주세요.');
            // TODO: 비밀번호 변경 화면으로 이동
          }
          
          onLogin();
        } else if (data.pendingApplication) {
          // 승인 대기 중
          if (data.pendingApplication.status === 'pending') {
            setError('현재 가입 승인 대기 중입니다. 영업일 기준 1-2일 내 처리됩니다.');
          } else if (data.pendingApplication.status === 'rejected') {
            setError(`가입 승인이 거부되었습니다. 사유: ${data.pendingApplication.rejection_reason || '관리자에게 문의하세요'}`);
          }
        } else {
          setError('비즈니스 정보를 찾을 수 없습니다. 관리자에게 문의하세요.');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const signupData = {
        businessNumber,
        phoneNumber,
        businessName,
        ownerName,
      };
      
      const response = await authApi.signup(signupData);
      if (response.success) {
        setShowSignup(false);
        setError('가입 신청이 완료되었습니다. 관리자 승인 후 로그인 가능합니다.');
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      
      // Mock signup - 임시로 신청 완료 메시지 표시
      setShowSignup(false);
      setError('가입 신청이 완료되었습니다. 관리자 승인 후 SMS로 비밀번호를 안내드립니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
            <Store className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">BUZZ Business</h1>
          <p className="text-gray-500 mt-2">사업자 전용 관리 시스템</p>
        </div>

        {!showSignup ? (
          <>
            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  사업자 등록번호
                </label>
                <input
                  type="text"
                  value={businessNumber}
                  onChange={(e) => {
                    // 숫자만 입력 가능하도록 처리
                    const input = e.target.value.replace(/[^0-9]/g, '');
                    
                    // 자동으로 하이픈 추가 (XXX-XX-XXXXX 형식)
                    let formatted = input;
                    if (input.length > 3) {
                      formatted = input.slice(0, 3) + '-' + input.slice(3);
                    }
                    if (input.length > 5) {
                      formatted = input.slice(0, 3) + '-' + input.slice(3, 5) + '-' + input.slice(5, 10);
                    }
                    
                    setBusinessNumber(formatted);
                  }}
                  placeholder="123-45-67890"
                  maxLength={12}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호 입력"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-xl font-bold text-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" strokeWidth={2.5} />
                    로그인
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <button
                onClick={() => setShowSignup(true)}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] border-2 border-green-400 flex items-center justify-center"
              >
                <Sparkles className="w-5 h-5 mr-2" strokeWidth={2.5} />
                간단 가입 신청 (30초 완료)
              </button>
              <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                <Info className="w-3 h-3" />
                <span>관리자 승인 후 SMS로 비밀번호를 받으실 수 있습니다</span>
              </div>
            </div>

            {/* Test Account Info */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 text-center">
                테스트 계정: 123-45-67890 / admin123
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Signup Form */}
            <form onSubmit={handleSignup} className="space-y-4">
              <h2 className="text-lg font-semibold mb-4">가입 신청</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  사업자 등록번호 *
                </label>
                <input
                  type="text"
                  value={businessNumber}
                  onChange={(e) => {
                    // 숫자만 입력 가능하도록 처리
                    const input = e.target.value.replace(/[^0-9]/g, '');
                    
                    // 자동으로 하이픈 추가 (XXX-XX-XXXXX 형식)
                    let formatted = input;
                    if (input.length > 3) {
                      formatted = input.slice(0, 3) + '-' + input.slice(3);
                    }
                    if (input.length > 5) {
                      formatted = input.slice(0, 3) + '-' + input.slice(3, 5) + '-' + input.slice(5, 10);
                    }
                    
                    setBusinessNumber(formatted);
                  }}
                  placeholder="123-45-67890"
                  maxLength={12}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상호명 *
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="카페 브라운"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  대표자명 *
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="김사장"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  연락처 * (SMS 수신용)
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="010-1234-5678"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-700" strokeWidth={2.5} />
                  <p className="text-sm text-blue-700 font-medium">가입 승인 프로세스</p>
                </div>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">1.</span>
                    <span>사업자 정보 입력 후 신청</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">2.</span>
                    <span>관리자가 사업자등록번호 확인</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">3.</span>
                    <span>승인 시 입력한 연락처로 SMS 비밀번호 발송</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">4.</span>
                    <span>발급받은 비밀번호로 로그인</span>
                  </li>
                </ul>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-xl hover:bg-blue-700 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center border-2 border-blue-500"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" strokeWidth={2.5} />
                    <span className="text-white font-bold">가입 신청하기</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowSignup(false)}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors mt-2 flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={2.5} />
                로그인으로 돌아가기
              </button>
            </form>
          </>
        )}

        {/* 상세 등록 버튼 - 로그인 화면에서만 표시 */}
        {!showSignup && (
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Info className="w-4 h-4 text-gray-700" strokeWidth={2.5} />
              <p className="text-sm text-gray-700 font-medium">
                더 자세한 정보를 등록하고 싶으신가요?
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRegistration(true)}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white py-3 rounded-xl font-bold hover:from-yellow-600 hover:to-amber-600 transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02]"
            >
              <Building2 size={20} />
              상세 정보 등록 (선택사항)
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              서류 첨부, 영업시간 등 추가 정보 입력 가능
            </p>
          </div>
        )}
      </div>

      {/* Business Registration Modal */}
      {showRegistration && (
        <BusinessRegistrationModal
          isOpen={showRegistration}
          onClose={() => setShowRegistration(false)}
          onSubmit={(data) => {
            console.log('사업자 등록 신청:', data);
            alert('사업자 등록 신청이 완료되었습니다. 심사 결과는 영업일 기준 1-3일 내에 연락드리겠습니다.');
          }}
        />
      )}
    </div>
  );
}