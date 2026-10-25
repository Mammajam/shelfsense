import type { RangeItem, TasteSignal } from "./types";

export const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** Parse a supplier/range CSV with header `name,brand,category,weekly_sales` (brand and sales optional). */
export function parseRangeCsv(csv: string): RangeItem[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]).map(norm);
  const col = (names: string[]) => header.findIndex((h) => names.includes(h));
  const iName = col(["name", "item", "product"]);
  const iBrand = col(["brand"]);
  const iCat = col(["category"]);
  const iSales = col(["weekly sales", "sales", "weekly units"]);
  if (iName < 0 || iCat < 0) return [];

  return lines.slice(1).flatMap((line) => {
    const f = splitCsvLine(line);
    const name = f[iName];
    if (!name) return [];
    const sales = iSales >= 0 ? Number(f[iSales]) : NaN;
    return [
      {
        name,
        brand: iBrand >= 0 && f[iBrand] ? f[iBrand] : undefined,
        category: f[iCat] ?? "",
        weeklySales: Number.isFinite(sales) ? sales : undefined,
      },
    ];
  });
}

/**
 * Catalog mapper: which range items does a taste signal already cover?
 * Brands match on brand/name; tags match on name or category; places never match range items.
 */
export function matchRange(signal: TasteSignal, range: RangeItem[]): RangeItem[] {
  if (signal.type === "place") return [];
  const s = norm(signal.name);
  return range.filter((item) => {
    const name = norm(item.name);
    const brand = item.brand ? norm(item.brand) : "";
    const category = norm(item.category);
    if (signal.type === "brand") return brand === s || name === s || name.includes(s);
    return name.includes(s) || category === s || (s.length >= 4 && category.includes(s));
  });
}
