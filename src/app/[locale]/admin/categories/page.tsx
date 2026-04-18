import { AdminCategoriesManager } from "@/components/admin/AdminCategoriesManager";
import { checkAdmin } from "@/lib/auth/checkAdmin";
import { setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string };
};

export default async function AdminCategoriesPage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);
  const session = await checkAdmin(locale);

  return <AdminCategoriesManager canEdit={session.role !== "brand_admin"} />;
}
