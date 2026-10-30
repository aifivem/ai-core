import { isRecord } from "@aicore-fivem/lib/shared";
import type { RadialItem } from "@aicore-fivem/shared";

const text = (v: unknown, max: number): string | undefined =>
  typeof v === "string" && v.length > 0 ? v.slice(0, max) : undefined;
const fn = <T>(v: unknown): T | undefined =>
  typeof v === "function" ? (v as T) : undefined;

/** A radial item from another resource (functions arrive as references into it); sub items at most 4 levels deep. */
export function toRadialItem(v: unknown, depth = 0): RadialItem | null {
  if (!isRecord(v) || depth > 4) return null;
  const id = text(v.id, 64);
  const label = text(v.label, 48);
  if (!id || !label) return null;
  const items = Array.isArray(v.items)
    ? v.items
        .map((c) => toRadialItem(c, depth + 1))
        .filter((c): c is RadialItem => c !== null)
    : undefined;
  return {
    id,
    label,
    icon: text(v.icon, 200),
    parent: text(v.parent, 64),
    items: items?.length ? items : undefined,
    canShow: fn<() => boolean>(v.canShow),
    onPressed: fn<() => void>(v.onPressed),
    keepOpen: v.keepOpen === true || undefined,
    whileDead: v.whileDead === true || undefined,
  };
}
