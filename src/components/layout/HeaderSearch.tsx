"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type SuggestProduct = { type: "product"; id: number; slug: string; label: string };
type SuggestCategory = { type: "category"; id: number; slug: string; label: string };
type SuggestBrand = { type: "brand"; id: number; slug: string; label: string };

type SuggestPayload = {
  products: SuggestProduct[];
  categories: SuggestCategory[];
  brands: SuggestBrand[];
};

type Props = {
  /** 데스크톱/모바일 레이아웃용 클래스 */
  className?: string;
};

/**
 * 헤더 검색: 자동완성 드롭다운 + Enter/버튼으로 검색 결과 페이지 이동
 */
export function HeaderSearch({ className }: Props) {
  const locale = useLocale();
  const router = useRouter();
  const tLayout = useTranslations("layout");
  const tCommon = useTranslations("common");
  const tSearch = useTranslations("searchSuggest");

  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggest, setSuggest] = useState<SuggestPayload | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // 바깥 클릭 시 드롭다운을 닫습니다.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setSuggest(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/search-suggest?q=${encodeURIComponent(q)}&locale=${encodeURIComponent(String(locale))}`,
          );
          const json = (await res.json()) as SuggestPayload;
          setSuggest(json);
          setOpen(true);
        } catch {
          setSuggest({ products: [], categories: [], brands: [] });
        } finally {
          setLoading(false);
        }
      })();
    }, 320);
    return () => window.clearTimeout(timer);
  }, [value, locale]);

  const goSearch = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      const qs = trimmed ? `?q=${encodeURIComponent(trimmed)}` : "";
      router.push(`/search${qs}`);
      setOpen(false);
    },
    [router],
  );

  const hasSuggest =
    suggest &&
    (suggest.products.length > 0 || suggest.categories.length > 0 || suggest.brands.length > 0);

  return (
    <div ref={wrapRef} className={className ?? ""}>
      <form
        action={`/${locale}/search`}
        method="get"
        role="search"
        className="w-full"
        onSubmit={() => setOpen(false)}
      >
        <div className="relative flex w-full overflow-hidden rounded-md border-2 border-brand shadow-sm">
          <input
            type="search"
            name="q"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => value.trim().length >= 2 && suggest && setOpen(true)}
            placeholder={tLayout("searchPlaceholder")}
            className="min-w-0 flex-1 border-0 px-3 py-2 text-sm text-ink outline-none placeholder:text-neutral-400"
            role="combobox"
            aria-label={tCommon("search")}
            aria-autocomplete="list"
            aria-controls="header-search-suggest-list"
            aria-expanded={open}
            autoComplete="off"
          />
          <button
            type="submit"
            className="bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90"
          >
            {tCommon("search")}
          </button>

          {open && value.trim().length >= 2 ? (
            <div
              id="header-search-suggest-list"
              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(70vh,22rem)] overflow-y-auto rounded-md border border-neutral-200 bg-white py-2 text-left text-sm shadow-lg"
              role="listbox"
            >
              {loading ? (
                <p className="px-3 py-2 text-neutral-500">{tSearch("loading")}</p>
              ) : hasSuggest ? (
                <>
                  {suggest!.categories.length > 0 ? (
                    <div className="border-b border-neutral-100 pb-2">
                      <p className="px-3 py-1 text-xs font-bold text-neutral-500">{tSearch("sectionCategories")}</p>
                      <ul>
                        {suggest!.categories.map((c) => (
                          <li key={`c-${c.id}`}>
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left hover:bg-neutral-50"
                              onClick={() => router.push(`/category/${c.slug}`)}
                            >
                              {c.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {suggest!.brands.length > 0 ? (
                    <div className="border-b border-neutral-100 pb-2">
                      <p className="px-3 py-1 text-xs font-bold text-neutral-500">{tSearch("sectionBrands")}</p>
                      <ul>
                        {suggest!.brands.map((b) => (
                          <li key={`b-${b.id}`}>
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left hover:bg-neutral-50"
                              onClick={() => router.push(`/brand/${b.slug}`)}
                            >
                              {b.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {suggest!.products.length > 0 ? (
                    <div>
                      <p className="px-3 py-1 text-xs font-bold text-neutral-500">{tSearch("sectionProducts")}</p>
                      <ul>
                        {suggest!.products.map((p) => (
                          <li key={`p-${p.id}`}>
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left hover:bg-neutral-50"
                              onClick={() => router.push(`/product/${p.slug}`)}
                            >
                              {p.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="mt-1 w-full border-t border-neutral-100 px-3 py-2 text-left text-xs font-semibold text-brand hover:bg-neutral-50"
                    onClick={() => goSearch(value)}
                  >
                    {tSearch("seeAllResults")}
                  </button>
                </>
              ) : (
                <p className="px-3 py-2 text-neutral-500">{tSearch("noSuggest")}</p>
              )}
            </div>
          ) : null}
        </div>
      </form>
    </div>
  );
}
