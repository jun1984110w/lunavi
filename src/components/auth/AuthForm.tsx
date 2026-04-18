"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useMemo, useState } from "react";

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
  signupSuccessPending: string;
  unknownError: string;
  invalidCredentials: string;
  tooManyRequests: string;
  duplicateEmail: string;
};

type Props = {
  mode: Mode;
  locale: string;
  labels: AuthLabels;
};

export function AuthForm({ mode, locale, labels }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  const title = mode === "login" ? labels.loginTitle : labels.signupTitle;
  const submitLabel = mode === "login" ? labels.loginButton : labels.signupButton;

  // Supabase 에러를 사용자 친화적인 메시지로 변환합니다.
  const normalizeError = (message: string) => {
    const lower = message.toLowerCase();
    if (lower.includes("invalid login credentials")) return labels.invalidCredentials;
    if (lower.includes("email rate limit exceeded")) return labels.tooManyRequests;
    if (lower.includes("user already registered")) return labels.duplicateEmail;
    return message || labels.unknownError;
  };

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
      setErrorMessage(normalizeError(error.message));
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(normalizeError(error.message));
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone,
        },
      },
    });

    if (error) {
      setErrorMessage(normalizeError(error.message));
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }

    setInfoMessage(labels.signupSuccessPending);
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
