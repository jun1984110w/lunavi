"use client";

import { useTranslations } from "next-intl";
import {
  MdGridView,
  MdHome,
  MdPerson,
  MdSearch,
  MdShoppingCart,
} from "react-icons/md";
import { useCartStore } from "@/stores/cartStore";
import { Link, usePathname } from "@/i18n/navigation";

/**
 * 768px 미만에서만 보이는 하단 탭 바입니다. (md 이상에서는 숨김)
 */

const tabClass =
  "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-neutral-600 transition hover:text-brand";

const activeClass = "text-brand";

export function MobileBottomNav() {
  const t = useTranslations("nav");
  const tLayout = useTranslations("layout");
  const pathname = usePathname();
  const cartItemCount = useCartStore((s) =>
    s.items.reduce((acc, line) => acc + line.quantity, 0),
  );

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" || pathname === "" : pathname.startsWith(path);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-neutral-200 bg-surface/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur md:hidden"
      aria-label={tLayout("mobileNavAria")}
    >
      <ul className="mx-auto flex max-w-lg">
        <li className="flex flex-1">
          <Link href="/" className={`${tabClass} ${isActive("/") ? activeClass : ""}`}>
            <MdHome className="h-6 w-6" aria-hidden />
            <span>{t("home")}</span>
          </Link>
        </li>
        <li className="flex flex-1">
          <Link
            href="/categories"
            className={`${tabClass} ${isActive("/categories") ? activeClass : ""}`}
          >
            <MdGridView className="h-6 w-6" aria-hidden />
            <span>{t("category")}</span>
          </Link>
        </li>
        <li className="flex flex-1">
          <Link
            href="/search"
            className={`${tabClass} ${isActive("/search") ? activeClass : ""}`}
          >
            <MdSearch className="h-6 w-6" aria-hidden />
            <span>{t("search")}</span>
          </Link>
        </li>
        <li className="flex flex-1">
          <Link
            href="/cart"
            className={`${tabClass} relative ${isActive("/cart") ? activeClass : ""}`}
          >
            <span className="relative inline-flex">
              <MdShoppingCart className="h-6 w-6" aria-hidden />
              {cartItemCount > 0 ? (
                <span className="absolute -right-1.5 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-brand px-0.5 text-[9px] font-bold leading-none text-white">
                  {cartItemCount > 99 ? "99+" : cartItemCount}
                </span>
              ) : null}
            </span>
            <span>{t("cart")}</span>
          </Link>
        </li>
        <li className="flex flex-1">
          <Link
            href="/mypage"
            className={`${tabClass} ${isActive("/mypage") ? activeClass : ""}`}
          >
            <MdPerson className="h-6 w-6" aria-hidden />
            <span>{t("mypage")}</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
