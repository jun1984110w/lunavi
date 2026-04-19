import { CategoryFilterSheet } from "@/components/category/CategoryFilterSheet";
import { ProductCard, type ProductCardItem } from "@/components/product/ProductCard";
import { Link } from "@/i18n/navigation";
import { fetchSearchProductIds } from "@/lib/search/productIds";
import { createClient } from "@/lib/supabase/server";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string };
  searchParams: Record<string, string | string[] | undefined>;
};

type LocaleCode = "vi" | "ko" | "en";

type BrandRow = {
  id: number;
  name: string;
};

type CategoryMatch = {
  id: number;
  slug: string;
  name_vi: string;
  name_ko: string;
  name_en: string;
  search_keywords: string[] | null;
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

const getSortConfig = (sort: string) => {
  if (sort === "newest") return { column: "created_at", ascending: false };
  if (sort === "price_low") return { column: "price_retail", ascending: true };
  if (sort === "price_high") return { column: "price_retail", ascending: false };
  if (sort === "reviews") return { column: "review_count", ascending: false };
  return { column: "sales_count", ascending: false };
};

/** 검색어가 카테고리 이름·slug·search_keywords에 포함되는지 판별합니다. */
function categoryMatchesQuery(row: CategoryMatch, qLower: string) {
  const blob = [row.name_vi, row.name_ko, row.name_en, row.slug, ...(row.search_keywords ?? [])]
    .join(" ")
    .toLowerCase();
  return blob.includes(qLower);
}

/**
 * 통합 검색 결과 — 상품·매칭 카테고리·브랜드 안내 + 필터/정렬
 */
export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = params;
  setRequestLocale(locale);

  const t = await getTranslations("searchPage");
  const tCat = await getTranslations("categoryPage");
  const localeCode = (["vi", "ko", "en"].includes(locale) ? locale : "vi") as LocaleCode;
  const supabase = createClient();

  const rawQ = (Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q) ?? "";
  const q = rawQ.trim();
  const qLower = q.toLowerCase();

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

  const brandPromise = q
    ? supabase
        .from("brands")
        .select("id, slug, name")
        .eq("is_active", true)
        .ilike("name", `%${q.replace(/[%_]/g, " ").trim()}%`)
        .limit(8)
    : Promise.resolve({ data: [] as { id: number; slug: string; name: string }[] | null, error: null });

  const [{ data: catRaw }, { data: brandMatchRaw }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, slug, name_vi, name_ko, name_en, search_keywords")
      .eq("is_active", true)
      .limit(800),
    brandPromise,
  ]);

  const categoriesAll = (catRaw as CategoryMatch[] | null) ?? [];
  const matchedCategories = q
    ? categoriesAll.filter((c) => categoryMatchesQuery(c, qLower)).slice(0, 10)
    : [];

  const matchedBrands = (brandMatchRaw as { id: number; slug: string; name: string }[] | null) ?? [];

  const searchIds = q ? await fetchSearchProductIds(supabase, q, 600) : [];

  let products: ProductRow[] = [];
  let totalCount = 0;

  if (q) {
    let productsQuery = supabase
      .from("products")
      .select(productSelect, { count: "exact" })
      .eq("status", "active")
      .gte("price_retail", minPrice)
      .lte("price_retail", maxPrice);

    if (searchIds.length > 0) {
      productsQuery = productsQuery.in("id", searchIds);
    } else {
      productsQuery = productsQuery.eq("id", -1);
    }

    if (selectedBrandIds.length > 0) {
      productsQuery = productsQuery.in("brand_id", selectedBrandIds);
    }

    if (selectedAgeTags.length > 0) {
      productsQuery = productsQuery.overlaps("age_tags", selectedAgeTags);
    }

    const { data: productsRaw, count } = await productsQuery
      .order(sortConfig.column, { ascending: sortConfig.ascending })
      .range(from, to);

    products = (productsRaw as ProductRow[] | null) ?? [];
    totalCount = count ?? 0;
  }

  const productItems = toCardItems(localeCode, products);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const { data: brandRowsRaw } = await supabase
    .from("brands")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  const brandOptions = (brandRowsRaw as BrandRow[] | null) ?? [];

  const ageIdList = searchIds.length > 0 ? searchIds.slice(0, 400) : [];
  const { data: ageTagRowsRaw } =
    ageIdList.length > 0
      ? await supabase.from("products").select("age_tags").in("id", ageIdList).eq("status", "active")
      : { data: [] as { age_tags: string[] | null }[] | null };

  const ageTagOptions = Array.from(
    new Set(
      ((ageTagRowsRaw as { age_tags: string[] | null }[] | null) ?? [])
        .flatMap((row) => row.age_tags ?? [])
        .filter(Boolean),
    ),
  );

  const productSelectShort =
    "id, slug, name_vi, name_ko, name_en, price_retail, price_member, original_price, rating_avg, review_count, brands(id, slug, name), product_images(image_url, is_main, sort_order)";

  const { data: featuredRaw } = await supabase
    .from("products")
    .select(productSelectShort)
    .eq("status", "active")
    .eq("is_featured", true)
    .order("sales_count", { ascending: false })
    .limit(8);

  const recommendedItems = toCardItems(localeCode, (featuredRaw as ProductRow[] | null) ?? []);

  const buildQueryString = (overrides: Record<string, string | null>) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
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

  const hasProductHits = Boolean(q) && totalCount > 0;
  const showEmpty = Boolean(q) && totalCount === 0;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 px-3 py-4 sm:px-4 lg:px-6">
      <nav className="flex flex-wrap items-center gap-1 text-xs text-neutral-500 sm:text-sm">
        <Link href="/">{tCat("home")}</Link>
        <span className="inline-flex items-center gap-1">
          <span>{">"}</span>
          <span className="font-medium text-ink">{t("breadcrumb")}</span>
        </span>
      </nav>

      <div className="space-y-1">
        <h1 className="text-lg font-bold sm:text-2xl">{t("title")}</h1>
        {q ? (
          <p className="text-sm text-neutral-600">
            {t("resultsFor", { q })}
          </p>
        ) : (
          <p className="text-sm text-amber-800">{t("emptyQueryHint")}</p>
        )}
      </div>

      {matchedCategories.length > 0 ? (
        <section className="rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-bold text-brand">{t("matchedCategories")}</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {matchedCategories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/category/${c.slug}`}
                  className="inline-block rounded-full border border-neutral-200 px-3 py-1 text-sm hover:border-brand hover:text-brand"
                >
                  {getLocalizedName(localeCode, c)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {matchedBrands.length > 0 ? (
        <section className="rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-bold text-brand">{t("matchedBrands")}</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {matchedBrands.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/brand/${b.slug}`}
                  className="inline-block rounded-full border border-neutral-200 px-3 py-1 text-sm hover:border-brand hover:text-brand"
                >
                  {b.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-neutral-600">
          {q ? t("hitCount", { count: totalCount }) : ""}
        </span>
        <div className="flex items-center gap-2">
          <CategoryFilterSheet
            title={tCat("filterTitle")}
            filterLabel={tCat("filterButton")}
            priceLabel={tCat("priceFilter")}
            minPriceLabel={tCat("minPrice")}
            maxPriceLabel={tCat("maxPrice")}
            brandLabel={tCat("brandFilter")}
            ageLabel={tCat("ageFilter")}
            applyLabel={tCat("applyFilter")}
            closeLabel={tCat("close")}
            brands={brandOptions}
            ageTags={ageTagOptions}
            selectedBrandIds={selectedBrandIds}
            selectedAgeTags={selectedAgeTags}
            minPrice={minPrice}
            maxPrice={maxPrice}
            extraHidden={q ? [{ name: "q", value: q }] : []}
          />
          <form method="get">
            {q ? <input type="hidden" name="q" value={q} /> : null}
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
              <option value="popular">{tCat("sortPopular")}</option>
              <option value="newest">{tCat("sortNewest")}</option>
              <option value="price_low">{tCat("sortPriceLow")}</option>
              <option value="price_high">{tCat("sortPriceHigh")}</option>
              <option value="reviews">{tCat("sortReviews")}</option>
            </select>
          </form>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="hidden space-y-4 rounded-xl border border-neutral-200 bg-white p-4 lg:block">
          <h2 className="text-sm font-bold">{tCat("filterTitle")}</h2>
          <form method="get" className="space-y-4">
            {q ? <input type="hidden" name="q" value={q} /> : null}
            <input type="hidden" name="page" value="1" />
            <input type="hidden" name="sort" value={sort} />

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">{tCat("priceFilter")}</h3>
              <label className="block text-xs text-neutral-600">{tCat("minPrice")}</label>
              <input
                type="range"
                name="minPrice"
                min={0}
                max={50000000}
                step={10000}
                defaultValue={minPrice}
                className="w-full"
              />
              <label className="block text-xs text-neutral-600">{tCat("maxPrice")}</label>
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
              <h3 className="text-sm font-semibold">{tCat("brandFilter")}</h3>
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
              <h3 className="text-sm font-semibold">{tCat("ageFilter")}</h3>
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
              {tCat("applyFilter")}
            </button>
          </form>
        </aside>

        <section className="space-y-4">
          {showEmpty ? (
            <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/40 px-4 py-8 text-center">
              <p className="font-medium text-ink">{t("noResults")}</p>
              <p className="mt-2 text-sm text-neutral-600">{t("tryOther")}</p>
            </div>
          ) : null}

          {productItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {productItems.map((item) => (
                <ProductCard key={item.id} item={item} />
              ))}
            </div>
          ) : !showEmpty && q ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-10 text-center text-sm text-neutral-500">
              {tCat("emptyProducts")}
            </div>
          ) : null}

          {showEmpty ? (
            <div className="space-y-2">
              <h2 className="text-base font-bold">{t("recommendedTitle")}</h2>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {recommendedItems.map((item) => (
                  <ProductCard key={`rec-${item.id}`} item={item} />
                ))}
              </div>
            </div>
          ) : null}

          {q && hasProductHits ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link
                href={`/search${buildQueryString({ page: String(Math.max(1, page - 1)) })}`}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  page <= 1 ? "pointer-events-none opacity-40" : ""
                }`}
              >
                {tCat("prevPage")}
              </Link>
              <span className="text-sm text-neutral-600">
                {page} / {totalPages}
              </span>
              <Link
                href={`/search${buildQueryString({
                  page: String(Math.min(totalPages, page + 1)),
                })}`}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  page >= totalPages ? "pointer-events-none opacity-40" : ""
                }`}
              >
                {tCat("nextPage")}
              </Link>
            </div>
          ) : null}
        </section>
      </div>

    </main>
  );
}
