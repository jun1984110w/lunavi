-- ============================================================
-- 배송지 shipping_addresses (없을 때만 실행하거나 컬럼을 맞춰 주세요)
-- 앱 코드 기대 컬럼: label(별칭), recipient_name, recipient_phone,
--   address, address_detail, is_default, created_at, updated_at
-- ============================================================

create table if not exists public.shipping_addresses (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- 별칭: 집, 회사, 창고 등 (필수)
  label text not null,
  recipient_name text not null,
  recipient_phone text not null,
  address text not null,
  address_detail text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.shipping_addresses is '회원 배송지 목록';
comment on column public.shipping_addresses.label is '배송지 별칭(검색·정렬 기준)';
comment on column public.shipping_addresses.address is '기본 주소';
comment on column public.shipping_addresses.address_detail is '상세 주소';
comment on column public.shipping_addresses.is_default is '기본 배송지 여부';

create index if not exists shipping_addresses_user_id_idx on public.shipping_addresses (user_id);
create index if not exists shipping_addresses_label_idx on public.shipping_addresses (user_id, lower(label));

-- updated_at 자동 갱신
create or replace function public.touch_shipping_addresses_updated_at()
returns trigger
language plpgsql
as $t$
begin
  new.updated_at := now();
  return new;
end;
$t$;

drop trigger if exists tr_shipping_addresses_touch_updated_at on public.shipping_addresses;
create trigger tr_shipping_addresses_touch_updated_at
  before update on public.shipping_addresses
  for each row
  execute procedure public.touch_shipping_addresses_updated_at();

alter table public.shipping_addresses enable row level security;

drop policy if exists shipping_addresses_select_own on public.shipping_addresses;
drop policy if exists shipping_addresses_insert_own on public.shipping_addresses;
drop policy if exists shipping_addresses_update_own on public.shipping_addresses;
drop policy if exists shipping_addresses_delete_own on public.shipping_addresses;

create policy shipping_addresses_select_own
  on public.shipping_addresses for select
  using (auth.uid() = user_id);

create policy shipping_addresses_insert_own
  on public.shipping_addresses for insert
  with check (auth.uid() = user_id);

create policy shipping_addresses_update_own
  on public.shipping_addresses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy shipping_addresses_delete_own
  on public.shipping_addresses for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.shipping_addresses to authenticated;
grant all on public.shipping_addresses to service_role;
