import { round } from "@aicore-fivem/lib/shared";
import {
  CORE,
  type DeathCause,
  type DeathInfo,
  type DeathPoint,
} from "@aicore-fivem/shared";
import { players } from "./registry";

/** The player whose ped this is: a player always owns its own ped, so the owner is checked instead of scanning 10k players. */
function sourceOfPed(ped: number): number | null {
  if (ped === 0 || !DoesEntityExist(ped)) return null;
  const owner = NetworkGetEntityOwner(ped);
  return owner > 0 &&
    players.get(owner) !== undefined &&
    GetPlayerPed(String(owner)) === ped
    ? owner
    : null;
}

const hashes = (names: string[]): Set<number> =>
  new Set(names.map((name) => GetHashKey(name) | 0));

/** Weapon hashes FXServer reports for causes other than a gun, by cause (GTA's death "weapons"). */
const CAUSES: [DeathCause, Set<number>][] = [
  ["fall", hashes(["WEAPON_FALL"])],
  ["drown", hashes(["WEAPON_DROWNING", "WEAPON_DROWNING_IN_VEHICLE"])],
  [
    "vehicle",
    hashes([
      "WEAPON_RUN_OVER_BY_CAR",
      "WEAPON_RAMMED_BY_CAR",
      "VEHICLE_WEAPON_ROTORS",
    ]),
  ],
  [
    "fire",
    hashes([
      "WEAPON_FIRE",
      "WEAPON_MOLOTOV",
      "WEAPON_FLARE",
      "WEAPON_PETROLCAN",
    ]),
  ],
  [
    "explosion",
    hashes([
      "WEAPON_EXPLOSION",
      "WEAPON_GRENADE",
      "WEAPON_STICKYBOMB",
      "WEAPON_PIPEBOMB",
      "WEAPON_PROXMINE",
      "WEAPON_RPG",
      "WEAPON_HOMINGLAUNCHER",
      "WEAPON_GRENADELAUNCHER",
      "WEAPON_COMPACTLAUNCHER",
      "WEAPON_FIREWORK",
      "WEAPON_RAILGUN",
      "WEAPON_RAILGUNXM3",
      "WEAPON_EMPLAUNCHER",
    ]),
  ],
  ["animal", hashes(["WEAPON_ANIMAL", "WEAPON_COUGAR"])],
  [
    "melee",
    hashes([
      "WEAPON_UNARMED",
      "WEAPON_KNIFE",
      "WEAPON_DAGGER",
      "WEAPON_BAT",
      "WEAPON_BOTTLE",
      "WEAPON_CROWBAR",
      "WEAPON_FLASHLIGHT",
      "WEAPON_GOLFCLUB",
      "WEAPON_HAMMER",
      "WEAPON_HATCHET",
      "WEAPON_KNUCKLE",
      "WEAPON_MACHETE",
      "WEAPON_NIGHTSTICK",
      "WEAPON_WRENCH",
      "WEAPON_BATTLEAXE",
      "WEAPON_POOLCUE",
      "WEAPON_STONE_HATCHET",
      "WEAPON_SWITCHBLADE",
      "WEAPON_CANDYCANE",
      "WEAPON_STUNROD",
    ]),
  ],
  [
    "other",
    hashes([
      "WEAPON_BLEEDING",
      "WEAPON_EXHAUSTION",
      "WEAPON_ELECTRIC_FENCE",
      "WEAPON_BARBED_WIRE",
      "WEAPON_HIT_BY_WATER_CANNON",
    ]),
  ],
];
function causeOf(weapon: number): DeathCause {
  const hash = weapon | 0;
  for (const [cause, set] of CAUSES) if (set.has(hash)) return cause;
  return "firearm";
}

function pointOf(entity: number): DeathPoint {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(entity);
  return { x: round(x, 1), y: round(y, 1), z: round(z, 1) };
}

/** The ped behind an attacker entity: itself, or the driver of a vehicle that ran the player over. */
function attackerPed(attacker: number): number {
  if (attacker === 0 || !DoesEntityExist(attacker)) return 0;
  const type = GetEntityType(attacker);
  if (type === 1) return attacker;
  if (type === 2) return GetPedInVehicleSeat(attacker, -1);
  return 0;
}

function deathInfo(ped: number, attacker: number, weapon: number): DeathInfo {
  const cause = causeOf(weapon);
  const killerPed = attackerPed(attacker);
  const killer =
    killerPed !== 0 && killerPed !== ped ? sourceOfPed(killerPed) : null;
  const coords = pointOf(ped);
  let killedBy: DeathInfo["killedBy"];
  if (killer !== null) killedBy = "player";
  else if (killerPed !== 0 && killerPed !== ped) killedBy = "npc";
  else if (killerPed === ped) killedBy = "self";
  else killedBy = "world";
  const other = killedBy === "player" || killedBy === "npc";
  const killerCoords = other ? pointOf(killerPed) : null;
  return {
    killer,
    killedBy,
    cause,
    weapon,
    coords,
    killerCoords,
    distance: killerCoords
      ? round(
          Math.hypot(
            coords.x - killerCoords.x,
            coords.y - killerCoords.y,
            coords.z - killerCoords.z,
          ),
          1,
        )
      : null,
    inVehicle: GetVehiclePedIsIn(ped, false) !== 0,
    killerInVehicle: other && GetVehiclePedIsIn(killerPed, false) !== 0,
  };
}

// FXServer reports ped deaths from the synced health itself (38039+, required in ai-core's manifest): no client
// watches its own health, and the details below come from the server's entities, never from a client's report.
on("onPedDeath", (ped: number, attacker: number, weaponHash: number) => {
  const source = sourceOfPed(ped);
  if (source === null) return;
  const info = deathInfo(ped, attacker, weaponHash);
  emit(CORE.playerDiedEvent, source, info.killer, weaponHash, info);
});
