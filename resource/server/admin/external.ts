import { registerExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { ExternalPanel } from "@aicore-fivem/shared";
import { panel } from "../content";

const ID = /^[a-z0-9_.-]{2,48}$/i;
const text = (v: unknown, max: number): string | undefined => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
/** An NUI page of a resource (or any https page the owner trusts); never another scheme. */
const pageUrl = (v: unknown): string | undefined => (typeof v === "string" && v.startsWith("https://") ? v.slice(0, 300) : undefined);

function toPanel(id: string, v: Record<string, unknown>, resource: string): ExternalPanel | null {
  const command = text(v.command, 64)?.replace(/^\//, "");
  const url = pageUrl(v.url);
  const label = text(v.label, 48);
  if (!label || (!command && !url)) return null;
  return { id, resource, label, icon: text(v.icon, 32), description: text(v.description, 160), command, url };
}

/**
 * Other scripts' own settings screens on ai-core's dashboard, from three places: the owner's list in the panel
 * (`externalPanels`), `ai_admin_label` + `ai_admin_command` / `ai_admin_url` lines in a resource's fxmanifest
 * (works for escrowed scripts), and the `RegisterExternalPanel` export (dropped when that resource stops).
 */
class ExternalPanels {
  private readonly declared = new Map<string, ExternalPanel>();

  declare(panelSpec: ExternalPanel): void {
    this.declared.set(panelSpec.id, panelSpec);
  }

  dropFrom(resource: string): void {
    for (const [id, p] of this.declared) if (p.resource === resource) this.declared.delete(id);
  }

  private fromManifests(): ExternalPanel[] {
    const out: ExternalPanel[] = [];
    for (let i = 0; i < GetNumResources(); i++) {
      const resource = GetResourceByFindIndex(i);
      if (!resource || GetResourceState(resource) !== "started") continue;
      const label = GetResourceMetadata(resource, "ai_admin_label", 0);
      if (!label) continue;
      const found = toPanel(`manifest:${resource}`, {
        label,
        command: GetResourceMetadata(resource, "ai_admin_command", 0),
        url: GetResourceMetadata(resource, "ai_admin_url", 0),
        icon: GetResourceMetadata(resource, "ai_admin_icon", 0),
        description: GetResourceMetadata(resource, "ai_admin_description", 0),
      }, resource);
      if (found) out.push(found);
    }
    return out;
  }

  private fromPanel(): ExternalPanel[] {
    const records = panel.get("externalPanels");
    if (!isRecord(records)) return [];
    return Object.entries(records).flatMap(([id, v]) => {
      if (!isRecord(v)) return [];
      const resource = text(v.resource, 64) ?? "";
      // A listed panel of a script that is not started is left out.
      if (resource && GetResourceState(resource) !== "started") return [];
      const found = toPanel(`panel:${id}`, v, resource);
      return found ? [found] : [];
    });
  }

  list(): ExternalPanel[] {
    return [...this.fromPanel(), ...this.fromManifests(), ...this.declared.values()];
  }
}

export const externalPanels = new ExternalPanels();

registerExport("RegisterExternalPanel", (spec: unknown) => {
  const resource = GetInvokingResource();
  if (!resource || !isRecord(spec)) return;
  const id = typeof spec.id === "string" && ID.test(spec.id) ? spec.id : resource;
  const found = toPanel(`export:${resource}:${id}`, spec, resource);
  if (found) externalPanels.declare(found);
});
on("onResourceStop", (resource: string) => externalPanels.dropFrom(resource));
