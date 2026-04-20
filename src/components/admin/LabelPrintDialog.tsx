"use client";

import {
  DEFAULT_LABEL_PRINT_SETTINGS,
  loadLabelPrintSettings,
  type LabelPrintSettings,
  saveLabelPrintSettings,
} from "@/lib/admin/labelPrintSettings";
import {
  buildShippingLabelPrintDocument,
  type ShippingLabelOrder,
  type ShippingLabelPrintStrings,
  type ShippingLabelSeller,
} from "@/lib/admin/shippingLabelPrintHtml";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

/** 사이트 설정 로딩 전 iframe용 빈 판매자(참조 고정으로 effect 루프 방지) */
const FALLBACK_SELLER: ShippingLabelSeller = {
  companyName: "",
  address: "",
  phone: "",
  logoUrl: null,
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** 인쇄할 주문(선택된 것만) */
  orders: ShippingLabelOrder[];
  /** null이면 아직 사이트 설정을 불러오는 중 */
  seller: ShippingLabelSeller | null;
};

/**
 * 배송 라벨 프린트 설정 + 미리보기(iframe) + window.print()
 */
export function LabelPrintDialog({ open, onClose, orders, seller }: Props) {
  const t = useTranslations("adminOrders");
  const locale = useLocale();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [settings, setSettings] = useState<LabelPrintSettings>(DEFAULT_LABEL_PRINT_SETTINGS);

  // 모달이 열릴 때마다 localStorage에서 최신 설정을 읽어옵니다.
  useEffect(() => {
    if (!open) return;
    setSettings(loadLabelPrintSettings());
  }, [open]);

  // 설정이 바뀔 때마다 localStorage에 저장해 다음 방문 시 그대로 적용합니다.
  useEffect(() => {
    if (!open) return;
    saveLabelPrintSettings(settings);
  }, [open, settings]);

  const strings: ShippingLabelPrintStrings = useMemo(
    () => ({
      sellerTitle: t("lblSeller"),
      recipientTitle: t("lblRecipient"),
      orderNoLabel: t("lblOrderNo"),
      orderDateLabel: t("lblOrderDate"),
      itemsLabel: t("lblItems"),
      paymentLabel: t("lblPayment"),
      memoLabel: t("lblMemo"),
      noMemo: t("lblNoMemo"),
      paymentCard: t("payCard"),
      paymentBank: t("payBank"),
      paymentQr: t("payQr"),
      paymentCod: t("payCod"),
    }),
    [t],
  );

  const sellerForPrint = seller ?? FALLBACK_SELLER;

  useEffect(() => {
    if (!open || orders.length === 0) return;
    const el = iframeRef.current;
    if (!el) return;
    const docHtml = buildShippingLabelPrintDocument(
      orders,
      sellerForPrint,
      settings,
      strings,
      typeof locale === "string" ? locale : "ko",
    );
    el.srcdoc = docHtml;
  }, [open, orders, settings, strings, locale, sellerForPrint]);

  const handlePrint = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="label-print-title"
    >
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <h2 id="label-print-title" className="text-lg font-bold">
            {t("printModalTitle")}
          </h2>
          <button
            type="button"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            onClick={onClose}
          >
            {t("close")}
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <div className="space-y-3 overflow-y-auto rounded-lg border border-neutral-100 bg-neutral-50 p-3 text-sm">
            <h3 className="font-bold text-neutral-800">{t("printSettingsSection")}</h3>

            <label className="block space-y-1">
              <span className="text-neutral-600">{t("printerType")}</span>
              <select
                className="w-full rounded border border-neutral-300 px-2 py-2"
                value={settings.printerType}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    printerType: e.target.value === "label" ? "label" : "a4",
                  }))
                }
              >
                <option value="a4">{t("printerA4")}</option>
                <option value="label">{t("printerLabel")}</option>
              </select>
            </label>

            {settings.printerType === "a4" ? (
              <label className="block space-y-1">
                <span className="text-neutral-600">{t("labelsPerSheet")}</span>
                <select
                  className="w-full rounded border border-neutral-300 px-2 py-2"
                  value={settings.a4LabelsPerSheet}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      a4LabelsPerSheet: Number(e.target.value) as 1 | 2 | 4,
                    }))
                  }
                >
                  <option value={1}>{t("labelsPer1")}</option>
                  <option value={2}>{t("labelsPer2")}</option>
                  <option value={4}>{t("labelsPer4")}</option>
                </select>
              </label>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-neutral-600">{t("labelWidthMm")}</span>
                  <input
                    type="number"
                    min={30}
                    max={300}
                    className="w-full rounded border border-neutral-300 px-2 py-2"
                    value={settings.labelWidthMm}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, labelWidthMm: Number(e.target.value) || s.labelWidthMm }))
                    }
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-neutral-600">{t("labelHeightMm")}</span>
                  <input
                    type="number"
                    min={20}
                    max={400}
                    className="w-full rounded border border-neutral-300 px-2 py-2"
                    value={settings.labelHeightMm}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, labelHeightMm: Number(e.target.value) || s.labelHeightMm }))
                    }
                  />
                </label>
              </div>
            )}

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.showCutLines}
                onChange={(e) => setSettings((s) => ({ ...s, showCutLines: e.target.checked }))}
              />
              <span>{t("showCutLines")}</span>
            </label>

            <fieldset className="space-y-1 rounded border border-neutral-200 p-2">
              <legend className="text-xs text-neutral-500">{t("showFieldsLegend")}</legend>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.showSeller}
                  onChange={(e) => setSettings((s) => ({ ...s, showSeller: e.target.checked }))}
                />
                <span>{t("showSeller")}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.showOrderNumber}
                  onChange={(e) => setSettings((s) => ({ ...s, showOrderNumber: e.target.checked }))}
                />
                <span>{t("showOrderNumber")}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.showProductName}
                  onChange={(e) => setSettings((s) => ({ ...s, showProductName: e.target.checked }))}
                />
                <span>{t("showProductName")}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.showQuantity}
                  onChange={(e) => setSettings((s) => ({ ...s, showQuantity: e.target.checked }))}
                />
                <span>{t("showQuantity")}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.showPayment}
                  onChange={(e) => setSettings((s) => ({ ...s, showPayment: e.target.checked }))}
                />
                <span>{t("showPayment")}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.showShippingMemo}
                  onChange={(e) => setSettings((s) => ({ ...s, showShippingMemo: e.target.checked }))}
                />
                <span>{t("showShippingMemo")}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.showBarcode}
                  onChange={(e) => setSettings((s) => ({ ...s, showBarcode: e.target.checked }))}
                />
                <span>{t("showBarcode")}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.showLogo}
                  onChange={(e) => setSettings((s) => ({ ...s, showLogo: e.target.checked }))}
                />
                <span>{t("showLogo")}</span>
              </label>
            </fieldset>

            {settings.showBarcode ? (
              <label className="block space-y-1">
                <span className="text-neutral-600">{t("codeKind")}</span>
                <select
                  className="w-full rounded border border-neutral-300 px-2 py-2"
                  value={settings.codeKind}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      codeKind: e.target.value === "barcode" ? "barcode" : "qrcode",
                    }))
                  }
                >
                  <option value="barcode">{t("codeKindBarcode")}</option>
                  <option value="qrcode">{t("codeKindQr")}</option>
                </select>
              </label>
            ) : null}

            <label className="block space-y-1">
              <span className="text-neutral-600">{t("fontSize")}</span>
              <select
                className="w-full rounded border border-neutral-300 px-2 py-2"
                value={settings.fontSize}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    fontSize: e.target.value === "sm" || e.target.value === "lg" ? e.target.value : "md",
                  }))
                }
              >
                <option value="sm">{t("fontSmall")}</option>
                <option value="md">{t("fontMedium")}</option>
                <option value="lg">{t("fontLarge")}</option>
              </select>
            </label>
          </div>

          <div className="flex min-h-0 flex-col gap-2">
            <h3 className="text-sm font-bold text-neutral-800">{t("preview")}</h3>
            {!seller ? (
              <p className="text-sm text-neutral-500">{t("sellerLoading")}</p>
            ) : (
              <iframe
                ref={iframeRef}
                title={t("preview")}
                className="min-h-[360px] w-full flex-1 rounded border border-neutral-200 bg-white"
              />
            )}
            <p className="text-xs text-neutral-500">{t("printHint")}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={!seller || orders.length === 0}
                onClick={handlePrint}
              >
                {t("printButton")}
              </button>
              <button type="button" className="rounded-md border border-neutral-300 px-4 py-2 text-sm" onClick={onClose}>
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
