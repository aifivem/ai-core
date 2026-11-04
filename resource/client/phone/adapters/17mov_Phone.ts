import type { PhoneClientAdapter } from "@aifivem/shared";
import { onPhoneEvent } from "../phoneEvent";

/** `state` values that mean the app closed; the docs do not name them, so anything else still counts as an open. */
const CLOSED: readonly unknown[] = [false, 0, "close", "closed"];

/**
 * 17mov_Phone: `17mov_Phone:Client:AppStateChanged (appName, state)` when an app of the phone opens or closes; its
 * docs list no phone open event (docs.17movement.net/phone/building-custom-apps/native-features-integration). Only
 * an open is a use: a close would report the phone again.
 */
export const mov17Phone: PhoneClientAdapter = {
  resource: "17mov_Phone",
  watch: (opened) =>
    onPhoneEvent("17mov_Phone:Client:AppStateChanged", (_app, state) => {
      if (!CLOSED.includes(state)) opened();
    }),
};
