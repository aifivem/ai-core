import { callExport } from "@aicore-fivem/lib/server";
import type { DispatchAdapter } from "@aicore-fivem/shared";

/**
 * core_dispatch (written from its docs, docs.c8re.store/core-dispatch/exports): server export
 * `addCall(code, title, extraInfo, coords, job, cooldown, sprite, color, priority)`; the message becomes an extra info
 * row, `cooldown` is the display time in ms (its docs' 5000 when the alert has no duration).
 */
export const coreDispatch: DispatchAdapter = {
  resource: "core_dispatch",
  alert: (a) =>
    callExport(
      "core_dispatch",
      "addCall",
      a.code ?? "",
      a.title,
      a.message ? [{ icon: "fa-circle-info", info: a.message }] : [],
      a.coords,
      a.jobs ?? ["police"],
      (a.duration ?? 5) * 1000,
      a.blip?.sprite ?? 156,
      a.blip?.color ?? 1,
      a.priority === "high",
    ),
};
