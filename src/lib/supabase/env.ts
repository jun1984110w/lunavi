/**
 * 브라우저에 노출되는 Supabase 공개 설정입니다.
 * 대시보드의 legacy `anon` 키 또는 새 `publishable` 키 중 하나만 있으면 됩니다.
 */
export function getSupabasePublicEnv(): {
  url: string | undefined;
  anonKey: string | undefined;
} {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  return { url, anonKey };
}
