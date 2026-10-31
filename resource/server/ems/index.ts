import { isOnline, registerExport } from "@aicore-fivem/lib/server";
import {
  toDistressCall,
  type DistressCall,
  type EmsAdapter,
} from "@aicore-fivem/shared";
import { Locale } from "common";
import { AdapterPicker } from "common/adapters";
import { panel, settings } from "../content";
import { sendAlert } from "../dispatch";
import { dutyCount } from "../jobs/dutyCount";
import { log } from "../log";
import { EMS_SCRIPTS } from "./registry";

/** ai-core's own part: on-duty members from its duty counts, distress calls as alerts to the jobs (dispatch layer). */
const builtinEms = {
  resource: "ai-core",
  available: (jobs: readonly string[]) =>
    jobs.reduce((sum, job) => sum + dutyCount(job), 0),
  distress: (source: number, call: DistressCall) =>
    sendAlert({
      code: "10-52",
      title: Locale("EMS_DISTRESS_TITLE"),
      message: call.message,
      jobs: call.jobs,
      source,
      icon: "kit-medical",
      priority: "high",
    }),
} satisfies EmsAdapter;

/**
 * ai-core's EMS layer (lib `ems`): how many medics are free and distress calls, from the active EMS script (panel
 * setting `ems`, `auto` = first running); what that script does not answer, ai-core answers itself.
 */
const ems = new AdapterPicker({
  category: "EMS",
  adapters: [...EMS_SCRIPTS, builtinEms],
  log,
  choice: settings.ems,
});
panel.onChange("settings", () => ems.setChoice(settings.ems));

const jobList = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.filter((j): j is string => typeof j === "string").slice(0, 10)
    : [];

registerExport("GetEmsSystem", () => ems.active?.resource ?? null);
registerExport("GetAvailableMedics", (raw: unknown) => {
  const jobs = jobList(raw);
  return ems.call(
    "available",
    (a) => (a.available ?? builtinEms.available)(jobs),
    builtinEms.available(jobs),
  );
});
registerExport("SendDistress", (source: unknown, raw: unknown) => {
  const call = toDistressCall(raw);
  if (typeof source !== "number" || !isOnline(source) || !call) return false;
  return ems.call(
    "distress",
    (a) => (a.distress ?? builtinEms.distress)(source, call),
    false,
  );
});
