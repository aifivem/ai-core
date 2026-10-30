import {
  addCommand,
  isAdmin,
  onClientCallback,
  onClientEvent,
  registerExport,
} from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import {
  ADMIN,
  type AdminDelta,
  type AdminOpenData,
  type AdminPanelResourceExports,
  type AdminPanelSnapshot,
  type AdminResult,
} from "@aicore-fivem/shared";
import { Locale } from "common";
import { coreLog } from "../logs";
import { commandRegistry } from "./commands";
import { externalPanels } from "./external";
import { readKeybinds, reportKeybinds } from "./keybinds";
import { allLookups } from "./lookups";
import { versions } from "../versions";

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

  /** Every script's snapshot, the lookup lists (items, jobs, gangs, accounts) and the other scripts' panels. */
  open(source: number): AdminOpenData {
    this.watchers.add(source);
    const panels: AdminPanelSnapshot[] = [];
    for (const resource of this.resources) {
      const panel = this.call(resource);
      if (panel) panels.push(panel.AdminPanelSnapshot());
    }
    return {
      panels,
      lookups: allLookups(),
      external: externalPanels.list(),
      updates: versions.list(),
    };
  }

  close(source: number): void {
    this.watchers.delete(source);
  }

  apply(source: number, resource: string, patch: unknown): AdminResult {
    const panel = this.resources.has(resource) ? this.call(resource) : null;
    if (!panel) return { ok: false, error: "ADMIN_ERR_GONE" };
    const result = panel.AdminPanelApply(source, patch);
    if (result.ok)
      coreLog("admin", `${resource}: ${describe(patch)}`, {
        source,
        metadata: { resource, patch },
      });
    return result;
  }

  changed(delta: AdminDelta): void {
    for (const source of this.watchers)
      emitNet(ADMIN.deltaEvent, source, delta);
  }

  private call(resource: string): AdminPanelResourceExports | null {
    if (GetResourceState(resource) !== "started") return null;
    return globalThis.exports[resource] as unknown as AdminPanelResourceExports;
  }
}

function describe(patch: unknown): string {
  if (!isRecord(patch)) return "edit";
  const target = [patch.file, patch.key, patch.section]
    .filter((part) => typeof part === "string")
    .join(".");
  return `${String(patch.action)} ${target}`;
}

export const adminHost = new AdminHost();

registerExport("RegisterAdminPanel", (resource: unknown) => {
  if (typeof resource === "string") adminHost.register(resource);
});
registerExport("AdminPanelChanged", (delta: AdminDelta) =>
  adminHost.changed(delta),
);

// Every panel call is an admin's (ACE checked by the gate); a refused open simply opens nothing on the client. The
// admin's client sends the keybinds it knows; the plain command list is re-read; both before the snapshot is taken.
onClientCallback(
  ADMIN.openCallback,
  {
    guards: [isAdmin()],
    rate: { count: 2, windowMs: 1000 },
    args: ([keybinds]) => {
      const list = readKeybinds(keybinds);
      return list ? [list] : null;
    },
  },
  (source, keybinds) => {
    reportKeybinds(keybinds);
    commandRegistry.refreshPlain();
    return adminHost.open(source);
  },
);
addCommand(
  "aiadmin",
  { help: Locale("COMMAND_AIADMIN"), restricted: true },
  (source) => {
    if (source > 0) emitNet(ADMIN.showEvent, source);
  },
);
onClientCallback(
  ADMIN.applyCallback,
  {
    guards: [isAdmin()],
    rate: { count: 30, windowMs: 10_000 },
    args: ([resource, patch]) =>
      typeof resource === "string" ? [resource, patch] : null,
  },
  (source, resource, patch) => adminHost.apply(source, resource, patch),
);
onClientEvent(ADMIN.closeEvent, (source) => adminHost.close(source));
on("playerDropped", () => adminHost.close(Number(globalThis.source)));
on("onResourceStop", (resource: string) => adminHost.unregister(resource));
