"use client";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { MdClose, MdMenu } from "react-icons/md";

type MenuItem = {
  key: string;
  href: string;
  label: string;
};

type Props = {
  userName: string;
  menuItems: MenuItem[];
  logoutLabel: string;
  children: React.ReactNode;
};

export function AdminShell({ userName, menuItems, logoutLabel, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    // 로그아웃 후 locale 루트로 이동시켜 세션을 정리합니다.
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-3 sm:px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 lg:hidden"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="관리자 메뉴 토글"
          >
            {mobileOpen ? <MdClose className="h-5 w-5" /> : <MdMenu className="h-5 w-5" />}
          </button>
          <span className="text-sm font-semibold text-ink sm:text-base">{userName}</span>
        </div>
        <button
          type="button"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100"
          onClick={handleLogout}
        >
          {logoutLabel}
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px]">
        <aside
          className={`fixed inset-y-14 left-0 z-30 w-64 border-r border-neutral-200 bg-white p-3 transition-transform lg:static lg:inset-auto lg:h-[calc(100vh-3.5rem)] lg:translate-x-0 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`block rounded-md px-3 py-2 text-sm font-medium ${
                    active ? "bg-brand text-white" : "text-ink hover:bg-neutral-100"
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {mobileOpen ? (
          <button
            type="button"
            className="fixed inset-0 top-14 z-20 bg-black/30 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="사이드바 닫기"
          />
        ) : null}

        <section className="min-w-0 flex-1 p-3 sm:p-4 lg:p-6">{children}</section>
      </div>
    </div>
  );
}
