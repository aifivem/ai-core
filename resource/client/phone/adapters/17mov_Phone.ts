import { callExport } from "@aifivem/lib/client";
import type { PhoneClientAdapter } from "@aifivem/shared";

/** 17mov_Phone: client export `IsPhoneOpen()`, no open event (docs.17movement.net/phone, Global Exports, Client Exports). */
export const mov17Phone: PhoneClientAdapter = {
  resource: "17mov_Phone",
  isOpen: () => callExport("17mov_Phone", "IsPhoneOpen") === true,
};
