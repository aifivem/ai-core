import type { DispatchAdapter } from "@aicore-fivem/shared";

/**
 * linden_outlawalert (ESX, archived; written from its 2.7.1 source): the server event `wf-alerts:svNotify` with a
 * custom `dispatchData`, sent to every client, which shows it to `recipientList` jobs. `length` is in ms (its client's
 * 4 s without a duration); blip defaults are its built-in codes' colour and scale.
 */
export const lindenOutlawAlert: DispatchAdapter = {
  resource: "linden_outlawalert",
  version: "2.7.1",
  alert: (a) =>
    emit("wf-alerts:svNotify", {
      coords: a.coords,
      dispatchData: {
        displayCode: a.code ?? "",
        description: a.title,
        isImportant: a.priority === "high" ? 1 : 0,
        recipientList: a.jobs ?? ["police"],
        length: a.duration ? a.duration * 1000 : undefined,
        infoM: a.message ? "fa-info-circle" : undefined,
        info: a.message,
        blipSprite: a.blip?.sprite ?? 161,
        blipColour: a.blip?.color ?? 84,
        blipScale: a.blip?.scale ?? 1.5,
      },
    }),
};
