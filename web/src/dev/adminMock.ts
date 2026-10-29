import type { AdminPanelSnapshot, AdminPatch, AdminResult } from "@aicore-fivem/shared";
import { coreSchema } from "../../../resource/server/admin/schema";
import accounts from "../../../data/accounts.json";
import gangs from "../../../data/gangs.json";
import jobs from "../../../data/jobs.json";
import settings from "../../../data/settings.json";
import en from "../../../locales/en.json";

/**
 * Browser preview only: `?view=admin#/admin/ai-core/<tab>?key=<record>` opens the panel with ai-core's real schema and
 * data files; `&error=1` refuses every edit. fivem-nui-react hands these out only outside the game.
 */
const params = new URLSearchParams(window.location.search);
export const adminPreview = params.get("view") === "admin";

export function mockAdminOpen(): { panels: AdminPanelSnapshot[]; texts: Record<string, string> } | undefined {
  if (!adminPreview) return undefined;
  const panel: AdminPanelSnapshot = {
    resource: "ai-core",
    schema: coreSchema(Object.keys(accounts)),
    texts: en,
    data: { settings, jobs, gangs, accounts },
  };
  return { panels: [panel], texts: en };
}

export function mockAdminApply(patch: AdminPatch): AdminResult {
  if (params.get("error")) return { ok: false, error: "ADMIN_ERR_RANGE" };
  return patch.action === "create" && patch.key in jobs ? { ok: false, error: "ADMIN_ERR_EXISTS" } : { ok: true };
}
