import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

type Props = {
  children: React.ReactNode;
  params: { locale: string };
};

/**
 * `[locale]` 세그먼트마다 메시지를 주입하고, 잘못된 로케일은 404로 처리합니다.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = params;

  if (
    !routing.locales.includes(locale as (typeof routing.locales)[number])
  ) {
    notFound();
  }

  // 정적 렌더링 시 로케일을 명시해 headers() 없이도 next-intl API가 동작하도록 합니다.
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <div lang={locale} className="flex min-h-screen flex-col bg-surface text-ink">
      <NextIntlClientProvider messages={messages}>
        <Header />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <Footer />
        <MobileBottomNav />
      </NextIntlClientProvider>
    </div>
  );
}
