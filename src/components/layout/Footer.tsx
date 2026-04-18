"use client";

import { useTranslations } from "next-intl";
import { FaFacebookF, FaInstagram, FaYoutube } from "react-icons/fa";

/**
 * 하단 회사·고객센터·SNS 영역입니다.
 */

// TODO: site_settings 테이블에서 동적으로 가져오기 (사업자정보·주소·SNS URL 등). 현재는 번역 문자열 + 고정 링크 사용.

export function Footer() {
  const t = useTranslations("layout.footer");

  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 text-ink">
      <div className="mx-auto max-w-7xl px-3 py-8 pb-24 sm:px-4 md:pb-8 lg:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <section>
            <h2 className="mb-3 text-sm font-bold text-brand">{t("companyInfo")}</h2>
            <ul className="space-y-2 text-xs leading-relaxed text-neutral-700 sm:text-sm">
              <li>{t("businessNo")}</li>
              <li>{t("ceo")}</li>
              <li>{t("address")}</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-bold text-brand">{t("customerCenter")}</h2>
            <p className="text-sm font-semibold text-ink">{t("csPhone")}</p>
            <p className="mt-2 text-xs text-neutral-600 sm:text-sm">{t("csHours")}</p>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-bold text-brand">{t("sns")}</h2>
            <ul className="flex flex-wrap gap-3">
              <li>
                <a
                  href="https://www.facebook.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-ink transition hover:border-brand hover:text-brand"
                  aria-label={t("facebook")}
                >
                  <FaFacebookF className="h-4 w-4" aria-hidden />
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-ink transition hover:border-brand hover:text-brand"
                  aria-label={t("instagram")}
                >
                  <FaInstagram className="h-5 w-5" aria-hidden />
                </a>
              </li>
              <li>
                <a
                  href="https://www.youtube.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-ink transition hover:border-brand hover:text-brand"
                  aria-label={t("youtube")}
                >
                  <FaYoutube className="h-5 w-5" aria-hidden />
                </a>
              </li>
            </ul>
          </section>
        </div>

        <p className="mt-8 border-t border-neutral-200 pt-6 text-center text-xs text-neutral-500 sm:text-sm">
          {t("copyright")}
        </p>
      </div>
    </footer>
  );
}
