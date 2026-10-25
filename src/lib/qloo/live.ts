import type { QlooProvider, TasteSignal } from "../types";
import { qlooGet } from "./client";

// Response shape is assumed (results.entities[] with name, entity_id, query.affinity).
// Verify against the first real fixtures from scripts/qloo-spike.ts and adjust parseEntities.
interface RawEntity {
  entity_id?: string;
  name?: string;
  query?: { affinity?: number };
  tags?: { name?: string }[];
}
interface InsightsResponse {
  results?: { entities?: RawEntity[] };
}

function parseEntities(
  res: InsightsResponse,
  type: TasteSignal["type"],
  category: string,
  call: TasteSignal["call"],
): TasteSignal[] {
  return (res.results?.entities ?? [])
    .filter((e) => e.name)
    .map((e, i) => ({
      id: e.entity_id ?? `${type}-${category}-${i}`,
      name: e.name as string,
      type,
      category,
      affinity: e.query?.affinity ?? 0,
      source: "qloo" as const,
      call,
    }));
}

export const liveProvider: QlooProvider = {
  source: "qloo",

  async areaTaste(location, categories) {
    const types: [string, TasteSignal["type"]][] = [
      ["urn:entity:brand", "brand"],
      ["urn:entity:place", "place"],
    ];
    const out: TasteSignal[] = [];
    for (const [filterType, type] of types) {
      const res = await qlooGet<InsightsResponse>("/v2/insights", {
        "filter.type": filterType,
        "signal.location.query": location,
        take: 20,
      });
      out.push(...parseEntities(res, type, type === "brand" ? (categories[0] ?? "general") : "venues", "insights"));
    }
    return out;
  },

  async compareAreas(location, reference, signals) {
    // Placeholder for Analysis Compare: the endpoint is not yet confirmed. Approximate lift
    // by comparing affinity here against the same query for the reference area.
    const res = await qlooGet<InsightsResponse>("/v2/insights", {
      "filter.type": "urn:entity:brand",
      "signal.location.query": reference,
      take: 50,
    });
    const ref = new Map(parseEntities(res, "brand", "", "compare").map((s) => [s.name.toLowerCase(), s.affinity]));
    return signals.map((s) => {
      const base = ref.get(s.name.toLowerCase());
      return base && base > 0 ? { ...s, lift: s.affinity / base, call: "compare" as const } : s;
    });
  },
};
