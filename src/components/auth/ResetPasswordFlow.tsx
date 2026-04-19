"use client";

import { createClient } from "@/lib/supabase/client";
import { Link, useRouter } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";

type Phase = "loading" | "ready" | "expired" | "success";

type Messages = {
  title: string;
  password: string;
  confirmPassword: string;
  submit: string;
  success: string;
  mismatch: string;
  unknownError: string;
  waitingSession: string;
  linkExpired: string;
  forgotPasswordAgain: string;
  goToLogin: string;
};

type Props = {
  messages: Messages;
};

const WAIT_MS = 5000;

/**
 * 비밀번호 재설정 전용 클라이언트 화면입니다.
 * 세션(쿠키) 반영 지연을 고려해 최대 5초까지 대기한 뒤 폼을 엽니다.
 */
export function ResetPasswordFlow({ messages }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;

    const finish = (next: Phase) => {
      if (doneRef.current) return;
      doneRef.current = true;
      setPhase(next);
    };

    const trySession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        finish("ready");
        return true;
      }
      return false;
    };

    void trySession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish("ready");
    });

    const timer = window.setTimeout(() => {
      void trySession().then((ok) => {
        if (!ok) finish("expired");
      });
    }, WAIT_MS);

    return () => {
      window.clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage(messages.mismatch);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      const lower = (error.message || "").toLowerCase();
      if (lower.includes("session") && lower.includes("missing")) {
        setErrorMessage(messages.linkExpired);
      } else {
        setErrorMessage(error.message || messages.unknownError);
      }
      setSubmitting(false);
      return;
    }

    await supabase.auth.signOut();
    setPhase("success");
    setSubmitting(false);
    window.setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 2000);
  };

  if (phase === "loading") {
    return (
      <section className="mx-auto w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
        <h1 className="text-xl font-bold">{messages.title}</h1>
        <p className="mt-6 text-center text-sm text-neutral-600">{messages.waitingSession}</p>
        <div className="mx-auto mt-4 h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </section>
    );
  }

  if (phase === "expired") {
    return (
      <section className="mx-auto w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
        <h1 className="text-xl font-bold">{messages.title}</h1>
        <p className="mt-4 text-sm text-red-600">{messages.linkExpired}</p>
        <div className="mt-4 text-sm">
          <Link href="/forgot-password" className="font-medium text-brand underline">
            {messages.forgotPasswordAgain}
          </Link>
        </div>
        <div className="mt-2 text-sm">
          <Link href="/login" className="text-neutral-600 underline">
            {messages.goToLogin}
          </Link>
        </div>
      </section>
    );
  }

  if (phase === "success") {
    return (
      <section className="mx-auto w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
        <p className="text-center text-sm font-medium text-emerald-700">{messages.success}</p>
        <p className="mt-2 text-center text-xs text-neutral-500">{messages.goToLogin}</p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
      <h1 className="text-xl font-bold">{messages.title}</h1>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{messages.password}</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{messages.confirmPassword}</span>
          <input
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {messages.submit}
        </button>
      </form>

      {errorMessage ? (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
      ) : null}
    </section>
  );
}
