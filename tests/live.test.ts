import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseEntities } from "../src/lib/qloo/live";

// Real Qloo response saved by scripts/qloo-spike.ts.
const fixture = JSON.parse(readFileSync("fixtures/brooklyn-ny-insights_location.json", "utf8"));

test("parseEntities reads a real Qloo insights response", () => {
  const signals = parseEntities(fixture, "brand", "media", "insights");
  assert.equal(signals.length, 20);
  const first = signals[0];
  assert.equal(first.name, "The New Yorker");
  assert.equal(first.id, "399654ED-B417-49C5-A9AA-8682BE35A85D");
  assert.equal(first.source, "qloo");
  assert.ok(first.affinity > 0.99 && first.affinity <= 1);
});

test("parseEntities tolerates empty or malformed responses", () => {
  assert.deepEqual(parseEntities({}, "brand", "x", "insights"), []);
  assert.deepEqual(parseEntities({ results: { entities: [{ name: "no id" }] } }, "brand", "x", "insights"), []);
});
