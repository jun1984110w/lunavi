import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "./env";

/**
 * 브라우저(클라이언트 컴포넌트)에서 사용하는 Supabase 클라이언트를 반환합니다.
 * `createBrowserClient`는 싱글톤에 가깝게 동작하여, 여러 번 호출해도 동일한 인스턴스를 재사용합니다.
 */
export function createClient() {
  const { url, anonKey } = getSupabasePublicEnv();

  if (!url || !anonKey) {
    throw new Error(
      "Supabase 공개 환경 변수가 없습니다. .env.local에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY(또는 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)를 설정하세요.",
    );
  }

  return createBrowserClient(url, anonKey);
}
