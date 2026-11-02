import { resourceExport } from "@aifivem/lib/server";
import type { DispatchAdapter } from "@aifivem/shared";

const alerts = resourceExport("ai-policealert");

/** ai-policealert's built-in alert cards (the default when no other alert system runs). */
export const aiPoliceAlert: DispatchAdapter = {
  resource: "ai-policealert",
  alert: (alert) => alerts.DispatchAlert(alert),
};
