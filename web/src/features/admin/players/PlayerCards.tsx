import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxOpen,
  faCubes,
  faLocationDot,
  faPersonWalkingArrowRight,
  faUserShield,
} from "@fortawesome/free-solid-svg-icons";
import type { CharacterView } from "../../../../../resource/common/adminPlayers";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { LookupBox } from "../widgets/lookup";
import { openInventory, runAction } from "./actions";
import { Note, PCard, Row, Rows, useAction, type T } from "./parts";

const fixed = (n: number): string => n.toFixed(2);

/** Where the character is (or spawns next), Go to and Bring. */
export function PositionCard({ view, t }: { view: CharacterView; t: T }) {
  const { busy, note, run } = useAction();
  const p = view.position;
  return (
    <PCard
      icon={faLocationDot}
      title={t("ADMIN_PLAYERS_C_POSITION")}
      desc={t("ADMIN_PLAYERS_C_POSITION_DESC")}
    >
      <Rows>
        <Row label="x / y / z" mono>
          {p
            ? `${fixed(p.x)} / ${fixed(p.y)} / ${fixed(p.z)}`
            : t("ADMIN_PLAYERS_NO_POSITION")}
        </Row>
      </Rows>
      <div className="flex flex-wrap items-center gap-[1vh]">
        <Button
          disabled={!p}
          busy={busy}
          onClick={() => void run(() => runAction("goto", [view.charId]))}
        >
          <FontAwesomeIcon icon={faPersonWalkingArrowRight} aria-hidden />
          {t("ADMIN_PLAYERS_GOTO")}
        </Button>
        <Button
          busy={busy}
          onClick={() => void run(() => runAction("bring", [view.charId]))}
        >
          <FontAwesomeIcon icon={faUserShield} aria-hidden />
          {t("ADMIN_PLAYERS_BRING")}
        </Button>
        <Note note={note} t={t} />
      </div>
    </PCard>
  );
}

/** Give or take an item of the running inventory, open the inventory (online only). */
export function ItemsCard({ view, t }: { view: CharacterView; t: T }) {
  const { busy, note, run } = useAction();
  const [query, setQuery] = useState("");
  const [item, setItem] = useState<string | null>(null);
  const [count, setCount] = useState("1");
  const online = view.source !== null;
  const n = Number(count);
  const ready = online && item !== null && Number.isInteger(n) && n >= 1;
  const send = (mode: "give" | "remove") =>
    void run(() => runAction("item", [view.charId, item, n, mode]));
  return (
    <PCard
      icon={faCubes}
      title={t("ADMIN_PLAYERS_C_ITEMS")}
      desc={
        online
          ? t("ADMIN_PLAYERS_C_ITEMS_DESC")
          : t("ADMIN_PLAYERS_ONLINE_ONLY")
      }
    >
      <div className="flex items-center gap-[1vh]">
        <div className="min-w-0 flex-1">
          <LookupBox
            source="item"
            query={query}
            onQuery={(q) => {
              setQuery(q);
              setItem(null);
            }}
            onPick={(o) => {
              setItem(o.value);
              setQuery(o.label);
            }}
            empty={t("ADMIN_NO_MATCH")}
            anchor={(input) => (
              <Input
                {...input}
                disabled={!online}
                onChange={(e) => input.onChange(e.target.value)}
                placeholder={t("ADMIN_PLAYERS_ITEM")}
              />
            )}
          />
        </div>
        <Input
          className="w-[10vh]"
          inputMode="numeric"
          value={count}
          disabled={!online}
          aria-label={t("ADMIN_PLAYERS_COUNT")}
          onChange={(e) => setCount(e.target.value.replace(/[^\d]/g, ""))}
        />
      </div>
      <div className="flex flex-wrap items-center gap-[1vh]">
        <Button disabled={!ready} busy={busy} onClick={() => send("give")}>
          {t("ADMIN_PLAYERS_GIVE")}
        </Button>
        <Button disabled={!ready} busy={busy} onClick={() => send("remove")}>
          {t("ADMIN_PLAYERS_TAKE")}
        </Button>
        <Button
          variant="ghost"
          disabled={!online}
          onClick={() => void run(() => openInventory(view.charId))}
        >
          <FontAwesomeIcon icon={faBoxOpen} aria-hidden />
          {t("ADMIN_PLAYERS_INVENTORY")}
        </Button>
        <Note note={note} t={t} />
      </div>
    </PCard>
  );
}
