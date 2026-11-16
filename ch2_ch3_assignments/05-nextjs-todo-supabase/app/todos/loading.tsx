// [서버 컴포넌트] /todos 로딩 UI
// page.tsx 가 DB 데이터를 기다리는 동안 Next.js 가 이 화면을 자동으로 먼저 보여준다 (Suspense 경계).
// 상태/이벤트가 없는 정적인 화면이므로 서버 컴포넌트로 충분하다.
export default function TodosLoading() {
  return (
    <section className="max-w-md mx-auto my-6 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
      <p className="mb-4 text-gray-500">할 일을 불러오는 중...</p>
      {/* 스켈레톤: 회색 막대 4개가 깜빡이며 목록 자리를 미리 보여준다 */}
      <ul className="space-y-2 animate-pulse">
        {[1, 2, 3, 4].map((n) => (
          <li key={n} className="h-10 rounded-lg bg-gray-200" />
        ))}
      </ul>
    </section>
  );
}
