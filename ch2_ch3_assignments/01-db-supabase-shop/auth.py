# =====================================================================
# auth.py : Supabase Auth(회원가입 / 로그인 / 로그아웃)
# 로그인하면 supabase 클라이언트가 세션(토큰)을 기억하고,
# 이후의 모든 요청은 'authenticated' 사용자로 처리된다 -> RLS 정책의 auth.uid() 가 이 사용자의 id 가 된다.
# =====================================================================
from db import supabase


def sign_up(email: str, password: str):
    """회원가입. 성공하면 Auth 사용자(user) 객체를 돌려준다."""
    try:
        res = supabase.auth.sign_up({"email": email, "password": password})
        print("회원가입 완료:", res.user.email)
        # 대시보드에서 '이메일 확인(Confirm email)'이 켜져 있으면 세션이 없다 -> 메일 확인 후 로그인해야 함
        if res.session is None:
            print("※ 이메일 확인이 필요합니다. 메일의 링크를 누른 뒤 다시 실행하거나, "
                  "Authentication > Sign In / Providers > Email 에서 'Confirm email' 을 꺼 주세요.")
        return res.user
    except Exception as error:
        print("회원가입 실패:", error)
        return None


def sign_in(email: str, password: str):
    """이메일 + 비밀번호로 로그인. 성공하면 user 객체, 실패하면 None."""
    try:
        res = supabase.auth.sign_in_with_password({"email": email, "password": password})
        print("로그인 성공:", res.user.email, "/ uid:", res.user.id)
        return res.user
    except Exception as error:
        print("로그인 실패:", error)
        return None


def get_current_user():
    """현재 로그인되어 있는 사용자. 로그인 안 했으면 None."""
    try:
        res = supabase.auth.get_user()
        # 로그인 안 한 상태면 res 자체가 None 일 수 있으므로 함께 확인
        return res.user if res else None
    except Exception as error:
        print("사용자 조회 실패:", error)
        return None


def sign_out() -> None:
    """로그아웃 (세션 삭제)."""
    try:
        supabase.auth.sign_out()
        print("로그아웃 완료")
    except Exception as error:
        print("로그아웃 실패:", error)
