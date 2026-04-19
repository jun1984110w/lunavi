"use client";

import { createClient } from "@/lib/supabase/client";
import { Link, useRouter } from "@/i18n/navigation";
import { useState } from "react";

type Props = {
  labels: {
    title: string;
    password: string;
    confirmPassword: string;
    submit: string;
    success: string;
    mismatch: string;
    unknownError: string;
    goToLogin: string;
  };
};

export function ResetPasswordForm({ labels }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage(labels.mismatch);
      return;
    }

    setLoading(true);
    // recovery 세션 상태에서 사용자 비밀번호를 새 값으로 변경합니다.
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorMessage(error.message || labels.unknownError);
      setLoading(false);
      return;
    }

    // recovery 세션은 로그인 세션과 겹칠 수 있어 비우고 로그인 페이지로 보냅니다.
    await supabase.auth.signOut();
    setSuccessMessage(labels.success);
    setLoading(false);
    router.push("/login?hint=password-reset");
    router.refresh();
  };

  return (
    <section className="mx-auto w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
      <h1 className="text-xl font-bold">{labels.title}</h1>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
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

        <label className="block">
          <span className="mb-1 block text-sm font-medium">{labels.confirmPassword}</span>
          <input
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
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
        <Link href="/login?hint=password-reset" className="text-brand underline">
          {labels.goToLogin}
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
