"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type BannerRow = {
  id: number;
  title: string;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
};

type FormState = {
  id: number | null;
  title: string;
  image_url: string;
  link_url: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

const DEFAULT_FORM: FormState = {
  id: null,
  title: "",
  image_url: "",
  link_url: "",
  start_date: "",
  end_date: "",
  is_active: true,
};

export function AdminBannersManager() {
  const t = useTranslations("adminBanners");
  const supabase = createClient();

  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const loadBanners = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("banners")
      .select("id, title, image_url, link_url, sort_order, is_active, start_date, end_date")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setBanners((data as BannerRow[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    // 초기 진입 시 배너 목록을 조회합니다.
    void loadBanners();
  }, []);

  const uploadBannerImage = async (file: File) => {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    // 배너 이미지는 banners 버킷에 업로드합니다.
    const { error } = await supabase.storage.from("banners").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from("banners").getPublicUrl(path);
    return data.publicUrl;
  };

  const openCreateModal = () => {
    setForm(DEFAULT_FORM);
    setOpenModal(true);
  };

  const openEditModal = (banner: BannerRow) => {
    setForm({
      id: banner.id,
      title: banner.title,
      image_url: banner.image_url,
      link_url: banner.link_url ?? "",
      start_date: banner.start_date ? banner.start_date.slice(0, 10) : "",
      end_date: banner.end_date ? banner.end_date.slice(0, 10) : "",
      is_active: banner.is_active,
    });
    setOpenModal(true);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = {
      title: form.title.trim(),
      image_url: form.image_url.trim(),
      link_url: form.link_url.trim() || null,
      start_date: form.start_date ? `${form.start_date}T00:00:00.000Z` : null,
      end_date: form.end_date ? `${form.end_date}T23:59:59.999Z` : null,
      is_active: form.is_active,
    };

    if (form.id) {
      const { error } = await supabase.from("banners").update(payload).eq("id", form.id);
      if (error) {
        setErrorMessage(error.message);
        setSaving(false);
        return;
      }
    } else {
      const maxSort = banners.length > 0 ? Math.max(...banners.map((item) => item.sort_order)) : 0;
      const { error } = await supabase
        .from("banners")
        .insert({ ...payload, sort_order: maxSort + 1 });
      if (error) {
        setErrorMessage(error.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setOpenModal(false);
    setForm(DEFAULT_FORM);
    setSuccessMessage(t("saveSuccess"));
    await loadBanners();
  };

  const handleDelete = async (banner: BannerRow) => {
    if (!window.confirm(t("deleteConfirm"))) return;
    const { error } = await supabase.from("banners").delete().eq("id", banner.id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setSuccessMessage(t("deleteSuccess"));
    await loadBanners();
  };

  const handleToggleActive = async (banner: BannerRow) => {
    const { error } = await supabase
      .from("banners")
      .update({ is_active: !banner.is_active })
      .eq("id", banner.id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    await loadBanners();
  };

  const moveBanner = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const current = banners[index];
    const target = banners[targetIndex];
    const { error } = await supabase
      .from("banners")
      .upsert([
        { id: current.id, sort_order: target.sort_order },
        { id: target.id, sort_order: current.sort_order },
      ]);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    await loadBanners();
  };

  const saveBannerOrder = async (ordered: BannerRow[]) => {
    const payload = ordered.map((banner, index) => ({
      id: banner.id,
      sort_order: index + 1,
    }));

    const { error } = await supabase.from("banners").upsert(payload);
    if (error) {
      setErrorMessage(error.message);
      return false;
    }
    return true;
  };

  const handleDropReorder = async (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) return;

    const current = [...banners];
    const [moved] = current.splice(dragIndex, 1);
    current.splice(dropIndex, 0, moved);

    // 드래그로 바뀐 순서를 즉시 화면에 반영한 뒤 DB에 저장합니다.
    setBanners(current.map((banner, index) => ({ ...banner, sort_order: index + 1 })));
    setDragIndex(null);

    const success = await saveBannerOrder(current);
    if (!success) {
      await loadBanners();
      return;
    }
    setSuccessMessage(t("reorderSuccess"));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <button
          type="button"
          className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white"
          onClick={openCreateModal}
        >
          {t("addBanner")}
        </button>
      </div>

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-neutral-500">{t("loading")}</p>
      ) : banners.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((banner, index) => (
            <article
              key={banner.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => void handleDropReorder(index)}
              className="overflow-hidden rounded-xl border border-neutral-200 bg-white"
            >
              <img src={banner.image_url} alt={banner.title} className="h-36 w-full object-cover" />
              <div className="space-y-2 p-3">
                <p className="line-clamp-1 text-sm font-semibold">{banner.title}</p>
                <p className="line-clamp-1 text-xs text-neutral-500">{banner.link_url || "-"}</p>
                <p className="text-xs text-neutral-500">
                  {t("period")}:{" "}
                  {banner.start_date ? banner.start_date.slice(0, 10) : "-"} ~{" "}
                  {banner.end_date ? banner.end_date.slice(0, 10) : "-"}
                </p>
                <p className="text-xs text-neutral-500">
                  {t("sortOrder")}: {banner.sort_order}
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    className="rounded border border-neutral-300 px-2 py-1 text-xs"
                    onClick={() => handleToggleActive(banner)}
                  >
                    {banner.is_active ? t("active") : t("inactive")}
                  </button>
                  <button
                    type="button"
                    className="rounded border border-neutral-300 px-2 py-1 text-xs"
                    onClick={() => openEditModal(banner)}
                  >
                    {t("edit")}
                  </button>
                  <button
                    type="button"
                    className="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                    onClick={() => void handleDelete(banner)}
                  >
                    {t("delete")}
                  </button>
                  <button
                    type="button"
                    className="rounded border border-neutral-300 px-2 py-1 text-xs"
                    onClick={() => void moveBanner(index, -1)}
                    disabled={index === 0}
                  >
                    {t("moveUp")}
                  </button>
                  <button
                    type="button"
                    className="rounded border border-neutral-300 px-2 py-1 text-xs"
                    onClick={() => void moveBanner(index, 1)}
                    disabled={index === banners.length - 1}
                  >
                    {t("moveDown")}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-500">{t("empty")}</p>
      )}

      {openModal ? (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          role="presentation"
          onClick={() => setOpenModal(false)}
        >
          <div
            className="absolute left-1/2 top-1/2 w-[min(95vw,36rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-4 shadow-xl"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-bold">{form.id ? t("editTitle") : t("addTitle")}</h2>
            <form className="mt-3 space-y-3" onSubmit={handleSave}>
              <label className="block">
                <span className="mb-1 block text-sm">{t("titleField")}</span>
                <input
                  required
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm">{t("imageField")}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      const url = await uploadBannerImage(file);
                      setForm((prev) => ({ ...prev, image_url: url }));
                    } catch (error) {
                      setErrorMessage(error instanceof Error ? error.message : t("uploadFailed"));
                    }
                  }}
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                />
                {form.image_url ? (
                  <img src={form.image_url} alt="preview" className="mt-2 h-24 w-full rounded object-cover" />
                ) : null}
              </label>
              <label className="block">
                <span className="mb-1 block text-sm">{t("linkField")}</span>
                <input
                  value={form.link_url}
                  onChange={(event) => setForm((prev) => ({ ...prev, link_url: event.target.value }))}
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm">{t("startDate")}</span>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(event) => setForm((prev) => ({ ...prev, start_date: event.target.value }))}
                    className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">{t("endDate")}</span>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(event) => setForm((prev) => ({ ...prev, end_date: event.target.value }))}
                    className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                />
                <span>{t("isActiveField")}</span>
              </label>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded border border-neutral-300 px-3 py-2 text-sm"
                  onClick={() => setOpenModal(false)}
                >
                  {t("cancel")}
                </button>
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
        </div>
      ) : null}
    </div>
  );
}
