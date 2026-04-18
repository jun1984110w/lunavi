"use client";

import type { AdminRole } from "@/lib/auth/checkAdmin";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

type ProductRow = {
  id: number;
  slug: string;
  brand_id: number | null;
  category_id: number;
  name_vi: string;
  price_retail: number;
  stock_quantity: number;
  status: "active" | "soldout" | "hidden";
  allow_preorder: boolean;
  restock_date: string | null;
  created_at: string;
  brands: { id: number; name: string } | { id: number; name: string }[] | null;
  categories:
    | { id: number; name_vi: string; name_ko: string; name_en: string }
    | { id: number; name_vi: string; name_ko: string; name_en: string }[]
    | null;
  product_images:
    | { image_url: string; is_main: boolean; sort_order: number }[]
    | null;
};

type BrandOption = { id: number; name: string };
type CategoryOption = { id: number; name_vi: string };

type Props = {
  role: AdminRole;
  managedBrandIds: number[];
};

const PAGE_SIZE = 20;

export function AdminProductsManager({ role, managedBrandIds }: Props) {
  const t = useTranslations("adminProducts");
  const supabase = createClient();

  const [items, setItems] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const canCreate = role !== "brand_admin";
  const canDelete = role !== "brand_admin";
  const canManageProduct = (brandId: number | null) =>
    role !== "brand_admin" || (brandId !== null && managedBrandIds.includes(brandId));

  const loadFilterOptions = async () => {
    const [{ data: brandsRaw }, { data: categoriesRaw }] = await Promise.all([
      supabase.from("brands").select("id, name").eq("is_active", true).order("name"),
      supabase.from("categories").select("id, name_vi").eq("is_active", true).order("sort_order"),
    ]);
    setBrands((brandsRaw as BrandOption[] | null) ?? []);
    setCategories((categoriesRaw as CategoryOption[] | null) ?? []);
  };

  const loadProducts = async () => {
    setLoading(true);
    setErrorMessage(null);

    let queryBuilder = supabase
      .from("products")
      .select(
        "id, slug, brand_id, category_id, name_vi, price_retail, stock_quantity, status, allow_preorder, restock_date, created_at, brands(id, name), categories(id, name_vi, name_ko, name_en), product_images(image_url, is_main, sort_order)",
        { count: "exact" },
      );

    // brand_admin은 담당 브랜드 상품만 접근할 수 있도록 조회 자체를 제한합니다.
    if (role === "brand_admin") {
      if (managedBrandIds.length === 0) {
        setItems([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }
      queryBuilder = queryBuilder.in("brand_id", managedBrandIds);
    }

    if (query.trim()) {
      queryBuilder = queryBuilder.ilike("name_vi", `%${query.trim()}%`);
    }
    if (categoryFilter !== "all") {
      queryBuilder = queryBuilder.eq("category_id", Number(categoryFilter));
    }
    if (brandFilter !== "all") {
      queryBuilder = queryBuilder.eq("brand_id", Number(brandFilter));
    }

    if (statusFilter === "preorder") {
      queryBuilder = queryBuilder.eq("status", "soldout").eq("allow_preorder", true);
    } else if (statusFilter !== "all") {
      queryBuilder = queryBuilder.eq("status", statusFilter);
    }

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await queryBuilder
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setItems((data as ProductRow[] | null) ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    void loadFilterOptions();
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [query, categoryFilter, brandFilter, statusFilter, page]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const getStatusBadge = (item: ProductRow) => {
    if (item.status === "active") return { label: t("statusActive"), className: "bg-green-100 text-green-700" };
    if (item.status === "hidden") return { label: t("statusHidden"), className: "bg-neutral-200 text-neutral-700" };
    if (item.status === "soldout" && item.allow_preorder)
      return { label: t("statusPreorder"), className: "bg-blue-100 text-blue-700" };
    return { label: t("statusSoldout"), className: "bg-red-100 text-red-700" };
  };

  const getMainImage = (images: ProductRow["product_images"]) => {
    const sorted = [...(images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    return sorted.find((item) => item.is_main)?.image_url ?? sorted[0]?.image_url ?? null;
  };

  const handleDelete = async (item: ProductRow) => {
    if (!canDelete || !canManageProduct(item.brand_id)) {
      setErrorMessage(t("noPermission"));
      return;
    }
    if (!window.confirm(t("deleteConfirm"))) return;

    const { error } = await supabase.from("products").delete().eq("id", item.id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setSuccessMessage(t("deleteSuccess"));
    await loadProducts();
  };

  const handleDuplicate = async (item: ProductRow) => {
    if (!canManageProduct(item.brand_id)) {
      setErrorMessage(t("noPermission"));
      return;
    }
    const duplicatedSlug = `${item.slug}-copy-${Date.now()}`;
    const { error } = await supabase.from("products").insert({
      category_id: item.category_id,
      brand_id: item.brand_id,
      name_vi: `${item.name_vi} (copy)`,
      name_ko: `${item.name_vi} (copy)`,
      name_en: `${item.name_vi} (copy)`,
      slug: duplicatedSlug,
      description_vi: "",
      description_ko: "",
      description_en: "",
      price_retail: item.price_retail,
      currency: "VND",
      stock_quantity: item.stock_quantity,
      status: item.status,
      allow_preorder: item.allow_preorder,
      restock_date: item.restock_date,
      is_featured: false,
      is_new: false,
    });
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setSuccessMessage(t("duplicateSuccess"));
    await loadProducts();
  };

  const handlePreorderUpdate = async (item: ProductRow, allowPreorder: boolean, restockDate: string) => {
    if (!canManageProduct(item.brand_id)) {
      setErrorMessage(t("noPermission"));
      return;
    }
    const { error } = await supabase
      .from("products")
      .update({
        allow_preorder: allowPreorder,
        restock_date: restockDate || null,
      })
      .eq("id", item.id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setSuccessMessage(t("saveSuccess"));
    await loadProducts();
  };

  const rows = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        brand: Array.isArray(item.brands) ? item.brands[0] : item.brands,
        category: Array.isArray(item.categories) ? item.categories[0] : item.categories,
      })),
    [items],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t("title")}</h1>
        {canCreate ? (
          <Link
            href="/admin/products/new"
            className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white"
          >
            {t("newProduct")}
          </Link>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p>
      ) : null}

      <div className="grid gap-2 rounded-xl border border-neutral-200 bg-white p-3 md:grid-cols-4">
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              setQuery(searchInput);
              setPage(1);
            }
          }}
          placeholder={t("searchPlaceholder")}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <select
          value={categoryFilter}
          onChange={(event) => {
            setCategoryFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="all">{t("allCategories")}</option>
          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name_vi}
            </option>
          ))}
        </select>
        <select
          value={brandFilter}
          onChange={(event) => {
            setBrandFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="all">{t("allBrands")}</option>
          {brands.map((brand) => (
            <option key={brand.id} value={String(brand.id)}>
              {brand.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="all">{t("allStatus")}</option>
          <option value="active">{t("statusActive")}</option>
          <option value="soldout">{t("statusSoldout")}</option>
          <option value="preorder">{t("statusPreorder")}</option>
          <option value="hidden">{t("statusHidden")}</option>
        </select>
        <button
          type="button"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm md:col-span-4"
          onClick={() => {
            setQuery(searchInput);
            setPage(1);
          }}
        >
          {t("search")}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-600">
            <tr>
              <th className="px-3 py-2">{t("colThumb")}</th>
              <th className="px-3 py-2">{t("colNameVi")}</th>
              <th className="px-3 py-2">{t("colBrand")}</th>
              <th className="px-3 py-2">{t("colCategory")}</th>
              <th className="px-3 py-2">{t("colRetailPrice")}</th>
              <th className="px-3 py-2">{t("colStock")}</th>
              <th className="px-3 py-2">{t("colStatus")}</th>
              <th className="px-3 py-2">{t("colCreatedAt")}</th>
              <th className="px-3 py-2">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-neutral-500">
                  {t("loading")}
                </td>
              </tr>
            ) : rows.length > 0 ? (
              rows.map((item) => {
                const status = getStatusBadge(item);
                return (
                  <tr key={item.id} className="border-t border-neutral-100 align-top">
                    <td className="px-3 py-2">
                      {getMainImage(item.product_images) ? (
                        <img
                          src={getMainImage(item.product_images) as string}
                          alt={item.name_vi}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <span className="text-xs text-neutral-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium">{item.name_vi}</td>
                    <td className="px-3 py-2">{item.brand?.name ?? "-"}</td>
                    <td className="px-3 py-2">{item.category?.name_vi ?? "-"}</td>
                    <td className="px-3 py-2">{item.price_retail.toLocaleString()} VND</td>
                    <td className="px-3 py-2">{item.stock_quantity}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${status.className}`}>
                        {status.label}
                      </span>
                      {item.status === "soldout" && item.allow_preorder ? (
                        <p className="mt-1 text-xs text-blue-600">{t("preorderAvailable")}</p>
                      ) : null}
                      {item.status === "soldout" && item.restock_date ? (
                        <p className="mt-1 text-xs text-neutral-500">
                          {t("restockDateLabel")}: {item.restock_date}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{new Date(item.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          <Link
                            href={`/admin/products/${item.id}/edit`}
                            className="rounded border border-neutral-300 px-2 py-1 text-xs"
                          >
                            {t("edit")}
                          </Link>
                          <button
                            type="button"
                            className="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                            onClick={() => void handleDelete(item)}
                            disabled={!canDelete || !canManageProduct(item.brand_id)}
                          >
                            {t("delete")}
                          </button>
                          <button
                            type="button"
                            className="rounded border border-neutral-300 px-2 py-1 text-xs"
                            onClick={() => void handleDuplicate(item)}
                            disabled={!canManageProduct(item.brand_id)}
                          >
                            {t("duplicate")}
                          </button>
                        </div>

                        <div className="space-y-1">
                          <label className="inline-flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              defaultChecked={item.allow_preorder}
                              onChange={(event) =>
                                void handlePreorderUpdate(
                                  item,
                                  event.target.checked,
                                  item.restock_date ?? "",
                                )
                              }
                              disabled={!canManageProduct(item.brand_id)}
                            />
                            <span>{t("allowPreorder")}</span>
                          </label>
                          <input
                            type="date"
                            defaultValue={item.restock_date ?? ""}
                            onBlur={(event) =>
                              void handlePreorderUpdate(
                                item,
                                item.allow_preorder,
                                event.currentTarget.value,
                              )
                            }
                            className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
                            disabled={!canManageProduct(item.brand_id)}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-neutral-500">
                  {t("empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-40"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page <= 1}
        >
          {t("prevPage")}
        </button>
        <span className="text-sm text-neutral-600">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-40"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages}
        >
          {t("nextPage")}
        </button>
      </div>
    </div>
  );
}
