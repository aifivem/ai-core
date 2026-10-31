import {
  GlobalKey,
  isOnline,
  registerExport,
  stateString,
} from "@aicore-fivem/lib/server";
import { CORE, type MedicalAdapter } from "@aicore-fivem/shared";
import { AdapterPicker } from "common/adapters";
import { log } from "../log";
import { aiDeath } from "./adapters/ai-death";
import { arsAmbulance } from "./adapters/ars_ambulancejob";
import { esxAmbulance } from "./adapters/esx_ambulancejob";
import { qbAmbulance } from "./adapters/qb-ambulancejob";
import { qbxMedical } from "./adapters/qbx_medical";

/**
 * Every supported death / ambulance script in detection order: the first running one answers. ai-death comes first
 * because it `provide`s qbx_medical. A new death script = one adapter file and one line here.
 */
const MEDICAL_SYSTEMS: readonly MedicalAdapter[] = [
  aiDeath,
  qbxMedical,
  arsAmbulance,
  qbAmbulance,
  esxAmbulance,
];

/** The pick, for the client half (`client/medical`), which tells every resource when the local player is down. */
const activeMedical = new GlobalKey(CORE.medicalStateKey, stateString);

/**
 * ai-core's medical layer (lib `medical`): revive, heal and the down state through whatever death script runs, so
 * admin tools and scripts never call one directly. With none running nobody is down and nothing can be revived.
 */
export const medical = new AdapterPicker({
  category: "medical",
  adapters: MEDICAL_SYSTEMS,
  log,
  noneText: "no death script runs: revive and heal do nothing",
  onSwitch: (next) => activeMedical.set(next?.resource),
});

const online = (v: unknown): v is number =>
  typeof v === "number" && isOnline(v);

registerExport("GetMedicalSystem", () => medical.active?.resource ?? null);
registerExport(
  "RevivePlayer",
  (source: unknown) =>
    online(source) && medical.call("revive", (a) => a.revive(source), false),
);
registerExport(
  "HealPlayer",
  (source: unknown) =>
    online(source) &&
    medical.call(
      "heal",
      (a) => {
        a.heal(source);
        return true;
      },
      false,
    ),
);
registerExport(
  "IsPlayerDead",
  (source: unknown) =>
    online(source) && medical.call("isDead", (a) => a.isDead(source), false),
);
