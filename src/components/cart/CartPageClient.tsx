"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useCartStore } from "@/stores/cartStore";
import { useMemo } from "react";

type Messages = {
  title: string;
  empty: string;
  continueShopping: string;
  imageAlt: string;
  quantity: string;
  remove: string;
  removeSelected: string;
  selectAll: string;
  subtotal: string;
  shipping: string;
  total: string;
  checkout: string;
  currency: string;
};

type Props = {
  messages: Messages;
};

const SHIPPING_FEE = 30000;

const formatVnd = (n: number) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n);

/**
 * 장바구니 목록·선택·수량·합계·주문하기 UI입니다.
 */
export function CartPageClient({ messages }: Props) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const selectedLineIds = useCartStore((s) => s.selectedLineIds);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeLine = useCartStore((s) => s.removeLine);
  const removeSelectedLines = useCartStore((s) => s.removeSelectedLines);
  const setAllSelected = useCartStore((s) => s.setAllSelected);
  const toggleLineSelected = useCartStore((s) => s.toggleLineSelected);

  const allSelected = useMemo(() => {
    if (items.length === 0) return false;
    return items.every((i) => selectedLineIds[i.lineId]);
  }, [items, selectedLineIds]);

  const selectedSubtotal = useMemo(() => {
    return items.reduce((sum, i) => {
      if (!selectedLineIds[i.lineId]) return sum;
      return sum + i.unitPrice * i.quantity;
    }, 0);
  }, [items, selectedLineIds]);

  const total = selectedSubtotal + (selectedSubtotal > 0 ? SHIPPING_FEE : 0);

  const handleSelectAll = (checked: boolean) => {
    setAllSelected(checked);
  };

  const handleCheckout = () => {
    if (selectedSubtotal <= 0) return;
    router.push("/checkout");
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <p className="text-neutral-600">{messages.empty}</p>
        <Link href="/" className="mt-4 inline-block text-sm font-semibold text-brand underline">
          {messages.continueShopping}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr,280px]">
      <div className="space-y-3">
        <label className="flex items-center gap-2 border-b border-neutral-200 pb-2 text-sm">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => {
              handleSelectAll(e.target.checked);
            }}
          />
          <span>{messages.selectAll}</span>
        </label>

        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.lineId}
              className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-3 sm:gap-4"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={Boolean(selectedLineIds[item.lineId])}
                onChange={() => toggleLineSelected(item.lineId)}
              />
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={messages.imageAlt}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-neutral-400">
                    —
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/product/${item.productSlug}`}
                  className="line-clamp-2 text-sm font-semibold text-ink hover:text-brand"
                >
                  {item.name}
                </Link>
                {item.optionLabel ? (
                  <p className="mt-1 text-xs text-neutral-500">{item.optionLabel}</p>
                ) : null}
                <p className="mt-1 text-sm font-semibold text-brand">
                  {formatVnd(item.unitPrice)} {messages.currency}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-neutral-600">{messages.quantity}</span>
                  <div className="flex items-center gap-1 rounded border border-neutral-200">
                    <button
                      type="button"
                      className="px-2 py-1 text-sm"
                      onClick={() => {
                        // 수량 1에서 감소 시 스토어 최소값(1)에 막히므로, 줄을 삭제합니다.
                        if (item.quantity <= 1) removeLine(item.lineId);
                        else setQuantity(item.lineId, item.quantity - 1);
                      }}
                    >
                      −
                    </button>
                    <span className="min-w-[2rem] text-center text-sm">{item.quantity}</span>
                    <button
                      type="button"
                      className="px-2 py-1 text-sm"
                      onClick={() => setQuantity(item.lineId, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-red-600 underline"
                    onClick={() => removeLine(item.lineId)}
                  >
                    {messages.remove}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="text-sm text-red-600 underline"
          onClick={() => removeSelectedLines()}
        >
          {messages.removeSelected}
        </button>
      </div>

      <aside className="h-fit space-y-3 rounded-xl border border-neutral-200 bg-white p-4 lg:sticky lg:top-20">
        <p className="text-sm text-neutral-600">
          {messages.subtotal}{" "}
          <span className="font-semibold text-ink">
            {formatVnd(selectedSubtotal)} {messages.currency}
          </span>
        </p>
        <p className="text-sm text-neutral-600">
          {messages.shipping}{" "}
          <span className="font-semibold text-ink">
            {selectedSubtotal > 0 ? `${formatVnd(SHIPPING_FEE)} ${messages.currency}` : "—"}
          </span>
        </p>
        <p className="border-t border-neutral-100 pt-2 text-base font-bold">
          {messages.total}{" "}
          <span className="text-brand">
            {formatVnd(total)} {messages.currency}
          </span>
        </p>
        <button
          type="button"
          disabled={selectedSubtotal <= 0}
          className="w-full rounded-md bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          onClick={handleCheckout}
        >
          {messages.checkout}
        </button>
      </aside>
    </div>
  );
}
