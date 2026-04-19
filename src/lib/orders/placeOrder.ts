"use server";

/**
 * Supabase `place_order` RPC를 호출해 주문을 확정합니다.
 * (주문·품목 INSERT, 재고 차감, carts 비우기는 DB 함수에서 원자적으로 처리)
 */
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/** 주문 RPC에 넘길 최소 줄 정보 */
export type CheckoutLineInput = {
  productId: number;
  optionId: number | null;
  quantity: number;
};

export type PlaceOrderInput = {
  locale: string;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  shippingMemo: string;
  paymentMethod: "card" | "bank_transfer" | "qr_transfer" | "cod";
  shippingFee: number;
  discountAmount: number;
  lines: CheckoutLineInput[];
};

/** place_order RPC 호출 — 성공 시 주문번호 반환 */
export async function placeOrderAction(input: PlaceOrderInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, code: "login_required" as const };
  }

  const loc = ["ko", "en", "vi"].includes(input.locale) ? input.locale : "vi";

  const pLines = input.lines.map((l) => ({
    product_id: l.productId,
    option_id: l.optionId,
    quantity: l.quantity,
  }));

  const { data, error } = await supabase.rpc("place_order", {
    p_locale: loc,
    p_recipient_name: input.recipientName,
    p_recipient_phone: input.recipientPhone,
    p_shipping_address: input.shippingAddress,
    p_shipping_memo: input.shippingMemo,
    p_payment_method: input.paymentMethod,
    p_shipping_fee: input.shippingFee,
    p_discount_amount: input.discountAmount,
    p_lines: pLines,
  });

  if (error) {
    console.error("[placeOrderAction]", error);
    return {
      ok: false as const,
      code: "rpc_error" as const,
      message: error.message,
      details: error.details,
    };
  }

  const row = data as { ok?: boolean; order_number?: string } | null;
  const orderNumber = row?.order_number;
  if (!orderNumber) {
    return { ok: false as const, code: "unknown_response" as const };
  }

  revalidatePath("/", "layout");
  return { ok: true as const, orderNumber };
}
