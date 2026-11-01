import {
  EntityState,
  onServerCallback,
  setVehicleProps,
  setVehicleSetup,
  waitForEntity,
} from "@aicore-fivem/lib/client";
import {
  toVehicleProps,
  toVehicleSetup,
  vehicleTypeOfClass,
} from "@aicore-fivem/lib/shared";
import { CORE, VEHICLE_BAGS } from "@aicore-fivem/shared";

/** Lib `spawnVehicle` of any resource asks here which `CreateVehicleServerSetter` type a model (name or hash) is (null: no such vehicle). */
onServerCallback(CORE.vehicleTypeCallback, (model) => {
  let hash: number;
  if (typeof model === "string") hash = GetHashKey(model);
  else if (Number.isInteger(model)) hash = (model as number) | 0;
  else return null;
  return IsModelInCdimage(hash) && IsModelAVehicle(hash)
    ? vehicleTypeOfClass(GetVehicleClassFromName(hash))
    : null;
});

/**
 * A vehicle's stored look (`props`) and a fresh vehicle's setup arrive as state bags; the client that owns the entity
 * applies them and the network copies the result to everyone. The bag can come before the entity streams in.
 */
function applyOnOwner(netId: number, apply: (vehicle: number) => void): void {
  void waitForEntity(netId, 5000).then((vehicle) => {
    if (vehicle && NetworkGetEntityOwner(vehicle) === PlayerId())
      apply(vehicle);
  });
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
