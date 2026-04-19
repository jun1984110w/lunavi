import { createClient } from "@/lib/supabase/client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** 장바구니 한 줄(상품 + 옵션 + 수량) */
export type CartLine = {
  /** 클라이언트 전용 줄 키 */
  lineId: string;
  productId: number;
  productSlug: string;
  name: string;
  imageUrl: string | null;
  optionId: number | null;
  optionLabel: string;
  unitPrice: number;
  quantity: number;
};

type CartState = {
  items: CartLine[];
  selectedLineIds: Record<string, boolean>;
  addLine: (line: Omit<CartLine, "quantity" | "lineId"> & { quantity: number }) => void;
  removeLine: (lineId: string) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  clearAll: () => void;
  removeSelectedLines: () => void;
  setAllSelected: (selected: boolean) => void;
  toggleLineSelected: (lineId: string) => void;
  getTotalCount: () => number;
  getSelectedSubtotal: () => number;
  /** 로그인 시 로컬 장바구니와 서버 carts를 병합한 뒤 서버 기준으로 다시 채웁니다. */
  syncWithSupabase: (userId: string, locale: "vi" | "ko" | "en") => Promise<void>;
  resetSelection: () => void;
};

const STORAGE_KEY = "lunavi-cart";

/** 동일 상품·옵션 조합에 대한 안정적인 줄 id */
export function buildLineId(productId: number, optionId: number | null, optionLabel: string) {
  const opt = optionId ?? "none";
  const label = optionLabel.trim() || "-";
  return `${productId}__${opt}__${label}`;
}

function pickName(
  locale: "vi" | "ko" | "en",
  row: { name_vi: string; name_ko: string; name_en: string },
) {
  if (locale === "ko") return row.name_ko;
  if (locale === "en") return row.name_en;
  return row.name_vi;
}

/** 동시에 두 번 동기화되지 않도록 직렬화합니다. */
let syncChain: Promise<void> = Promise.resolve();

type ServerCartRow = {
  product_id: number;
  option_id: number | null;
  option_label: string;
  quantity: number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      selectedLineIds: {},

      addLine: (payload) => {
        const lineId = buildLineId(payload.productId, payload.optionId, payload.optionLabel);
        set((state) => {
          const idx = state.items.findIndex((i) => i.lineId === lineId);
          if (idx >= 0) {
            const next = [...state.items];
            next[idx] = {
              ...next[idx],
              quantity: next[idx].quantity + payload.quantity,
            };
            return { items: next };
          }
          return {
            items: [
              ...state.items,
              {
                lineId,
                productId: payload.productId,
                productSlug: payload.productSlug,
                name: payload.name,
                imageUrl: payload.imageUrl,
                optionId: payload.optionId,
                optionLabel: payload.optionLabel,
                unitPrice: payload.unitPrice,
                quantity: payload.quantity,
              },
            ],
            selectedLineIds: { ...state.selectedLineIds, [lineId]: true },
          };
        });
      },

      removeLine: (lineId) => {
        set((state) => {
          const nextSel = { ...state.selectedLineIds };
          delete nextSel[lineId];
          return {
            items: state.items.filter((i) => i.lineId !== lineId),
            selectedLineIds: nextSel,
          };
        });
      },

      setQuantity: (lineId, quantity) => {
        const q = Math.max(1, Math.floor(quantity));
        set((state) => ({
          items: state.items.map((i) => (i.lineId === lineId ? { ...i, quantity: q } : i)),
        }));
      },

      clearAll: () => set({ items: [], selectedLineIds: {} }),

      removeSelectedLines: () => {
        set((state) => {
          const keep = state.items.filter((i) => !state.selectedLineIds[i.lineId]);
          const nextSel: Record<string, boolean> = {};
          keep.forEach((i) => {
            nextSel[i.lineId] = true;
          });
          return { items: keep, selectedLineIds: nextSel };
        });
      },

      setAllSelected: (selected) => {
        set((state) => {
          const next: Record<string, boolean> = {};
          state.items.forEach((i) => {
            next[i.lineId] = selected;
          });
          return { selectedLineIds: next };
        });
      },

      toggleLineSelected: (lineId) => {
        set((state) => ({
          selectedLineIds: {
            ...state.selectedLineIds,
            [lineId]: !state.selectedLineIds[lineId],
          },
        }));
      },

      getTotalCount: () => get().items.reduce((s, i) => s + i.quantity, 0),

      getSelectedSubtotal: () => {
        const { items, selectedLineIds } = get();
        return items.reduce((sum, i) => {
          if (!selectedLineIds[i.lineId]) return sum;
          return sum + i.unitPrice * i.quantity;
        }, 0);
      },

      resetSelection: () => set({ selectedLineIds: {} }),

      syncWithSupabase: async (userId, locale) => {
        syncChain = syncChain.then(async () => {
          const supabase = createClient();
          const local = get().items;

          const { data: serverRows, error: fetchErr } = await supabase
            .from("carts")
            .select("product_id, option_id, option_label, quantity")
            .eq("user_id", userId);

          if (fetchErr) {
            console.error("[cartStore] 서버 장바구니 조회 실패", fetchErr);
            return;
          }

          const merged = new Map<string, ServerCartRow>();
          const mergeKey = (p: number, label: string) => `${p}__${label.trim()}`;

          for (const r of (serverRows as ServerCartRow[] | null) ?? []) {
            const label = r.option_label ?? "";
            merged.set(mergeKey(r.product_id, label), {
              product_id: r.product_id,
              option_id: r.option_id,
              option_label: label,
              quantity: r.quantity,
            });
          }
          for (const l of local) {
            const k = mergeKey(l.productId, l.optionLabel);
            const prev = merged.get(k)?.quantity ?? 0;
            merged.set(k, {
              product_id: l.productId,
              option_id: l.optionId,
              option_label: l.optionLabel.trim(),
              quantity: prev + l.quantity,
            });
          }

          const { error: delErr } = await supabase.from("carts").delete().eq("user_id", userId);
          if (delErr) {
            console.error("[cartStore] 서버 장바구니 비우기 실패", delErr);
            return;
          }

          const inserts = Array.from(merged.values()).map((m) => ({
            user_id: userId,
            product_id: m.product_id,
            option_id: m.option_id,
            option_label: m.option_label,
            quantity: m.quantity,
          }));
          if (inserts.length > 0) {
            const { error: insErr } = await supabase.from("carts").insert(inserts);
            if (insErr) {
              console.error("[cartStore] 서버 장바구니 저장 실패", insErr);
              return;
            }
          }

          const { data: fullRows, error: fullErr } = await supabase
            .from("carts")
            .select(
              `
              product_id,
              option_id,
              option_label,
              quantity,
              products (
                slug,
                name_vi,
                name_ko,
                name_en,
                price_retail,
                product_images ( image_url, is_main, sort_order )
              ),
              product_options ( option_name, option_value )
            `,
            )
            .eq("user_id", userId);

          if (fullErr || !fullRows) {
            console.error("[cartStore] 병합 후 조회 실패", fullErr);
            return;
          }

          const nextItems: CartLine[] = [];
          for (const r of fullRows as unknown as Array<{
            product_id: number;
            option_id: number | null;
            option_label: string | null;
            quantity: number;
            products: {
              slug: string;
              name_vi: string;
              name_ko: string;
              name_en: string;
              price_retail: number;
              product_images: { image_url: string; is_main: boolean; sort_order: number }[] | null;
            } | null;
            product_options: { option_name: string; option_value: string } | null;
          }>) {
            const p = r.products;
            if (!p) continue;
            const imgs = [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
            const img = imgs.find((x) => x.is_main)?.image_url ?? imgs[0]?.image_url ?? null;
            const fromDb = (r.option_label ?? "").trim();
            const fromJoin = r.product_options
              ? `${r.product_options.option_name}: ${r.product_options.option_value}`
              : "";
            const optLabel = fromDb || fromJoin;
            nextItems.push({
              lineId: buildLineId(r.product_id, r.option_id, optLabel),
              productId: r.product_id,
              productSlug: p.slug,
              name: pickName(locale, p),
              imageUrl: img,
              optionId: r.option_id,
              optionLabel: optLabel,
              unitPrice: p.price_retail,
              quantity: r.quantity,
            });
          }

          const sel: Record<string, boolean> = {};
          nextItems.forEach((i) => {
            sel[i.lineId] = true;
          });
          set({ items: nextItems, selectedLineIds: sel });
        });
        await syncChain;
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        selectedLineIds: state.selectedLineIds,
      }),
    },
  ),
);
