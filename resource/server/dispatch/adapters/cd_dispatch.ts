import type { DispatchAdapter } from "@aicore-fivem/shared";

/**
 * cd_dispatch (written from its docs, docs.codesign.pro/paid-scripts/dispatch): its documented server-side call is
 * the client event `cd_dispatch:AddNotification` to every client (`-1`); each client shows it to `job_table`. The code
 * goes before the title; blip `time` is in minutes (5 when the alert has no duration).
 */
export const cdDispatch: DispatchAdapter = {
  resource: "cd_dispatch",
  alert: (a) => {
    const title = a.code ? `${a.code} - ${a.title}` : a.title;
    const high = a.priority === "high";
    emitNet("cd_dispatch:AddNotification", -1, {
      job_table: a.jobs ?? ["police"],
      coords: a.coords,
      title,
      message: a.message ?? "",
      flash: high ? 1 : 0,
      unique_id: String(Math.floor(Math.random() * 10_000_000)),
      sound: high ? 2 : 1,
      blip: a.coords
        ? {
            sprite: a.blip?.sprite ?? 161,
            scale: a.blip?.scale ?? 1.2,
            colour: a.blip?.color ?? 3,
            flashes: high,
            text: title,
            time: a.duration ? Math.max(1, Math.round(a.duration / 60)) : 5,
            radius: 0,
          }
        : undefined,
    });
  },
};
