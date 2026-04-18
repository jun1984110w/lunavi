"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

type CategoryRow = {
  id: number;
  parent_id: number | null;
  name_vi: string;
  name_ko: string;
  name_en: string;
  slug: string;
  image_url: string | null;
  age_tags: string[] | null;
  search_keywords: string[] | null;
  sort_order: number;
  is_active: boolean;
};

type FormState = {
  id: number | null;
  parent_id: number | null;
  name_vi: string;
  name_ko: string;
  name_en: string;
  slug: string;
  image_url: string;
  age_tags: string[];
  search_keywords_text: string;
  sort_order: number;
  is_active: boolean;
};

const DEFAULT_FORM: FormState = {
  id: null,
  parent_id: null,
  name_vi: "",
  name_ko: "",
  name_en: "",
  slug: "",
  image_url: "",
  age_tags: [],
  search_keywords_text: "",
  sort_order: 0,
  is_active: true,
};

const AGE_TAG_OPTIONS = ["0-6개월", "6-12개월", "1-2세", "2-4세", "4세+"];

const slugify = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

type Props = {
  canEdit: boolean;
};

export function AdminCategoriesManager({ canEdit }: Props) {
  const t = useTranslations("adminCategories");
  const supabase = createClient();

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const loadCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select(
        "id, parent_id, name_vi, name_ko, name_en, slug, image_url, age_tags, search_keywords, sort_order, is_active",
      )
      .order("sort_order", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setCategories((data as CategoryRow[] | null) ?? []);
    setLoading(false);
  };

  // 초기 진입 시 카테고리 트리를 조회합니다.
  useEffect(() => {
    void loadCategories();
  }, []);

  const rootCategories = useMemo(
    () => categories.filter((item) => item.parent_id === null),
    [categories],
  );

  const flattenOptions = (items: CategoryRow[], depth = 0): { id: number; label: string }[] => {
    return items.flatMap((item) => {
      const label = `${"— ".repeat(depth)}${item.name_ko || item.name_en || item.name_vi}`;
      const children = categories.filter((child) => child.parent_id === item.id);
      return [{ id: item.id, label }, ...flattenOptions(children, depth + 1)];
    });
  };

  const parentOptions = flattenOptions(rootCategories);

  const openCreateModal = () => {
    if (!canEdit) return;
    setForm(DEFAULT_FORM);
    setOpenModal(true);
  };

  const openEditModal = (category: CategoryRow) => {
    if (!canEdit) return;
    setForm({
      id: category.id,
      parent_id: category.parent_id,
      name_vi: category.name_vi,
      name_ko: category.name_ko,
      name_en: category.name_en,
      slug: category.slug,
      image_url: category.image_url ?? "",
      age_tags: category.age_tags ?? [],
      search_keywords_text: (category.search_keywords ?? []).join(", "),
      sort_order: category.sort_order,
      is_active: category.is_active,
    });
    setOpenModal(true);
  };

  const uploadImage = async (file: File) => {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `categories/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    // 카테고리 이미지는 공개 버킷(site-assets)에 업로드합니다.
    const { error } = await supabase.storage.from("site-assets").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleTranslate = async (source: "vi" | "ko" | "en") => {
    if (!canEdit) return;
    const sourceText =
      source === "vi" ? form.name_vi.trim() : source === "ko" ? form.name_ko.trim() : form.name_en.trim();
    if (!sourceText) {
      setErrorMessage(t("translateInputRequired"));
      return;
    }

    setErrorMessage(null);
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

    setForm((prev) => ({
      ...prev,
      name_vi: json.translations?.vi ?? prev.name_vi,
      name_ko: json.translations?.ko ?? prev.name_ko,
      name_en: json.translations?.en ?? prev.name_en,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = {
      parent_id: form.parent_id,
      name_vi: form.name_vi.trim(),
      name_ko: form.name_ko.trim(),
      name_en: form.name_en.trim(),
      slug: form.slug.trim(),
      image_url: form.image_url.trim() || null,
      age_tags: form.age_tags.length > 0 ? form.age_tags : null,
      search_keywords:
        form.search_keywords_text.trim().length > 0
          ? form.search_keywords_text
              .split(",")
              .map((token) => token.trim())
              .filter(Boolean)
          : null,
      sort_order: form.sort_order,
      is_active: form.is_active,
    };

    if (form.id) {
      const { error } = await supabase.from("categories").update(payload).eq("id", form.id);
      if (error) {
        setErrorMessage(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("categories").insert(payload);
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
    await loadCategories();
  };

  const collectDescendantIds = (targetId: number): number[] => {
    const ids: number[] = [targetId];
    const queue: number[] = [targetId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      const children = categories.filter((item) => item.parent_id === current);
      for (const child of children) {
        ids.push(child.id);
        queue.push(child.id);
      }
    }

    return ids;
  };

  const handleDelete = async (category: CategoryRow) => {
    if (!canEdit) return;
    const hasChildren = categories.some((item) => item.parent_id === category.id);
    if (hasChildren) {
      setErrorMessage(t("deleteBlockedChildren"));
      return;
    }

    const descendantIds = collectDescendantIds(category.id);
    const { data: productExists } = await supabase
      .from("products")
      .select("id")
      .in("category_id", descendantIds)
      .limit(1);

    if ((productExists ?? []).length > 0) {
      setErrorMessage(t("deleteBlockedProducts"));
      return;
    }

    if (!window.confirm(t("deleteConfirm"))) return;

    const { error } = await supabase.from("categories").delete().eq("id", category.id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setSuccessMessage(t("deleteSuccess"));
    await loadCategories();
  };

  const handleToggleActive = async (category: CategoryRow) => {
    if (!canEdit) return;
    const { error } = await supabase
      .from("categories")
      .update({ is_active: !category.is_active })
      .eq("id", category.id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    await loadCategories();
  };

  const renderTree = (parentId: number | null, depth = 0): React.ReactNode => {
    const items = categories
      .filter((item) => item.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order);

    return items.map((item) => (
      <div key={item.id} className="space-y-2">
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 bg-white p-3"
          style={{ marginLeft: `${depth * 16}px` }}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {item.name_ko} <span className="text-neutral-400">({item.slug})</span>
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              {item.name_vi} / {item.name_en}
            </p>
          </div>
          {canEdit ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="rounded border border-neutral-300 px-2 py-1 text-xs"
                onClick={() => handleToggleActive(item)}
              >
                {item.is_active ? t("active") : t("inactive")}
              </button>
              <button
                type="button"
                className="rounded border border-neutral-300 px-2 py-1 text-xs"
                onClick={() => openEditModal(item)}
              >
                {t("edit")}
              </button>
              <button
                type="button"
                className="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                onClick={() => void handleDelete(item)}
              >
                {t("delete")}
              </button>
            </div>
          ) : null}
        </div>
        {renderTree(item.id, depth + 1)}
      </div>
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t("title")}</h1>
        {canEdit ? (
          <button
            type="button"
            className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white"
            onClick={openCreateModal}
          >
            {t("addCategory")}
          </button>
        ) : null}
      </div>

      {!canEdit ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {t("readOnlyNotice")}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      <section className="space-y-2">
        {loading ? (
          <p className="text-sm text-neutral-500">{t("loading")}</p>
        ) : categories.length > 0 ? (
          renderTree(null)
        ) : (
          <p className="text-sm text-neutral-500">{t("empty")}</p>
        )}
      </section>

      {openModal ? (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          role="presentation"
          onClick={() => setOpenModal(false)}
        >
          <div
            className="absolute left-1/2 top-1/2 w-[min(95vw,42rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-4 shadow-xl"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-bold">
              {form.id ? t("editCategoryTitle") : t("addCategoryTitle")}
            </h2>
            <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-1 block text-sm">{t("parentCategory")}</span>
                <select
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  value={form.parent_id ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      parent_id: event.target.value ? Number(event.target.value) : null,
                    }))
                  }
                >
                  <option value="">{t("topCategory")}</option>
                  {parentOptions
                    .filter((option) => option.id !== form.id)
                    .map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                </select>
              </label>

              <div className="grid gap-2 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-sm">{t("nameVi")}</span>
                  <input
                    type="text"
                    required
                    value={form.name_vi}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        name_vi: event.target.value,
                        slug: prev.slug || slugify(event.target.value),
                      }))
                    }
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">{t("nameKo")}</span>
                  <input
                    type="text"
                    required
                    value={form.name_ko}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        name_ko: event.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">{t("nameEn")}</span>
                  <input
                    type="text"
                    required
                    value={form.name_en}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        name_en: event.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-neutral-300 px-2 py-1 text-xs"
                  onClick={() => void handleTranslate("vi")}
                >
                  {t("autoTranslateFromVi")}
                </button>
                <button
                  type="button"
                  className="rounded border border-neutral-300 px-2 py-1 text-xs"
                  onClick={() => void handleTranslate("ko")}
                >
                  {t("autoTranslateFromKo")}
                </button>
                <button
                  type="button"
                  className="rounded border border-neutral-300 px-2 py-1 text-xs"
                  onClick={() => void handleTranslate("en")}
                >
                  {t("autoTranslateFromEn")}
                </button>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm">{t("slug")}</span>
                <input
                  type="text"
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
                  <span className="mb-1 block text-sm">{t("imageUpload")}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      try {
                        const url = await uploadImage(file);
                        setForm((prev) => ({ ...prev, image_url: url }));
                      } catch (error) {
                        setErrorMessage(error instanceof Error ? error.message : t("uploadFailed"));
                      }
                    }}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">{t("sortOrder")}</span>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, sort_order: Number(event.target.value) || 0 }))
                    }
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">{t("ageTags")}</h3>
                <div className="flex flex-wrap gap-2">
                  {AGE_TAG_OPTIONS.map((tag) => (
                    <label key={tag} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs">
                      <input
                        type="checkbox"
                        checked={form.age_tags.includes(tag)}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            age_tags: event.target.checked
                              ? [...prev.age_tags, tag]
                              : prev.age_tags.filter((item) => item !== tag),
                          }))
                        }
                      />
                      <span>{tag}</span>
                    </label>
                  ))}
                </div>
              </section>

              <label className="block">
                <span className="mb-1 block text-sm">{t("searchKeywords")}</span>
                <input
                  type="text"
                  value={form.search_keywords_text}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, search_keywords_text: event.target.value }))
                  }
                  placeholder={t("searchKeywordsPlaceholder")}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                />
                <span>{t("isActive")}</span>
              </label>

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
