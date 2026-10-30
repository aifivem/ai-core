import type { AppearanceAdapter } from "@aicore-fivem/shared";
import { aiAppearance } from "./adapters/ai-appearance";
import { tgiannClothing } from "./adapters/tgiann-clothing";

/**
 * Every supported clothing script, in detection order: `auto` uses the first one running. ai-appearance comes last:
 * an installed clothing script replaces it. A new clothing script = one adapter file here, one in
 * `client/appearance/adapters/` and a line in both lists.
 */
export const APPEARANCE_SYSTEMS: readonly AppearanceAdapter[] = [
  tgiannClothing,
  aiAppearance,
];
