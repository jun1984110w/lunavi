import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * 요청마다 next-intl이 사용할 로케일과 메시지(JSON)를 제공합니다.
 * `[locale]` 세그먼트·미들웨어와 연동되며, 플러그인이 이 파일 경로를 참조합니다.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  const supported = routing.locales as readonly string[];
  if (!locale || !supported.includes(locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
