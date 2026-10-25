import type { QlooProvider, TasteSignal } from "../types";

// Invented demo data so the app runs end to end before a Qloo key arrives.
// It is NOT Qloo output and the UI labels it as demo data.
const m = (
  name: string,
  type: TasteSignal["type"],
  category: string,
  affinity: number,
  lift?: number,
): TasteSignal => ({
  id: `mock-${name.toLowerCase().replace(/\W+/g, "-")}`,
  name,
  type,
  category,
  affinity,
  lift,
  source: "mock",
  call: "insights",
});

const SIGNALS: TasteSignal[] = [
  m("Oat milk", "tag", "grocery", 0.82, 1.9),
  m("Cold brew", "tag", "grocery", 0.78, 2.1),
  m("Vegan snacks", "tag", "grocery", 0.74, 1.6),
  m("Fenty Beauty", "brand", "beauty", 0.71, 1.4),
  m("The Ordinary", "brand", "beauty", 0.69, 1.7),
  m("CeraVe", "brand", "beauty", 0.64, 1.2),
  m("Stationery", "tag", "household", 0.6, 1.8),
  m("Study desk lamps", "tag", "household", 0.55, 1.5),
  m("Nivea", "brand", "beauty", 0.31, 0.7),
  m("Campus Coffee Roasters", "place", "venues", 0.77, 1.9),
  m("Fresh Fold Laundromat", "place", "venues", 0.58, 1.1),
];

export const mockProvider: QlooProvider = {
  source: "mock",
  async areaTaste(_location, categories) {
    const wanted = new Set(categories.map((c) => c.toLowerCase()));
    return SIGNALS.filter((s) => s.type === "place" || wanted.size === 0 || wanted.has(s.category));
  },
  async compareAreas(_location, _reference, signals) {
    return signals.map((s) => (s.lift ? { ...s, call: "compare" as const } : s));
  },
};
