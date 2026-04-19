import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * user_metadata에서 profiles.phone에 넣을 문자열을 고릅니다.
 * 이메일 가입 시 'phone' 키는 GoTrue OIDC Claims와 충돌해 메타에 저장되지 않을 수 있어 contact_phone 등을 우선합니다.
 */
function pickPhoneFromUserMetadata(meta: Record<string, unknown>): string | null {
  const keys = ["contact_phone", "phone_number", "phone"] as const;
  for (const key of keys) {
    const v = meta[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/**
 * 회원가입 폼에서 입력한 이름·전화를 profiles에 반영합니다.
 * auth 트리거·메타데이터와 별도로 폼 값을 한 번 더 맞춥니다.
 */
export async function syncProfileAfterSignupFromForm(
  supabase: SupabaseClient,
  userId: string,
  input: { fullName: string; phone: string },
): Promise<void> {
  const full_name = input.fullName.trim() || null;
  const phone = input.phone.trim() || null;
  if (!full_name && !phone) return;

  const { error } = await supabase.from("profiles").update({ full_name, phone }).eq("id", userId);
  if (error) {
    console.error("[profileSignupSync] 폼 기준 profiles 갱신 실패", error.message);
  }
}

/**
 * 이메일 인증 링크로 세션이 생긴 직후, user_metadata의 full_name·연락처(contact_phone 등)를 profiles에 반영합니다.
 * 가입 직후에는 클라이언트에 세션이 없어 UPDATE가 불가능하므로 콜백에서 보완합니다.
 */
export async function syncProfileFromUserMetadataAfterCallback(
  supabase: SupabaseClient,
  user: User,
): Promise<void> {
  const meta = user.user_metadata as Record<string, unknown> | null | undefined;
  if (!meta) return;

  const patch: { full_name?: string | null; phone?: string | null } = {};

  if (typeof meta.full_name === "string") {
    const v = meta.full_name.trim();
    if (v) patch.full_name = v;
  }
  const phoneFromMeta = pickPhoneFromUserMetadata(meta);
  if (phoneFromMeta) patch.phone = phoneFromMeta;

  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) {
    console.error("[profileSignupSync] 메타데이터 기준 profiles 갱신 실패", error.message);
  }
}
