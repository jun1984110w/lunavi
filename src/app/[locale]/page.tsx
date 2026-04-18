import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string };
};

/**
 * 홈: 번역 키(nav / common / product)를 사용하는 예시 화면입니다.
 */
export default async function HomePage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);

  const tNav = await getTranslations("nav");
  const tCommon = await getTranslations("common");
  const tProduct = await getTranslations("product");

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-8 font-[family-name:var(--font-geist-sans)]">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Lunavi</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          {locale} — next-intl + App Router
        </p>
      </header>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium text-neutral-800 dark:text-neutral-200">
          nav
        </h2>
        <ul className="list-inside list-disc text-neutral-700 dark:text-neutral-300">
          <li>{tNav("home")}</li>
          <li>{tNav("category")}</li>
          <li>{tNav("search")}</li>
          <li>{tNav("cart")}</li>
          <li>{tNav("mypage")}</li>
        </ul>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium text-neutral-800 dark:text-neutral-200">
          common
        </h2>
        <ul className="list-inside list-disc text-neutral-700 dark:text-neutral-300">
          <li>{tCommon("login")}</li>
          <li>{tCommon("signup")}</li>
          <li>{tCommon("logout")}</li>
          <li>{tCommon("search")}</li>
        </ul>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium text-neutral-800 dark:text-neutral-200">
          product
        </h2>
        <ul className="list-inside list-disc text-neutral-700 dark:text-neutral-300">
          <li>{tProduct("addToCart")}</li>
          <li>{tProduct("buyNow")}</li>
          <li>{tProduct("price")}</li>
          <li>{tProduct("reviews")}</li>
        </ul>
      </section>
    </div>
  );
}
