-- =====================================================================
-- 04_transaction_test.sql : 트랜잭션 COMMIT / ROLLBACK 실습 (SQL Editor 에서 실행)
-- ---------------------------------------------------------------------
-- 05_seed.sql 을 먼저 실행해서 데이터를 넣어 둔 상태에서 진행한다.
-- 각 [시나리오] 블록을 마우스로 선택(드래그)한 뒤 Run 해서 "하나씩" 실행하고, 결과를 캡처한다.
--
-- 트랜잭션 = "전부 성공하거나, 전부 취소되거나" 하는 작업 묶음 (원자성, ACID 의 A)
--   BEGIN    : 트랜잭션 시작
--   COMMIT   : 지금까지의 변경을 확정 저장
--   ROLLBACK : 지금까지의 변경을 모두 취소 (BEGIN 직전 상태로 되돌림)
-- =====================================================================


-- =====================================================================
-- [시나리오 1] 정상 주문 -> COMMIT (변경이 저장됨)
--   김철수(member 2)가 USB-C 케이블(product 2) 3개 주문
-- =====================================================================
-- (전) 재고와 주문 수 확인
select id, name, stock from products where id = 2;
select count(*) as order_count from orders;

begin;
    -- ① 재고 차감 (조건부: 재고가 충분할 때만)
    update products set stock = stock - 3 where id = 2 and stock >= 3;
    -- ② 주문 저장
    insert into orders (member_id, product_id, quantity, unit_price, total_price)
    values (2, 2, 3, 9900, 29700);
commit;

-- (후) 재고 50 -> 47, 주문 수 +1 이 되어야 한다
select id, name, stock from products where id = 2;
select count(*) as order_count from orders;


-- =====================================================================
-- [시나리오 2] 직접 취소 -> ROLLBACK (변경이 없던 일이 됨)
--   주문을 넣는 도중 "마음이 바뀌어" ROLLBACK
-- =====================================================================
-- (전)
select id, name, stock from products where id = 1;
select count(*) as order_count from orders;

begin;
    update products set stock = stock - 1 where id = 1 and stock >= 1;
    insert into orders (member_id, product_id, quantity, unit_price, total_price)
    values (2, 1, 1, 35000, 35000);
    -- 트랜잭션 안에서는 바뀐 값이 보인다 (재고 -1, 주문 +1)
    select id, name, stock from products where id = 1;
rollback;

-- (후) BEGIN 전과 똑같아야 한다 -> 재고, 주문 수 그대로
select id, name, stock from products where id = 1;
select count(*) as order_count from orders;


-- =====================================================================
-- [시나리오 3] 실패 시나리오 -> 에러 발생 -> ROLLBACK
--   재고가 1개뿐인 '한정판 머그컵'(product 3)을 5개 주문하려고 함
--   ① 주문 insert 는 성공하지만
--   ② 재고 차감에서 stock = 1 - 5 = -4 가 되어 CHECK(stock >= 0) 제약조건 위반 에러 발생!
--   -> 에러가 난 트랜잭션은 COMMIT 할 수 없고, ROLLBACK 하면 ①의 주문 insert 도 함께 취소된다.
--   (트랜잭션이 없었다면 ①의 주문만 저장된 "반쪽 저장" 상태가 남았을 것)
-- =====================================================================
-- (전)
select id, name, stock from products where id = 3;
select count(*) as order_count from orders;

begin;
    insert into orders (member_id, product_id, quantity, unit_price, total_price)
    values (2, 3, 5, 15000, 75000);
    -- 아래 문장에서 에러: new row for relation "products" violates check constraint "products_stock_check"
    update products set stock = stock - 5 where id = 3;
rollback;
-- ※ SQL Editor 가 에러에서 실행을 멈추면, 아래 rollback; 한 줄만 따로 선택해서 실행한다.
--   (에러가 난 뒤에는 COMMIT 을 해도 PostgreSQL 이 자동으로 ROLLBACK 처리한다)
-- rollback;

-- (후) 재고는 여전히 1, 주문 수도 그대로 -> 주문 insert 가 취소되었음을 확인
select id, name, stock from products where id = 3;
select count(*) as order_count from orders;


-- =====================================================================
-- [시나리오 4] 함수(create_order) 안의 자동 ROLLBACK 확인
--   create_order 는 로그인 사용자(auth.uid())가 필요해서 SQL Editor 에서는 바로 호출할 수 없다.
--   -> Python main.py 의 "재고 부족 주문" 단계에서 확인한다.
--      재고 부족 예외(raise exception)가 나면 함수 안의 재고 차감이 모두 취소되어
--      실행 전/후 재고가 똑같이 출력된다.
-- =====================================================================
