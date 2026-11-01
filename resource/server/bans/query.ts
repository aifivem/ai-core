import { isRecord } from "@aicore-fivem/lib/shared";
import {
  BAN_FILTERS,
  BAN_IDENTIFIERS,
  banStatus,
  type BanCursor,
  type BanFilter,
  type BanInfo,
  type BanListPage,
  type BanRecord,
} from "@aicore-fivem/shared";
import { mysql } from "@aicore-fivem/mysql";
import type { Tables } from "../tables";
import { copyBan, type BanStore, type Identifiers } from "./store";

/**
 * Ban reads for the admin screens and the `GetBanHistory` / `ListBans` exports, built for millions of rows: every
 * query is an index range (`fivem` / `license` / `discord` / `ip` / `name` / `revoked` / `active` keys) or a primary
 * key walk with a keyset cursor; active bans without a search come from memory (`BanStore.before`).
 */

export const PAGE = 50;
/** Bans one identifier search or a history shows at most. */
export const HISTORY_LIMIT = 100;
/** Above every INT UNSIGNED id: the first page's cursor. */
const FIRST = 2 ** 32;

const COLUMNS =
  "id, fivem, license, discord, ip, name, reason, banned_by, created_at, expires_at, revoked_at, revoked_by";

type Row = Tables["ai_core_bans"];

function toRecord(row: Row): BanRecord {
  const identifiers: Identifiers = {};
  for (const type of BAN_IDENTIFIERS) {
    const value = row[type];
    if (value) identifiers[type] = value;
  }
  return {
    id: row.id,
    identifiers,
    name: row.name,
    reason: row.reason,
    by: row.banned_by,
    created: row.created_at,
    expires: row.expires_at,
    revoked: row.revoked_at,
    revokedBy: row.revoked_by,
  };
}

/** An in-memory ban as a record (copied). */
export const recordOf = (
  ban: BanInfo,
  revoked: number | null = null,
  revokedBy: string | null = null,
): BanRecord => ({ ...copyBan(ban), revoked, revokedBy });

type Column = "id" | (typeof BAN_IDENTIFIERS)[number];

/** Bans matching any of the (column, value) pairs, newest first: one indexed branch per pair. */
async function matchAny(
  pairs: Array<[Column, string | number]>,
): Promise<BanRecord[]> {
  if (pairs.length === 0) return [];
  // Column names come from the fixed `Column` list, never from typed text.
  const sql = pairs
    .map(
      ([column]) =>
        `(SELECT ${COLUMNS} FROM ai_core_bans WHERE ${column} = ? ORDER BY id DESC LIMIT ${HISTORY_LIMIT})`,
    )
    .join(" UNION ");
  const rows = await mysql.query<Row[]>(
    `${sql} ORDER BY id DESC LIMIT ${HISTORY_LIMIT}`,
    pairs.map(([, value]) => value),
  );
  return (rows ?? []).map(toRecord);
}

/** Every ban of these identifiers (any state), newest first. */
export function historyOf(identifiers: Identifiers): Promise<BanRecord[]> {
  return matchAny(
    BAN_IDENTIFIERS.flatMap((type): Array<[Column, string]> => {
      const value = identifiers[type];
      return value ? [[type, value]] : [];
    }),
  );
}

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

/** `LIKE` prefix with `!` as the escape character (portable: no backslash rules). */
const prefix = (text: string): string =>
  `${text.replace(/[!%_]/g, (c) => `!${c}`)}%`;

/** The state filter as SQL (`now` = the query's clock). */
function stateSql(filter: BanFilter, now: Date): [string, unknown[]] {
  switch (filter) {
    case "active":
      return [
        "revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?)",
        [now],
      ];
    case "expired":
      return ["revoked_at IS NULL AND expires_at <= ?", [now]];
    case "revoked":
      return ["revoked_at IS NOT NULL", []];
    case "all":
      return ["1 = 1", []];
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}

/** The next page's cursor from a page fetched with one extra row. */
function paged(
  rows: BanRecord[],
  at: (ban: BanRecord) => number | null,
): BanListPage {
  const bans = rows.slice(0, PAGE);
  const last = bans.at(-1);
  return {
    bans,
    next: rows.length > PAGE && last ? { id: last.id, at: at(last) } : null,
  };
}

const select = async (sql: string, params: unknown[]): Promise<BanRecord[]> =>
  ((await mysql.query<Row[]>(sql, params)) ?? []).map(toRecord);

/** One page of a ban list. */
export async function listBans(
  query: ParsedBanQuery,
  store: BanStore,
  now = Date.now(),
): Promise<BanListPage> {
  const { filter, search, cursor } = query;
  const date = new Date(now);
  if (search?.kind === "match") {
    const found = await matchAny(search.pairs);
    return {
      bans: found.filter(
        (ban) => filter === "all" || banStatus(ban, now) === filter,
      ),
      next: null,
    };
  }
  const before = cursor?.id ?? FIRST;
  const take = PAGE + 1;
  if (search?.kind === "name") {
    const [state, params] = stateSql(filter, date);
    return paged(
      await select(
        `SELECT ${COLUMNS} FROM ai_core_bans WHERE name LIKE ? ESCAPE '!' AND id < ? AND ${state} ORDER BY id DESC LIMIT ${take}`,
        [prefix(search.prefix), before, ...params],
      ),
      () => null,
    );
  }
  switch (filter) {
    case "active":
      return paged(
        store.before(before, take, now).map((ban) => recordOf(ban)),
        () => null,
      );
    case "all":
      return paged(
        await select(
          `SELECT ${COLUMNS} FROM ai_core_bans WHERE id < ? ORDER BY id DESC LIMIT ${take}`,
          [before],
        ),
        () => null,
      );
    case "revoked": {
      const at = cursor?.at;
      return paged(
        await select(
          at == null
            ? `SELECT ${COLUMNS} FROM ai_core_bans WHERE revoked_at IS NOT NULL ORDER BY revoked_at DESC, id DESC LIMIT ${take}`
            : `SELECT ${COLUMNS} FROM ai_core_bans WHERE revoked_at IS NOT NULL AND (revoked_at < ? OR (revoked_at = ? AND id < ?)) ORDER BY revoked_at DESC, id DESC LIMIT ${take}`,
          at == null ? [] : [new Date(at), new Date(at), before],
        ),
        (ban) => ban.revoked,
      );
    }
    case "expired": {
      const at = cursor?.at;
      return paged(
        await select(
          at == null
            ? `SELECT ${COLUMNS} FROM ai_core_bans WHERE revoked_at IS NULL AND expires_at <= ? ORDER BY expires_at DESC, id DESC LIMIT ${take}`
            : `SELECT ${COLUMNS} FROM ai_core_bans WHERE revoked_at IS NULL AND expires_at <= ? AND (expires_at < ? OR (expires_at = ? AND id < ?)) ORDER BY expires_at DESC, id DESC LIMIT ${take}`,
          at == null ? [date] : [date, new Date(at), new Date(at), before],
        ),
        (ban) => ban.expires,
      );
    }
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}
