import { callExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { GarageAdapter, GaragedVehicle } from "@aicore-fivem/shared";
import { players } from "../../player/registry";

const RESOURCE = "tgiann-realparking";

/** One row of `GetPlayerVehicleDetails`; vehicles out in the world are skipped. */
function row(v: unknown): GaragedVehicle | null {
  if (!isRecord(v) || typeof v.plate !== "string" || v.state === "out")
    return null;
  const props = isRecord(v.properties) ? v.properties : {};
  return {
    plate: v.plate,
    model: typeof props.model === "string" ? props.model : null,
    garage: typeof v.garageKey === "string" ? v.garageKey : null,
    impounded: v.state === "impounded",
  };
}

/**
 * tgiann-realparking (`server/exports.lua`, `server/policeImpound.lua`, `server/vehicleDetails/details.lua`):
 * `ImpoundVehicle(plate, { deleteVehicle })` -> ok, error (a Lua pair: an array in JS) and
 * `GetPlayerVehicleDetails(citizenid)` (waits on the database: a Promise in JS). It has no export to park a vehicle or
 * open a garage menu.
 */
export const tgiannRealparking: GarageAdapter = {
  resource: RESOURCE,
  version: "2.14.0",
  impound: (_vehicle, plate) => {
    const answer = callExport(RESOURCE, "ImpoundVehicle", plate, {
      deleteVehicle: true,
    });
    return (Array.isArray(answer) ? answer[0] : answer) === true;
  },
  stored: async (source) => {
    const citizenid = players.get(source)?.citizenid;
    if (citizenid === undefined) return null;
    const rows: unknown = await callExport(
      RESOURCE,
      "GetPlayerVehicleDetails",
      citizenid,
    );
    return Array.isArray(rows)
      ? rows.flatMap((v) => {
          const vehicle = row(v);
          return vehicle ? [vehicle] : [];
        })
      : null;
  },
};
