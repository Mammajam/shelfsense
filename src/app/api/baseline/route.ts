import { limitResponse } from "@/lib/ratelimit";
import { baselineAdvice } from "@/lib/reasons";
import { validateBaseline } from "@/lib/validate";

export async function POST(request: Request) {
  const limited = limitResponse(request, "baseline");
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    location: string;
    categories?: string[];
  } | null;
  const invalid = validateBaseline(body);
  if (invalid || !body) return Response.json({ error: invalid ?? "Invalid request body." }, { status: 400 });

  try {
    return Response.json({ advice: await baselineAdvice(body.name ?? "my shop", body.location, body.categories ?? []) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
