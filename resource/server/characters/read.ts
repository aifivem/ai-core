import { coordsOf } from "@aicore-fivem/lib/server";
import type { OfflineCharacter, StoredCharacter } from "@aicore-fivem/shared";
import { storedBalances } from "../admin/players/repo";
import { accountTypes } from "../content";
import { loadGangs, loadJobs } from "../jobs/repo";
import type { Player } from "../player/player";
import {
  findCharacter,
  listCharacters,
  listCharactersByLicense,
  type CharacterRow,
} from "./repo";
import { readCharacter } from "./edit";

/** Reads of characters by id or account for other resources (the bridge's offline players, "characters by license"). */

function infoOf(row: CharacterRow): OfflineCharacter["info"] {
  return {
    id: row.id,
    citizenid: row.citizenid,
    slot: row.slot,
    firstname: row.firstname,
    lastname: row.lastname,
    birthdate: row.birthdate,
    sex: row.sex,
    nationality: row.nationality,
    userId: row.userId,
  };
}

function fromPlayer(player: Player): OfflineCharacter {
  const data = player.snapshot();
  const ped = GetPlayerPed(String(player.source));
  const at = coordsOf(player.source);
  return {
    info: { ...player.info(), userId: player.user.id },
    money: data.money,
    jobs: data.jobs,
    gangs: data.gangs,
    activeGang: data.activeGang,
    metadata: data.metadata,
    position: ped
      ? { x: at.x, y: at.y, z: at.z, heading: GetEntityHeading(ped) }
      : player.spawnPosition(),
    lastSeen: Date.now(),
    source: player.source,
  };
}

/**
 * Four primary-key / index reads in parallel (row, balances, jobs, gangs). Account types the character never got a
 * row for show their starting amount, as the first load would create them.
 */
async function fromDatabase(charId: number): Promise<OfflineCharacter | null> {
  const [row, balances, jobs, gangs] = await Promise.all([
    findCharacter(charId),
    storedBalances(charId),
    loadJobs(charId),
    loadGangs(charId),
  ]);
  if (!row) return null;
  const money: Record<string, number> = {};
  for (const [name, type] of accountTypes)
    money[name] = balances.get(name) ?? type.start;
  return {
    info: infoOf(row),
    money,
    jobs,
    gangs: gangs.gangs,
    activeGang: gangs.active,
    metadata: row.metadata,
    position: row.position,
    lastSeen: row.lastPlayed,
    source: null,
  };
}

/** A character loaded (from memory) or stored (read when no load, unload save or write holds it); null = unknown. */
export function getOfflineCharacter(
  charId: number,
): Promise<OfflineCharacter | null> {
  return readCharacter(charId, fromPlayer, () => fromDatabase(charId), null);
}

const LICENSE = /^(?:license:)?([0-9a-f]{40})$/i;

/** The characters of an account by id (index `user_id`) or of every account with a license (index `license`). */
export async function getCharactersOfUser(
  user: unknown,
): Promise<StoredCharacter[]> {
  let rows: CharacterRow[] = [];
  if (typeof user === "number" && Number.isInteger(user) && user > 0)
    rows = await listCharacters(user);
  else if (typeof user === "string") {
    const license = LICENSE.exec(user.trim())?.[1]?.toLowerCase();
    if (license) rows = await listCharactersByLicense(license);
  }
  return rows.map((row) => ({ ...infoOf(row), lastPlayed: row.lastPlayed }));
}
