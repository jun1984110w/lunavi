"use client";

import type { AdminRole } from "@/lib/auth/checkAdmin";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

type MemberRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: "super_admin" | "admin" | "brand_admin" | "staff" | "wholesale" | "customer";
  managed_brand_ids: number[] | null;
  created_at: string;
};

type BrandRow = {
  id: number;
  name: string;
};

type Props = {
  currentRole: AdminRole;
};

const ROLE_ORDER = [
  "customer",
  "wholesale",
  "staff",
  "brand_admin",
  "admin",
  "super_admin",
] as const;

const ROLE_BADGE_CLASS: Record<MemberRow["role"], string> = {
  customer: "bg-neutral-200 text-neutral-700",
  wholesale: "bg-blue-100 text-blue-700",
  staff: "bg-green-100 text-green-700",
  brand_admin: "bg-purple-100 text-purple-700",
  admin: "bg-orange-100 text-orange-700",
  super_admin: "bg-red-100 text-red-700",
};

export function AdminMembersManager({ currentRole }: Props) {
  const t = useTranslations("adminMembers");
  const supabase = createClient();

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [detailMember, setDetailMember] = useState<MemberRow | null>(null);
  const [pendingBrandMemberId, setPendingBrandMemberId] = useState<string | null>(null);

  const canManageRoles = currentRole === "super_admin" || currentRole === "admin";

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);

    const [{ data: memberRaw, error: memberError }, { data: brandRaw, error: brandError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, phone, role, managed_brand_ids, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("brands").select("id, name").eq("is_active", true).order("name"),
      ]);

    if (memberError || brandError) {
      setErrorMessage(memberError?.message || brandError?.message || t("loadFailed"));
      setLoading(false);
      return;
    }

    setMembers((memberRaw as MemberRow[] | null) ?? []);
    setBrands((brandRaw as BrandRow[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    // 초기 진입 시 회원/브랜드 목록을 조회합니다.
    void loadData();
  }, []);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      if (roleFilter !== "all" && member.role !== roleFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const fullName = (member.full_name || "").toLowerCase();
        const email = (member.email || "").toLowerCase();
        if (!fullName.includes(q) && !email.includes(q)) return false;
      }
      return true;
    });
  }, [members, roleFilter, query]);

  // 현재 구조에서는 wholesale 역할을 도매 신청 대기 목록으로 간주합니다.
  const wholesalePendingMembers = useMemo(
    () => members.filter((member) => member.role === "wholesale"),
    [members],
  );

  const canChangeTargetRole = (target: MemberRow) => {
    if (!canManageRoles) return false;
    if (target.role === "super_admin" && currentRole !== "super_admin") return false;
    return true;
  };

  const updateMemberRole = async (
    member: MemberRow,
    nextRole: MemberRow["role"],
    managedBrandIds: number[],
  ) => {
    if (!canChangeTargetRole(member)) {
      setErrorMessage(t("noPermission"));
      return;
    }

    if (nextRole === "super_admin" && currentRole !== "super_admin") {
      setErrorMessage(t("onlySuperAdminCanSetSuperAdmin"));
      return;
    }

    const payload = {
      role: nextRole,
      managed_brand_ids: nextRole === "brand_admin" ? managedBrandIds : null,
    };

    const { error } = await supabase.from("profiles").update(payload).eq("id", member.id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setSuccessMessage(t("saveSuccess"));
    await loadData();
  };

  const handleApproveWholesale = async (member: MemberRow) => {
    await updateMemberRole(member, "wholesale", member.managed_brand_ids ?? []);
  };

  const handleRejectWholesale = async (member: MemberRow) => {
    await updateMemberRole(member, "customer", []);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("title")}</h1>

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      <section className="grid gap-2 rounded-xl border border-neutral-200 bg-white p-3 md:grid-cols-3">
        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="all">{t("allRoles")}</option>
          {ROLE_ORDER.map((role) => (
            <option key={role} value={role}>
              {t(`role_${role}`)}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") setQuery(searchInput);
          }}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          placeholder={t("searchPlaceholder")}
        />
        <button
          type="button"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          onClick={() => setQuery(searchInput)}
        >
          {t("search")}
        </button>
      </section>

      <section className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-600">
            <tr>
              <th className="px-3 py-2">{t("colName")}</th>
              <th className="px-3 py-2">{t("colEmail")}</th>
              <th className="px-3 py-2">{t("colPhone")}</th>
              <th className="px-3 py-2">{t("colRole")}</th>
              <th className="px-3 py-2">{t("colJoinedAt")}</th>
              <th className="px-3 py-2">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-neutral-500">
                  {t("loading")}
                </td>
              </tr>
            ) : filteredMembers.length > 0 ? (
              filteredMembers.map((member) => (
                <tr key={member.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2">{member.full_name || "-"}</td>
                  <td className="px-3 py-2">{member.email || "-"}</td>
                  <td className="px-3 py-2">{member.phone || "-"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`mr-2 rounded-full px-2 py-1 text-xs font-semibold ${ROLE_BADGE_CLASS[member.role]}`}
                    >
                      {t(`role_${member.role}`)}
                    </span>
                    <select
                      value={member.role}
                      disabled={!canChangeTargetRole(member)}
                      onChange={(event) => {
                        const nextRole = event.target.value as MemberRow["role"];
                        if (nextRole === "brand_admin") {
                          setPendingBrandMemberId(member.id);
                          setDetailMember({ ...member, role: nextRole });
                          return;
                        }
                        void updateMemberRole(member, nextRole, member.managed_brand_ids ?? []);
                      }}
                      className="rounded border border-neutral-300 px-2 py-1 text-xs"
                    >
                      {ROLE_ORDER.map((role) => (
                        <option
                          key={role}
                          value={role}
                          disabled={role === "super_admin" && currentRole !== "super_admin"}
                        >
                          {t(`role_${role}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="rounded border border-neutral-300 px-2 py-1 text-xs"
                      onClick={() => setDetailMember(member)}
                    >
                      {t("viewDetail")}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-neutral-500">
                  {t("empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-3">
        <h2 className="text-base font-bold">{t("wholesalePendingTitle")}</h2>
        <div className="mt-2 space-y-2">
          {wholesalePendingMembers.length > 0 ? (
            wholesalePendingMembers.map((member) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-neutral-200 px-3 py-2"
              >
                <p className="text-sm">
                  {member.full_name || "-"} / {member.email || "-"}
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded border border-green-300 px-2 py-1 text-xs text-green-700"
                    onClick={() => void handleApproveWholesale(member)}
                    disabled={!canManageRoles}
                  >
                    {t("approve")}
                  </button>
                  <button
                    type="button"
                    className="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                    onClick={() => void handleRejectWholesale(member)}
                    disabled={!canManageRoles}
                  >
                    {t("reject")}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-neutral-500">{t("wholesalePendingEmpty")}</p>
          )}
        </div>
      </section>

      {detailMember ? (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          role="presentation"
          onClick={() => {
            setDetailMember(null);
            setPendingBrandMemberId(null);
          }}
        >
          <div
            className="absolute left-1/2 top-1/2 w-[min(95vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-4 shadow-xl"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-bold">{t("memberDetailTitle")}</h2>
            <div className="mt-3 space-y-1 text-sm">
              <p>
                <b>{t("colName")}:</b> {detailMember.full_name || "-"}
              </p>
              <p>
                <b>{t("colEmail")}:</b> {detailMember.email || "-"}
              </p>
              <p>
                <b>{t("colPhone")}:</b> {detailMember.phone || "-"}
              </p>
              <p>
                <b>{t("colRole")}:</b> {t(`role_${detailMember.role}`)}
              </p>
              <p>
                <b>{t("colJoinedAt")}:</b>{" "}
                {new Date(detailMember.created_at).toLocaleString()}
              </p>
            </div>

            {pendingBrandMemberId === detailMember.id ? (
              <div className="mt-3 space-y-2 rounded border border-neutral-200 p-3">
                <p className="text-sm font-semibold">{t("managedBrandsTitle")}</p>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {brands.map((brand) => {
                    const checked = (detailMember.managed_brand_ids ?? []).includes(brand.id);
                    return (
                      <label key={brand.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            setDetailMember((prev) => {
                              if (!prev) return prev;
                              const current = prev.managed_brand_ids ?? [];
                              const next = event.target.checked
                                ? [...current, brand.id]
                                : current.filter((id) => id !== brand.id);
                              return { ...prev, managed_brand_ids: next };
                            });
                          }}
                        />
                        <span>{brand.name}</span>
                      </label>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="rounded bg-brand px-3 py-2 text-sm font-semibold text-white"
                  onClick={() =>
                    void updateMemberRole(
                      detailMember,
                      "brand_admin",
                      detailMember.managed_brand_ids ?? [],
                    )
                  }
                >
                  {t("saveRoleChange")}
                </button>
              </div>
            ) : null}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="rounded border border-neutral-300 px-3 py-2 text-sm"
                onClick={() => {
                  setDetailMember(null);
                  setPendingBrandMemberId(null);
                }}
              >
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
