import { callExport } from "@aicore-fivem/lib/server";
import type { DispatchAdapter } from "@aicore-fivem/shared";

const RESOURCE = "tgiann-policealert";
/** tgiann-policealert's `config.duration` default; its client multiplies the duration without a fallback. */
const DURATION = 5;

/**
 * tgiann-policealert (written from its 2.10 source). With a suspect, the server export `Alert(source, data)` lets the
 * suspect's client add the street, zone, vehicle and gender; without one, `SendCustomAlert(data, jobs)` sends the
 * finished alert. The message goes in as a custom info row. It answers `police:server:policeAlert` itself.
 */
export const tgiannPoliceAlert: DispatchAdapter = {
  resource: RESOURCE,
  version: "2.10.0",
  answersPoliceAlert: true,
  alert: (a) => {
    const jobs = a.jobs ?? ["police"];
    const custom = a.message
      ? [{ labelLeft: a.message, labelRight: "", icon: "circle-info" }]
      : undefined;
    const common = {
      label: a.title,
      code: a.code,
      icon: a.icon,
      coords: a.coords,
      duration: a.duration,
      bgAnimate: a.priority === "high",
      blip: a.blip?.sprite,
    };
    if (a.source !== undefined) {
      callExport(RESOURCE, "Alert", a.source, { ...common, jobs, custom });
      return;
    }
    callExport(
      RESOURCE,
      "SendCustomAlert",
      {
        ...common,
        duration: a.duration ?? DURATION,
        sound: { active: true },
        information: { custom },
      },
      jobs,
    );
  },
};
