// Byte size of a value as FiveM's msgpack would encode it (net event payloads), without a msgpack package:
// maps, arrays, strings (UTF-8), integers, doubles, booleans and nil, with msgpack's header sizes.

const header = (n: number, fix: number): number =>
  n < fix ? 1 : n < 0x10000 ? 3 : 5;

export function msgpackSize(value: unknown): number {
  if (value === null || value === undefined || typeof value === "boolean")
    return 1;
  if (typeof value === "number") {
    if (!Number.isInteger(value)) return 9;
    const a = Math.abs(value);
    return a < 128 ? 1 : a < 256 ? 2 : a < 65536 ? 3 : a < 2 ** 32 ? 5 : 9;
  }
  if (typeof value === "string") {
    const n = Buffer.byteLength(value, "utf8");
    return (n < 32 ? 1 : n < 256 ? 2 : n < 65536 ? 3 : 5) + n;
  }
  if (Array.isArray(value))
    return value.reduce<number>(
      (sum, v) => sum + msgpackSize(v),
      header(value.length, 16),
    );
  if (value instanceof Map) return msgpackSize(Object.fromEntries(value));
  if (typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    return entries.reduce<number>(
      (sum, [k, v]) => sum + msgpackSize(k) + msgpackSize(v),
      header(entries.length, 16),
    );
  }
  return 1;
}

export const kb = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(2)} MB`
    : `${(bytes / 1024).toFixed(1)} KB`;
