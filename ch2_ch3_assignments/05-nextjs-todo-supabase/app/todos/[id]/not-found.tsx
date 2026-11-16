// [서버 컴포넌트] 상세 페이지에서 notFound() 가 호출되면 보여지는 404 화면
// 정적인 안내 + 링크뿐이라 서버 컴포넌트로 충분하다.
import Link from 'next/link';
import EmptyState from '@/app/components/EmptyState';

export default function TodoNotFound() {
  return (
    <section className="max-w-md mx-auto my-6 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
      <EmptyState message="할 일을 찾을 수 없습니다. 삭제되었거나 내 할 일이 아닙니다." />
      <Link
        href="/todos"
        className="block mt-4 text-center text-blue-500 hover:underline"
      >
        목록으로 돌아가기
      </Link>
    </section>
  );
}
