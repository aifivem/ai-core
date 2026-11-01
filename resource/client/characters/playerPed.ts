import { requestModel } from "@aicore-fivem/lib/client";
import { waitFor } from "@aicore-fivem/lib/shared";
import type { SceneSpot, Sex, SpawnPoint } from "@aicore-fivem/shared";
import { spawnArmour } from "../armour";

/** The local player's ped around the character screen: its model, waiting under the scene, entering the world. */

/** The freemode ped model of each sex. */
export const FREEMODE: Record<Sex, string> = {
  male: "mp_m_freemode_01",
  female: "mp_f_freemode_01",
};

/** Swaps the player's model (freemode by sex) and resets its clothing to the defaults. */
export async function setPlayerModel(model: string): Promise<void> {
  const hash = await requestModel(model);
  if (GetEntityModel(PlayerPedId()) !== hash) {
    SetPlayerModel(PlayerId(), hash);
    SetPedDefaultComponentVariation(PlayerPedId());
  }
  SetModelAsNoLongerNeeded(hash);
}

/** Waits (at most a few seconds) for the map around the ped to load, so it does not fall through. */
export async function waitForGround(): Promise<void> {
  await waitFor(
    () => HasCollisionLoadedAroundEntity(PlayerPedId()) || undefined,
    5000,
  ).catch(() => undefined);
}

/** The player waits invisible and frozen under the focused spot, so the area's collision and map stream in. */
export function hidePlayer(spot: SceneSpot): void {
  const { x, y, heading } = spot.ped;
  const z = spot.ped.z - 5;
  RequestCollisionAtCoord(x, y, z);
  NetworkResurrectLocalPlayer(x, y, z, heading, 0, false);
  const ped = PlayerPedId();
  SetEntityCoordsNoOffset(ped, x, y, z, false, false, false);
  FreezeEntityPosition(ped, true);
  SetEntityInvincible(ped, true);
  SetEntityVisible(ped, false, false);
}

/** Puts the player's ped into the world at a spawn point: model, position, ground, then visible with its armour and health. */
export async function placePlayer(spawn: SpawnPoint): Promise<void> {
  await setPlayerModel(spawn.model);
  RequestCollisionAtCoord(spawn.x, spawn.y, spawn.z);
  NetworkResurrectLocalPlayer(
    spawn.x,
    spawn.y,
    spawn.z,
    spawn.heading,
    0,
    false,
  );
  const ped = PlayerPedId();
  SetEntityCoordsNoOffset(ped, spawn.x, spawn.y, spawn.z, false, false, false);
  SetEntityHeading(ped, spawn.heading);
  await waitForGround();
  FreezeEntityPosition(ped, false);
  SetEntityInvincible(ped, false);
  SetEntityVisible(ped, true, false);
  spawnArmour.apply(ped, spawn.armour, spawn.health);
}
