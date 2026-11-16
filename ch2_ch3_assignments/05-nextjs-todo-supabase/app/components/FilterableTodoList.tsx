// [클라이언트 컴포넌트] 검색어 입력 + 디바운스 + 검색 결과 목록
// 왜 client? → 키보드 입력마다 바뀌는 상태(useState)와 타이머(useEffect)가 필요하기 때문.
//             데이터는 이미 서버(page.tsx)가 가져왔으므로, 여기서는 "보여줄 것만 거르는" 일만 한다.
'use client';

import { useEffect, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import type { Todo } from '@/types/todo';
import TodoList from '@/app/components/TodoList';
import EmptyState from '@/app/components/EmptyState';

// 디바운스 대기 시간 (밀리초): 입력을 멈추고 0.3초 뒤에 검색을 적용
const DEBOUNCE_MS = 300;

interface FilterableTodoListProps {
  todos: Todo[]; // 서버에서 조회한 전체 할 일
}

export default function FilterableTodoList({ todos }: FilterableTodoListProps) {
  // keyword: 입력창에 지금 보이는 값 (타이핑할 때마다 바뀜)
  const [keyword, setKeyword] = useState('');
  // debouncedKeyword: 입력이 멈춘 뒤 실제 검색에 쓰는 값
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  // keyword 가 바뀔 때마다 실행되는 효과 (의존성 배열: [keyword])
  useEffect(() => {
    // 0.3초 뒤에 검색어를 확정하는 타이머 예약
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
    }, DEBOUNCE_MS);

    // 클린업: 0.3초가 지나기 전에 또 입력하면(= keyword 변경) 이전 타이머를 취소한다.
    // 컴포넌트가 화면에서 사라질 때도 실행되어 남은 타이머가 상태를 바꾸지 않게 막는다.
    return () => clearTimeout(timer);
  }, [keyword]);

  // 확정된 검색어로 제목을 대소문자 무시하고 부분 일치 필터링
  const filteredTodos = debouncedKeyword
    ? todos.filter((todo) =>
        todo.title.toLowerCase().includes(debouncedKeyword.toLowerCase()),
      )
    : todos;

  return (
    <div>
      {/* 검색 입력창 (제어 컴포넌트: value 와 onChange 로 상태와 연결) */}
      <label className="flex items-center gap-2 mb-3 px-3 py-2 border border-gray-300 rounded-lg focus-within:border-blue-500">
        <FaSearch className="text-gray-400" />
        <span className="sr-only">할 일 검색</span>
        <input
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="제목으로 검색"
          className="flex-1 outline-none"
        />
      </label>

      {/* 검색 결과가 없으면 빈 상태, 있으면 목록 */}
      {filteredTodos.length === 0 ? (
        <EmptyState message={`'${debouncedKeyword}' 에 해당하는 할 일이 없습니다.`} />
      ) : (
        <TodoList todos={filteredTodos} />
      )}
    </div>
  );
}
