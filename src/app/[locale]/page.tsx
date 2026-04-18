import { createClient } from "@/lib/supabase/server";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string };
};

/** site_settings 한 행에서 화면에 쓸 필드만 최소 정의 (전체 스키마는 DB와 맞추면 됨) */
type SiteSettingsRow = {
  id: number;
  site_name?: string | null;
};

/**
 * 홈 화면 예시입니다. `nav`·`common`·`product` 네임스페이스 키 사용을 보여 줍니다.
 * 상단에 Supabase 서버 클라이언트로 인증·DB 조회 상태를 표시합니다.
 */
export default async function HomePage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);

  const tNav = await getTranslations("nav");
  const tCommon = await getTranslations("common");
  const tProduct = await getTranslations("product");

  // 서버 컴포넌트에서 요청별 Supabase 클라이언트 생성 (쿠키 기반 세션)
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const userEmail = userData.user?.email ?? null;

  const { data: siteSettingsRaw, error: siteSettingsError } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();

  const siteSettings = siteSettingsRaw as SiteSettingsRow | null;
  const siteNameOk =
    !siteSettingsError &&
    siteSettings &&
    typeof siteSettings.site_name === "string" &&
    siteSettings.site_name.length > 0;

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col gap-8 p-8">
      {/* Supabase 연결·인증·site_settings 조회 디버그 (운영 전 제거 또는 관리자 전용으로 옮기기) */}
      <section
        className="rounded-lg border border-dashed border-orange-300 bg-orange-50/80 p-4 text-sm text-[#333333] dark:border-orange-700 dark:bg-orange-950/40 dark:text-neutral-100"
        aria-label="Supabase 연결 상태"
      >
        <p className="font-semibold text-brand">DB 연결 확인</p>
        <p className="mt-2">
          {userEmail
            ? `Supabase 연결됨 / 로그인 사용자: ${userEmail}`
            : "Supabase 연결됨 / 로그인 안됨"}
        </p>
        <p className="mt-2 border-t border-orange-200 pt-2 dark:border-orange-800">
          {siteNameOk && siteSettings
            ? `site_settings.site_name: ${siteSettings.site_name}`
            : "site_settings 데이터 없음"}
        </p>
      </section>

      <header>
        <p className="text-sm text-neutral-500">locale: {locale}</p>
        <h1 className="mt-2 text-2xl font-semibold">{tNav("home")}</h1>
      </header>

      <nav className="flex flex-wrap gap-3 text-sm">
        <span className="rounded-md border px-3 py-1">{tNav("home")}</span>
        <span className="rounded-md border px-3 py-1">{tNav("category")}</span>
        <span className="rounded-md border px-3 py-1">{tNav("search")}</span>
        <span className="rounded-md border px-3 py-1">{tNav("cart")}</span>
        <span className="rounded-md border px-3 py-1">{tNav("mypage")}</span>
      </nav>

      <section className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          {tCommon("login")}
        </button>
        <button type="button" className="rounded-md border px-4 py-2 text-sm">
          {tCommon("signup")}
        </button>
        <button type="button" className="rounded-md border px-4 py-2 text-sm">
          {tCommon("logout")}
        </button>
        <span className="self-center text-sm text-neutral-600">
          {tCommon("search")}
        </span>
      </section>

      <section className="rounded-lg border p-4">
        <p className="font-medium">{tProduct("price")}</p>
        <p className="mt-1 text-sm text-neutral-600">{tProduct("reviews")}</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="rounded-md border px-4 py-2 text-sm"
          >
            {tProduct("addToCart")}
          </button>
          <button
            type="button"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            {tProduct("buyNow")}
          </button>
        </div>
      </section>
    </main>
  );
}
