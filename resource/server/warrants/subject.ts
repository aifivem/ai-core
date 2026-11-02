import { isRecord } from "@aifivem/lib/shared";
import { mysql } from "@aifivem/mysql";
import { toCharId } from "../characters/edit";
import { players } from "../player/registry";

/** The character a warrant is about. */
export interface Subject {
  charId: number;
  citizenid: string;
  name: string;
  /** Server id while loaded. */
  source: number | null;
}

interface Row {
  id: number;
  citizenid: string;
  firstname: string;
  lastname: string;
}

const citizenOf = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 && v.length <= 16 ? v : null;

/**
 * A warrant target (a loaded player's server id, a citizenid or `{ charId }`) as its character: a loaded one from
 * memory, a stored one with one unique-key read; null when it names no character (unknown or deleted).
 */
export async function subjectOf(target: unknown): Promise<Subject | null> {
  const citizenid = citizenOf(target);
  const charId = isRecord(target) ? toCharId(target.charId) : null;
  const player =
    typeof target === "number"
      ? players.get(target)
      : citizenid !== null
        ? players.byCitizen(citizenid)
        : charId !== null
          ? players.byCharacter(charId)
          : undefined;
  if (player)
    return {
      charId: player.charId,
      citizenid: player.citizenid,
      name: player.fullName,
      source: player.source,
    };
  if (citizenid === null && charId === null) return null;
  const row = await mysql.single<Row>(
    `SELECT id, citizenid, firstname, lastname FROM ai_core_characters
     WHERE ${citizenid !== null ? "citizenid" : "id"} = ? AND deleted_at IS NULL`,
    [citizenid ?? charId],
  );
  if (!row) return null;
  return {
    charId: row.id,
    citizenid: row.citizenid,
    name: `${row.firstname} ${row.lastname}`,
    source: players.byCharacter(row.id)?.source ?? null,
  };
}
