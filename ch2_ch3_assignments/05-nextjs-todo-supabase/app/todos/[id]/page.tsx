// [서버 컴포넌트] 할 일 상세 페이지 ( /todos/3 같은 동적 라우트 )
// 왜 서버? → 주소의 id 로 DB 에서 한 건을 조회해 바로 그리면 되고, 없으면 서버에서 notFound() 로 404 처리 가능.
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FaArrowLeft, FaCheckCircle, FaRegCircle, FaTrash } from 'react-icons/fa';
import { createClient } from '@/utils/supabase/server';
import type { Todo } from '@/types/todo';
import { deleteTodoAndGoToList, toggleTodo } from '@/app/actions';
import { cn } from '@/utils/cn';
import ErrorMessage from '@/app/components/ErrorMessage';
import SubmitButton from '@/app/components/SubmitButton';

// [id] 폴더 이름이 params 의 키가 된다 (Next.js 15+ 에서는 Promise)
interface TodoDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TodoDetailPage({ params }: TodoDetailPageProps) {
  // 주소에서 id 문자열을 꺼낸다 (예: '3')
  const { id } = await params;

  // 숫자로 변환. 'abc' 처럼 숫자가 아니면 바로 404
  const todoId = Number(id);
  if (!Number.isInteger(todoId)) {
    notFound();
  }

  const supabase = await createClient();

  // id 로 한 건 조회. maybeSingle(): 없으면 에러 대신 data = null
  // 남의 할 일 id 를 입력해도 RLS 때문에 null 이 와서 404 가 된다 (존재 여부도 숨겨짐)
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('id', todoId)
    .maybeSingle();

  // 조회 자체가 실패한 경우 (네트워크/DB 오류)
  if (error) {
    return (
      <section className="max-w-md mx-auto my-6 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
        <ErrorMessage title="데이터 로딩 실패" message={error.message} />
      </section>
    );
  }

  // 데이터가 없으면 같은 폴더의 not-found.tsx 를 보여준다
  if (!data) {
    notFound();
  }

  const todo = data as Todo;

  // 생성 시각을 한국어 날짜 형식으로 (예: 2026. 11. 16. 오후 3:20:00)
  const createdAt = new Date(todo.created_at).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
  });

  return (
    <section className="max-w-md mx-auto my-6 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
      {/* 목록으로 돌아가기 */}
      <Link
        href="/todos"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4"
      >
        <FaArrowLeft /> 목록으로
      </Link>

      {/* 제목: 완료된 경우 취소선 */}
      <h1
        className={cn(
          'text-2xl font-bold mb-2 break-all',
          todo.is_completed && 'line-through text-gray-400',
        )}
      >
        {todo.title}
      </h1>

      {/* 상세 정보 */}
      <dl className="text-sm text-gray-600 space-y-1 mb-6">
        <div className="flex gap-2">
          <dt className="font-medium">상태</dt>
          <dd>{todo.is_completed ? '완료' : '진행 중'}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium">생성일</dt>
          <dd>{createdAt}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium">번호</dt>
          <dd>#{todo.id}</dd>
        </div>
      </dl>

      <div className="flex gap-2">
        {/* 완료 토글: bind 로 id 와 현재 상태를 미리 넣어둔 서버 액션 */}
        <form action={toggleTodo.bind(null, todo.id, todo.is_completed)}>
          <SubmitButton className="bg-blue-500 text-white hover:bg-blue-600">
            {todo.is_completed ? <FaRegCircle /> : <FaCheckCircle />}
            {todo.is_completed ? '미완료로 변경' : '완료 처리'}
          </SubmitButton>
        </form>

        {/* 삭제 후 목록으로 이동 */}
        <form action={deleteTodoAndGoToList.bind(null, todo.id)}>
          <SubmitButton className="bg-red-500 text-white hover:bg-red-600">
            <FaTrash /> 삭제
          </SubmitButton>
        </form>
      </div>
    </section>
  );
}
