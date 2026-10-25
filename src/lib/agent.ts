import Anthropic from "@anthropic-ai/sdk";
import { matchRange } from "./mapper";
import type { AnalysisResult, QlooProvider, Recommendation, ShopInput, TasteSignal } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5";
const MAX_TURNS = 8;

/** The slice of the Anthropic client the loop needs, so tests can inject a scripted one. */
export interface AgentClient {
  messages: { create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message> };
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_area_taste",
    description:
      "Qloo Insights with a location signal: returns the taste signals (brands, tags, venues) with affinity (0-1) for the shop's area. Call this first.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "compare_to_reference",
    description:
      "Qloo comparison of the shop's area against a reference area (e.g. the wider city). Adds a lift (>1 means stronger here than in the reference). Call after get_area_taste.",
    input_schema: {
      type: "object",
      properties: { reference: { type: "string", description: "Reference area name" } },
      required: ["reference"],
    },
  },
  {
    name: "check_range_coverage",
    description:
      "Matches the area's taste signals against the shop's current range. Returns which signals are gaps (nothing in range covers them), which are covered, and range items that no signal supports.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "submit_recommendations",
    description:
      "Submit the final ranked list. 'add' must cite a gap signal_id, 'partner' a venue signal_id, 'reduce' an exact range item name (title). Reasons may only use facts from tool results. Invalid items are rejected with errors; fix and resubmit.",
    input_schema: {
      type: "object",
      properties: {
        recommendations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              kind: { type: "string", enum: ["add", "reduce", "partner"] },
              title: { type: "string" },
              signal_id: { type: "string" },
              reason: { type: "string" },
            },
            required: ["kind", "title", "reason"],
          },
        },
      },
      required: ["recommendations"],
    },
  },
];

const SYSTEM =
  "You are ShelfSense, an agent that tells an independent shop owner what to stock. " +
  "Work in this order: get_area_taste, compare_to_reference (if a reference area is given), check_range_coverage, then submit_recommendations. " +
  "Rank by strength of evidence (affinity and lift), most important first; at most 6 'add', 3 'reduce' and 2 'partner'. " +
  "Every recommendation must come from tool results. Never invent numbers, brands or venues. " +
  "Each reason is one or two plain sentences for a shop owner and cites the figures (affinity %, lift) from the tool results. " +
  "Only recommend 'reduce' if check_range_coverage lists unsupported items with sales data.";

interface Session {
  input: ShopInput;
  provider: QlooProvider;
  signals: Map<string, TasteSignal>;
  trace: { tool: string; summary: string }[];
  submitted?: Recommendation[];
}

const compact = (s: TasteSignal) => ({
  id: s.id,
  name: s.name,
  type: s.type,
  category: s.category,
  affinity: Number(s.affinity.toFixed(2)),
  ...(s.lift ? { lift: Number(s.lift.toFixed(2)) } : {}),
});

const strength = (s: TasteSignal) => s.affinity * (s.lift ?? 1);

async function runTool(session: Session, name: string, args: Record<string, unknown>): Promise<unknown> {
  const { input, provider, signals } = session;
  switch (name) {
    case "get_area_taste": {
      const found = await provider.areaTaste(input.location, input.categories);
      found.forEach((s) => signals.set(s.id, s));
      session.trace.push({ tool: name, summary: `${found.length} taste signals for ${input.location}` });
      return found.map(compact);
    }
    case "compare_to_reference": {
      if (signals.size === 0) throw new Error("Call get_area_taste first.");
      const reference = String(args.reference ?? input.referenceLocation ?? "");
      if (!reference) throw new Error("A reference area is required.");
      const compared = await provider.compareAreas(input.location, reference, [...signals.values()]);
      compared.forEach((s) => signals.set(s.id, s));
      session.trace.push({ tool: name, summary: `compared ${input.location} with ${reference}` });
      return compared.filter((s) => s.lift).map((s) => ({ id: s.id, lift: Number((s.lift ?? 1).toFixed(2)) }));
    }
    case "check_range_coverage": {
      if (signals.size === 0) throw new Error("Call get_area_taste first.");
      const all = [...signals.values()];
      const gaps = all.filter((s) => s.type !== "place" && matchRange(s, input.range).length === 0);
      const covered = all
        .filter((s) => s.type !== "place" && matchRange(s, input.range).length > 0)
        .map((s) => ({ id: s.id, items: matchRange(s, input.range).map((i) => i.name) }));
      const unsupported = input.range
        .filter((i) => !all.some((s) => matchRange(s, [i]).length > 0))
        .map((i) => ({ name: i.name, weekly_sales: i.weeklySales ?? null }));
      session.trace.push({ tool: name, summary: `${gaps.length} gaps, ${covered.length} covered` });
      return { gaps: gaps.map((s) => s.id), covered, unsupported_range_items: unsupported };
    }
    case "submit_recommendations": {
      const list = Array.isArray(args.recommendations) ? (args.recommendations as Record<string, unknown>[]) : [];
      const errors: string[] = [];
      const accepted: Recommendation[] = [];
      for (const r of list) {
        const kind = r.kind as Recommendation["kind"];
        const title = String(r.title ?? "");
        const reason = String(r.reason ?? "");
        const signal = signals.get(String(r.signal_id ?? ""));
        if (!reason) {
          errors.push(`"${title}": reason is required.`);
        } else if (kind === "reduce") {
          const item = input.range.find((i) => i.name === title);
          if (!item) errors.push(`"${title}": reduce must use an exact range item name.`);
          else
            accepted.push({ kind, title, category: item.category, score: 0.5, evidence: [], reason });
        } else if (kind === "add" || kind === "partner") {
          if (!signal) errors.push(`"${title}": unknown signal_id "${String(r.signal_id ?? "")}".`);
          else if (kind === "add" && (signal.type === "place" || matchRange(signal, input.range).length > 0))
            errors.push(`"${title}": signal ${signal.id} is not a gap in the shop's range.`);
          else if (kind === "partner" && signal.type !== "place")
            errors.push(`"${title}": partner must cite a venue signal.`);
          else accepted.push({ kind, title, category: signal.category, score: strength(signal), evidence: [signal], reason });
        } else {
          errors.push(`"${title}": unknown kind "${String(kind)}".`);
        }
      }
      if (errors.length > 0 || accepted.length === 0) {
        session.trace.push({ tool: name, summary: `rejected: ${errors.length || 1} problem(s)` });
        return { ok: false, errors: errors.length ? errors : ["No recommendations submitted."] };
      }
      session.submitted = accepted.sort((a, b) => b.score - a.score);
      session.trace.push({ tool: name, summary: `${accepted.length} recommendations accepted` });
      return { ok: true };
    }
    default:
      throw new Error(`Unknown tool ${name}`);
  }
}

/** Claude drives the Qloo tools; recommendations are validated against tool results before acceptance. */
export async function runAgent(
  input: ShopInput,
  provider: QlooProvider,
  client: AgentClient = new Anthropic(),
): Promise<AnalysisResult> {
  const session: Session = { input, provider, signals: new Map(), trace: [] };
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content:
        `Shop: ${input.name}\nArea: ${input.location}\nCategories: ${input.categories.join(", ")}\n` +
        `Reference area: ${input.referenceLocation ?? "none"}\n` +
        `Range (${input.range.length} items): ${JSON.stringify(input.range)}`,
    },
  ];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: SYSTEM,
      tools: TOOLS,
      messages,
    });
    messages.push({ role: "assistant", content: res.content as Anthropic.ContentBlockParam[] });

    const calls = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (calls.length === 0) break;

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const call of calls) {
      try {
        const out = await runTool(session, call.name, (call.input ?? {}) as Record<string, unknown>);
        results.push({ type: "tool_result", tool_use_id: call.id, content: JSON.stringify(out) });
      } catch (e) {
        results.push({ type: "tool_result", tool_use_id: call.id, content: (e as Error).message, is_error: true });
      }
    }
    messages.push({ role: "user", content: results });

    if (session.submitted) {
      return {
        dataSource: provider.source,
        location: input.location,
        mode: "agent",
        trace: session.trace,
        area: [...session.signals.values()].sort((a, b) => strength(b) - strength(a)).slice(0, 8),
        recommendations: session.submitted,
      };
    }
  }
  throw new Error("Agent finished without submitting valid recommendations");
}
