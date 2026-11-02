import type { PhoneClientAdapter } from "@aifivem/shared";
import { onPhoneEvent } from "../phoneEvent";

/** lb-phone: client event `lb-phone:phoneToggled (open)` (docs.lbscripts.com/phone/exports/client-events). */
export const lbPhone: PhoneClientAdapter = {
  resource: "lb-phone",
  watch: (opened) =>
    onPhoneEvent("lb-phone:phoneToggled", (open) => {
      if (open === true) opened();
    }),
};
