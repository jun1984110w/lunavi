import { syncProfileFromUserMetadataAfterCallback } from "@/lib/auth/profileSignupSync";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { routing } from "@/i18n/routing";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

type AppLocale = (typeof routing.locales)[number];

/**
 * `next=/ko/reset-password` 같은 값에서 로케일만 추출합니다. 없거나 잘못되면 기본 로케일입니다.
 */
function pickLocaleFromNext(rawNext: string | null): AppLocale {
  if (!rawNext || !rawNext.startsWith("/")) {
    return routing.defaultLocale;
  }
  const first = rawNext.split("/").filter(Boolean)[0];
  if (routing.locales.includes(first as AppLocale)) {
    return first as AppLocale;
  }
  return routing.defaultLocale;
}

/**
 * 로그인으로 보낼 때 외부로 나가지 않도록 `next`의 로케일만 사용합니다.
 */
function loginPath(locale: AppLocale): string {
  return `/${locale}/login`;
}

/**
 * OAuth 등에서 사용할 수 있는 안전한 상대 경로만 허용합니다.
 */
function safeNextPath(raw: string | null, locale: AppLocale): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return `/${locale}`;
  }
  const first = raw.split("/").filter(Boolean)[0];
  if (!routing.locales.includes(first as AppLocale)) {
    return `/${locale}`;
  }
  return raw;
}

/**
 * Supabase 이메일 링크의 `code`로 세션을 만든 뒤, recovery면 비밀번호 재설정 페이지로 보냅니다.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const rawNext = url.searchParams.get("next");
  const locale = pickLocaleFromNext(rawNext);
  const origin = url.origin;

  const { url: supabaseUrl, anonKey } = getSupabasePublicEnv();
  if (!supabaseUrl || !anonKey) {
    console.error("[Auth][Callback] Supabase 환경 변수가 없습니다.");
    return NextResponse.redirect(new URL(loginPath(routing.defaultLocale), origin));
  }

  // code가 없으면 교환할 수 없으므로 로그인으로 보냅니다.
  if (!code) {
    return NextResponse.redirect(new URL(loginPath(locale), origin));
  }

  // 일부 환경에서는 type 쿼리가 빠질 수 있어, next가 재설정 페이지를 가리키면 recovery로 간주합니다.
  const nextLooksLikeReset =
    Boolean(rawNext) && rawNext!.split("?")[0].replace(/\/+$/, "").endsWith("/reset-password");
  const isRecovery = type === "recovery" || nextLooksLikeReset;
  const afterExchangePath = isRecovery
    ? `/${locale}/reset-password`
    : safeNextPath(rawNext, locale);

  let response = NextResponse.redirect(new URL(afterExchangePath, origin));

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

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[Auth][Callback] exchangeCodeForSession 실패", {
      message: error.message,
      status: error.status,
    });
    response = NextResponse.redirect(new URL(loginPath(locale), origin));
  } else if (!isRecovery) {
    // 비밀번호 재설정(recovery)이 아닐 때만: 가입 시 metadata에만 있던 phone 등을 profiles에 맞춥니다.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await syncProfileFromUserMetadataAfterCallback(supabase, user);
    }
  }

  response.headers.set("Cache-Control", "no-store, must-revalidate");

  return response;
}
