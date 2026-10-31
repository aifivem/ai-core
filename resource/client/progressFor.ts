import {
  cancelProgress,
  isProgressRunning,
  onServerCallback,
  onServerEvent,
  progress,
} from "@aicore-fivem/lib/client";
import { isRecord, logSafe, readVec3, waitFor } from "@aicore-fivem/lib/shared";
import { CORE, type ServerProgress } from "@aicore-fivem/shared";

const text = (v: unknown, max: number): string | undefined =>
  typeof v === "string" && v.length > 0 && v.length <= max ? v : undefined;

function toProgress(v: unknown): ServerProgress | null {
  if (!isRecord(v) || typeof v.label !== "string") return null;
  const duration = v.duration;
  if (typeof duration !== "number" || !(duration >= 0 && duration <= 600_000))
    return null;
  const anim =
    isRecord(v.anim) && text(v.anim.dict, 96) && text(v.anim.clip, 96)
      ? {
          dict: v.anim.dict as string,
          clip: v.anim.clip as string,
          flag: typeof v.anim.flag === "number" ? v.anim.flag : undefined,
        }
      : undefined;
  const d = isRecord(v.disable) ? v.disable : {};
  return {
    label: logSafe(v.label, 80),
    duration,
    anim,
    scenario: text(v.scenario, 64),
    allowVehicle: v.allowVehicle === true,
    canCancel: v.canCancel === true,
    freeze: v.freeze === true,
    disable: {
      move: d.move === true,
      car: d.car === true,
      mouse: d.mouse === true,
      combat: d.combat === true,
    },
    face: readVec3(v.face) ?? undefined,
  };
}

/**
 * Progress bars of server flows (lib `progressFor`) for every resource: ai-core runs them with its own lib `progress`,
 * the server measures the time itself. A newer flow cancels the running one first.
 */
onServerCallback(CORE.progressForCallback, async (raw) => {
  const options = toProgress(raw);
  if (!options) return false;
  if (isProgressRunning()) {
    cancelProgress();
    await waitFor(() => !isProgressRunning(), 2000).catch(() => undefined);
  }
  return progress(options);
});
onServerEvent(CORE.progressForCancelEvent, () => cancelProgress());
