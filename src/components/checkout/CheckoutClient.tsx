"use client";

import { placeOrderAction } from "@/lib/orders/placeOrder";
import { useCartStore } from "@/stores/cartStore";
import { Link, useRouter } from "@/i18n/navigation";
import { useMemo, useState } from "react";

export type CheckoutMessages = {
  title: string;
  empty: string;
  backToCart: string;
  sectionShipping: string;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  shippingMemo: string;
  sectionSummary: string;
  sectionPayment: string;
  payCard: string;
  payCardHint: string;
  payBank: string;
  payBankHint: string;
  payQr: string;
  payQrHint: string;
  payCod: string;
  payCodHint: string;
  subtotal: string;
  shipping: string;
  discount: string;
  total: string;
  currency: string;
  submit: string;
  submitting: string;
  cardBlocked: string;
  errorGeneric: string;
  errorStock: string;
  errorLogin: string;
};

type SiteHints = {
  companyName: string;
  phone: string;
  businessNumber: string;
};

type Props = {
  locale: string;
  messages: CheckoutMessages;
  siteHints: SiteHints;
  shippingFee: number;
};

const formatVnd = (n: number) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n);

const QR_API = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=";

/**
 * 주문/결제 화면: 배송지, 장바구니(선택) 요약, 결제수단, 주문하기.
 */
export function CheckoutClient({ locale, messages, siteHints, shippingFee }: Props) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const selectedLineIds = useCartStore((s) => s.selectedLineIds);
  const clearAll = useCartStore((s) => s.clearAll);

  // 장바구니에서 선택된 줄만 결제; 선택이 없으면 전체 줄을 대상으로 합니다(직접 URL 진입 대비).
  const lines = useMemo(() => {
    const selected = items.filter((i) => selectedLineIds[i.lineId]);
    if (selected.length > 0) return selected;
    return items;
  }, [items, selectedLineIds]);

  const subtotal = useMemo(
    () => lines.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    [lines],
  );

  const discountAmount = 0;
  const total = Math.max(0, subtotal + shippingFee - discountAmount);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [memo, setMemo] = useState("");
  const [payment, setPayment] = useState<"card" | "bank_transfer" | "qr_transfer" | "cod">("cod");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const bankBody = useMemo(() => {
    const parts = [
      siteHints.companyName,
      siteHints.phone,
      siteHints.businessNumber,
      messages.payBankHint,
    ].filter(Boolean);
    return parts.join("\n");
  }, [siteHints, messages.payBankHint]);

  const qrData = useMemo(() => encodeURIComponent(bankBody), [bankBody]);

  const handleSubmit = async () => {
    setFormError(null);
    if (lines.length === 0) {
      setFormError(messages.empty);
      return;
    }
    if (payment === "card") {
      setFormError(messages.cardBlocked);
      return;
    }
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setFormError(messages.errorGeneric);
      return;
    }

    setBusy(true);
    try {
      const res = await placeOrderAction({
        locale,
        recipientName: name.trim(),
        recipientPhone: phone.trim(),
        shippingAddress: address.trim(),
        shippingMemo: memo.trim(),
        paymentMethod: payment,
        shippingFee,
        discountAmount,
        lines: lines.map((l) => ({
          productId: l.productId,
          optionId: l.optionId,
          quantity: l.quantity,
        })),
      });

      if (!res.ok) {
        if (res.code === "login_required") {
          setFormError(messages.errorLogin);
        } else if (
          res.message?.includes("insufficient_stock") ||
          res.message?.includes("insufficient_option_stock")
        ) {
          setFormError(messages.errorStock);
        } else {
          setFormError(messages.errorGeneric);
        }
        return;
      }

      clearAll();
      router.push(`/order-complete/${encodeURIComponent(res.orderNumber)}`);
    } finally {
      setBusy(false);
    }
  };

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <p className="text-neutral-600">{messages.empty}</p>
        <Link href="/cart" className="mt-4 inline-block text-sm font-semibold text-brand underline">
          {messages.backToCart}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr,320px]">
      <div className="space-y-8">
        <section className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
          <h2 className="mb-4 text-base font-bold">{messages.sectionShipping}</h2>
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">{messages.recipientName}</span>
              <input
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">{messages.recipientPhone}</span>
              <input
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">{messages.shippingAddress}</span>
              <textarea
                className="min-h-[88px] w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoComplete="street-address"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">{messages.shippingMemo}</span>
              <input
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
          <h2 className="mb-4 text-base font-bold">{messages.sectionPayment}</h2>
          <div className="space-y-4">
            <label className="flex cursor-pointer gap-3 rounded-lg border border-neutral-200 p-3">
              <input
                type="radio"
                name="pay"
                checked={payment === "card"}
                onChange={() => setPayment("card")}
                className="mt-1"
              />
              <span>
                <span className="font-semibold">{messages.payCard}</span>
                <span className="mt-1 block text-xs text-amber-700">{messages.payCardHint}</span>
              </span>
            </label>

            <label className="flex cursor-pointer gap-3 rounded-lg border border-neutral-200 p-3">
              <input
                type="radio"
                name="pay"
                checked={payment === "bank_transfer"}
                onChange={() => setPayment("bank_transfer")}
                className="mt-1"
              />
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{messages.payBank}</span>
                <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-neutral-50 p-2 text-xs text-neutral-700">
                  {bankBody}
                </pre>
              </span>
            </label>

            <label className="flex cursor-pointer gap-3 rounded-lg border border-neutral-200 p-3">
              <input
                type="radio"
                name="pay"
                checked={payment === "qr_transfer"}
                onChange={() => setPayment("qr_transfer")}
                className="mt-1"
              />
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{messages.payQr}</span>
                <p className="mt-1 text-xs text-neutral-600">{messages.payQrHint}</p>
                <img
                  src={`${QR_API}${qrData}`}
                  alt=""
                  className="mt-2 h-[200px] w-[200px] rounded border border-neutral-200 bg-white"
                  width={200}
                  height={200}
                />
              </span>
            </label>

            <label className="flex cursor-pointer gap-3 rounded-lg border border-neutral-200 p-3">
              <input
                type="radio"
                name="pay"
                checked={payment === "cod"}
                onChange={() => setPayment("cod")}
                className="mt-1"
              />
              <span>
                <span className="font-semibold">{messages.payCod}</span>
                <span className="mt-1 block text-xs text-neutral-600">{messages.payCodHint}</span>
              </span>
            </label>
          </div>
        </section>
      </div>

      <aside className="h-fit space-y-4 rounded-xl border border-neutral-200 bg-white p-4 lg:sticky lg:top-24">
        <h2 className="text-base font-bold">{messages.sectionSummary}</h2>
        <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
          {lines.map((item) => (
            <li key={item.lineId} className="flex justify-between gap-2 border-b border-neutral-100 pb-2">
              <span className="min-w-0 flex-1 truncate">
                {item.name}
                {item.optionLabel ? (
                  <span className="block truncate text-xs text-neutral-500">{item.optionLabel}</span>
                ) : null}
                <span className="text-xs text-neutral-500">×{item.quantity}</span>
              </span>
              <span className="shrink-0 font-medium text-brand">
                {formatVnd(item.unitPrice * item.quantity)} {messages.currency}
              </span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 text-sm text-neutral-700">
          <div className="flex justify-between">
            <span>{messages.subtotal}</span>
            <span>
              {formatVnd(subtotal)} {messages.currency}
            </span>
          </div>
          <div className="flex justify-between">
            <span>{messages.shipping}</span>
            <span>
              {formatVnd(shippingFee)} {messages.currency}
            </span>
          </div>
          <div className="flex justify-between">
            <span>{messages.discount}</span>
            <span>
              {formatVnd(discountAmount)} {messages.currency}
            </span>
          </div>
        </div>
        <p className="border-t border-neutral-100 pt-2 text-base font-bold">
          {messages.total}{" "}
          <span className="text-brand">
            {formatVnd(total)} {messages.currency}
          </span>
        </p>

        {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => void handleSubmit()}
          className="w-full rounded-md bg-brand py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? messages.submitting : messages.submit}
        </button>
      </aside>
    </div>
  );
}
