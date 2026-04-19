import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

type Props = {
  params: { locale: string; orderNumber: string };
};

type OrderRow = {
  order_number: string;
  payment_method: string;
  created_at: string;
};

/**
 * 주문 완료 안내 — URL의 주문번호와 로그인 사용자가 일치하는 주문만 표시합니다.
 */
export default async function OrderCompletePage({ params }: Props) {
  const { locale, orderNumber: raw } = params;
  setRequestLocale(locale);

  const orderNumber = decodeURIComponent(raw);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: orderRaw } = await supabase
    .from("orders")
    .select("order_number, payment_method, created_at")
    .eq("order_number", orderNumber)
    .eq("user_id", user.id)
    .maybeSingle();

  const order = orderRaw as OrderRow | null;
  if (!order) {
    notFound();
  }

  const t = await getTranslations("orderComplete");

  const created = new Date(order.created_at);
  const eta = new Date(created);
  eta.setDate(eta.getDate() + 5);

  const etaStr = new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : locale === "en" ? "en-US" : "vi-VN", {
    dateStyle: "medium",
  }).format(eta);

  const paymentLabelMap: Record<string, string> = {
    card: t("paymentCard"),
    bank_transfer: t("paymentBank"),
    qr_transfer: t("paymentQr"),
    cod: t("paymentCod"),
  };
  const paymentLabel = paymentLabelMap[order.payment_method] ?? t("paymentUnknown");

  return (
    <main className="mx-auto w-full max-w-lg space-y-6 px-3 py-12 text-center sm:px-4">
      <h1 className="text-2xl font-bold text-brand">{t("heading")}</h1>
      <p className="text-sm text-neutral-600">{t("thanks")}</p>

      <dl className="rounded-xl border border-neutral-200 bg-white p-5 text-left text-sm">
        <div className="flex justify-between gap-2 border-b border-neutral-100 py-2">
          <dt className="text-neutral-500">{t("orderNumber")}</dt>
          <dd className="font-mono font-semibold">{order.order_number}</dd>
        </div>
        <div className="flex justify-between gap-2 border-b border-neutral-100 py-2">
          <dt className="text-neutral-500">{t("paymentMethod")}</dt>
          <dd>{paymentLabel}</dd>
        </div>
        <div className="flex justify-between gap-2 py-2">
          <dt className="text-neutral-500">{t("estimatedDelivery")}</dt>
          <dd className="text-right font-medium">{etaStr}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-semibold"
        >
          {t("continueShopping")}
        </Link>
        <Link
          href="/mypage/orders"
          className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white"
        >
          {t("viewOrders")}
        </Link>
      </div>
    </main>
  );
}
