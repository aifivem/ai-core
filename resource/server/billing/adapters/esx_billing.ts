import { callExport } from "@aicore-fivem/lib/server";
import type { BillingAdapter } from "@aicore-fivem/shared";
import { accepted } from "../answer";

const RESOURCE = "esx_billing";

/**
 * esx_billing (written from its source, ESX Legacy 1.16.3 addons): server export `BillPlayer(targetId,
 * senderIdentifier, sharedAccountName, label, amount)`; a job bill names `society_<job>` (esx_billing checks it with
 * `esx_addonaccount`), a personal one pays the sender. Bills are read and paid only in its own menu.
 */
export const esxBilling: BillingAdapter = {
  resource: RESOURCE,
  version: "1.0",
  send: (b) =>
    accepted(
      RESOURCE,
      callExport(
        RESOURCE,
        "BillPlayer",
        b.to,
        b.fromCitizenid ?? "server",
        b.job ? `society_${b.job}` : b.fromCitizenid,
        b.label,
        b.amount,
      ),
    ),
};
