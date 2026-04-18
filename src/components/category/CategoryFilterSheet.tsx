"use client";

import { useState } from "react";

type BrandOption = {
  id: number;
  name: string;
};

type Props = {
  title: string;
  filterLabel: string;
  priceLabel: string;
  minPriceLabel: string;
  maxPriceLabel: string;
  brandLabel: string;
  ageLabel: string;
  applyLabel: string;
  closeLabel: string;
  brands: BrandOption[];
  ageTags: string[];
  selectedBrandIds: number[];
  selectedAgeTags: string[];
  minPrice: number;
  maxPrice: number;
};

export function CategoryFilterSheet({
  title,
  filterLabel,
  priceLabel,
  minPriceLabel,
  maxPriceLabel,
  brandLabel,
  ageLabel,
  applyLabel,
  closeLabel,
  brands,
  ageTags,
  selectedBrandIds,
  selectedAgeTags,
  minPrice,
  maxPrice,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium md:hidden"
        onClick={() => setOpen(true)}
      >
        {filterLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 md:hidden"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <aside
            className="absolute right-0 top-0 h-full w-[min(90vw,22rem)] overflow-y-auto bg-white p-4 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold">{title}</h2>
              <button
                type="button"
                className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
                onClick={() => setOpen(false)}
              >
                {closeLabel}
              </button>
            </div>

            <form method="get" className="space-y-4">
              {/* 필터 적용 시 1페이지부터 다시 조회합니다. */}
              <input type="hidden" name="page" value="1" />

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">{priceLabel}</h3>
                <label className="block text-xs text-neutral-600">{minPriceLabel}</label>
                <input
                  type="range"
                  name="minPrice"
                  min={0}
                  max={50000000}
                  step={10000}
                  defaultValue={minPrice}
                  className="w-full"
                />
                <label className="block text-xs text-neutral-600">{maxPriceLabel}</label>
                <input
                  type="range"
                  name="maxPrice"
                  min={0}
                  max={50000000}
                  step={10000}
                  defaultValue={maxPrice}
                  className="w-full"
                />
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">{brandLabel}</h3>
                <div className="space-y-1">
                  {brands.map((brand) => (
                    <label key={brand.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="brand"
                        value={brand.id}
                        defaultChecked={selectedBrandIds.includes(brand.id)}
                      />
                      <span>{brand.name}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">{ageLabel}</h3>
                <div className="space-y-1">
                  {ageTags.map((tag) => (
                    <label key={tag} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="age"
                        value={tag}
                        defaultChecked={selectedAgeTags.includes(tag)}
                      />
                      <span>{tag}</span>
                    </label>
                  ))}
                </div>
              </section>

              <button
                type="submit"
                className="w-full rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white"
              >
                {applyLabel}
              </button>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
