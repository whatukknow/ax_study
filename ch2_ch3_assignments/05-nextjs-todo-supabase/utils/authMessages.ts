// 서버 액션이 redirect 할 때 주소에 붙이는 코드(?error=login_failed 등)를 한국어 문구로 바꿔주는 유틸

// 오류 코드 → 사용자에게 보여줄 문구
const ERROR_MESSAGES: Record<string, string> = {
  empty_fields: '이메일과 비밀번호를 모두 입력해 주세요.',
  login_failed: '로그인에 실패했습니다. 이메일 또는 비밀번호를 확인해 주세요.',
  signup_failed: '회원가입에 실패했습니다. 이미 가입된 이메일이거나 비밀번호가 너무 짧습니다(6자 이상).',
};

// 안내 코드 → 문구
const INFO_MESSAGES: Record<string, string> = {
  check_email: '가입 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요.',
};

// 코드가 없으면 undefined, 모르는 코드면 일반 문구를 돌려준다
export function getAuthErrorMessage(code?: string): string | undefined {
  if (!code) return undefined;
  return ERROR_MESSAGES[code] ?? '알 수 없는 오류가 발생했습니다.';
}

export function getAuthInfoMessage(code?: string): string | undefined {
  if (!code) return undefined;
  return INFO_MESSAGES[code];
}
