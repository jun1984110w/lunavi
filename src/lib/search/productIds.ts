import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 검색어에 맞는 활성 상품 id 목록을 가져옵니다.
 * DB에 `search_product_ids` RPC가 없으면 ilike 기반으로 폴백합니다.
 */
export async function fetchSearchProductIds(
  supabase: SupabaseClient,
  rawQuery: string,
  limit = 120,
): Promise<number[]> {
  const q = rawQuery.trim().slice(0, 100);
  if (!q) return [];

  const { data: rpcData, error: rpcError } = await supabase.rpc("search_product_ids", {
    p_q: q,
    p_limit: limit,
  });

  if (!rpcError && rpcData && Array.isArray(rpcData)) {
    const rows = rpcData as { id?: number }[] | number[];
    if (rows.length > 0 && typeof rows[0] === "object" && rows[0] !== null && "id" in rows[0]) {
      return (rows as { id: number }[]).map((r) => r.id).filter((id) => Number.isFinite(id));
    }
    if (rows.length > 0 && typeof rows[0] === "number") {
      return (rows as number[]).filter((id) => Number.isFinite(id));
    }
  }

  const safe = q.replace(/[%_]/g, " ").trim();
  if (!safe) return [];
  const pat = `%${safe}%`;
  const { data: fb, error: fbErr } = await supabase
    .from("products")
    .select("id")
    .eq("status", "active")
    .or(`name_vi.ilike.${pat},name_ko.ilike.${pat},name_en.ilike.${pat},slug.ilike.${pat}`)
    .order("sales_count", { ascending: false })
    .limit(limit);

  if (fbErr || !fb) return [];
  return (fb as { id: number }[]).map((r) => r.id);
}
