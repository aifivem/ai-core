import {
  GlobalKey,
  registerExport,
  stateString,
} from "@aicore-fivem/lib/server";
import { CORE, toMdtRecord, type MdtRecord } from "@aicore-fivem/shared";
import { AdapterPicker } from "common/adapters";
import { panel, settings } from "../content";
import { log } from "../log";
import { players } from "../player/registry";
import { MDT_SYSTEMS } from "./registry";

/** The pick, for the client half (`client/mdt`), which opens the MDT's screen. */
const activeMdt = new GlobalKey(CORE.mdtStateKey, stateString);

/**
 * ai-core's MDT layer (lib `mdt`): scripts write fines, warrants, arrests and jail records into the active MDT (panel
 * setting `mdt`, `auto` = first running); with none running nothing is written (no ai-* MDT exists).
 */
const mdt = new AdapterPicker({
  category: "MDT",
  adapters: MDT_SYSTEMS,
  log,
  choice: settings.mdt,
  noneText: "no MDT runs: police records are not written",
  onSwitch: (next) => activeMdt.set(next?.resource),
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

registerExport("GetMdtSystem", () => mdt.active?.resource ?? null);
registerExport("AddMdtRecord", (raw: unknown) => {
  const record = toMdtRecord(raw);
  return record !== null && addRecord(record);
});
