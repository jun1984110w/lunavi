"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { MdAdd, MdRemove, MdStar } from "react-icons/md";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

type ProductImage = {
  id: number;
  image_url: string;
  sort_order: number;
};

type ProductOption = {
  id: number;
  option_name: string;
  option_value: string;
  price_adjustment: number;
  stock_quantity: number;
  sort_order: number;
};

type ProductDetailData = {
  slug: string;
  brandSlug: string | null;
  brandName: string;
  brandLogoUrl: string | null;
  name: string;
  description: string;
  priceRetail: number;
  priceWholesale: number | null;
  originalPrice: number | null;
  ratingAvg: number;
  reviewCount: number;
  images: ProductImage[];
  options: ProductOption[];
  isWholesaleViewer: boolean;
};

type Labels = {
  addToCart: string;
  buyNow: string;
  optionTitle: string;
  quantity: string;
  detailTab: string;
  reviewTab: string;
  inquiryTab: string;
  reviewPreparing: string;
  inquiryPreparing: string;
  actionPreparing: string;
  wholesalePrice: string;
  retailPrice: string;
  imagePreparing: string;
};

type Props = {
  product: ProductDetailData;
  labels: Labels;
};

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(value);

export function ProductDetailClient({ product, labels }: Props) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"detail" | "review" | "inquiry">("detail");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  const basePrice = product.priceRetail;
  const discountBase = product.originalPrice ?? basePrice;
  const discountRate =
    discountBase > basePrice ? Math.round(((discountBase - basePrice) / discountBase) * 100) : 0;

  const groupedOptions = useMemo(() => {
    const groups = new Map<string, ProductOption[]>();
    product.options.forEach((option) => {
      const key = option.option_name;
      const list = groups.get(key) ?? [];
      list.push(option);
      groups.set(key, list.sort((a, b) => a.sort_order - b.sort_order));
    });
    return Array.from(groups.entries());
  }, [product.options]);

  const visibleImages = product.images.length > 0 ? product.images : [];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          {visibleImages.length > 0 ? (
            <>
              <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
                {/* 모바일에서는 스와이프로 이미지 전환이 가능하도록 Swiper를 사용합니다. */}
                <Swiper
                  spaceBetween={8}
                  slidesPerView={1}
                  onSlideChange={(swiper) => setActiveImageIndex(swiper.activeIndex)}
                  initialSlide={activeImageIndex}
                >
                  {visibleImages.map((image) => (
                    <SwiperSlide key={image.id}>
                      <img
                        src={image.image_url}
                        alt={product.name}
                        className="aspect-square w-full object-cover"
                      />
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {visibleImages.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border ${
                      activeImageIndex === index ? "border-brand" : "border-neutral-200"
                    }`}
                    onClick={() => setActiveImageIndex(index)}
                  >
                    <img src={image.image_url} alt={product.name} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-500">
              {labels.imagePreparing}
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            {product.brandLogoUrl ? (
              <img src={product.brandLogoUrl} alt={product.brandName} className="h-6 w-6 rounded object-contain" />
            ) : null}
            {product.brandSlug ? (
              <Link href={`/brand/${product.brandSlug}`} className="text-sm text-neutral-600 hover:text-brand">
                {product.brandName}
              </Link>
            ) : (
              <span className="text-sm text-neutral-600">{product.brandName}</span>
            )}
          </div>

          <h1 className="text-xl font-bold leading-snug">{product.name}</h1>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {discountRate > 0 ? (
                <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                  {discountRate}%
                </span>
              ) : null}
              <span className="text-2xl font-bold text-red-500">{formatPrice(basePrice)} VND</span>
            </div>
            {discountBase > basePrice ? (
              <p className="text-sm text-neutral-400 line-through">{formatPrice(discountBase)} VND</p>
            ) : null}
            <p className="text-xs text-neutral-500">
              {labels.retailPrice}: {formatPrice(product.priceRetail)} VND
            </p>
            {product.isWholesaleViewer && product.priceWholesale ? (
              <p className="text-xs font-semibold text-brand">
                {labels.wholesalePrice}: {formatPrice(product.priceWholesale)} VND
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-1 text-sm text-neutral-600">
            <MdStar className="h-4 w-4 text-amber-400" aria-hidden />
            <span>{product.ratingAvg.toFixed(1)}</span>
            <span>({product.reviewCount})</span>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold">{labels.optionTitle}</h2>
            {groupedOptions.map(([groupName, options]) => (
              <div key={groupName} className="space-y-1.5">
                <p className="text-xs text-neutral-600">{groupName}</p>
                <div className="flex flex-wrap gap-2">
                  {options.map((option) => {
                    const selectedValue = selectedOptions[groupName];
                    const active = selectedValue === option.option_value;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={`rounded-md border px-2 py-1 text-xs ${
                          active ? "border-brand bg-brand/10 text-brand" : "border-neutral-300"
                        }`}
                        onClick={() =>
                          setSelectedOptions((prev) => ({
                            ...prev,
                            [groupName]: option.option_value,
                          }))
                        }
                      >
                        {option.option_value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2">
            <span className="text-sm font-medium">{labels.quantity}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded border border-neutral-300 p-1"
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
              >
                <MdRemove />
              </button>
              <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
              <button
                type="button"
                className="rounded border border-neutral-300 p-1"
                onClick={() => setQuantity((prev) => prev + 1)}
              >
                <MdAdd />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold"
              onClick={() => window.alert(labels.actionPreparing)}
            >
              {labels.addToCart}
            </button>
            <button
              type="button"
              className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white"
              onClick={() => window.alert(labels.actionPreparing)}
            >
              {labels.buyNow}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white">
        <div className="flex border-b border-neutral-200">
          <button
            type="button"
            className={`flex-1 px-3 py-2 text-sm ${activeTab === "detail" ? "font-bold text-brand" : ""}`}
            onClick={() => setActiveTab("detail")}
          >
            {labels.detailTab}
          </button>
          <button
            type="button"
            className={`flex-1 px-3 py-2 text-sm ${activeTab === "review" ? "font-bold text-brand" : ""}`}
            onClick={() => setActiveTab("review")}
          >
            {labels.reviewTab}
          </button>
          <button
            type="button"
            className={`flex-1 px-3 py-2 text-sm ${activeTab === "inquiry" ? "font-bold text-brand" : ""}`}
            onClick={() => setActiveTab("inquiry")}
          >
            {labels.inquiryTab}
          </button>
        </div>
        <div className="p-4 text-sm text-neutral-700">
          {activeTab === "detail" ? (
            <p className="whitespace-pre-line">{product.description}</p>
          ) : activeTab === "review" ? (
            <p>{labels.reviewPreparing}</p>
          ) : (
            <p>{labels.inquiryPreparing}</p>
          )}
        </div>
      </section>
    </div>
  );
}
