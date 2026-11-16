// [공용 컴포넌트 - 'use client' 없음] 보여줄 데이터가 없을 때의 안내 화면
// props 로 받은 문구만 그리는 순수 표시용이라 훅이 필요 없다 (서버/클라이언트 어디서든 사용 가능).
import { FaInbox } from 'react-icons/fa';

interface EmptyStateProps {
  message: string; // 상황에 맞는 안내 문구 (목록 비어있음 / 검색 결과 없음 / 404 등)
}

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
      <FaInbox className="text-4xl" />
      <p className="text-sm text-center">{message}</p>
    </div>
  );
}
