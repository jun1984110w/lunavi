import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";

/**
 * 미들웨어 없이도 `/`에서 기본 로케일 홈으로 보냅니다.
 * (next-intl 로케일 접두 라우팅은 `/[locale]` 하위에서 처리)
 */
export default function RootPage() {
  redirect(`/${routing.defaultLocale}`);
}
