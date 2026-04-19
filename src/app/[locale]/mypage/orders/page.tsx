import { MypageOrdersClient, type OrderRow } from "@/components/mypage/MypageOrdersClient";
import { requireMypageUser } from "@/lib/mypage/requireSession";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string };
};

/**
 * 주문 내역 — 본인 주문만 조회(RLS)
 */
export default async function MypageOrdersPage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);

  const { supabase, user } = await requireMypageUser(locale);
  const t = await getTranslations("mypage.orders");

  const { data: raw, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      created_at,
      total_amount,
      status,
      recipient_name,
      recipient_phone,
      shipping_address,
      shipping_memo,
      tracking_number,
      order_items ( id, product_name, price, quantity, subtotal )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const orders = (raw as OrderRow[] | null) ?? [];

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {t("loadError")}: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">{t("title")}</h2>
      <MypageOrdersClient orders={orders} />
    </div>
  );
}
