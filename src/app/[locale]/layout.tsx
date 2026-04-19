import { CartAuthSync } from "@/components/cart/CartAuthSync";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { getSiteSettings } from "@/lib/site-settings";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";

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

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const siteSettings = await getSiteSettings();
  const title = siteSettings.seoTitle || siteSettings.siteName;

  return {
    title,
    description: siteSettings.seoDescription || undefined,
    icons: {
      icon: siteSettings.faviconUrl || "/favicon.ico",
    },
    openGraph: {
      title,
      description: siteSettings.seoDescription || undefined,
      images: siteSettings.seoOgImage ? [siteSettings.seoOgImage] : undefined,
      locale: params.locale,
    },
  };
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
  // 레이아웃에서 site_settings를 한 번 조회해 헤더/푸터/메타에서 함께 사용합니다.
  const siteSettings = await getSiteSettings();

  return (
    <div lang={locale} className="flex min-h-screen flex-col bg-surface text-ink">
      <NextIntlClientProvider messages={messages}>
        {/* 로그인 시 로컬 장바구니와 Supabase carts를 동기화합니다. */}
        <CartAuthSync locale={locale} />
        <Header siteName={siteSettings.siteName} logoUrl={siteSettings.logoUrl} />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <Footer
          companyName={siteSettings.companyName}
          representative={siteSettings.representative}
          businessNumber={siteSettings.businessNumber}
          address={siteSettings.address}
          phone={siteSettings.phone}
          email={siteSettings.email}
          sns={siteSettings.footerSns}
        />
        <MobileBottomNav />
      </NextIntlClientProvider>
    </div>
  );
}
