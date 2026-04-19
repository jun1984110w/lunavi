import { CheckoutClient, type CheckoutMessages } from "@/components/checkout/CheckoutClient";
import { getSiteSettings } from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

type Props = {
  params: { locale: string };
};

/** 장바구니와 동일한 기본 배송비(VND) */
const DEFAULT_SHIPPING_FEE = 30000;

/**
 * 주문/결제 페이지 — 로그인 필요, 장바구니에서 선택된 줄만 결제 대상입니다.
 */
export default async function CheckoutPage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations("checkoutPage");
  const site = await getSiteSettings();

  const messages: CheckoutMessages = {
    title: t("title"),
    empty: t("empty"),
    backToCart: t("backToCart"),
    sectionShipping: t("sectionShipping"),
    recipientName: t("recipientName"),
    recipientPhone: t("recipientPhone"),
    shippingAddress: t("shippingAddress"),
    shippingMemo: t("shippingMemo"),
    sectionSummary: t("sectionSummary"),
    sectionPayment: t("sectionPayment"),
    payCard: t("payCard"),
    payCardHint: t("payCardHint"),
    payBank: t("payBank"),
    payBankHint: t("payBankHint"),
    payQr: t("payQr"),
    payQrHint: t("payQrHint"),
    payCod: t("payCod"),
    payCodHint: t("payCodHint"),
    subtotal: t("subtotal"),
    shipping: t("shipping"),
    discount: t("discount"),
    total: t("total"),
    currency: t("currency"),
    submit: t("submit"),
    submitting: t("submitting"),
    cardBlocked: t("cardBlocked"),
    errorGeneric: t("errorGeneric"),
    errorStock: t("errorStock"),
    errorLogin: t("errorLogin"),
  };

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-3 py-6 sm:px-4 lg:px-6">
      <h1 className="text-xl font-bold">{messages.title}</h1>
      <CheckoutClient
        locale={locale}
        messages={messages}
        shippingFee={DEFAULT_SHIPPING_FEE}
        siteHints={{
          companyName: site.companyName,
          phone: site.phone,
          businessNumber: site.businessNumber,
        }}
      />
    </main>
  );
}
