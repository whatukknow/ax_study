// [클라이언트 컴포넌트] 서버 액션 폼의 제출 버튼 (전송 중이면 비활성화 = 클라이언트 쪽 로딩 상태)
// 왜 client? → useFormStatus 훅은 브라우저에서 "부모 <form> 이 지금 제출 중인지"를 알려주는 훅이라 클라이언트에서만 동작한다.
'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/utils/cn';

interface SubmitButtonProps {
  children: ReactNode; // 버튼 안 내용 (텍스트/아이콘)
  pendingText?: string; // 전송 중일 때 대신 보여줄 글자 (없으면 children 유지)
  className?: string; // 바깥에서 덧붙일 Tailwind 클래스
  label?: string; // 아이콘만 있는 버튼을 위한 접근성 이름(aria-label)
}

export default function SubmitButton({
  children,
  pendingText,
  className,
  label,
}: SubmitButtonProps) {
  // pending: 이 버튼을 감싼 form 의 서버 액션이 실행 중이면 true
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending} // 중복 클릭 방지
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className, // 뒤에 둔 클래스가 우선 (twMerge 로 충돌 정리)
      )}
    >
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
