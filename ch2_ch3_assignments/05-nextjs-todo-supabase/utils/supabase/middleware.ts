// [미들웨어 전용] 모든 요청이 페이지에 도착하기 "전에" 실행되는 로그인 검사 + 세션 갱신 로직
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// 로그인해야만 들어갈 수 있는 경로의 시작 부분
const PROTECTED_PREFIX = '/todos';
// 이미 로그인한 사람은 들어갈 필요가 없는 경로 목록
const AUTH_PAGES = ['/login', '/signup'];

export async function updateSession(request: NextRequest) {
  // 기본 응답: "그대로 통과" (let 인 이유: 아래 setAll 에서 쿠키를 담은 새 응답으로 바꿔치기하기 때문)
  let supabaseResponse = NextResponse.next({ request });

  // 미들웨어용 Supabase 클라이언트: 쿠키를 "요청"에서 읽고 "응답"에 쓴다
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        // 요청에 들어있는 쿠키 전체를 Supabase 에 전달
        getAll() {
          return request.cookies.getAll();
        },
        // 토큰이 갱신되면: 요청 쿠키도 바꾸고(이후 서버 컴포넌트가 새 값을 보도록),
        // 응답 쿠키에도 실어서 브라우저에 저장되게 한다
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 현재 로그인 사용자 확인 (getUser 는 Supabase 서버에 토큰을 검증받으므로 신뢰할 수 있다)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 사용자가 요청한 경로 (예: /todos/3)
  const { pathname } = request.nextUrl;

  // 1) 로그인 안 한 사용자가 /todos 로 시작하는 페이지에 오면 → /login 으로 보낸다
  if (!user && pathname.startsWith(PROTECTED_PREFIX)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // 2) 이미 로그인한 사용자가 /login 이나 /signup 에 오면 → /todos 로 보낸다
  if (user && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/todos';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // 3) 그 외에는 (갱신된 쿠키가 담긴) 응답을 그대로 돌려준다
  return supabaseResponse;
}
