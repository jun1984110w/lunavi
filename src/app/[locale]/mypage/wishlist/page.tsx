import { requireMypageUser } from "@/lib/mypage/requireSession";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string };
};

/**
 * 찜 목록 — Phase 3 예정(현재는 안내 전용)
 */
export default async function MypageWishlistPage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);
  await requireMypageUser(locale);

  const t = await getTranslations("mypage.wishlist");

  return (
    <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 p-10 text-center">
      <h2 className="text-lg font-bold">{t("title")}</h2>
      <p className="mt-3 text-sm text-neutral-600">{t("phase3")}</p>
    </div>
  );
}
