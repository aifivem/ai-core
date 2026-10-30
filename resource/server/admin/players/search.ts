import { mysql } from "@aicore-fivem/mysql";
import { SEARCH_PAGE, type SearchPage } from "../../../common/adminPlayers";

/**
 * Search over stored characters, built for millions of rows: every branch is an index range or point lookup
 * (`search_first` / `search_last` cover `deleted_at, name, id`; citizenid, fivem, license, discord are keyed),
 * names page by keyset on the id (newest first), and the page's rows come in one JOIN by primary key.
 */

export type SearchQuery =
  | { kind: "ids"; citizenid: string | null; users: UserMatch[] }
  | { kind: "name"; first: string; last: string | null };

interface UserMatch {
  column: "fivem" | "license" | "discord";
  value: string;
}

/** Above every INT UNSIGNED id: the first page's cursor. */
const FIRST = 2 ** 32;
/** Characters one identifier search shows at most (an account holds a handful). */
const ID_LIMIT = 50;

/** What a typed search means; null when too short or too long. */
export function parseSearch(raw: string): SearchQuery | null {
  const q = raw.trim().replace(/\s+/g, " ");
  if (q.length < 2 || q.length > 64) return null;
  const prefixed = /^(fivem|license|discord):(\S+)$/i.exec(q);
  if (prefixed?.[1] && prefixed[2])
    return {
      kind: "ids",
      citizenid: null,
      users: [
        {
          column: prefixed[1].toLowerCase() as UserMatch["column"],
          value: prefixed[2],
        },
      ],
    };
  if (/^[0-9a-f]{40}$/i.test(q))
    return {
      kind: "ids",
      citizenid: null,
      users: [{ column: "license", value: q.toLowerCase() }],
    };
  if (/^\d+$/.test(q))
    return {
      kind: "ids",
      citizenid: q.length <= 16 ? q : null,
      users: [
        { column: "fivem", value: q },
        { column: "discord", value: q },
      ],
    };
  const [first = "", ...rest] = q.split(" ");
  return { kind: "name", first, last: rest.length > 0 ? rest.join(" ") : null };
}

/** `LIKE` prefix with `!` as the escape character (portable: no backslash rules). */
const prefix = (text: string): string =>
  `${text.replace(/[!%_]/g, (c) => `!${c}`)}%`;

const idsOf = (rows: Array<{ id: number }> | null): number[] =>
  (rows ?? []).map((row) => row.id);

/** Character ids of one page, newest first, and whether more follow. */
export async function searchIds(
  query: SearchQuery,
  cursor: number | null,
): Promise<{ ids: number[]; more: boolean }> {
  if (query.kind === "ids") {
    const lists = await Promise.all([
      query.citizenid === null
        ? []
        : idsOf(
            await mysql.query<{ id: number }[]>(
              "SELECT id FROM ai_core_characters WHERE citizenid = ? AND deleted_at IS NULL",
              [query.citizenid],
            ),
          ),
      ...query.users.map(async (match) =>
        idsOf(
          await mysql.query<{ id: number }[]>(
            // The column name comes from the fixed UserMatch list, never from the typed text.
            `SELECT c.id FROM ai_core_users u JOIN ai_core_characters c ON c.user_id = u.id AND c.deleted_at IS NULL WHERE u.${match.column} = ? LIMIT ${ID_LIMIT}`,
            [match.value],
          ),
        ),
      ),
    ]);
    const ids = [...new Set(lists.flat())].sort((a, b) => b - a);
    return { ids: ids.slice(0, ID_LIMIT), more: false };
  }
  const before = cursor ?? FIRST;
  const take = SEARCH_PAGE + 1;
  const branches =
    query.last === null
      ? [
          mysql.query<{ id: number }[]>(
            `SELECT id FROM ai_core_characters WHERE deleted_at IS NULL AND firstname LIKE ? ESCAPE '!' AND id < ? ORDER BY id DESC LIMIT ${take}`,
            [prefix(query.first), before],
          ),
          mysql.query<{ id: number }[]>(
            `SELECT id FROM ai_core_characters WHERE deleted_at IS NULL AND lastname LIKE ? ESCAPE '!' AND id < ? ORDER BY id DESC LIMIT ${take}`,
            [prefix(query.first), before],
          ),
        ]
      : [
          mysql.query<{ id: number }[]>(
            `SELECT id FROM ai_core_characters WHERE deleted_at IS NULL AND firstname LIKE ? ESCAPE '!' AND lastname LIKE ? ESCAPE '!' AND id < ? ORDER BY id DESC LIMIT ${take}`,
            [prefix(query.first), prefix(query.last), before],
          ),
        ];
  const merged = [...new Set((await Promise.all(branches)).flatMap(idsOf))];
  merged.sort((a, b) => b - a);
  return {
    ids: merged.slice(0, SEARCH_PAGE),
    more: merged.length > SEARCH_PAGE,
  };
}

interface FoundRow {
  id: number;
  citizenid: string;
  firstname: string;
  lastname: string;
  last_played: number | null;
  name: string;
}

/** One page of results; `online` tells the server id of a loaded character. */
export async function search(
  query: SearchQuery,
  cursor: number | null,
  online: (charId: number) => number | null,
): Promise<SearchPage> {
  const { ids, more } = await searchIds(query, cursor);
  if (ids.length === 0) return { rows: [], next: null };
  const rows =
    (await mysql.query<FoundRow[]>(
      "SELECT c.id, c.citizenid, c.firstname, c.lastname, c.last_played, u.name FROM ai_core_characters c JOIN ai_core_users u ON u.id = c.user_id WHERE c.id IN (?) ORDER BY c.id DESC",
      [ids],
    )) ?? [];
  return {
    rows: rows.map((row) => ({
      charId: row.id,
      citizenid: row.citizenid,
      name: `${row.firstname} ${row.lastname}`,
      account: row.name,
      lastPlayed: row.last_played,
      source: online(row.id),
    })),
    next: more ? (ids.at(-1) ?? null) : null,
  };
}
