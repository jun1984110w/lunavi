import { ProductCard, type ProductCardItem } from "@/components/product/ProductCard";
import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import { createClient } from "@/lib/supabase/server";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string; slug: string };
};

type LocaleCode = "vi" | "ko" | "en";

type ProductRow = {
  id: number;
  slug: string;
  category_id: number;
  brand_id: number | null;
  name_vi: string;
  name_ko: string;
  name_en: string;
  description_vi: string;
  description_ko: string;
  description_en: string;
  price_retail: number;
  price_wholesale: number | null;
  original_price: number | null;
  rating_avg: number | null;
  review_count: number | null;
  brands:
    | {
        id: number;
        slug: string;
        name: string;
        logo_url: string | null;
      }
    | {
        id: number;
        slug: string;
        name: string;
        logo_url: string | null;
      }[]
    | null;
  product_images:
    | {
        id: number;
        image_url: string;
        is_main: boolean;
        sort_order: number;
      }[]
    | null;
  product_options:
    | {
        id: number;
        option_name: string;
        option_value: string;
        price_adjustment: number;
        stock_quantity: number;
        sort_order: number;
      }[]
    | null;
};

type ProfileRow = {
  role: string;
};

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
  row: { description_vi: string; description_ko: string; description_en: string },
) => {
  if (locale === "ko") return row.description_ko;
  if (locale === "en") return row.description_en;
  return row.description_vi;
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
      priceMember: null,
      originalPrice: row.original_price,
      ratingAvg: row.rating_avg ?? 0,
      reviewCount: row.review_count ?? 0,
    };
  });
};

export default async function ProductDetailPage({ params }: Props) {
  const { locale, slug } = params;
  setRequestLocale(locale);

  const t = await getTranslations("productDetail");
  const localeCode = (["vi", "ko", "en"].includes(locale) ? locale : "vi") as LocaleCode;
  const supabase = createClient();

  const { data: productRaw } = await supabase
    .from("products")
    .select(
      "id, slug, category_id, brand_id, name_vi, name_ko, name_en, description_vi, description_ko, description_en, price_retail, price_wholesale, original_price, rating_avg, review_count, brands(id, slug, name, logo_url), product_images(id, image_url, is_main, sort_order), product_options(id, option_name, option_value, price_adjustment, stock_quantity, sort_order)",
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  const product = (productRaw as ProductRow | null) ?? null;

  if (!product) {
    return (
      <main className="mx-auto w-full max-w-7xl px-3 py-10 text-center sm:px-4 lg:px-6">
        <p className="text-sm text-neutral-500">{t("productPreparing")}</p>
      </main>
    );
  }

  const { data: authData } = await supabase.auth.getUser();
  let role = "customer";
  if (authData.user?.id) {
    const { data: profileRaw } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();
    role = ((profileRaw as ProfileRow | null)?.role ?? "customer").toLowerCase();
  }
  const isWholesaleViewer = role === "wholesale";

  const relatedQuery = supabase
    .from("products")
    .select(
      "id, slug, category_id, brand_id, name_vi, name_ko, name_en, description_vi, description_ko, description_en, price_retail, price_wholesale, original_price, rating_avg, review_count, brands(id, slug, name, logo_url), product_images(id, image_url, is_main, sort_order), product_options(id, option_name, option_value, price_adjustment, stock_quantity, sort_order)",
    )
    .eq("status", "active")
    .neq("id", product.id)
    .or(`category_id.eq.${product.category_id},brand_id.eq.${product.brand_id ?? -1}`)
    .order("sales_count", { ascending: false })
    .limit(8);

  const { data: relatedRaw } = await relatedQuery;
  const relatedItems = toCardItems(localeCode, (relatedRaw as ProductRow[] | null) ?? []);
  const brand = Array.isArray(product.brands) ? product.brands[0] : product.brands;
  const images = [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const options = [...(product.product_options ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-3 py-4 sm:px-4 lg:px-6">
      <ProductDetailClient
        product={{
          slug: product.slug,
          brandSlug: brand?.slug ?? null,
          brandName: brand?.name ?? "",
          brandLogoUrl: brand?.logo_url ?? null,
          name: getLocalizedName(localeCode, product),
          description: getLocalizedDescription(localeCode, product),
          priceRetail: product.price_retail,
          priceWholesale: product.price_wholesale,
          originalPrice: product.original_price,
          ratingAvg: product.rating_avg ?? 0,
          reviewCount: product.review_count ?? 0,
          images,
          options,
          isWholesaleViewer,
        }}
        labels={{
          addToCart: t("addToCart"),
          buyNow: t("buyNow"),
          optionTitle: t("optionTitle"),
          quantity: t("quantity"),
          detailTab: t("detailTab"),
          reviewTab: t("reviewTab"),
          inquiryTab: t("inquiryTab"),
          reviewPreparing: t("reviewPreparing"),
          inquiryPreparing: t("inquiryPreparing"),
          actionPreparing: t("actionPreparing"),
          wholesalePrice: t("wholesalePrice"),
          retailPrice: t("retailPrice"),
          imagePreparing: t("imagePreparing"),
        }}
      />

      <section className="space-y-3">
        <h2 className="text-base font-bold sm:text-lg">{t("relatedProducts")}</h2>
        {relatedItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {relatedItems.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">{t("productPreparing")}</p>
        )}
      </section>
    </main>
  );
}
