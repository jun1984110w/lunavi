import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type AdminRole = "super_admin" | "admin" | "brand_admin";

type ProfileRow = {
  full_name: string | null;
  role: string | null;
  managed_brand_ids: number[] | null;
};

export type AdminSession = {
  userId: string;
  name: string;
  role: AdminRole;
  managedBrandIds: number[];
};

const ADMIN_ROLES: AdminRole[] = ["super_admin", "admin", "brand_admin"];

export async function checkAdmin(locale: string): Promise<AdminSession> {
  const supabase = createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  // 로그인하지 않은 사용자는 관리자 페이지 접근을 차단합니다.
  if (!user) {
    redirect(`/${locale}`);
  }

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("full_name, role, managed_brand_ids")
    .eq("id", user.id)
    .maybeSingle();

  const profile = (profileRaw as ProfileRow | null) ?? null;
  const role = (profile?.role ?? "customer") as AdminRole | "customer";

  // 관리자 권한(super_admin/admin/brand_admin)이 아니면 메인으로 보냅니다.
  if (!ADMIN_ROLES.includes(role as AdminRole)) {
    redirect(`/${locale}`);
  }

  return {
    userId: user.id,
    name: profile?.full_name || user.email || "Admin",
    role: role as AdminRole,
    managedBrandIds: profile?.managed_brand_ids ?? [],
  };
}
