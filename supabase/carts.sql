-- ============================================================
-- 장바구니 carts 테이블 + RLS (Supabase SQL Editor에서 실행)
-- ============================================================

-- 기존 테이블이 있으면 제거 후 재생성합니다.
drop table if exists public.carts cascade;

create table public.carts (
  id bigint generated always as identity primary key,
  -- auth.users / profiles.id 와 동일한 사용자
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id bigint not null references public.products (id) on delete cascade,
  -- 대표 옵션 행 id (복합 옵션일 때는 null 가능)
  option_id bigint null references public.product_options (id) on delete set null,
  -- 화면·병합용 옵션 요약(예: "색상: 빨강 · 사이즈: L"), 없으면 빈 문자열
  option_label text not null default '',
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

comment on table public.carts is '회원 장바구니(로그인 시 서버 동기화용)';
comment on column public.carts.user_id is 'profiles 기본키와 동일';
comment on column public.carts.product_id is '상품 id';
comment on column public.carts.option_id is '대표 product_options.id (없으면 null)';
comment on column public.carts.option_label is '옵션 조합 표시·유일성 보조 문자열';
comment on column public.carts.quantity is '수량';

-- 동일 사용자·상품·옵션 조합은 1행만 유지
create unique index carts_user_product_option_label
  on public.carts (user_id, product_id, option_label);

create index carts_user_id_idx on public.carts (user_id);

alter table public.carts enable row level security;

-- 본인 장바구니만 조회
create policy "carts_select_own"
  on public.carts for select
  using (auth.uid() = user_id);

-- 본인 장바구니만 삽입
create policy "carts_insert_own"
  on public.carts for insert
  with check (auth.uid() = user_id);

-- 본인 장바구니만 수정
create policy "carts_update_own"
  on public.carts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 본인 장바구니만 삭제
create policy "carts_delete_own"
  on public.carts for delete
  using (auth.uid() = user_id);
