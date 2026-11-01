import { useEffect, useMemo, useState } from "react";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import type {
  OnlineRow,
  StoredRow,
} from "../../../../../resource/common/adminPlayers";
import { Button } from "../../../components/ui/button";
import { VirtualList } from "../../../components/VirtualList";
import { useAppSelector } from "../../../store";
import { goPlayers, searchCharacters } from "./actions";
import { useDefs } from "./defs";
import { Chip, type T } from "./parts";
import { Panel, RowButton, Who } from "./ListPanel";

interface Results {
  query: string;
  rows: StoredRow[];
  next: number | null;
  loading: boolean;
}

const EMPTY: Results = { query: "", rows: [], next: null, loading: false };

const lastPlayed = (t: T, ms: number | null): string =>
  ms === null ? t("ADMIN_PLAYERS_NEVER") : new Date(ms).toLocaleDateString();

/** Online players (filtered as you type) next to the search over every stored character (paged by the server). */
export function PlayersList({ t }: { t: T }) {
  const online = useAppSelector((state) => state.players.online);
  const defs = useDefs();
  const [query, setQuery] = useState("");
  const [debounced] = useDebouncedValue(query, { wait: 300 });
  const [results, setResults] = useState<Results>(EMPTY);
  const q = query.trim().toLowerCase();
  const term = debounced.trim();

  useEffect(() => {
    if (term.length < 2) {
      setResults(EMPTY);
      return;
    }
    let stale = false;
    setResults({ ...EMPTY, query: term, loading: true });
    void searchCharacters(term, null).then((page) => {
      if (!stale)
        setResults({
          query: term,
          rows: page?.rows ?? [],
          next: page?.next ?? null,
          loading: false,
        });
    });
    return () => {
      stale = true;
    };
  }, [term]);

  const more = async () => {
    if (results.next === null) return;
    setResults((r) => ({ ...r, loading: true }));
    const page = await searchCharacters(results.query, results.next);
    setResults((r) =>
      r.query === results.query
        ? {
            ...r,
            rows: [...r.rows, ...(page?.rows ?? [])],
            next: page?.next ?? null,
            loading: false,
          }
        : r,
    );
  };

  const shown = useMemo(() => {
    const rows = [...(online ?? [])].sort((a, b) => a.source - b.source);
    return q
      ? rows.filter((r) =>
          `${r.name} ${r.citizenid} ${r.account} ${r.source}`
            .toLowerCase()
            .includes(q),
        )
      : rows;
  }, [online, q]);

  const onlineRow = (row: OnlineRow) => (
    <RowButton onClick={() => goPlayers(row.charId)}>
      <span className="w-[4.4vh] shrink-0 font-mono text-[1.25vh] text-text-3">
        {row.source}
      </span>
      <Who name={row.name} sub={`#${row.citizenid} · ${row.account}`} />
      <span className="flex shrink-0 items-center gap-[0.8vh] text-[1.3vh] text-text-2">
        {defs.label("job", row.job)} · {defs.grade("job", row.job, row.grade)}
        {row.duty && <Chip tone="green">{t("ADMIN_PLAYERS_ON_DUTY")}</Chip>}
      </span>
    </RowButton>
  );

  const storedRow = (row: StoredRow) => (
    <RowButton onClick={() => goPlayers(row.charId)}>
      <Who name={row.name} sub={`#${row.citizenid} · ${row.account}`} />
      {row.source !== null ? (
        <Chip tone="green">{t("ADMIN_PLAYERS_SERVER_ID", row.source)}</Chip>
      ) : (
        <span className="shrink-0 text-[1.25vh] text-text-3">
          {lastPlayed(t, row.lastPlayed)}
        </span>
      )}
    </RowButton>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[1.4vh]">
      <label className="flex h-[4.2vh] w-[60vh] max-w-full items-center gap-[1vh] rounded-full border border-white/8 bg-[#2222224D] px-[1.6vh] transition-[border-color] duration-150 focus-within:border-tgi-green-40 hover:border-white/14">
        <input
          className="h-full min-w-0 flex-1 bg-transparent text-[1.45vh] outline-none placeholder:text-text-4"
          value={query}
          autoFocus
          placeholder={t("ADMIN_PLAYERS_SEARCH_HINT")}
          aria-label={t("ADMIN_PLAYERS_SEARCH")}
          onChange={(e) => setQuery(e.target.value)}
        />
        <FontAwesomeIcon
          icon={faMagnifyingGlass}
          className="text-[1.4vh] text-text-3"
          aria-hidden
        />
      </label>
      <div className="flex min-h-0 flex-1 gap-[1.6vh]">
        <Panel
          title={t("ADMIN_PLAYERS_ONLINE")}
          count={t("ADMIN_PLAYERS_ONLINE_COUNT", online?.length ?? 0)}
        >
          <VirtualList
            className="min-h-0 flex-1"
            items={shown}
            estimateSize={6}
            getItemKey={(row) => row.source}
            empty={
              <p className="p-[1.6vh] text-[1.4vh] text-text-3">
                {t(q ? "ADMIN_NO_MATCH" : "ADMIN_PLAYERS_NONE_ONLINE")}
              </p>
            }
            renderItem={onlineRow}
          />
        </Panel>
        <Panel title={t("ADMIN_PLAYERS_STORED")}>
          {term.length < 2 ? (
            <p className="p-[1.6vh] text-[1.4vh] leading-[1.45] text-text-3">
              {t("ADMIN_PLAYERS_SEARCH_SHORT")}
            </p>
          ) : (
            <VirtualList
              className="min-h-0 flex-1"
              items={results.rows}
              estimateSize={6}
              getItemKey={(row) => row.charId}
              empty={
                <p className="p-[1.6vh] text-[1.4vh] text-text-3">
                  {t(
                    results.loading
                      ? "ADMIN_PLAYERS_SEARCHING"
                      : "ADMIN_PLAYERS_NO_RESULTS",
                  )}
                </p>
              }
              renderItem={storedRow}
            />
          )}
          {results.next !== null && (
            <div className="flex shrink-0 justify-center border-t border-white/8 p-[1vh]">
              <Button
                variant="ghost"
                size="sm"
                busy={results.loading}
                onClick={() => void more()}
              >
                {t("ADMIN_PLAYERS_MORE")}
              </Button>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
