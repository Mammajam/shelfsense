// Thin Qloo HTTP client. Endpoint paths and parameter names below are from memory
// of the Qloo docs and must be confirmed against the Parameter Reference (plan phase 1).
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE_URL = process.env.QLOO_BASE_URL ?? "https://hackathon.api.qloo.com";
const CACHE_DIR = path.join(tmpdir(), "shelfsense-qloo-cache");

export class QlooError extends Error {
  constructor(
    public status: number,
    public body: string,
    public url: string,
  ) {
    super(`Qloo ${status} for ${url}: ${body.slice(0, 300)}`);
  }
}

export type Params = Record<string, string | number | undefined>;

async function readCache(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch {
    return null;
  }
}

/** GET with an on-disk response cache (set QLOO_CACHE=off to disable). */
export async function qlooGet<T = unknown>(path_: string, params: Params = {}): Promise<T> {
  const key = process.env.QLOO_API_KEY;
  if (!key) throw new Error("QLOO_API_KEY is not set (copy .env.example to .env.local)");

  const url = new URL(path_, BASE_URL);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  const useCache = process.env.QLOO_CACHE !== "off";
  const file = path.join(CACHE_DIR, createHash("sha1").update(url.toString()).digest("hex") + ".json");
  if (useCache) {
    const hit = await readCache(file);
    if (hit) return JSON.parse(hit) as T;
  }

  const res = await fetch(url, { headers: { "X-Api-Key": key, accept: "application/json" } });
  const text = await res.text();
  if (!res.ok) throw new QlooError(res.status, text, url.toString());

  if (useCache) {
    await mkdir(CACHE_DIR, { recursive: true }).catch(() => {});
    await writeFile(file, text).catch(() => {});
  }
  return JSON.parse(text) as T;
}
