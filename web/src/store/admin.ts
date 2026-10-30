import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type {
  AdminDelta,
  AdminPanelSnapshot,
  ExternalPanel,
  Lookups,
} from "@aicore-fivem/shared"

/** A field's save state, shown next to its label. */
export type FieldState =
  | { status: "saving" }
  | { status: "saved" }
  | { status: "error"; error: string }

export interface AdminState {
  open: boolean
  /** One snapshot per script, kept current by the server's deltas. */
  panels: AdminPanelSnapshot[]
  /** ai-core's own texts: the panel's generic words (buttons, errors). */
  texts: Record<string, string>
  fields: Record<string, FieldState>
  /** Existing items, jobs, gangs and accounts for lookup fields (as of the panel's opening). */
  lookups: Lookups
  /** Other scripts' own panels on the dashboard. */
  external: ExternalPanel[]
  /** A point is being picked with the free camera: the panel hides. */
  picking: boolean
}

const NO_LOOKUPS: Lookups = { item: [], job: [], gang: [], account: [] }
const initialState: AdminState = {
  open: false,
  panels: [],
  texts: {},
  fields: {},
  lookups: NO_LOOKUPS,
  external: [],
  picking: false,
}

type Data = Record<string, unknown>

function put(panels: AdminPanelSnapshot[], delta: AdminDelta): void {
  const panel = panels.find((p) => p.resource === delta.resource)
  if (!panel) return
  if (delta.key === undefined) {
    if (typeof delta.value === "object" && delta.value !== null)
      panel.data[delta.file] = delta.value
    return
  }
  const records = (panel.data[delta.file] ?? {}) as Data
  if (delta.value === null) delete records[delta.key]
  else records[delta.key] = delta.value
  panel.data[delta.file] = records
}

const admin = createSlice({
  name: "admin",
  initialState,
  reducers: {
    opened(
      state,
      action: PayloadAction<{
        panels: AdminPanelSnapshot[]
        texts: Record<string, string>
        lookups: Lookups
        external: ExternalPanel[]
      }>
    ) {
      state.open = true
      state.panels = action.payload.panels
      state.texts = action.payload.texts
      state.lookups = action.payload.lookups
      state.external = action.payload.external
      state.fields = {}
      state.picking = false
    },
    picking(state, action: PayloadAction<boolean>) {
      state.picking = action.payload
    },
    closed(state) {
      state.open = false
    },
    /** A server delta, or an optimistic local write (reverted with the old value on refusal). */
    changed(state, action: PayloadAction<AdminDelta>) {
      put(state.panels, action.payload)
    },
    fieldState(
      state,
      action: PayloadAction<{ id: string; state: FieldState | null }>
    ) {
      if (action.payload.state)
        state.fields[action.payload.id] = action.payload.state
      else delete state.fields[action.payload.id]
    },
  },
})

export const { opened, closed, changed, fieldState, picking } = admin.actions
export default admin.reducer
