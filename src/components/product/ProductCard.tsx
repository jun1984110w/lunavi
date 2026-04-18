import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { MdStar } from "react-icons/md";

export type ProductCardItem = {
  id: number;
  slug: string;
  brandName: string;
  brandSlug: string | null;
  name: string;
  imageUrl: string | null;
  priceRetail: number;
  priceMember: number | null;
  originalPrice: number | null;
  ratingAvg: number;
  reviewCount: number;
};

type Props = {
  item: ProductCardItem;
};

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(value);

export async function ProductCard({ item }: Props) {
  const tHome = await getTranslations("home");
  const finalPrice = item.priceMember ?? item.priceRetail;
  const basePrice = item.originalPrice ?? item.priceRetail;
  const discountRate =
    basePrice > finalPrice ? Math.round(((basePrice - finalPrice) / basePrice) * 100) : 0;

  return (
    <article className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <Link href={`/products/${item.slug}`} className="block">
        <div className="aspect-square bg-neutral-100">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-500">
              {tHome("imagePreparing")}
            </div>
          )}
        </div>
      </Link>

      <div className="space-y-1.5 p-3">
        {item.brandSlug ? (
          <Link
            href={`/brand/${item.brandSlug}`}
            className="line-clamp-1 text-xs text-neutral-500 hover:text-brand"
          >
            {item.brandName}
          </Link>
        ) : (
          <p className="line-clamp-1 text-xs text-neutral-500">{item.brandName}</p>
        )}

        <Link href={`/products/${item.slug}`} className="block">
          <h3 className="line-clamp-2 min-h-10 text-sm font-medium text-ink">{item.name}</h3>
        </Link>

        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            {discountRate > 0 ? (
              <span className="text-xs font-bold text-red-500">{discountRate}%</span>
            ) : null}
            <span className="text-sm font-bold text-ink">{formatPrice(finalPrice)} VND</span>
          </div>
          {basePrice > finalPrice ? (
            <p className="text-xs text-neutral-400 line-through">{formatPrice(basePrice)} VND</p>
          ) : null}
        </div>

        <div className="flex items-center gap-1 text-xs text-neutral-500">
          <MdStar className="h-4 w-4 text-amber-400" aria-hidden />
          <span>{item.ratingAvg.toFixed(1)}</span>
          <span>({item.reviewCount})</span>
        </div>
      </div>
    </article>
  );
}
