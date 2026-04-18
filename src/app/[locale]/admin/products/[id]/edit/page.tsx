import { ProductForm } from "@/components/admin/ProductForm";
import { checkAdmin } from "@/lib/auth/checkAdmin";
import { hasGoogleTranslateApiKey } from "@/lib/translate";
import { setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string; id: string };
};

export default async function AdminProductEditPage({ params }: Props) {
  const { locale, id } = params;
  setRequestLocale(locale);
  const session = await checkAdmin(locale);

  return (
    <ProductForm
      mode="edit"
      productId={Number(id)}
      role={session.role}
      managedBrandIds={session.managedBrandIds}
      hasTranslateApiKey={hasGoogleTranslateApiKey()}
    />
  );
}
