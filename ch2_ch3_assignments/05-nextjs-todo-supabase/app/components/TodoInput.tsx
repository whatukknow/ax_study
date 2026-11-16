// [서버 컴포넌트] 할 일 추가 폼
// 왜 서버? → 입력값을 useState 로 관리하지 않고 <form action={서버액션}> 으로 바로 보내므로 훅이 필요 없다.
//           (React 19 는 서버 액션 제출이 끝나면 폼 입력값을 자동으로 비워준다)
//           전송 중 표시가 필요한 버튼만 클라이언트 컴포넌트(SubmitButton)로 분리했다.
import { FaPlus } from 'react-icons/fa';
import { addTodo } from '@/app/actions';
import SubmitButton from '@/app/components/SubmitButton';

export default function TodoInput() {
  return (
    // 제출하면 addTodo(formData) 가 서버에서 실행된다
    <form action={addTodo} className="flex gap-2 mb-4">
      {/* name="title" → 서버 액션에서 formData.get('title') 로 꺼낸다 */}
      <input
        type="text"
        name="title"
        required
        maxLength={100}
        placeholder="할 일을 입력하세요"
        aria-label="새 할 일"
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
      />
      <SubmitButton
        label="할 일 추가"
        pendingText="추가 중..."
        className="bg-blue-500 text-white hover:bg-blue-600"
      >
        <FaPlus /> 추가
      </SubmitButton>
    </form>
  );
}
