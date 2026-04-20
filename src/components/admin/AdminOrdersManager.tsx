"use client";

import { LabelPrintDialog } from "@/components/admin/LabelPrintDialog";
import type { ShippingLabelOrder, ShippingLabelSeller } from "@/lib/admin/shippingLabelPrintHtml";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

type OrderItemRow = {
  id: number;
  product_name: string;
  quantity: number;
};

type OrderRow = {
  id: number;
  order_number: string;
  status: string;
  created_at: string;
  payment_method: string;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  shipping_memo: string | null;
  total_amount: number;
  order_items: OrderItemRow[] | null;
};

/**
 * 관리자 주문 목록 + 배송 라벨 일괄 인쇄(선택 주문)
 */
export function AdminOrdersManager() {
  const t = useTranslations("adminOrders");
  const supabase = createClient();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [seller, setSeller] = useState<ShippingLabelSeller | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, order_number, status, created_at, payment_method, recipient_name, recipient_phone, shipping_address, shipping_memo, total_amount, order_items(id, product_name, quantity)",
      )
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) {
      setLoadError(error.message);
      setOrders([]);
      setLoading(false);
      return;
    }

    setOrders((data as OrderRow[] | null) ?? []);
    setLoading(false);
  }, [supabase]);

  const loadSiteSeller = useCallback(async () => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("company_name, address, phone, logo_url")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) {
      setSeller({
        companyName: "",
        address: "",
        phone: "",
        logoUrl: null,
      });
      return;
    }

    setSeller({
      companyName: data.company_name ?? "",
      address: data.address ?? "",
      phone: data.phone ?? "",
      logoUrl: data.logo_url ?? null,
    });
  }, [supabase]);

  useEffect(() => {
    void loadOrders();
    void loadSiteSeller();
  }, [loadOrders, loadSiteSeller]);

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([id]) => Number(id)),
    [selected],
  );

  const allSelected = orders.length > 0 && selectedIds.length === orders.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected({});
      return;
    }
    const next: Record<number, boolean> = {};
    orders.forEach((o) => {
      next[o.id] = true;
    });
    setSelected(next);
  };

  const toggleOne = (id: number) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedOrdersForPrint: ShippingLabelOrder[] = useMemo(() => {
    const idSet = new Set(selectedIds);
    return orders
      .filter((o) => idSet.has(o.id))
      .map((o) => ({
        id: o.id,
        order_number: o.order_number,
        created_at: o.created_at,
        payment_method: o.payment_method,
        recipient_name: o.recipient_name,
        recipient_phone: o.recipient_phone,
        shipping_address: o.shipping_address,
        shipping_memo: o.shipping_memo,
        order_items: o.order_items ?? [],
      }));
  }, [orders, selectedIds]);

  const formatVnd = (n: number) =>
    new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n);

  const statusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return t("statusPending");
      case "confirmed":
        return t("statusConfirmed");
      case "preparing":
        return t("statusPreparing");
      case "shipping":
        return t("statusShipping");
      case "delivered":
        return t("statusDelivered");
      case "cancelled":
        return t("statusCancelled");
      default:
        return status;
    }
  };

  const paymentLabel = (method: string) => {
    switch (method) {
      case "card":
        return t("payCard");
      case "bank_transfer":
        return t("payBank");
      case "qr_transfer":
        return t("payQr");
      case "cod":
        return t("payCod");
      default:
        return method;
    }
  };

  const openPrint = () => {
    if (selectedIds.length === 0) {
      return;
    }
    setPrintOpen(true);
  };

  if (loading) {
    return <p className="text-sm text-neutral-600">{t("loading")}</p>;
  }

  if (loadError) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {t("loadFailed")}: {loadError}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            onClick={() => void loadOrders()}
          >
            {t("refresh")}
          </button>
          <button
            type="button"
            disabled={selectedIds.length === 0}
            className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            onClick={openPrint}
          >
            {t("batchPrint")}
          </button>
        </div>
      </div>

      {selectedIds.length === 0 ? (
        <p className="text-xs text-neutral-500">{t("selectOrdersHint")}</p>
      ) : (
        <p className="text-xs text-brand">{t("selectedCount", { count: selectedIds.length })}</p>
      )}

      {orders.length === 0 ? (
        <p className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-neutral-600">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-600">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label={t("colSelect")} />
                </th>
                <th className="px-3 py-2">{t("colOrderNumber")}</th>
                <th className="px-3 py-2">{t("colOrderDate")}</th>
                <th className="px-3 py-2">{t("colRecipient")}</th>
                <th className="px-3 py-2">{t("colPayment")}</th>
                <th className="px-3 py-2">{t("colStatus")}</th>
                <th className="px-3 py-2 text-right">{t("colTotal")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((row) => (
                <tr key={row.id} className="border-b border-neutral-100 hover:bg-neutral-50/80">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={Boolean(selected[row.id])}
                      onChange={() => toggleOne(row.id)}
                      aria-label={t("colSelect")}
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.order_number}</td>
                  <td className="px-3 py-2 text-neutral-600">
                    {new Date(row.created_at).toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="max-w-[10rem] truncate px-3 py-2" title={row.recipient_name}>
                    {row.recipient_name}
                  </td>
                  <td className="px-3 py-2">{paymentLabel(row.payment_method)}</td>
                  <td className="px-3 py-2">{statusLabel(row.status)}</td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatVnd(Number(row.total_amount))} {t("currency")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LabelPrintDialog
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        orders={selectedOrdersForPrint}
        seller={seller}
      />
    </div>
  );
}
