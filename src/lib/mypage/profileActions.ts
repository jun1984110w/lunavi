"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * 프로필 표시 이름·전화번호 수정
 */
export async function updateProfileAction(input: { fullName: string; phone: string }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, code: "auth" as const };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.fullName.trim() || null,
      phone: input.phone.trim() || null,
    })
    .eq("id", user.id);

  if (error) return { ok: false as const, code: "db", message: error.message };

  revalidatePath("/", "layout");
  return { ok: true as const };
}
