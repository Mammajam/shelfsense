"use client";

import { useState } from "react";
import { Hero } from "@/components/Hero";
import { Results, ResultsSkeleton } from "@/components/Results";
import { ShopForm, type ShopFormValues } from "@/components/ShopForm";
import { parseRangeCsv } from "@/lib/mapper";
import type { AnalysisResult } from "@/lib/types";

const SAMPLE_CSV = `name,brand,category,weekly_sales
Nivea Body Lotion,Nivea,beauty,40
Generic Face Cream,,beauty,6
Basmati Rice 5kg,,grocery,55
Instant Noodles,,grocery,48
Whole Milk,,grocery,30
Dish Soap,,household,12
Plastic Buckets,,household,3
Candles,,household,4`;

export default function Home() {
  const [form, setForm] = useState<ShopFormValues>({
    name: "Corner General Store",
    location: "Brooklyn, NY",
    reference: "New York, NY",
    categories: "beauty, grocery, household",
    csv: SAMPLE_CSV,
  });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    const { name, location, reference, categories, csv } = form;
    setLoading(true);
    setError(null);
    setResult(null);
    const cats = categories.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
    const range = parseRangeCsv(csv);
    if (range.length === 0) {
      setError("Could not read the range. Use a header row: name,brand,category,weekly_sales");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, location, categories: cats, range, referenceLocation: reference || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Analysis failed");
      setResult(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Hero />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16">
        <ShopForm
          values={form}
          onChange={setForm}
          onSample={() => setForm((v) => ({ ...v, csv: SAMPLE_CSV }))}
          onRun={run}
          loading={loading}
        />
        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-coral/60 bg-coral/10 px-4 py-3 text-sm text-coral">
            {error}
          </p>
        )}
        {loading && <ResultsSkeleton />}
        {result && <Results result={result} />}
      </main>
      <footer className="px-5 pb-8 text-center text-xs text-cream/40">
        ShelfSense · taste data by Qloo · recommendations are category and brand level, not SKU level
      </footer>
    </>
  );
}
