import type { MdtAdapter } from "@aifivem/shared";
import { codemMdt } from "./adapters/codem-mdtv2";
import { lbTablet } from "./adapters/lb-tablet";
import { psMdt } from "./adapters/ps-mdt";
import { tgiannMdt } from "./adapters/tgiann-mdt";

/**
 * Wasabi MDT (client export `OpenMDT`) takes no records from scripts and has no per-citizen warrant query: listed
 * for the pick only, its client half opens the screen.
 */
const openOnly = (resource: string): MdtAdapter => ({ resource });

/**
 * Every supported MDT in detection order: `auto` uses the first one running; there is no ai-* MDT, so with none
 * running records go nowhere and warrant checks read ai-core's own warrants (setting `warrants`). A new MDT = one
 * adapter file and one line here (and a client half when it opens).
 */
export const MDT_SYSTEMS: readonly MdtAdapter[] = [
  tgiannMdt,
  lbTablet,
  psMdt,
  openOnly("wasabi_mdt"),
  codemMdt,
];
