-- =====================================================================
-- 03_functions.sql : 주문 생성/취소를 "한 번에(원자적으로)" 처리하는 PostgreSQL 함수
-- ---------------------------------------------------------------------
-- 왜 함수로 만드나?
--  주문 1건 = ① 재고 확인  ② 재고 차감  ③ 주문 저장  -> 3단계 작업이다.
--  Python 에서 이 3단계를 .table() 호출 3번으로 나눠서 하면
--   - ②까지 성공하고 ③에서 실패하면 재고만 줄어든 "반쪽 저장" 상태가 된다.
--   - 두 사람이 동시에 ①을 통과하면 재고 1개를 둘 다 사 가는 "초과 판매(oversell)"가 생긴다.
--  Supabase Python SDK 에는 트랜잭션 API 가 없으므로(수업 내용),
--  여러 단계를 plpgsql 함수 하나에 넣고 supabase.rpc("함수이름", {...}) 로 호출한다.
--  PostgreSQL 함수는 통째로 하나의 트랜잭션으로 실행되므로
--  중간에 RAISE EXCEPTION 이 나면 그 함수 안에서 했던 변경이 전부 자동 ROLLBACK 된다.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) create_order : 주문 생성
--    p_product_id : 주문할 상품 id
--    p_quantity   : 주문 수량
--    반환값        : 새로 만들어진 주문 id (bigint)
--    주문자는 파라미터로 받지 않고 auth.uid()(로그인한 사람)로 찾는다 -> 남의 이름으로 주문 불가
-- ---------------------------------------------------------------------
create or replace function create_order(p_product_id bigint, p_quantity integer)
returns bigint
language plpgsql
-- security definer : 함수를 만든 관리자 권한으로 실행.
--   products 에는 일반 사용자의 재고 수정 정책이 없고, orders 에는 insert 정책이 없으므로(02_rls.sql)
--   "이 함수를 통해서만" 재고 차감과 주문 저장이 가능하게 만드는 장치다.
security definer
-- search_path 고정 : security definer 함수가 엉뚱한 스키마의 같은 이름 테이블을 쓰지 않도록 public 으로 고정
set search_path = public
as $$
declare
    v_member_id bigint;   -- 주문자 회원 id
    v_price     integer;  -- 상품 가격 (주문 당시 가격으로 저장)
    v_order_id  bigint;   -- 새 주문 id
begin
    -- (0) 입력값 검사
    if p_quantity is null or p_quantity <= 0 then
        raise exception '주문 수량은 1개 이상이어야 합니다. (입력값: %)', p_quantity;
    end if;

    -- (1) 로그인한 사용자의 회원 id 찾기
    select id into v_member_id
    from members
    where auth_user_id = auth.uid();

    if not found then
        raise exception '회원 정보가 없습니다. 로그인 후 회원 등록을 먼저 해주세요.';
    end if;

    -- (2) 재고 확인 + 차감을 "한 문장"으로 처리 (조건부 UPDATE)
    --   where 에 stock >= p_quantity 를 넣었기 때문에 재고가 충분할 때만 행이 수정된다.
    --   동시성 안전 이유:
    --     UPDATE 는 수정하는 행에 잠금(lock)을 건다. 두 주문이 동시에 같은 상품을 UPDATE 하면
    --     두 번째 주문은 첫 번째 트랜잭션이 끝날 때까지 기다렸다가,
    --     "줄어든 최신 재고"로 where 조건(stock >= p_quantity)을 다시 검사한다.
    --     그래서 재고가 1개 남았을 때 동시에 2명이 주문해도 1명만 성공한다.
    --   (먼저 SELECT 로 재고를 읽고 나중에 UPDATE 하면, 두 사람이 같은 재고 값을 읽어서 둘 다 통과할 수 있다)
    update products
    set stock = stock - p_quantity
    where id = p_product_id
      and stock >= p_quantity
    returning price into v_price;   -- 수정된 행의 가격을 변수에 담기

    -- found : 바로 앞 문장이 행을 하나라도 처리했으면 true
    if not found then
        -- 상품이 아예 없는 건지, 재고가 부족한 건지 구분해서 알려주기
        if not exists (select 1 from products where id = p_product_id) then
            raise exception '존재하지 않는 상품입니다. (상품 id: %)', p_product_id;
        else
            -- 이 예외가 발생하면 함수 전체가 ROLLBACK 된다 (아무것도 바뀌지 않음)
            raise exception '재고가 부족합니다. (상품 id: %, 주문 수량: %)', p_product_id, p_quantity;
        end if;
    end if;

    -- (3) 주문 저장. 여기서 에러가 나도 (2)의 재고 차감까지 함께 ROLLBACK 된다.
    insert into orders (member_id, product_id, quantity, unit_price, total_price)
    values (v_member_id, p_product_id, p_quantity, v_price, v_price * p_quantity)
    returning id into v_order_id;

    -- (4) 새 주문 id 반환 -> Python 에서 response.data 로 받는다
    return v_order_id;
end;
$$;


-- ---------------------------------------------------------------------
-- 2) cancel_order : 주문 취소 (상태 변경 + 재고 복구를 한 번에)
--    반환값 : 취소된 주문 id
-- ---------------------------------------------------------------------
create or replace function cancel_order(p_order_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    v_product_id bigint;
    v_quantity   integer;
begin
    -- (1) 내 주문 + 아직 취소 안 된 주문을 '취소됨'으로 변경하고, 상품 id/수량을 꺼내 둔다.
    --     조건부 UPDATE 이므로 같은 주문을 동시에 두 번 취소해도 한 번만 처리된다 (재고 두 번 복구 방지).
    update orders
    set status = 'cancelled'
    where id = p_order_id
      and status = 'ordered'
      and member_id in (select id from members where auth_user_id = auth.uid())
    returning product_id, quantity into v_product_id, v_quantity;

    if not found then
        raise exception '취소할 수 없는 주문입니다. (본인 주문이 아니거나 이미 취소됨, 주문 id: %)', p_order_id;
    end if;

    -- (2) 재고 되돌리기
    update products
    set stock = stock + v_quantity
    where id = v_product_id;

    return p_order_id;
end;
$$;


-- ---------------------------------------------------------------------
-- 2-1) update_order_memo : 주문 메모(배송 요청사항)만 수정
--    orders 테이블에는 update 정책이 없어서 사용자가 직접 수정할 수 없다 (02_rls.sql).
--    이 함수는 memo 컬럼 하나만 바꾸므로, 수량/가격/상태를 임의로 바꾸는 것을 막을 수 있다.
--    반환값 : 수정된 주문 id
-- ---------------------------------------------------------------------
create or replace function update_order_memo(p_order_id bigint, p_memo text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
    -- 내 주문일 때만 memo 를 바꾼다 (다른 사람 주문 id 를 넣으면 0건 수정)
    update orders
    set memo = p_memo
    where id = p_order_id
      and member_id in (select id from members where auth_user_id = auth.uid());

    -- 수정된 행이 없으면 (없는 주문이거나 남의 주문) 에러를 발생시킨다
    if not found then
        raise exception '수정할 수 없는 주문입니다. (본인 주문이 아니거나 없음, 주문 id: %)', p_order_id;
    end if;

    return p_order_id;
end;
$$;


-- ---------------------------------------------------------------------
-- 3) 로그인하지 않은 사용자(anon)는 함수를 호출할 수 없게 실행 권한 회수
--    (함수 안에서도 auth.uid() 로 회원을 찾지 못하면 예외가 나지만, 한 번 더 막아 둔다)
-- ---------------------------------------------------------------------
revoke execute on function create_order(bigint, integer) from public, anon;
revoke execute on function cancel_order(bigint) from public, anon;
revoke execute on function update_order_memo(bigint, text) from public, anon;
grant execute on function create_order(bigint, integer) to authenticated;
grant execute on function cancel_order(bigint) to authenticated;
grant execute on function update_order_memo(bigint, text) to authenticated;
