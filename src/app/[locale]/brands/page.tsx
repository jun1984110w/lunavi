import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string };
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
  is_active: boolean;
};

const getLocalizedName = (
  locale: LocaleCode,
  row: { name_vi: string; name_ko: string; name_en: string },
) => {
  if (locale === "ko") return row.name_ko;
  if (locale === "en") return row.name_en;
  return row.name_vi;
};

const includesKeyword = (value: string, keyword: string) =>
  value.toLocaleLowerCase().includes(keyword.toLocaleLowerCase());

export default async function BrandsPage({ params, searchParams }: Props) {
  const { locale } = params;
  setRequestLocale(locale);

  const t = await getTranslations("brandsPage");
  const localeCode = (["vi", "ko", "en"].includes(locale) ? locale : "vi") as LocaleCode;
  const query = (Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q) || "";
  const sort = (Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort) || "alpha_asc";

  const supabase = createClient();
  const { data: brandsRaw } = await supabase
    .from("brands")
    .select("id, slug, name, name_vi, name_ko, name_en, logo_url, is_active")
    .eq("is_active", true);

  let brands = ((brandsRaw as BrandRow[] | null) ?? []).filter((brand) => {
    if (!query.trim()) return true;
    return (
      includesKeyword(brand.name, query) ||
      includesKeyword(brand.name_vi, query) ||
      includesKeyword(brand.name_ko, query) ||
      includesKeyword(brand.name_en, query)
    );
  });

  if (sort === "alpha_desc") {
    brands = brands.sort((a, b) =>
      getLocalizedName(localeCode, b).localeCompare(getLocalizedName(localeCode, a), locale),
    );
  } else {
    brands = brands.sort((a, b) =>
      getLocalizedName(localeCode, a).localeCompare(getLocalizedName(localeCode, b), locale),
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 px-3 py-4 sm:px-4 lg:px-6">
      <h1 className="text-xl font-bold sm:text-2xl">{t("title")}</h1>

      <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm sm:max-w-sm"
        />
        <select
          name="sort"
          defaultValue={sort}
          className="rounded-md border border-neutral-300 px-2 py-2 text-sm"
        >
          <option value="alpha_asc">{t("sortAsc")}</option>
          <option value="alpha_desc">{t("sortDesc")}</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white"
        >
          {t("searchButton")}
        </button>
      </form>

      {brands.length > 0 ? (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brand/${brand.slug}`}
              className="rounded-xl border border-neutral-200 bg-white p-4 text-center hover:border-brand"
            >
              <div className="mx-auto flex h-16 items-center justify-center">
                {brand.logo_url ? (
                  <img
                    src={brand.logo_url}
                    alt={getLocalizedName(localeCode, brand)}
                    className="h-full object-contain"
                  />
                ) : (
                  <span className="text-sm font-semibold text-neutral-500">{brand.name}</span>
                )}
              </div>
              <p className="mt-2 line-clamp-1 text-sm font-medium text-ink">
                {getLocalizedName(localeCode, brand)}
              </p>
            </Link>
          ))}
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-10 text-center text-sm text-neutral-500">
          {t("emptyBrands")}
        </div>
      )}
    </main>
  );
}
