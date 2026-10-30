import {
  callExport,
  isResourceStarted,
  registerExport,
} from "@aicore-fivem/lib/client";

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

const active = () => PROVIDERS.find((p) => isResourceStarted(p.resource));
const ask = (name: "handsUp" | "pointing"): boolean => {
  const provider = active();
  if (!provider) return false;
  try {
    return callExport(provider.resource, provider[name]) === true;
  } catch {
    // An older version of that script without the export.
    return false;
  }
};

registerExport("GetGestureProvider", () => active()?.resource ?? null);
registerExport("IsHandsUp", () => ask("handsUp"));
registerExport("IsPointing", () => ask("pointing"));
