import { AdminSiteSettingsManager } from "@/components/admin/AdminSiteSettingsManager";
import { checkAdmin } from "@/lib/auth/checkAdmin";
import { setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string };
};

export default async function AdminSettingsPage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);
  await checkAdmin(locale);

  return <AdminSiteSettingsManager />;
}
