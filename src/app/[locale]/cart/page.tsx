import { CartPageClient } from "@/components/cart/CartPageClient";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string };
};

/**
 * 장바구니 페이지 — 목록·선택·합계는 클라이언트 스토어와 연동됩니다.
 */
export default async function CartPage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);

  const t = await getTranslations("cart");

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-3 py-6 sm:px-4 lg:px-6">
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <CartPageClient
        messages={{
          title: t("title"),
          empty: t("empty"),
          continueShopping: t("continueShopping"),
          imageAlt: t("imageAlt"),
          quantity: t("quantity"),
          remove: t("remove"),
          removeSelected: t("removeSelected"),
          selectAll: t("selectAll"),
          subtotal: t("subtotal"),
          shipping: t("shipping"),
          total: t("total"),
          checkout: t("checkout"),
          currency: t("currency"),
        }}
      />
    </div>
  );
}
