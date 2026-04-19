import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * 회원가입 폼에서 입력한 이름·전화를 profiles에 반영합니다.
 * auth.users 트리거가 raw_user_meta_data의 phone을 profiles로 옮기지 않는 경우를 대비합니다.
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
 * 이메일 인증 링크로 세션이 생긴 직후, user_metadata에 남아 있는 phone·full_name을 profiles에 반영합니다.
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
  if (typeof meta.phone === "string") {
    const v = meta.phone.trim();
    if (v) patch.phone = v;
  }

  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) {
    console.error("[profileSignupSync] 메타데이터 기준 profiles 갱신 실패", error.message);
  }
}
