import createNextIntlPlugin from "next-intl/plugin";

// next-intl 플러그인: `src/i18n/request.ts`의 `getRequestConfig`를 Next.js 빌드와 연결합니다.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withNextIntl(nextConfig);
