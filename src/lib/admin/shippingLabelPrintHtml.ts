import type { LabelPrintSettings } from "@/lib/admin/labelPrintSettings";

/**
 * 배송 라벨용 HTML 문자열 생성(iframe srcdoc / 인쇄).
 * A4 격자 분할·라벨 mm·절단선·항목 ON/OFF를 반영합니다.
 */

/** 인쇄용으로 묶은 주문 한 건 */
export type ShippingLabelOrder = {
  id: number;
  order_number: string;
  created_at: string;
  payment_method: string;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  shipping_memo: string | null;
  order_items: { product_name: string; quantity: number }[];
};

/** site_settings 기반 판매자(발송인) 정보 */
export type ShippingLabelSeller = {
  companyName: string;
  address: string;
  phone: string;
  logoUrl: string | null;
};

/** 라벨 안에 찍히는 문구(이미 번역된 문자열) */
export type ShippingLabelPrintStrings = {
  sellerTitle: string;
  recipientTitle: string;
  orderNoLabel: string;
  orderDateLabel: string;
  itemsLabel: string;
  paymentLabel: string;
  memoLabel: string;
  noMemo: string;
  paymentCard: string;
  paymentBank: string;
  paymentQr: string;
  paymentCod: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/\n/g, " ");
}

function paymentLabelFor(method: string, t: ShippingLabelPrintStrings): string {
  switch (method) {
    case "card":
      return t.paymentCard;
    case "bank_transfer":
      return t.paymentBank;
    case "qr_transfer":
      return t.paymentQr;
    case "cod":
      return t.paymentCod;
    default:
      return method;
  }
}

function fontSizePt(size: LabelPrintSettings["fontSize"]): string {
  if (size === "sm") return "9pt";
  if (size === "lg") return "12pt";
  return "10.5pt";
}

function qrSrc(orderNumber: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(orderNumber)}`;
}

/** Code128 바코드 이미지(외부 API — 인쇄 시 네트워크 필요) */
function barcodeSrc(orderNumber: string): string {
  return `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(orderNumber)}&includetext&scale=2`;
}

/**
 * 한 주문에 대한 라벨 본문 HTML(셀 하나 안에 들어갈 내용)을 만듭니다.
 */
function buildSingleLabelInner(
  order: ShippingLabelOrder,
  seller: ShippingLabelSeller,
  settings: LabelPrintSettings,
  strings: ShippingLabelPrintStrings,
  locale: string,
): string {
  const fs = fontSizePt(settings.fontSize);
  const parts: string[] = [];

  parts.push(`<div class="lbl" style="font-size:${fs};line-height:1.35;box-sizing:border-box;height:100%;display:flex;flex-direction:column;gap:0.35em;padding:2mm;overflow:hidden;">`);

  if (settings.showLogo && seller.logoUrl) {
    parts.push(
      `<div class="lbl-logo"><img src="${escapeAttr(seller.logoUrl)}" alt="" style="max-height:10mm;max-width:40mm;object-fit:contain;" /></div>`,
    );
  }

  if (settings.showSeller) {
    parts.push(`<div class="lbl-seller"><strong>${escapeHtml(strings.sellerTitle)}</strong><br/>`);
    if (seller.companyName) parts.push(`${escapeHtml(seller.companyName)}<br/>`);
    if (seller.address) parts.push(`${escapeHtml(seller.address)}<br/>`);
    if (seller.phone) parts.push(`${escapeHtml(seller.phone)}`);
    parts.push(`</div>`);
  }

  parts.push(`<div class="lbl-recipient"><strong>${escapeHtml(strings.recipientTitle)}</strong><br/>`);
  parts.push(`${escapeHtml(order.recipient_name)} / ${escapeHtml(order.recipient_phone)}<br/>`);
  parts.push(`${escapeHtml(order.shipping_address)}</div>`);

  if (settings.showOrderNumber) {
    const dateStr = new Date(order.created_at).toLocaleString(locale, {
      dateStyle: "short",
      timeStyle: "short",
    });
    parts.push(
      `<div><strong>${escapeHtml(strings.orderNoLabel)}</strong> ${escapeHtml(order.order_number)} &nbsp; <strong>${escapeHtml(strings.orderDateLabel)}</strong> ${escapeHtml(dateStr)}</div>`,
    );
  }

  if (settings.showProductName || settings.showQuantity) {
    const lines = order.order_items.map((it) => {
      const name = settings.showProductName ? it.product_name : "";
      const qty = settings.showQuantity ? `×${it.quantity}` : "";
      return `${escapeHtml(name)}${escapeHtml(qty)}`.trim();
    });
    const nonEmpty = lines.filter(Boolean);
    if (nonEmpty.length > 0) {
      parts.push(
        `<div><strong>${escapeHtml(strings.itemsLabel)}</strong><br/>${nonEmpty.join("<br/>")}</div>`,
      );
    }
  }

  if (settings.showPayment) {
    parts.push(
      `<div><strong>${escapeHtml(strings.paymentLabel)}</strong> ${escapeHtml(paymentLabelFor(order.payment_method, strings))}</div>`,
    );
  }

  if (settings.showShippingMemo) {
    const memo = (order.shipping_memo ?? "").trim();
    parts.push(
      `<div><strong>${escapeHtml(strings.memoLabel)}</strong> ${escapeHtml(memo || strings.noMemo)}</div>`,
    );
  }

  if (settings.showBarcode) {
    const src = settings.codeKind === "qrcode" ? qrSrc(order.order_number) : barcodeSrc(order.order_number);
    parts.push(
      `<div class="lbl-code" style="margin-top:auto;text-align:center;"><img src="${escapeAttr(src)}" alt="" style="max-width:100%;max-height:22mm;object-fit:contain;" /></div>`,
    );
  }

  parts.push(`</div>`);
  return parts.join("");
}

function chunkOrders<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/**
 * iframe에 넣을 완전한 HTML 문서(스타일 포함)를 생성합니다.
 */
export function buildShippingLabelPrintDocument(
  orders: ShippingLabelOrder[],
  seller: ShippingLabelSeller,
  settings: LabelPrintSettings,
  strings: ShippingLabelPrintStrings,
  locale: string,
): string {
  const cut = settings.showCutLines ? "1px dashed #999" : "none";
  const per =
    settings.printerType === "a4"
      ? settings.a4LabelsPerSheet
      : 1;

  let sheetCss = "";
  let bodyInner = "";

  if (settings.printerType === "a4") {
    if (per === 1) {
      sheetCss = `
        .sheet { width:210mm; min-height:297mm; margin:0 auto; background:#fff; box-sizing:border-box; page-break-after:always; }
        .cell { width:100%; min-height:297mm; box-sizing:border-box; border:${cut}; }
      `;
    } else if (per === 2) {
      sheetCss = `
        .sheet { width:210mm; min-height:297mm; margin:0 auto; background:#fff; box-sizing:border-box; display:grid; grid-template-rows:1fr 1fr; page-break-after:always; }
        .cell { width:100%; min-height:0; box-sizing:border-box; border:${cut}; overflow:hidden; }
      `;
    } else {
      sheetCss = `
        .sheet { width:210mm; min-height:297mm; margin:0 auto; background:#fff; box-sizing:border-box; display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; page-break-after:always; }
        .cell { min-width:0; min-height:0; box-sizing:border-box; border:${cut}; overflow:hidden; }
      `;
    }

    const sheets = chunkOrders(orders, per);
    bodyInner = sheets
      .map((chunk) => {
        const cells = chunk
          .map(
            (order) =>
              `<div class="cell">${buildSingleLabelInner(order, seller, settings, strings, locale)}</div>`,
          )
          .join("");
        const fillers = per - chunk.length;
        const fillHtml =
          fillers > 0
            ? Array.from({ length: fillers }, () => `<div class="cell" style="border:${cut};"></div>`).join("")
            : "";
        return `<div class="sheet">${cells}${fillHtml}</div>`;
      })
      .join("");
  } else {
    const w = settings.labelWidthMm;
    const h = settings.labelHeightMm;
    sheetCss = `
      @page { size: ${w}mm ${h}mm; margin: 0; }
      .sheet { width:${w}mm; height:${h}mm; margin:0; page-break-after:always; background:#fff; box-sizing:border-box; }
      .cell { width:100%; height:100%; box-sizing:border-box; border:${cut}; overflow:hidden; }
    `;
    bodyInner = orders
      .map(
        (order) =>
          `<div class="sheet"><div class="cell">${buildSingleLabelInner(order, seller, settings, strings, locale)}</div></div>`,
      )
      .join("");
  }

  const baseCss = `
    html, body { margin:0; padding:0; background:#fff; color:#111; font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", "Noto Sans", sans-serif; }
    @media print {
      .sheet { page-break-after: always; }
      .sheet:last-child { page-break-after: auto; }
    }
    ${sheetCss}
  `;

  return `<!DOCTYPE html><html lang="${escapeAttr(locale)}"><head><meta charset="utf-8"/><title>Shipping labels</title><style>${baseCss}</style></head><body>${bodyInner}</body></html>`;
}
