import { ResetPasswordFlow } from "@/components/auth/ResetPasswordFlow";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string };
};

/**
 * 비밀번호 재설정 페이지입니다.
 * 세션 확인·폼·updateUser는 전부 클라이언트 컴포넌트에서 처리합니다.
 */
export default async function ResetPasswordPage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <main className="px-3 py-6 sm:px-4 lg:px-6">
      <ResetPasswordFlow
        messages={{
          title: t("resetPasswordTitle"),
          password: t("password"),
          confirmPassword: t("confirmPassword"),
          submit: t("resetPasswordButton"),
          success: t("resetPasswordSuccess"),
          mismatch: t("passwordMismatch"),
          unknownError: t("unknownError"),
          waitingSession: t("resetPasswordWaitingSession"),
          linkExpired: t("resetPasswordLinkExpired"),
          forgotPasswordAgain: t("resetPasswordForgotPasswordAgain"),
          goToLogin: t("goToLoginSimple"),
        }}
      />
    </main>
  );
}
