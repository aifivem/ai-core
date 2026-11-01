import type { GroupMember, MembersPage } from "@aicore-fivem/shared";
import { mysql } from "@aicore-fivem/mysql";
import { players } from "../player/registry";

/** Members per page by default and at most. */
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

interface MemberRow {
  char_id: number;
  grade: number;
  citizenid: string;
  firstname: string;
  lastname: string;
}

/** Identifiers only from this list: the table and its name column. */
const TABLES = {
  job: { table: "ai_core_character_jobs", column: "job" },
  gang: { table: "ai_core_character_gangs", column: "gang" },
} as const;

const NAME = /^[A-Za-z0-9_-]{1,48}$/;

/**
 * Holders of a job or gang, loaded or not, by character id (keyset paging). One statement per page: the membership
 * index `(job, char_id)` / `(gang, char_id)` walks `limit + 1` entries from `after`, each joined to its character by
 * primary key (deleted characters skipped). Loaded members show their grade from memory (the truth); one that left
 * the job while its delete is still queued is dropped.
 */
export async function membersOf(
  kind: "job" | "gang",
  name: unknown,
  after: unknown,
  limit: unknown,
): Promise<MembersPage> {
  if (typeof name !== "string" || !NAME.test(name))
    return { members: [], next: null };
  const from =
    typeof after === "number" && Number.isInteger(after) && after > 0
      ? after
      : 0;
  const size =
    typeof limit === "number" && Number.isInteger(limit)
      ? Math.min(Math.max(limit, 1), MAX_LIMIT)
      : DEFAULT_LIMIT;
  const { table, column } = TABLES[kind];
  const rows =
    (await mysql.query<MemberRow[]>(
      `SELECT m.char_id, m.grade, c.citizenid, c.firstname, c.lastname
       FROM ${table} m JOIN ai_core_characters c ON c.id = m.char_id AND c.deleted_at IS NULL
       WHERE m.${column} = ? AND m.char_id > ? ORDER BY m.char_id LIMIT ?`,
      [name, from, size + 1],
    )) ?? [];
  const more = rows.length > size;
  const page = more ? rows.slice(0, size) : rows;
  const members: GroupMember[] = [];
  for (const row of page) {
    const player = players.byCharacter(row.char_id);
    const grade = player
      ? kind === "job"
        ? player.jobs.grade(name)
        : player.gangs.grade(name)
      : row.grade;
    if (grade === null) continue;
    members.push({
      charId: row.char_id,
      citizenid: row.citizenid,
      firstname: row.firstname,
      lastname: row.lastname,
      grade,
      source: player?.source ?? null,
    });
  }
  return { members, next: more ? (page.at(-1)?.char_id ?? null) : null };
}
