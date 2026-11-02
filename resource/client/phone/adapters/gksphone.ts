import { callExport } from "@aifivem/lib/client";
import type { PhoneClientAdapter } from "@aifivem/shared";

/** gksphone (GKSPHONE V2): client export `isPhoneOpen()`, no open event (docs.gkshop.org/gksphone-v2/exports-and-events/client-exports). */
export const gksPhone: PhoneClientAdapter = {
  resource: "gksphone",
  isOpen: () => callExport("gksphone", "isPhoneOpen") === true,
};
