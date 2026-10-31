import { callExport } from "@aicore-fivem/lib/server";
import type { PrisonAdapter } from "../adapter";

/** ai-prison: ai-core's own prison script. */
const AI = "ai-prison";

export const aiPrison: PrisonAdapter = {
  resource: AI,
  jail: (source, minutes, by) =>
    callExport(AI, "JailPlayer", source, minutes, by) === true,
  release: (source) => callExport(AI, "ReleasePlayer", source) === true,
  timeLeft: (source) => Number(callExport(AI, "GetJailTime", source)) || 0,
};
