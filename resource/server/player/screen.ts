import type { CharacterCard, CharacterScreen } from "@aicore-fivem/shared";
import { mysql } from "@aicore-fivem/mysql";
import { listCharacters, type CharacterRow } from "../characters/repo";
import { jobs as jobDefs, settings } from "../content";
import { players } from "./registry";
import type { User } from "./users";

/** Slots of an account: its own override, or the panel setting. */
export function slotsOf(user: User): number {
  return user.charSlots ?? settings.characters.slots;
}

interface CardExtras {
  char_id: number;
  job: string | null;
  cash: number | string | null;
  bank: number | string | null;
}

/** Cash, bank and first job of every character of an account in one query (the cards only). */
async function extras(rows: CharacterRow[]): Promise<Map<number, CardExtras>> {
  if (rows.length === 0) return new Map();
  const ids = rows.map((row) => row.id);
  const list = await mysql.query<CardExtras[]>(
    `SELECT c.id AS char_id,
       (SELECT j.job FROM ai_core_character_jobs j WHERE j.char_id = c.id ORDER BY j.grade DESC LIMIT 1) AS job,
       (SELECT a.balance FROM ai_core_accounts a WHERE a.owner_type = 'character' AND a.owner_id = CAST(c.id AS CHAR) COLLATE utf8mb4_unicode_ci AND a.name = 'cash') AS cash,
       (SELECT a.balance FROM ai_core_accounts a WHERE a.owner_type = 'character' AND a.owner_id = CAST(c.id AS CHAR) COLLATE utf8mb4_unicode_ci AND a.name = 'bank') AS bank
     FROM ai_core_characters c WHERE c.id IN (?)`,
    [ids],
  );
  return new Map((list ?? []).map((row) => [row.char_id, row]));
}

/** The character screen of an account: its characters as cards, its slots, whether it may delete. */
export async function characterScreen(user: User): Promise<CharacterScreen> {
  const rows = await listCharacters(user.id);
  const more = await extras(rows);
  const characters: CharacterCard[] = rows.map((row) => {
    const extra = more.get(row.id);
    const job = extra?.job
      ? (jobDefs.get(extra.job)?.label ?? extra.job)
      : null;
    return {
      id: row.id,
      citizenid: row.citizenid,
      slot: row.slot,
      firstname: row.firstname,
      lastname: row.lastname,
      birthdate: row.birthdate,
      sex: row.sex,
      nationality: row.nationality,
      online: players.byCharacter(row.id) !== undefined,
      job,
      cash: Number(extra?.cash ?? 0),
      bank: Number(extra?.bank ?? 0),
      lastPlayed: row.lastPlayed,
    };
  });
  return {
    branding: settings.branding,
    slots: slotsOf(user),
    characters,
    canDelete: settings.characters.canDelete,
    scene: settings.characterScene,
  };
}
