import type { QlooProvider, TasteSignal } from "../types";
import { qlooGet } from "./client";

// Shape verified against real responses (fixtures/*-insights_location.json):
// results.entities[] with entity_id, name, subtype, query.affinity (0-1, saturates near 1).
interface RawEntity {
  entity_id?: string;
  name?: string;
  subtype?: string;
  query?: { affinity?: number };
}
interface InsightsResponse {
  results?: { entities?: RawEntity[] };
}
interface TagsResponse {
  results?: { tags?: { id: string; name: string }[] };
}

const TAKE = 20;

/** Merchant category -> Qloo brand genre tag (ids found via /v2/tags with filter.parents.types=brand). */
const CATEGORY_TAGS: Record<string, string> = {
  beauty: "urn:tag:genre:brand:health_and_beauty",
  skincare: "urn:tag:genre:brand:health_and_beauty:skincare",
  grocery: "urn:tag:genre:brand:food_and_beverage:food",
  food: "urn:tag:genre:brand:food_and_beverage:food",
  snacks: "urn:tag:genre:brand:food_and_beverage:food:packaged:snacks",
  drinks: "urn:tag:genre:brand:food_and_beverage:drinks",
  beverages: "urn:tag:genre:brand:food_and_beverage:drinks",
  household: "urn:tag:genre:brand:household",
};

/** Static map first, then a tag search restricted to brands. Undefined if Qloo has no such tag. */
export async function categoryTag(category: string): Promise<string | undefined> {
  const key = category.trim().toLowerCase();
  if (CATEGORY_TAGS[key]) return CATEGORY_TAGS[key];
  const res = await qlooGet<TagsResponse>("/v2/tags", {
    "filter.query": key,
    "filter.parents.types": "urn:entity:brand",
    take: 1,
  });
  return res.results?.tags?.[0]?.id;
}

export function parseEntities(
  res: InsightsResponse,
  type: TasteSignal["type"],
  category: string,
  call: TasteSignal["call"],
): TasteSignal[] {
  return (res.results?.entities ?? [])
    .filter((e) => e.name && e.entity_id)
    .map((e, i) => ({
      id: e.entity_id as string,
      name: e.name as string,
      type,
      category,
      affinity: e.query?.affinity ?? 0,
      rank: i + 1,
      source: "qloo" as const,
      call,
    }));
}

function brandsFor(area: string, tag: string) {
  return qlooGet<InsightsResponse>("/v2/insights", {
    "filter.type": "urn:entity:brand",
    "filter.tags": tag,
    "signal.location.query": area,
    take: TAKE,
  });
}

export const liveProvider: QlooProvider = {
  source: "qloo",

  async areaTaste(location, categories) {
    const cats = categories.length ? categories : ["beauty", "grocery", "household"];
    const perCategory = await Promise.all(
      cats.map(async (category) => {
        const tag = await categoryTag(category);
        return tag ? parseEntities(await brandsFor(location, tag), "brand", category, "insights") : [];
      }),
    );
    const venues = await qlooGet<InsightsResponse>("/v2/insights", {
      "filter.type": "urn:entity:place",
      "signal.location.query": location,
      "filter.location.query": location,
      take: 10,
    });
    return [...perCategory.flat(), ...parseEntities(venues, "place", "venues", "insights")];
  },

  /**
   * Distinctiveness vs a reference area. Qloo's affinity saturates near 1 for top results, so the
   * comparison is rank-based: lift = reference rank / area rank (capped at 3). A brand that is
   * absent from the reference's top results counts as ranked just beyond the list.
   */
  async compareAreas(_location, reference, signals) {
    const cats = [...new Set(signals.filter((s) => s.type === "brand").map((s) => s.category))];
    const refRanks = new Map<string, Map<string, number>>();
    await Promise.all(
      cats.map(async (category) => {
        const tag = await categoryTag(category);
        if (!tag) return;
        const ref = parseEntities(await brandsFor(reference, tag), "brand", category, "compare");
        refRanks.set(category, new Map(ref.map((s) => [s.id, s.rank ?? TAKE + 1])));
      }),
    );
    return signals.map((s) => {
      const ranks = refRanks.get(s.category);
      if (s.type !== "brand" || !ranks || !s.rank) return s;
      const refRank = ranks.get(s.id) ?? TAKE + 1;
      return { ...s, refRank, lift: Math.min(refRank / s.rank, 3), call: "compare" as const };
    });
  },
};
