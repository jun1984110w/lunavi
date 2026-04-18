import type { Metadata } from "next";
import localFont from "next/font/local";
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
  description: "Lunavi",
  // app/favicon.ico 대신 public 정적 파일을 쓰면 favicon 전용 서버 라우트가 생기지 않아, 청크 런타임 오류를 줄이기 쉽습니다.
  icons: {
    icon: "/favicon.ico",
  },
};

/**
 * App Router 루트 레이아웃입니다. 실제 페이지는 `[locale]` 아래에 둡니다.
 * `<html>`의 `lang`은 로케일별 레이아웃에서 콘텐츠 래퍼로 보완합니다.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
