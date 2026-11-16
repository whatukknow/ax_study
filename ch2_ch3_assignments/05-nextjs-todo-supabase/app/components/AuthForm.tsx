// [클라이언트 컴포넌트] 로그인 / 회원가입 공용 폼 (mode 로 구분)
// 왜 client? → "비밀번호 보기" 토글을 useState 로 관리하는 상호작용이 있기 때문.
//             실제 로그인/가입은 props 로 받은 서버 액션(action)이 서버에서 처리한다.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import SubmitButton from '@/app/components/SubmitButton';
import ErrorMessage from '@/app/components/ErrorMessage';

// 화면 모드: 'login' 또는 'signup' 두 값만 허용 (유니온 타입)
type AuthMode = 'login' | 'signup';

interface AuthFormProps {
  mode: AuthMode;
  action: (formData: FormData) => Promise<void>; // 서버 액션 (login 또는 signup)
  errorMessage?: string; // 실패 시 보여줄 문구
  infoMessage?: string; // 안내 문구 (예: 메일 확인 요청)
}

// 모드별로 바뀌는 글자를 한곳에 모아둔 객체
const TEXT: Record<AuthMode, { title: string; submit: string; pending: string; switchText: string; switchHref: string; switchLabel: string }> = {
  login: {
    title: '로그인',
    submit: '로그인',
    pending: '로그인 중...',
    switchText: '아직 계정이 없나요?',
    switchHref: '/signup',
    switchLabel: '회원가입',
  },
  signup: {
    title: '회원가입',
    submit: '가입하기',
    pending: '가입 중...',
    switchText: '이미 계정이 있나요?',
    switchHref: '/login',
    switchLabel: '로그인',
  },
};

export default function AuthForm({
  mode,
  action,
  errorMessage,
  infoMessage,
}: AuthFormProps) {
  // 비밀번호를 글자로 보여줄지 여부
  const [showPassword, setShowPassword] = useState(false);

  // 현재 모드의 문구 세트
  const text = TEXT[mode];

  return (
    <section className="max-w-sm mx-auto my-6 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
      <h1 className="text-2xl font-bold mb-4 text-center">{text.title}</h1>

      {/* 안내/오류 문구 (있을 때만) */}
      {infoMessage && (
        <p className="mb-4 p-3 rounded-lg bg-blue-50 text-blue-700 text-sm">
          {infoMessage}
        </p>
      )}
      {errorMessage && (
        <div className="mb-4">
          <ErrorMessage message={errorMessage} />
        </div>
      )}

      {/* 제출하면 action(formData) 서버 액션이 실행된다 */}
      <form action={action} className="space-y-3">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            비밀번호 (6자 이상)
          </label>
          <div className="flex gap-2">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
            {/* 이전 값을 뒤집는 함수형 업데이트 */}
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              className="px-3 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <SubmitButton
          pendingText={text.pending}
          className="w-full bg-blue-500 text-white hover:bg-blue-600"
        >
          {text.submit}
        </SubmitButton>
      </form>

      {/* 반대 모드 페이지로 이동하는 링크 */}
      <p className="mt-4 text-center text-sm text-gray-500">
        {text.switchText}{' '}
        <Link href={text.switchHref} className="text-blue-500 hover:underline">
          {text.switchLabel}
        </Link>
      </p>
    </section>
  );
}
