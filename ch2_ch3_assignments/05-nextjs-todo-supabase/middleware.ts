// 루트 미들웨어: Next.js 가 이 파일을 자동으로 찾아 요청마다 실행한다 (라우트 가드 역할)
// 참고: Next.js 16 은 빌드 시 "middleware → proxy 로 이름 변경 권장" 경고를 띄우지만, 수업 방식대로 middleware.ts 를 사용한다.
import { type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

// 실제 로직은 utils/supabase/middleware.ts 의 updateSession 에 있다
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

// 미들웨어를 실행할 경로: 정적 파일/이미지/파비콘은 제외 (불필요한 인증 검사 방지)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
