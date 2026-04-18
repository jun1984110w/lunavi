import { checkAdmin } from "@/lib/auth/checkAdmin";
import { createClient } from "@/lib/supabase/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = {
  params: { locale: string };
};

type RecentProductRow = {
  id: number;
  slug: string;
  name_vi: string;
  name_ko: string;
  name_en: string;
  created_at: string;
};

type LocaleCode = "vi" | "ko" | "en";

const getLocalizedName = (
  locale: LocaleCode,
  row: { name_vi: string; name_ko: string; name_en: string },
) => {
  if (locale === "ko") return row.name_ko;
  if (locale === "en") return row.name_en;
  return row.name_vi;
};

export default async function AdminDashboardPage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);

  await checkAdmin(locale);
  const t = await getTranslations("adminDashboard");
  const localeCode = (["vi", "ko", "en"].includes(locale) ? locale : "vi") as LocaleCode;
  const supabase = createClient();

  const [
    { count: productsCount },
    { count: membersCount },
    { count: brandsCount },
    { data: recentProductsRaw },
  ] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("brands").select("id", { count: "exact", head: true }),
    supabase
      .from("products")
      .select("id, slug, name_vi, name_ko, name_en, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const cards = [
    { label: t("totalProducts"), value: productsCount ?? 0 },
    { label: t("totalMembers"), value: membersCount ?? 0 },
    { label: t("totalBrands"), value: brandsCount ?? 0 },
    { label: t("totalOrders"), value: 0 },
  ];

  const recentProducts = (recentProductsRaw as RecentProductRow[] | null) ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold sm:text-2xl">{t("title")}</h1>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
          >
            <p className="text-sm text-neutral-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-ink">{card.value.toLocaleString()}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-bold">{t("recentProducts")}</h2>
        {recentProducts.length > 0 ? (
          <ul className="mt-3 divide-y divide-neutral-100">
            {recentProducts.map((product) => (
              <li key={product.id} className="flex items-center justify-between gap-3 py-2">
                <Link
                  href={`/product/${product.slug}`}
                  className="line-clamp-1 text-sm font-medium text-ink hover:text-brand"
                >
                  {getLocalizedName(localeCode, product)}
                </Link>
                <span className="shrink-0 text-xs text-neutral-500">
                  {new Date(product.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-neutral-500">{t("noRecentProducts")}</p>
        )}
      </section>
    </div>
  );
}
