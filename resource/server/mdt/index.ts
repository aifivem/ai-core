import {
  GlobalKey,
  registerExport,
  stateString,
} from "@aifivem/lib/server";
import { CORE, toMdtRecord, type MdtRecord } from "@aifivem/shared";
import { AdapterPicker } from "common/adapters";
import { answer } from "../characters/answer";
import { panel, settings } from "../content";
import { log } from "../log";
import { players } from "../player/registry";
import { MDT_SYSTEMS } from "./registry";
import { WarrantCache } from "./warrants";

const warrants = new WarrantCache((resource, error) =>
  log.error(`${resource} warrant check failed`, error),
);

/** The pick, for the client half (`client/mdt`), which opens the MDT's screen. */
const activeMdt = new GlobalKey(CORE.mdtStateKey, stateString);

/**
 * ai-core's MDT layer (lib `mdt`): scripts write fines, warrants, arrests and jail records into the active MDT (panel
 * setting `mdt`, `auto` = first running) and ask it for active warrants; with none running nothing is written and
 * nobody is wanted (no ai-* MDT exists).
 */
const mdt = new AdapterPicker({
  category: "MDT",
  adapters: MDT_SYSTEMS,
  log,
  choice: settings.mdt,
  noneText: "no MDT runs: police records are not written",
  onSwitch: (next) => {
    activeMdt.set(next?.resource);
    warrants.clear();
  },
});
panel.onChange("settings", () => mdt.setChoice(settings.mdt));

/** Writes a record with the players' citizen ids and names; false when the target is not loaded. */
function addRecord(record: MdtRecord): boolean {
  const target = players.get(record.target);
  const by = record.by === undefined ? undefined : players.get(record.by);
  if (!target) return false;
  return mdt.call(
    "record",
    (a) =>
      a.record?.({
        ...record,
        targetCitizenid: target.citizenid,
        targetName: target.fullName,
        byCitizenid: by?.citizenid,
        byName: by?.fullName,
      }) ?? false,
    false,
  );
}

/** Whether a loaded player's server id or a citizenid has an active warrant in the active MDT (false = no or unknown). */
function hasWarrant(target: unknown): Promise<boolean> {
  const citizenid =
    typeof target === "number"
      ? players.get(target)?.citizenid
      : typeof target === "string" && target.length > 0 && target.length <= 50
        ? target
        : undefined;
  const adapter = mdt.active;
  if (citizenid === undefined || !adapter?.hasWarrant)
    return Promise.resolve(false);
  return warrants.ask(adapter, citizenid);
}

registerExport("GetMdtSystem", () => mdt.active?.resource ?? null);
registerExport("AddMdtRecord", (raw: unknown) => {
  const record = toMdtRecord(raw);
  return record !== null && addRecord(record);
});
registerExport("HasMdtWarrant", (target: unknown, done: unknown) => {
  if (typeof done === "function")
    answer("MDT warrant check", hasWarrant(target), done, false);
});
