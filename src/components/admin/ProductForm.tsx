"use client";

import type { AdminRole } from "@/lib/auth/checkAdmin";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

type CategoryRow = {
  id: number;
  parent_id: number | null;
  name_vi: string;
};

type BrandOption = { id: number; name: string };

type ProductImageDraft = {
  id?: number;
  image_url: string;
  sort_order: number;
  is_main: boolean;
};

type ProductOptionDraft = {
  id?: number;
  option_name: string;
  option_value: string;
  price_adjustment: string;
  stock_quantity: string;
  sort_order: number;
};

type FormState = {
  name_vi: string;
  name_ko: string;
  name_en: string;
  slug: string;
  category_level1: string;
  category_level2: string;
  category_level3: string;
  brand_id: string;
  sku: string;
  original_price: string;
  price_retail: string;
  price_member: string;
  price_wholesale: string;
  min_wholesale_qty: string;
  description_vi: string;
  description_ko: string;
  description_en: string;
  stock_quantity: string;
  allow_preorder: boolean;
  restock_date: string;
  age_tags: string[];
  search_tags_text: string;
  is_featured: boolean;
  is_new: boolean;
  status: "active" | "soldout" | "hidden" | "preorder";
};

type Props = {
  mode: "create" | "edit";
  productId?: number;
  role: AdminRole;
  managedBrandIds: number[];
  hasTranslateApiKey: boolean;
};

/** 상품 수정 폼에서 조인으로 불러오는 이미지 행 타입입니다. */
type ProductImageRow = {
  id: number;
  image_url: string;
  sort_order: number;
  is_main: boolean;
};

/** 상품 수정 폼에서 조인으로 불러오는 옵션 행 타입입니다. */
type ProductOptionRow = {
  id: number;
  option_name: string;
  option_value: string;
  price_adjustment: number | string | null;
  stock_quantity: number | string | null;
  sort_order: number;
};

/** 수정 모드에서 products + 이미지/옵션 조인 select 결과 한 행의 형태입니다. */
type ProductEditRow = {
  id: number;
  category_id: number;
  brand_id: number | null;
  name_vi: string;
  name_ko: string;
  name_en: string;
  slug: string;
  sku: string | null;
  original_price: number | string | null;
  price_retail: number | string;
  price_member: number | string | null;
  price_wholesale: number | string | null;
  min_wholesale_qty?: number | string | null;
  description_vi: string | null;
  description_ko: string | null;
  description_en: string | null;
  stock_quantity: number;
  allow_preorder: boolean;
  restock_date: string | null;
  age_tags: string[] | null;
  search_tags: string[] | null;
  is_featured: boolean;
  is_new: boolean;
  status: string;
  product_images?: ProductImageRow[] | null;
  product_options?: ProductOptionRow[] | null;
};

const AGE_TAG_OPTIONS = ["0-6개월", "6-12개월", "1-2세", "2-4세", "4세+"];

const DEFAULT_FORM: FormState = {
  name_vi: "",
  name_ko: "",
  name_en: "",
  slug: "",
  category_level1: "",
  category_level2: "",
  category_level3: "",
  brand_id: "",
  sku: "",
  original_price: "",
  price_retail: "0",
  price_member: "",
  price_wholesale: "",
  min_wholesale_qty: "1",
  description_vi: "",
  description_ko: "",
  description_en: "",
  stock_quantity: "0",
  allow_preorder: false,
  restock_date: "",
  age_tags: [],
  search_tags_text: "",
  is_featured: false,
  is_new: true,
  status: "active",
};

const slugify = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export function ProductForm({
  mode,
  productId,
  role,
  managedBrandIds,
  hasTranslateApiKey,
}: Props) {
  const t = useTranslations("adminProductForm");
  const supabase = createClient();
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [images, setImages] = useState<ProductImageDraft[]>([]);
  const [options, setOptions] = useState<ProductOptionDraft[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragImageIndex, setDragImageIndex] = useState<number | null>(null);

  const canCreate = role !== "brand_admin";
  const canManageBrand = useCallback(
    (brandId: number | null) =>
      role !== "brand_admin" || (brandId !== null && managedBrandIds.includes(brandId)),
    [role, managedBrandIds],
  );

  const level1Options = useMemo(
    () => categories.filter((item) => item.parent_id === null),
    [categories],
  );
  const level2Options = useMemo(
    () => categories.filter((item) => item.parent_id === Number(form.category_level1 || 0)),
    [categories, form.category_level1],
  );
  const level3Options = useMemo(
    () => categories.filter((item) => item.parent_id === Number(form.category_level2 || 0)),
    [categories, form.category_level2],
  );

  const selectedCategoryId = useMemo(() => {
    if (form.category_level3) return Number(form.category_level3);
    if (form.category_level2) return Number(form.category_level2);
    if (form.category_level1) return Number(form.category_level1);
    return null;
  }, [form.category_level1, form.category_level2, form.category_level3]);

  useEffect(() => {
    // 폼 진입 시 카테고리/브랜드 목록을 불러옵니다.
    const loadOptions = async () => {
      const [{ data: categoryRaw }, { data: brandRaw }] = await Promise.all([
        supabase
          .from("categories")
          .select("id, parent_id, name_vi")
          .eq("is_active", true)
          .order("sort_order"),
        supabase.from("brands").select("id, name").eq("is_active", true).order("name"),
      ]);
      setCategories((categoryRaw as CategoryRow[] | null) ?? []);
      const brandRows = (brandRaw as BrandOption[] | null) ?? [];
      setBrands(
        role === "brand_admin"
          ? brandRows.filter((item) => managedBrandIds.includes(item.id))
          : brandRows,
      );
    };
    void loadOptions();
  }, [role, managedBrandIds, supabase]);

  useEffect(() => {
    if (mode !== "edit" || !productId) return;

    // 수정 모드에서는 기존 상품, 이미지, 옵션을 불러와 편집 상태를 초기화합니다.
    const loadProduct = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, category_id, brand_id, name_vi, name_ko, name_en, slug, sku, original_price, price_retail, price_member, price_wholesale, min_wholesale_qty, description_vi, description_ko, description_en, stock_quantity, allow_preorder, restock_date, age_tags, search_tags, is_featured, is_new, status, product_images(id, image_url, sort_order, is_main), product_options(id, option_name, option_value, price_adjustment, stock_quantity, sort_order)",
        )
        .eq("id", productId)
        .maybeSingle();

      if (error || !data) {
        setErrorMessage(error?.message || t("loadFailed"));
        setLoading(false);
        return;
      }

      const row = data as ProductEditRow;
      if (!canManageBrand(row.brand_id)) {
        setErrorMessage(t("noPermission"));
        setLoading(false);
        return;
      }

      const parent = categories.find((item) => item.id === row.category_id);
      const grand = parent?.parent_id
        ? categories.find((item) => item.id === parent.parent_id)
        : null;
      const great = grand?.parent_id
        ? categories.find((item) => item.id === grand.parent_id)
        : null;

      setForm({
        name_vi: row.name_vi,
        name_ko: row.name_ko,
        name_en: row.name_en,
        slug: row.slug,
        category_level1: String(great?.id ?? grand?.id ?? parent?.id ?? ""),
        category_level2: String(great ? grand?.id ?? "" : parent?.parent_id ? parent?.id : ""),
        category_level3: String(great ? parent?.id ?? "" : ""),
        brand_id: row.brand_id ? String(row.brand_id) : "",
        sku: row.sku ?? "",
        original_price: row.original_price === null ? "" : String(row.original_price),
        price_retail: String(row.price_retail),
        price_member: row.price_member === null ? "" : String(row.price_member),
        price_wholesale: row.price_wholesale === null ? "" : String(row.price_wholesale),
        min_wholesale_qty: String(row.min_wholesale_qty ?? 1),
        description_vi: row.description_vi ?? "",
        description_ko: row.description_ko ?? "",
        description_en: row.description_en ?? "",
        stock_quantity: String(row.stock_quantity),
        allow_preorder: row.allow_preorder,
        restock_date: row.restock_date ?? "",
        age_tags: row.age_tags ?? [],
        search_tags_text: (row.search_tags ?? []).join(", "),
        is_featured: row.is_featured,
        is_new: row.is_new,
        status:
          row.status === "soldout" && row.allow_preorder
            ? "preorder"
            : (row.status as FormState["status"]),
      });

      const imageRows: ProductImageRow[] = row.product_images ?? [];
      setImages(
        imageRows
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((img, index) => ({
            id: img.id,
            image_url: img.image_url,
            sort_order: index,
            is_main: img.is_main,
          })),
      );

      const optionRows: ProductOptionRow[] = row.product_options ?? [];
      setOptions(
        optionRows
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((opt, index) => ({
            id: opt.id,
            option_name: opt.option_name,
            option_value: opt.option_value,
            price_adjustment: String(opt.price_adjustment ?? 0),
            stock_quantity: String(opt.stock_quantity ?? 0),
            sort_order: index,
          })),
      );

      setLoading(false);
    };

    if (categories.length > 0) {
      void loadProduct();
    }
  }, [mode, productId, categories, t, supabase, canManageBrand]);

  const uploadProductImages = async (files: FileList | File[]) => {
    const uploaded: ProductImageDraft[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      // 상품 이미지는 product-images 공개 버킷에 업로드합니다.
      const { error } = await supabase.storage.from("product-images").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      uploaded.push({
        image_url: data.publicUrl,
        sort_order: 0,
        is_main: false,
      });
    }

    setImages((prev) => {
      const next = [...prev, ...uploaded].map((img, idx) => ({
        ...img,
        sort_order: idx,
        is_main: idx === 0 ? true : img.is_main,
      }));
      if (!next.some((img) => img.is_main) && next[0]) next[0].is_main = true;
      return next;
    });
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    setImages((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy.map((img, idx) => ({ ...img, sort_order: idx }));
    });
  };

  const runAutoTranslate = async (
    source: "vi" | "ko" | "en",
    type: "name" | "description",
  ) => {
    const sourceText =
      type === "name"
        ? source === "vi"
          ? form.name_vi
          : source === "ko"
            ? form.name_ko
            : form.name_en
        : source === "vi"
          ? form.description_vi
          : source === "ko"
            ? form.description_ko
            : form.description_en;

    if (!sourceText.trim()) {
      setErrorMessage(t("translateInputRequired"));
      return;
    }

    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: sourceText.trim(), source }),
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

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
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

    if (!selectedCategoryId) {
      setErrorMessage(t("selectCategory"));
      setSaving(false);
      return;
    }

    const statusForDb = form.status === "preorder" ? "soldout" : form.status;
    const allowPreorderForDb = form.status === "preorder" ? true : form.allow_preorder;

    const payload = {
      category_id: selectedCategoryId,
      brand_id: brandId,
      name_vi: form.name_vi.trim(),
      name_ko: form.name_ko.trim(),
      name_en: form.name_en.trim(),
      slug: form.slug.trim(),
      description_vi: form.description_vi.trim(),
      description_ko: form.description_ko.trim(),
      description_en: form.description_en.trim(),
      original_price: form.original_price.trim() ? Number(form.original_price) : null,
      price_retail: Number(form.price_retail || 0),
      price_member: form.price_member.trim() ? Number(form.price_member) : null,
      price_wholesale: form.price_wholesale.trim() ? Number(form.price_wholesale) : null,
      min_wholesale_qty: Math.max(1, Number(form.min_wholesale_qty || 1)),
      stock_quantity: Number(form.stock_quantity || 0),
      sku: form.sku.trim() || null,
      status: statusForDb,
      allow_preorder: allowPreorderForDb,
      restock_date: form.restock_date || null,
      age_tags: form.age_tags.length > 0 ? form.age_tags : null,
      search_tags: form.search_tags_text
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      is_featured: form.is_featured,
      is_new: form.is_new,
      currency: "VND",
    };

    const result =
      mode === "create"
        ? await supabase.from("products").insert(payload).select("id").single()
        : await supabase.from("products").update(payload).eq("id", productId as number).select("id").single();

    if (result.error || !result.data) {
      setErrorMessage(result.error?.message || t("saveFailed"));
      setSaving(false);
      return;
    }

    const savedProductId = (result.data as { id: number }).id;

    // 수정 시 기존 이미지/옵션을 교체 저장해 폼 상태와 DB를 일치시킵니다.
    if (mode === "edit") {
      await supabase.from("product_images").delete().eq("product_id", savedProductId);
      await supabase.from("product_options").delete().eq("product_id", savedProductId);
    }

    if (images.length > 0) {
      const imagePayload = images.map((img, index) => ({
        product_id: savedProductId,
        image_url: img.image_url,
        sort_order: index,
        is_main: img.is_main,
      }));
      const { error: imageError } = await supabase.from("product_images").insert(imagePayload);
      if (imageError) {
        setErrorMessage(imageError.message);
        setSaving(false);
        return;
      }
    }

    const validOptions = options.filter(
      (opt) => opt.option_name.trim() && opt.option_value.trim(),
    );
    if (validOptions.length > 0) {
      const optionPayload = validOptions.map((opt, index) => ({
        product_id: savedProductId,
        option_name: opt.option_name.trim(),
        option_value: opt.option_value.trim(),
        price_adjustment: Number(opt.price_adjustment || 0),
        stock_quantity: Number(opt.stock_quantity || 0),
        sort_order: index,
      }));
      const { error: optionError } = await supabase.from("product_options").insert(optionPayload);
      if (optionError) {
        setErrorMessage(optionError.message);
        setSaving(false);
        return;
      }
    }

    router.push("/admin/products");
    router.refresh();
  };

  if (loading) return <p className="text-sm text-neutral-500">{t("loading")}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{mode === "create" ? t("createTitle") : t("editTitle")}</h1>
        <Link href="/admin/products" className="rounded border border-neutral-300 px-3 py-1.5 text-sm">
          {t("backToList")}
        </Link>
      </div>

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
      ) : null}

      <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4">
        <section className="space-y-3">
          <h2 className="text-base font-bold">{t("sectionBasic")}</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            <input className="rounded border px-3 py-2 text-sm" placeholder={t("nameVi")} value={form.name_vi} onChange={(e)=>setForm(p=>({...p,name_vi:e.target.value,slug:p.slug||slugify(e.target.value)}))} />
            <input className="rounded border px-3 py-2 text-sm" placeholder={t("nameKo")} value={form.name_ko} onChange={(e)=>setForm(p=>({...p,name_ko:e.target.value}))} />
            <input className="rounded border px-3 py-2 text-sm" placeholder={t("nameEn")} value={form.name_en} onChange={(e)=>setForm(p=>({...p,name_en:e.target.value}))} />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["vi","ko","en"] as const).map((source)=>(
              <button key={source} type="button" disabled={!hasTranslateApiKey} onClick={()=>void runAutoTranslate(source,"name")} className="rounded border px-2 py-1 text-xs disabled:opacity-40">
                {source==="vi"?t("autoTranslateFromVi"):source==="ko"?t("autoTranslateFromKo"):t("autoTranslateFromEn")}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <select value={form.category_level1} onChange={(e)=>setForm(p=>({...p,category_level1:e.target.value,category_level2:"",category_level3:""}))} className="rounded border px-3 py-2 text-sm">
              <option value="">{t("categoryLevel1")}</option>
              {level1Options.map(c=><option key={c.id} value={c.id}>{c.name_vi}</option>)}
            </select>
            <select value={form.category_level2} onChange={(e)=>setForm(p=>({...p,category_level2:e.target.value,category_level3:""}))} className="rounded border px-3 py-2 text-sm">
              <option value="">{t("categoryLevel2")}</option>
              {level2Options.map(c=><option key={c.id} value={c.id}>{c.name_vi}</option>)}
            </select>
            <select value={form.category_level3} onChange={(e)=>setForm(p=>({...p,category_level3:e.target.value}))} className="rounded border px-3 py-2 text-sm">
              <option value="">{t("categoryLevel3")}</option>
              {level3Options.map(c=><option key={c.id} value={c.id}>{c.name_vi}</option>)}
            </select>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <select value={form.brand_id} onChange={(e)=>setForm(p=>({...p,brand_id:e.target.value}))} className="rounded border px-3 py-2 text-sm">
              <option value="">{t("selectBrand")}</option>
              {brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <input className="rounded border px-3 py-2 text-sm" placeholder={t("sku")} value={form.sku} onChange={(e)=>setForm(p=>({...p,sku:e.target.value}))}/>
            <input className="rounded border px-3 py-2 text-sm" placeholder={t("slug")} value={form.slug} onChange={(e)=>setForm(p=>({...p,slug:slugify(e.target.value)}))}/>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">{t("sectionPrice")}</h2>
          <div className="grid gap-2 sm:grid-cols-4">
            <input type="number" min="0" className="rounded border px-3 py-2 text-sm" placeholder={t("originalPrice")} value={form.original_price} onChange={(e)=>setForm(p=>({...p,original_price:e.target.value}))}/>
            <input type="number" min="0" className="rounded border px-3 py-2 text-sm" placeholder={t("priceRetail")} value={form.price_retail} onChange={(e)=>setForm(p=>({...p,price_retail:e.target.value}))}/>
            <input type="number" min="0" className="rounded border px-3 py-2 text-sm" placeholder={t("priceMember")} value={form.price_member} onChange={(e)=>setForm(p=>({...p,price_member:e.target.value}))}/>
          </div>
          <div className="border-t pt-3">
            <p className="mb-2 text-xs text-neutral-500">{t("wholesaleNotice")}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <input type="number" min="0" className="rounded border px-3 py-2 text-sm" placeholder={t("priceWholesale")} value={form.price_wholesale} onChange={(e)=>setForm(p=>({...p,price_wholesale:e.target.value}))}/>
              <input type="number" min="1" className="rounded border px-3 py-2 text-sm" placeholder={t("minWholesaleQty")} value={form.min_wholesale_qty} onChange={(e)=>setForm(p=>({...p,min_wholesale_qty:e.target.value}))}/>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">{t("sectionImages")}</h2>
          <div
            className="rounded border-2 border-dashed border-neutral-300 p-4 text-sm"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files.length > 0) void uploadProductImages(e.dataTransfer.files);
            }}
          >
            <p>{t("imageDropHint")}</p>
            <input type="file" multiple accept="image/*" onChange={(e)=>{ if(e.target.files) void uploadProductImages(e.target.files); }} className="mt-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {images.map((img, index) => (
              <div
                key={`${img.image_url}-${index}`}
                draggable
                onDragStart={() => setDragImageIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragImageIndex === null) return;
                  moveImage(dragImageIndex, index);
                  setDragImageIndex(null);
                }}
                className="space-y-1 rounded border p-2"
              >
                <img src={img.image_url} alt="product" className="aspect-square w-full rounded object-cover" />
                <label className="inline-flex items-center gap-1 text-xs">
                  <input type="radio" name="main-image" checked={img.is_main} onChange={()=>setImages(prev=>prev.map((it,i)=>({...it,is_main:i===index})))} />
                  <span>{t("mainImage")}</span>
                </label>
                <button type="button" className="w-full rounded border px-2 py-1 text-xs" onClick={()=>setImages(prev=>prev.filter((_,i)=>i!==index).map((it,i)=>({...it,sort_order:i,is_main: it.is_main && i===0 ? true : it.is_main})))}>
                  {t("removeImage")}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">{t("sectionDescription")}</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            <textarea rows={8} className="rounded border px-3 py-2 text-sm" placeholder={t("descVi")} value={form.description_vi} onChange={(e)=>setForm(p=>({...p,description_vi:e.target.value}))}/>
            <textarea rows={8} className="rounded border px-3 py-2 text-sm" placeholder={t("descKo")} value={form.description_ko} onChange={(e)=>setForm(p=>({...p,description_ko:e.target.value}))}/>
            <textarea rows={8} className="rounded border px-3 py-2 text-sm" placeholder={t("descEn")} value={form.description_en} onChange={(e)=>setForm(p=>({...p,description_en:e.target.value}))}/>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["vi","ko","en"] as const).map((source)=>(
              <button key={source} type="button" disabled={!hasTranslateApiKey} onClick={()=>void runAutoTranslate(source,"description")} className="rounded border px-2 py-1 text-xs disabled:opacity-40">
                {source==="vi"?t("autoTranslateDescFromVi"):source==="ko"?t("autoTranslateDescFromKo"):t("autoTranslateDescFromEn")}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">{t("sectionOptions")}</h2>
            <button type="button" className="rounded border px-2 py-1 text-xs" onClick={()=>setOptions(prev=>[...prev,{option_name:"",option_value:"",price_adjustment:"0",stock_quantity:"0",sort_order:prev.length}])}>
              {t("addOption")}
            </button>
          </div>
          <div className="space-y-2">
            {options.map((opt,index)=>(
              <div key={index} className="grid gap-2 rounded border p-2 sm:grid-cols-5">
                <input className="rounded border px-2 py-1 text-xs" placeholder={t("optionName")} value={opt.option_name} onChange={(e)=>setOptions(prev=>prev.map((o,i)=>i===index?{...o,option_name:e.target.value}:o))}/>
                <input className="rounded border px-2 py-1 text-xs" placeholder={t("optionValue")} value={opt.option_value} onChange={(e)=>setOptions(prev=>prev.map((o,i)=>i===index?{...o,option_value:e.target.value}:o))}/>
                <input type="number" className="rounded border px-2 py-1 text-xs" placeholder={t("optionPriceAdjustment")} value={opt.price_adjustment} onChange={(e)=>setOptions(prev=>prev.map((o,i)=>i===index?{...o,price_adjustment:e.target.value}:o))}/>
                <input type="number" className="rounded border px-2 py-1 text-xs" placeholder={t("optionStock")} value={opt.stock_quantity} onChange={(e)=>setOptions(prev=>prev.map((o,i)=>i===index?{...o,stock_quantity:e.target.value}:o))}/>
                <button type="button" className="rounded border border-red-300 px-2 py-1 text-xs text-red-600" onClick={()=>setOptions(prev=>prev.filter((_,i)=>i!==index).map((o,i)=>({...o,sort_order:i})))}>
                  {t("deleteOption")}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">{t("sectionExtra")}</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            <input type="number" min="0" className="rounded border px-3 py-2 text-sm" placeholder={t("stock")} value={form.stock_quantity} onChange={(e)=>setForm(p=>({...p,stock_quantity:e.target.value}))}/>
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allow_preorder} onChange={(e)=>setForm(p=>({...p,allow_preorder:e.target.checked,status:e.target.checked?"preorder":p.status}))}/><span>{t("allowPreorder")}</span></label>
            <input type="date" className="rounded border px-3 py-2 text-sm" value={form.restock_date} onChange={(e)=>setForm(p=>({...p,restock_date:e.target.value}))}/>
          </div>
          <div className="flex flex-wrap gap-2">
            {AGE_TAG_OPTIONS.map(tag=>(
              <label key={tag} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs">
                <input type="checkbox" checked={form.age_tags.includes(tag)} onChange={(e)=>setForm(prev=>({...prev,age_tags:e.target.checked?[...prev.age_tags,tag]:prev.age_tags.filter(v=>v!==tag)}))}/>
                <span>{tag}</span>
              </label>
            ))}
          </div>
          <input className="w-full rounded border px-3 py-2 text-sm" placeholder={t("searchTags")} value={form.search_tags_text} onChange={(e)=>setForm(p=>({...p,search_tags_text:e.target.value}))}/>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_featured} onChange={(e)=>setForm(p=>({...p,is_featured:e.target.checked}))}/><span>{t("isFeatured")}</span></label>
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_new} onChange={(e)=>setForm(p=>({...p,is_new:e.target.checked}))}/><span>{t("isNew")}</span></label>
            <select className="rounded border px-3 py-2 text-sm" value={form.status} onChange={(e)=>setForm(p=>({...p,status:e.target.value as FormState["status"],allow_preorder:e.target.value==="preorder"?true:p.allow_preorder}))}>
              <option value="active">{t("statusActive")}</option>
              <option value="soldout">{t("statusSoldout")}</option>
              <option value="preorder">{t("statusPreorder")}</option>
              <option value="hidden">{t("statusHidden")}</option>
            </select>
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <Link href="/admin/products" className="rounded border px-3 py-2 text-sm">{t("cancel")}</Link>
          <button type="submit" disabled={saving} className="rounded bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      </form>
    </div>
  );
}
