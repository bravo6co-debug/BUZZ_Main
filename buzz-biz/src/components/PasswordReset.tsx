import React, { useState } from 'react';
import { Lock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PasswordResetProps {
  onSuccess: () => void;
  onCancel?: () => void;
  isFirstLogin?: boolean;
}

export function PasswordReset({ onSuccess, onCancel, isFirstLogin = false }: PasswordResetProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return '비밀번호는 최소 8자 이상이어야 합니다.';
    }
    if (!/[A-Z]/.test(password)) {
      return '비밀번호에 대문자를 포함해야 합니다.';
    }
    if (!/[a-z]/.test(password)) {
      return '비밀번호에 소문자를 포함해야 합니다.';
    }
    if (!/[0-9]/.test(password)) {
      return '비밀번호에 숫자를 포함해야 합니다.';
    }
    if (!/[!@#$%^&*]/.test(password)) {
      return '비밀번호에 특수문자(!@#$%^&*)를 포함해야 합니다.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 비밀번호 일치 확인
    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    // 비밀번호 유효성 검사
    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      // Supabase를 통한 비밀번호 업데이트
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      // 첫 로그인 플래그 제거
      if (isFirstLogin) {
        await supabase.auth.updateUser({
          data: { needs_password_change: false }
        });
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isFirstLogin ? '비밀번호 설정' : '비밀번호 변경'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isFirstLogin 
              ? '첫 로그인입니다. 보안을 위해 새 비밀번호를 설정해주세요.'
              : '안전한 비밀번호로 변경해주세요.'}
          </p>
        </div>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            <p className="text-green-800">비밀번호가 성공적으로 변경되었습니다!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isFirstLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  현재 비밀번호
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                새 비밀번호
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="최소 8자, 대소문자, 숫자, 특수문자 포함"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                새 비밀번호 확인
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  '비밀번호 변경'
                )}
              </button>

              {onCancel && !isFirstLogin && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">안전한 비밀번호 요구사항:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 최소 8자 이상</li>
                <li>• 대문자 포함 (A-Z)</li>
                <li>• 소문자 포함 (a-z)</li>
                <li>• 숫자 포함 (0-9)</li>
                <li>• 특수문자 포함 (!@#$%^&*)</li>
              </ul>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default PasswordReset;