// Phase 1 spike: run entity search, a basic Insights query and a location Insights query,
// save raw responses to fixtures/ and print a short coverage summary.
// Usage: npx tsx --env-file=.env.local scripts/qloo-spike.ts "<city>" [brandQuery]
import { mkdirSync, writeFileSync } from "node:fs";
import { qlooGet, QlooError } from "../src/lib/qloo/client";

const city = process.argv[2] ?? "Brooklyn, NY";
const brandQuery = process.argv[3] ?? "Nivea";
const slug = city.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const calls: Record<string, () => Promise<unknown>> = {
  search: () => qlooGet("/search", { query: brandQuery }),
  insights_basic: () =>
    qlooGet("/v2/insights", { "filter.type": "urn:entity:brand", take: 10 }),
  insights_location: () =>
    qlooGet("/v2/insights", {
      "filter.type": "urn:entity:brand",
      "signal.location.query": city,
      take: 20,
    }),
  tags: () => qlooGet("/v2/tags", { "filter.query": "beauty" }),
};

mkdirSync("fixtures", { recursive: true });

async function main() {
  for (const [name, run] of Object.entries(calls)) {
    try {
      const data = await run();
      const file = `fixtures/${slug}-${name}.json`;
      writeFileSync(file, JSON.stringify(data, null, 2));
      console.log(`OK   ${name} -> ${file} (${JSON.stringify(data).length} bytes)`);
    } catch (e) {
      if (e instanceof QlooError) console.log(`FAIL ${name}: HTTP ${e.status} ${e.body.slice(0, 200)}`);
      else console.log(`FAIL ${name}: ${(e as Error).message}`);
    }
  }
}

main();
