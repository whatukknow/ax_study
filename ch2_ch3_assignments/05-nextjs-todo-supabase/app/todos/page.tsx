// [서버 컴포넌트] 할 일 목록 페이지 ( /todos )
// 왜 서버? → DB 조회는 서버에서 쿠키 세션으로 바로 하고, 완성된 HTML 을 보내면
//           브라우저에서 따로 fetch/로딩 처리를 할 필요가 없고 조회 로직도 노출되지 않는다.
// 데이터 조회 중에는 같은 폴더의 loading.tsx, 예기치 못한 에러는 error.tsx 가 자동으로 보여진다.
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import type { Todo } from '@/types/todo';
import UserProfile from '@/app/components/UserProfile';
import TodoInput from '@/app/components/TodoInput';
import FilterableTodoList from '@/app/components/FilterableTodoList';
import EmptyState from '@/app/components/EmptyState';
import ErrorMessage from '@/app/components/ErrorMessage';

export default async function TodosPage() {
  // 요청마다 새 서버 클라이언트 생성 → 다른 사용자와 상태를 공유하지 않는다
  const supabase = await createClient();

  // 로그인 사용자 확인 (middleware 가 이미 막아주지만, 한 번 더 확인하는 이중 안전장치)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 목록 조회: 최신순 정렬. user_id 조건은 RLS 가 자동으로 적용한다 (내 것만 조회됨)
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .order('created_at', { ascending: false });

  // DB 행 → Todo 타입 배열로 (data 가 null 이면 빈 배열)
  const todos: Todo[] = (data ?? []) as Todo[];

  // 완료된 개수 (상단 요약용)
  const completedCount = todos.filter((todo) => todo.is_completed).length;

  return (
    <section className="max-w-md mx-auto my-6 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
      {/* 사용자 이메일 + 로그아웃 (클라이언트 컴포넌트) */}
      <UserProfile initialEmail={user.email ?? null} />

      <h1 className="text-2xl font-bold mb-4">나의 할 일</h1>

      {/* 할 일 추가 폼 */}
      <TodoInput />

      {/* 상태별 화면 분기: 오류 → 빈 데이터 → 성공(검색 가능한 목록) */}
      {error ? (
        <ErrorMessage title="데이터 로딩 실패" message={error.message} />
      ) : todos.length === 0 ? (
        <EmptyState message="아직 할 일이 없습니다. 위에서 첫 할 일을 추가해 보세요!" />
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-2">
            전체 {todos.length}개 · 완료 {completedCount}개
          </p>
          {/* 서버에서 받은 데이터를 props 로 넘김 (Todo 는 단순 객체라 직렬화 가능) */}
          <FilterableTodoList todos={todos} />
        </>
      )}
    </section>
  );
}
