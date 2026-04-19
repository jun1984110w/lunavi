import { MypageProfileClient } from "@/components/mypage/MypageProfileClient";
import { requireMypageUser } from "@/lib/mypage/requireSession";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string };
};

/**
 * 회원정보 수정 — 이름·전화(profiles), 비밀번호(Auth)
 */
export default async function MypageProfilePage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);

  const { user, profile } = await requireMypageUser(locale);
  const t = await getTranslations("mypage.profile");

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">{t("title")}</h2>
      <MypageProfileClient
        initialName={profile.full_name ?? ""}
        initialPhone={profile.phone ?? ""}
        email={profile.email ?? user.email ?? ""}
      />
    </div>
  );
}
