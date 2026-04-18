import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string };
};

export default async function ResetPasswordPage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <main className="px-3 py-6 sm:px-4 lg:px-6">
      <ResetPasswordForm
        labels={{
          title: t("resetPasswordTitle"),
          password: t("password"),
          confirmPassword: t("confirmPassword"),
          submit: t("resetPasswordButton"),
          success: t("resetPasswordSuccess"),
          mismatch: t("passwordMismatch"),
          unknownError: t("unknownError"),
          goToLogin: t("goToLoginSimple"),
        }}
      />
    </main>
  );
}
