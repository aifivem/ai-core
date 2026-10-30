import {
  EntityState,
  onServerCallback,
  setVehicleProps,
  setVehicleSetup,
} from "@aicore-fivem/lib/client";
import {
  toVehicleProps,
  toVehicleSetup,
  vehicleTypeOfClass,
  waitFor,
} from "@aicore-fivem/lib/shared";
import { CORE, VEHICLE_BAGS } from "@aicore-fivem/shared";

/** Lib `spawnVehicle` of any resource asks here which `CreateVehicleServerSetter` type a model is (null: no such vehicle). */
onServerCallback(CORE.vehicleTypeCallback, (model) => {
  if (typeof model !== "string") return null;
  const hash = GetHashKey(model);
  return IsModelInCdimage(hash) && IsModelAVehicle(hash)
    ? vehicleTypeOfClass(GetVehicleClassFromName(hash))
    : null;
});

/**
 * A vehicle's stored look (`props`) and a fresh vehicle's setup arrive as state bags; the client that owns the entity
 * applies them and the network copies the result to everyone. The bag can come before the entity streams in.
 */
function applyOnOwner(netId: number, apply: (vehicle: number) => void): void {
  void waitFor(
    () =>
      NetworkDoesEntityExistWithNetworkId(netId)
        ? NetworkGetEntityFromNetworkId(netId)
        : undefined,
    5000,
  )
    .then((vehicle) => {
      if (NetworkGetEntityOwner(vehicle) === PlayerId()) apply(vehicle);
    })
    .catch(() => undefined);
}
new EntityState(
  VEHICLE_BAGS.props,
  (v) => toVehicleProps(v) ?? undefined,
).onChange((netId, props) => {
  if (props) applyOnOwner(netId, (vehicle) => setVehicleProps(vehicle, props));
});
new EntityState(
  VEHICLE_BAGS.setup,
  (v) => toVehicleSetup(v) ?? undefined,
).onChange((netId, setup) => {
  if (setup) applyOnOwner(netId, (vehicle) => setVehicleSetup(vehicle, setup));
});
