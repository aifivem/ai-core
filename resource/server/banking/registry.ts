import type { BankingAdapter } from "@aicore-fivem/shared";
import { aiBanking } from "./adapters/ai-banking";
import {
  fdBanking,
  kartikBanking,
  qbBanking,
  tggBanking,
  wasabiBanking,
} from "./adapters/balanceOnly";
import { okokBanking } from "./adapters/okokBanking";
import { renewedBanking } from "./adapters/renewed-banking";
import { tgiannBank } from "./adapters/tgiann-bank";

/**
 * Every supported banking script in detection order: `auto` uses the first one running. ai-banking comes first
 * because it `provide`s qb-banking and Renewed-Banking. A new banking script = one adapter file and one line here.
 */
export const BANKING_SYSTEMS: readonly BankingAdapter[] = [
  aiBanking,
  tgiannBank,
  renewedBanking,
  qbBanking,
  okokBanking,
  fdBanking,
  wasabiBanking,
  kartikBanking,
  tggBanking,
];
