"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const CUSTOMER_MAX_ADDRESSES = 10;

function isWholesaleRole(role: string) {
  return role === "wholesale";
}

/** 일반 회원 배송지 개수 상한 검사 */
async function assertCanAddAddress(userId: string, role: string) {
  if (isWholesaleRole(role)) return;
  const supabase = createClient();
  const { count, error } = await supabase
    .from("shipping_addresses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  if ((count ?? 0) >= CUSTOMER_MAX_ADDRESSES) {
    throw new Error("MAX_ADDRESSES");
  }
}

export type AddressFormInput = {
  label: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  addressDetail: string;
  isDefault: boolean;
};

async function getProfileRole(userId: string): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  return ((data as { role?: string } | null)?.role ?? "customer").toLowerCase();
}

/**
 * 배송지 신규 등록 (개수 제한은 DB의 profiles.role 기준으로만 판단)
 */
export async function createShippingAddressAction(input: AddressFormInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, code: "auth" as const };

  const label = input.label.trim();
  if (!label) return { ok: false as const, code: "validation" as const };

  const role = await getProfileRole(user.id);

  try {
    await assertCanAddAddress(user.id, role);
  } catch (e) {
    if (e instanceof Error && e.message === "MAX_ADDRESSES") {
      return { ok: false as const, code: "max_addresses" as const };
    }
    throw e;
  }

  if (input.isDefault) {
    await supabase.from("shipping_addresses").update({ is_default: false }).eq("user_id", user.id);
  }

  const { error } = await supabase.from("shipping_addresses").insert({
    user_id: user.id,
    label,
    recipient_name: input.recipientName.trim(),
    recipient_phone: input.recipientPhone.trim(),
    address: input.address.trim(),
    address_detail: (input.addressDetail ?? "").trim(),
    is_default: input.isDefault,
  });

  if (error) return { ok: false as const, code: "db", message: error.message };

  revalidatePath("/", "layout");
  return { ok: true as const };
}

/**
 * 배송지 수정
 */
export async function updateShippingAddressAction(id: number, input: AddressFormInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, code: "auth" as const };

  const label = input.label.trim();
  if (!label) return { ok: false as const, code: "validation" as const };

  if (input.isDefault) {
    await supabase.from("shipping_addresses").update({ is_default: false }).eq("user_id", user.id);
  }

  const { error } = await supabase
    .from("shipping_addresses")
    .update({
      label,
      recipient_name: input.recipientName.trim(),
      recipient_phone: input.recipientPhone.trim(),
      address: input.address.trim(),
      address_detail: (input.addressDetail ?? "").trim(),
      is_default: input.isDefault,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, code: "db", message: error.message };

  revalidatePath("/", "layout");
  return { ok: true as const };
}

/**
 * 배송지 삭제
 */
export async function deleteShippingAddressAction(id: number) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, code: "auth" as const };

  const { error } = await supabase.from("shipping_addresses").delete().eq("id", id).eq("user_id", user.id);

  if (error) return { ok: false as const, code: "db", message: error.message };

  revalidatePath("/", "layout");
  return { ok: true as const };
}

/**
 * 기본 배송지만 변경(다른 행은 false)
 */
export async function setDefaultShippingAddressAction(id: number) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, code: "auth" as const };

  await supabase.from("shipping_addresses").update({ is_default: false }).eq("user_id", user.id);

  const { error } = await supabase
    .from("shipping_addresses")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, code: "db", message: error.message };

  revalidatePath("/", "layout");
  return { ok: true as const };
}
