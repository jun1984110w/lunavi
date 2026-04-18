import { CategoryFilterSheet } from "@/components/category/CategoryFilterSheet";
import { ProductCard, type ProductCardItem } from "@/components/product/ProductCard";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

type Props = {
  params: { locale: string; slug: string };
  searchParams: Record<string, string | string[] | undefined>;
};

type LocaleCode = "vi" | "ko" | "en";

type CategoryRow = {
  id: number;
  parent_id: number | null;
  slug: string;
  name_vi: string;
  name_ko: string;
  name_en: string;
};

type BrandRow = {
  id: number;
  name: string;
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
  age_tags: string[] | null;
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

const parseNumber = (value: string | string[] | undefined, fallback: number) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseArray = (value: string | string[] | undefined) => {
  if (!value) return [] as string[];
  return Array.isArray(value) ? value : [value];
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

const getDescendantIds = (categories: CategoryRow[], rootId: number) => {
  const result: number[] = [];
  const queue = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) continue;
    result.push(currentId);

    const children = categories.filter((item) => item.parent_id === currentId);
    children.forEach((child) => queue.push(child.id));
  }

  return result;
};

const getBreadcrumb = (categories: CategoryRow[], current: CategoryRow) => {
  const chain: CategoryRow[] = [current];
  let cursor = current;

  // 루트 카테고리까지 부모를 따라 올라가서 빵크럼 경로를 만듭니다.
  while (cursor.parent_id) {
    const parent = categories.find((item) => item.id === cursor.parent_id);
    if (!parent) break;
    chain.unshift(parent);
    cursor = parent;
  }

  return chain;
};

const getSortConfig = (sort: string) => {
  if (sort === "newest") return { column: "created_at", ascending: false };
  if (sort === "price_low") return { column: "price_retail", ascending: true };
  if (sort === "price_high") return { column: "price_retail", ascending: false };
  if (sort === "reviews") return { column: "review_count", ascending: false };
  return { column: "sales_count", ascending: false };
};

export default async function CategoryProductsPage({ params, searchParams }: Props) {
  const { locale, slug } = params;
  setRequestLocale(locale);

  const t = await getTranslations("categoryPage");
  const localeCode = (["vi", "ko", "en"].includes(locale) ? locale : "vi") as LocaleCode;
  const supabase = createClient();

  const { data: categoriesRaw } = await supabase
    .from("categories")
    .select("id, parent_id, slug, name_vi, name_ko, name_en")
    .eq("is_active", true);

  const categories = (categoriesRaw as CategoryRow[] | null) ?? [];
  const currentCategory = categories.find((item) => item.slug === slug);

  if (!currentCategory) {
    notFound();
  }

  const categoryIds = getDescendantIds(categories, currentCategory.id);
  const breadcrumb = getBreadcrumb(categories, currentCategory);

  const page = Math.max(1, parseNumber(searchParams.page, 1));
  const minPrice = Math.max(0, parseNumber(searchParams.minPrice, 0));
  const maxPrice = Math.max(minPrice, parseNumber(searchParams.maxPrice, 50000000));
  const selectedBrandIds = parseArray(searchParams.brand)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  const selectedAgeTags = parseArray(searchParams.age);
  const sort = (Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort) || "popular";
  const sortConfig = getSortConfig(sort);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const productSelect =
    "id, slug, name_vi, name_ko, name_en, price_retail, price_member, original_price, rating_avg, review_count, age_tags, brands(id, slug, name), product_images(image_url, is_main, sort_order)";

  let productsQuery = supabase
    .from("products")
    .select(productSelect, { count: "exact" })
    .eq("status", "active")
    .in("category_id", categoryIds)
    .gte("price_retail", minPrice)
    .lte("price_retail", maxPrice);

  if (selectedBrandIds.length > 0) {
    productsQuery = productsQuery.in("brand_id", selectedBrandIds);
  }

  if (selectedAgeTags.length > 0) {
    productsQuery = productsQuery.overlaps("age_tags", selectedAgeTags);
  }

  const { data: productsRaw, count } = await productsQuery
    .order(sortConfig.column, { ascending: sortConfig.ascending })
    .range(from, to);

  const products = (productsRaw as ProductRow[] | null) ?? [];
  const productItems = toCardItems(localeCode, products);
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const { data: brandRowsRaw } = await supabase
    .from("brands")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  const brandOptions = (brandRowsRaw as BrandRow[] | null) ?? [];

  const { data: ageTagRowsRaw } = await supabase
    .from("products")
    .select("age_tags")
    .eq("status", "active")
    .in("category_id", categoryIds);

  const ageTagOptions = Array.from(
    new Set(
      ((ageTagRowsRaw as { age_tags: string[] | null }[] | null) ?? [])
        .flatMap((row) => row.age_tags ?? [])
        .filter(Boolean),
    ),
  );

  // 링크 생성 시 현재 필터 상태를 보존하기 위한 쿼리 문자열 유틸입니다.
  const buildQueryString = (overrides: Record<string, string | null>) => {
    const query = new URLSearchParams();
    query.set("page", String(page));
    query.set("sort", sort);
    query.set("minPrice", String(minPrice));
    query.set("maxPrice", String(maxPrice));
    selectedBrandIds.forEach((brandId) => query.append("brand", String(brandId)));
    selectedAgeTags.forEach((ageTag) => query.append("age", ageTag));

    Object.entries(overrides).forEach(([key, value]) => {
      query.delete(key);
      if (value !== null) query.set(key, value);
    });

    const result = query.toString();
    return result.length > 0 ? `?${result}` : "";
  };

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 px-3 py-4 sm:px-4 lg:px-6">
      <nav className="flex flex-wrap items-center gap-1 text-xs text-neutral-500 sm:text-sm">
        <Link href="/">{t("home")}</Link>
        {breadcrumb.map((item) => (
          <span key={item.id} className="inline-flex items-center gap-1">
            <span>{">"}</span>
            <Link href={`/category/${item.slug}`}>{getLocalizedName(localeCode, item)}</Link>
          </span>
        ))}
      </nav>

      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold sm:text-2xl">
          {getLocalizedName(localeCode, currentCategory)}
        </h1>
        <div className="flex items-center gap-2">
          <CategoryFilterSheet
            title={t("filterTitle")}
            filterLabel={t("filterButton")}
            priceLabel={t("priceFilter")}
            minPriceLabel={t("minPrice")}
            maxPriceLabel={t("maxPrice")}
            brandLabel={t("brandFilter")}
            ageLabel={t("ageFilter")}
            applyLabel={t("applyFilter")}
            closeLabel={t("close")}
            brands={brandOptions}
            ageTags={ageTagOptions}
            selectedBrandIds={selectedBrandIds}
            selectedAgeTags={selectedAgeTags}
            minPrice={minPrice}
            maxPrice={maxPrice}
          />
          <form method="get">
            <input type="hidden" name="page" value="1" />
            <input type="hidden" name="minPrice" value={String(minPrice)} />
            <input type="hidden" name="maxPrice" value={String(maxPrice)} />
            {selectedBrandIds.map((id) => (
              <input key={id} type="hidden" name="brand" value={String(id)} />
            ))}
            {selectedAgeTags.map((tag) => (
              <input key={tag} type="hidden" name="age" value={tag} />
            ))}
            <select
              name="sort"
              defaultValue={sort}
              className="rounded-md border border-neutral-300 px-2 py-2 text-sm"
              onChange={(event) => event.currentTarget.form?.submit()}
            >
              <option value="popular">{t("sortPopular")}</option>
              <option value="newest">{t("sortNewest")}</option>
              <option value="price_low">{t("sortPriceLow")}</option>
              <option value="price_high">{t("sortPriceHigh")}</option>
              <option value="reviews">{t("sortReviews")}</option>
            </select>
          </form>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="hidden space-y-4 rounded-xl border border-neutral-200 bg-white p-4 lg:block">
          <h2 className="text-sm font-bold">{t("filterTitle")}</h2>
          <form method="get" className="space-y-4">
            <input type="hidden" name="page" value="1" />
            <input type="hidden" name="sort" value={sort} />

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">{t("priceFilter")}</h3>
              <label className="block text-xs text-neutral-600">{t("minPrice")}</label>
              <input
                type="range"
                name="minPrice"
                min={0}
                max={50000000}
                step={10000}
                defaultValue={minPrice}
                className="w-full"
              />
              <label className="block text-xs text-neutral-600">{t("maxPrice")}</label>
              <input
                type="range"
                name="maxPrice"
                min={0}
                max={50000000}
                step={10000}
                defaultValue={maxPrice}
                className="w-full"
              />
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">{t("brandFilter")}</h3>
              <div className="space-y-1">
                {brandOptions.map((brand) => (
                  <label key={brand.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="brand"
                      value={brand.id}
                      defaultChecked={selectedBrandIds.includes(brand.id)}
                    />
                    <span>{brand.name}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">{t("ageFilter")}</h3>
              <div className="space-y-1">
                {ageTagOptions.map((tag) => (
                  <label key={tag} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="age"
                      value={tag}
                      defaultChecked={selectedAgeTags.includes(tag)}
                    />
                    <span>{tag}</span>
                  </label>
                ))}
              </div>
            </section>

            <button
              type="submit"
              className="w-full rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white"
            >
              {t("applyFilter")}
            </button>
          </form>
        </aside>

        <section className="space-y-4">
          {productItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {productItems.map((item) => (
                <ProductCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-10 text-center text-sm text-neutral-500">
              {t("emptyProducts")}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              href={`/category/${slug}${buildQueryString({ page: String(Math.max(1, page - 1)) })}`}
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
              href={`/category/${slug}${buildQueryString({
                page: String(Math.min(totalPages, page + 1)),
              })}`}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                page >= totalPages ? "pointer-events-none opacity-40" : ""
              }`}
            >
              {t("nextPage")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
