"use client";

import { useTranslations } from "next-intl";
import { FaFacebookF, FaInstagram, FaYoutube } from "react-icons/fa";
import { SiZalo } from "react-icons/si";

type Props = {
  companyName: string;
  representative: string;
  businessNumber: string;
  address: string;
  phone: string;
  email: string;
  sns: {
    facebook?: string;
    instagram?: string;
    zalo?: string;
    youtube?: string;
  };
};

/**
 * 하단 회사·고객센터·SNS 영역입니다.
 */

export function Footer({
  companyName,
  representative,
  businessNumber,
  address,
  phone,
  email,
  sns,
}: Props) {
  const t = useTranslations("layout.footer");

  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 text-ink">
      <div className="mx-auto max-w-7xl px-3 py-8 pb-24 sm:px-4 md:pb-8 lg:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <section>
            <h2 className="mb-3 text-sm font-bold text-brand">{t("companyInfo")}</h2>
            <ul className="space-y-2 text-xs leading-relaxed text-neutral-700 sm:text-sm">
              <li>{companyName || t("companyInfo")}</li>
              <li>{representative || t("ceo")}</li>
              <li>{businessNumber || t("businessNo")}</li>
              <li>{address || t("address")}</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-bold text-brand">{t("customerCenter")}</h2>
            <p className="text-sm font-semibold text-ink">{phone || t("csPhone")}</p>
            <p className="mt-2 text-xs text-neutral-600 sm:text-sm">{t("csHours")}</p>
            <p className="mt-1 text-xs text-neutral-600 sm:text-sm">{email || "-"}</p>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-bold text-brand">{t("sns")}</h2>
            <ul className="flex flex-wrap gap-3">
              <li>
                <a
                  href={sns.facebook || "https://www.facebook.com/"}
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
                  href={sns.instagram || "https://www.instagram.com/"}
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
                  href={sns.zalo || "https://zalo.me/"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-ink transition hover:border-brand hover:text-brand"
                  aria-label="Zalo"
                >
                  <SiZalo className="h-5 w-5" aria-hidden />
                </a>
              </li>
              <li>
                <a
                  href={sns.youtube || "https://www.youtube.com/"}
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
