import { matchRange } from "./mapper";
import type { AnalysisResult, QlooProvider, Recommendation, ShopInput, TasteSignal } from "./types";

const strength = (s: TasteSignal) => s.affinity * (s.lift ?? 1);

/** Length of the reference list; a reference rank beyond it means "not in the top results". */
const TAKE_LIMIT = 20;

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Plain template reason, used when no LLM is available. Always cites the evidence. */
function templateReason(r: Omit<Recommendation, "reason">, location: string, source: string): string {
  const e = r.evidence[0];
  const lift =
    e?.rank && e.refRank
      ? e.refRank > TAKE_LIMIT
        ? `, ranked #${e.rank} here and outside the reference area's top ${TAKE_LIMIT}`
        : `, ranked #${e.rank} here vs #${e.refRank} in the reference area`
      : e?.lift && e.lift > 1.05
        ? `, ${e.lift.toFixed(1)}x stronger than the reference area`
        : "";
  if (r.kind === "add")
    return `${e.name} has ${pct(e.affinity)} affinity in ${location}${lift} (${source} ${e.call}), and nothing in your range covers it.`;
  if (r.kind === "partner")
    return `${e.name} attracts the same audience as your area (${pct(e.affinity)} affinity${lift}); a co-promotion fits the local taste cluster.`;
  return `${r.title} matches none of the area's top taste signals and is among your slower sellers, so it is a candidate to reduce.`;
}

/** Stages: sense (area taste) -> compare (vs reference) -> map to range -> rank. */
export async function analyze(input: ShopInput, provider: QlooProvider): Promise<AnalysisResult> {
  const sensed = await provider.areaTaste(input.location, input.categories);
  const signals = input.referenceLocation
    ? await provider.compareAreas(input.location, input.referenceLocation, sensed)
    : sensed;

  const recs: Omit<Recommendation, "reason">[] = [];

  for (const s of signals) {
    if (s.type === "place") {
      recs.push({ kind: "partner", title: s.name, category: s.category, score: strength(s), evidence: [s] });
    } else if (matchRange(s, input.range).length === 0) {
      recs.push({ kind: "add", title: s.name, category: s.category, score: strength(s), evidence: [s] });
    }
  }

  // Reduce calls need sales data: bottom half of sellers that no area signal supports.
  const withSales = input.range.filter((i) => i.weeklySales !== undefined);
  if (withSales.length >= 4) {
    const sorted = [...withSales].sort((a, b) => (a.weeklySales ?? 0) - (b.weeklySales ?? 0));
    const median = sorted[Math.floor(sorted.length / 2)].weeklySales ?? 0;
    for (const item of sorted) {
      if ((item.weeklySales ?? 0) > median) continue;
      if (signals.some((s) => matchRange(s, [item]).length > 0)) continue;
      const rank = sorted.indexOf(item) / sorted.length;
      recs.push({ kind: "reduce", title: item.name, category: item.category, score: 1 - rank, evidence: [] });
    }
  }

  const top = (kind: Recommendation["kind"], n: number) =>
    recs.filter((r) => r.kind === kind).sort((a, b) => b.score - a.score).slice(0, n);

  const chosen = [...top("add", 6), ...top("reduce", 3), ...top("partner", 2)].sort((a, b) => b.score - a.score);

  return {
    dataSource: provider.source,
    mode: "pipeline",
    location: input.location,
    area: [...signals].sort((a, b) => strength(b) - strength(a)).slice(0, 8),
    recommendations: chosen.map((r) => ({
      ...r,
      reason: templateReason(r, input.location, provider.source === "qloo" ? "Qloo" : "demo data"),
    })),
  };
}
