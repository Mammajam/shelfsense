import { baselineAdvice } from "@/lib/reasons";

export async function POST(request: Request) {
  const { name, location, categories } = (await request.json()) as {
    name: string;
    location: string;
    categories: string[];
  };
  if (!location) return Response.json({ error: "location is required" }, { status: 400 });
  try {
    return Response.json({ advice: await baselineAdvice(name, location, categories ?? []) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
