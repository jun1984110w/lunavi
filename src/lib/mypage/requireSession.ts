import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cache } from "react";

export type MypageProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
};

export type MypageSession = {
  supabase: ReturnType<typeof createClient>;
  user: NonNullable<Awaited<ReturnType<ReturnType<typeof createClient>["auth"]["getUser"]>>["data"]["user"]>;
  profile: MypageProfile;
};

/** 동일 요청 내 레이아웃·페이지에서 세션을 한 번만 조회합니다. */
const loadMypageSession = cache(async (): Promise<MypageSession | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role")
    .eq("id", user.id)
    .maybeSingle();

  const profile = (profileRaw as MypageProfile | null) ?? {
    id: user.id,
    full_name: null,
    email: user.email ?? null,
    phone: null,
    role: "customer",
  };

  return { supabase, user, profile };
});

/**
 * 마이페이지 구역 접근 시 로그인 여부를 확인하고, 미로그인이면 로그인으로 보냅니다.
 * `next` 쿼리는 AuthForm의 sanitize 규칙에 맞게 `/{locale}/...` 절대 경로입니다.
 */
export async function requireMypageUser(locale: string): Promise<MypageSession> {
  const data = await loadMypageSession();
  if (!data) {
    const nextPath = `/${locale}/mypage`;
    redirect(`/${locale}/login?next=${encodeURIComponent(nextPath)}`);
  }
  return data;
}

/** 레이아웃에서 이미 로그인을 보장한 뒤, 페이지에서 세션을 재사용할 때 사용합니다. */
export async function getMypageSession(): Promise<MypageSession | null> {
  return loadMypageSession();
}
