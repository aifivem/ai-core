import { mysql } from "@aicore-fivem/mysql";
import type { CharacterSearchPage } from "@aicore-fivem/shared";
import { parseSearch, searchIds } from "../admin/players/search";
import { players } from "../player/registry";

const EMPTY: CharacterSearchPage = { characters: [], next: null };

/**
 * Characters by a typed text for other scripts (export `SearchCharacters`), with the admin search's rules and
 * indexes; the page's rows come by primary key, the loaded ones carry their server id.
 */
export async function searchCharacters(
  text: unknown,
  cursor: unknown,
): Promise<CharacterSearchPage> {
  const query = typeof text === "string" ? parseSearch(text) : null;
  if (!query) return EMPTY;
  const { ids, more } = await searchIds(
    query,
    typeof cursor === "number" && Number.isSafeInteger(cursor) ? cursor : null,
  );
  if (ids.length === 0) return EMPTY;
  const rows = await mysql.query<
    { id: number; citizenid: string; firstname: string; lastname: string }[]
  >(
    `SELECT id, citizenid, firstname, lastname FROM ai_core_characters WHERE id IN (${ids.map(() => "?").join(", ")})`,
    ids,
  );
  const byId = new Map((rows ?? []).map((row) => [row.id, row]));
  const characters = ids.flatMap((id) => {
    const row = byId.get(id);
    return row
      ? [
          {
            charId: row.id,
            citizenid: row.citizenid,
            firstname: row.firstname,
            lastname: row.lastname,
            source: players.byCharacter(row.id)?.source ?? null,
          },
        ]
      : [];
  });
  return { characters, next: more ? (ids.at(-1) ?? null) : null };
}
