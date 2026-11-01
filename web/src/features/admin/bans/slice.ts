import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  banStatus,
  type BanCursor,
  type BanFilter,
  type BanRecord,
} from "@aicore-fivem/shared";

/**
 * The ban screens' data: the Bans section's list (one query's pages) and a character's ban history, each a snapshot
 * plus the server's `put` deltas. `inspected` is the ban whose dialog is open (kept even when it leaves the list).
 */
export interface BansState {
  filter: BanFilter;
  search: string;
  /** null while the first page loads. */
  rows: BanRecord[] | null;
  next: BanCursor | null;
  loading: boolean;
  /** The character whose history is shown (the server sends only bans of its account while it is open). */
  history: { charId: number; rows: BanRecord[] | null } | null;
  inspected: BanRecord | null;
}

const initialState: BansState = {
  filter: "active",
  search: "",
  rows: null,
  next: null,
  loading: false,
  history: null,
  inspected: null,
};

/** Puts a ban into a newest-first list (by id). */
function upsert(list: BanRecord[], ban: BanRecord): void {
  const at = list.findIndex((b) => b.id === ban.id);
  if (at >= 0) list[at] = ban;
  else {
    const before = list.findIndex((b) => b.id < ban.id);
    list.splice(before < 0 ? list.length : before, 0, ban);
  }
}

const bans = createSlice({
  name: "bans",
  initialState,
  reducers: {
    listLoading(
      state,
      action: PayloadAction<{ filter: BanFilter; search: string }>,
    ) {
      state.filter = action.payload.filter;
      state.search = action.payload.search;
      state.rows = null;
      state.next = null;
      state.loading = true;
    },
    /** A page arrived for this query (`more`: appended to the shown rows). */
    pageLoaded(
      state,
      action: PayloadAction<{
        filter: BanFilter;
        search: string;
        bans: BanRecord[];
        next: BanCursor | null;
        more: boolean;
      }>,
    ) {
      const p = action.payload;
      if (p.filter !== state.filter || p.search !== state.search) return;
      const rows = p.more ? [...(state.rows ?? [])] : [];
      const seen = new Set(rows.map((b) => b.id));
      for (const ban of p.bans) if (!seen.has(ban.id)) rows.push(ban);
      state.rows = rows;
      state.next = p.next;
      state.loading = false;
    },
    moreLoading(state) {
      state.loading = true;
    },
    historyLoading(state, action: PayloadAction<number>) {
      state.history = { charId: action.payload, rows: null };
    },
    historyLoaded(
      state,
      action: PayloadAction<{ charId: number; bans: BanRecord[] }>,
    ) {
      if (state.history?.charId === action.payload.charId)
        state.history.rows = action.payload.bans;
    },
    inspect(state, action: PayloadAction<BanRecord | null>) {
      state.inspected = action.payload;
    },
    cleared(state, action: PayloadAction<"list" | "history">) {
      if (action.payload === "history") state.history = null;
      else {
        state.rows = null;
        state.next = null;
        state.loading = false;
      }
      state.inspected = null;
    },
    /**
     * A ban was made, changed or lifted. The list keeps it while it still matches the tab (`now` = the server's
     * clock); a new ban joins only an unsearched list. The history takes every put (the server matched them).
     */
    put(state, action: PayloadAction<{ ban: BanRecord; now: number }>) {
      const { ban, now } = action.payload;
      if (state.inspected?.id === ban.id) state.inspected = ban;
      if (state.rows) {
        const known = state.rows.some((b) => b.id === ban.id);
        const fits =
          state.filter === "all" || banStatus(ban, now) === state.filter;
        if (known && !fits)
          state.rows = state.rows.filter((b) => b.id !== ban.id);
        else if (known || (fits && state.search === ""))
          upsert(state.rows, ban);
      }
      if (state.history?.rows) upsert(state.history.rows, ban);
    },
  },
});

export const {
  listLoading,
  pageLoaded,
  moreLoading,
  historyLoading,
  historyLoaded,
  inspect,
  cleared,
  put,
} = bans.actions;
export default bans.reducer;
