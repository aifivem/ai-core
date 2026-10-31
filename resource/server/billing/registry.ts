import type { BillingAdapter } from "@aicore-fivem/shared";
import { codemBilling } from "./adapters/codem-billing";
import { esxBilling } from "./adapters/esx_billing";
import { okokBilling } from "./adapters/okokBilling";
import { qsBilling } from "./adapters/qs-billing";
import { tgiannPhoneBilling } from "./adapters/tgiann-phone";
import { wasabiBilling } from "./adapters/wasabi_billing";

/**
 * Every supported billing script in detection order: `auto` uses the first one running, ai-core's own bills
 * (`builtin.ts`, resource "ai-core") come after all of them. A new billing script = one adapter file and one line here.
 */
export const BILLING_SCRIPTS: readonly BillingAdapter[] = [
  tgiannPhoneBilling,
  okokBilling,
  wasabiBilling,
  codemBilling,
  qsBilling,
  esxBilling,
];

/** The panel choices: the scripts, then ai-core's own bills. */
export const BILLING_CHOICES = [
  ...BILLING_SCRIPTS.map((a) => a.resource),
  "ai-core",
];
