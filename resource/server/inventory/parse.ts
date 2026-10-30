import { isRecord } from "@aicore-fivem/lib/shared";
import type {
  InventoryStack,
  ItemDefinition,
  ItemMetadata,
} from "@aicore-fivem/shared";

/** Readers for what inventory exports answer (adapters parse every result at the boundary). */

/** A Lua export returning several values arrives as an array; the first value is the result. */
export const first = (value: unknown): unknown =>
  Array.isArray(value) ? value[0] : value;

export const isTrue = (value: unknown): boolean => first(value) === true;

export const number = (value: unknown, fallback = 0): number => {
  const v = first(value);
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
};

export const text = (value: unknown, fallback: string): string =>
  typeof value === "string" ? value : fallback;

export const metadata = (value: unknown): ItemMetadata =>
  isRecord(value) ? { ...value } : {};

/** Rows of a Lua item table: an array, or a map keyed by slot when the slots have gaps. */
export function rows(value: unknown): Record<string, unknown>[] {
  const list: unknown[] = Array.isArray(value)
    ? value
    : isRecord(value)
      ? Object.values(value)
      : [];
  return list.filter(isRecord);
}

/** A text, or the first text of a per-language table (`{ en = "Bread", tr = "Ekmek" }`). */
export function label(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (isRecord(value))
    for (const v of Object.values(value)) if (typeof v === "string") return v;
  return fallback;
}

/** A stack from the common field names: `count` / `amount`, `metadata` / `info`. */
export function stack(
  row: Record<string, unknown>,
  labelOf: (name: string) => string,
): InventoryStack | null {
  if (typeof row.name !== "string") return null;
  return {
    name: row.name,
    label: typeof row.label === "string" ? row.label : labelOf(row.name),
    count: number(row.count ?? row.amount),
    slot: number(Number(row.slot)),
    metadata: metadata(row.metadata ?? row.info),
  };
}

/** Turns an item's picture field (a file name, or nothing) into a url the NUI can load. */
export type ImageOf = (name: string, image: string) => string | undefined;

/** An item definition in ox, QB or tgiann shape. */
export function definition(
  raw: unknown,
  name: string,
  imageOf?: ImageOf,
): ItemDefinition | null {
  if (!isRecord(raw)) return null;
  const image = typeof raw.image === "string" ? raw.image : "";
  return {
    name: text(raw.name, name),
    label: label(raw.label, name),
    weight: number(raw.weight),
    unique: raw.unique === true || raw.stack === false,
    close: (raw.close ?? raw.shouldClose) !== false,
    description: label(raw.description, ""),
    image: /^(https?|nui):\/\//.test(image)
      ? image
      : imageOf?.(text(raw.name, name), image),
  };
}

/** Every definition of an item list keyed by name. */
export function definitions(
  raw: unknown,
  imageOf?: ImageOf,
): Record<string, ItemDefinition> {
  const out: Record<string, ItemDefinition> = {};
  if (!isRecord(raw)) return out;
  for (const [name, value] of Object.entries(raw)) {
    const def = definition(value, name, imageOf);
    if (def) out[name] = def;
  }
  return out;
}
