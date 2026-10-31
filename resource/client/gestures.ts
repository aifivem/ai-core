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
