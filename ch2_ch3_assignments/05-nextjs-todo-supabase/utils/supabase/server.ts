// [서버 전용] 서버 컴포넌트 / 서버 액션에서 사용하는 Supabase 클라이언트 생성 함수
// 왜 서버용이 따로 있나? → 서버에는 브라우저가 없으므로, 요청에 실려 온 "쿠키"에서 로그인 세션을 읽어야 하기 때문.
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// 동시 접속 시 데이터가 섞이지 않는 이유(중요):
// - 이 함수는 "요청이 올 때마다" 새로 호출되어, 그 요청의 쿠키(=그 사용자 세션)로 새 클라이언트를 만든다.
// - 모듈 전역 변수에 클라이언트/사용자 정보를 저장하지 않으므로, A 사용자 요청과 B 사용자 요청이 서로 공유하는 상태가 없다.
// - 그리고 DB 의 RLS 정책이 auth.uid() 로 행을 걸러주므로, 코드에 실수가 있어도 남의 할 일은 DB 가 돌려주지 않는다.
export async function createClient() {
  // 현재 요청의 쿠키 저장소를 가져온다 (Next.js 15+ 에서는 await 필요)
  const cookieStore = await cookies();

  // 환경 변수의 URL 과 공개 키로 서버용 Supabase 클라이언트를 만든다
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        // Supabase 가 세션을 읽을 때: 요청의 모든 쿠키를 넘겨준다
        getAll() {
          return cookieStore.getAll();
        },
        // Supabase 가 세션(토큰)을 갱신해서 쿠키를 써야 할 때
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // 서버 컴포넌트에서는 쿠키를 쓸 수 없어서 에러가 난다.
            // 토큰 갱신은 middleware.ts 가 대신 해주므로 여기서는 무시해도 안전하다.
          }
        },
      },
    },
  );
}
