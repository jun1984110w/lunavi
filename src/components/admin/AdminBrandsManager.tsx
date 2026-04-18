"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { AdminRole } from "@/lib/auth/checkAdmin";

type BrandRow = {
  id: number;
  name: string;
  name_vi: string;
  name_ko: string;
  name_en: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  description_vi: string | null;
  description_ko: string | null;
  description_en: string | null;
  origin_country: string | null;
  website_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  products: { id: number }[] | null;
};

type FormState = {
  id: number | null;
  name: string;
  name_vi: string;
  name_ko: string;
  name_en: string;
  slug: string;
  logo_url: string;
  banner_url: string;
  description_vi: string;
  description_ko: string;
  description_en: string;
  origin_country: string;
  website_url: string;
  is_featured: boolean;
  is_active: boolean;
};

type Props = {
  role: AdminRole;
  managedBrandIds: number[];
};

const DEFAULT_FORM: FormState = {
  id: null,
  name: "",
  name_vi: "",
  name_ko: "",
  name_en: "",
  slug: "",
  logo_url: "",
  banner_url: "",
  description_vi: "",
  description_ko: "",
  description_en: "",
  origin_country: "",
  website_url: "",
  is_featured: false,
  is_active: true,
};

const slugify = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export function AdminBrandsManager({ role, managedBrandIds }: Props) {
  const t = useTranslations("adminBrands");
  const supabase = createClient();
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canCreate = role !== "brand_admin";
  const canDelete = role !== "brand_admin";
  const canEditBrand = (brandId: number) =>
    role !== "brand_admin" || managedBrandIds.includes(brandId);

  const loadBrands = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("brands")
      .select(
        "id, name, name_vi, name_ko, name_en, slug, logo_url, banner_url, description_vi, description_ko, description_en, origin_country, website_url, is_active, is_featured, products(id)",
      )
      .order("sort_order", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const rows = (data as BrandRow[] | null) ?? [];
    // brand_admin은 담당 브랜드만 목록에 노출합니다.
    const filtered =
      role === "brand_admin"
        ? rows.filter((row) => managedBrandIds.includes(row.id))
        : rows;
    setBrands(filtered);
    setLoading(false);
  };

  useEffect(() => {
    void loadBrands();
  }, []);

  const tableRows = useMemo(
    () =>
      brands.map((brand) => ({
        ...brand,
        productCount: brand.products?.length ?? 0,
      })),
    [brands],
  );

  const openCreateModal = () => {
    if (!canCreate) return;
    setForm(DEFAULT_FORM);
    setOpenModal(true);
  };

  const openEditModal = (brand: BrandRow) => {
    if (!canEditBrand(brand.id)) return;
    setForm({
      id: brand.id,
      name: brand.name,
      name_vi: brand.name_vi,
      name_ko: brand.name_ko,
      name_en: brand.name_en,
      slug: brand.slug,
      logo_url: brand.logo_url ?? "",
      banner_url: brand.banner_url ?? "",
      description_vi: brand.description_vi ?? "",
      description_ko: brand.description_ko ?? "",
      description_en: brand.description_en ?? "",
      origin_country: brand.origin_country ?? "",
      website_url: brand.website_url ?? "",
      is_featured: brand.is_featured,
      is_active: brand.is_active,
    });
    setOpenModal(true);
  };

  const uploadImage = async (file: File) => {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `brands/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    // 브랜드 로고/배너 이미지는 brand-images 버킷에 저장합니다.
    const { error } = await supabase.storage.from("brand-images").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from("brand-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleTranslateText = async (
    source: "vi" | "ko" | "en",
    type: "name" | "description",
  ) => {
    const sourceText =
      type === "name"
        ? source === "vi"
          ? form.name_vi.trim()
          : source === "ko"
            ? form.name_ko.trim()
            : form.name_en.trim()
        : source === "vi"
          ? form.description_vi.trim()
          : source === "ko"
            ? form.description_ko.trim()
            : form.description_en.trim();

    if (!sourceText) {
      setErrorMessage(t("translateInputRequired"));
      return;
    }

    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: sourceText, source }),
    });
    const json = (await response.json()) as {
      translations?: { vi?: string; ko?: string; en?: string };
      error?: string;
    };

    if (!response.ok || !json.translations) {
      setErrorMessage(json.error || t("translateFailed"));
      return;
    }

    setForm((prev) =>
      type === "name"
        ? {
            ...prev,
            name_vi: json.translations?.vi ?? prev.name_vi,
            name_ko: json.translations?.ko ?? prev.name_ko,
            name_en: json.translations?.en ?? prev.name_en,
          }
        : {
            ...prev,
            description_vi: json.translations?.vi ?? prev.description_vi,
            description_ko: json.translations?.ko ?? prev.description_ko,
            description_en: json.translations?.en ?? prev.description_en,
          },
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (form.id && !canEditBrand(form.id)) {
      setErrorMessage(t("noPermission"));
      setSaving(false);
      return;
    }

    if (!form.id && !canCreate) {
      setErrorMessage(t("noPermission"));
      setSaving(false);
      return;
    }

    const payload = {
      name: form.name.trim(),
      name_vi: form.name_vi.trim(),
      name_ko: form.name_ko.trim(),
      name_en: form.name_en.trim(),
      slug: form.slug.trim(),
      logo_url: form.logo_url.trim() || null,
      banner_url: form.banner_url.trim() || null,
      description_vi: form.description_vi.trim() || null,
      description_ko: form.description_ko.trim() || null,
      description_en: form.description_en.trim() || null,
      origin_country: form.origin_country.trim() || null,
      website_url: form.website_url.trim() || null,
      is_featured: form.is_featured,
      is_active: form.is_active,
    };

    if (form.id) {
      const { error } = await supabase.from("brands").update(payload).eq("id", form.id);
      if (error) {
        setErrorMessage(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("brands").insert(payload);
      if (error) {
        setErrorMessage(error.message);
        setSaving(false);
        return;
      }
    }

    setSuccessMessage(t("saveSuccess"));
    setSaving(false);
    setOpenModal(false);
    setForm(DEFAULT_FORM);
    await loadBrands();
  };

  const handleDelete = async (brand: BrandRow) => {
    if (!canDelete || !canEditBrand(brand.id)) {
      setErrorMessage(t("noPermission"));
      return;
    }

    const { data: products } = await supabase
      .from("products")
      .select("id")
      .eq("brand_id", brand.id)
      .limit(1);

    if ((products ?? []).length > 0) {
      setErrorMessage(t("deleteBlockedProducts"));
      return;
    }

    if (!window.confirm(t("deleteConfirm"))) return;

    const { error } = await supabase.from("brands").delete().eq("id", brand.id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setSuccessMessage(t("deleteSuccess"));
    await loadBrands();
  };

  const handleToggle = async (brand: BrandRow, field: "is_active" | "is_featured") => {
    if (!canEditBrand(brand.id)) {
      setErrorMessage(t("noPermission"));
      return;
    }
    const { error } = await supabase
      .from("brands")
      .update({ [field]: !brand[field] })
      .eq("id", brand.id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    await loadBrands();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t("title")}</h1>
        {canCreate ? (
          <button
            type="button"
            className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white"
            onClick={openCreateModal}
          >
            {t("addBrand")}
          </button>
        ) : null}
      </div>

      {role === "brand_admin" ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">{t("readOnlyNotice")}</p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-600">
            <tr>
              <th className="px-3 py-2">{t("colLogo")}</th>
              <th className="px-3 py-2">{t("colName")}</th>
              <th className="px-3 py-2">{t("colOrigin")}</th>
              <th className="px-3 py-2">{t("colProductCount")}</th>
              <th className="px-3 py-2">{t("colActive")}</th>
              <th className="px-3 py-2">{t("colFeatured")}</th>
              <th className="px-3 py-2">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-neutral-500">
                  {t("loading")}
                </td>
              </tr>
            ) : tableRows.length > 0 ? (
              tableRows.map((brand) => (
                <tr key={brand.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2">
                    {brand.logo_url ? (
                      <img src={brand.logo_url} alt={brand.name} className="h-8 w-8 rounded object-contain" />
                    ) : (
                      <span className="text-xs text-neutral-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{brand.name}</p>
                    <p className="text-xs text-neutral-500">{brand.slug}</p>
                  </td>
                  <td className="px-3 py-2">{brand.origin_country || "-"}</td>
                  <td className="px-3 py-2">{brand.productCount}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="rounded border border-neutral-300 px-2 py-1 text-xs"
                      onClick={() => void handleToggle(brand, "is_active")}
                      disabled={!canEditBrand(brand.id)}
                    >
                      {brand.is_active ? t("active") : t("inactive")}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="rounded border border-neutral-300 px-2 py-1 text-xs"
                      onClick={() => void handleToggle(brand, "is_featured")}
                      disabled={!canEditBrand(brand.id)}
                    >
                      {brand.is_featured ? t("featuredOn") : t("featuredOff")}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="rounded border border-neutral-300 px-2 py-1 text-xs"
                        onClick={() => openEditModal(brand)}
                        disabled={!canEditBrand(brand.id)}
                      >
                        {t("edit")}
                      </button>
                      {canDelete ? (
                        <button
                          type="button"
                          className="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                          onClick={() => void handleDelete(brand)}
                          disabled={!canEditBrand(brand.id)}
                        >
                          {t("delete")}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-neutral-500">
                  {t("empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {openModal ? (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          role="presentation"
          onClick={() => setOpenModal(false)}
        >
          <div
            className="absolute left-1/2 top-1/2 w-[min(95vw,50rem)] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white p-4 shadow-xl"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-bold">{form.id ? t("editTitle") : t("addTitle")}</h2>
            <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block">
                  <span className="mb-1 block text-sm">{t("namePrimary")}</span>
                  <input
                    required
                    value={form.name}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                        slug: prev.slug || slugify(event.target.value),
                      }))
                    }
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">{t("nameVi")}</span>
                  <input
                    required
                    value={form.name_vi}
                    onChange={(event) => setForm((prev) => ({ ...prev, name_vi: event.target.value }))}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">{t("nameKo")}</span>
                  <input
                    required
                    value={form.name_ko}
                    onChange={(event) => setForm((prev) => ({ ...prev, name_ko: event.target.value }))}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">{t("nameEn")}</span>
                  <input
                    required
                    value={form.name_en}
                    onChange={(event) => setForm((prev) => ({ ...prev, name_en: event.target.value }))}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-neutral-300 px-2 py-1 text-xs"
                  onClick={() => void handleTranslateText("vi", "name")}
                >
                  {t("autoTranslateNameFromVi")}
                </button>
                <button
                  type="button"
                  className="rounded border border-neutral-300 px-2 py-1 text-xs"
                  onClick={() => void handleTranslateText("ko", "name")}
                >
                  {t("autoTranslateNameFromKo")}
                </button>
                <button
                  type="button"
                  className="rounded border border-neutral-300 px-2 py-1 text-xs"
                  onClick={() => void handleTranslateText("en", "name")}
                >
                  {t("autoTranslateNameFromEn")}
                </button>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm">{t("slug")}</span>
                <input
                  required
                  value={form.slug}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      slug: slugify(event.target.value),
                    }))
                  }
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm">{t("logoUpload")}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      try {
                        const url = await uploadImage(file);
                        setForm((prev) => ({ ...prev, logo_url: url }));
                      } catch (error) {
                        setErrorMessage(error instanceof Error ? error.message : t("uploadFailed"));
                      }
                    }}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">{t("bannerUpload")}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      try {
                        const url = await uploadImage(file);
                        setForm((prev) => ({ ...prev, banner_url: url }));
                      } catch (error) {
                        setErrorMessage(error instanceof Error ? error.message : t("uploadFailed"));
                      }
                    }}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-sm">{t("descVi")}</span>
                  <textarea
                    value={form.description_vi}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, description_vi: event.target.value }))
                    }
                    rows={4}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">{t("descKo")}</span>
                  <textarea
                    value={form.description_ko}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, description_ko: event.target.value }))
                    }
                    rows={4}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">{t("descEn")}</span>
                  <textarea
                    value={form.description_en}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, description_en: event.target.value }))
                    }
                    rows={4}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-neutral-300 px-2 py-1 text-xs"
                  onClick={() => void handleTranslateText("vi", "description")}
                >
                  {t("autoTranslateDescFromVi")}
                </button>
                <button
                  type="button"
                  className="rounded border border-neutral-300 px-2 py-1 text-xs"
                  onClick={() => void handleTranslateText("ko", "description")}
                >
                  {t("autoTranslateDescFromKo")}
                </button>
                <button
                  type="button"
                  className="rounded border border-neutral-300 px-2 py-1 text-xs"
                  onClick={() => void handleTranslateText("en", "description")}
                >
                  {t("autoTranslateDescFromEn")}
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm">{t("originCountry")}</span>
                  <input
                    value={form.origin_country}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, origin_country: event.target.value }))
                    }
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">{t("websiteUrl")}</span>
                  <input
                    type="url"
                    value={form.website_url}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, website_url: event.target.value }))
                    }
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, is_featured: event.target.checked }))
                    }
                  />
                  <span>{t("isFeatured")}</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                  />
                  <span>{t("isActive")}</span>
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  onClick={() => setOpenModal(false)}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? t("saving") : t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
