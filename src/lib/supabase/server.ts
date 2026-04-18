import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 서버 컴포넌트, 서버 액션, 라우트 핸들러 등에서 사용하는 Supabase 클라이언트를 반환합니다.
 * 요청마다 새로 만들어야 하며, 쿠키는 현재 요청의 `cookies()` 스토어와 연결됩니다.
 *
 * 서버 컴포넌트에서는 응답 쿠키를 쓸 수 없는 경우가 있어 `setAll`이 실패할 수 있습니다.
 * 그때는 미들웨어에서 세션을 갱신하도록 두는 것이 일반적인 패턴입니다.
 */
export function createClient() {
  const cookieStore = cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다. .env.local을 확인하세요.",
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // 서버 컴포넌트 등에서 쿠키를 설정할 수 없는 경우 — 미들웨어에서 세션을 갱신합니다.
        }
      },
    },
  });
}
