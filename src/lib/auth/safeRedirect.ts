import { routing } from "@/i18n/routing";

type Locale = (typeof routing.locales)[number];

/**
 * 로그인 후 `next` 쿼리로 이동할 때 외부 URL로 나가지 않도록 경로를 검증합니다.
 * `/vi|ko|en/...` 형태만 허용합니다.
 */
export function sanitizeAuthRedirectPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return null;
  }
  const segments = raw.split("/").filter(Boolean);
  const first = segments[0];
  if (!first || !routing.locales.includes(first as Locale)) {
    return null;
  }
  return raw;
}

/**
 * 브라우저 절대 경로(`/ko/admin` 등)에서 next-intl `router.push`용 경로(`/admin`)를 뽑습니다.
 */
export function stripLeadingLocaleFromPath(fullPath: string): string {
  const segments = fullPath.split("/").filter(Boolean);
  const first = segments[0];
  if (!first || !routing.locales.includes(first as Locale)) {
    return "/";
  }
  const rest = segments.slice(1).join("/");
  return rest ? `/${rest}` : "/";
}
