import { fetchNui } from "fivem-nui-react";
import type {
  AdminPanelSnapshot,
  AdminShowTarget,
  ExternalPanel,
  Lookups,
  UpdateInfo,
} from "@aicore-fivem/shared";
import { NuiCallback } from "../../../../resource/common/nui";
import { router } from "../../router";
import { store } from "../../store";
import { closed, focused, opened, panelLoaded } from "../../store/admin";
import { setupDone } from "./setupSteps";

/** Every navigation and NUI call of the admin panel; components never call the router or fetchNui themselves. */

import { fieldId, saveField } from "./editActions";

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

/**
 * Opens on the section another admin tool asked for (`target`), else on the place the admin left (same script and tab
 * when they still exist), else on the dashboard.
 */
export function openPanel(
  panels: AdminPanelSnapshot[],
  texts: Record<string, string>,
  lookups: Lookups,
  external: ExternalPanel[],
  updates: UpdateInfo[],
  target: AdminShowTarget | null = null,
): void {
  store.dispatch(opened({ panels, texts, lookups, external, updates }));
  if (target?.section === "bans") {
    void router.navigate({
      to: "/admin/bans",
      search: target.search ? { q: target.search } : {},
    });
    return;
  }
  if (target?.section === "players") {
    void router.navigate({
      to: "/admin/players",
      search: target.charId === undefined ? {} : { char: target.charId },
    });
    return;
  }
  const params: Record<string, unknown> =
    router.state.matches.at(-1)?.params ?? {};
  if (typeof params.id === "string" && external.some((e) => e.id === params.id))
    return;
  // A server that never finished the setup guide opens on it.
  if (!setupDone(panels)) return goSetup();
  const path = router.state.location.pathname;
  if (path === "/admin/players" || path === "/admin/bans") return;
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
