import { AdminShell } from "@/components/admin/AdminShell";
import { checkAdmin } from "@/lib/auth/checkAdmin";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  children: React.ReactNode;
  params: { locale: string };
};

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);

  const t = await getTranslations("adminLayout");
  const session = await checkAdmin(locale);

  const allMenus = [
    { key: "dashboard", href: "/admin", label: t("menuDashboard") },
    { key: "products", href: "/admin/products", label: t("menuProducts") },
    { key: "categories", href: "/admin/categories", label: t("menuCategories") },
    { key: "brands", href: "/admin/brands", label: t("menuBrands") },
    { key: "banners", href: "/admin/banners", label: t("menuBanners") },
    { key: "orders", href: "/admin/orders", label: t("menuOrders") },
    { key: "members", href: "/admin/members", label: t("menuMembers") },
    { key: "site", href: "/admin/settings", label: t("menuSiteSettings") },
  ];

  // brand_admin은 담당 브랜드 중심 메뉴만 노출해 접근 범위를 명확하게 구분합니다.
  const brandAdminAllowedKeys = new Set(["dashboard", "products", "brands", "orders"]);
  const menuItems =
    session.role === "brand_admin"
      ? allMenus.filter((menu) => brandAdminAllowedKeys.has(menu.key))
      : allMenus;

  return (
    <AdminShell
      locale={locale}
      userName={session.name}
      menuItems={menuItems}
      logoutLabel={t("logout")}
    >
      {children}
    </AdminShell>
  );
}
