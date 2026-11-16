// [브라우저 전용] 클라이언트 컴포넌트('use client')에서 사용하는 Supabase 클라이언트 생성 함수
// 브라우저에서는 쿠키를 @supabase/ssr 이 알아서 읽으므로 URL 과 공개 키만 넘기면 된다.
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // NEXT_PUBLIC_ 로 시작하는 환경 변수만 브라우저 코드에 포함될 수 있다
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
