"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { MdExpandLess, MdExpandMore } from "react-icons/md";

export type OrderItemRow = {
  id: number;
  product_name: string;
  price: number;
  quantity: number;
  subtotal: number;
};

export type OrderRow = {
  id: number;
  order_number: string;
  created_at: string;
  total_amount: number;
  status: string;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  shipping_memo: string | null;
  tracking_number: string | null;
  order_items: OrderItemRow[] | null;
};

type Props = {
  orders: OrderRow[];
};

const STATUSES = ["all", "pending", "confirmed", "preparing", "shipping", "delivered", "cancelled"] as const;

const formatVnd = (n: number) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n);

/**
 * 주문 목록, 상태 탭 필터, 상세 펼침 UI
 */
export function MypageOrdersClient({ orders }: Props) {
  const t = useTranslations("mypage.orders");
  const [tab, setTab] = useState<(typeof STATUSES)[number]>("all");
  const [openId, setOpenId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (tab === "all") return orders;
    return orders.filter((o) => o.status === tab);
  }, [orders, tab]);

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setTab(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold sm:text-sm ${
              tab === s ? "bg-brand text-white" : "bg-neutral-100 text-ink hover:bg-neutral-200"
            }`}
          >
            {s === "all" ? t("tabAll") : t(`status_${s}`)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">
          {t("empty")}
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((order) => {
            const open = openId === order.id;
            const items = order.order_items ?? [];
            return (
              <li key={order.id} className="rounded-xl border border-neutral-200 bg-white">
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 p-4 text-left"
                  onClick={() => setOpenId(open ? null : order.id)}
                  aria-expanded={open}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-bold text-brand">{order.order_number}</p>
                    <p className="mt-1 text-xs text-neutral-500">{formatDate(order.created_at)}</p>
                    <p className="mt-2 text-sm">
                      <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium">
                        {STATUSES.includes(order.status as (typeof STATUSES)[number]) && order.status !== "all"
                          ? t(`status_${order.status}` as "status_pending")
                          : order.status}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold">
                      {formatVnd(Number(order.total_amount))} {t("currency")}
                    </span>
                    {open ? <MdExpandLess className="h-5 w-5" /> : <MdExpandMore className="h-5 w-5" />}
                  </div>
                </button>

                {open ? (
                  <div className="space-y-4 border-t border-neutral-100 px-4 pb-4 pt-3 text-sm">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                        {t("detailItems")}
                      </h3>
                      <ul className="mt-2 space-y-2">
                        {items.map((it) => (
                          <li key={it.id} className="flex justify-between gap-2 text-neutral-800">
                            <span className="min-w-0 flex-1">
                              {it.product_name}{" "}
                              <span className="text-neutral-500">×{it.quantity}</span>
                            </span>
                            <span className="shrink-0">{formatVnd(Number(it.subtotal))}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                        {t("detailShipping")}
                      </h3>
                      <dl className="mt-2 space-y-1 text-neutral-700">
                        <div className="flex gap-2">
                          <dt className="w-24 shrink-0 text-neutral-500">{t("recipient")}</dt>
                          <dd>{order.recipient_name}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-24 shrink-0 text-neutral-500">{t("phone")}</dt>
                          <dd>{order.recipient_phone}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-24 shrink-0 text-neutral-500">{t("address")}</dt>
                          <dd className="break-words">{order.shipping_address}</dd>
                        </div>
                        {order.shipping_memo ? (
                          <div className="flex gap-2">
                            <dt className="w-24 shrink-0 text-neutral-500">{t("memo")}</dt>
                            <dd>{order.shipping_memo}</dd>
                          </div>
                        ) : null}
                        {order.tracking_number ? (
                          <div className="flex gap-2">
                            <dt className="w-24 shrink-0 text-neutral-500">{t("tracking")}</dt>
                            <dd className="font-mono">{order.tracking_number}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
