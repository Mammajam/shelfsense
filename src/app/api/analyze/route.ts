import { runAgent } from "@/lib/agent";
import { analyze } from "@/lib/engine";
import { getProvider } from "@/lib/qloo";
import { limitResponse } from "@/lib/ratelimit";
import { polishReasons } from "@/lib/reasons";
import type { ShopInput } from "@/lib/types";
import { validateShop } from "@/lib/validate";

export async function POST(request: Request) {
  const limited = limitResponse(request, "analyze");
  if (limited) return limited;

  const input = (await request.json().catch(() => null)) as ShopInput | null;
  const invalid = validateShop(input);
  if (invalid || !input) return Response.json({ error: invalid ?? "Invalid request body." }, { status: 400 });

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
