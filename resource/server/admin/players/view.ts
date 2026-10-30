import type { CharacterView, Position } from "common/adminPlayers";
import { findCharacter } from "../../characters/repo";
import { accountTypes } from "../../content";
import { loadGangs, loadJobs } from "../../jobs/repo";
import { players } from "../../player/registry";
import { storedBalances, userOf } from "./repo";

function pedPosition(source: number): Position | null {
  const ped = GetPlayerPed(String(source));
  if (!ped || !DoesEntityExist(ped)) return null;
  const [x = 0, y = 0, z = 0] = GetEntityCoords(ped);
  return { x, y, z, heading: GetEntityHeading(ped) };
}

/**
 * The detail screen's snapshot of one character: account and stored rows from the DB, and for a loaded character
 * everything live from memory (memory is the truth while it is online). Null when it does not exist (or was deleted).
 */
export async function loadView(charId: number): Promise<CharacterView | null> {
  const row = await findCharacter(charId);
  if (!row) return null;
  const user = await userOf(row.userId);
  const base = {
    charId,
    citizenid: row.citizenid,
    slot: row.slot,
    user: {
      id: row.userId,
      fivem: user?.fivem ?? "",
      license: user?.license ?? null,
      discord: user?.discord ?? null,
      name: user?.name ?? "",
    },
    lastPlayed: row.lastPlayed,
  };
  // Looked up after the awaits: the character may have loaded meanwhile.
  const player = players.byCharacter(charId);
  if (player) {
    const info = player.info();
    return {
      ...base,
      firstname: info.firstname,
      lastname: info.lastname,
      birthdate: info.birthdate,
      sex: info.sex,
      source: player.source,
      money: player.wallet.snapshot(),
      jobs: player.jobs.all(),
      duty: player.jobs.onDuty(),
      gangs: player.gangs.all(),
      activeGang: player.gangs.activeGang(),
      metadata: player.metadata(),
      position: pedPosition(player.source),
    };
  }
  const [balances, jobs, gangs] = await Promise.all([
    storedBalances(charId),
    loadJobs(charId),
    loadGangs(charId),
  ]);
  // An account the character never had is created with the type's starting amount at its next load.
  const money: Record<string, number> = {};
  for (const [name, type] of accountTypes)
    money[name] = balances.get(name) ?? type.start;
  return {
    ...base,
    firstname: row.firstname,
    lastname: row.lastname,
    birthdate: row.birthdate,
    sex: row.sex,
    source: null,
    money,
    jobs,
    duty: null,
    gangs: gangs.gangs,
    activeGang: gangs.active,
    metadata: row.metadata,
    position: row.position,
  };
}
