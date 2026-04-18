import { AdminBannersManager } from "@/components/admin/AdminBannersManager";
import { checkAdmin } from "@/lib/auth/checkAdmin";
import { setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string };
};

export default async function AdminBannersPage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);
  await checkAdmin(locale);

  return <AdminBannersManager />;
}
