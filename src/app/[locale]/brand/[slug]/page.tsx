import { ProductCard, type ProductCardItem } from "@/components/product/ProductCard";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string; slug: string };
  searchParams: Record<string, string | string[] | undefined>;
};

type LocaleCode = "vi" | "ko" | "en";

type BrandRow = {
  id: number;
  slug: string;
  name: string;
  name_vi: string;
  name_ko: string;
  name_en: string;
  logo_url: string | null;
  banner_url: string | null;
  description_vi: string | null;
  description_ko: string | null;
  description_en: string | null;
  origin_country: string | null;
  website_url: string | null;
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

const PAGE_SIZE = 20;

const getLocalizedName = (
  locale: LocaleCode,
  row: { name_vi: string; name_ko: string; name_en: string },
) => {
  if (locale === "ko") return row.name_ko;
  if (locale === "en") return row.name_en;
  return row.name_vi;
};

const getLocalizedDescription = (
  locale: LocaleCode,
  row: { description_vi: string | null; description_ko: string | null; description_en: string | null },
) => {
  if (locale === "ko") return row.description_ko;
  if (locale === "en") return row.description_en;
  return row.description_vi;
};

const parseNumber = (value: string | string[] | undefined, fallback: number) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getSortConfig = (sort: string) => {
  if (sort === "newest") return { column: "created_at", ascending: false };
  if (sort === "price_low") return { column: "price_retail", ascending: true };
  if (sort === "price_high") return { column: "price_retail", ascending: false };
  return { column: "sales_count", ascending: false };
};

const toCardItems = (locale: LocaleCode, rows: ProductRow[]): ProductCardItem[] => {
  return rows.map((row) => {
    const brand = Array.isArray(row.brands) ? row.brands[0] : row.brands;
    const sortedImages = [...(row.product_images ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const imageUrl =
      sortedImages.find((item) => item.is_main)?.image_url ?? sortedImages[0]?.image_url ?? null;

    return {
      id: row.id,
      slug: row.slug,
      brandName: brand?.name ?? "",
      brandSlug: brand?.slug ?? null,
      name: getLocalizedName(locale, row),
      imageUrl,
      priceRetail: row.price_retail,
      priceMember: row.price_member,
      originalPrice: row.original_price,
      ratingAvg: row.rating_avg ?? 0,
      reviewCount: row.review_count ?? 0,
    };
  });
};

export default async function BrandDetailPage({ params, searchParams }: Props) {
  const { locale, slug } = params;
  setRequestLocale(locale);

  const t = await getTranslations("brandPage");
  const localeCode = (["vi", "ko", "en"].includes(locale) ? locale : "vi") as LocaleCode;
  const supabase = createClient();

  const { data: brandRaw } = await supabase
    .from("brands")
    .select(
      "id, slug, name, name_vi, name_ko, name_en, logo_url, banner_url, description_vi, description_ko, description_en, origin_country, website_url",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  const brand = (brandRaw as BrandRow | null) ?? null;

  if (!brand) {
    return (
      <main className="mx-auto w-full max-w-7xl px-3 py-10 text-center sm:px-4 lg:px-6">
        <p className="text-sm text-neutral-500">{t("brandPreparing")}</p>
      </main>
    );
  }

  const sort = (Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort) || "popular";
  const page = Math.max(1, parseNumber(searchParams.page, 1));
  const sortConfig = getSortConfig(sort);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const productSelect =
    "id, slug, name_vi, name_ko, name_en, price_retail, price_member, original_price, rating_avg, review_count, brands(id, slug, name), product_images(image_url, is_main, sort_order)";

  const { data: productsRaw, count } = await supabase
    .from("products")
    .select(productSelect, { count: "exact" })
    .eq("status", "active")
    .eq("brand_id", brand.id)
    .order(sortConfig.column, { ascending: sortConfig.ascending })
    .range(from, to);

  const items = toCardItems(localeCode, (productsRaw as ProductRow[] | null) ?? []);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const brandName = getLocalizedName(localeCode, brand);
  const brandDescription = getLocalizedDescription(localeCode, brand);

  const buildQueryString = (targetPage: number) => {
    const query = new URLSearchParams();
    query.set("sort", sort);
    query.set("page", String(targetPage));
    return `?${query.toString()}`;
  };

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-3 py-4 sm:px-4 lg:px-6">
      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
        {brand.banner_url ? (
          <img src={brand.banner_url} alt={brandName} className="h-44 w-full object-cover sm:h-64 lg:h-80" />
        ) : (
          <div className="flex h-44 items-center justify-center text-sm text-neutral-500 sm:h-64 lg:h-80">
            {t("brandPreparing")}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
            {brand.logo_url ? (
              <img src={brand.logo_url} alt={brandName} className="h-full w-full object-contain" />
            ) : (
              <span className="text-sm font-semibold text-neutral-500">{brandName}</span>
            )}
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold">{brandName}</h1>
            <p className="text-sm text-neutral-600">
              {t("originCountry")}: {brand.origin_country || "-"}
            </p>
            {brand.website_url ? (
              <a
                href={brand.website_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-brand underline"
              >
                {t("officialWebsite")}
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 text-base font-bold">{t("brandDescription")}</h2>
        <p className="whitespace-pre-line text-sm text-neutral-700">
          {brandDescription || t("brandPreparing")}
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold sm:text-lg">{t("brandProducts")}</h2>
          <form method="get">
            <input type="hidden" name="page" value="1" />
            <select
              name="sort"
              defaultValue={sort}
              className="rounded-md border border-neutral-300 px-2 py-2 text-sm"
              onChange={(event) => event.currentTarget.form?.submit()}
            >
              <option value="price_low">{t("sortPriceLow")}</option>
              <option value="price_high">{t("sortPriceHigh")}</option>
              <option value="popular">{t("sortPopular")}</option>
              <option value="newest">{t("sortNewest")}</option>
            </select>
          </form>
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {items.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-10 text-center text-sm text-neutral-500">
            {t("brandPreparing")}
          </div>
        )}

        <div className="flex items-center justify-center gap-2">
          <Link
            href={`/brand/${slug}${buildQueryString(Math.max(1, page - 1))}`}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              page <= 1 ? "pointer-events-none opacity-40" : ""
            }`}
          >
            {t("prevPage")}
          </Link>
          <span className="text-sm text-neutral-600">
            {page} / {totalPages}
          </span>
          <Link
            href={`/brand/${slug}${buildQueryString(Math.min(totalPages, page + 1))}`}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              page >= totalPages ? "pointer-events-none opacity-40" : ""
            }`}
          >
            {t("nextPage")}
          </Link>
        </div>
      </section>
    </main>
  );
}
