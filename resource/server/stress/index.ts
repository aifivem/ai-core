import { registerExport } from "@aicore-fivem/lib/server";
import { AdapterPicker } from "common/adapters";
import { log } from "../log";
import { STRESS_SYSTEMS } from "./registry";

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
