"use client";

import { createClient } from "@/lib/supabase/client";
import { routing } from "@/i18n/routing";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

/**
 * `next` 쿼리가 외부 사이트로 열리지 않도록, 동일 출처 내 상대 경로만 허용합니다.
 * 지원 로케일 접두사(`/ko/...` 등)가 아니면 기본 로케일로 보냅니다.
 */
function sanitizeNextPath(raw: string | null): string {
  const fallback = `/${routing.defaultLocale}`;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return fallback;
  }
  const segments = raw.split("/").filter(Boolean);
  const first = segments[0];
  if (
    !first ||
    !routing.locales.includes(first as (typeof routing.locales)[number])
  ) {
    return fallback;
  }
  return raw;
}

/**
 * URL의 `code`(PKCE) 또는 해시(`#access_token=...`)로 세션을 맞춘 뒤 `next`로 이동합니다.
 * 비밀번호 재설정 메일은 환경에 따라 쿼리 또는 해시로 토큰이 올 수 있습니다.
 */
function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("인증 정보를 확인하는 중입니다.");

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    const type = searchParams.get("type");
    const rawNext = searchParams.get("next");
    const defaultRecoveryPath = `/${routing.defaultLocale}/reset-password`;
    const nextPath = sanitizeNextPath(
      rawNext ??
        (type === "recovery" ? defaultRecoveryPath : `/${routing.defaultLocale}`),
    );

    /** 이메일 링크에 `#access_token` 형태로 토큰이 붙은 경우 파싱합니다. */
    const readHashTokens = () => {
      if (typeof window === "undefined") return null;
      const raw = window.location.hash?.replace(/^#/, "");
      if (!raw) return null;
      const params = new URLSearchParams(raw);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token && refresh_token) {
        return { access_token, refresh_token };
      }
      return null;
    };

    async function run() {
      const code = searchParams.get("code");

      try {
        if (code) {
          // React Strict Mode(개발)에서 이펙트가 두 번 돌아가도 code 교환이 한 번만 실행되도록 합니다.
          const dedupeKey = `lunavi_auth_code_${code}`;
          if (typeof window !== "undefined" && sessionStorage.getItem(dedupeKey)) {
            if (!cancelled) router.replace(nextPath);
            return;
          }

          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("[Auth][Callback] exchangeCodeForSession 실패", {
              message: error.message,
              status: error.status,
            });
            if (!cancelled) {
              setMessage(error.message || "인증 처리에 실패했습니다.");
            }
            return;
          }

          if (typeof window !== "undefined") {
            sessionStorage.setItem(dedupeKey, "1");
          }
          if (!cancelled) router.replace(nextPath);
          return;
        }

        const tokens = readHashTokens();
        if (tokens) {
          const { error } = await supabase.auth.setSession(tokens);
          if (error) {
            console.error("[Auth][Callback] setSession(해시) 실패", {
              message: error.message,
              status: error.status,
            });
            if (!cancelled) {
              setMessage(error.message || "인증 처리에 실패했습니다.");
            }
            return;
          }

          if (typeof window !== "undefined") {
            window.history.replaceState(
              null,
              "",
              `${window.location.pathname}${window.location.search}`,
            );
          }
          if (!cancelled) router.replace(nextPath);
          return;
        }

        if (!cancelled) {
          setMessage("유효한 인증 정보가 없습니다. 메일의 링크를 다시 확인해 주세요.");
        }
      } catch (e) {
        console.error("[Auth][Callback] 예외", e);
        if (!cancelled) {
          setMessage("처리 중 오류가 발생했습니다.");
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-4">
      <p className="text-center text-sm text-neutral-700">{message}</p>
    </main>
  );
}

/**
 * OAuth/이메일 콜백 URL용 페이지입니다. `useSearchParams`를 위해 Suspense로 감쌉니다.
 */
export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[50vh] items-center justify-center px-4">
          <p className="text-sm text-neutral-600">인증 정보를 불러오는 중입니다...</p>
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
