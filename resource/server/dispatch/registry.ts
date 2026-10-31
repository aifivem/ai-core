import type { DispatchAdapter } from "@aicore-fivem/shared";
import { aiPoliceAlert } from "./adapters/ai-policealert";
import { cdDispatch } from "./adapters/cd_dispatch";
import { coreDispatch } from "./adapters/core_dispatch";
import { lbTablet } from "./adapters/lb-tablet";
import { lindenOutlawAlert } from "./adapters/linden_outlawalert";
import { psDispatch } from "./adapters/ps-dispatch";
import { rcoreDispatch } from "./adapters/rcore_dispatch";
import { tgiannPoliceAlert } from "./adapters/tgiann-policealert";
import { wasabiMdt } from "./adapters/wasabi_mdt";

/**
 * Every supported alert system, in detection order: `auto` uses the first one running. Dispatch scripts come before
 * MDTs with a dispatch board, which servers often run next to one; ai-policealert comes last:
 * its built-in cards are the fallback, so an installed alert script wins.
 * A new alert system = one adapter file and one line here.
 */
export const DISPATCH_SYSTEMS: readonly DispatchAdapter[] = [
  tgiannPoliceAlert,
  psDispatch,
  cdDispatch,
  rcoreDispatch,
  coreDispatch,
  lindenOutlawAlert,
  lbTablet,
  wasabiMdt,
  aiPoliceAlert,
];
