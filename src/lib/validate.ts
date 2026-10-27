// Input bounds so a single request cannot burn unbounded tokens or Qloo calls.
const MAX_TEXT = 120;
const MAX_CATEGORIES = 8;
const MAX_RANGE = 150;

const isText = (v: unknown, max = MAX_TEXT): v is string => typeof v === "string" && v.length > 0 && v.length <= max;

/** Returns an error message for an invalid shop payload, or null if it is acceptable. */
export function validateShop(input: unknown): string | null {
  const s = input as Record<string, unknown> | null;
  if (!s || typeof s !== "object") return "Invalid request body.";
  if (!isText(s.location)) return `location is required (max ${MAX_TEXT} characters).`;
  if (s.name !== undefined && typeof s.name === "string" && s.name.length > MAX_TEXT) return "name is too long.";
  if (s.referenceLocation !== undefined && s.referenceLocation !== "" && !isText(s.referenceLocation))
    return "referenceLocation is too long.";
  const cats = s.categories;
  if (!Array.isArray(cats) || cats.length > MAX_CATEGORIES || !cats.every((c) => isText(c, 40)))
    return `categories must be up to ${MAX_CATEGORIES} short names.`;
  const range = s.range;
  if (!Array.isArray(range) || range.length === 0 || range.length > MAX_RANGE)
    return `range must have 1 to ${MAX_RANGE} items.`;
  for (const item of range as Record<string, unknown>[]) {
    if (!item || !isText(item.name) || typeof item.category !== "string" || item.category.length > 40)
      return "each range item needs a name and a short category.";
    if (item.brand !== undefined && (typeof item.brand !== "string" || item.brand.length > MAX_TEXT))
      return "range item brand is too long.";
  }
  return null;
}

export function validateBaseline(input: unknown): string | null {
  const s = input as Record<string, unknown> | null;
  if (!s || typeof s !== "object") return "Invalid request body.";
  if (!isText(s.location)) return `location is required (max ${MAX_TEXT} characters).`;
  if (s.categories !== undefined && (!Array.isArray(s.categories) || s.categories.length > MAX_CATEGORIES))
    return `categories must be up to ${MAX_CATEGORIES} names.`;
  return null;
}
