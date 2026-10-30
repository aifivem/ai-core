import { isOnline, registerExport } from "@aicore-fivem/lib/server";
import type { MedicalAdapter } from "@aicore-fivem/shared";
import { AdapterPicker } from "common/adapters";
import { log } from "../log";
import { aiDeath } from "./adapters/ai-death";

/**
 * Every supported death / ambulance script in detection order: the first running one answers. ai-death comes first
 * because it `provide`s qbx_medical. A new death script = one adapter file and one line here.
 */
const MEDICAL_SYSTEMS: readonly MedicalAdapter[] = [aiDeath];

/**
 * ai-core's medical layer (lib `medical`): revive, heal and the down state through whatever death script runs, so
 * admin tools and scripts never call one directly. With none running nobody is down and nothing can be revived.
 */
export const medical = new AdapterPicker({
  category: "medical",
  adapters: MEDICAL_SYSTEMS,
  log,
  noneText: "no death script runs: revive and heal do nothing",
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
