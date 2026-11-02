import { registerExport } from "@aifivem/lib/server";
import { AdapterPicker } from "common/adapters";
import { log } from "../log";
import { players } from "../player/registry";
import {
  addMetadataNeed,
  refillMetadata,
  setMetadataNeed,
  STRESS_SYSTEMS,
} from "./registry";

/** ai-core's stress layer: stress goes to whichever HUD keeps it (first running in registry order). */
const layer = new AdapterPicker({
  category: "stress",
  adapters: STRESS_SYSTEMS,
  log,
  noneText: "no HUD with stress runs: stress changes are dropped",
});

registerExport("GetStressSystem", () => layer.active?.resource ?? null);
registerExport("AddStress", (source: unknown, amount: unknown) => {
  if (
    typeof source !== "number" ||
    !Number.isInteger(source) ||
    source <= 0 ||
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount === 0 ||
    Math.abs(amount) > 100
  )
    return false;
  return layer.call("add", (a) => (a.add(source, amount), true), false);
});
registerExport("RefillNeeds", (source: unknown) => {
  if (typeof source !== "number" || players.get(source) === undefined)
    return false;
  if (!layer.active) return refillMetadata(source);
  return layer.call("refill", (a) => (a.refill(source), true), false);
});
registerExport("AddNeed", (source: unknown, need: unknown, amount: unknown) => {
  if (
    typeof source !== "number" ||
    players.get(source) === undefined ||
    (need !== "hunger" && need !== "thirst") ||
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount === 0 ||
    Math.abs(amount) > 100
  )
    return false;
  if (!layer.active) return addMetadataNeed(source, need, amount);
  return layer.call(
    "addNeed",
    (a) => (a.addNeed(source, need, amount), true),
    false,
  );
});
registerExport("SetNeed", (source: unknown, need: unknown, value: unknown) => {
  if (
    typeof source !== "number" ||
    players.get(source) === undefined ||
    (need !== "hunger" && need !== "thirst") ||
    typeof value !== "number" ||
    !Number.isFinite(value)
  )
    return false;
  const clamped = Math.min(100, Math.max(0, value));
  if (!layer.active) return setMetadataNeed(source, need, clamped);
  return layer.call(
    "setNeed",
    (a) => (a.setNeed(source, need, clamped), true),
    false,
  );
});
