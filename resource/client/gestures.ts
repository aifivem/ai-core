import { callExport, registerExport } from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import { AdapterPicker } from "common/adapters";

/**
 * Hands up and pointing of whatever emote script runs (first started in this order): other scripts (a police search)
 * ask ai-core and work with any of them. ai-smallresources keeps its own keys off while another one runs.
 */
const PROVIDERS: ReadonlyArray<{
  resource: string;
  /** The version the export names were read from; ai-core warns when another one runs. */
  version?: string;
  handsUp: string;
  /** Absent when the script has no pointing export (then pointing reads false). */
  pointing?: string;
}> = [
  {
    resource: "tgiann-emotes",
    version: "2.0.1",
    handsUp: "IsPlayerInHandsUp",
    pointing: "IsPlayerPointing",
  },
  {
    resource: "codem-emotemenu",
    handsUp: "IsHandsUp",
    pointing: "IsPointing",
  },
  {
    // rpemotes-reborn `provide`s rpemotes and answers its exports under that name too (folder name may be either).
    resource: "rpemotes",
    handsUp: "IsPlayerInHandsUp",
    pointing: "IsPlayerPointing",
  },
  {
    resource: "0r-animmenu",
    handsUp: "getHandsup",
  },
  {
    resource: "ai-smallresources",
    handsUp: "IsHandsUp",
    pointing: "IsPointing",
  },
];

const providers = new AdapterPicker({
  category: "gestures",
  adapters: PROVIDERS,
  log: createLogger("ai-core"),
});
const ask = (name: "handsUp" | "pointing"): boolean =>
  providers.call(
    name,
    (p) => {
      const exportName = p[name];
      return (
        exportName !== undefined && callExport(p.resource, exportName) === true
      );
    },
    false,
  );

registerExport("GetGestureProvider", () => providers.active?.resource ?? null);
registerExport("IsHandsUp", () => ask("handsUp"));
registerExport("IsPointing", () => ask("pointing"));

/** An emote command name: what the emote scripts' `/e <name>` takes (letters, digits, `_`, `-`). */
const EMOTE_NAME = /^[A-Za-z0-9_-]{1,32}$/;

/** Emote scripts that play an emote by its command name and stop the current one, first running wins. */
const EMOTES: ReadonlyArray<{
  resource: string;
  /** The version the calls were read from; ai-core warns when another one runs. */
  version?: string;
  play: (name: string) => void;
  cancel: () => void;
}> = [
  {
    // client/exports.lua: EmoteCommandStart(name, textureVariation), EmoteCancel().
    resource: "tgiann-emotes",
    version: "2.0.1",
    play: (name) => void callExport("tgiann-emotes", "EmoteCommandStart", name),
    cancel: () => void callExport("tgiann-emotes", "EmoteCancel"),
  },
  {
    // rpemotes-reborn 2.2.0 client/Emote.lua (it `provide`s rpemotes and answers its exports under that name).
    resource: "rpemotes",
    version: "2.2.0",
    play: (name) => void callExport("rpemotes", "EmoteCommandStart", name),
    cancel: () => void callExport("rpemotes", "EmoteCancel"),
  },
  {
    // scully_emotemenu 2.1.0 docs/exports/client: playEmoteByCommand(command, variant?), cancelEmote().
    resource: "scully_emotemenu",
    version: "2.1.0",
    play: (name) =>
      void callExport("scully_emotemenu", "playEmoteByCommand", name),
    cancel: () => void callExport("scully_emotemenu", "cancelEmote"),
  },
  {
    // dpemotes (Client/Emote.lua) has no exports: its `e` command plays (`e c` cancels).
    resource: "dpemotes",
    play: (name) => ExecuteCommand(`e ${name}`),
    cancel: () => ExecuteCommand("e c"),
  },
];

const emotes = new AdapterPicker({
  category: "emotes",
  adapters: EMOTES,
  log: createLogger("ai-core"),
});

registerExport("GetEmoteProvider", () => emotes.active?.resource ?? null);
registerExport(
  "PlayEmote",
  (name: unknown) =>
    typeof name === "string" &&
    EMOTE_NAME.test(name) &&
    emotes.call("play", (a) => (a.play(name), true), false),
);
registerExport("CancelEmote", () =>
  emotes.call("cancel", (a) => (a.cancel(), true), false),
);
