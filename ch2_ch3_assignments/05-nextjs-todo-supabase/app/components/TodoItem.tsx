// [클라이언트 컴포넌트] 할 일 한 줄: 완료 토글 / 제목 수정 / 삭제 / 상세 이동
// 왜 client? → "수정 모드인지 아닌지"를 useState 로 기억하고 버튼 클릭(onClick)에 반응해야 하기 때문.
//             실제 DB 변경은 서버 액션이 하고, 이 컴포넌트는 화면 전환만 담당한다.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FaCheckCircle,
  FaEdit,
  FaRegCircle,
  FaTimes,
  FaTrash,
} from 'react-icons/fa';
import type { Todo } from '@/types/todo';
import { deleteTodo, toggleTodo, updateTodoTitle } from '@/app/actions';
import { cn } from '@/utils/cn';
import SubmitButton from '@/app/components/SubmitButton';

interface TodoItemProps {
  todo: Todo; // 이 줄에 표시할 할 일 하나
}

export default function TodoItem({ todo }: TodoItemProps) {
  // 수정 모드 여부 (true 면 제목 대신 입력창이 보인다)
  const [isEditing, setIsEditing] = useState(false);

  // 수정 폼 제출 처리: 서버 액션을 호출하고, 끝나면 수정 모드를 닫는다
  const handleUpdate = async (formData: FormData) => {
    await updateTodoTitle(todo.id, formData);
    setIsEditing(false);
  };

  // ---------- 수정 모드 화면 ----------
  if (isEditing) {
    return (
      <li className="p-3 border border-blue-300 rounded-lg">
        <form action={handleUpdate} className="flex gap-2">
          {/* defaultValue: 처음 값만 채워주고 이후 입력은 브라우저가 관리(비제어 입력) */}
          <input
            type="text"
            name="title"
            defaultValue={todo.title}
            required
            maxLength={100}
            autoFocus
            aria-label="할 일 제목 수정"
            className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
          <SubmitButton
            pendingText="저장 중..."
            className="bg-blue-500 text-white hover:bg-blue-600"
          >
            저장
          </SubmitButton>
          {/* type="button" 이라 폼을 제출하지 않고 수정 모드만 닫는다 */}
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            aria-label="수정 취소"
            className="px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100"
          >
            <FaTimes />
          </button>
        </form>
      </li>
    );
  }

  // ---------- 일반 화면 ----------
  return (
    <li className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg">
      {/* 완료 토글: bind(null, id, 현재상태) → 클릭 시 toggleTodo(id, 현재상태) 실행 */}
      <form action={toggleTodo.bind(null, todo.id, todo.is_completed)}>
        <SubmitButton
          label={todo.is_completed ? '미완료로 변경' : '완료로 변경'}
          className="px-1 text-xl text-blue-500 hover:text-blue-700"
        >
          {todo.is_completed ? <FaCheckCircle /> : <FaRegCircle />}
        </SubmitButton>
      </form>

      {/* 제목: 누르면 상세 페이지(/todos/[id])로 이동. 완료면 cn 으로 취소선 추가 */}
      <Link
        href={`/todos/${todo.id}`}
        className={cn(
          'flex-1 break-all hover:underline',
          todo.is_completed && 'line-through text-gray-400',
        )}
      >
        {todo.title}
      </Link>

      {/* 수정 모드 켜기 */}
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        aria-label="제목 수정"
        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
      >
        <FaEdit />
      </button>

      {/* 삭제 */}
      <form action={deleteTodo.bind(null, todo.id)}>
        <SubmitButton
          label="삭제"
          className="p-2 text-red-500 hover:bg-red-50"
        >
          <FaTrash />
        </SubmitButton>
      </form>
    </li>
  );
}
