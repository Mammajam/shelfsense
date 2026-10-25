import { runAgent } from "@/lib/agent";
import { analyze } from "@/lib/engine";
import { getProvider } from "@/lib/qloo";
import { polishReasons } from "@/lib/reasons";
import type { ShopInput } from "@/lib/types";

export async function POST(request: Request) {
  const input = (await request.json()) as ShopInput;
  if (!input?.location || !Array.isArray(input.range)) {
    return Response.json({ error: "location and range are required" }, { status: 400 });
  }
  const provider = getProvider();
  try {
    // Prefer the tool-calling agent; fall back to the deterministic pipeline if it
    // is unavailable (no Anthropic key) or fails to produce valid, grounded output.
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        return Response.json(await runAgent(input, provider));
      } catch (e) {
        console.error("agent failed, using pipeline:", (e as Error).message);
      }
    }
    const result = await analyze(input, provider);
    return Response.json(await polishReasons(result, input.name));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
