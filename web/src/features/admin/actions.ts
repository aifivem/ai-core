import { fetchNui } from "fivem-nui-react";
import type { AdminPanelSnapshot, AdminPatch, AdminResult } from "@aicore-fivem/shared";
import { NuiCallback } from "../../../../resource/common/nui";
import { mockAdminApply } from "../../dev/adminMock";
import { router } from "../../router";
import { store } from "../../store";
import { changed, closed, fieldState, opened } from "../../store/admin";
import { getAt, sectionWrite } from "./path";

/** Every navigation and NUI call of the admin panel; components never call the router or fetchNui themselves. */

export interface Point {
  x: number;
  y: number;
  z: number;
  heading: number;
}

const toResult = (value: unknown): AdminResult => {
  if (typeof value === "object" && value !== null && (value as { ok?: unknown }).ok === true) return { ok: true };
  const error = typeof value === "object" && value !== null ? (value as { error?: unknown }).error : undefined;
  return { ok: false, error: typeof error === "string" ? error : "ADMIN_ERR_BUSY" };
};

export function goTo(resource: string, tab: string, key?: string): void {
  void router.navigate({ to: "/admin/$resource/$tab", params: { resource, tab }, search: key ? { key } : {} });
}

/** Opens on the place the admin left (same script and tab when they still exist), else on the first tab. */
export function openPanel(panels: AdminPanelSnapshot[], texts: Record<string, string>): void {
  store.dispatch(opened({ panels, texts }));
  const params: Record<string, unknown> = router.state.matches.at(-1)?.params ?? {};
  const panel = panels.find((p) => p.resource === params.resource) ?? panels[0];
  if (!panel) return;
  const tab = panel.schema.tabs.find((t) => t.id === params.tab) ?? panel.schema.tabs[0];
  if (tab && (panel.resource !== params.resource || tab.id !== params.tab)) goTo(panel.resource, tab.id);
}

export function closePanel(): void {
  store.dispatch(closed());
  void fetchNui<boolean>(NuiCallback.adminClose, undefined, { mockData: true });
}

async function send(resource: string, patch: AdminPatch): Promise<AdminResult> {
  const answer = await fetchNui<unknown>(NuiCallback.adminApply, { resource, patch }, { mockData: mockAdminApply(patch) }).catch(() => null);
  return toResult(answer);
}

export const fieldId = (resource: string, file: string, key: string | undefined, path: string): string => `${resource}/${file}/${key ?? ""}/${path}`;

/** Live save of one field: shown at once, saved on the server, put back with the error when refused. */
export async function saveField(resource: string, file: string, key: string | undefined, path: string, value: unknown): Promise<void> {
  const panel = store.getState().admin.panels.find((p) => p.resource === resource);
  const data = panel?.data[file];
  const record = key === undefined ? data : getAt(data, key);
  if (record === undefined) return;
  const id = fieldId(resource, file, key, path);
  const write = sectionWrite(record, path, value);
  const before = getAt(record, write.section);
  const local = (section: unknown) =>
    store.dispatch(changed({ resource, file, key, value: { ...(record as Record<string, unknown>), [write.section]: section } }));
  local(write.value);
  store.dispatch(fieldState({ id, state: { status: "saving" } }));
  const result = await send(resource, { file, action: "set", key, section: write.section, value: write.value });
  if (result.ok) {
    store.dispatch(fieldState({ id, state: { status: "saved" } }));
    setTimeout(() => store.dispatch(fieldState({ id, state: null })), 2500);
  } else {
    local(before);
    store.dispatch(fieldState({ id, state: { status: "error", error: result.error } }));
  }
}

export async function createRecord(resource: string, file: string, tab: string, key: string, label: string): Promise<AdminResult> {
  const result = await send(resource, { file, action: "create", key, label });
  if (result.ok) goTo(resource, tab, key);
  return result;
}

export async function deleteRecord(resource: string, file: string, tab: string, key: string): Promise<AdminResult> {
  const result = await send(resource, { file, action: "delete", key });
  if (result.ok) goTo(resource, tab);
  return result;
}

export async function myPosition(from: "ped" | "camera", ground = false): Promise<Point | null> {
  const answer = await fetchNui<unknown>(NuiCallback.adminPosition, { from, ground }, { mockData: { x: 215.76, y: -810.12, z: 30.73, heading: 157.5 } }).catch(() => null);
  if (typeof answer !== "object" || answer === null) return null;
  const p = answer as Record<string, unknown>;
  return typeof p.x === "number" && typeof p.y === "number" && typeof p.z === "number" && typeof p.heading === "number"
    ? { x: p.x, y: p.y, z: p.z, heading: p.heading }
    : null;
}

export function teleport(point: Point): void {
  void fetchNui<boolean>(NuiCallback.adminTeleport, point, { mockData: true });
}
