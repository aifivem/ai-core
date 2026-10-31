import { callExport, PlayerState, stateNumber } from "@aicore-fivem/lib/server";
import type { MedicalAdapter } from "@aicore-fivem/shared";

/** qbx_medical: its death state bag (1 alive, 2 last stand, 3 dead) and its Revive / Heal exports. */
const deathState = new PlayerState("qbx_medical:deathState", stateNumber);
const isDead = (source: number) => (deathState.get(source) ?? 1) >= 2;

export const qbxMedical: MedicalAdapter = {
  resource: "qbx_medical",
  revive: (source) => {
    const was = isDead(source);
    callExport("qbx_medical", "Revive", source);
    return was;
  },
  heal: (source) => void callExport("qbx_medical", "Heal", source),
  isDead,
};
