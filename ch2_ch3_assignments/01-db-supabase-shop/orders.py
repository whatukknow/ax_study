# =====================================================================
# orders.py : 주문(orders) 테이블 CRUD
# - 생성(Create)과 취소는 여러 단계 작업(재고 확인/차감 + 주문 저장)이라
#   .table().insert() 대신 DB 함수(create_order, cancel_order)를 supabase.rpc() 로 호출한다.
#   -> 함수 하나가 트랜잭션 하나로 실행되어, 실패하면 전부 자동 ROLLBACK (03_functions.sql 참고)
# - 조회/수정/삭제는 일반 .table() 방식. RLS 때문에 "내 주문"만 대상이 된다.
# =====================================================================
from db import supabase


def create_order(product_id: int, quantity: int):
    """주문 생성 (Create) - DB 함수 create_order 호출. 성공하면 새 주문 id, 실패하면 None."""
    try:
        # rpc("함수이름", {파라미터이름: 값}) -> 파라미터 이름은 SQL 함수의 p_... 와 똑같아야 한다
        response = supabase.rpc("create_order", {
            "p_product_id": product_id,
            "p_quantity": quantity,
        }).execute()
        # 함수가 return 한 값(새 주문 id)이 response.data 에 들어 있다
        print("주문 생성 완료! 주문 id:", response.data)
        return response.data
    except Exception as error:
        # 재고 부족이면 함수 안의 raise exception 메시지가 여기로 전달된다.
        # 이 경우 DB 쪽에서는 이미 전체 ROLLBACK 되었으므로 재고도 그대로다.
        print("주문 생성 실패 (전체 취소됨):", error)
        return None


def get_orders(member_id: int):
    """회원의 주문 목록 조회 (Read - 목록). 최신 주문이 위로 오도록 정렬."""
    try:
        response = (
            supabase.table("orders")
            .select("id, product_id, quantity, unit_price, total_price, status, memo, created_at")
            .eq("member_id", member_id)
            .order("created_at", desc=True)
            .execute()
        )
        if not response.data:
            print("주문 내역이 없습니다.")
        return response.data
    except Exception as error:
        print("주문 목록 조회 실패:", error)
        return None


def get_order(order_id: int):
    """주문 1건 조회 (Read - 단건). 없거나 남의 주문이면 None."""
    try:
        response = supabase.table("orders").select("*").eq("id", order_id).execute()
        if not response.data:
            print(f"주문(id={order_id})을 찾을 수 없습니다.")
            return None
        return response.data[0]
    except Exception as error:
        print("주문 조회 실패:", error)
        return None


def update_order_memo(order_id: int, memo: str):
    """주문 메모(배송 요청사항) 수정 (Update) - DB 함수 update_order_memo 를 rpc 로 호출."""
    try:
        # orders 테이블에는 update 정책이 없어서 .table("orders").update() 는 막혀 있다.
        # 대신 memo 한 컬럼만 바꾸는 DB 함수를 호출한다 (수량/가격 임의 변경 방지).
        response = supabase.rpc(
            "update_order_memo", {"p_order_id": order_id, "p_memo": memo}
        ).execute()
        # 함수가 성공하면 수정된 주문 id 를 돌려준다 → 최신 주문 정보를 다시 조회해서 반환
        print("주문 메모 수정 완료: 주문 id =", response.data)
        return get_order(order_id)
    except Exception as error:
        print("주문 수정 실패:", error)
        return None


def cancel_order(order_id: int):
    """주문 취소 - DB 함수 cancel_order 호출 (상태를 cancelled 로 + 재고 복구를 한 번에)."""
    try:
        response = supabase.rpc("cancel_order", {"p_order_id": order_id}).execute()
        print("주문 취소 완료! 주문 id:", response.data)
        return response.data
    except Exception as error:
        print("주문 취소 실패:", error)
        return None


def delete_order(order_id: int):
    """주문 삭제 (Delete). RLS 정책상 '취소된' 본인 주문만 삭제된다."""
    try:
        response = supabase.table("orders").delete().eq("id", order_id).execute()
        if not response.data:
            print(f"주문(id={order_id})을 삭제하지 못했습니다. (없거나, 본인 주문이 아니거나, 취소 전 주문)")
            return None
        print("주문 삭제 완료:", response.data[0])
        return response.data[0]
    except Exception as error:
        print("주문 삭제 실패:", error)
        return None
