import { MypageNav } from "@/components/mypage/MypageNav";
import { requireMypageUser } from "@/lib/mypage/requireSession";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  children: React.ReactNode;
  params: { locale: string };
};

/** 세션 기반이므로 빌드 시 정적 HTML로 고정하지 않습니다. */
export const dynamic = "force-dynamic";

/**
 * 마이페이지 공통 레이아웃 — 미로그인 시 로그인으로 보냅니다.
 */
export default async function MypageLayout({ children, params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);
  await requireMypageUser(locale);

  const t = await getTranslations("mypage.layout");

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-4 lg:px-6">
      <h1 className="mb-6 text-xl font-bold">{t("title")}</h1>
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <aside className="shrink-0 md:w-52">
          <MypageNav />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
