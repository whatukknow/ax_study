// [클라이언트 컴포넌트] /todos 이하에서 예기치 못한 에러가 throw 되면 보여지는 화면
// 왜 client? → Next.js 규칙상 error.tsx 는 반드시 클라이언트 컴포넌트여야 한다
//             (reset 버튼 클릭 같은 상호작용 + 브라우저에서 에러 경계로 동작하기 때문).
'use client';

import { useEffect } from 'react';
import ErrorMessage from '@/app/components/ErrorMessage';

// Next.js 가 넘겨주는 props 타입
interface TodosErrorProps {
  error: Error & { digest?: string }; // 발생한 에러 (digest: 서버 로그 추적용 id)
  reset: () => void; // 다시 렌더링을 시도하는 함수
}

export default function TodosError({ error, reset }: TodosErrorProps) {
  // 에러가 바뀔 때마다 콘솔에 기록 (의존성 배열에 error 를 넣어 같은 에러로 중복 실행되지 않게)
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="max-w-md mx-auto my-6 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
      <ErrorMessage title="문제가 발생했습니다" message={error.message} />
      {/* reset() → 이 구간을 다시 그려본다 */}
      <button
        type="button"
        onClick={() => reset()}
        className="mt-4 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
      >
        다시 시도
      </button>
    </section>
  );
}
