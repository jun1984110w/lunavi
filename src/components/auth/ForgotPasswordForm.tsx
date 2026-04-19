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

    // 클라이언트 전용 컴포넌트의 submit이므로 origin은 항상 현재 사이트입니다.
    // Supabase 대시보드 Authentication → URL Configuration → Redirect URLs에
    // 아래 redirectTo와 동일한 전체 URL(쿼리 포함)을 반드시 등록해야 메일 링크가 잘리지 않습니다.
    const redirectTo = `${window.location.origin}/auth/callback?next=/${locale}/reset-password`;

    // 비밀번호 재설정 메일을 보내고, 링크 클릭 시 /auth/callback에서 세션 교환 후 next로 이동시킵니다.
    // 재설정 메일 API 호출에 사용된 파라미터를 함께 기록해 디버깅을 쉽게 합니다.
    console.info("[Auth][ResetPassword] resetPasswordForEmail request", {
      email: email.trim(),
      redirectTo,
    });

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error) {
      // 재설정 메일 실패 원인을 빠르게 확인할 수 있도록 Supabase 에러 정보를 자세히 기록합니다.
      const detail = error as { message?: string; status?: number };
      console.error("[Auth][ResetPassword] resetPasswordForEmail error", {
        message: detail.message,
        status: detail.status,
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
