// [서버 컴포넌트] 랜딩 페이지 ( / )
// 서버에서 로그인 여부를 확인해 바로 redirect 할 수 있으므로 서버 컴포넌트로 만든다.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FaCheckCircle } from 'react-icons/fa';
import { createClient } from '@/utils/supabase/server';

export default async function HomePage() {
  // 이 요청의 쿠키로 Supabase 클라이언트 생성
  const supabase = await createClient();

  // 로그인 사용자 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 이미 로그인했다면 랜딩을 보여줄 필요 없이 목록으로 이동
  if (user) {
    redirect('/todos');
  }

  // 비로그인 사용자에게 보여줄 소개 화면
  return (
    <section className="max-w-md mx-auto my-6 p-8 bg-white border border-gray-200 rounded-xl shadow-sm text-center">
      <FaCheckCircle className="mx-auto mb-4 text-5xl text-blue-500" />
      <h1 className="text-2xl font-bold mb-2">Supabase Todo</h1>
      <p className="text-gray-500 mb-6">
        로그인하면 나만의 할 일 목록을 관리할 수 있어요.
      </p>

      {/* next/link: 페이지 전체를 새로 받지 않고 필요한 부분만 바꾸는 클라이언트 이동 */}
      <div className="flex justify-center gap-3">
        <Link
          href="/login"
          className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
        >
          로그인
        </Link>
        <Link
          href="/signup"
          className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
        >
          회원가입
        </Link>
      </div>
    </section>
  );
}
