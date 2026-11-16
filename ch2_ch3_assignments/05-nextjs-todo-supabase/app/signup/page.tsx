// [서버 컴포넌트] 회원가입 페이지 ( /signup )
// 로그인 페이지와 같은 AuthForm 을 mode="signup" 으로 재사용한다 (컴포넌트 재사용).
import AuthForm from '@/app/components/AuthForm';
import { signup } from '@/app/actions';
import { getAuthErrorMessage } from '@/utils/authMessages';

interface SignupPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  // 예: /signup?error=signup_failed
  const { error } = await searchParams;

  return (
    <AuthForm
      mode="signup"
      action={signup}
      errorMessage={getAuthErrorMessage(error)}
    />
  );
}
