-- =====================================================================
-- 02_rls.sql : RLS(Row Level Security, 행 단위 보안) 정책
-- ---------------------------------------------------------------------
-- RLS 를 켜면 "정책(policy)으로 허락한 행"만 조회/추가/수정/삭제할 수 있다.
-- Python 코드는 publishable key 로 접속하므로, 로그인한 사용자는 'authenticated' 역할이 되고
-- auth.uid() 는 그 사용자의 Auth id(uuid) 를 돌려준다.
-- 정책이 하나도 없는 동작(예: 로그인 안 한 사용자의 조회)은 전부 거부된다.
-- ※ SQL Editor 는 관리자(postgres) 권한으로 실행되므로 RLS 의 영향을 받지 않는다.
-- =====================================================================

-- 세 테이블 모두 RLS 켜기
alter table members  enable row level security;
alter table products enable row level security;
alter table orders   enable row level security;


-- ---------------------------------------------------------------------
-- 1) members : 자기 자신의 회원 정보만 보고/만들고/고치고/지울 수 있다
--    auth_user_id 컬럼에 저장된 uid 와 지금 로그인한 사람의 uid 가 같아야 통과
-- ---------------------------------------------------------------------
create policy "본인 회원정보 생성" on members for insert to authenticated
    with check (auth.uid() = auth_user_id);

create policy "본인 회원정보 조회" on members for select to authenticated
    using (auth.uid() = auth_user_id);

create policy "본인 회원정보 수정" on members for update to authenticated
    using (auth.uid() = auth_user_id)          -- 고칠 대상: 내 행만
    with check (auth.uid() = auth_user_id);    -- 고친 결과도 여전히 내 행이어야 함 (남의 uid 로 바꾸기 금지)

create policy "본인 회원정보 삭제" on members for delete to authenticated
    using (auth.uid() = auth_user_id);


-- ---------------------------------------------------------------------
-- 2) products : 로그인한 사용자는 모든 상품을 조회 가능
--    상품 등록/수정/삭제는 "자기가 등록한 상품"만 가능 (created_by = 내 uid)
--    -> SQL Editor(05_seed.sql)로 넣은 상품은 created_by 가 null 이므로
--       일반 사용자는 수정/삭제할 수 없고, 관리자만 SQL Editor 에서 관리한다.
--    -> 주문할 때 재고를 줄이는 작업은 사용자가 직접 update 하는 것이 아니라
--       03_functions.sql 의 create_order 함수(security definer)가 대신 처리한다.
-- ---------------------------------------------------------------------
create policy "상품 전체 조회" on products for select to authenticated
    using (true);   -- true = 조건 없이 모든 행 허용

create policy "본인 상품 등록" on products for insert to authenticated
    with check (auth.uid() = created_by);

create policy "본인 상품 수정" on products for update to authenticated
    using (auth.uid() = created_by)
    with check (auth.uid() = created_by);

create policy "본인 상품 삭제" on products for delete to authenticated
    using (auth.uid() = created_by);


-- ---------------------------------------------------------------------
-- 3) orders : 자기 주문만 볼 수 있다
--    orders 에는 uid 가 아니라 member_id 가 있으므로,
--    "내 uid 로 찾은 members 행의 id" 안에 member_id 가 들어 있는지 확인한다 (서브쿼리).
--
--    주문 생성(insert) 정책은 일부러 만들지 않았다.
--    -> 사용자가 orders 에 직접 insert 하면 재고 확인/차감을 건너뛸 수 있기 때문.
--    -> 주문은 반드시 create_order 함수(supabase.rpc)로만 만들어진다.
-- ---------------------------------------------------------------------
create policy "본인 주문 조회" on orders for select to authenticated
    using (member_id in (select id from members where auth_user_id = auth.uid()));

-- 수정(update) 정책도 일부러 만들지 않았다.
--  -> update 정책이 있으면 본인 주문의 모든 컬럼(수량, 가격, 상태)을 직접 바꿀 수 있어 위험하다.
--  -> 메모 변경은 update_order_memo 함수(rpc)로, 취소는 cancel_order 함수(rpc)로만 가능하다.
--     (함수는 03_functions.sql 참고. 함수 안에서 memo 한 컬럼만 바꾸도록 제한한다)

-- 삭제: 본인 주문이면서 '취소된(cancelled)' 주문만 삭제 가능
--  (진행 중인 주문을 지우면 이미 빠진 재고가 영영 돌아오지 않으므로, 먼저 cancel_order 로 재고를 돌려놓게 함)
create policy "본인 취소주문 삭제" on orders for delete to authenticated
    using (
        member_id in (select id from members where auth_user_id = auth.uid())
        and status = 'cancelled'
    );


-- ---------------------------------------------------------------------
-- 4) 만들어진 정책 확인
-- ---------------------------------------------------------------------
select tablename, policyname, cmd, roles
from pg_policies
where tablename in ('members', 'products', 'orders')
order by tablename, cmd;
