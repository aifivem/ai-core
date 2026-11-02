import { mysql } from "@aifivem/mysql";
import { MAX_WARRANTS, type Warrant, type WarrantPage } from "@aifivem/shared";
import type { Tables } from "../tables";

/**
 * SQL of ai-core's own warrants, built for millions of rows: a character's warrants by `char_active (char_id,
 * cleared_at)`, the active list by `active (cleared_at, id)` newest first with a keyset cursor, the expiry sweep by
 * `expiry (cleared_at, expires_at)`. Times are JS dates, read back as epoch ms (like the bans).
 */

/** Rows of one page of the active list. */
export const PAGE = 25;

type Row = Pick<
  Tables["ai_core_warrants"],
  "id" | "char_id" | "reason" | "issued_by" | "created_at" | "expires_at"
>;

const COLUMNS =
  "w.id, w.char_id, w.reason, w.issued_by, w.created_at, w.expires_at";
/** Active at the time given as its one parameter. */
const ACTIVE =
  "w.cleared_at IS NULL AND (w.expires_at IS NULL OR w.expires_at > ?)";

const toWarrant = (row: Row): Warrant => ({
  id: row.id,
  charId: row.char_id,
  reason: row.reason,
  by: row.issued_by,
  created: row.created_at,
  expires: row.expires_at,
});

/** A character's active warrants, newest first. */
export async function activeOfChar(charId: number): Promise<Warrant[]> {
  const rows = await mysql.query<Row[]>(
    `SELECT ${COLUMNS} FROM ai_core_warrants w WHERE w.char_id = ? AND ${ACTIVE} ORDER BY w.id DESC`,
    [charId, new Date()],
  );
  return (rows ?? []).map(toWarrant);
}

/** Whether a stored character (by citizenid) has an active warrant: one unique-key read and one index range. */
export async function hasActive(citizenid: string): Promise<boolean> {
  const hit = await mysql.scalar(
    `SELECT 1 FROM ai_core_characters c JOIN ai_core_warrants w ON w.char_id = c.id
     WHERE c.citizenid = ? AND ${ACTIVE} LIMIT 1`,
    [citizenid, new Date()],
  );
  return hit !== null;
}

/** Inserts a warrant unless the character already holds `MAX_WARRANTS` active ones; the new id, or null when full. */
export async function insertWarrant(
  w: Omit<Warrant, "id">,
): Promise<number | null> {
  const id = await mysql.insert(
    `INSERT INTO ai_core_warrants (char_id, reason, issued_by, created_at, expires_at)
     SELECT ?, ?, ?, ?, ? FROM DUAL
     WHERE (SELECT COUNT(*) FROM ai_core_warrants w WHERE w.char_id = ? AND ${ACTIVE}) < ?`,
    [
      w.charId,
      w.reason,
      w.by,
      new Date(w.created),
      w.expires === null ? null : new Date(w.expires),
      w.charId,
      new Date(w.created),
      MAX_WARRANTS,
    ],
  );
  return id ? id : null;
}

/** An active warrant by id, or null. */
export async function activeById(id: number): Promise<Warrant | null> {
  const row = await mysql.single<Row>(
    `SELECT ${COLUMNS} FROM ai_core_warrants w WHERE w.id = ? AND ${ACTIVE}`,
    [id, new Date()],
  );
  return row ? toWarrant(row) : null;
}

/** Clears one active warrant; false when it was not active any more. */
export async function clearRow(id: number, by: string): Promise<boolean> {
  const now = new Date();
  const affected = await mysql.update(
    `UPDATE ai_core_warrants w SET w.cleared_at = ?, w.cleared_by = ? WHERE w.id = ? AND ${ACTIVE}`,
    [now, by, id, now],
  );
  return affected === 1;
}

/** Clears every active warrant of a character; how many. */
export async function clearRows(charId: number, by: string): Promise<number> {
  const now = new Date();
  return (
    (await mysql.update(
      `UPDATE ai_core_warrants w SET w.cleared_at = ?, w.cleared_by = ? WHERE w.char_id = ? AND ${ACTIVE}`,
      [now, by, charId, now],
    )) ?? 0
  );
}

/** One page of every active warrant with its character, newest first (`cursor`: the last page's `next`). */
export async function activePage(cursor: number | null): Promise<WarrantPage> {
  type PageRow = Row & {
    citizenid: string;
    firstname: string;
    lastname: string;
  };
  const rows =
    (await mysql.query<PageRow[]>(
      `SELECT ${COLUMNS}, c.citizenid, c.firstname, c.lastname
       FROM ai_core_warrants w JOIN ai_core_characters c ON c.id = w.char_id AND c.deleted_at IS NULL
       WHERE ${ACTIVE}${cursor === null ? "" : " AND w.id < ?"} ORDER BY w.id DESC LIMIT ${PAGE}`,
      cursor === null ? [new Date()] : [new Date(), cursor],
    )) ?? [];
  return {
    warrants: rows.map((row) => ({
      ...toWarrant(row),
      citizenid: row.citizenid,
      name: `${row.firstname} ${row.lastname}`,
    })),
    next: rows.length === PAGE ? (rows[PAGE - 1]?.id ?? null) : null,
  };
}

/** Closes expired warrants (at most 1,000 a run): `cleared_at` = their end, `cleared_by` stays NULL. */
export async function sweepExpired(): Promise<number> {
  return (
    (await mysql.update(
      "UPDATE ai_core_warrants SET cleared_at = expires_at WHERE cleared_at IS NULL AND expires_at <= ? LIMIT 1000",
      [new Date()],
    )) ?? 0
  );
}
