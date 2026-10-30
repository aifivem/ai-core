import type { DispatchAdapter } from "@aicore-fivem/shared";
import { aiPoliceAlert } from "./adapters/ai-policealert";
import { tgiannPoliceAlert } from "./adapters/tgiann-policealert";

/**
 * Every supported alert system, in detection order: `auto` uses the first one running. ai-policealert comes last: its
 * built-in cards are the fallback, so an installed alert script wins.
 * A new alert system = one adapter file and one line here.
 */
export const DISPATCH_SYSTEMS: readonly DispatchAdapter[] = [
  tgiannPoliceAlert,
  aiPoliceAlert,
];
