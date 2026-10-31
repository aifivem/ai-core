import type { MdtAdapter } from "@aicore-fivem/shared";
import { lbTablet } from "./adapters/lb-tablet";

/**
 * tgiann-mdt (no exports; its screen opens from its client event), ps-mdt 3.x and Wasabi MDT (client export
 * `OpenMDT`) take no records from scripts: they are listed for the pick only, their client halves open the screen.
 */
const openOnly = (resource: string): MdtAdapter => ({ resource });

/**
 * Every supported MDT in detection order: `auto` uses the first one running; there is no ai-* MDT, so with none
 * running records go nowhere. A new MDT = one adapter file and one line here (and a client half when it opens).
 */
export const MDT_SYSTEMS: readonly MdtAdapter[] = [
  openOnly("tgiann-mdt"),
  lbTablet,
  openOnly("ps-mdt"),
  openOnly("wasabi_mdt"),
];
