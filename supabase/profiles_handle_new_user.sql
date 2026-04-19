-- =============================================================================
-- 회원가입(auth.users INSERT) 시 public.profiles 자동 생성/값 채우기
-- Supabase SQL Editor(또는 마이그레이션)에서 실행하세요.
-- 의존: public.profiles 테이블(id = auth.users.id 참조 등 기존 스키마)
-- =============================================================================

-- 로그인 방식 문자열(email, google, facebook 등) 저장용 컬럼이 없으면 추가합니다.
alter table public.profiles
  add column if not exists provider text;

comment on column public.profiles.provider is 'auth.raw_app_meta_data.provider (예: email, google, facebook)';

-- -----------------------------------------------------------------------------
-- 신규 사용자 1명당 1행: 메타데이터에서 full_name, phone, provider를 복사합니다.
-- security definer: RLS를 우회해 트리거만 확실히 INSERT 할 수 있게 합니다.
--
-- 연락처 키: GoTrue는 이메일 가입 시 OIDC Claims에 'phone' 슬롯을 먼저 두고 options.data를 병합하는데,
-- 이 때문에 클라이언트가 넘긴 'phone' 값이 identity 메타에 들어가지 않을 수 있습니다.
-- 앱에서는 contact_phone(또는 phone_number)으로 내며, 여기서는 여러 키를 순서대로 읽습니다.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    phone,
    provider,
    role
  )
  values (
    new.id,
    new.email,
    -- 회원가입 폼·OAuth 등에서 넘긴 표시 이름
    nullif(btrim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    -- contact_phone 권장(GoTrue와 OIDC 'phone' 키 충돌 방지). 구버전 호환으로 phone_number, phone 순.
    nullif(
      btrim(
        coalesce(
          new.raw_user_meta_data->>'contact_phone',
          new.raw_user_meta_data->>'phone_number',
          new.raw_user_meta_data->>'phone',
          ''
        )
      ),
      ''
    ),
    -- Supabase가 채우는 로그인 제공자(이메일/소셜)
    nullif(btrim(coalesce(new.raw_app_meta_data->>'provider', '')), ''),
    'customer'
  );

  return new;
end;
$$;

comment on function public.handle_new_user() is 'auth.users 신규 행 INSERT 후 public.profiles에 동기화(full_name, phone, provider 포함)';

-- 트리거 실행 권한: Supabase Auth가 이 함수를 호출할 수 있어야 합니다.
revoke all on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to supabase_auth_admin;

-- 기존 트리거가 있으면 이름 충돌을 피하기 위해 제거 후 다시 연결합니다.
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
