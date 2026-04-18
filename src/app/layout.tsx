import type { Metadata } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import { routing } from "@/i18n/routing";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Lunavi",
  description: "Lunavi app",
};

/**
 * 루트 레이아웃: `<html>` / `<body>`는 반드시 여기에 두어야 합니다.
 * `lang`은 미들웨어가 설정하는 `X-NEXT-INTL-LOCALE`를 우선 사용합니다.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale =
    headers().get("X-NEXT-INTL-LOCALE") ?? routing.defaultLocale;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
