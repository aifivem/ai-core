import { GlobalKey, registerExport, stateString } from "@aifivem/lib/server";
import {
  CORE,
  toMdtRecord,
  type MdtRecord,
  type Warrant,
} from "@aifivem/shared";
import { AdapterPicker } from "common/adapters";
import { answer } from "../characters/answer";
import { panel, settings } from "../content";
import { log } from "../log";
import { players } from "../player/registry";
import { warrantStore } from "../warrants/store";
import { MDT_SYSTEMS } from "./registry";
import { WarrantCache } from "./warrants";

const warrants = new WarrantCache((resource, error) =>
  log.error(`${resource} warrant check failed`, error),
);

/** The pick, for the client half (`client/mdt`), which opens the MDT's screen. */
const activeMdt = new GlobalKey(CORE.mdtStateKey, stateString);

/**
 * ai-core's MDT layer (lib `mdt`): scripts write fines, warrants, arrests and jail records into the active MDT (panel
 * setting `mdt`, `auto` = first running); warrant checks ask it and / or ai-core's own warrants (panel setting
 * `warrants`). With no MDT running nothing is written (no ai-* MDT exists).
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

/**
 * Whether a loaded player's server id or a citizenid has an active warrant (false = no or unknown). Setting
 * `warrants`: `auto` asks the active MDT while it answers warrant checks, else ai-core's own warrants; `both` asks
 * both; `mdt` only the MDT.
 */
function hasWarrant(target: unknown): Promise<boolean> {
  const citizenid =
    typeof target === "number"
      ? players.get(target)?.citizenid
      : typeof target === "string" && target.length > 0 && target.length <= 50
        ? target
        : undefined;
  if (citizenid === undefined) return Promise.resolve(false);
  const adapter = mdt.active?.hasWarrant ? mdt.active : undefined;
  const mode = settings.warrants;
  const asks: Promise<boolean>[] = [];
  if (mode === "both" || (mode === "auto" && !adapter))
    asks.push(warrantStore.has(citizenid));
  if (adapter) asks.push(warrants.ask(adapter, citizenid));
  return Promise.all(asks).then((answers) => answers.includes(true));
}

// ai-core's own warrants also go into the active MDT (when it takes warrant records) while the target is online.
on(
  CORE.warrantChangedEvent,
  (kind: string, warrant: Warrant, by: number | null) => {
    const target = players.byCharacter(warrant.charId)?.source;
    if (kind === "added" && target !== undefined)
      addRecord({
        kind: "warrant",
        target,
        by: by ?? undefined,
        title: warrant.reason.slice(0, 120),
      });
  },
);

registerExport("GetMdtSystem", () => mdt.active?.resource ?? null);
registerExport("AddMdtRecord", (raw: unknown) => {
  const record = toMdtRecord(raw);
  return record !== null && addRecord(record);
});
registerExport("HasMdtWarrant", (target: unknown, done: unknown) => {
  if (typeof done === "function")
    answer("MDT warrant check", hasWarrant(target), done, false);
});
