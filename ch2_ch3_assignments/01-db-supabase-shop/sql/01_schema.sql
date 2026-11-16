-- =====================================================================
-- 01_schema.sql : 쇼핑몰 테이블 만들기 (회원 members / 상품 products / 주문 orders)
-- 실행 위치 : Supabase 대시보드 > SQL Editor 에 붙여넣고 Run
-- 실행 순서 : 01_schema -> 02_rls -> 03_functions -> 05_seed -> 04_transaction_test
-- =====================================================================

-- ---------------------------------------------------------------------
-- [네이밍 규칙]
--  - 테이블 이름 : 소문자 + 복수형 (members, products, orders)
--  - 컬럼 이름   : 소문자 snake_case (auth_user_id, created_at)
--  - 외래키 컬럼 : "참조하는테이블 단수형_id" (member_id, product_id)
--  - 제약조건    : "테이블_컬럼_종류" (members_email_unique, products_price_check)
--
-- [정규화(중복 제거) 설계 이유]
--  - 회원 정보(이름, 이메일)는 members 에만, 상품 정보(이름, 가격, 재고)는 products 에만 저장한다.
--    orders 에는 "누가(member_id) 무엇을(product_id) 몇 개(quantity)" 만 id 로 연결해서 저장한다.
--    -> 회원 이름이 바뀌어도 members 한 곳만 고치면 된다 (제3정규형: 다른 테이블의 정보를 복사해 두지 않음).
--  - 단, orders.unit_price(주문 당시 가격)는 일부러 저장한다.
--    상품 가격은 나중에 바뀔 수 있는데, "주문했을 때 얼마였는지"는 주문의 고유한 사실이기 때문이다.
--    (현재 가격의 복사본이 아니라 '그 시점의 기록' 이므로 중복이 아님)
--  - 하나의 주문에 상품 1종류만 담는 단순한 구조로 만들었다.
--    (여러 상품을 한 번에 주문하려면 order_items 테이블로 분리하는 것이 다음 단계 정규화)
-- ---------------------------------------------------------------------


-- ---------------------------------------------------------------------
-- [다시 실행할 때] 아래 3줄의 주석(--)을 풀고 먼저 실행하면 테이블을 지우고 처음부터 만들 수 있다.
-- 자식 테이블(orders)이 부모(members, products)를 참조하므로 orders 를 먼저 지워야 한다.
-- ---------------------------------------------------------------------
-- drop table if exists orders;
-- drop table if exists products;
-- drop table if exists members;


-- ---------------------------------------------------------------------
-- 1) 회원 테이블 members
-- ---------------------------------------------------------------------
create table members (
    -- 기본키(PK): 숫자가 1, 2, 3 ... 자동으로 증가하는 id
    id            bigint generated always as identity primary key,

    -- Supabase Auth(로그인 계정)의 사용자 id 와 연결하는 컬럼
    --  default auth.uid() : 로그인한 사용자가 insert 하면 자기 uid 가 자동으로 들어간다.
    --  unique             : 로그인 계정 1개당 회원 프로필은 1개만
    --  references auth.users (id) on delete cascade : Auth 계정이 삭제되면 회원 행도 같이 삭제
    auth_user_id  uuid default auth.uid() unique references auth.users (id) on delete cascade,

    -- 이메일: 비어 있으면 안 되고(NOT NULL), 중복 불가(UNIQUE)
    email         text not null,
    name          text not null,

    -- 생성 시각: 값을 안 넣으면 지금 시각(now())이 자동 저장
    created_at    timestamptz not null default now(),

    -- 이름을 붙인 UNIQUE 제약조건 (에러 메시지에 이 이름이 나와서 원인을 찾기 쉽다)
    constraint members_email_unique unique (email)
);


-- ---------------------------------------------------------------------
-- 2) 상품 테이블 products
-- ---------------------------------------------------------------------
create table products (
    id          bigint generated always as identity primary key,
    name        text not null,
    -- 가격과 재고는 음수가 될 수 없다 (CHECK 제약조건)
    -- stock >= 0 덕분에, 만약 잘못된 코드가 재고를 0 아래로 빼려고 해도 DB 가 에러로 막아준다 (최후의 안전장치)
    price       integer not null,
    stock       integer not null default 0,
    -- 이 상품을 등록한 사용자(Auth uid). SQL Editor 에서 넣은 상품은 null (= 관리자가 등록한 상품)
    created_by  uuid default auth.uid() references auth.users (id) on delete set null,
    created_at  timestamptz not null default now(),

    constraint products_price_check check (price >= 0),
    constraint products_stock_check check (stock >= 0)
);


-- ---------------------------------------------------------------------
-- 3) 주문 테이블 orders
-- ---------------------------------------------------------------------
create table orders (
    id           bigint generated always as identity primary key,

    -- 외래키(FK): 주문한 회원. 회원이 삭제되면 그 회원의 주문도 같이 삭제(cascade)
    member_id    bigint not null references members (id) on delete cascade,

    -- 외래키(FK): 주문한 상품. 주문 기록이 남아 있는 상품은 삭제 못 하게 막는다(restrict)
    product_id   bigint not null references products (id) on delete restrict,

    quantity     integer not null,
    -- 주문 당시 1개 가격 (위 '정규화 설계 이유' 참고)
    unit_price   integer not null,
    -- 총 금액 = unit_price * quantity (주문 함수 create_order 가 계산해서 넣는다)
    total_price  integer not null,
    -- 주문 상태: 정해진 값만 허용
    status       text not null default 'ordered',
    created_at   timestamptz not null default now(),

    constraint orders_quantity_check    check (quantity > 0),
    constraint orders_unit_price_check  check (unit_price >= 0),
    constraint orders_total_price_check check (total_price >= 0),
    constraint orders_status_check      check (status in ('ordered', 'cancelled'))
);


-- ---------------------------------------------------------------------
-- 4) ALTER TABLE 예시 : 이미 만든 테이블에 컬럼/제약조건 추가
-- ---------------------------------------------------------------------
-- 회원 전화번호 컬럼 추가 (선택 입력이라 NOT NULL 없음)
alter table members add column phone text;

-- 주문 요청사항(배송 메모) 컬럼 추가. Python 의 주문 '수정(update)' 예시에서 이 컬럼을 바꾼다.
alter table orders add column memo text;

-- 상품 이름이 빈 문자열('')이 되지 않도록 CHECK 제약조건을 나중에 추가
alter table products add constraint products_name_check check (length(name) > 0);


-- ---------------------------------------------------------------------
-- 5) 만들어진 컬럼 확인 (README 의 테이블 상세 표와 비교해 보기)
-- ---------------------------------------------------------------------
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_name in ('members', 'products', 'orders')
order by table_name, ordinal_position;


-- ---------------------------------------------------------------------
-- 6) 제약조건 위반 확인 쿼리 (일부러 실패시키기) - 하나씩 주석을 풀어 실행해 보고 에러를 캡처
--    (05_seed.sql 로 데이터를 넣은 뒤에 실행해야 FK/UNIQUE 테스트가 의미가 있다)
-- ---------------------------------------------------------------------
-- NOT NULL 위반 : name 이 없음 -> null value in column "name" violates not-null constraint
-- insert into products (price, stock) values (1000, 1);

-- CHECK 위반 : 가격이 음수 -> violates check constraint "products_price_check"
-- insert into products (name, price, stock) values ('잘못된 상품', -500, 1);

-- UNIQUE 위반 : 이미 있는 이메일 -> violates unique constraint "members_email_unique"
-- insert into members (email, name) values ('admin@shop.com', '중복회원');

-- FK 위반 : 존재하지 않는 회원(9999) -> violates foreign key constraint "orders_member_id_fkey"
-- insert into orders (member_id, product_id, quantity, unit_price, total_price) values (9999, 1, 1, 1000, 1000);
