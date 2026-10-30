import { callExport, registerExport } from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import { AdapterPicker } from "common/adapters";

/**
 * Hands up and pointing of whatever emote script runs (first started in this order): other scripts (a police search)
 * ask ai-core and work with any of them. ai-smallresources keeps its own keys off while another one runs.
 */
const PROVIDERS: ReadonlyArray<{
  resource: string;
  handsUp: string;
  pointing: string;
}> = [
  {
    resource: "tgiann-emotes",
    handsUp: "IsPlayerInHandsUp",
    pointing: "IsPlayerPointing",
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
  providers.call(name, (p) => callExport(p.resource, p[name]) === true, false);

registerExport("GetGestureProvider", () => providers.active?.resource ?? null);
registerExport("IsHandsUp", () => ask("handsUp"));
registerExport("IsPointing", () => ask("pointing"));
