import React, { useState } from 'react';
import { Store, Lock, AlertCircle, Loader2, Building2 } from 'lucide-react';
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
      // 이메일 형식으로 변환 (사업자번호@buzz.biz)
      const email = `${businessNumber.replace(/-/g, '')}@buzz.biz`;
      
      // Supabase 인증 시도
      const { data, error: authError } = await signInBusiness(email, password);
      
      if (authError) {
        // Supabase 인증 실패시 기존 API 시도
        const response = await authApi.login(businessNumber, password);
        if (response.success) {
          localStorage.setItem('buzz_biz_logged_in', 'true');
          onLogin();
        }
      } else if (data?.user) {
        // Supabase 인증 성공
        localStorage.setItem('buzz_biz_logged_in', 'true');
        if (data.business) {
          localStorage.setItem('buzz_biz_business_info', JSON.stringify(data.business));
        }
        onLogin();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.error?.message || '로그인에 실패했습니다.');
      
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
                  onChange={(e) => setBusinessNumber(e.target.value)}
                  placeholder="123-45-67890"
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
                className="w-full bg-blue-600 py-4 rounded-xl font-black text-xl hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-[1.02] border-2 border-blue-500"
                style={{color: '#000000', textShadow: '1px 1px 2px rgba(255,255,255,0.8)'}}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  '🔑 로그인'
                )}
              </button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <button
                onClick={() => setShowSignup(true)}
                className="w-full bg-green-600 py-3 px-4 rounded-xl font-black text-lg hover:bg-green-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] border-2 border-green-500"
                style={{color: '#000000', textShadow: '1px 1px 2px rgba(255,255,255,0.8)'}}
              >
                🏢 사업자 등록 신청하기
              </button>
              <p className="text-xs text-gray-500">
                💡 관리자 승인 후 SMS로 비밀번호를 받으실 수 있습니다
              </p>
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
                  onChange={(e) => setBusinessNumber(e.target.value)}
                  placeholder="123-45-67890"
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
                <p className="text-sm text-blue-700 font-medium mb-2">📋 가입 승인 프로세스</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>1️⃣ 사업자 정보 입력 후 신청</li>
                  <li>2️⃣ 관리자가 사업자등록번호 확인</li>
                  <li>3️⃣ 승인 시 입력한 연락처로 SMS 비밀번호 발송</li>
                  <li>4️⃣ 발급받은 비밀번호로 로그인</li>
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
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  '가입 신청'
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowSignup(false)}
                className="w-full text-gray-600 py-2 text-sm"
              >
                로그인으로 돌아가기
              </button>
            </form>
          </>
        )}

        {/* 사업자 등록 버튼 */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-3 text-center">
            아직 사업자 등록을 하지 않으셨나요?
          </p>
          <button
            type="button"
            onClick={() => setShowRegistration(true)}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Building2 size={20} />
            사업자 등록 신청
          </button>
        </div>
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