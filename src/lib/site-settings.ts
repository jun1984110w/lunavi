import { createClient } from "@/lib/supabase/server";
import { cache } from "react";

type FooterSns = {
  facebook?: string;
  instagram?: string;
  zalo?: string;
  youtube?: string;
};

export type SiteSettings = {
  siteName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  companyName: string;
  representative: string;
  businessNumber: string;
  address: string;
  phone: string;
  email: string;
  footerSns: FooterSns;
  seoTitle: string;
  seoDescription: string;
  seoOgImage: string | null;
};

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: "LUNAVI",
  logoUrl: null,
  faviconUrl: null,
  companyName: "",
  representative: "",
  businessNumber: "",
  address: "",
  phone: "",
  email: "",
  footerSns: {},
  seoTitle: "LUNAVI - Baby & Kids Store",
  seoDescription: "",
  seoOgImage: null,
};

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const supabase = createClient();
  const { data } = await supabase
    .from("site_settings")
    .select(
      "site_name, logo_url, favicon_url, company_name, representative, business_number, address, phone, email, footer_sns, seo_title, seo_description, seo_og_image",
    )
    .eq("id", 1)
    .maybeSingle();

  if (!data) return DEFAULT_SITE_SETTINGS;

  const footerSnsRaw = data.footer_sns;
  const footerSns =
    footerSnsRaw && typeof footerSnsRaw === "object" ? (footerSnsRaw as FooterSns) : {};

  return {
    siteName: data.site_name || DEFAULT_SITE_SETTINGS.siteName,
    logoUrl: data.logo_url,
    faviconUrl: data.favicon_url,
    companyName: data.company_name || "",
    representative: data.representative || "",
    businessNumber: data.business_number || "",
    address: data.address || "",
    phone: data.phone || "",
    email: data.email || "",
    footerSns,
    seoTitle: data.seo_title || DEFAULT_SITE_SETTINGS.seoTitle,
    seoDescription: data.seo_description || "",
    seoOgImage: data.seo_og_image,
  };
});
