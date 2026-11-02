import type { PhoneClientAdapter } from "@aifivem/shared";
import { onPhoneEvent } from "../phoneEvent";

/** codem-phone: `codem-phone:client:playerPhoneUsed ()` on each use (the owner's qbx_smallresources isWanted listens to it). */
export const codemPhone: PhoneClientAdapter = {
  resource: "codem-phone",
  watch: (opened) =>
    onPhoneEvent("codem-phone:client:playerPhoneUsed", () => opened()),
};
