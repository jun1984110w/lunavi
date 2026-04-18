import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * 요청마다 next-intl이 사용할 로케일과 메시지(JSON)를 불러옵니다.
 * `createNextIntlPlugin`이 이 파일을 Next 빌드와 연결합니다.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (
    !locale ||
    !routing.locales.includes(locale as (typeof routing.locales)[number])
  ) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
