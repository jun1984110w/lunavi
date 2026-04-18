import { getTranslations, setRequestLocale } from "next-intl/server";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

type Props = {
  params: { locale: string };
};

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <main className="px-3 py-6 sm:px-4 lg:px-6">
      <ForgotPasswordForm
        locale={locale}
        labels={{
          title: t("forgotPassword"),
          description: t("forgotPasswordDescription"),
          email: t("email"),
          submit: t("sendResetMail"),
          backToLogin: t("goToLoginSimple"),
          success: t("resetMailSent"),
          unknownError: t("unknownError"),
        }}
      />
    </main>
  );
}
