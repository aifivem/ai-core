import { callExport } from "@aicore-fivem/lib/server";
import type { DispatchAdapter } from "@aicore-fivem/shared";

/**
 * Wasabi MDT (written from its docs, docs.wasabiscripts.com/advanced-series/wasabi-mdt/exports): server export
 * `CreateDispatch(data)`. The MDT decides who sees the call (no jobs, blip or duration); `high` is its priority 5,
 * else its default 1.
 */
export const wasabiMdt: DispatchAdapter = {
  resource: "wasabi_mdt",
  besideOurs: true,
  alert: (a) =>
    callExport("wasabi_mdt", "CreateDispatch", {
      title: a.title,
      description: a.message,
      code: a.code,
      coords: a.coords,
      priority: a.priority === "high" ? 5 : 1,
    }),
};
