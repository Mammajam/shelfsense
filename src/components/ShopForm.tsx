"use client";

import type { Dispatch, SetStateAction } from "react";

export interface ShopFormValues {
  name: string;
  location: string;
  reference: string;
  categories: string;
  csv: string;
}

interface Props {
  values: ShopFormValues;
  onChange: Dispatch<SetStateAction<ShopFormValues>>;
  onSample: () => void;
  onRun: () => void;
  loading: boolean;
}

export function ShopForm({ values, onChange, onSample, onRun, loading }: Props) {
  const set = (k: keyof ShopFormValues) => (e: { target: { value: string } }) =>
    onChange((v) => ({ ...v, [k]: e.target.value }));
  const label = "block text-sm font-medium text-cream/80";

  return (
    <section id="shop" className="panel mx-auto w-full max-w-6xl scroll-mt-6 p-6 sm:p-8" aria-labelledby="shop-h">
      <h2 id="shop-h" className="font-display text-2xl font-semibold">
        Tell us about your shop
      </h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Shop name
          <input className="field" value={values.name} onChange={set("name")} />
        </label>
        <label className={label}>
          Shop location
          <input className="field" value={values.location} onChange={set("location")} />
        </label>
        <label className={label}>
          Compare against <span className="text-cream/45">(optional)</span>
          <input className="field" value={values.reference} onChange={set("reference")} />
        </label>
        <label className={label}>
          Categories <span className="text-cream/45">(comma separated)</span>
          <input className="field" value={values.categories} onChange={set("categories")} />
        </label>
        <label className={`${label} sm:col-span-2`}>
          <span className="flex flex-wrap items-baseline justify-between gap-2">
            <span>
              Current range <span className="text-cream/45">(CSV: name, brand, category, weekly_sales)</span>
            </span>
            <button type="button" onClick={onSample} className="text-xs text-amber underline-offset-2 hover:underline">
              Load sample
            </button>
          </span>
          <textarea className="field h-40 font-mono text-xs leading-relaxed" value={values.csv} onChange={set("csv")} />
          <span className="mt-1 block text-xs text-cream/45">Sales are optional and needed for reduce calls.</span>
        </label>
      </div>
      <button
        onClick={onRun}
        disabled={loading}
        className="mt-6 rounded-full bg-amber px-7 py-3 font-semibold text-ink transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? "Analysing your neighborhood…" : "Analyse my shelf"}
      </button>
    </section>
  );
}
