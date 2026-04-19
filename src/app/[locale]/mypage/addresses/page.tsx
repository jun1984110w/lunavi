import { MypageAddressesClient, type ShippingAddressRow } from "@/components/mypage/MypageAddressesClient";
import { requireMypageUser } from "@/lib/mypage/requireSession";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string };
};

/**
 * 배송지 관리 — shipping_addresses 테이블 연동
 */
export default async function MypageAddressesPage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);

  const { supabase, user, profile } = await requireMypageUser(locale);
  const t = await getTranslations("mypage.addresses");

  const { data: raw, error } = await supabase
    .from("shipping_addresses")
    .select("id, label, recipient_name, recipient_phone, address, address_detail, is_default, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="space-y-2">
        <h2 className="text-lg font-bold">{t("title")}</h2>
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {t("loadError")}: {error.message}
        </p>
      </div>
    );
  }

  const rows = (raw as ShippingAddressRow[] | null) ?? [];
  const isWholesale = profile.role === "wholesale";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">{t("title")}</h2>
      <MypageAddressesClient initial={rows} isWholesale={isWholesale} locale={locale} />
    </div>
  );
}
