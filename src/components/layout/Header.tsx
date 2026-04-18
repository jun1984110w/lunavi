"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { MdClose, MdMenu, MdShoppingCart } from "react-icons/md";
import { Link, usePathname } from "@/i18n/navigation";

/**
 * 쿠팡 스타일 상단·카테고리 헤더입니다.
 * 대분류/중분류/소분류 트리는 추후 카테고리 관리 API와 연동합니다.
 */

// TODO: site_settings 테이블에서 동적으로 가져오기 (로고 URL·표시 사이트명). 현재는 layout.siteName 번역 사용.

/** 메시지 키 `layout.cat.*`와 동일한 구조 — TODO: 카테고리 관리 API에서 트리로 대체 */
const CATEGORY_TREE = [
  {
    megaId: "digital" as const,
    mids: [
      { midId: "computer" as const, smallIds: ["laptop", "monitor"] as const },
      { midId: "mobile" as const, smallIds: ["phone", "wearable"] as const },
    ],
  },
  {
    megaId: "fashion" as const,
    mids: [
      { midId: "men" as const, smallIds: ["top", "bottom"] as const },
      { midId: "women" as const, smallIds: ["top", "dress"] as const },
    ],
  },
  {
    megaId: "living" as const,
    mids: [
      { midId: "furniture" as const, smallIds: ["sofa", "bed"] as const },
      { midId: "kitchen" as const, smallIds: ["tool", "storage"] as const },
    ],
  },
];

type MegaId = (typeof CATEGORY_TREE)[number]["megaId"];

export function Header() {
  const tLayout = useTranslations("layout");
  const tCat = useTranslations("layout.cat");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMega, setOpenMega] = useState<MegaId | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const megaIds = useMemo(
    () => CATEGORY_TREE.map((m) => m.megaId),
    [],
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, locale]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleCloseMega = () => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpenMega(null), 120);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-surface text-ink">
      {/* 상단 바: 로고 · 검색 · 유틸 */}
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 lg:gap-4 lg:px-6">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink md:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-drawer"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? (
              <MdClose className="h-6 w-6" aria-hidden />
            ) : (
              <MdMenu className="h-6 w-6" aria-hidden />
            )}
            <span className="sr-only">
              {mobileOpen ? tLayout("closeMenu") : tLayout("openMenu")}
            </span>
          </button>

          <Link
            href="/"
            className="flex shrink-0 items-center gap-1.5 font-bold tracking-tight text-brand"
          >
            <span className="text-lg sm:text-xl">{tLayout("siteName")}</span>
          </Link>
        </div>

        <form
          action={`/${locale}/search`}
          method="get"
          className="mx-auto hidden min-w-0 max-w-xl flex-1 sm:flex"
          role="search"
        >
          <div className="flex w-full overflow-hidden rounded-md border-2 border-brand shadow-sm">
            <input
              type="search"
              name="q"
              placeholder={tLayout("searchPlaceholder")}
              className="min-w-0 flex-1 border-0 px-3 py-2 text-sm text-ink outline-none placeholder:text-neutral-400"
              aria-label={tCommon("search")}
            />
            <button
              type="submit"
              className="bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90"
            >
              {tCommon("search")}
            </button>
          </div>
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <div className="hidden items-center gap-1 rounded-md border border-neutral-200 p-0.5 sm:flex">
            {(["vi", "ko", "en"] as const).map((loc) => (
              <Link
                key={loc}
                href={pathname}
                locale={loc}
                className={`rounded px-2 py-1 text-xs font-semibold ${
                  locale === loc
                    ? "bg-brand text-white"
                    : "text-ink hover:bg-neutral-100"
                }`}
              >
                {loc === "vi"
                  ? tLayout("localeVi")
                  : loc === "ko"
                    ? tLayout("localeKo")
                    : tLayout("localeEn")}
              </Link>
            ))}
          </div>

          <Link
            href="/login"
            className="hidden text-sm font-medium text-ink hover:text-brand sm:inline"
          >
            {tCommon("login")}
          </Link>
          <Link
            href="/signup"
            className="hidden rounded-md border border-brand px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand/5 sm:inline"
          >
            {tCommon("signup")}
          </Link>

          <Link
            href="/cart"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-ink hover:bg-neutral-50"
            aria-label={tNav("cart")}
          >
            <MdShoppingCart className="h-6 w-6 text-brand" aria-hidden />
          </Link>
        </div>
      </div>

      {/* 모바일 검색바 */}
      <div className="border-t border-neutral-100 px-3 pb-2 sm:hidden">
        <form action={`/${locale}/search`} method="get" role="search">
          <div className="flex overflow-hidden rounded-md border border-neutral-300">
            <input
              type="search"
              name="q"
              placeholder={tLayout("searchPlaceholder")}
              className="min-w-0 flex-1 border-0 px-3 py-2 text-sm outline-none placeholder:text-neutral-400"
              aria-label={tCommon("search")}
            />
            <button
              type="submit"
              className="bg-brand px-3 py-2 text-sm font-semibold text-white"
            >
              {tCommon("search")}
            </button>
          </div>
        </form>
        <div className="mt-2 flex justify-center gap-1">
          {(["vi", "ko", "en"] as const).map((loc) => (
            <Link
              key={loc}
              href={pathname}
              locale={loc}
              className={`rounded px-2 py-1 text-xs font-semibold ${
                locale === loc
                  ? "bg-brand text-white"
                  : "border border-neutral-200 text-ink"
              }`}
            >
              {loc === "vi"
                ? tLayout("localeVi")
                : loc === "ko"
                  ? tLayout("localeKo")
                  : tLayout("localeEn")}
            </Link>
          ))}
        </div>
      </div>

      {/* 데스크톱: 대분류 + 메가 드롭다운 */}
      <nav
        className="relative hidden border-t border-neutral-100 bg-white md:block"
        aria-label={tLayout("categoryNavAria")}
        onMouseLeave={scheduleCloseMega}
      >
        <div className="mx-auto flex max-w-7xl items-stretch px-4 lg:px-6">
          {megaIds.map((mega) => (
            <div
              key={mega}
              className="relative"
              onMouseEnter={() => {
                clearCloseTimer();
                setOpenMega(mega);
              }}
            >
              <button
                type="button"
                className={`flex h-11 items-center px-3 text-sm font-semibold transition lg:px-4 ${
                  openMega === mega
                    ? "text-brand"
                    : "text-ink hover:text-brand"
                }`}
                aria-expanded={openMega === mega}
              >
                {tCat(`${mega}.title`)}
              </button>
            </div>
          ))}
        </div>

        {openMega && (
          <div
            className="absolute left-0 right-0 top-full border-t border-neutral-200 bg-white shadow-lg"
            onMouseEnter={clearCloseTimer}
          >
            <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:grid-cols-2 lg:grid-cols-3 lg:px-6">
              {CATEGORY_TREE.filter((m) => m.megaId === openMega).flatMap((mega) =>
                mega.mids.map((mid) => (
                  <div key={`${mega.megaId}-${mid.midId}`}>
                    <p className="border-b border-neutral-100 pb-2 text-sm font-bold text-brand">
                      {tCat(`${mega.megaId}.${mid.midId}.title`)}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {mid.smallIds.map((sid) => (
                        <li key={sid}>
                          <Link
                            href={`/categories/${mega.megaId}/${mid.midId}/${sid}`}
                            className="text-sm text-ink hover:text-brand"
                          >
                            {tCat(`${mega.megaId}.${mid.midId}.${sid}`)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )),
              )}
            </div>
          </div>
        )}
      </nav>

      {/* 모바일 풀스크린 드로어: 카테고리 아코디언 */}
      {mobileOpen && (
        <div
          id="mobile-drawer"
          className="fixed inset-0 z-50 bg-black/40 md:hidden"
          role="presentation"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute left-0 top-0 flex h-full w-[min(100%,20rem)] flex-col bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="font-semibold text-brand">{tLayout("siteName")}</span>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md"
                onClick={() => setMobileOpen(false)}
                aria-label={tLayout("closeMenu")}
              >
                <MdClose className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {CATEGORY_TREE.map((mega) => (
                <details key={mega.megaId} className="group border-b border-neutral-100">
                  <summary className="cursor-pointer list-none py-3 pl-1 text-sm font-bold text-ink marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center justify-between">
                      {tCat(`${mega.megaId}.title`)}
                      <span className="text-neutral-400 group-open:rotate-180">▼</span>
                    </span>
                  </summary>
                  <div className="pb-2 pl-2">
                    {mega.mids.map((mid) => (
                      <div key={mid.midId} className="mb-2">
                        <p className="text-xs font-semibold text-brand">
                          {tCat(`${mega.megaId}.${mid.midId}.title`)}
                        </p>
                        <ul className="mt-1 space-y-1">
                          {mid.smallIds.map((sid) => (
                            <li key={sid}>
                              <Link
                                href={`/categories/${mega.megaId}/${mid.midId}/${sid}`}
                                className="text-sm text-ink hover:text-brand"
                                onClick={() => setMobileOpen(false)}
                              >
                                {tCat(`${mega.megaId}.${mid.midId}.${sid}`)}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
            <div className="border-t p-3">
              <Link
                href="/login"
                className="block py-2 text-sm font-medium"
                onClick={() => setMobileOpen(false)}
              >
                {tCommon("login")}
              </Link>
              <Link
                href="/signup"
                className="block py-2 text-sm font-medium text-brand"
                onClick={() => setMobileOpen(false)}
              >
                {tCommon("signup")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
