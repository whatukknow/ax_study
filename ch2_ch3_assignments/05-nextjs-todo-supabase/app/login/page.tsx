// [서버 컴포넌트] 로그인 페이지 ( /login )
// 주소의 ?error= / ?message= 값을 서버에서 읽어 문구로 바꾼 뒤, 입력 폼(AuthForm, 클라이언트)에 넘겨준다.
import AuthForm from '@/app/components/AuthForm';
import { login } from '@/app/actions';
import { getAuthErrorMessage, getAuthInfoMessage } from '@/utils/authMessages';

// Next.js 15+ 에서 searchParams 는 Promise 이므로 await 해서 꺼낸다
interface LoginPageProps {
  searchParams: Promise<{ error?: string; message?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // 예: /login?error=login_failed → error = 'login_failed'
  const { error, message } = await searchParams;

  return (
    <AuthForm
      mode="login"
      action={login}
      errorMessage={getAuthErrorMessage(error)}
      infoMessage={getAuthInfoMessage(message)}
    />
  );
}
