import {
  toAdminShowTarget,
  type AdminDelta,
  type AdminPanelSnapshot,
  type ExternalPanel,
  type Lookups,
  type UpdateInfo,
} from "@aicore-fivem/shared";
import { mockAdminOpen } from "../../dev/adminMock";
import { store } from "../../store";
import { changed } from "../../store/admin";
import { openPanel } from "./actions";
import { openRecommendations } from "./recommendationActions";
import peds from "./peds.json";

/** The admin panel's NUI messages: the open snapshot and the panels' deltas. */

// One options object: a new one per render would re-subscribe (and re-fire the browser mock) on every render.
export const OPEN_OPTIONS = { mockData: mockAdminOpen(), mockDelay: 300 };

/** GTA's ped models (no native lists them): a static list shipped with the panel. */
const PED_OPTIONS = peds.map((value) => ({ value, label: value }));
const NO_LOOKUPS: Lookups = {
  item: [],
  job: [],
  gang: [],
  account: [],
  resource: [],
  player: [],
  vehicle: [],
  ped: [],
};

export function onOpen(value: unknown): void {
  if (typeof value !== "object" || value === null) return;
  const { panels, texts, lookups, external, updates, target } = value as {
    panels?: unknown;
    texts?: unknown;
    lookups?: unknown;
    external?: unknown;
    updates?: unknown;
    target?: unknown;
  };
  // ai-core builds these objects itself; only the outer shape is checked.
  if (!Array.isArray(panels)) return;
  openPanel(
    panels as AdminPanelSnapshot[],
    typeof texts === "object" && texts !== null
      ? (texts as Record<string, string>)
      : {},
    typeof lookups === "object" && lookups !== null
      ? { ...NO_LOOKUPS, ...(lookups as Partial<Lookups>), ped: PED_OPTIONS }
      : { ...NO_LOOKUPS, ped: PED_OPTIONS },
    Array.isArray(external) ? (external as ExternalPanel[]) : [],
    Array.isArray(updates) ? (updates as UpdateInfo[]) : [],
    toAdminShowTarget(target),
  );
  openRecommendations(value);
}

export function onDelta(value: unknown): void {
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as AdminDelta).resource === "string"
  )
    store.dispatch(changed(value as AdminDelta));
}
