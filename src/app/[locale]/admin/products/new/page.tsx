import { ProductForm } from "@/components/admin/ProductForm";
import { checkAdmin } from "@/lib/auth/checkAdmin";
import { hasGoogleTranslateApiKey } from "@/lib/translate";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

type Props = {
  params: { locale: string };
};

export default async function AdminProductNewPage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);
  const session = await checkAdmin(locale);

  // brand_admin은 신규 상품 생성 권한이 없어 목록 페이지로 돌려보냅니다.
  if (session.role === "brand_admin") {
    redirect(`/${locale}/admin/products`);
  }

  return (
    <ProductForm
      mode="create"
      role={session.role}
      managedBrandIds={session.managedBrandIds}
      hasTranslateApiKey={hasGoogleTranslateApiKey()}
    />
  );
}
