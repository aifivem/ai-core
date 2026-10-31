import {
  cache,
  PlayerState,
  stateBoolean,
  stateNumber,
  stateString,
} from "@aicore-fivem/lib/client";
import { PLAYER_BAGS, type MedicalClientAdapter } from "@aicore-fivem/shared";

/** A death script that marks the down player in a player state bag: the local player's value decides. */
function stateAdapter<T>(
  resource: string,
  state: PlayerState<T>,
  down: (value: T | undefined) => boolean,
): MedicalClientAdapter {
  return {
    resource,
    isDead: () => down(state.get(cache.serverId)),
    watch: (changed) =>
      state.onChange((id) => {
        if (id === cache.serverId) changed();
      }),
  };
}

const deadBag = new PlayerState(PLAYER_BAGS.dead, stateBoolean);

/** ai-death and ars_ambulancejob share the `dead` key. */
export const aiDeath = stateAdapter("ai-death", deadBag, (v) => v === true);
export const arsAmbulance = stateAdapter(
  "ars_ambulancejob",
  deadBag,
  (v) => v === true,
);
/** qbx_medical: 1 alive, 2 last stand, 3 dead. */
export const qbxMedical = stateAdapter(
  "qbx_medical",
  new PlayerState("qbx_medical:deathState", stateNumber),
  (v) => (v ?? 1) >= 2,
);
/** ESX core keeps `isDead` (esx_ambulancejob and the scripts built on it). */
export const esxAmbulance = stateAdapter(
  "esx_ambulancejob",
  new PlayerState("isDead", stateBoolean),
  (v) => v === true,
);
/** tgiann-ambulance: its server sets `isDead` (down or dead), the ESX key. */
export const tgiannAmbulance = stateAdapter(
  "tgiann-ambulance",
  new PlayerState("isDead", stateBoolean),
  (v) => v === true,
);
/** wasabi_ambulance (v1): `dead` is `"dead"` or `"laststand"` while down. */
export const wasabiAmbulance = stateAdapter(
  "wasabi_ambulance",
  new PlayerState("dead", stateString),
  (v) => v === "dead" || v === "laststand",
);
/** wasabi_ambulance_v2: 0 alive, 1 last stand, 2 dead (its default key). */
export const wasabiAmbulanceV2 = stateAdapter(
  "wasabi_ambulance_v2",
  new PlayerState("wasabi:deathState", stateNumber),
  (v) => (v ?? 0) >= 1,
);
