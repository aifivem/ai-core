import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  CharacterView,
  OnlineRow,
  PlayersDelta,
} from "../../../../../resource/common/adminPlayers";

/** The Players screen's data: the online list and the open character, each one snapshot plus the server's deltas. */
export interface PlayersState {
  /** null until the snapshot arrived. */
  online: OnlineRow[] | null;
  view: CharacterView | null;
  /** The open character's state: loading its snapshot, shown, or gone (deleted / never existed). */
  status: "none" | "loading" | "shown" | "gone";
}

const initialState: PlayersState = { online: null, view: null, status: "none" };

const players = createSlice({
  name: "players",
  initialState,
  reducers: {
    onlineLoaded(state, action: PayloadAction<OnlineRow[]>) {
      state.online = action.payload;
    },
    viewLoading(state) {
      state.view = null;
      state.status = "loading";
    },
    viewLoaded(state, action: PayloadAction<CharacterView | null>) {
      state.view = action.payload;
      state.status = action.payload ? "shown" : "gone";
    },
    viewClosed(state) {
      state.view = null;
      state.status = "none";
    },
    cleared() {
      return initialState;
    },
    delta(state, action: PayloadAction<PlayersDelta>) {
      const d = action.payload;
      if (d.kind === "rows") {
        if (!state.online) return;
        const gone = new Set(d.remove);
        const put = new Map(d.put.map((row) => [row.source, row]));
        const next = state.online
          .filter((row) => !gone.has(row.source))
          .map((row) => put.get(row.source) ?? row);
        for (const row of d.put)
          if (!state.online.some((r) => r.source === row.source))
            next.push(row);
        state.online = next;
        return;
      }
      if (d.kind === "view") {
        if (state.view?.charId === d.view.charId) state.view = d.view;
        return;
      }
      const view = state.view;
      if (!view || view.charId !== d.charId) return;
      switch (d.kind) {
        case "char":
          Object.assign(view, d.patch);
          break;
        case "money":
          view.money[d.account] = d.balance;
          break;
        case "meta":
          if (d.value === null) delete view.metadata[d.key];
          else view.metadata[d.key] = d.value;
          break;
        case "gone":
          state.view = null;
          state.status = "gone";
          break;
        default: {
          const _exhaustive: never = d;
          return _exhaustive;
        }
      }
    },
  },
});

export const {
  onlineLoaded,
  viewLoading,
  viewLoaded,
  viewClosed,
  cleared,
  delta,
} = players.actions;
export default players.reducer;
