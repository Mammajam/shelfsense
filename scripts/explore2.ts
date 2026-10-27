// Category-filtered location Insights, to see if brands become retail-relevant and vary by area.
// Usage: npx tsx --env-file=.env.local scripts/explore2.ts
import { qlooGet } from "../src/lib/qloo/client";

type Tag = { id: string; name: string };
type Ent = { name: string; subtype?: string; query?: { affinity?: number } };
const ents = (d: { results?: { entities?: Ent[] } }) => d.results?.entities ?? [];

async function tags(q: string) {
  try {
    const d = await qlooGet<{ results: { tags: Tag[] } }>("/v2/tags", {
      "filter.query": q,
      "filter.parents.types": "urn:entity:brand",
      take: 6,
    });
    console.log("TAGS", q, "=>", d.results.tags.map((t) => t.id).join(" ; "));
  } catch (e) {
    console.log("TAGS", q, "FAIL", (e as Error).message.slice(0, 160));
  }
}

async function brands(area: string, tag: string) {
  try {
    const d = await qlooGet<{ results: { entities: Ent[] } }>("/v2/insights", {
      "filter.type": "urn:entity:brand",
      "filter.tags": tag,
      "signal.location.query": area,
      take: 8,
    });
    console.log(`BRANDS ${area} | ${tag.split(":").slice(3).join(":")} =>`, ents(d).map((e) => `${e.name} ${e.query?.affinity?.toFixed(2)}`).join(" ; "));
  } catch (e) {
    console.log(`BRANDS ${area} | ${tag} FAIL`, (e as Error).message.slice(0, 200));
  }
}

async function places(area: string) {
  try {
    const d = await qlooGet<{ results: { entities: Ent[] } }>("/v2/insights", {
      "filter.type": "urn:entity:place",
      "signal.location.query": area,
      "filter.location.query": area,
      take: 6,
    });
    console.log(`PLACES ${area} =>`, ents(d).map((e) => `${e.name} ${e.query?.affinity?.toFixed(2)}`).join(" ; "));
  } catch (e) {
    console.log(`PLACES ${area} FAIL`, (e as Error).message.slice(0, 200));
  }
}

async function main() {
  for (const q of ["food", "beverage", "drink", "supermarket", "cosmetics"]) await tags(q);
  const cats = [
    "urn:tag:genre:brand:health_and_beauty:skincare",
    "urn:tag:genre:brand:food_and_beverage:food:packaged:snacks",
    "urn:tag:genre:brand:household",
  ];
  for (const area of ["Brooklyn, NY", "Harlem, NY"]) {
    for (const c of cats) await brands(area, c);
    await places(area);
  }
}

main();
