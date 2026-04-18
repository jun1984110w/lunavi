import { AuthForm } from "@/components/auth/AuthForm";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string };
};

export default async function LoginPage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <main className="px-3 py-6 sm:px-4 lg:px-6">
      <AuthForm
        mode="login"
        locale={locale}
        labels={{
          loginTitle: t("loginTitle"),
          signupTitle: t("signupTitle"),
          name: t("name"),
          email: t("email"),
          password: t("password"),
          phone: t("phone"),
          loginButton: t("loginButton"),
          signupButton: t("signupButton"),
          googleButton: t("googleButton"),
          facebookButton: t("facebookButton"),
          forgotPassword: t("forgotPassword"),
          goToLogin: t("goToLogin"),
          goToSignup: t("goToSignup"),
          divider: t("divider"),
          signupSuccessPending: t("signupSuccessPending"),
          unknownError: t("unknownError"),
          invalidCredentials: t("invalidCredentials"),
          tooManyRequests: t("tooManyRequests"),
          duplicateEmail: t("duplicateEmail"),
          emailNotConfirmed: t("emailNotConfirmed"),
        }}
      />
    </main>
  );
}
