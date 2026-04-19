-- ============================================================
-- 상품 검색용: 이름(vi/ko/en), slug, search_tags 부분 문자열 매칭
-- PostgREST position() 사용으로 LIKE 와일드카드 주입을 피합니다.
-- Supabase SQL Editor에서 실행 후 앱의 search_product_ids RPC를 사용합니다.
-- ============================================================

create or replace function public.search_product_ids(p_q text, p_limit int default 80)
returns table (id bigint)
language sql
stable
security invoker
set search_path = public
as $f$
  select p.id
  from public.products p
  where p.status = 'active'
    and length(trim(coalesce(p_q, ''))) >= 1
    and (
      position(lower(trim(p_q)) in lower(coalesce(p.name_vi, ''))) > 0
      or position(lower(trim(p_q)) in lower(coalesce(p.name_ko, ''))) > 0
      or position(lower(trim(p_q)) in lower(coalesce(p.name_en, ''))) > 0
      or position(lower(trim(p_q)) in lower(coalesce(p.slug, ''))) > 0
      or exists (
        select 1
        from unnest(coalesce(p.search_tags, array[]::text[])) as tag
        where position(lower(trim(p_q)) in lower(coalesce(tag, ''))) > 0
      )
    )
  order by p.sales_count desc nulls last
  limit greatest(1, least(coalesce(p_limit, 80), 200));
$f$;

comment on function public.search_product_ids(text, int) is '검색어 부분일치로 상품 id 목록 반환(이름·slug·search_tags)';

grant execute on function public.search_product_ids(text, int) to anon;
grant execute on function public.search_product_ids(text, int) to authenticated;
grant execute on function public.search_product_ids(text, int) to service_role;
