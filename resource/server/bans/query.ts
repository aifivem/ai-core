import {
  BAN_IDENTIFIERS,
  banStatus,
  type BanFilter,
  type BanInfo,
  type BanListPage,
  type BanRecord,
} from "@aicore-fivem/shared";
import { mysql } from "@aicore-fivem/mysql";
import type { Tables } from "../tables";
import { FIRST, type Column, type ParsedBanQuery } from "./search";
import { copyBan, type BanStore, type Identifiers } from "./store";

/**
 * Ban reads for the admin screens and the `GetBanHistory` / `ListBans` exports, built for millions of rows: every
 * query is an index range (`fivem` / `license` / `discord` / `ip` / `name` / `revoked` / `active` keys) or a primary
 * key walk with a keyset cursor; active bans without a search come from memory (`BanStore.before`).
 */

export const PAGE = 50;
/** Bans one identifier search or a history shows at most. */
export const HISTORY_LIMIT = 100;

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
