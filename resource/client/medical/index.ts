import {
  GlobalKey,
  registerExport,
  stateString,
} from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import { CORE, type MedicalClientAdapter } from "@aicore-fivem/shared";
import { AdapterFollower } from "common/adapters";
import { brutalAmbulance, ospAmbulance } from "./adapters/exports";
import { qbAmbulance } from "./adapters/qb-ambulancejob";
import {
  aiDeath,
  arsAmbulance,
  esxAmbulance,
  qbxMedical,
  tgiannAmbulance,
  wasabiAmbulance,
  wasabiAmbulanceV2,
} from "./adapters/states";

/** Client halves of the death scripts (server list: `server/medical/index.ts`). */
const ADAPTERS: readonly MedicalClientAdapter[] = [
  aiDeath,
  qbxMedical,
  arsAmbulance,
  qbAmbulance,
  esxAmbulance,
  tgiannAmbulance,
  wasabiAmbulanceV2,
  wasabiAmbulance,
  ospAmbulance,
  brutalAmbulance,
];

/**
 * The client half of the medical layer: follows the death script the server picked and tells every resource when
 * the local player goes down or gets up (`CORE.clientDeadEvent`, lib `medical.isDead`), so no script reads a death
 * script's state bag or trusts `IsEntityDead` (death scripts keep a downed ped alive to animate it).
 */
const pick = new GlobalKey(CORE.medicalStateKey, stateString);
const layer = new AdapterFollower(ADAPTERS, pick, createLogger("ai-core"));
let dead = false;

function update(): void {
  const now = layer.call("isDead", (a) => a.isDead(), false);
  if (now === dead) return;
  dead = now;
  emit(CORE.clientDeadEvent, now);
}

for (const adapter of ADAPTERS)
  adapter.watch(() => {
    if (layer.active === adapter) update();
  });
// The follower listens first, so its new pick is in place here.
pick.onChange(update);
update();

registerExport("IsDead", () => dead);
