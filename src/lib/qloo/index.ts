import type { QlooProvider } from "../types";
import { liveProvider } from "./live";
import { mockProvider } from "./mock";

/** Live Qloo when a key is set (unless QLOO_MODE=mock), otherwise demo data. */
export function getProvider(): QlooProvider {
  if (process.env.QLOO_API_KEY && process.env.QLOO_MODE !== "mock") return liveProvider;
  return mockProvider;
}
