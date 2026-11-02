import { registerExport } from "@aifivem/lib/server";
import { isRecord } from "@aifivem/lib/shared";
import { CORE } from "@aifivem/shared";
import { isNeed, NEEDS } from "common/needs";
import { players } from "../player/registry";
import { addStress } from "../stress";
import { needsStore } from "./store";
import "./decay";

/** ai-core's hunger and thirst: item effects and the exports (lib `needs`, the bridges). */

const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

// Items with hunger / thirst / stress values (inventories that define them); stress goes to the HUD that keeps it.
on(CORE.itemUsedEvent, (source: number, _name: string, status: unknown) => {
  const player = players.get(source);
  if (!player || !isRecord(status)) return;
  for (const need of NEEDS) {
    const value = status[need];
    if (finite(value) && value !== 0) needsStore.add(player, need, value);
  }
  if (finite(status.stress) && status.stress !== 0)
    addStress(source, status.stress);
});

registerExport("RefillNeeds", (source: unknown) => {
  const player = typeof source === "number" ? players.get(source) : undefined;
  if (!player) return false;
  for (const need of NEEDS) needsStore.set(player, need, 100);
  return true;
});
registerExport("AddNeed", (source: unknown, need: unknown, amount: unknown) => {
  const player = typeof source === "number" ? players.get(source) : undefined;
  if (
    !player ||
    !isNeed(need) ||
    !finite(amount) ||
    amount === 0 ||
    Math.abs(amount) > 100
  )
    return false;
  needsStore.add(player, need, amount);
  return true;
});
registerExport("SetNeed", (source: unknown, need: unknown, value: unknown) => {
  const player = typeof source === "number" ? players.get(source) : undefined;
  if (!player || !isNeed(need) || !finite(value)) return false;
  needsStore.set(player, need, value);
  return true;
});
