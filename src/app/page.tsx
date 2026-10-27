"use client";

import { useState } from "react";
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

const KIND_LABEL = { add: "Add", reduce: "Reduce", partner: "Partner" } as const;
const KIND_STYLE = {
  add: "bg-emerald-100 text-emerald-800",
  reduce: "bg-amber-100 text-amber-800",
  partner: "bg-sky-100 text-sky-800",
} as const;

export default function Home() {
  const [name, setName] = useState("Corner General Store");
  const [location, setLocation] = useState("Brooklyn, NY");
  const [reference, setReference] = useState("New York, NY");
  const [categories, setCategories] = useState("beauty, grocery, household");
  const [csv, setCsv] = useState(SAMPLE_CSV);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [baseline, setBaseline] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    setBaseline(null);
    const cats = categories.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
    const range = parseRangeCsv(csv);
    if (range.length === 0) {
      setError("Could not read the range. Use a header row: name,brand,category,weekly_sales");
      setLoading(false);
      return;
    }
    try {
      const post = (url: string, body: unknown) =>
        fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const [a, b] = await Promise.all([
        post("/api/analyze", { name, location, categories: cats, range, referenceLocation: reference || undefined }),
        post("/api/baseline", { name, location, categories: cats }),
      ]);
      const aj = await a.json();
      if (!a.ok) throw new Error(aj.error ?? "Analysis failed");
      setResult(aj);
      const bj = await b.json();
      setBaseline(b.ok ? bj.advice : `(baseline unavailable: ${bj.error})`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const input = "w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <h1 className="text-3xl font-semibold">ShelfSense</h1>
      <p className="mt-1 text-zinc-600 dark:text-zinc-400">
        What should this shop stock, based on what its neighbourhood actually likes?
      </p>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Shop name
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="text-sm">
          Shop location
          <input className={input} value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label className="text-sm">
          Compare against (optional)
          <input className={input} value={reference} onChange={(e) => setReference(e.target.value)} />
        </label>
        <label className="text-sm">
          Categories (comma separated)
          <input className={input} value={categories} onChange={(e) => setCategories(e.target.value)} />
        </label>
        <label className="text-sm sm:col-span-2">
          Current range (CSV: name, brand, category, weekly_sales; sales are optional and needed for reduce calls)
          <textarea className={`${input} h-40 font-mono`} value={csv} onChange={(e) => setCsv(e.target.value)} />
        </label>
      </section>

      <button
        onClick={run}
        disabled={loading}
        className="mt-4 rounded bg-black px-5 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {loading ? "Analysing…" : "Analyse my shelf"}
      </button>
      {error && <p className="mt-3 text-red-600">{error}</p>}

      {result && (
        <section className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <h2 className="text-xl font-semibold">ShelfSense recommendations</h2>
            {result.dataSource === "mock" && (
              <p className="mt-1 rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Demo data: no Qloo key is configured, so these signals are invented placeholders.
              </p>
            )}
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-zinc-600 dark:text-zinc-400">
                {result.mode === "agent"
                  ? `Agent trace (${result.trace?.length ?? 0} tool calls)`
                  : "Ran as a fixed pipeline (no agent)"}
              </summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                {(result.trace ?? []).map((t, i) => (
                  <li key={i}>
                    <code>{t.tool}</code>: {t.summary}
                  </li>
                ))}
              </ol>
            </details>
            <h3 className="mt-4 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              What {result.location} likes (top signals)
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {result.area.map((s) => (
                <li
                  key={s.id}
                  className="rounded-full border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-700"
                  title={`${s.type}, ${s.category}`}
                >
                  {s.name}
                  {s.rank && s.refRank
                    ? ` · #${s.rank} here, ${s.refRank > 20 ? "not in reference top 20" : `#${s.refRank} in reference`}`
                    : ` · ${Math.round(s.affinity * 100)}%${s.lift && s.lift > 1.05 ? ` · ${s.lift.toFixed(1)}x` : ""}`}
                </li>
              ))}
            </ul>
            <h3 className="mt-5 text-sm font-semibold text-zinc-600 dark:text-zinc-400">Ranked actions</h3>
            <ol className="mt-3 space-y-3">
              {result.recommendations.map((r, i) => (
                <li key={`${r.kind}-${r.title}`} className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-500">{i + 1}.</span>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${KIND_STYLE[r.kind]}`}>
                      {KIND_LABEL[r.kind]}
                    </span>
                    <span className="font-medium">{r.title}</span>
                    <span className="text-xs text-zinc-500">{r.category}</span>
                  </div>
                  <p className="mt-1 text-sm">{r.reason}</p>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Plain LLM, no Qloo</h2>
            <p className="mt-3 whitespace-pre-wrap rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800">
              {baseline ?? "…"}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Same shop and area. No location data, so no evidence behind the advice.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
