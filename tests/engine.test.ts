import assert from "node:assert/strict";
import { test } from "node:test";
import { analyze } from "../src/lib/engine";
import { matchRange, parseRangeCsv } from "../src/lib/mapper";
import { mockProvider } from "../src/lib/qloo/mock";

const csv = `name,brand,category,weekly_sales
Nivea Body Lotion,Nivea,beauty,40
Generic Face Cream,,beauty,6
Basmati Rice,,grocery,55
Instant Noodles,,grocery,48
Plastic Buckets,,household,3
Candles,,household,4`;

test("parseRangeCsv reads optional brand and sales", () => {
  const r = parseRangeCsv(csv);
  assert.equal(r.length, 6);
  assert.equal(r[0].brand, "Nivea");
  assert.equal(r[1].brand, undefined);
  assert.equal(r[2].weeklySales, 55);
});

test("matchRange covers brands already stocked and ignores places", () => {
  const range = parseRangeCsv(csv);
  const nivea = { id: "x", name: "Nivea", type: "brand", category: "beauty", affinity: 1, source: "mock", call: "insights" } as const;
  const venue = { ...nivea, type: "place" } as const;
  assert.equal(matchRange(nivea, range).length, 1);
  assert.equal(matchRange(venue, range).length, 0);
});

test("analyze ranks gaps, skips covered brands, cites evidence", async () => {
  const res = await analyze(
    { name: "t", location: "Brooklyn", categories: ["beauty", "grocery", "household"], range: parseRangeCsv(csv), referenceLocation: "NYC" },
    mockProvider,
  );
  const titles = res.recommendations.map((r) => r.title);
  assert.ok(!titles.includes("Nivea"), "already-stocked brand must not be a gap");
  assert.ok(titles.includes("Oat milk"));
  assert.ok(res.recommendations.every((r) => r.kind === "reduce" || r.evidence.length > 0));
  const scores = res.recommendations.map((r) => r.score);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
});

test("reduce calls need sales data", async () => {
  const noSales = parseRangeCsv(csv).map((i) => ({ ...i, weeklySales: undefined }));
  const res = await analyze(
    { name: "t", location: "Brooklyn", categories: ["beauty"], range: noSales },
    mockProvider,
  );
  assert.ok(res.recommendations.every((r) => r.kind !== "reduce"));
});
