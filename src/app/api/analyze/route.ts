import { analyze } from "@/lib/engine";
import { getProvider } from "@/lib/qloo";
import { polishReasons } from "@/lib/reasons";
import type { ShopInput } from "@/lib/types";

export async function POST(request: Request) {
  const input = (await request.json()) as ShopInput;
  if (!input?.location || !Array.isArray(input.range)) {
    return Response.json({ error: "location and range are required" }, { status: 400 });
  }
  try {
    const result = await analyze(input, getProvider());
    return Response.json(await polishReasons(result, input.name));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
