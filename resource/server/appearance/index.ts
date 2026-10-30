import {
  GlobalKey,
  registerExport,
  stateString,
} from "@aicore-fivem/lib/server";
import { readId } from "@aicore-fivem/lib/shared";
import {
  APPEARANCE_STATE_KEY,
  CORE,
  toCharacterAppearance,
  type CharacterAppearance,
} from "@aicore-fivem/shared";
import { AdapterPicker } from "common/adapters";
import { panel, settings } from "../content";
import { log } from "../log";
import { APPEARANCE_SYSTEMS } from "./registry";

/**
 * ai-core's appearance layer: stored looks come from the active clothing script through its adapter (`registry.ts`),
 * picked by the panel setting `appearance` (`auto` = first running). The pick is published for the client half,
 * which puts looks on peds.
 */
const activeAppearance = new GlobalKey(APPEARANCE_STATE_KEY, stateString);

const layer = new AdapterPicker({
  category: "appearance",
  adapters: APPEARANCE_SYSTEMS,
  log,
  choice: settings.appearance,
  noneText: "no clothing script runs: peds wear default clothes",
  onSwitch: (next) => activeAppearance.set(next?.resource),
});
panel.onChange("settings", () => layer.setChoice(settings.appearance));

/** A character's stored look from the active clothing script, null without one (errors are logged). */
async function loadLook(charId: number): Promise<CharacterAppearance | null> {
  const adapter = layer.active;
  if (!adapter) return null;
  try {
    return toCharacterAppearance(await adapter.load(charId));
  } catch (error) {
    log.error(`${adapter.resource} look of #${charId} failed`, error);
    return null;
  }
}

registerExport("GetAppearanceSystem", () => layer.active?.resource ?? null);
registerExport("GetCharacterAppearance", (charId: unknown, done: unknown) => {
  if (typeof done !== "function") return;
  const id = readId(charId);
  void (id === null ? Promise.resolve(null) : loadLook(id)).then((look) => {
    try {
      (done as (look: CharacterAppearance | null) => void)(look);
    } catch (error) {
      log.error("GetCharacterAppearance callback failed", error);
    }
  });
});

/** The character screen opened: its looks go to the player (latent: looks can be a few KB each). */
on(CORE.characterScreenEvent, (source: number, charIds: number[]) => {
  if (!layer.active || charIds.length === 0) return;
  void Promise.all(
    charIds.map(async (id) => ({ id, look: await loadLook(id) })),
  ).then((entries) => {
    const looks = entries.filter((e) => e.look !== null);
    if (looks.length)
      TriggerLatentClientEvent(
        CORE.characterLooksEvent,
        String(source),
        50_000,
        looks,
      );
  });
});
