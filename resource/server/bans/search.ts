import { isRecord } from "@aicore-fivem/lib/shared";
import {
  BAN_FILTERS,
  BAN_IDENTIFIERS,
  type BanCursor,
  type BanFilter,
} from "@aicore-fivem/shared";

/** What a ban search and a `BanQuery` mean, read from another resource's or the panel's input. */

/** Above every INT UNSIGNED id: the first page's cursor. */
export const FIRST = 2 ** 32;

export type Column = "id" | (typeof BAN_IDENTIFIERS)[number];

export type BanSearch =
  | { kind: "match"; pairs: Array<[Column, string | number]> }
  | { kind: "name"; prefix: string };

/** What a typed search means; null when it is too short or too long. */
export function parseBanSearch(raw: string): BanSearch | null {
  const q = raw.trim().replace(/^#/, "");
  if (q.length < 1 || q.length > 64) return null;
  const prefixed = /^(fivem|license|discord|ip):(\S+)$/i.exec(q);
  if (prefixed?.[1] && prefixed[2])
    return {
      kind: "match",
      pairs: [[prefixed[1].toLowerCase() as Column, prefixed[2]]],
    };
  if (/^\d+$/.test(q)) {
    const id = Number(q);
    const pairs: Array<[Column, string | number]> = [
      ["fivem", q],
      ["discord", q],
    ];
    if (id > 0 && id < FIRST) pairs.unshift(["id", id]);
    return { kind: "match", pairs };
  }
  if (/^[0-9a-f]{40}$/i.test(q))
    return { kind: "match", pairs: [["license", q.toLowerCase()]] };
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(q))
    return { kind: "match", pairs: [["ip", q]] };
  return q.length >= 2 ? { kind: "name", prefix: q } : null;
}

export interface ParsedBanQuery {
  filter: BanFilter;
  search: BanSearch | null;
  cursor: BanCursor | null;
}

/** A `BanQuery` from another resource or the panel; null when any part is wrong. */
export function readBanQuery(raw: unknown): ParsedBanQuery | null {
  if (!isRecord(raw)) return null;
  const filter = raw.filter ?? "all";
  if (!(BAN_FILTERS as readonly unknown[]).includes(filter)) return null;
  let search: BanSearch | null = null;
  if (raw.search != null && raw.search !== "") {
    if (typeof raw.search !== "string") return null;
    search = parseBanSearch(raw.search);
    if (!search) return null;
  }
  let cursor: BanCursor | null = null;
  if (raw.cursor != null) {
    const c = raw.cursor;
    if (
      !isRecord(c) ||
      typeof c.id !== "number" ||
      !Number.isInteger(c.id) ||
      c.id < 1 ||
      c.id > FIRST ||
      (c.at !== null && !(typeof c.at === "number" && Number.isFinite(c.at)))
    )
      return null;
    cursor = { id: c.id, at: c.at };
  }
  return { filter: filter as BanFilter, search, cursor };
}
