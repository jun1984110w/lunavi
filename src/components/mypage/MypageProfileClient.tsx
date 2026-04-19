"use client";

import { updateProfileAction } from "@/lib/mypage/profileActions";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
  initialName: string;
  initialPhone: string;
  email: string;
};

/**
 * 회원정보 수정(이름·전화) + 비밀번호 변경(클라이언트 Auth API)
 */
export function MypageProfileClient({ initialName, initialPhone, email }: Props) {
  const t = useTranslations("mypage.profile");
  const supabase = createClient();

  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleProfile = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await updateProfileAction({ fullName: name, phone });
    setBusy(false);
    if (!res.ok) {
      setErr(res.code === "db" && "message" in res ? res.message : t("saveError"));
      return;
    }
    setMsg(t("saveOk"));
  };

  const handlePassword = async () => {
    setErr(null);
    setMsg(null);
    if (!pw || pw.length < 6) {
      setErr(t("passwordWeak"));
      return;
    }
    if (pw !== pw2) {
      setErr(t("passwordMismatch"));
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setPw("");
    setPw2("");
    setMsg(t("passwordOk"));
  };

  return (
    <div className="mx-auto max-w-md space-y-8">
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-bold">{t("sectionProfile")}</h2>
        <p className="mt-1 text-xs text-neutral-500">{t("emailReadonly")}</p>
        <p className="mt-2 text-sm font-medium text-neutral-800">{email}</p>

        <label className="mt-4 block text-sm">
          <span className="mb-1 block font-medium">{t("name")}</span>
          <input
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium">{t("phone")}</span>
          <input
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleProfile()}
          className="mt-4 w-full rounded-md bg-brand py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t("saveProfile")}
        </button>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-bold">{t("sectionPassword")}</h2>
        <label className="mt-4 block text-sm">
          <span className="mb-1 block font-medium">{t("newPassword")}</span>
          <input
            type="password"
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium">{t("confirmPassword")}</span>
          <input
            type="password"
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handlePassword()}
          className="mt-4 w-full rounded-md border border-neutral-300 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {t("savePassword")}
        </button>
      </section>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {msg ? <p className="text-sm text-green-700">{msg}</p> : null}
    </div>
  );
}
