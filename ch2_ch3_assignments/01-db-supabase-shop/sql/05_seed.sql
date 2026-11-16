-- =====================================================================
-- 05_seed.sql : 테스트용 기본 데이터 넣기 (SQL Editor 에서 실행)
-- ---------------------------------------------------------------------
-- SQL Editor 는 로그인 사용자가 아니므로 auth.uid() 가 null 이다.
--  -> members.auth_user_id 와 products.created_by 가 null 로 저장된다.
--  -> 이 데이터는 "관리자가 넣은 데이터" 이고, 04_transaction_test.sql 에서 사용한다.
--  -> Python 앱(로그인 사용자)은 RLS 때문에 이 회원 행은 볼 수 없고, 상품은 조회만 가능하다.
-- 다시 넣고 싶으면 아래 truncate 주석을 풀고 실행 (모든 데이터 삭제 + id 1번부터 다시 시작)
-- =====================================================================
-- truncate table orders, products, members restart identity cascade;

-- 회원 2명
insert into members (email, name, phone) values
    ('admin@shop.com', '관리자', '010-0000-0000'),
    ('kim@shop.com',   '김철수', '010-1111-2222');

-- 상품 3개 (가격, 재고)
insert into products (name, price, stock) values
    ('무선 키보드', 35000, 10),
    ('USB-C 케이블', 9900, 50),
    ('한정판 머그컵', 15000, 1);    -- 재고 1개: 재고 부족 실패 시나리오에 사용

-- 주문 1건 (김철수가 무선 키보드 2개) + 그만큼 재고 차감
-- 실제 서비스에서는 create_order 함수가 이 두 작업을 함께 처리한다.
insert into orders (member_id, product_id, quantity, unit_price, total_price) values (2, 1, 2, 35000, 70000);
update products set stock = stock - 2 where id = 1;

-- 확인: 주문 + 회원 이름 + 상품 이름을 JOIN 해서 보기
select o.id as order_id, m.name as member_name, p.name as product_name,
       o.quantity, o.total_price, o.status, p.stock as product_stock_now
from orders as o
join members  as m on o.member_id  = m.id
join products as p on o.product_id = p.id
order by o.id;
