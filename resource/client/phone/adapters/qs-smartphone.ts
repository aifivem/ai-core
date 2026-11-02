import { isRecord } from "@aifivem/lib/shared";
import type { PhoneClientAdapter } from "@aifivem/shared";

/**
 * qs-smartphone: local client event `phone:opened ({ mode: "full" | "peek" })`; a peek (notification view) is not a
 * use (quasar-store.com/docs/smartphone/commands-and-exports).
 */
export const qsSmartphone: PhoneClientAdapter = {
  resource: "qs-smartphone",
  watch: (opened) =>
    on("phone:opened", (payload: unknown) => {
      if (isRecord(payload) && payload.mode === "full") opened();
    }),
};
