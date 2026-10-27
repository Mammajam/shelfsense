// Exploration helper: what does Qloo return for retail-relevant brand tags and locations?
// Usage: npx tsx --env-file=.env.local scripts/explore.ts
import { qlooGet } from "../src/lib/qloo/client";

type Tag = { id: string; name: string };
type Ent = { name: string; subtype?: string; query?: { affinity?: number }; tags?: Tag[] };

async function main() {
  for (const q of ["beauty", "skin care", "grocery", "snack", "household"]) {
    try {
      const d = await qlooGet<{ results: { tags: Tag[] } }>("/v2/tags", {
        "filter.query": q,
        "filter.parents.types": "urn:entity:brand",
        take: 8,
      });
      console.log("TAGS", q, "=>", d.results.tags.map((t) => `${t.id}|${t.name}`).join("  ;  "));
    } catch (e) {
      console.log("TAGS", q, "FAIL", (e as Error).message.slice(0, 200));
    }
  }

  const d = await qlooGet<{ results: { entities: Ent[] } }>("/v2/insights", {
    "filter.type": "urn:entity:brand",
    "signal.location.query": "Brooklyn, NY",
    take: 20,
  });
  const tagCounts = new Map<string, number>();
  for (const e of d.results.entities) for (const t of e.tags ?? []) tagCounts.set(t.id, (tagCounts.get(t.id) ?? 0) + 1);
  console.log(
    "BROOKLYN brand tag ids (top):",
    [...tagCounts].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k}x${v}`).join("  ;  "),
  );
}

main();
