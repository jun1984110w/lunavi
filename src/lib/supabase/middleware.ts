import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * 미들웨어에서 Supabase 세션을 읽고 필요 시 토큰을 갱신해 응답 쿠키에 반영합니다.
 * 새로고침 후에도 로그인이 유지되도록 하는 핵심 단계입니다.
 */
export async function updateSession(request: NextRequest) {
  const { url, anonKey } = getSupabasePublicEnv();

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options as CookieOptions | undefined);
        });
      },
    },
  });

  // getUser는 JWT를 검증·필요 시 세션 쿠키를 갱신합니다(getSession보다 서버·미들웨어에 적합).
  await supabase.auth.getUser();

  return response;
}
