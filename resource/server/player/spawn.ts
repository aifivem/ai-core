import {
  onClientCallback,
  onClientEvent,
  PlayerMap,
} from "@aicore-fivem/lib/server";
import { oneArg, readInt } from "@aicore-fivem/lib/shared";
import {
  CORE,
  type CharacterActionResult,
  type SpawnPoint,
} from "@aicore-fivem/shared";
import type { CharacterRow } from "../characters/repo";
import { settings } from "../content";
import { externalScreen } from "../multichar/screen";
import { enterWorldBucket } from "./buckets";
import type { Player } from "./player";
import { players } from "./registry";

const BUSY: CharacterActionResult = { ok: false, error: "CHAR_ERR_BUSY" };

/** Spawn options waiting for the player's pick (`settings.spawn.choose`). */
const choosing = new PlayerMap<SpawnPoint[]>();
/** Characters loaded under an external character screen, waiting for the client's "in the world" report. */
const awaiting = new PlayerMap<number>();

onClientCallback(
  CORE.spawnChoiceCallback,
  { args: oneArg((v) => readInt(v, 0, 63)) },
  (source, id): CharacterActionResult => {
    const options = choosing.get(source);
    const spawn = options?.[id];
    const player = players.get(source);
    if (!options || !spawn || !player) return BUSY;
    choosing.delete(source);
    emitNet(CORE.spawnEvent, source, spawn);
    emit(CORE.playerSpawnedEvent, source, player.charId);
    return { ok: true };
  },
);

// The external screen spawned the ped; its client says so once (timing only: nothing is trusted from it).
onClientEvent(CORE.externalSpawnedEvent, (source) => {
  const charId = awaiting.get(source);
  if (charId === undefined || players.get(source)?.charId !== charId) return;
  awaiting.delete(source);
  emit(CORE.playerSpawnedEvent, source, charId);
});

on(CORE.playerUnloadedEvent, (source: number) => awaiting.delete(source));

/**
 * Puts a just-loaded character into the world; true when it spawned now (`playerSpawned` is due). Under an external
 * character screen the ped is that script's: no bucket move, no teleport, no spawn chooser; the client applies armour
 * and health and reports when the player stands in the world (`client/multichar.ts`).
 */
export function spawnCharacter(
  source: number,
  player: Player,
  row: CharacterRow,
): boolean {
  if (externalScreen()) {
    awaiting.set(source, player.charId);
    emitNet(CORE.externalLoadedEvent, source, player.armour(), player.health());
    return false;
  }
  enterWorldBucket(source);
  const base = {
    model: row.sex === "female" ? "mp_f_freemode_01" : "mp_m_freemode_01",
    armour: player.armour(),
    health: player.health(),
  };
  const points = settings.spawn.choose ? settings.spawn.points : [];
  if (points.length === 0) {
    emitNet(CORE.spawnEvent, source, { ...player.spawnPosition(), ...base });
    return true;
  }
  // The last location (a stored character) first, then the panel's points; the spawn waits for the pick.
  const options: SpawnPoint[] = [];
  const labels: Array<{ id: number; label: string; last: boolean }> = [];
  if (row.position) {
    labels.push({ id: options.length, label: "", last: true });
    options.push({ ...row.position, ...base });
  }
  for (const p of points) {
    labels.push({ id: options.length, label: p.label, last: false });
    options.push({ ...p.coords, ...base });
  }
  choosing.set(source, options);
  emitNet(CORE.chooseSpawnEvent, source, labels);
  return false;
}
