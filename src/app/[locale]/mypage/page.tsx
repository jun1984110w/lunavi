import { Link } from "@/i18n/navigation";
import { requireMypageUser } from "@/lib/mypage/requireSession";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MdChevronRight } from "react-icons/md";

type Props = {
  params: { locale: string };
};

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "shipping",
  "delivered",
  "cancelled",
] as const;

/**
 * 마이페이지 메인 — 회원 요약, 주문 상태별 건수, 빠른 메뉴
 */
export default async function MypageHomePage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);

  const { supabase, user, profile } = await requireMypageUser(locale);
  const t = await getTranslations("mypage.main");
  const tRole = await getTranslations("mypage.role");

  const { data: statusRows } = await supabase.from("orders").select("status").eq("user_id", user.id);

  const counts: Record<string, number> = {};
  for (const s of ORDER_STATUSES) counts[s] = 0;
  for (const row of (statusRows as { status: string }[] | null) ?? []) {
    if (row.status in counts) counts[row.status] += 1;
  }

  const roleLabelMap: Record<string, string> = {
    customer: tRole("label_customer"),
    wholesale: tRole("label_wholesale"),
    staff: tRole("label_staff"),
    brand_admin: tRole("label_brand_admin"),
    admin: tRole("label_admin"),
    super_admin: tRole("label_super_admin"),
  };
  const roleLabel = roleLabelMap[profile.role] ?? profile.role;

  const quickLinks = [
    { href: "/mypage/orders", title: t("quickOrders"), desc: t("quickOrdersDesc") },
    { href: "/mypage/addresses", title: t("quickAddresses"), desc: t("quickAddressesDesc") },
    { href: "/mypage/wishlist", title: t("quickWishlist"), desc: t("quickWishlistDesc") },
    { href: "/mypage/profile", title: t("quickProfile"), desc: t("quickProfileDesc") },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-bold">{t("summaryTitle")}</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-neutral-500">{t("name")}</dt>
            <dd className="font-medium">{profile.full_name || t("nameEmpty")}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">{t("email")}</dt>
            <dd className="break-all font-medium">{profile.email ?? user.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">{t("grade")}</dt>
            <dd className="font-medium">{roleLabel}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-bold">{t("orderStatsTitle")}</h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ORDER_STATUSES.map((st) => (
            <li key={st} className="rounded-lg bg-neutral-50 px-3 py-3 text-center">
              <p className="text-xs text-neutral-600">{t(`status_${st}`)}</p>
              <p className="mt-1 text-lg font-bold text-brand">{counts[st]}</p>
              <p className="text-xs text-neutral-500">{t("countUnit")}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-bold">{t("quickMenuTitle")}</h2>
        <ul className="mt-3 divide-y divide-neutral-100">
          {quickLinks.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center justify-between gap-3 py-3 text-sm hover:text-brand"
              >
                <span>
                  <span className="font-semibold">{item.title}</span>
                  <span className="mt-0.5 block text-xs text-neutral-500">{item.desc}</span>
                </span>
                <MdChevronRight className="h-5 w-5 shrink-0 text-neutral-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

    </div>
  );
}
