"use client";

import { createClient } from "@/lib/supabase/client";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type Props = {
  /** `md` 이상에서만 보이는 가로 링크용 */
  className?: string;
  /** 모바일 드로어 안 세로 링크용 */
  variant?: "desktop" | "drawer";
};

/**
 * 헤더에서 로그인 여부에 따라 로그인/회원가입 링크 또는 로그아웃 버튼을 표시합니다.
 * `onAuthStateChange`로 세션 변화를 즉시 반영합니다.
 */
export function AuthHeaderActions({ className = "", variant = "desktop" }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const t = useTranslations("common");
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) {
        setSignedIn(Boolean(data.session));
        setReady(true);
      }
    };

    void sync();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) {
        setSignedIn(Boolean(session));
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const isDrawer = variant === "drawer";

  if (!ready) {
    return (
      <div
        className={
          isDrawer
            ? "h-10 w-full animate-pulse rounded bg-neutral-100"
            : `hidden h-9 w-24 animate-pulse rounded bg-neutral-100 sm:block ${className}`
        }
        aria-hidden
      />
    );
  }

  if (!signedIn) {
    if (isDrawer) {
      return (
        <>
          <Link
            href="/login"
            className="block py-2 text-sm font-medium"
          >
            {t("login")}
          </Link>
          <Link
            href="/signup"
            className="block py-2 text-sm font-medium text-brand"
          >
            {t("signup")}
          </Link>
        </>
      );
    }

    return (
      <div className={`hidden items-center gap-2 sm:flex ${className}`}>
        <Link
          href="/login"
          className="text-sm font-medium text-ink hover:text-brand"
        >
          {t("login")}
        </Link>
        <Link
          href="/signup"
          className="rounded-md border border-brand px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand/5"
        >
          {t("signup")}
        </Link>
      </div>
    );
  }

  if (isDrawer) {
    return (
      <button
        type="button"
        className="block w-full py-2 text-left text-sm font-medium text-red-600"
        onClick={() => void handleLogout()}
      >
        {t("logout")}
      </button>
    );
  }

  return (
    <div className={`hidden items-center gap-2 sm:flex ${className}`}>
      <button
        type="button"
        className="text-sm font-medium text-ink hover:text-brand"
        onClick={() => void handleLogout()}
      >
        {t("logout")}
      </button>
    </div>
  );
}
