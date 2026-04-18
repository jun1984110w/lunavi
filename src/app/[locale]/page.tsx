import { BannerSlider } from "@/components/home/BannerSlider";
import { ProductCard, type ProductCardItem } from "@/components/product/ProductCard";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string };
};

type LocaleCode = "vi" | "ko" | "en";

type SiteSettingsRow = {
  site_name: string | null;
  logo_url: string | null;
};

type BannerRow = {
  id: number;
  title: string;
  image_url: string;
  link_url: string | null;
  start_date: string | null;
  end_date: string | null;
};

type CategoryRow = {
  id: number;
  slug: string;
  icon: string | null;
  image_url: string | null;
  name_vi: string;
  name_ko: string;
  name_en: string;
};

type BrandRow = {
  id: number;
  slug: string;
  name: string;
  logo_url: string | null;
};

type ProductRow = {
  id: number;
  slug: string;
  name_vi: string;
  name_ko: string;
  name_en: string;
  price_retail: number;
  price_member: number | null;
  original_price: number | null;
  rating_avg: number | null;
  review_count: number | null;
  brands:
    | {
        id: number;
        slug: string;
        name: string;
      }
    | {
        id: number;
        slug: string;
        name: string;
      }[]
    | null;
  product_images:
    | {
        image_url: string;
        is_main: boolean;
        sort_order: number;
      }[]
    | null;
};

const pickLocalizedName = (
  locale: LocaleCode,
  row: { name_vi: string; name_ko: string; name_en: string },
) => {
  if (locale === "ko") return row.name_ko;
  if (locale === "en") return row.name_en;
  return row.name_vi;
};

const toCardItems = (locale: LocaleCode, rows: ProductRow[]): ProductCardItem[] => {
  return rows.map((row) => {
    const brand = Array.isArray(row.brands) ? row.brands[0] : row.brands;
    const sortedImages = [...(row.product_images ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const mainImage =
      sortedImages.find((img) => img.is_main)?.image_url ??
      sortedImages[0]?.image_url ??
      null;

    return {
      id: row.id,
      slug: row.slug,
      brandName: brand?.name ?? "",
      brandSlug: brand?.slug ?? null,
      name: pickLocalizedName(locale, row),
      imageUrl: mainImage,
      priceRetail: row.price_retail,
      priceMember: row.price_member,
      originalPrice: row.original_price,
      ratingAvg: row.rating_avg ?? 0,
      reviewCount: row.review_count ?? 0,
    };
  });
};

export default async function HomePage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);

  const tHome = await getTranslations("home");
  const tCommon = await getTranslations("common");
  const localeCode = (["vi", "ko", "en"].includes(locale) ? locale : "vi") as LocaleCode;
  const supabase = createClient();

  const { data: siteSettingsRaw } = await supabase
    .from("site_settings")
    .select("site_name, logo_url")
    .eq("id", 1)
    .maybeSingle();

  const { data: bannersRaw } = await supabase
    .from("banners")
    .select("id, title, image_url, link_url, start_date, end_date")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const { data: categoriesRaw } = await supabase
    .from("categories")
    .select("id, slug, icon, image_url, name_vi, name_ko, name_en")
    .is("parent_id", null)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const { data: brandsRaw } = await supabase
    .from("brands")
    .select("id, slug, name, logo_url")
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("sort_order", { ascending: true });

  const productSelect =
    "id, slug, name_vi, name_ko, name_en, price_retail, price_member, original_price, rating_avg, review_count, brands(id, slug, name), product_images(image_url, is_main, sort_order)";

  const [{ data: featuredRaw }, { data: newestRaw }, { data: popularRaw }] =
    await Promise.all([
      supabase
        .from("products")
        .select(productSelect)
        .eq("status", "active")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("products")
        .select(productSelect)
        .eq("status", "active")
        .eq("is_new", true)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("products")
        .select(productSelect)
        .eq("status", "active")
        .order("sales_count", { ascending: false })
        .limit(8),
    ]);

  const siteSettings = (siteSettingsRaw as SiteSettingsRow | null) ?? null;
  const categories = (categoriesRaw as CategoryRow[] | null) ?? [];
  const brands = (brandsRaw as BrandRow[] | null) ?? [];
  const featuredItems = toCardItems(localeCode, (featuredRaw as ProductRow[] | null) ?? []);
  const newestItems = toCardItems(localeCode, (newestRaw as ProductRow[] | null) ?? []);
  const popularItems = toCardItems(localeCode, (popularRaw as ProductRow[] | null) ?? []);

  const now = new Date();
  const banners = ((bannersRaw as BannerRow[] | null) ?? [])
    .filter((banner) => {
      const startOk = !banner.start_date || new Date(banner.start_date) <= now;
      const endOk = !banner.end_date || new Date(banner.end_date) >= now;
      return startOk && endOk;
    })
    .map((banner) => ({
      id: banner.id,
      title: banner.title,
      imageUrl: banner.image_url,
      linkUrl: banner.link_url,
    }));

  const siteName = siteSettings?.site_name || tHome("defaultSiteName");

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-3 py-4 sm:px-4 lg:px-6">
      <section className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3">
        <div>
          <p className="text-xs text-neutral-500">{tHome("todayPick")}</p>
          <h1 className="text-lg font-bold text-brand sm:text-xl">{siteName}</h1>
        </div>
        {siteSettings?.logo_url ? (
          <img
            src={siteSettings.logo_url}
            alt={siteName}
            className="h-10 w-10 rounded-md object-cover"
          />
        ) : null}
      </section>

      <section aria-label={tHome("mainBanner")}>
        <BannerSlider banners={banners} emptyLabel={tHome("bannerPreparing")} />
      </section>

      <section className="space-y-3" aria-label={tHome("categorySectionTitle")}>
        <h2 className="text-base font-bold sm:text-lg">{tHome("categorySectionTitle")}</h2>
        <div className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-6 md:overflow-visible">
          {categories.length > 0 ? (
            categories.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="min-w-[5rem] shrink-0 rounded-xl border border-neutral-200 bg-white p-2 text-center hover:border-brand md:min-w-0"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-xl">
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={pickLocalizedName(localeCode, category)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{category.icon || "🛍️"}</span>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-medium text-ink">
                  {pickLocalizedName(localeCode, category)}
                </p>
              </Link>
            ))
          ) : (
            <p className="text-sm text-neutral-500">{tHome("productsPreparing")}</p>
          )}
        </div>
      </section>

      <section className="space-y-3" aria-label={tHome("featuredBrandSectionTitle")}>
        <h2 className="text-base font-bold sm:text-lg">{tHome("featuredBrandSectionTitle")}</h2>
        {brands.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/brand/${brand.slug}`}
                className="flex min-w-[7rem] shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white p-3 hover:border-brand"
              >
                {brand.logo_url ? (
                  <img src={brand.logo_url} alt={brand.name} className="h-10 object-contain" />
                ) : (
                  <span className="text-sm font-semibold">{brand.name}</span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">{tHome("productsPreparing")}</p>
        )}
      </section>

      <section className="space-y-3" aria-label={tHome("featuredProductSectionTitle")}>
        <h2 className="text-base font-bold sm:text-lg">{tHome("featuredProductSectionTitle")}</h2>
        {featuredItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {featuredItems.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">{tHome("productsPreparing")}</p>
        )}
      </section>

      <section className="space-y-3" aria-label={tHome("newProductSectionTitle")}>
        <h2 className="text-base font-bold sm:text-lg">{tHome("newProductSectionTitle")}</h2>
        {newestItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {newestItems.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">{tHome("productsPreparing")}</p>
        )}
      </section>

      <section className="space-y-3" aria-label={tHome("bestSellerSectionTitle")}>
        <h2 className="text-base font-bold sm:text-lg">{tHome("bestSellerSectionTitle")}</h2>
        {popularItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {popularItems.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">{tHome("productsPreparing")}</p>
        )}
      </section>

      <div className="sr-only">{tCommon("search")}</div>
    </main>
  );
}
