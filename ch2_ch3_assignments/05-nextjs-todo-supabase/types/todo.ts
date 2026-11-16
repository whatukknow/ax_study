// todos 테이블 한 행(row)의 모양을 TypeScript 타입으로 정의 (supabase/schema.sql 과 1:1 대응)
// 여러 컴포넌트/페이지가 함께 쓰므로 한 곳(types 폴더)에 모아둔다.
export interface Todo {
  id: number; // bigint identity 기본키 (JS 에서는 number 로 받는다)
  created_at: string; // timestamptz → JSON 으로 오면 ISO 문자열
  title: string; // 할 일 내용
  is_completed: boolean; // 완료 여부
  user_id: string; // 작성자 uuid (문자열)
}
