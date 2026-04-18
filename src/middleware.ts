import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "./lib/supabase/env";
import { routing } from "./i18n/routing";

/**
 * next-intl: 로케일 접두사·리다이렉트·협상을 처리합니다.
 * Supabase: 세션을 읽고 필요 시 갱신한 뒤 응답 쿠키에 반영합니다.
 *
 * intl 미들웨어가 만든 응답(리다이렉트/rewrite 포함)에 Supabase 쿠키를 합칩니다.
 */
const handleI18n = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  const intlResponse = handleI18n(request);

  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabasePublicEnv();

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "미들웨어: Supabase URL 또는 공개 키(ANON_KEY / PUBLISHABLE_KEY)가 없습니다.",
    );
    return intlResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          intlResponse.cookies.set(name, value, options);
        });
        Object.entries(headersToSet).forEach(([key, value]) => {
          intlResponse.headers.set(key, value);
        });
      },
    },
  });

  // createServerClient 직후와 getUser() 사이에 다른 비동기 작업을 끼우지 마세요.
  await supabase.auth.getUser();

  return intlResponse;
}

export const config = {
  matcher: [
    // API·Next 내부·Vercel·확장자 있는 정적 파일 등은 제외합니다.
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
