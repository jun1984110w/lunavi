import { AdminProductsManager } from "@/components/admin/AdminProductsManager";
import { checkAdmin } from "@/lib/auth/checkAdmin";
import { setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string };
};

export default async function AdminProductsPage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);
  const session = await checkAdmin(locale);

  return <AdminProductsManager role={session.role} managedBrandIds={session.managedBrandIds} />;
}
