import { registerExport } from "@aicore-fivem/lib/server";
import { AdapterPicker } from "common/adapters";
import { gangs, jobs, panel, settings } from "../content";
import { log } from "../log";
import { sharedAccounts } from "../money/book";
import { players } from "../player/registry";
import { societyLink } from "./link";
import { BANKING_SYSTEMS } from "./registry";

/**
 * ai-core's banking layer (lib `banking`): opens a banking script's screen, reports a job's society balance and keeps
 * the script's own job / gang accounts linked to ai-core's (`./link.ts`, panel setting `bankAccounts`: `core` = ai-core
 * holds the money and the script shows it, `own` = the script holds it). Picked by the panel setting `banking`
 * (`auto` = first running).
 */
const banking = new AdapterPicker({
  category: "banking",
  adapters: BANKING_SYSTEMS,
  log,
  choice: settings.banking,
  noneText: "no banking script runs: job money stays in ai-core only",
  onSwitch: (next, previous) => societyLink.activate(next, previous),
});
let mode = settings.bankAccounts;
panel.onChange("settings", () => {
  banking.setChoice(settings.banking);
  if (settings.bankAccounts === mode) return;
  mode = settings.bankAccounts;
  societyLink.activate(banking.active, banking.active);
});
// A job or gang added in the panel gets linked too (an edit of a known one changes nothing here).
const seen = { jobs: new Set(jobs.keys()), gangs: new Set(gangs.keys()) };
for (const file of ["jobs", "gangs"] as const)
  panel.onChange(file, (key, value) => {
    if (key === undefined || value === null || seen[file].has(key)) return;
    seen[file].add(key);
    societyLink.activate(banking.active, banking.active);
  });

registerExport("GetBankingSystem", () => banking.active?.resource ?? null);
registerExport(
  "OpenBank",
  (source: unknown) =>
    typeof source === "number" &&
    players.get(source) !== undefined &&
    banking.call("open", (a) => a.open?.(source) ?? false, false),
);
// `core`: the society balance is ai-core's job account; `own`: the script's own.
registerExport("GetBankSocietyBalance", (job: unknown) => {
  if (typeof job !== "string" || !banking.active) return null;
  if (settings.bankAccounts === "core")
    return sharedAccounts.get("job", job, "bank")?.balance ?? null;
  return banking.call("societyBalance", (a) => a.societyBalance(job), null);
});
