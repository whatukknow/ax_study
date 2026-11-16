// [클라이언트 컴포넌트] 로그인한 사용자 이메일 + 로그아웃 버튼
// 왜 client? → 브라우저에서 Supabase 의 로그인 상태 변화(onAuthStateChange)를 구독(useEffect)하고,
//             그 결과를 상태(useState)로 화면에 반영해야 하기 때문.
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaSignOutAlt, FaUserCircle } from 'react-icons/fa';
import { createClient } from '@/utils/supabase/client';
import { logout } from '@/app/actions';
import SubmitButton from '@/app/components/SubmitButton';

interface UserProfileProps {
  initialEmail: string | null; // 서버에서 미리 확인한 이메일 (첫 화면에 바로 표시)
}

export default function UserProfile({ initialEmail }: UserProfileProps) {
  // 화면에 보여줄 이메일 (처음엔 서버가 준 값)
  const [email, setEmail] = useState<string | null>(initialEmail);
  // 페이지 이동용 라우터
  const router = useRouter();

  useEffect(() => {
    // 브라우저용 Supabase 클라이언트 생성
    const supabase = createClient();

    // 로그인 상태가 바뀔 때마다 호출될 콜백 등록 (토큰 갱신, 로그아웃 등)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // 세션이 있으면 그 이메일, 없으면 null
      setEmail(session?.user.email ?? null);

      // 브라우저 쪽에서 로그아웃이 감지되면 로그인 페이지로 이동
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    // 클린업: 컴포넌트가 사라질 때 구독 해제 (안 하면 리스너가 계속 쌓여 메모리 누수)
    return () => {
      subscription.unsubscribe();
    };
    // 의존성: router 는 앱 전체에서 같은 객체라 사실상 마운트 시 1번만 실행된다
  }, [router]);

  return (
    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
      <p className="flex items-center gap-2 text-sm text-gray-600">
        <FaUserCircle className="text-lg" />
        {email ?? '로그인 정보 없음'}
      </p>

      {/* 로그아웃 서버 액션: 쿠키 삭제 후 /login 으로 redirect */}
      <form action={logout}>
        <SubmitButton
          pendingText="로그아웃 중..."
          className="text-gray-600 hover:bg-gray-100"
        >
          <FaSignOutAlt /> 로그아웃
        </SubmitButton>
      </form>
    </div>
  );
}
