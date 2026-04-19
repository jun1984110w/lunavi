"use client";

import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

type Props = {
  locale: string;
  labels: {
    title: string;
    description: string;
    email: string;
    submit: string;
    backToLogin: string;
    success: string;
    unknownError: string;
  };
};

/**
 * 비밀번호 재설정 메일 발송 폼입니다.
 * 메일의 링크는 `/auth/callback`에서 code 교환 후 `next` 경로로 이동합니다.
 */
export function ForgotPasswordForm({ locale, labels }: Props) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/${locale}/reset-password`,
    });

    if (error) {
      console.error("[Auth][ForgotPassword] resetPasswordForEmail", {
        message: error.message,
        status: error.status,
      });
      setErrorMessage(error.message || labels.unknownError);
      setLoading(false);
      return;
    }

    setSuccessMessage(labels.success);
    setLoading(false);
  };

  return (
    <section className="mx-auto w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
      <h1 className="text-xl font-bold">{labels.title}</h1>
      <p className="mt-2 text-sm text-neutral-600">{labels.description}</p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
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
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {labels.submit}
        </button>
      </form>

      <div className="mt-4 text-sm">
        <Link href="/login" className="text-brand underline">
          {labels.backToLogin}
        </Link>
      </div>

      {errorMessage ? (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}
    </section>
  );
}
