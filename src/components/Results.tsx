import type { AnalysisResult, Recommendation, TasteSignal } from "@/lib/types";

const KIND_LABEL = { add: "Add", reduce: "Reduce", partner: "Partner" } as const;
const KIND_STYLE = {
  add: "bg-amber text-ink",
  reduce: "bg-coral text-ink",
  partner: "bg-sage text-ink",
} as const;

function signalDetail(s: TasteSignal) {
  if (s.rank && s.refRank)
    return `#${s.rank} here, ${s.refRank > 20 ? "not in reference top 20" : `#${s.refRank} in reference`}`;
  return `${Math.round(s.affinity * 100)}%${s.lift && s.lift > 1.05 ? ` · ${s.lift.toFixed(1)}x` : ""}`;
}

function SignalChips({ result }: { result: AnalysisResult }) {
  return (
    <div>
      <h3 className="text-sm font-semibold tracking-wide text-cream/70 uppercase">
        What {result.location} likes
      </h3>
      <ul className="mt-3 flex flex-wrap gap-2">
        {result.area.map((s) => (
          <li
            key={s.id}
            title={`${s.type}, ${s.category}`}
            className="rounded-full border border-sage/50 bg-sage/10 px-3 py-1 text-xs"
          >
            {s.name} <span className="ml-1 font-semibold text-amber">{signalDetail(s)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecommendationCard({ r, i }: { r: Recommendation; i: number }) {
  return (
    <li className="panel rise p-4" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-display text-2xl font-semibold text-amber">{i + 1}</span>
        <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${KIND_STYLE[r.kind]}`}>{KIND_LABEL[r.kind]}</span>
        <span className="font-semibold">{r.title}</span>
        <span className="text-xs text-cream/50">{r.category}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-cream/85">{r.reason}</p>
      {r.evidence.length > 0 && (
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer text-sage hover:text-cream">
            Evidence ({r.evidence.length})
          </summary>
          <ul className="mt-2 space-y-1 text-cream/70">
            {r.evidence.map((s) => (
              <li key={`${s.id}-${s.call}`}>
                <span className="font-mono text-amber">{s.call}</span> · {s.name} · {signalDetail(s)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

export function Results({ result, baseline }: { result: AnalysisResult; baseline: string | null }) {
  return (
    <section
      id="results"
      aria-live="polite"
      className="mx-auto mt-10 grid w-full max-w-6xl scroll-mt-6 gap-8 px-0 md:grid-cols-5"
    >
      <div className="space-y-5 md:col-span-3">
        <h2 className="font-display text-3xl font-semibold">
          Shelf<span className="text-amber">Sense</span> recommendations
        </h2>
        {result.dataSource === "mock" && (
          <p className="rounded-xl border border-amber/50 bg-amber/10 px-4 py-3 text-sm text-amber">
            Demo data: no Qloo key is configured, so these signals are invented placeholders.
          </p>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer text-cream/60 hover:text-cream">
            {result.mode === "agent"
              ? `Agent trace (${result.trace?.length ?? 0} tool calls)`
              : "Ran as a fixed pipeline (no agent)"}
          </summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-cream/75">
            {(result.trace ?? []).map((t, i) => (
              <li key={i}>
                <code className="font-mono text-amber">{t.tool}</code>: {t.summary}
              </li>
            ))}
          </ol>
        </details>
        <SignalChips result={result} />
        <h3 className="pt-1 text-sm font-semibold tracking-wide text-cream/70 uppercase">Ranked actions</h3>
        <ol className="space-y-3">
          {result.recommendations.map((r, i) => (
            <RecommendationCard key={`${r.kind}-${r.title}`} r={r} i={i} />
          ))}
        </ol>
      </div>

      <aside className="md:col-span-2">
        <h2 className="font-display text-3xl font-semibold text-cream/70">Plain LLM, no Qloo</h2>
        <div className="panel mt-5 border-dashed p-4 opacity-90">
          {baseline === null ? (
            <div className="space-y-2" aria-label="Loading">
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-5/6 rounded" />
              <div className="skeleton h-3 w-2/3 rounded" />
            </div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-cream/80">{baseline.replace(/\*\*/g, "")}</p>
          )}
        </div>
        <p className="mt-3 text-xs text-cream/50">
          Same shop and area. No location data, so no evidence behind the advice.
        </p>
      </aside>
    </section>
  );
}

export function ResultsSkeleton() {
  return (
    <section className="mx-auto mt-10 grid w-full max-w-6xl gap-3 md:grid-cols-5" aria-busy="true" aria-label="Analysing">
      <ul className="space-y-3 md:col-span-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="skeleton h-24 rounded-[14px]" />
        ))}
      </ul>
      <div className="skeleton h-48 rounded-[14px] md:col-span-2" />
    </section>
  );
}
