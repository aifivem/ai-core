import {
  addCommand,
  GlobalKey,
  notify,
  stateBoolean,
} from "@aicore-fivem/lib/server";
import { CORE } from "@aicore-fivem/shared";
import { Locale } from "common";
import { panel, settings } from "./content";

/** Whether players can hurt each other, replicated to clients (they apply it to their ped). */
const pvp = new GlobalKey(CORE.pvpStateKey, stateBoolean);
const publish = () => pvp.set(settings.pvp);
publish();
panel.onChange("settings", publish);

// QB's /togglepvp: flips the panel setting (saved, every client follows).
addCommand(
  "togglepvp",
  { help: Locale("COMMAND_TOGGLEPVP"), restricted: true },
  (source) => {
    const on = !settings.pvp;
    panel.commit("settings", undefined, {
      ...panel.get<Record<string, unknown>>("settings"),
      pvp: on,
    });
    const text = Locale(on ? "NOTIFY_PVP_ON" : "NOTIFY_PVP_OFF");
    if (source > 0) notify(source, text, "success");
    else console.log(text);
  },
);
