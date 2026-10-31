import type { DispatchAdapter } from "@aicore-fivem/shared";

/**
 * ps-dispatch (written from its 2.2.2 source): the server event `ps-dispatch:server:notify` with a built call, sent to
 * every client, which shows it to its jobs (names or QB job types; default `leo`). Blip, sound and duration defaults
 * are its `CustomAlert`'s; `message` is joined to the title (2.2.2 has no line for it).
 */
export const psDispatch: DispatchAdapter = {
  resource: "ps-dispatch",
  version: "2.2.2",
  alert: (a) =>
    emit("ps-dispatch:server:notify", {
      message: a.message ? `${a.title} - ${a.message}` : a.title,
      codeName: "NONE",
      code: a.code ?? "10-80",
      icon: `fas fa-${a.icon ?? "question"}`,
      priority: a.priority === "high" ? 1 : 2,
      coords: a.coords ?? { x: 0, y: 0, z: 0 },
      alertTime: a.duration,
      jobs: a.jobs ?? ["leo"],
      alert: {
        radius: 0,
        sprite: a.blip?.sprite ?? 1,
        color: a.blip?.color ?? 1,
        scale: a.blip?.scale ?? 0.5,
        length: 2,
        sound: "Lose_1st",
        sound2: "GTAO_FM_Events_Soundset",
        offset: false,
        flash: a.priority === "high",
      },
    }),
};
