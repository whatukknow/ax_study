# =====================================================================
# products.py : 상품(products) 테이블 CRUD
# RLS 정책: 로그인한 사용자는 모든 상품을 조회할 수 있고,
#           등록/수정/삭제는 "내가 등록한 상품(created_by = 내 uid)"만 가능하다.
# =====================================================================
from db import supabase


def create_product(name: str, price: int, stock: int):
    """상품 등록 (Create). created_by 는 DB 기본값 auth.uid() 로 자동 저장된다."""
    try:
        response = supabase.table("products").insert({
            "name": name,
            "price": price,
            "stock": stock,
        }).execute()
        print("상품 생성 완료:", response.data[0])
        return response.data[0]
    except Exception as error:
        # 예: price 가 음수면 products_price_check 제약조건 위반 에러
        print("상품 생성 실패:", error)
        return None


def get_products():
    """상품 목록 조회 (Read - 목록). id 순서로 정렬."""
    try:
        response = (
            supabase.table("products")
            .select("id, name, price, stock")
            .order("id")
            .execute()
        )
        if not response.data:
            print("등록된 상품이 없습니다.")
        return response.data
    except Exception as error:
        print("상품 목록 조회 실패:", error)
        return None


def get_product(product_id: int):
    """상품 1개 조회 (Read - 단건). 없으면 None."""
    try:
        response = supabase.table("products").select("*").eq("id", product_id).execute()
        if not response.data:
            print(f"상품(id={product_id})을 찾을 수 없습니다.")
            return None
        return response.data[0]
    except Exception as error:
        print("상품 조회 실패:", error)
        return None


def update_product(product_id: int, price: int | None = None, stock: int | None = None):
    """상품 가격/재고 수정 (Update). 넘겨준 값만 바꾼다."""
    changes = {}
    if price is not None:
        changes["price"] = price
    if stock is not None:
        changes["stock"] = stock
    if not changes:
        print("수정할 내용이 없습니다.")
        return None

    try:
        response = supabase.table("products").update(changes).eq("id", product_id).execute()
        # 남이 등록한 상품이면 RLS 때문에 빈 리스트가 온다
        if not response.data:
            print(f"상품(id={product_id})을 수정하지 못했습니다. (없거나 내가 등록한 상품이 아님)")
            return None
        print("상품 수정 완료:", response.data[0])
        return response.data[0]
    except Exception as error:
        print("상품 수정 실패:", error)
        return None


def delete_product(product_id: int):
    """상품 삭제 (Delete). 주문 기록이 남아 있으면 FK(on delete restrict) 때문에 실패한다."""
    try:
        response = supabase.table("products").delete().eq("id", product_id).execute()
        if not response.data:
            print(f"상품(id={product_id})을 삭제하지 못했습니다. (없거나 내가 등록한 상품이 아님)")
            return None
        print("상품 삭제 완료:", response.data[0])
        return response.data[0]
    except Exception as error:
        print("상품 삭제 실패:", error)
        return None
