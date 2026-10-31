/** The first value of another script's export answer (a Lua multi-return arrives as an array). */
export function firstOf(raw: unknown): unknown {
  return Array.isArray(raw) ? raw[0] : raw;
}

/** A finite balance from another script's export; null otherwise. */
export function balanceOf(raw: unknown): number | null {
  const value = firstOf(raw);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
