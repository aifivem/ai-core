import { callExport } from "@aicore-fivem/lib/server";
import type { BillingAdapter } from "@aicore-fivem/shared";
import { accepted } from "../answer";

const RESOURCE = "codem-billing";

/**
 * codem-billing (written from its documented export, also answered by wasabi_billing's compat layer:
 * docs.wasabiscripts.com wasabi-billing exports): `createBilling(issuerSource, targetServerId, amount, reason,
 * society)`. Only job bills from an issuing player are sent (its personal form is not documented).
 */
export const codemBilling: BillingAdapter = {
  resource: RESOURCE,
  send: (b) =>
    b.job !== undefined &&
    b.from !== undefined &&
    accepted(
      RESOURCE,
      callExport(
        RESOURCE,
        "createBilling",
        b.from,
        b.to,
        b.amount,
        b.label,
        b.job,
      ),
    ),
};
