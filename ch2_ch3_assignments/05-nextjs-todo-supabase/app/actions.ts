// [서버 액션 파일] 'use server' → 이 파일의 함수는 항상 서버에서만 실행된다.
// 왜 서버에서? → DB 쓰기/로그인은 쿠키 세션이 필요하고, 브라우저에 로직을 노출할 필요가 없기 때문.
// <form action={함수}> 로 연결하면 폼 제출 시 브라우저가 이 함수를 "원격 호출"한다.
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

// =====================================================================
// 인증(Auth) 액션
// =====================================================================

// 로그인: 폼에서 email/password 를 꺼내 Supabase 에 로그인 요청
export async function login(formData: FormData) {
  // 요청마다 새 Supabase 클라이언트 생성 (이 요청의 쿠키 기준)
  const supabase = await createClient();

  // input 의 name 속성으로 값을 꺼낸다
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // 빈 값이면 오류 코드를 주소에 붙여 로그인 페이지로 되돌린다
  if (!email || !password) {
    redirect('/login?error=empty_fields');
  }

  // 이메일/비밀번호 로그인 → 성공하면 세션 쿠키가 응답에 저장된다
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  // 실패 시 에러 로그 + 오류 안내
  if (error) {
    console.error('로그인 에러:', error.message);
    redirect('/login?error=login_failed');
  }

  // 레이아웃 전체 캐시를 무효화해서 로그인 상태가 반영된 화면을 다시 그린다
  revalidatePath('/', 'layout');
  // 할 일 목록으로 이동
  redirect('/todos');
}

// 회원가입: Supabase Auth 에 새 사용자 생성
export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    redirect('/signup?error=empty_fields');
  }

  // data.session: 이메일 확인이 꺼져 있으면 바로 로그인 세션이 생기고, 켜져 있으면 null
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    console.error('회원가입 에러:', error.message);
    redirect('/signup?error=signup_failed');
  }

  // 이메일 확인이 필요한 프로젝트 설정이면 → 메일 확인 안내와 함께 로그인 페이지로
  if (!data.session) {
    redirect('/login?message=check_email');
  }

  // 바로 로그인된 경우 → 목록으로
  revalidatePath('/', 'layout');
  redirect('/todos');
}

// 로그아웃: 세션 쿠키 삭제 후 로그인 페이지로
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

// =====================================================================
// Todo CRUD 액션
// 모든 쿼리에 "내 것만" 조건(user_id)을 직접 쓰지 않는 이유:
// → DB 의 RLS 정책이 (select auth.uid()) = user_id 로 자동으로 걸러주기 때문.
//   남의 id 로 수정/삭제를 시도해도 0 행만 영향받고 아무 일도 일어나지 않는다.
// =====================================================================

// 할 일 추가
export async function addTodo(formData: FormData) {
  const supabase = await createClient();

  // 입력값을 꺼내고 앞뒤 공백 제거
  const title = (formData.get('title') as string | null)?.trim();

  // 빈 문자열이면 아무것도 하지 않는다
  if (!title) return;

  // user_id 는 넣지 않는다 → 테이블 기본값 auth.uid() 가 로그인 사용자 id 를 채운다
  const { error } = await supabase
    .from('todos')
    .insert([{ title, is_completed: false }]);

  if (error) {
    console.error('데이터 추가 에러:', error.message);
    return;
  }

  // /todos 페이지 데이터를 다시 불러오도록 캐시 무효화 → 새 항목이 바로 보인다
  revalidatePath('/todos');
}

// 완료 여부 토글: 현재 값(isCompleted)의 반대로 바꾼다
// 사용법: <form action={toggleTodo.bind(null, todo.id, todo.is_completed)}>
export async function toggleTodo(id: number, isCompleted: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('todos')
    .update({ is_completed: !isCompleted })
    .eq('id', id);

  if (error) {
    console.error('데이터 수정 에러:', error.message);
    return;
  }

  // 목록과 상세 페이지 둘 다 새로고침
  revalidatePath('/todos');
  revalidatePath(`/todos/${id}`);
}

// 제목 수정 (수업에서는 토글만 다뤘으므로 같은 update().eq() 패턴을 응용)
// 사용법: 클라이언트 컴포넌트에서 updateTodoTitle(todo.id, formData) 로 호출
export async function updateTodoTitle(id: number, formData: FormData) {
  const supabase = await createClient();

  const title = (formData.get('title') as string | null)?.trim();
  if (!title) return;

  const { error } = await supabase
    .from('todos')
    .update({ title })
    .eq('id', id);

  if (error) {
    console.error('제목 수정 에러:', error.message);
    return;
  }

  revalidatePath('/todos');
  revalidatePath(`/todos/${id}`);
}

// 삭제 (목록 화면에서 사용: 현재 페이지에 그대로 머문다)
// 사용법: <form action={deleteTodo.bind(null, todo.id)}>
export async function deleteTodo(id: number) {
  const supabase = await createClient();

  const { error } = await supabase.from('todos').delete().eq('id', id);

  if (error) {
    console.error('데이터 삭제 에러:', error.message);
    return;
  }

  revalidatePath('/todos');
}

// 삭제 후 목록으로 이동 (상세 화면에서 사용: 삭제된 상세 페이지에 남아 있으면 안 되므로)
export async function deleteTodoAndGoToList(id: number) {
  await deleteTodo(id);
  redirect('/todos');
}
