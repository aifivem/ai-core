import type { DispatchAdapter } from "@aicore-fivem/shared";

/**
 * rcore_dispatch (written from its docs, documentation.rcore.cz/paid-resources/rcore_dispatch/add-alerts): the server
 * event `rcore_dispatch:server:sendAlert`. It has one text line, so the message is joined to the title;
 * `blip_time` is in seconds.
 */
export const rcoreDispatch: DispatchAdapter = {
  resource: "rcore_dispatch",
  alert: (a) => {
    const text = a.message ? `${a.title} - ${a.message}` : a.title;
    emit("rcore_dispatch:server:sendAlert", {
      code: a.code ?? "",
      default_priority: a.priority === "high" ? "high" : "medium",
      coords: a.coords,
      job: a.jobs ?? ["police"],
      text,
      type: "alerts",
      blip_time: a.duration,
      blip: a.blip
        ? {
            sprite: a.blip.sprite,
            colour: a.blip.color,
            scale: a.blip.scale,
            text: a.title,
            flashes: a.priority === "high",
          }
        : undefined,
    });
  },
};
