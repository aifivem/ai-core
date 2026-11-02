import { registerExport } from "@aifivem/lib/server";
import { AdapterPicker } from "common/adapters";
import { log } from "../log";
import { needsStore } from "../needs/store";
import { qbShowNeeds, STRESS_SYSTEMS } from "./registry";

/** ai-core's stress layer: stress goes to whichever HUD keeps it (first running in registry order). */
const layer = new AdapterPicker({
  category: "stress",
  adapters: STRESS_SYSTEMS,
  log,
  noneText: "no HUD with stress runs: stress changes are dropped",
});

/** Adds stress through the HUD that keeps it (a negative amount relieves); false when refused or none runs. */
export function addStress(source: number, amount: unknown): boolean {
  if (
    !Number.isInteger(source) ||
    source <= 0 ||
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount === 0 ||
    Math.abs(amount) > 100
  )
    return false;
  return layer.call("add", (a) => (a.add(source, amount), true), false);
}

/** Stress points per minute ai-core's needs pass takes away (the active HUD's relief, 0 when it fades stress itself). */
export function stressRelief(): number {
  return layer.call("relief", (a) => a.relief?.() ?? 0, 0);
}

// Hunger and thirst changed: the active HUD draws them; without one QB's event (any QB-style HUD listens to it).
needsStore.onChange((player, need) => {
  if (need === "stress") return;
  const hunger = Math.round(needsStore.get(player, "hunger"));
  const thirst = Math.round(needsStore.get(player, "thirst"));
  const active = layer.active;
  if (!active) return qbShowNeeds(player.source, hunger, thirst);
  layer.call(
    "showNeeds",
    () => active.showNeeds(player.source, hunger, thirst),
    undefined,
  );
});

registerExport("GetStressSystem", () => layer.active?.resource ?? null);
registerExport("AddStress", (source: unknown, amount: unknown) =>
  typeof source === "number" ? addStress(source, amount) : false,
);
