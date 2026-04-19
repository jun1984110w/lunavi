-- ============================================================
-- 주문 orders / order_items + RLS + 트리거 + place_order RPC
-- Supabase SQL Editor에서 실행합니다.
-- 의존: public.profiles, public.products, public.product_options, public.carts
-- 실행 순서: DROP → CREATE TABLE → RLS → 트리거 → RPC → 권한
-- ============================================================

-- ------------------------------------------------------------
-- 0) 기존 객체 제거 (테이블이 없어도 오류 나지 않게: 트리거는 테이블 DROP 시 함께 삭제됨)
-- ------------------------------------------------------------
drop function if exists public.place_order(text, text, text, text, text, text, numeric, numeric, jsonb);
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop function if exists public.orders_assign_order_number() cascade;
drop function if exists public.touch_orders_updated_at() cascade;
drop function if exists public.is_order_staff_admin() cascade;

-- ============================================================
-- 1) CREATE TABLE — 주문 헤더·품목, 인덱스, 설명 주석
-- ============================================================

-- 주문 헤더(한 건의 결제·배송 단위)
create table public.orders (
  id bigint generated always as identity primary key,
  -- profiles.id 와 동일(로그인 사용자)
  user_id uuid not null references public.profiles (id) on delete restrict,
  -- 아래 트리거에서 LN-YYYYMMDD-001 형식으로 자동 부여
  order_number text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'cancelled')),
  total_amount numeric(14, 2) not null,
  shipping_fee numeric(14, 2) not null default 0,
  discount_amount numeric(14, 2) not null default 0,
  payment_method text not null
    check (payment_method in ('card', 'bank_transfer', 'qr_transfer', 'cod')),
  recipient_name text not null,
  recipient_phone text not null,
  shipping_address text not null,
  shipping_memo text null,
  tracking_number text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.orders is '회원 주문 헤더';
comment on column public.orders.user_id is '주문 소유자(profiles 기본키)';
comment on column public.orders.order_number is '고객 표시용 주문번호(일자+일련), 트리거로 채움';
comment on column public.orders.status is '주문 처리 상태';
comment on column public.orders.total_amount is '상품 소계 + 배송비 - 할인';
comment on column public.orders.shipping_fee is '배송비';
comment on column public.orders.discount_amount is '할인 금액';
comment on column public.orders.payment_method is 'card | bank_transfer | qr_transfer | cod';
comment on column public.orders.recipient_name is '수령인 이름';
comment on column public.orders.recipient_phone is '수령인 연락처';
comment on column public.orders.shipping_address is '배송 주소';
comment on column public.orders.shipping_memo is '배송 요청 메모';
comment on column public.orders.tracking_number is '택배 송장번호(운영 입력)';

create index orders_user_id_idx on public.orders (user_id);
create index orders_created_at_idx on public.orders (created_at desc);

-- 주문 품목(주문 시점 상품명·가격 스냅샷)
create table public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete cascade,
  product_id bigint not null references public.products (id) on delete restrict,
  option_id bigint null references public.product_options (id) on delete set null,
  product_name text not null,
  price numeric(14, 2) not null,
  quantity integer not null check (quantity > 0),
  subtotal numeric(14, 2) not null
);

comment on table public.order_items is '주문 상품 줄(이름·단가는 주문 시점 고정)';
comment on column public.order_items.order_id is '소속 주문(orders.id)';
comment on column public.order_items.product_id is '상품 참조';
comment on column public.order_items.option_id is '선택 옵션(없으면 null)';
comment on column public.order_items.product_name is '주문 시점 표시용 상품명';
comment on column public.order_items.price is '주문 시점 단가';
comment on column public.order_items.quantity is '수량';
comment on column public.order_items.subtotal is '단가 * 수량';

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);

-- ============================================================
-- 2) RLS — 정책에서 쓰는 헬퍼 함수 먼저 정의, 이후 정책 생성
-- ============================================================

-- 현재 로그인 사용자가 주문 관리 권한(스태프·관리자)인지 여부
create or replace function public.is_order_staff_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $f$
  select exists (
    select 1
    from public.profiles pr
    where pr.id = auth.uid()
      and pr.role in ('super_admin', 'admin', 'staff')
  );
$f$;

comment on function public.is_order_staff_admin() is '주문 전역 관리 권한(super_admin, admin, staff)';

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- 본인 주문만 조회, 관리자는 전체 조회
create policy orders_select_own_or_admin
  on public.orders
  for select
  using (auth.uid() = user_id or public.is_order_staff_admin());

-- 관리자만 주문 헤더 수정·삭제(상태·송장 등)
create policy orders_update_admin
  on public.orders
  for update
  using (public.is_order_staff_admin())
  with check (public.is_order_staff_admin());

create policy orders_delete_admin
  on public.orders
  for delete
  using (public.is_order_staff_admin());

-- 본인 주문의 품목만 조회, 관리자는 전체
create policy order_items_select_own_or_admin
  on public.order_items
  for select
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = auth.uid() or public.is_order_staff_admin())
    )
  );

create policy order_items_update_admin
  on public.order_items
  for update
  using (public.is_order_staff_admin())
  with check (public.is_order_staff_admin());

create policy order_items_delete_admin
  on public.order_items
  for delete
  using (public.is_order_staff_admin());

-- ============================================================
-- 3) 트리거 — 주문번호 자동 생성, updated_at 갱신
-- ============================================================

-- UTC 기준 일자로 LN-YYYYMMDD-### 채번(당일 접두에 대해 자문락으로 직렬화)
create or replace function public.orders_assign_order_number()
returns trigger
language plpgsql
as $t$
declare
  v_day text;
  v_next int;
begin
  v_day := to_char((timezone('utc', now()))::date, 'YYYYMMDD');
  perform pg_advisory_xact_lock(87281401, (hashtext('lunavi_order_' || v_day) & 2147483647)::int);

  select coalesce(
    max(
      (regexp_match(o.order_number, '^LN-' || v_day || '-([0-9]+)$'))[1]::int
    ),
    0
  ) + 1
  into v_next
  from public.orders o
  where o.order_number ~ ('^LN-' || v_day || '-[0-9]+$');

  new.order_number := 'LN-' || v_day || '-' || lpad(v_next::text, 3, '0');
  return new;
end;
$t$;

comment on function public.orders_assign_order_number() is 'orders INSERT 전 주문번호 자동 부여';

create trigger tr_orders_assign_order_number
  before insert on public.orders
  for each row
  execute procedure public.orders_assign_order_number();

-- 수정 시 updated_at 자동 반영
create or replace function public.touch_orders_updated_at()
returns trigger
language plpgsql
as $t$
begin
  new.updated_at := now();
  return new;
end;
$t$;

comment on function public.touch_orders_updated_at() is 'orders UPDATE 시 updated_at 갱신';

create trigger tr_orders_touch_updated_at
  before update on public.orders
  for each row
  execute procedure public.touch_orders_updated_at();

-- ============================================================
-- 4) RPC — 주문 확정(주문·품목 INSERT, 재고 차감, carts 비우기)
-- p_lines: [{"product_id":1,"option_id":null,"quantity":2}, ...]
-- ============================================================

create or replace function public.place_order(
  p_locale text,
  p_recipient_name text,
  p_recipient_phone text,
  p_shipping_address text,
  p_shipping_memo text,
  p_payment_method text,
  p_shipping_fee numeric,
  p_discount_amount numeric,
  p_lines jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := auth.uid();
  v_loc text;
  v_line jsonb;
  v_pid bigint;
  v_opt_id bigint;
  v_qty int;
  v_price_retail numeric(14, 2);
  v_p_stock int;
  v_name_vi text;
  v_name_ko text;
  v_name_en text;
  v_unit numeric(14, 2);
  v_opt_adj numeric(14, 2);
  v_opt_stock int;
  v_subtotal numeric(14, 2) := 0;
  v_name text;
  v_enriched jsonb := '[]'::jsonb;
  v_row_sub numeric(14, 2);
  v_order_id bigint;
  v_order_number text;
  v_total numeric(14, 2);
  r jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_payment_method not in ('card', 'bank_transfer', 'qr_transfer', 'cod') then
    raise exception 'invalid_payment_method';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'empty_cart';
  end if;

  if coalesce(trim(p_recipient_name), '') = ''
     or coalesce(trim(p_recipient_phone), '') = ''
     or coalesce(trim(p_shipping_address), '') = '' then
    raise exception 'invalid_shipping';
  end if;

  if coalesce(p_shipping_fee, 0) < 0 or coalesce(p_discount_amount, 0) < 0 then
    raise exception 'invalid_amounts';
  end if;

  v_loc := lower(coalesce(p_locale, 'vi'));
  if v_loc not in ('ko', 'en', 'vi') then
    v_loc := 'vi';
  end if;

  -- 1차: 재고 확인·행 잠금, 소계 및 품목별 스냅샷 JSON 적재
  for v_line in
    select value from jsonb_array_elements(p_lines) as t(value)
  loop
    v_pid := (v_line ->> 'product_id')::bigint;
    v_qty := (v_line ->> 'quantity')::int;

    if v_pid is null or v_qty is null or v_qty < 1 then
      raise exception 'invalid_line';
    end if;

    v_opt_id := null;
    if jsonb_typeof(coalesce(v_line -> 'option_id', 'null'::jsonb)) in ('number', 'string')
       and coalesce(nullif(trim(v_line ->> 'option_id'), ''), '') <> '' then
      v_opt_id := (v_line ->> 'option_id')::bigint;
    end if;

    select
      p.price_retail,
      p.stock_quantity,
      p.name_vi,
      p.name_ko,
      p.name_en
    into v_price_retail, v_p_stock, v_name_vi, v_name_ko, v_name_en
    from public.products p
    where p.id = v_pid
      and p.status = 'active'
    for update;

    if not found then
      raise exception 'product_not_found';
    end if;

    if v_p_stock < v_qty then
      raise exception 'insufficient_stock';
    end if;

    v_unit := v_price_retail;

    if v_opt_id is not null then
      select po.price_adjustment, po.stock_quantity
      into v_opt_adj, v_opt_stock
      from public.product_options po
      where po.id = v_opt_id
        and po.product_id = v_pid
      for update;

      if not found then
        raise exception 'option_not_found';
      end if;

      if v_opt_stock < v_qty then
        raise exception 'insufficient_option_stock';
      end if;

      v_unit := v_unit + coalesce(v_opt_adj, 0);
    end if;

    if v_loc = 'ko' then
      v_name := v_name_ko;
    elsif v_loc = 'en' then
      v_name := v_name_en;
    else
      v_name := v_name_vi;
    end if;

    v_row_sub := round(v_unit * v_qty, 2);
    v_subtotal := v_subtotal + v_row_sub;

    v_enriched := v_enriched || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_pid,
        'option_id', v_opt_id,
        'product_name', v_name,
        'unit_price', v_unit,
        'quantity', v_qty,
        'subtotal', v_row_sub
      )
    );
  end loop;

  v_total := round(v_subtotal + coalesce(p_shipping_fee, 0) - coalesce(p_discount_amount, 0), 2);
  if v_total < 0 then
    raise exception 'invalid_total';
  end if;

  insert into public.orders (
    user_id,
    status,
    total_amount,
    shipping_fee,
    discount_amount,
    payment_method,
    recipient_name,
    recipient_phone,
    shipping_address,
    shipping_memo
  )
  values (
    v_uid,
    'pending',
    v_total,
    coalesce(p_shipping_fee, 0),
    coalesce(p_discount_amount, 0),
    p_payment_method,
    trim(p_recipient_name),
    trim(p_recipient_phone),
    trim(p_shipping_address),
    nullif(trim(coalesce(p_shipping_memo, '')), '')
  )
  returning id, order_number into v_order_id, v_order_number;

  -- 품목 행 삽입 + 재고 차감
  for r in select * from jsonb_array_elements(v_enriched) as e(value)
  loop
    v_line := r.value;
    v_pid := (v_line ->> 'product_id')::bigint;
    v_qty := (v_line ->> 'quantity')::int;
    v_unit := (v_line ->> 'unit_price')::numeric;
    v_name := v_line ->> 'product_name';
    v_row_sub := (v_line ->> 'subtotal')::numeric;

    v_opt_id := null;
    if jsonb_typeof(coalesce(v_line -> 'option_id', 'null'::jsonb)) in ('number', 'string')
       and coalesce(nullif(trim(v_line ->> 'option_id'), ''), '') <> '' then
      v_opt_id := (v_line ->> 'option_id')::bigint;
    end if;

    insert into public.order_items (
      order_id,
      product_id,
      option_id,
      product_name,
      price,
      quantity,
      subtotal
    )
    values (
      v_order_id,
      v_pid,
      v_opt_id,
      v_name,
      v_unit,
      v_qty,
      v_row_sub
    );

    update public.products
    set stock_quantity = stock_quantity - v_qty
    where id = v_pid;

    if v_opt_id is not null then
      update public.product_options
      set stock_quantity = stock_quantity - v_qty
      where id = v_opt_id
        and product_id = v_pid;
    end if;
  end loop;

  -- 로그인 사용자 서버 장바구니 비우기
  delete from public.carts
  where user_id = v_uid;

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'order_number', v_order_number
  );
end;
$fn$;

comment on function public.place_order(text, text, text, text, text, text, numeric, numeric, jsonb) is
  '주문 생성·품목 기록·재고 차감·carts 비우기(JWT의 auth.uid() 기준)';

-- ============================================================
-- 5) 권한 — 직접 INSERT 제한, RPC 실행 허용
-- ============================================================

revoke all on public.orders from public;
revoke all on public.order_items from public;

grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;

-- 주문 생성은 place_order RPC만 사용
revoke insert on public.orders from authenticated;
revoke insert on public.order_items from authenticated;

grant all on public.orders to service_role;
grant all on public.order_items to service_role;

grant execute on function public.place_order(text, text, text, text, text, text, numeric, numeric, jsonb) to authenticated;
grant execute on function public.place_order(text, text, text, text, text, text, numeric, numeric, jsonb) to service_role;
