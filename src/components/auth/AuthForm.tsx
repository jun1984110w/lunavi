"use client";

import { sanitizeAuthRedirectPath, stripLeadingLocaleFromPath } from "@/lib/auth/safeRedirect";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

type Mode = "login" | "signup";

type AuthLabels = {
  loginTitle: string;
  signupTitle: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  loginButton: string;
  signupButton: string;
  googleButton: string;
  facebookButton: string;
  forgotPassword: string;
  goToLogin: string;
  goToSignup: string;
  divider: string;
  unknownError: string;
  invalidCredentials: string;
  tooManyRequests: string;
  duplicateEmail: string;
  emailNotConfirmed: string;
  passwordTooWeak: string;
  emailInvalid: string;
  verifyEmailHint: string;
  passwordResetDoneHint: string;
};

type Props = {
  mode: Mode;
  locale: string;
  labels: AuthLabels;
};

/**
 * Supabase Auth 에러 문자열·코드를 next-intl 문구로 바꿉니다.
 * 로그인 실패(이메일 없음/비밀번호 틀림)는 API상 동일 코드이므로 두 문구를 함께 안내합니다.
 */
function normalizeAuthError(message: string, labels: AuthLabels): string {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return labels.invalidCredentials;
  }
  if (lower.includes("email not confirmed")) return labels.emailNotConfirmed;
  if (lower.includes("email rate limit exceeded")) return labels.tooManyRequests;
  if (
    lower.includes("user already registered") ||
    lower.includes("already been registered") ||
    lower.includes("already registered")
  ) {
    return labels.duplicateEmail;
  }
  if (lower.includes("password") && (lower.includes("least") || lower.includes("weak"))) {
    return labels.passwordTooWeak;
  }
  if (lower.includes("invalid email") || lower.includes("unable to validate email")) {
    return labels.emailInvalid;
  }

  return message || labels.unknownError;
}

function AuthFormInner({ mode, locale, labels }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  const title = mode === "login" ? labels.loginTitle : labels.signupTitle;
  const submitLabel = mode === "login" ? labels.loginButton : labels.signupButton;

  // 로그인 페이지에서 회원가입·비밀번호 재설정 직후 안내(hint 쿼리)를 표시합니다.
  useEffect(() => {
    if (mode !== "login") return;
    const hint = searchParams.get("hint");
    if (hint === "signup-pending") {
      setInfoMessage(labels.verifyEmailHint);
    } else if (hint === "password-reset") {
      setInfoMessage(labels.passwordResetDoneHint);
    }
  }, [mode, searchParams, labels.verifyEmailHint, labels.passwordResetDoneHint]);

  const callbackUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/auth/callback?next=/${locale}`;
  }, [locale]);

  const handleOAuth = async (provider: "google" | "facebook") => {
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl,
      },
    });

    if (error) {
      setErrorMessage(normalizeAuthError(error.message, labels));
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    if (mode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const detail = error as { message?: string; status?: number };
        console.error("[Auth][Login] signInWithPassword error", {
          message: detail.message,
          status: detail.status,
        });
        setErrorMessage(normalizeAuthError(error.message, labels));
        setLoading(false);
        return;
      }

      // 이메일 인증이 완료되지 않은 계정은 로그인 후에도 접근을 제한합니다.
      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        setErrorMessage(labels.emailNotConfirmed);
        setLoading(false);
        return;
      }

      const nextAbs = sanitizeAuthRedirectPath(searchParams.get("next"));
      const path = nextAbs ? stripLeadingLocaleFromPath(nextAbs) : "/";
      router.push(path);
      router.refresh();
      return;
    }

    // 이메일 인증 링크가 우리 도메인으로 돌아오도록 콜백 URL을 지정합니다(profiles는 DB 트리거로 생성).
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=/${locale}`;

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: name,
          phone,
        },
      },
    });

    if (error) {
      const detail = error as { message?: string; status?: number };
      console.error("[Auth][Signup] signUp error", {
        message: detail.message,
        status: detail.status,
      });
      setErrorMessage(normalizeAuthError(error.message, labels));
      setLoading(false);
      return;
    }

    // Supabase 설정에 따라 중복 이메일도 에러 없이 반환될 수 있어 identities 길이로 중복을 판별합니다.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setErrorMessage(labels.duplicateEmail);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }

    // 이메일 확인이 필요한 경우 로그인 페이지로 보내 인증 안내를 한곳에서 보이게 합니다.
    router.replace("/login?hint=signup-pending");
    router.refresh();
    setLoading(false);
  };

  return (
    <section className="mx-auto w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
      <h1 className="text-xl font-bold">{title}</h1>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        {mode === "signup" ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{labels.name}</span>
            <input
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-1 block text-sm font-medium">{labels.email}</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">{labels.password}</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </label>

        {mode === "signup" ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{labels.phone}</span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </form>

      <div className="my-4 flex items-center gap-2 text-xs text-neutral-500">
        <span className="h-px flex-1 bg-neutral-200" />
        <span>{labels.divider}</span>
        <span className="h-px flex-1 bg-neutral-200" />
      </div>

      <div className="space-y-2">
        <button
          type="button"
          disabled={loading}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-60"
          onClick={() => handleOAuth("google")}
        >
          {labels.googleButton}
        </button>
        <button
          type="button"
          disabled={loading}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-60"
          onClick={() => handleOAuth("facebook")}
        >
          {labels.facebookButton}
        </button>
      </div>

      <div className="mt-4 space-y-1 text-sm">
        <Link href="/forgot-password" className="text-neutral-600 underline">
          {labels.forgotPassword}
        </Link>
        <div>
          {mode === "login" ? (
            <Link href="/signup" className="text-brand underline">
              {labels.goToSignup}
            </Link>
          ) : (
            <Link href="/login" className="text-brand underline">
              {labels.goToLogin}
            </Link>
          )}
        </div>
      </div>

      {errorMessage ? (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
      ) : null}
      {infoMessage ? (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{infoMessage}</p>
      ) : null}
    </section>
  );
}

/** `useSearchParams` 때문에 Suspense 경계로 감쌉니다. */
export function AuthForm(props: Props) {
  return (
    <Suspense
      fallback={
        <section className="mx-auto h-64 w-full max-w-md animate-pulse rounded-xl border border-neutral-200 bg-neutral-50 p-5 sm:p-6" />
      }
    >
      <AuthFormInner {...props} />
    </Suspense>
  );
}
