"use client";

import type { AdminRole } from "@/lib/auth/checkAdmin";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

type CategoryOption = { id: number; name_vi: string };
type BrandOption = { id: number; name: string };

type ProductFormState = {
  category_id: string;
  brand_id: string;
  name_vi: string;
  name_ko: string;
  name_en: string;
  slug: string;
  description_vi: string;
  description_ko: string;
  description_en: string;
  price_retail: string;
  price_member: string;
  price_wholesale: string;
  original_price: string;
  stock_quantity: string;
  sku: string;
  status: "active" | "soldout" | "hidden";
  allow_preorder: boolean;
  restock_date: string;
  is_featured: boolean;
  is_new: boolean;
};

type Props = {
  mode: "create" | "edit";
  productId?: number;
  role: AdminRole;
  managedBrandIds: number[];
};

const DEFAULT_FORM: ProductFormState = {
  category_id: "",
  brand_id: "",
  name_vi: "",
  name_ko: "",
  name_en: "",
  slug: "",
  description_vi: "",
  description_ko: "",
  description_en: "",
  price_retail: "0",
  price_member: "",
  price_wholesale: "",
  original_price: "",
  stock_quantity: "0",
  sku: "",
  status: "active",
  allow_preorder: false,
  restock_date: "",
  is_featured: false,
  is_new: true,
};

const slugify = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export function AdminProductForm({ mode, productId, role, managedBrandIds }: Props) {
  const t = useTranslations("adminProductForm");
  const router = useRouter();
  const supabase = createClient();

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [form, setForm] = useState<ProductFormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canCreate = role !== "brand_admin";
  const canManageBrand = (brandId: number | null) =>
    role !== "brand_admin" || (brandId !== null && managedBrandIds.includes(brandId));

  useEffect(() => {
    // 폼 초기 렌더 시 카테고리/브랜드 옵션을 조회합니다.
    const loadOptions = async () => {
      const [{ data: categoriesRaw }, { data: brandsRaw }] = await Promise.all([
        supabase.from("categories").select("id, name_vi").eq("is_active", true).order("sort_order"),
        supabase.from("brands").select("id, name").eq("is_active", true).order("name"),
      ]);
      setCategories((categoriesRaw as CategoryOption[] | null) ?? []);
      const brandRows = (brandsRaw as BrandOption[] | null) ?? [];
      setBrands(
        role === "brand_admin"
          ? brandRows.filter((brand) => managedBrandIds.includes(brand.id))
          : brandRows,
      );
    };
    void loadOptions();
  }, [role, managedBrandIds]);

  useEffect(() => {
    if (mode !== "edit" || !productId) return;

    // 수정 모드에서는 기존 상품 데이터를 불러와 폼을 채웁니다.
    const loadProduct = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, category_id, brand_id, name_vi, name_ko, name_en, slug, description_vi, description_ko, description_en, price_retail, price_member, price_wholesale, original_price, stock_quantity, sku, status, allow_preorder, restock_date, is_featured, is_new",
        )
        .eq("id", productId)
        .maybeSingle();

      if (error || !data) {
        setErrorMessage(error?.message || t("loadFailed"));
        setLoading(false);
        return;
      }

      const row = data as {
        category_id: number;
        brand_id: number | null;
        name_vi: string;
        name_ko: string;
        name_en: string;
        slug: string;
        description_vi: string;
        description_ko: string;
        description_en: string;
        price_retail: number;
        price_member: number | null;
        price_wholesale: number | null;
        original_price: number | null;
        stock_quantity: number;
        sku: string | null;
        status: "active" | "soldout" | "hidden";
        allow_preorder: boolean;
        restock_date: string | null;
        is_featured: boolean;
        is_new: boolean;
      };

      if (!canManageBrand(row.brand_id)) {
        setErrorMessage(t("noPermission"));
        setLoading(false);
        return;
      }

      setForm({
        category_id: String(row.category_id),
        brand_id: row.brand_id ? String(row.brand_id) : "",
        name_vi: row.name_vi,
        name_ko: row.name_ko,
        name_en: row.name_en,
        slug: row.slug,
        description_vi: row.description_vi,
        description_ko: row.description_ko,
        description_en: row.description_en,
        price_retail: String(row.price_retail),
        price_member: row.price_member === null ? "" : String(row.price_member),
        price_wholesale: row.price_wholesale === null ? "" : String(row.price_wholesale),
        original_price: row.original_price === null ? "" : String(row.original_price),
        stock_quantity: String(row.stock_quantity),
        sku: row.sku ?? "",
        status: row.status,
        allow_preorder: row.allow_preorder,
        restock_date: row.restock_date ?? "",
        is_featured: row.is_featured,
        is_new: row.is_new,
      });
      setLoading(false);
    };

    void loadProduct();
  }, [mode, productId, canManageBrand, t]);

  const title = useMemo(
    () => (mode === "create" ? t("createTitle") : t("editTitle")),
    [mode, t],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSaving(true);

    if (mode === "create" && !canCreate) {
      setErrorMessage(t("noPermission"));
      setSaving(false);
      return;
    }

    const brandId = form.brand_id ? Number(form.brand_id) : null;
    if (!canManageBrand(brandId)) {
      setErrorMessage(t("noPermission"));
      setSaving(false);
      return;
    }

    const payload = {
      category_id: Number(form.category_id),
      brand_id: brandId,
      name_vi: form.name_vi.trim(),
      name_ko: form.name_ko.trim(),
      name_en: form.name_en.trim(),
      slug: form.slug.trim(),
      description_vi: form.description_vi.trim(),
      description_ko: form.description_ko.trim(),
      description_en: form.description_en.trim(),
      price_retail: Number(form.price_retail || 0),
      price_member: form.price_member.trim() ? Number(form.price_member) : null,
      price_wholesale: form.price_wholesale.trim() ? Number(form.price_wholesale) : null,
      original_price: form.original_price.trim() ? Number(form.original_price) : null,
      stock_quantity: Number(form.stock_quantity || 0),
      sku: form.sku.trim() || null,
      status: form.status,
      allow_preorder: form.allow_preorder,
      restock_date: form.restock_date || null,
      is_featured: form.is_featured,
      is_new: form.is_new,
      currency: "VND",
    };

    const result =
      mode === "create"
        ? await supabase.from("products").insert(payload)
        : await supabase.from("products").update(payload).eq("id", productId as number);

    if (result.error) {
      setErrorMessage(result.error.message);
      setSaving(false);
      return;
    }

    router.push("/admin/products");
    router.refresh();
  };

  if (loading) {
    return <p className="text-sm text-neutral-500">{t("loading")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{title}</h1>
        <Link href="/admin/products" className="rounded border border-neutral-300 px-3 py-1.5 text-sm">
          {t("backToList")}
        </Link>
      </div>

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm">{t("category")}</span>
            <select
              required
              value={form.category_id}
              onChange={(event) => setForm((prev) => ({ ...prev, category_id: event.target.value }))}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="">{t("selectCategory")}</option>
              {categories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name_vi}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm">{t("brand")}</span>
            <select
              value={form.brand_id}
              onChange={(event) => setForm((prev) => ({ ...prev, brand_id: event.target.value }))}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="">{t("selectBrand")}</option>
              {brands.map((brand) => (
                <option key={brand.id} value={String(brand.id)}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm">{t("nameVi")}</span>
            <input
              required
              value={form.name_vi}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  name_vi: event.target.value,
                  slug: prev.slug || slugify(event.target.value),
                }))
              }
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">{t("nameKo")}</span>
            <input
              required
              value={form.name_ko}
              onChange={(event) => setForm((prev) => ({ ...prev, name_ko: event.target.value }))}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">{t("nameEn")}</span>
            <input
              required
              value={form.name_en}
              onChange={(event) => setForm((prev) => ({ ...prev, name_en: event.target.value }))}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm">{t("slug")}</span>
          <input
            required
            value={form.slug}
            onChange={(event) => setForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm">{t("priceRetail")}</span>
            <input
              type="number"
              min="0"
              required
              value={form.price_retail}
              onChange={(event) => setForm((prev) => ({ ...prev, price_retail: event.target.value }))}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">{t("priceMember")}</span>
            <input
              type="number"
              min="0"
              value={form.price_member}
              onChange={(event) => setForm((prev) => ({ ...prev, price_member: event.target.value }))}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">{t("priceWholesale")}</span>
            <input
              type="number"
              min="0"
              value={form.price_wholesale}
              onChange={(event) => setForm((prev) => ({ ...prev, price_wholesale: event.target.value }))}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm">{t("originalPrice")}</span>
            <input
              type="number"
              min="0"
              value={form.original_price}
              onChange={(event) => setForm((prev) => ({ ...prev, original_price: event.target.value }))}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">{t("stock")}</span>
            <input
              type="number"
              min="0"
              required
              value={form.stock_quantity}
              onChange={(event) => setForm((prev) => ({ ...prev, stock_quantity: event.target.value }))}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">{t("sku")}</span>
            <input
              value={form.sku}
              onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm">{t("status")}</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, status: event.target.value as ProductFormState["status"] }))
              }
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="active">{t("statusActive")}</option>
              <option value="soldout">{t("statusSoldout")}</option>
              <option value="hidden">{t("statusHidden")}</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-2 self-end text-sm">
            <input
              type="checkbox"
              checked={form.allow_preorder}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, allow_preorder: event.target.checked }))
              }
            />
            <span>{t("allowPreorder")}</span>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">{t("restockDate")}</span>
            <input
              type="date"
              value={form.restock_date}
              onChange={(event) => setForm((prev) => ({ ...prev, restock_date: event.target.value }))}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(event) => setForm((prev) => ({ ...prev, is_featured: event.target.checked }))}
            />
            <span>{t("isFeatured")}</span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_new}
              onChange={(event) => setForm((prev) => ({ ...prev, is_new: event.target.checked }))}
            />
            <span>{t("isNew")}</span>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm">{t("descVi")}</span>
            <textarea
              required
              rows={4}
              value={form.description_vi}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description_vi: event.target.value }))
              }
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">{t("descKo")}</span>
            <textarea
              required
              rows={4}
              value={form.description_ko}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description_ko: event.target.value }))
              }
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">{t("descEn")}</span>
            <textarea
              required
              rows={4}
              value={form.description_en}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description_en: event.target.value }))
              }
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <Link href="/admin/products" className="rounded border border-neutral-300 px-3 py-2 text-sm">
            {t("cancel")}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      </form>
    </div>
  );
}
