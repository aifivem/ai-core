import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  CharacterView,
  OnlineRow,
  PlayersDelta,
} from "../../../../../resource/common/adminPlayers";

/** The Players screen's data: the online list and the open character, each one snapshot plus the server's deltas. */
export interface PlayersState {
  /** null until the first rows arrived. */
  online: OnlineRow[] | null;
  /** The `rev` last applied per server id (removals included): an older `rows` message never overwrites it. */
  revs: Record<number, number>;
  view: CharacterView | null;
  /** The open character's state: loading its snapshot, shown, or gone (deleted / never existed). */
  status: "none" | "loading" | "shown" | "gone";
}

const initialState: PlayersState = {
  online: null,
  revs: {},
  view: null,
  status: "none",
};

const players = createSlice({
  name: "players",
  initialState,
  reducers: {
    listOpened(state) {
      state.online = null;
      state.revs = {};
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
        const newer = (source: number) => (state.revs[source] ?? -1) < d.rev;
        const gone = new Set(d.remove.filter(newer));
        const put = new Map(
          d.put.filter((row) => newer(row.source)).map((r) => [r.source, r]),
        );
        for (const source of gone) state.revs[source] = d.rev;
        for (const source of put.keys()) state.revs[source] = d.rev;
        const next: OnlineRow[] = [];
        for (const row of state.online ?? []) {
          if (gone.has(row.source)) continue;
          next.push(put.get(row.source) ?? row);
          put.delete(row.source);
        }
        for (const row of put.values()) next.push(row);
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
  listOpened,
  viewLoading,
  viewLoaded,
  viewClosed,
  cleared,
  delta,
} = players.actions;
export default players.reducer;
