/**
 * 배송 라벨 일괄 인쇄 설정 — localStorage에 JSON으로 저장합니다.
 */

export const LABEL_PRINT_SETTINGS_STORAGE_KEY = "lunavi_shipping_label_print_settings_v1";

/** 프린터 종류 */
export type LabelPrinterType = "a4" | "label";

/** A4 한 장당 라벨 개수(인쇄 시 격자 분할) */
export type A4LabelsPerSheet = 1 | 2 | 4;

/** 본문 글자 크기 */
export type LabelFontSize = "sm" | "md" | "lg";

/** 주문번호 표시용 코드(바코드 / QR) */
export type LabelCodeKind = "barcode" | "qrcode";

export type LabelPrintSettings = {
  printerType: LabelPrinterType;
  a4LabelsPerSheet: A4LabelsPerSheet;
  /** 라벨 프린터 모드일 때 라벨 한 칸 크기(mm) */
  labelWidthMm: number;
  labelHeightMm: number;
  showCutLines: boolean;
  showSeller: boolean;
  showOrderNumber: boolean;
  showProductName: boolean;
  showQuantity: boolean;
  showPayment: boolean;
  showShippingMemo: boolean;
  /** 주문번호 기반 바코드/QR 블록 표시 여부 */
  showBarcode: boolean;
  codeKind: LabelCodeKind;
  showLogo: boolean;
  fontSize: LabelFontSize;
};

export const DEFAULT_LABEL_PRINT_SETTINGS: LabelPrintSettings = {
  printerType: "a4",
  a4LabelsPerSheet: 4,
  labelWidthMm: 100,
  labelHeightMm: 150,
  showCutLines: true,
  showSeller: true,
  showOrderNumber: true,
  showProductName: true,
  showQuantity: true,
  showPayment: true,
  showShippingMemo: true,
  showBarcode: true,
  codeKind: "qrcode",
  showLogo: true,
  fontSize: "md",
};

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

/**
 * 저장된 JSON을 기본값과 합쳐 안전한 설정 객체로 만듭니다.
 */
export function normalizeLabelPrintSettings(raw: unknown): LabelPrintSettings {
  const base = DEFAULT_LABEL_PRINT_SETTINGS;
  if (!raw || typeof raw !== "object") return { ...base };
  const o = raw as Record<string, unknown>;

  const printerType = o.printerType === "label" ? "label" : "a4";
  const per = o.a4LabelsPerSheet;
  const a4LabelsPerSheet: A4LabelsPerSheet =
    per === 1 || per === 2 || per === 4 ? per : base.a4LabelsPerSheet;

  const fontSize = o.fontSize === "sm" || o.fontSize === "lg" ? o.fontSize : o.fontSize === "md" ? "md" : base.fontSize;
  const codeKind = o.codeKind === "barcode" ? "barcode" : "qrcode";

  return {
    printerType,
    a4LabelsPerSheet,
    labelWidthMm: clampInt(o.labelWidthMm, 30, 300, base.labelWidthMm),
    labelHeightMm: clampInt(o.labelHeightMm, 20, 400, base.labelHeightMm),
    showCutLines: o.showCutLines !== false,
    showSeller: o.showSeller !== false,
    showOrderNumber: o.showOrderNumber !== false,
    showProductName: o.showProductName !== false,
    showQuantity: o.showQuantity !== false,
    showPayment: o.showPayment !== false,
    showShippingMemo: o.showShippingMemo !== false,
    showBarcode: o.showBarcode !== false,
    codeKind,
    showLogo: o.showLogo !== false,
    fontSize,
  };
}

/** 브라우저 localStorage에서 설정을 읽습니다. */
export function loadLabelPrintSettings(): LabelPrintSettings {
  if (typeof window === "undefined") return { ...DEFAULT_LABEL_PRINT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(LABEL_PRINT_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LABEL_PRINT_SETTINGS };
    return normalizeLabelPrintSettings(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT_LABEL_PRINT_SETTINGS };
  }
}

/** 브라우저 localStorage에 설정을 저장합니다. */
export function saveLabelPrintSettings(settings: LabelPrintSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LABEL_PRINT_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 저장 실패는 조용히 무시합니다(프라이빗 모드 등).
  }
}
