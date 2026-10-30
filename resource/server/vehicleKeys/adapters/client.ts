import {
  VEHICLE_KEYS_CLIENT_EVENT,
  type VehicleKeysAdapter,
} from "@aicore-fivem/shared";

/**
 * A key system with only a client API: the server half forwards to the player's client, where ai-core's client adapter
 * of the same resource (`resource/client/vehicleKeys/adapters/`) calls it. Needs the vehicle networked.
 */
export const clientKeys = (resource: string): VehicleKeysAdapter => ({
  resource,
  give: (source, t, purpose) =>
    void (
      t.netId !== null &&
      emitNet(
        VEHICLE_KEYS_CLIENT_EVENT,
        source,
        "give",
        t.netId,
        t.plate,
        purpose,
      )
    ),
  remove: (source, t) =>
    void (
      t.netId !== null &&
      emitNet(VEHICLE_KEYS_CLIENT_EVENT, source, "remove", t.netId, t.plate)
    ),
});
