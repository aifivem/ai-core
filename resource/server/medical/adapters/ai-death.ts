import { resourceExport } from "@aicore-fivem/lib/server";
import type { MedicalAdapter } from "@aicore-fivem/shared";

/** ai-death: ai-core's own death and hospital script (it also `provide`s qbx_medical). */
const death = resourceExport("ai-death");

export const aiDeath: MedicalAdapter = {
  resource: "ai-death",
  revive: (source) => death.Revive(source) === true,
  heal: (source) => death.Heal(source),
  isDead: (source) => death.IsDead(source) === true,
};
