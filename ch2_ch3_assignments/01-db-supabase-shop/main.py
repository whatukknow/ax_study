# =====================================================================
# main.py : 전체 CRUD 시나리오 데모 (실행: uv run main.py)
# ---------------------------------------------------------------------
# 순서
#  0. 접속 확인
#  1. 로그인 (계정이 없으면 회원가입 후 로그인)
#  2. 회원 CRUD   : 등록 -> 조회 -> 수정 -> (전/후 비교)
#  3. 상품 CRUD   : 등록 -> 목록/단건 조회 -> 수정 -> (전/후 비교)
#  4. 주문        : rpc 주문 생성(성공) -> 재고 부족 주문(실패, 자동 ROLLBACK)
#                   -> 조회 -> 메모 수정 -> 취소(재고 복구) -> 삭제
#  5. 정리        : 상품 삭제 -> 회원 삭제 -> 로그아웃
# 이 출력 화면을 캡처해서 README 의 images/ 폴더에 넣는다.
# =====================================================================
import os

from dotenv import load_dotenv

import auth
import members
import orders
import products
from db import test_connection

load_dotenv()

# 데모용 테스트 계정 (실제 비밀번호가 아닌 연습용 값을 .env 에 적어 둔다)
DEMO_EMAIL = os.environ.get("DEMO_EMAIL", "demo_user@example.com")
DEMO_PASSWORD = os.environ.get("DEMO_PASSWORD", "password1234")


def title(text: str) -> None:
    """단계 구분용 제목 출력 (캡처했을 때 보기 좋게)."""
    print()
    print("=" * 60)
    print(text)
    print("=" * 60)


def show_stock(product_id: int, label: str) -> int | None:
    """상품의 현재 재고를 출력하고 돌려준다 (전/후 비교용)."""
    product = products.get_product(product_id)
    if product is None:
        return None
    print(f"[{label}] 상품 '{product['name']}' 재고: {product['stock']}개")
    return product["stock"]


def run_app() -> None:
    # -------------------------------------------------------------
    # 0. 접속 확인
    # -------------------------------------------------------------
    title("0. Supabase 접속 확인")
    if not test_connection():
        print(".env 의 URL/키, 그리고 SQL 파일 실행 여부를 확인해 주세요.")
        return

    # -------------------------------------------------------------
    # 1. 로그인 (없으면 회원가입 -> 로그인)
    # -------------------------------------------------------------
    title("1. 로그인 (Supabase Auth)")
    user = auth.sign_in(DEMO_EMAIL, DEMO_PASSWORD)
    if user is None:
        print("-> 계정이 없는 것 같아 회원가입을 진행합니다.")
        auth.sign_up(DEMO_EMAIL, DEMO_PASSWORD)
        user = auth.sign_in(DEMO_EMAIL, DEMO_PASSWORD)
    if user is None:
        # RLS 때문에 로그인 없이는 아무 데이터도 다룰 수 없다
        print("로그인이 필요합니다. 데모를 종료합니다.")
        return

    # -------------------------------------------------------------
    # 2. 회원 CRUD
    # -------------------------------------------------------------
    title("2. 회원(members) CRUD")
    # 이전 실행에서 남은 회원 행이 있으면 재사용, 없으면 새로 등록
    member = members.get_my_member(user.id)
    if member is None:
        member = members.create_member(DEMO_EMAIL, "홍길동", "010-1234-5678")
    if member is None:
        print("회원 등록에 실패해서 데모를 종료합니다.")
        auth.sign_out()
        return
    member_id = member["id"]

    print("[수정 전]", members.get_member(member_id))
    members.update_member(member_id, name="홍길동(수정)", phone="010-9999-8888")
    print("[수정 후]", members.get_member(member_id))
    print("[회원 목록] RLS 때문에 내 정보만 보임:", members.get_members())

    # -------------------------------------------------------------
    # 3. 상품 CRUD
    # -------------------------------------------------------------
    title("3. 상품(products) CRUD")
    product = products.create_product("데모 텀블러", 12000, 3)
    if product is None:
        print("상품 등록에 실패해서 데모를 종료합니다.")
        auth.sign_out()
        return
    product_id = product["id"]

    print("[상품 목록]")
    for row in products.get_products() or []:   # 조회 실패(None)면 빈 리스트로 대신해서 반복
        print("  ", row)

    print("[수정 전]", products.get_product(product_id))
    products.update_product(product_id, price=10000)
    print("[수정 후]", products.get_product(product_id))

    # 일부러 제약조건 위반: 가격이 음수인 상품 -> CHECK 에러가 나고 예외 처리로 메시지만 출력
    print("\n[제약조건 위반 테스트] 가격 -500 원 상품 등록 시도")
    products.create_product("잘못된 상품", -500, 1)

    # -------------------------------------------------------------
    # 4-1. 주문 생성 (성공) : 재고 3 -> 1
    # -------------------------------------------------------------
    title("4-1. 주문 생성 (rpc create_order) - 성공")
    show_stock(product_id, "주문 전")
    order_id = orders.create_order(product_id, 2)
    show_stock(product_id, "주문 후")

    # -------------------------------------------------------------
    # 4-2. 주문 생성 (실패) : 재고 1개인데 5개 주문 -> 예외 -> 자동 ROLLBACK
    # -------------------------------------------------------------
    title("4-2. 재고 부족 주문 (실패 시나리오 -> ROLLBACK)")
    before = show_stock(product_id, "실패 주문 전")
    failed_order_id = orders.create_order(product_id, 5)   # 실패하면 None
    after = show_stock(product_id, "실패 주문 후")
    if failed_order_id is None and before == after:
        print("-> 재고가 그대로입니다. 함수 전체가 ROLLBACK 되어 반쪽 저장이 없습니다.")

    # -------------------------------------------------------------
    # 4-3. 주문 조회 / 수정
    # -------------------------------------------------------------
    title("4-3. 주문(orders) 조회 / 수정")
    print("[내 주문 목록]")
    for row in orders.get_orders(member_id) or []:
        print("  ", row)

    if order_id is not None:
        print("[수정 전]", orders.get_order(order_id))
        orders.update_order_memo(order_id, "문 앞에 놓아주세요")
        print("[수정 후]", orders.get_order(order_id))

        # ---------------------------------------------------------
        # 4-4. 주문 취소(재고 복구) -> 삭제
        # ---------------------------------------------------------
        title("4-4. 주문 취소(rpc cancel_order) -> 삭제")
        # 취소 전에 삭제 시도 -> RLS 정책(취소된 주문만 삭제)에 막힘
        print("[취소 전 삭제 시도]")
        orders.delete_order(order_id)

        show_stock(product_id, "취소 전")
        orders.cancel_order(order_id)
        show_stock(product_id, "취소 후")   # 재고 1 -> 3 으로 복구

        orders.delete_order(order_id)
        print("[삭제 후 조회]", orders.get_order(order_id))

    # -------------------------------------------------------------
    # 5. 정리 : 상품 삭제 -> 회원 삭제 -> 로그아웃
    # -------------------------------------------------------------
    title("5. 상품 / 회원 삭제 (Delete) 및 로그아웃")
    products.delete_product(product_id)
    print("[상품 삭제 후 조회]", products.get_product(product_id))

    members.delete_member(member_id)
    print("[회원 삭제 후 조회]", members.get_member(member_id))

    auth.sign_out()
    print("\n데모 완료!")


# 이 파일을 직접 실행했을 때만 run_app() 실행 (다른 파일에서 import 할 때는 실행 안 됨)
if __name__ == "__main__":
    run_app()
