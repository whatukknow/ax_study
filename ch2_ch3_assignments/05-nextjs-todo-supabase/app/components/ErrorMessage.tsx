// [공용 컴포넌트 - 'use client' 없음] 오류 안내 박스
// 문구만 표시하므로 훅이 필요 없다 (서버 페이지, error.tsx, AuthForm 등 어디서든 재사용).
import { FaExclamationTriangle } from 'react-icons/fa';

interface ErrorMessageProps {
  message: string; // 오류 상세 내용
  title?: string; // 굵게 표시할 제목 (선택)
}

export default function ErrorMessage({ message, title }: ErrorMessageProps) {
  return (
    // role="alert": 스크린 리더가 오류를 바로 읽어주도록
    <div
      role="alert"
      className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-600 text-sm"
    >
      <FaExclamationTriangle className="mt-0.5 shrink-0" />
      <p>
        {title && <strong className="block">{title}</strong>}
        {message}
      </p>
    </div>
  );
}
