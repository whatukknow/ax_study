// [공용 컴포넌트 - 'use client' 없음] 할 일 배열을 받아 <ul> 목록으로 그리기만 한다.
// 훅/이벤트가 없어서 'use client' 를 붙일 필요가 없다.
// 참고: 지금은 FilterableTodoList(클라이언트)가 import 하므로 클라이언트 쪽에서 함께 렌더링된다.
//       ('use client' 파일이 import 한 컴포넌트는 자동으로 클라이언트 경계 안에 포함되는 규칙)
import type { Todo } from '@/types/todo';
import TodoItem from '@/app/components/TodoItem';

interface TodoListProps {
  todos: Todo[]; // 화면에 보여줄 할 일 목록
}

export default function TodoList({ todos }: TodoListProps) {
  return (
    <ul className="space-y-2">
      {/* map 으로 반복 렌더링. key 는 DB 의 고유 id 를 사용 (React 가 항목을 구분하는 기준) */}
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}
