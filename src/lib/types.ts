export interface RangeItem {
  name: string;
  brand?: string;
  category: string;
  weeklySales?: number;
}

export interface ShopInput {
  name: string;
  location: string;
  categories: string[];
  range: RangeItem[];
  /** Reference area for the Compare stage, e.g. the wider city. */
  referenceLocation?: string;
}

/** One piece of taste evidence about an area, normalised from a Qloo response. */
export interface TasteSignal {
  id: string;
  name: string;
  type: "brand" | "tag" | "place";
  category: string;
  /** 0-1 affinity of the area's audience for this entity. */
  affinity: number;
  /** 1-based position within its category's results for this area (live Qloo only). */
  rank?: number;
  /** Position in the reference area's results; beyond the list length if it did not appear. */
  refRank?: number;
  /** How much stronger the signal is here than in the reference area (1 = same). */
  lift?: number;
  source: "qloo" | "mock";
  /** Which Qloo call produced it, so reasons can cite it. */
  call: "search" | "tags" | "insights" | "compare";
}

export interface Recommendation {
  kind: "add" | "reduce" | "partner";
  title: string;
  category: string;
  score: number;
  evidence: TasteSignal[];
  reason: string;
}

export interface AnalysisResult {
  dataSource: "qloo" | "mock";
  location: string;
  /** "agent" when Claude drove the Qloo tools; "pipeline" for the deterministic fallback. */
  mode?: "agent" | "pipeline";
  /** Tool calls the agent made, in order. */
  trace?: { tool: string; summary: string }[];
  /** The area's strongest taste signals, for the area view. */
  area: TasteSignal[];
  recommendations: Recommendation[];
}

/** What the engine needs from Qloo. Live and mock implementations satisfy it. */
export interface QlooProvider {
  readonly source: "qloo" | "mock";
  /** Stages 1-2: area taste profile (Insights with location signal). */
  areaTaste(location: string, categories: string[]): Promise<TasteSignal[]>;
  /** Stage 3: how this area differs from a reference area (Analysis Compare). */
  compareAreas(location: string, reference: string, signals: TasteSignal[]): Promise<TasteSignal[]>;
}
