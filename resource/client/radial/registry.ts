import type { RadialAdapter } from "@aicore-fivem/shared";
import { aiRadialmenu } from "./adapters/ai-radialmenu";
import { oxLibRadial } from "./adapters/ox_lib";
import { qbRadialmenu } from "./adapters/qb-radialmenu";
import { tgiannRadialmenu } from "./adapters/tgiann-radialmenu-target";

/**
 * Every supported radial menu in detection order: the first running one gets the items. ai-radialmenu comes first
 * because it `provide`s qb-radialmenu and tgiann-radialmenu-target (those names read started while it runs); ox_lib
 * last because servers run it for other scripts while another radial is the one players use.
 * A new radial menu = one adapter file and one line here.
 */
export const RADIALS: readonly RadialAdapter[] = [
  aiRadialmenu,
  tgiannRadialmenu,
  qbRadialmenu,
  oxLibRadial,
];
