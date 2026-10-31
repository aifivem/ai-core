import type { BankingAdapter } from "@aicore-fivem/shared";

/**
 * ai-banking: its society accounts are ai-core's job accounts, so it keeps no balance of its own; its screen opens
 * only at its branches and ATMs (position checks). It comes first because it `provide`s qb-banking and Renewed-Banking.
 */
export const aiBanking: BankingAdapter = {
  resource: "ai-banking",
  societyBalance: () => null,
};
