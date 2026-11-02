import type { PhoneClientAdapter } from "@aifivem/shared";
import { onPhoneEvent } from "../phoneEvent";

/**
 * 17mov_Phone: `17mov_Phone:Client:AppStateChanged (appName, state)` when an app of the phone opens or closes; its
 * docs list no phone open event (docs.17movement.net/phone/building-custom-apps/native-features-integration).
 */
export const mov17Phone: PhoneClientAdapter = {
  resource: "17mov_Phone",
  watch: (opened) =>
    onPhoneEvent("17mov_Phone:Client:AppStateChanged", () => opened()),
};
