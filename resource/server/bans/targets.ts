import { isRecord } from "@aicore-fivem/lib/shared";
import { BAN_IDENTIFIERS } from "@aicore-fivem/shared";
import type { Identifiers } from "./store";

/** Longest stored value per identifier type (the table's column sizes). */
const MAX_LENGTH: Record<(typeof BAN_IDENTIFIERS)[number], number> = {
  fivem: 20,
  license: 60,
  discord: 30,
  ip: 45,
};

/** A source's identifiers as the gate sees them (`type` -> value without the prefix). */
export function identifiersOf(source: number): Identifiers {
  const out: Identifiers = {};
  for (const id of getPlayerIdentifiers(String(source))) {
    const at = id.indexOf(":");
    const type = id.slice(0, at);
    if (at > 0 && (BAN_IDENTIFIERS as readonly string[]).includes(type))
      out[type as keyof Identifiers] = id.slice(at + 1);
  }
  return out;
}

/** Identifiers from another resource or the panel: `license: "license:abc"` or `license: "abc"`; null when none is usable. */
export function readIdentifiers(raw: unknown): Identifiers | null {
  if (!isRecord(raw)) return null;
  const out: Identifiers = {};
  let any = false;
  for (const type of BAN_IDENTIFIERS) {
    const value = raw[type];
    if (typeof value !== "string") continue;
    const text = value.trim().replace(new RegExp(`^${type}:`), "");
    if (!text || text.length > MAX_LENGTH[type]) continue;
    out[type] = text;
    any = true;
  }
  return any ? out : null;
}

export interface BanTargetFound {
  identifiers: Identifiers;
  source: number | null;
}

/** A target: an online player's server id or `{ identifiers }`. */
export function readTarget(target: unknown): BanTargetFound | null {
  if (typeof target === "number" && Number.isInteger(target) && target > 0) {
    if (!GetPlayerName(String(target))) return null;
    const identifiers = identifiersOf(target);
    return Object.keys(identifiers).length > 0
      ? { identifiers, source: target }
      : null;
  }
  if (isRecord(target)) {
    const identifiers = readIdentifiers(target.identifiers);
    return identifiers ? { identifiers, source: null } : null;
  }
  return null;
}
