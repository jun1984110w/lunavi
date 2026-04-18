import { AdminBrandsManager } from "@/components/admin/AdminBrandsManager";
import { checkAdmin } from "@/lib/auth/checkAdmin";
import { setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string };
};

export default async function AdminBrandsPage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);
  const session = await checkAdmin(locale);

  return <AdminBrandsManager role={session.role} managedBrandIds={session.managedBrandIds} />;
}
