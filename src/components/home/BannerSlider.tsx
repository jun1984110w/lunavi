"use client";

import { Link } from "@/i18n/navigation";
import { Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";

type BannerItem = {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
};

type Props = {
  banners: BannerItem[];
  emptyLabel: string;
};

export function BannerSlider({ banners, emptyLabel }: Props) {
  if (banners.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-500 sm:h-64">
        {emptyLabel}
      </div>
    );
  }

  return (
    <Swiper
      modules={[Autoplay, Pagination]}
      autoplay={{ delay: 3000, disableOnInteraction: false }}
      pagination={{ clickable: true }}
      loop={banners.length > 1}
      className="rounded-xl"
    >
      {banners.map((banner) => {
        const content = (
          <img
            src={banner.imageUrl}
            alt={banner.title}
            className="h-44 w-full rounded-xl object-cover sm:h-64 lg:h-80"
          />
        );

        return (
          <SwiperSlide key={banner.id}>
            {banner.linkUrl ? (
              <Link href={banner.linkUrl} className="block">
                {content}
              </Link>
            ) : (
              content
            )}
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
}
