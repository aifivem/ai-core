import { useEffect, useState } from "react";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useNuiEvent } from "fivem-nui-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBan,
  faClockRotateLeft,
  faGavel,
  faLayerGroup,
  faMagnifyingGlass,
  faUnlock,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { BanFilter, BanRecord } from "@aicore-fivem/shared";
import { NuiMessage } from "../../../../../resource/common/nui";
import { Button } from "../../../components/ui/button";
import { TabBar } from "../../../components/ui/tabs";
import { VirtualList } from "../../../components/VirtualList";
import { useAppSelector } from "../../../store";
import { Panel, RowButton, Who } from "../players/PlayersList";
import type { T } from "../players/parts";
import {
  closeBans,
  inspectBan,
  loadMore,
  onBansDelta,
  openList,
} from "./actions";
import { BanDetailsDialog, BanFormDialog } from "./BanDialogs";
import { banTitle, endText, StatusChip, useServerNow } from "./parts";

const TABS = [
  { value: "active", label: "ADMIN_BANS_F_ACTIVE", icon: faBan },
  { value: "expired", label: "ADMIN_BANS_F_EXPIRED", icon: faClockRotateLeft },
  { value: "revoked", label: "ADMIN_BANS_F_REVOKED", icon: faUnlock },
  { value: "all", label: "ADMIN_BANS_F_ALL", icon: faLayerGroup },
] as const satisfies ReadonlyArray<{
  value: BanFilter;
  label: string;
  icon: IconDefinition;
}>;

/** One ban in a list: id, name and reason, state and end; opens the details dialog. */
export function BanRow({ ban, now, t }: { ban: BanRecord; now: number; t: T }) {
  return (
    <RowButton onClick={() => inspectBan(ban)}>
      <span className="w-[5.6vh] shrink-0 font-mono text-[1.25vh] text-text-3">
        #{ban.id}
      </span>
      <Who name={banTitle(ban, t)} sub={ban.reason} />
      <span className="flex w-[30vh] shrink-0 items-center justify-end gap-[0.8vh] text-right text-[1.25vh] text-text-2">
        <span className="truncate">{endText(ban, now, t)}</span>
        <StatusChip ban={ban} now={now} t={t} />
      </span>
    </RowButton>
  );
}

/**
 * The Bans section (`/admin/bans`, `?q=` a search to start with): one list per state tab, the server's search at 1+
 * characters (debounced), keyset pages with Load more. The list is a snapshot plus the server's ban deltas.
 */
export function BansSection({ q, t }: { q: string | undefined; t: T }) {
  const { rows, next, loading } = useAppSelector((s) => s.bans);
  const [filter, setFilter] = useState<BanFilter>("active");
  const now = useServerNow();
  const [query, setQuery] = useState(q ?? "");
  const [debounced] = useDebouncedValue(query, { wait: 300 });
  const [creating, setCreating] = useState(false);
  const term = debounced.trim();
  useNuiEvent(NuiMessage.adminBans, onBansDelta);

  useEffect(() => setQuery(q ?? ""), [q]);
  useEffect(() => {
    void openList(filter, term);
  }, [filter, term]);
  useEffect(() => () => closeBans("list"), []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[1.4vh] pr-[1vh]">
      <div className="flex flex-wrap items-center gap-[1.2vh]">
        <label className="flex h-[4.2vh] w-[48vh] max-w-full items-center gap-[1vh] rounded-full border border-white/8 bg-[#2222224D] px-[1.6vh] transition-[border-color] duration-150 focus-within:border-tgi-green-40 hover:border-white/14">
          <input
            className="h-full min-w-0 flex-1 bg-transparent text-[1.45vh] outline-none placeholder:text-text-4"
            value={query}
            autoFocus
            placeholder={t("ADMIN_BANS_SEARCH_HINT")}
            aria-label={t("ADMIN_BANS_SEARCH")}
            onChange={(e) => setQuery(e.target.value)}
          />
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="text-[1.4vh] text-text-3"
            aria-hidden
          />
        </label>
        <TabBar
          id="bans-filter"
          value={filter}
          aria-label={t("ADMIN_BANS")}
          tabs={TABS.map((tab) => ({ ...tab, label: t(tab.label) }))}
          onChange={setFilter}
        />
        <Button
          variant="primary"
          className="ml-auto"
          onClick={() => setCreating(true)}
        >
          <FontAwesomeIcon icon={faGavel} aria-hidden />
          {t("ADMIN_BANS_NEW")}
        </Button>
      </div>
      <Panel
        title={t(TABS.find((tab) => tab.value === filter)?.label ?? "")}
        count={rows ? t("ADMIN_BANS_SHOWN", rows.length) : undefined}
      >
        <VirtualList
          className="min-h-0 flex-1"
          items={rows ?? []}
          estimateSize={6}
          getItemKey={(ban) => ban.id}
          empty={
            <p className="p-[1.6vh] text-[1.4vh] text-text-3">
              {t(
                rows === null
                  ? "ADMIN_BANS_LOADING"
                  : term
                    ? "ADMIN_NO_MATCH"
                    : "ADMIN_BANS_NONE",
              )}
            </p>
          }
          renderItem={(ban) => <BanRow ban={ban} now={now} t={t} />}
        />
        {next !== null && (
          <div className="flex shrink-0 justify-center border-t border-white/8 p-[1vh]">
            <Button
              variant="ghost"
              size="sm"
              busy={loading}
              onClick={() => void loadMore()}
            >
              {t("ADMIN_BANS_MORE")}
            </Button>
          </div>
        )}
      </Panel>
      <BanFormDialog open={creating} onOpenChange={setCreating} t={t} />
      <BanDetailsDialog t={t} />
    </div>
  );
}
