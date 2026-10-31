import type { VehicleKeysAdapter } from "@aicore-fivem/shared";
import { aiVehicleKeys } from "./adapters/ai-vehiclekeys";
import { cdGarage } from "./adapters/cd_garage";
import { clientKeys } from "./adapters/client";
import { mrNewbVehicleKeys } from "./adapters/MrNewbVehicleKeys";
import { mVehicle } from "./adapters/mVehicle";
import { qbVehicleKeys } from "./adapters/qb-vehiclekeys";
import { qbxVehicleKeys } from "./adapters/qbx_vehiclekeys";
import { renewedVehicleKeys } from "./adapters/Renewed-Vehiclekeys";
import { tgiannHotwire } from "./adapters/tgiann-hotwire";
import { jaksamVehicleKeys } from "./adapters/vehicles_keys";
import { wasabiCarlock } from "./adapters/wasabi_carlock";

/** Key systems with only a client API: each has its client adapter in `resource/client/vehicleKeys/adapters/`. */
export const CLIENT_KEY_SYSTEMS = [
  "qs-vehiclekeys",
  "okokGarage",
  "0r-vehiclekeys",
  "LifeSaver_KeySystem",
  "ak47_qb_vehiclekeys",
  "ak47_vehiclekeys",
  "brutal_keys",
  "filo_vehiclekey",
  "ic3d_vehiclekeys",
  "is_vehiclekeys",
  "mk_vehiclekeys",
  "mm_carkeys",
  "p_carkeys",
  "rd_vehiclekeys",
  "t1ger_keys",
] as const;

/**
 * Every supported key system, in detection order: `auto` uses the first one running. ai-vehiclekeys comes first
 * because it `provide`s qbx_vehiclekeys (that name reads started while it runs).
 * A new key system = one adapter file and one line here (and its client adapter when it has only a client API).
 */
export const KEY_SYSTEMS: readonly VehicleKeysAdapter[] = [
  aiVehicleKeys,
  tgiannHotwire,
  qbxVehicleKeys,
  qbVehicleKeys,
  wasabiCarlock,
  renewedVehicleKeys,
  mrNewbVehicleKeys,
  jaksamVehicleKeys,
  mVehicle,
  cdGarage,
  ...CLIENT_KEY_SYSTEMS.map(clientKeys),
];
