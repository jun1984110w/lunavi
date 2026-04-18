import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

/**
 * next-intl: 로케일 협상, 리다이렉트/리라이트, 쿠키·헤더 처리
 */
const handleI18nRouting = createIntlMiddleware(routing);

/**
 * 1) next-intl로 로케일 라우팅을 적용한 응답을 만든 뒤,
 * 2) 동일 응답에 Supabase Auth 세션 갱신 쿠키·캐시 방지 헤더를 합칩니다.
 * Supabase의 `setAll`은 intl이 만든 `response`에 쿠키를 써야 리다이렉트/리라이트가 깨지지 않습니다.
 */
export async function middleware(request: NextRequest) {
  const response = handleI18nRouting(request);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "미들웨어: NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 없습니다.",
    );
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headersToSet).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  // createServerClient 직후와 getUser() 사이에 다른 비동기 작업을 끼우지 마세요.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // API·Next 내부·Vercel·확장자 있는 정적 파일 등은 제외 (next-intl 권장 패턴과 동일 취지)
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
