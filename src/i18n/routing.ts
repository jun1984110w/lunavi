import { defineRouting } from "next-intl/routing";

/**
 * 지원 로케일과 기본 언어(베트남어)를 한곳에서 정의합니다.
 * 미들웨어·내비게이션·정적 경로 생성 등에서 동일한 설정을 가져다 씁니다.
 */
export const routing = defineRouting({
  locales: ["vi", "ko", "en"],
  defaultLocale: "vi",
});
