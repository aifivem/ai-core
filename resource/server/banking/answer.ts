/** A finite balance from another script's export (a Lua multi-return arrives as an array); null otherwise. */
export function balanceOf(raw: unknown): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
