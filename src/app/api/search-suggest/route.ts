import { fetchSearchProductIds } from "@/lib/search/productIds";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type LocaleCode = "vi" | "ko" | "en";

const pickName = (
  locale: LocaleCode,
  row: { name_vi: string; name_ko: string; name_en: string },
) => {
  if (locale === "ko") return row.name_ko;
  if (locale === "en") return row.name_en;
  return row.name_vi;
};

/**
 * 헤더 자동완성용: 상품·카테고리·브랜드 후보를 짧은 목록으로 반환합니다.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQ = searchParams.get("q") ?? "";
  const locale = (["vi", "ko", "en"].includes(searchParams.get("locale") ?? "")
    ? searchParams.get("locale")
    : "vi") as LocaleCode;
  const q = rawQ.trim();
  if (q.length < 1) {
    return NextResponse.json({ products: [], categories: [], brands: [] });
  }

  const supabase = createClient();

  const ids = await fetchSearchProductIds(supabase, q, 12);
  let products: { type: "product"; id: number; slug: string; label: string }[] = [];

  if (ids.length > 0) {
    const { data: prodRows } = await supabase
      .from("products")
      .select("id, slug, name_vi, name_ko, name_en")
      .in("id", ids)
      .eq("status", "active");

    const order = new Map(ids.map((id, i) => [id, i]));
    const rows = ((prodRows as { id: number; slug: string; name_vi: string; name_ko: string; name_en: string }[] | null) ??
      []
    ).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    products = rows.slice(0, 8).map((r) => ({
      type: "product" as const,
      id: r.id,
      slug: r.slug,
      label: pickName(locale, r),
    }));
  }

  const qLower = q.toLowerCase();
  const { data: catRaw } = await supabase
    .from("categories")
    .select("id, slug, name_vi, name_ko, name_en, search_keywords")
    .eq("is_active", true)
    .limit(600);

  const categories = (catRaw as {
    id: number;
    slug: string;
    name_vi: string;
    name_ko: string;
    name_en: string;
    search_keywords: string[] | null;
  }[] | null) ?? [];

  const matchedCats = categories
    .filter((c) => {
      const blob = [c.name_vi, c.name_ko, c.name_en, c.slug, ...(c.search_keywords ?? [])]
        .join(" ")
        .toLowerCase();
      return blob.includes(qLower);
    })
    .slice(0, 6)
    .map((c) => ({
      type: "category" as const,
      id: c.id,
      slug: c.slug,
      label: pickName(locale, c),
    }));

  const safeBrand = `%${q.replace(/[%_]/g, " ").trim()}%`;
  const { data: brandRaw } = await supabase
    .from("brands")
    .select("id, slug, name")
    .eq("is_active", true)
    .ilike("name", safeBrand)
    .limit(6);

  const brands = ((brandRaw as { id: number; slug: string; name: string }[] | null) ?? []).map((b) => ({
    type: "brand" as const,
    id: b.id,
    slug: b.slug,
    label: b.name,
  }));

  return NextResponse.json({ products, categories: matchedCats, brands });
}
