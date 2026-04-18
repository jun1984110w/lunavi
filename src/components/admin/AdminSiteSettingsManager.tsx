"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type FooterSns = {
  facebook?: string;
  instagram?: string;
  zalo?: string;
  youtube?: string;
};

type FormState = {
  site_name: string;
  logo_url: string;
  favicon_url: string;
  company_name: string;
  representative: string;
  business_number: string;
  address: string;
  phone: string;
  email: string;
  sns_facebook: string;
  sns_instagram: string;
  sns_zalo: string;
  sns_youtube: string;
  seo_title: string;
  seo_description: string;
  seo_og_image: string;
};

const DEFAULT_FORM: FormState = {
  site_name: "LUNAVI",
  logo_url: "",
  favicon_url: "",
  company_name: "",
  representative: "",
  business_number: "",
  address: "",
  phone: "",
  email: "",
  sns_facebook: "",
  sns_instagram: "",
  sns_zalo: "",
  sns_youtube: "",
  seo_title: "LUNAVI - Baby & Kids Store",
  seo_description: "",
  seo_og_image: "",
};

export function AdminSiteSettingsManager() {
  const t = useTranslations("adminSiteSettings");
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadSiteSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    if (data) {
      const sns = (data.footer_sns && typeof data.footer_sns === "object"
        ? data.footer_sns
        : {}) as FooterSns;
      setForm({
        site_name: data.site_name || "LUNAVI",
        logo_url: data.logo_url || "",
        favicon_url: data.favicon_url || "",
        company_name: data.company_name || "",
        representative: data.representative || "",
        business_number: data.business_number || "",
        address: data.address || "",
        phone: data.phone || "",
        email: data.email || "",
        sns_facebook: sns.facebook || "",
        sns_instagram: sns.instagram || "",
        sns_zalo: sns.zalo || "",
        sns_youtube: sns.youtube || "",
        seo_title: data.seo_title || "LUNAVI - Baby & Kids Store",
        seo_description: data.seo_description || "",
        seo_og_image: data.seo_og_image || "",
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    // 페이지 진입 시 site_settings 단일 행을 로드합니다.
    void loadSiteSettings();
  }, []);

  const uploadAsset = async (file: File) => {
    const ext = file.name.split(".").pop() ?? "png";
    const path = `site/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    // 사이트 공통 자산은 site-assets 버킷에 업로드합니다.
    const { error } = await supabase.storage.from("site-assets").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = {
      site_name: form.site_name.trim() || "LUNAVI",
      logo_url: form.logo_url.trim() || null,
      favicon_url: form.favicon_url.trim() || null,
      company_name: form.company_name.trim(),
      representative: form.representative.trim(),
      business_number: form.business_number.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      footer_sns: {
        facebook: form.sns_facebook.trim(),
        instagram: form.sns_instagram.trim(),
        zalo: form.sns_zalo.trim(),
        youtube: form.sns_youtube.trim(),
      },
      seo_title: form.seo_title.trim() || "LUNAVI - Baby & Kids Store",
      seo_description: form.seo_description.trim(),
      seo_og_image: form.seo_og_image.trim() || null,
    };

    const { error } = await supabase.from("site_settings").update(payload).eq("id", 1);
    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage(t("saveSuccess"));
    setSaving(false);

    // 저장 후 즉시 레이아웃/메타를 재평가해 전체 사이트 반영을 유도합니다.
    router.refresh();
  };

  if (loading) return <p className="text-sm text-neutral-500">{t("loading")}</p>;

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <h1 className="text-xl font-bold">{t("title")}</h1>
      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p>
      ) : null}

      <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="text-base font-bold">{t("sectionMall")}</h2>
        <input className="w-full rounded border px-3 py-2 text-sm" placeholder={t("siteName")} value={form.site_name} onChange={(e)=>setForm(p=>({...p,site_name:e.target.value}))} />
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block">{t("logoUpload")}</span>
            <input type="file" accept="image/*" onChange={async (e)=>{ const f=e.target.files?.[0]; if(!f) return; try{ const url=await uploadAsset(f); setForm(p=>({...p,logo_url:url})); }catch(err){ setErrorMessage(err instanceof Error ? err.message : t("uploadFailed")); } }} className="w-full rounded border px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block">{t("faviconUpload")}</span>
            <input type="file" accept="image/*" onChange={async (e)=>{ const f=e.target.files?.[0]; if(!f) return; try{ const url=await uploadAsset(f); setForm(p=>({...p,favicon_url:url})); }catch(err){ setErrorMessage(err instanceof Error ? err.message : t("uploadFailed")); } }} className="w-full rounded border px-3 py-2 text-sm" />
          </label>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="text-base font-bold">{t("sectionBusiness")}</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <input className="rounded border px-3 py-2 text-sm" placeholder={t("companyName")} value={form.company_name} onChange={(e)=>setForm(p=>({...p,company_name:e.target.value}))}/>
          <input className="rounded border px-3 py-2 text-sm" placeholder={t("representative")} value={form.representative} onChange={(e)=>setForm(p=>({...p,representative:e.target.value}))}/>
          <input className="rounded border px-3 py-2 text-sm" placeholder={t("businessNumber")} value={form.business_number} onChange={(e)=>setForm(p=>({...p,business_number:e.target.value}))}/>
        </div>
        <input className="w-full rounded border px-3 py-2 text-sm" placeholder={t("address")} value={form.address} onChange={(e)=>setForm(p=>({...p,address:e.target.value}))}/>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="rounded border px-3 py-2 text-sm" placeholder={t("phone")} value={form.phone} onChange={(e)=>setForm(p=>({...p,phone:e.target.value}))}/>
          <input className="rounded border px-3 py-2 text-sm" placeholder={t("email")} value={form.email} onChange={(e)=>setForm(p=>({...p,email:e.target.value}))}/>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="text-base font-bold">{t("sectionSns")}</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="rounded border px-3 py-2 text-sm" placeholder="Facebook URL" value={form.sns_facebook} onChange={(e)=>setForm(p=>({...p,sns_facebook:e.target.value}))}/>
          <input className="rounded border px-3 py-2 text-sm" placeholder="Instagram URL" value={form.sns_instagram} onChange={(e)=>setForm(p=>({...p,sns_instagram:e.target.value}))}/>
          <input className="rounded border px-3 py-2 text-sm" placeholder="Zalo URL" value={form.sns_zalo} onChange={(e)=>setForm(p=>({...p,sns_zalo:e.target.value}))}/>
          <input className="rounded border px-3 py-2 text-sm" placeholder="YouTube URL" value={form.sns_youtube} onChange={(e)=>setForm(p=>({...p,sns_youtube:e.target.value}))}/>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="text-base font-bold">{t("sectionSeo")}</h2>
        <input className="w-full rounded border px-3 py-2 text-sm" placeholder={t("seoTitle")} value={form.seo_title} onChange={(e)=>setForm(p=>({...p,seo_title:e.target.value}))}/>
        <textarea rows={4} className="w-full rounded border px-3 py-2 text-sm" placeholder={t("seoDescription")} value={form.seo_description} onChange={(e)=>setForm(p=>({...p,seo_description:e.target.value}))}/>
        <label className="block text-sm">
          <span className="mb-1 block">{t("seoOgImageUpload")}</span>
          <input type="file" accept="image/*" onChange={async (e)=>{ const f=e.target.files?.[0]; if(!f) return; try{ const url=await uploadAsset(f); setForm(p=>({...p,seo_og_image:url})); }catch(err){ setErrorMessage(err instanceof Error ? err.message : t("uploadFailed")); } }} className="w-full rounded border px-3 py-2 text-sm" />
        </label>
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {saving ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}
