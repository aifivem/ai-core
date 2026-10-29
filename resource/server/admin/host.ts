import { isAdmin, onClientCallback, onClientEvent, registerExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import { ADMIN, type AdminDelta, type AdminPanelResourceExports, type AdminPanelSnapshot, type AdminResult } from "@aicore-fivem/shared";
import { coreLog } from "../logs";

/**
 * The admin panel host: every ai-* resource with a panel registers here; ai-core checks the admin, opens the panel
 * with each resource's snapshot, forwards edits to the resource that owns the data and sends the changes to the
 * admins who have the panel open. The data itself is never stored or saved here.
 */
class AdminHost {
  private readonly resources = new Set<string>();
  /** Admins with the panel open: they get every change as a delta. */
  private readonly watchers = new Set<number>();

  register(resource: string): void {
    this.resources.add(resource);
  }

  unregister(resource: string): void {
    this.resources.delete(resource);
  }

  open(source: number): AdminPanelSnapshot[] {
    this.watchers.add(source);
    const panels: AdminPanelSnapshot[] = [];
    for (const resource of this.resources) {
      const panel = this.call(resource);
      if (panel) panels.push(panel.AdminPanelSnapshot());
    }
    return panels;
  }

  close(source: number): void {
    this.watchers.delete(source);
  }

  apply(source: number, resource: string, patch: unknown): AdminResult {
    const panel = this.resources.has(resource) ? this.call(resource) : null;
    if (!panel) return { ok: false, error: "ADMIN_ERR_GONE" };
    const result = panel.AdminPanelApply(source, patch);
    if (result.ok) coreLog("admin", `${resource}: ${describe(patch)}`, { source, metadata: { resource, patch } });
    return result;
  }

  changed(delta: AdminDelta): void {
    for (const source of this.watchers) emitNet(ADMIN.deltaEvent, source, delta);
  }

  private call(resource: string): AdminPanelResourceExports | null {
    if (GetResourceState(resource) !== "started") return null;
    return globalThis.exports[resource] as unknown as AdminPanelResourceExports;
  }
}

function describe(patch: unknown): string {
  if (!isRecord(patch)) return "edit";
  const target = [patch.file, patch.key, patch.section].filter((part) => typeof part === "string").join(".");
  return `${String(patch.action)} ${target}`;
}

export const adminHost = new AdminHost();

registerExport("RegisterAdminPanel", (resource: unknown) => {
  if (typeof resource === "string") adminHost.register(resource);
});
registerExport("AdminPanelChanged", (delta: AdminDelta) => adminHost.changed(delta));

// Every panel call is an admin's (ACE checked by the gate); a refused open simply opens nothing on the client.
onClientCallback(ADMIN.openCallback, (source) => adminHost.open(source), { guards: [isAdmin()], rate: { count: 2, windowMs: 1000 } });
onClientCallback(
  ADMIN.applyCallback,
  { guards: [isAdmin()], rate: { count: 30, windowMs: 10_000 }, args: ([resource, patch]) => (typeof resource === "string" ? [resource, patch] : null) },
  (source, resource, patch) => adminHost.apply(source, resource, patch),
);
onClientEvent(ADMIN.closeEvent, (source) => adminHost.close(source));
on("playerDropped", () => adminHost.close(Number(globalThis.source)));
on("onResourceStop", (resource: string) => adminHost.unregister(resource));

