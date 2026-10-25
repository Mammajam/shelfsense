import assert from "node:assert/strict";
import { test } from "node:test";
import type Anthropic from "@anthropic-ai/sdk";
import { type AgentClient, runAgent } from "../src/lib/agent";
import { parseRangeCsv } from "../src/lib/mapper";
import { mockProvider } from "../src/lib/qloo/mock";

const input = {
  name: "t",
  location: "Brooklyn",
  categories: ["beauty", "grocery", "household"],
  referenceLocation: "NYC",
  range: parseRangeCsv(`name,brand,category,weekly_sales
Nivea Body Lotion,Nivea,beauty,40
Basmati Rice,,grocery,55
Plastic Buckets,,household,3`),
};

type Step = { name: string; input: Record<string, unknown> };

/** Scripted stand-in for Claude: each turn emits the next tool call, and records every tool_result it sees. */
function scripted(steps: Step[]) {
  const seen: { content: string; is_error?: boolean }[] = [];
  let turn = 0;
  const client: AgentClient = {
    messages: {
      async create(params) {
        const last = params.messages[params.messages.length - 1];
        if (turn > 0 && Array.isArray(last.content)) {
          for (const b of last.content as Anthropic.ToolResultBlockParam[])
            seen.push({ content: String(b.content), is_error: b.is_error });
        }
        const step = steps[turn++];
        if (!step) return { content: [{ type: "text", text: "done" }] } as unknown as Anthropic.Message;
        return {
          content: [{ type: "tool_use", id: `t${turn}`, name: step.name, input: step.input }],
        } as unknown as Anthropic.Message;
      },
    },
  };
  return { client, seen };
}

const discover: Step[] = [
  { name: "get_area_taste", input: {} },
  { name: "compare_to_reference", input: { reference: "NYC" } },
  { name: "check_range_coverage", input: {} },
];

test("agent runs the Qloo tools in order and returns grounded recommendations", async () => {
  const { client } = scripted([
    ...discover,
    {
      name: "submit_recommendations",
      input: {
        recommendations: [
          { kind: "add", title: "Oat milk", signal_id: "mock-oat-milk", reason: "82% affinity, 1.9x the city." },
          { kind: "partner", title: "Campus Coffee Roasters", signal_id: "mock-campus-coffee-roasters", reason: "Shared audience." },
          { kind: "reduce", title: "Plastic Buckets", reason: "Nothing in the area supports it." },
        ],
      },
    },
  ]);
  const res = await runAgent(input, mockProvider, client);
  assert.equal(res.mode, "agent");
  assert.deepEqual(res.trace?.map((t) => t.tool), [
    "get_area_taste",
    "compare_to_reference",
    "check_range_coverage",
    "submit_recommendations",
  ]);
  assert.equal(res.recommendations.length, 3);
  const add = res.recommendations.find((r) => r.kind === "add");
  assert.equal(add?.evidence[0].name, "Oat milk");
  assert.ok((add?.evidence[0].lift ?? 0) > 1, "evidence carries the compare lift");
});

test("agent rejects recommendations not grounded in tool results, then accepts a corrected list", async () => {
  const { client, seen } = scripted([
    ...discover,
    {
      name: "submit_recommendations",
      input: {
        recommendations: [
          { kind: "add", title: "Nivea", signal_id: "mock-nivea", reason: "already stocked" },
          { kind: "add", title: "Made up", signal_id: "mock-nope", reason: "invented" },
          { kind: "reduce", title: "Not in range", reason: "x" },
        ],
      },
    },
    {
      name: "submit_recommendations",
      input: { recommendations: [{ kind: "add", title: "Cold brew", signal_id: "mock-cold-brew", reason: "78% affinity." }] },
    },
  ]);
  const res = await runAgent(input, mockProvider, client);
  const rejected = seen.find((s) => s.content.includes('"ok":false'));
  assert.ok(rejected, "first submit is rejected");
  assert.match(rejected.content, /not a gap/);
  assert.match(rejected.content, /unknown signal_id/);
  assert.match(rejected.content, /exact range item/);
  assert.deepEqual(res.recommendations.map((r) => r.title), ["Cold brew"]);
});

test("tool misuse returns an error result instead of crashing", async () => {
  const { client, seen } = scripted([
    { name: "check_range_coverage", input: {} },
    ...discover,
    { name: "submit_recommendations", input: { recommendations: [{ kind: "add", title: "Oat milk", signal_id: "mock-oat-milk", reason: "ok" }] } },
  ]);
  await runAgent(input, mockProvider, client);
  assert.equal(seen[0].is_error, true);
  assert.match(seen[0].content, /get_area_taste first/);
});

test("agent that never submits valid output throws so the caller can fall back", async () => {
  const { client } = scripted([...discover]);
  await assert.rejects(runAgent(input, mockProvider, client), /without submitting/);
});
