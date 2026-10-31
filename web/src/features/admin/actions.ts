import { fetchNui } from "fivem-nui-react";
import type {
  AdminPanelSnapshot,
  AdminPatch,
  AdminResult,
  ExternalPanel,
  Lookups,
  UpdateInfo,
} from "@aicore-fivem/shared";
import { NuiCallback } from "../../../../resource/common/nui";
import { mockAdminApply } from "../../dev/adminMock";
import { router } from "../../router";
import { store } from "../../store";
import {
  changed,
  closed,
  fieldState,
  focused,
  opened,
  panelLoaded,
  picking,
} from "../../store/admin";
import { getAt, sectionWrite } from "./path";
import { setupDone } from "./setupSteps";

/** Every navigation and NUI call of the admin panel; components never call the router or fetchNui themselves. */

export interface Point {
  x: number;
  y: number;
  z: number;
  heading: number;
}

const toResult = (value: unknown): AdminResult => {
  if (
    typeof value === "object" &&
    value !== null &&
    (value as { ok?: unknown }).ok === true
  )
    return { ok: true };
  const error =
    typeof value === "object" && value !== null
      ? (value as { error?: unknown }).error
      : undefined;
  return {
    ok: false,
    error: typeof error === "string" ? error : "ADMIN_ERR_BUSY",
  };
};

/** Scripts whose panel data is being asked for (one request each). */
const loading = new Set<string>();
/** Failed requests in a row per script: the next try waits 2 s, 4 s, ... up to 30 s. */
const failures = new Map<string, number>();

/** Asks for a script's whole panel data once, when the admin opens it (the open summary has only settings and labels). */
export async function loadPanelData(resource: string): Promise<void> {
  const state = store.getState().admin;
  const panel = state.panels.find((p) => p.resource === resource);
  if (!state.open || !panel || panel.loaded !== false || loading.has(resource))
    return;
  loading.add(resource);
  let ok = false;
  try {
    const data: unknown = await fetchNui(
      NuiCallback.adminPanelData,
      { resource },
      { mockData: null },
    );
    ok = typeof data === "object" && data !== null && !Array.isArray(data);
    if (ok)
      store.dispatch(
        panelLoaded({ resource, data: data as Record<string, unknown> }),
      );
  } finally {
    loading.delete(resource);
    if (ok) failures.delete(resource);
    else {
      // The opening effect never runs again for an unloaded panel: try again later while the panel is open.
      const count = (failures.get(resource) ?? 0) + 1;
      failures.set(resource, count);
      setTimeout(
        () => void loadPanelData(resource),
        Math.min(30_000, 1000 * 2 ** count),
      );
    }
  }
}

export function goTo(resource: string, tab: string, key?: string): void {
  void router.navigate({
    to: "/admin/$resource/$tab",
    params: { resource, tab },
    search: key ? { key } : {},
  });
}

/** Opens what the global search found; a settings field is scrolled to and flashed. */
export function jumpTo(target: {
  resource: string;
  tab: string;
  file: string;
  key?: string;
  path?: string;
}): void {
  goTo(target.resource, target.tab, target.key);
  store.dispatch(
    focused(
      target.path
        ? fieldId(target.resource, target.file, undefined, target.path)
        : null,
    ),
  );
}

/** The flashed field is done (it scrolled into view). */
export function clearFocus(): void {
  store.dispatch(focused(null));
}

export function goSetup(): void {
  void router.navigate({ to: "/admin/setup" });
}

/** The last step of the setup guide: the server is set up, the welcome card stops showing. */
export async function finishSetup(): Promise<void> {
  await saveField("ai-core", "settings", undefined, "setupDone", true);
  goDashboard();
}

export function goDashboard(): void {
  void router.navigate({ to: "/admin" });
}

/** Opens on the place the admin left (same script and tab when they still exist), else on the dashboard. */
export function openPanel(
  panels: AdminPanelSnapshot[],
  texts: Record<string, string>,
  lookups: Lookups,
  external: ExternalPanel[],
  updates: UpdateInfo[],
): void {
  store.dispatch(opened({ panels, texts, lookups, external, updates }));
  const params: Record<string, unknown> =
    router.state.matches.at(-1)?.params ?? {};
  if (typeof params.id === "string" && external.some((e) => e.id === params.id))
    return;
  // A server that never finished the setup guide opens on it.
  if (!setupDone(panels)) return goSetup();
  if (router.state.location.pathname === "/admin/players") return;
  const panel = panels.find((p) => p.resource === params.resource);
  const tab = panel?.schema.tabs.find((t) => t.id === params.tab);
  if (!panel || !tab) goDashboard();
}

/** Another script's panel: its command (ai-core's panel closes) or its page inside the panel. */
export function openExternal(panel: ExternalPanel): void {
  if (panel.url) {
    void router.navigate({
      to: "/admin/external/$id",
      params: { id: panel.id },
    });
    return;
  }
  if (!panel.command) return;
  store.dispatch(closed());
  void fetchNui<boolean>(
    NuiCallback.adminRunCommand,
    { command: panel.command },
    { mockData: true },
  );
}

export function closePanel(): void {
  store.dispatch(closed());
  void fetchNui<boolean>(NuiCallback.adminClose, undefined, { mockData: true });
}

async function send(resource: string, patch: AdminPatch): Promise<AdminResult> {
  const answer = await fetchNui<unknown>(
    NuiCallback.adminApply,
    { resource, patch },
    { mockData: mockAdminApply(patch) },
  ).catch(() => null);
  return toResult(answer);
}

export const fieldId = (
  resource: string,
  file: string,
  key: string | undefined,
  path: string,
): string => `${resource}/${file}/${key ?? ""}/${path}`;

/** Live save of one field: shown at once, saved on the server, put back with the error when refused. */
export async function saveField(
  resource: string,
  file: string,
  key: string | undefined,
  path: string,
  value: unknown,
): Promise<void> {
  const panel = store
    .getState()
    .admin.panels.find((p) => p.resource === resource);
  const data = panel?.data[file];
  const record = key === undefined ? data : getAt(data, key);
  if (record === undefined) return;
  const id = fieldId(resource, file, key, path);
  const write = sectionWrite(record, path, value);
  const before = getAt(record, write.section);
  const local = (section: unknown) =>
    store.dispatch(
      changed({
        resource,
        file,
        key,
        value: {
          ...(record as Record<string, unknown>),
          [write.section]: section,
        },
      }),
    );
  local(write.value);
  store.dispatch(fieldState({ id, state: { status: "saving" } }));
  const result = await send(resource, {
    file,
    action: "set",
    key,
    section: write.section,
    value: write.value,
  });
  if (result.ok) {
    store.dispatch(fieldState({ id, state: { status: "saved" } }));
    setTimeout(() => store.dispatch(fieldState({ id, state: null })), 2500);
  } else {
    local(before);
    store.dispatch(
      fieldState({ id, state: { status: "error", error: result.error } }),
    );
  }
}

/** An `action` widget's button: the script's handler runs on the server; the result shows under the button. */
export async function runAction(
  resource: string,
  file: string,
  key: string | undefined,
  id: string,
): Promise<AdminResult> {
  const field = fieldId(resource, file, key, id);
  store.dispatch(fieldState({ id: field, state: { status: "saving" } }));
  const result = await send(resource, { file, action: "run", key, id });
  if (result.ok) {
    store.dispatch(fieldState({ id: field, state: { status: "saved" } }));
    setTimeout(
      () => store.dispatch(fieldState({ id: field, state: null })),
      2500,
    );
  } else
    store.dispatch(
      fieldState({
        id: field,
        state: { status: "error", error: result.error },
      }),
    );
  return result;
}

/** Draws a zone widget's corners in the world (null stops drawing). */
export function drawZone(
  zone: {
    points: Array<{ x: number; y: number; z: number }>;
    height: number;
  } | null,
): void {
  void fetchNui<boolean>(NuiCallback.adminZoneDraw, zone, { mockData: true });
}

export async function createRecord(
  resource: string,
  file: string,
  tab: string,
  key: string,
  label: string,
): Promise<AdminResult> {
  const result = await send(resource, { file, action: "create", key, label });
  if (result.ok) goTo(resource, tab, key);
  return result;
}

/** Whole records from a pasted JSON (all or none: one refusal names what is wrong). */
export function importRecords(
  resource: string,
  file: string,
  records: Record<string, Record<string, unknown>>,
): Promise<AdminResult> {
  return send(resource, { file, action: "import", records });
}

export async function deleteRecord(
  resource: string,
  file: string,
  tab: string,
  key: string,
): Promise<AdminResult> {
  const result = await send(resource, { file, action: "delete", key });
  if (result.ok) goTo(resource, tab);
  return result;
}

export async function myPosition(
  from: "ped" | "camera",
  ground = false,
): Promise<Point | null> {
  const answer = await fetchNui<unknown>(
    NuiCallback.adminPosition,
    { from, ground },
    { mockData: { x: 215.76, y: -810.12, z: 30.73, heading: 157.5 } },
  ).catch(() => null);
  if (typeof answer !== "object" || answer === null) return null;
  const p = answer as Record<string, unknown>;
  return typeof p.x === "number" &&
    typeof p.y === "number" &&
    typeof p.z === "number" &&
    typeof p.heading === "number"
    ? { x: p.x, y: p.y, z: p.z, heading: p.heading }
    : null;
}

/** Teleports the admin; `ground` puts the feet on the point (floor points, doors) instead of the body's centre. */
export function teleport(
  point: { x: number; y: number; z: number; heading?: number },
  ground: boolean,
): void {
  void fetchNui<boolean>(
    NuiCallback.adminTeleport,
    { ...point, ground },
    { mockData: true },
  );
}

/** Picks a place with the free camera; the panel hides until the admin places or cancels. */
export async function pickPoint(root: boolean): Promise<Point | null> {
  store.dispatch(picking(true));
  const answer = await fetchNui<unknown>(
    NuiCallback.adminPickPoint,
    { root },
    {
      mockData: { x: 228.41, y: -795.3, z: 30.62, heading: 90 },
      mockDelay: 800,
    },
  ).catch(() => null);
  store.dispatch(picking(false));
  if (typeof answer !== "object" || answer === null) return null;
  const p = answer as Record<string, unknown>;
  return typeof p.x === "number" &&
    typeof p.y === "number" &&
    typeof p.z === "number" &&
    typeof p.heading === "number"
    ? { x: p.x, y: p.y, z: p.z, heading: p.heading }
    : null;
}

/** A world object picked with the free camera: its model name and position (null: cancelled). */
export async function pickEntity(): Promise<{
  model: string;
  x: number;
  y: number;
  z: number;
} | null> {
  store.dispatch(picking(true));
  const answer = await fetchNui<unknown>(NuiCallback.adminPickEntity, null, {
    mockData: { model: "v_ilev_ph_door01", x: 434.75, y: -980.62, z: 30.84 },
    mockDelay: 800,
  }).catch(() => null);
  store.dispatch(picking(false));
  if (typeof answer !== "object" || answer === null) return null;
  const e = answer as Record<string, unknown>;
  return typeof e.model === "string" &&
    typeof e.x === "number" &&
    typeof e.y === "number" &&
    typeof e.z === "number"
    ? { model: e.model, x: e.x, y: e.y, z: e.z }
    : null;
}

/** Street and zone names at a place (or at the admin) for a name field's suggestions. */
export async function placeNames(at: Point | null): Promise<string[]> {
  const answer = await fetchNui<unknown>(NuiCallback.adminPlaceNames, at, {
    mockData: ["Alta St", "Pillbox Hill", "Alta St, Pillbox Hill"],
  }).catch(() => []);
  return Array.isArray(answer)
    ? answer.filter((v): v is string => typeof v === "string").slice(0, 6)
    : [];
}
