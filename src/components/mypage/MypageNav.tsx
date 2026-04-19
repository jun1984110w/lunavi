"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

/**
 * 마이페이지 좌측(또는 상단) 빠른 이동 메뉴입니다.
 */
export function MypageNav() {
  const t = useTranslations("mypage.nav");
  const pathname = usePathname();

  const links = [
    { href: "/mypage", label: t("home") },
    { href: "/mypage/orders", label: t("orders") },
    { href: "/mypage/addresses", label: t("addresses") },
    { href: "/mypage/wishlist", label: t("wishlist") },
    { href: "/mypage/profile", label: t("profile") },
  ];

  const active = (href: string) =>
    href === "/mypage" ? pathname === "/mypage" || pathname === "/mypage/" : pathname.startsWith(href);

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-neutral-200 pb-4 md:flex-col md:border-b-0 md:border-r md:pr-6 md:pb-0"
      aria-label={t("aria")}
    >
      {links.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`rounded-md px-3 py-2 text-sm font-medium ${
            active(item.href) ? "bg-brand text-white" : "bg-neutral-100 text-ink hover:bg-neutral-200"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
