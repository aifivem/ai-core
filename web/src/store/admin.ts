import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  AdminDelta,
  AdminPanelSnapshot,
  ExternalPanel,
  Lookups,
  Recommendation,
  RecommendationDelta,
  UpdateInfo,
} from "@aicore-fivem/shared";

/** A field's save state, shown next to its label. */
export type FieldState =
  | { status: "saving" }
  | { status: "saved" }
  | { status: "error"; error: string };

export interface AdminState {
  open: boolean;
  /** One snapshot per script, kept current by the server's deltas. */
  panels: AdminPanelSnapshot[];
  /** ai-core's own texts: the panel's generic words (buttons, errors). */
  texts: Record<string, string>;
  fields: Record<string, FieldState>;
  /** Existing items, jobs, gangs and accounts for lookup fields (as of the panel's opening). */
  lookups: Lookups;
  /** Other scripts' own panels on the dashboard. */
  external: ExternalPanel[];
  /** Scripts with a newer GitHub release (as of the panel's opening). */
  updates: UpdateInfo[];
  /** Scripts ai-core recommends (open snapshot, then `adminRecommendation` deltas). */
  recommendations: Recommendation[];
  /** A point is being picked with the free camera: the panel hides. */
  picking: boolean;
  focus: string | null;
}

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
const initialState: AdminState = {
  open: false,
  panels: [],
  texts: {},
  fields: {},
  lookups: NO_LOOKUPS,
  external: [],
  updates: [],
  recommendations: [],
  picking: false,
  focus: null,
};

type Data = Record<string, unknown>;

function put(panels: AdminPanelSnapshot[], delta: AdminDelta): void {
  const panel = panels.find((p) => p.resource === delta.resource);
  if (!panel) return;
  // A script whose records are not loaded yet keeps only their labels (the global search).
  if (panel.loaded === false && delta.key !== undefined) {
    const labels = (panel.index ??= {})[delta.file] ?? {};
    const path = panel.schema.files[delta.file]?.labelPath;
    const label =
      path && typeof delta.value === "object" && delta.value !== null
        ? Reflect.get(delta.value, path)
        : undefined;
    if (delta.value === null) delete labels[delta.key];
    else
      labels[delta.key] =
        typeof label === "string" && label ? label : delta.key;
    panel.index[delta.file] = labels;
    return;
  }
  if (delta.key === undefined) {
    if (typeof delta.value === "object" && delta.value !== null)
      panel.data[delta.file] = delta.value;
    return;
  }
  const records = (panel.data[delta.file] ?? {}) as Data;
  if (delta.value === null) delete records[delta.key];
  else records[delta.key] = delta.value;
  panel.data[delta.file] = records;
}

const admin = createSlice({
  name: "admin",
  initialState,
  reducers: {
    opened(
      state,
      action: PayloadAction<{
        panels: AdminPanelSnapshot[];
        texts: Record<string, string>;
        lookups: Lookups;
        external: ExternalPanel[];
        updates: UpdateInfo[];
      }>,
    ) {
      state.open = true;
      state.panels = action.payload.panels;
      state.texts = action.payload.texts;
      state.lookups = action.payload.lookups;
      state.external = action.payload.external;
      state.updates = action.payload.updates;
      state.fields = {};
      state.picking = false;
    },
    /** A field the global search jumped to (its field id): it scrolls into view and flashes once. */
    focused(state, action: PayloadAction<string | null>) {
      state.focus = action.payload;
    },
    picking(state, action: PayloadAction<boolean>) {
      state.picking = action.payload;
    },
    closed(state) {
      state.open = false;
    },
    /** A script's whole panel data arrived (the admin opened it). */
    panelLoaded(
      state,
      action: PayloadAction<{ resource: string; data: Data }>,
    ) {
      const panel = state.panels.find(
        (p) => p.resource === action.payload.resource,
      );
      if (!panel) return;
      panel.data = action.payload.data;
      panel.loaded = true;
    },
    /** A server delta, or an optimistic local write (reverted with the old value on refusal). */
    changed(state, action: PayloadAction<AdminDelta>) {
      put(state.panels, action.payload);
    },
    recommendationsOpened(state, action: PayloadAction<Recommendation[]>) {
      state.recommendations = action.payload;
    },
    recommendationChanged(state, action: PayloadAction<RecommendationDelta>) {
      const { id, value } = action.payload;
      state.recommendations = state.recommendations.filter((r) => r.id !== id);
      if (value) state.recommendations.push(value);
    },
    fieldState(
      state,
      action: PayloadAction<{ id: string; state: FieldState | null }>,
    ) {
      if (action.payload.state)
        state.fields[action.payload.id] = action.payload.state;
      else delete state.fields[action.payload.id];
    },
  },
});

export const {
  panelLoaded,
  opened,
  closed,
  changed,
  fieldState,
  focused,
  picking,
  recommendationsOpened,
  recommendationChanged,
} = admin.actions;
export default admin.reducer;
