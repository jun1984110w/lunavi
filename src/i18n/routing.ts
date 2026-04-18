import { defineRouting } from "next-intl/routing";

/**
 * 지원 로케일과 기본 로케일(베트남어)을 정의합니다.
 * `localePrefix: 'as-needed'`이면 기본 로케일(vi) URL에는 `/vi` 접두사를 붙이지 않습니다.
 */
export const routing = defineRouting({
  locales: ["vi", "ko", "en"],
  defaultLocale: "vi",
  localePrefix: "as-needed",
});
