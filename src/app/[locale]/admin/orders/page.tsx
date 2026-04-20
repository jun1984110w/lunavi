import { AdminOrdersManager } from "@/components/admin/AdminOrdersManager";
import { checkAdmin } from "@/lib/auth/checkAdmin";
import { setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string };
};

/**
 * 관리자 주문 목록 및 배송 라벨 일괄 인쇄
 */
export default async function AdminOrdersPage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);
  await checkAdmin(locale);

  return <AdminOrdersManager />;
}
