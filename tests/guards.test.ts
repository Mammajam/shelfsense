import assert from "node:assert/strict";
import { test } from "node:test";
import { rateLimit } from "../src/lib/ratelimit";
import { validateShop } from "../src/lib/validate";

const win = { limit: 3, windowMs: 1000 };

test("rateLimit allows up to the limit, then blocks with a retry time", () => {
  const t = 1_000_000;
  for (let i = 0; i < 3; i++) assert.equal(rateLimit("a", win, t + i).ok, true);
  const blocked = rateLimit("a", win, t + 10);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfter >= 1);
});

test("rateLimit recovers after the window and keeps clients separate", () => {
  const t = 2_000_000;
  for (let i = 0; i < 3; i++) rateLimit("b", win, t);
  assert.equal(rateLimit("b", win, t + 1).ok, false);
  assert.equal(rateLimit("c", win, t + 1).ok, true);
  assert.equal(rateLimit("b", win, t + 1001).ok, true);
});

const shop = {
  name: "s",
  location: "Brooklyn, NY",
  categories: ["beauty"],
  range: [{ name: "Lotion", category: "beauty" }],
};

test("validateShop accepts a normal payload and rejects oversized or malformed ones", () => {
  assert.equal(validateShop(shop), null);
  assert.match(validateShop(null) ?? "", /Invalid/);
  assert.match(validateShop({ ...shop, location: "" }) ?? "", /location/);
  assert.match(validateShop({ ...shop, location: "x".repeat(500) }) ?? "", /location/);
  assert.match(validateShop({ ...shop, categories: Array(20).fill("a") }) ?? "", /categories/);
  assert.match(validateShop({ ...shop, range: [] }) ?? "", /range/);
  assert.match(
    validateShop({ ...shop, range: Array.from({ length: 500 }, () => ({ name: "x", category: "y" })) }) ?? "",
    /range/,
  );
  assert.match(validateShop({ ...shop, range: [{ category: "y" }] }) ?? "", /range item/);
});
