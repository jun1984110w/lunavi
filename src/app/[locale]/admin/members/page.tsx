import { AdminMembersManager } from "@/components/admin/AdminMembersManager";
import { checkAdmin } from "@/lib/auth/checkAdmin";
import { setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string };
};

export default async function AdminMembersPage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);
  const session = await checkAdmin(locale);

  return <AdminMembersManager currentRole={session.role} />;
}
