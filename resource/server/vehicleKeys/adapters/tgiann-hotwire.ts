import {
  callExport,
  EntityState,
  resourceExport,
  stateBoolean,
} from "@aicore-fivem/lib/server";
import { normalizePlate } from "@aicore-fivem/lib/shared";
import { CORE, type VehicleKeysAdapter } from "@aicore-fivem/shared";

// ai-core's own inventory export: importing the inventory layer here would load it before the panel content.
const core = resourceExport(CORE.resource);
const inIgnition = new EntityState("keyInIgnition", stateBoolean);
const fixedIgnition = new EntityState("nonRemoveableIgnition", stateBoolean);

const hotwire = (name: string, ...args: unknown[]) =>
  callExport("tgiann-hotwire", name, ...args);

/**
 * tgiann-hotwire: keys are `car_key` items (metadata plate + keyId) and a key can sit in the ignition (entity state
 * `keyInIgnition`). A bought vehicle gets a new key item (older copies stop working), a garage vehicle gets back the key
 * it had in the ignition when stored, job / rental / temporary vehicles a key fixed in the ignition (anyone can drive
 * them, nothing is left in an inventory). Its exports take `(netId, entity, ...)`.
 */
export const tgiannHotwire: VehicleKeysAdapter = {
  resource: "tgiann-hotwire",
  give: (source, t, purpose) => {
    if (purpose === "purchase")
      return void hotwire("GiveKeyPlate", source, t.plate, true);
    if (t.vehicle === null)
      return void hotwire("GiveKeyPlate", source, t.plate, false);
    if (purpose === "garage")
      return void hotwire("CheckKeyInIgnitionWhenSpawn", t.netId, t.vehicle);
    hotwire("SetNonRemoveableIgnition", t.netId, t.vehicle, true);
  },
  // Key items stay with the player (they carry their own key id); a fixed ignition key goes away.
  remove: (_source, t) => {
    if (t.vehicle !== null && fixedIgnition.get(t.vehicle))
      hotwire("SetNonRemoveableIgnition", t.netId, t.vehicle, false);
  },
  has: (source, t) => {
    if (t.vehicle !== null && inIgnition.get(t.vehicle)) return true;
    const plate = normalizePlate(t.plate);
    return core
      .GetItems(source)
      .some(
        (s) =>
          s.name === "car_key" &&
          normalizePlate(String(s.metadata.plate)) === plate,
      );
  },
};
