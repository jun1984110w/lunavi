import { redirect } from "next/navigation";

type Props = { params: { locale: string; id: string } };

export default async function AdminProductLegacyEditPage({ params }: Props) {
  // 기존 /admin/products/[id] 경로는 /edit 경로로 통일해 리디렉트합니다.
  redirect(`/${params.locale}/admin/products/${params.id}/edit`);
}
