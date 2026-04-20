import {
  CheckoutClient,
  type CheckoutMessages,
  type CheckoutSavedAddress,
} from "@/components/checkout/CheckoutClient";
import { getSiteSettings } from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

type Props = {
  params: { locale: string };
};

/** DB shipping_addresses 한 행(결제 페이지에서만 사용) */
type CheckoutSavedAddressRow = {
  id: number;
  label: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  address: string;
  address_detail: string | null;
  is_default: boolean | null;
  created_at: string;
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

  const { data: addrRaw, error: addrError } = await supabase
    .from("shipping_addresses")
    .select("id, label, recipient_name, recipient_phone, address, address_detail, is_default, created_at")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (addrError) {
    console.error("[Checkout] shipping_addresses 조회 실패", addrError.message);
  }

  const savedAddresses: CheckoutSavedAddress[] = ((addrRaw ?? []) as CheckoutSavedAddressRow[]).map((row) => ({
    id: row.id,
    label: row.label,
    recipient_name: row.recipient_name ?? "",
    recipient_phone: row.recipient_phone ?? "",
    fullAddress: [row.address, row.address_detail].filter(Boolean).join("\n").trim(),
    is_default: Boolean(row.is_default),
  }));

  const t = await getTranslations("checkoutPage");
  const site = await getSiteSettings();

  const messages: CheckoutMessages = {
    title: t("title"),
    empty: t("empty"),
    backToCart: t("backToCart"),
    sectionShipping: t("sectionShipping"),
    savedAddressesSection: t("savedAddressesSection"),
    savedAddressManual: t("savedAddressManual"),
    savedAddressPhoneMissing: t("savedAddressPhoneMissing"),
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
    errorPhoneRequired: t("errorPhoneRequired"),
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
        savedAddresses={savedAddresses}
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
