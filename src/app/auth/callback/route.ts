import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { routing } from "@/i18n/routing";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * `next`가 외부 도메인으로 이어지지 않도록 상대 경로만 허용합니다.
 * `/vi|ko|en/...` 형태가 아니면 기본 로케일의 비밀번호 재설정 페이지로 보냅니다.
 */
function sanitizeNextPath(raw: string | null): string {
  const fallback = `/${routing.defaultLocale}/reset-password`;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return fallback;
  }
  const segments = raw.split("/").filter(Boolean);
  const first = segments[0];
  if (
    !first ||
    !routing.locales.includes(first as (typeof routing.locales)[number])
  ) {
    return fallback;
  }
  return raw;
}

/**
 * Supabase 이메일 링크(PKCE `code`)로 세션을 맞춘 뒤, `next` 쿼리 경로로 리다이렉트합니다.
 * 비밀번호 재설정은 `resetPasswordForEmail`의 redirectTo에 `next=/ko/reset-password` 등이 붙은 URL을 넣습니다.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");
  const rawNext = requestUrl.searchParams.get("next");

  const defaultRecoveryPath = `/${routing.defaultLocale}/reset-password`;
  const nextPath = sanitizeNextPath(
    rawNext ??
      (type === "recovery" ? defaultRecoveryPath : `/${routing.defaultLocale}`),
  );

  const { url: supabaseUrl, anonKey } = getSupabasePublicEnv();
  if (!supabaseUrl || !anonKey) {
    console.error(
      "[Auth][Callback] Supabase 공개 환경 변수가 없어 콜백을 처리할 수 없습니다.",
    );
    return NextResponse.redirect(new URL(`/${routing.defaultLocale}`, requestUrl.origin));
  }

  // 세션 쿠키는 이 리다이렉트 응답에 붙여야 브라우저에 반영됩니다.
  let response = NextResponse.redirect(new URL(nextPath, requestUrl.origin));

  const supabase = createServerClient(supabaseUrl, anonKey, {
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

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[Auth][Callback] exchangeCodeForSession 실패", {
        message: error.message,
        status: error.status,
      });
      response = NextResponse.redirect(new URL(`/${routing.defaultLocale}`, requestUrl.origin));
      return response;
    }
  }

  return response;
}
