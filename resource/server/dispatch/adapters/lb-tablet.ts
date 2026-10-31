import { callExport } from "@aicore-fivem/lib/server";
import type { DispatchAdapter } from "@aicore-fivem/shared";

/**
 * LB Tablet's police dispatch (written from its docs, docs.lbscripts.com/tablet/script-integration/server-exports):
 * server export `AddDispatch(options)`. `time` is in seconds (5 minutes when the alert has no duration); the location
 * label is the message or the title (the server knows no street).
 */
export const lbTablet: DispatchAdapter = {
  resource: "lb-tablet",
  besideOurs: true,
  alert: (a) =>
    callExport("lb-tablet", "AddDispatch", {
      priority: a.priority === "high" ? "high" : "medium",
      code: a.code ?? "",
      title: a.title,
      description: a.message ?? a.title,
      location: a.coords
        ? {
            label: a.message ?? a.title,
            coords: { x: a.coords.x, y: a.coords.y },
          }
        : undefined,
      time: a.duration ?? 300,
      job: a.jobs ?? ["police"],
      blip: a.blip
        ? {
            sprite: a.blip.sprite,
            color: a.blip.color,
            size: a.blip.scale,
            label: a.title,
          }
        : undefined,
    }),
};
