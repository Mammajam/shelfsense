import Anthropic from "@anthropic-ai/sdk";
import type { AnalysisResult } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5";

/**
 * Rewrites each template reason in plain language for a shop owner, using only the
 * attached evidence. Falls back to the template reasons if no key or on any failure.
 */
export async function polishReasons(result: AnalysisResult, shopName: string): Promise<AnalysisResult> {
  if (!process.env.ANTHROPIC_API_KEY || result.recommendations.length === 0) return result;
  try {
    const client = new Anthropic();
    const payload = result.recommendations.map((r, i) => ({
      i,
      kind: r.kind,
      title: r.title,
      evidence: r.evidence.map((e) => ({
        name: e.name,
        affinity: e.affinity,
        lift: e.lift,
        call: e.call,
      })),
      draft: r.reason,
    }));
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system:
        "You write short, plain-language reasons for stocking recommendations to a small shop owner. " +
        "Use ONLY the facts in each item's evidence and draft. Never invent numbers or sources. " +
        "One or two sentences each. Reply with a JSON array of strings, same order and length as the input, nothing else.",
      messages: [
        { role: "user", content: `Shop: ${shopName}, area: ${result.location}\n${JSON.stringify(payload)}` },
      ],
    });
    const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const reasons = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1)) as unknown;
    if (!Array.isArray(reasons) || reasons.length !== result.recommendations.length) return result;
    return {
      ...result,
      recommendations: result.recommendations.map((r, i) => ({
        ...r,
        reason: typeof reasons[i] === "string" ? (reasons[i] as string) : r.reason,
      })),
    };
  } catch {
    return result;
  }
}

/** Plain LLM answer with no Qloo data, for the side-by-side demo. */
export async function baselineAdvice(shopName: string, location: string, categories: string[]): Promise<string> {
  const prompt = `I run a small shop called ${shopName} in ${location} selling ${categories.join(", ")}. What should I stock more or less of? Keep it under 120 words.`;
  if (!process.env.ANTHROPIC_API_KEY) {
    return "Stock seasonal items, keep best sellers well supplied, review slow lines monthly and ask customers what they want. (Generic example; set ANTHROPIC_API_KEY for a live answer.)";
  }
  const client = new Anthropic();
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });
  return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}
