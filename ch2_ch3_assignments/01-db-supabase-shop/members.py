# =====================================================================
# members.py : 회원(members) 테이블 CRUD
# RLS 정책 때문에 로그인한 사용자는 "자기 회원 행"만 만들고/보고/고치고/지울 수 있다.
# 모든 함수는 성공하면 데이터, 실패하면 None 을 돌려주고 에러 메시지를 출력한다.
# =====================================================================
from db import supabase


def create_member(email: str, name: str, phone: str | None = None):
    """회원 등록 (Create). auth_user_id 는 DB 기본값 auth.uid() 로 자동 저장된다."""
    try:
        response = supabase.table("members").insert({
            "email": email,
            "name": name,
            "phone": phone,
        }).execute()
        # insert 결과는 리스트로 오므로 첫 번째 행을 꺼낸다
        print("회원 생성 완료:", response.data[0])
        return response.data[0]
    except Exception as error:
        # 예: 이메일 중복이면 members_email_unique 제약조건 위반 에러
        print("회원 생성 실패:", error)
        return None


def get_members():
    """회원 목록 조회 (Read - 목록). RLS 때문에 실제로는 내 행 1개만 보인다."""
    try:
        response = (
            supabase.table("members")
            .select("*")
            .order("id")
            .execute()
        )
        return response.data
    except Exception as error:
        print("회원 목록 조회 실패:", error)
        return None


def get_member(member_id: int):
    """회원 1명 조회 (Read - 단건). 없으면 None."""
    try:
        response = supabase.table("members").select("*").eq("id", member_id).execute()
        # 조회 결과가 빈 리스트([])면 없는 회원(또는 볼 권한이 없는 회원)
        if not response.data:
            print(f"회원(id={member_id})을 찾을 수 없습니다.")
            return None
        return response.data[0]
    except Exception as error:
        print("회원 조회 실패:", error)
        return None


def get_my_member(auth_user_id: str):
    """로그인한 사용자의 회원 정보 조회. 아직 등록 안 했으면 None."""
    try:
        response = supabase.table("members").select("*").eq("auth_user_id", auth_user_id).execute()
        return response.data[0] if response.data else None
    except Exception as error:
        print("내 회원정보 조회 실패:", error)
        return None


def update_member(member_id: int, name: str | None = None, phone: str | None = None):
    """회원 정보 수정 (Update). 넘겨준 값만 바꾼다."""
    # 바꿀 값만 딕셔너리에 담기 (None 인 값은 건드리지 않음)
    changes = {}
    if name is not None:
        changes["name"] = name
    if phone is not None:
        changes["phone"] = phone
    if not changes:
        print("수정할 내용이 없습니다.")
        return None

    try:
        response = supabase.table("members").update(changes).eq("id", member_id).execute()
        # RLS 에 막히면 에러 대신 빈 리스트가 온다 -> 수정된 행이 없다는 뜻
        if not response.data:
            print(f"회원(id={member_id})을 수정하지 못했습니다. (없거나 본인이 아님)")
            return None
        print("회원 수정 완료:", response.data[0])
        return response.data[0]
    except Exception as error:
        print("회원 수정 실패:", error)
        return None


def delete_member(member_id: int):
    """회원 삭제 (Delete). FK 의 on delete cascade 때문에 이 회원의 주문도 함께 삭제된다."""
    try:
        response = supabase.table("members").delete().eq("id", member_id).execute()
        if not response.data:
            print(f"회원(id={member_id})을 삭제하지 못했습니다. (없거나 본인이 아님)")
            return None
        print("회원 삭제 완료:", response.data[0])
        return response.data[0]
    except Exception as error:
        print("회원 삭제 실패:", error)
        return None
