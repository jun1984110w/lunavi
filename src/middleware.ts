import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

/**
 * Supabase Auth 쿠키(세션)를 매 요청마다 갱신해 클라이언트·서버 컴포넌트가 동일한 로그인 상태를 볼 수 있게 합니다.
 * next-intl 미들웨어는 사용하지 않으며(로케일은 `[locale]` 경로로만 처리), 본 미들웨어와 충돌하지 않습니다.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 정적 자산·이미지·파비콘은 제외해 불필요한 세션 갱신을 줄입니다.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
