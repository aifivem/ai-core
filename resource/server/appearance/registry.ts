import type { AppearanceAdapter } from "@aicore-fivem/shared";
import { aiAppearance } from "./adapters/ai-appearance";
import { blAppearance } from "./adapters/bl_appearance";
import { crmAppearance } from "./adapters/crm-appearance";
import { illeniumAppearance } from "./adapters/illenium-appearance";
import { qbClothing } from "./adapters/qb-clothing";
import { rcoreClothing } from "./adapters/rcore_clothing";
import { tgiannClothing } from "./adapters/tgiann-clothing";

/**
 * Every supported clothing script, in detection order: `auto` uses the first one running. ai-appearance comes last:
 * an installed clothing script replaces it. tgiann-clothing comes first because it `provide`s illenium-appearance and
 * qb-clothing. A new clothing script = one adapter file here, one in `client/appearance/adapters/` and a line in both
 * lists.
 */
export const APPEARANCE_SYSTEMS: readonly AppearanceAdapter[] = [
  tgiannClothing,
  illeniumAppearance,
  qbClothing,
  crmAppearance,
  rcoreClothing,
  blAppearance,
  aiAppearance,
];
