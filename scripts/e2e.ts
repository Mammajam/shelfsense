// End-to-end run on live Qloo data: pipeline for two areas, then the Claude agent.
// Usage: npx tsx --env-file=.env.local scripts/e2e.ts [agent]
import { runAgent } from "../src/lib/agent";
import { analyze } from "../src/lib/engine";
import { parseRangeCsv } from "../src/lib/mapper";
import { liveProvider } from "../src/lib/qloo/live";

const range = parseRangeCsv(`name,brand,category,weekly_sales
Nivea Body Lotion,Nivea,beauty,40
Generic Face Cream,,beauty,6
Basmati Rice 5kg,,grocery,55
Instant Noodles,,grocery,48
Kind Bars,Kind Snacks,grocery,20
Dish Soap,,household,12
Plastic Buckets,,household,3
Candles,,household,4`);

const base = { name: "Corner General Store", categories: ["beauty", "grocery", "household"], range };

function show(r: Awaited<ReturnType<typeof analyze>>) {
  console.log(`\n[${r.mode}] ${r.location} (${r.dataSource})`);
  for (const x of r.recommendations.slice(0, 8)) {
    const e = x.evidence[0];
    console.log(` ${x.kind.padEnd(7)} ${x.title.padEnd(26)} ${e ? `rank ${e.rank ?? "-"} ref ${e.refRank ?? "-"} lift ${e.lift?.toFixed(2) ?? "-"}` : ""}`);
  }
}

async function main() {
  for (const location of ["Brooklyn, NY", "Harlem, NY"]) {
    show(await analyze({ ...base, location, referenceLocation: "New York, NY" }, liveProvider));
  }
  if (process.argv[2] === "agent") {
    const r = await runAgent({ ...base, location: "Brooklyn, NY", referenceLocation: "New York, NY" }, liveProvider);
    show(r);
    console.log("TRACE:", r.trace?.map((t) => `${t.tool} (${t.summary})`).join(" -> "));
    for (const x of r.recommendations.slice(0, 3)) console.log(` - ${x.title}: ${x.reason}`);
  }
}

main().catch((e) => console.error("FAILED:", e.message));
