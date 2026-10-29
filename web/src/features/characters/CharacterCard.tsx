import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBriefcase, faBuildingColumns, faPlus, faUser } from "@fortawesome/free-solid-svg-icons";
import type { CharacterCard as Card } from "@aicore-fivem/shared";
import { Button } from "../../components/Button";
import { useLang } from "../../lib/lang";

const CARD = "flex h-[56vh] w-[30vh] shrink-0 flex-col overflow-hidden rounded-[1vh] border-[0.1vh] transition-[border-color,box-shadow] duration-200";
const money = (value: number): string => `$${value.toLocaleString("en-US")}`;

interface Props {
  card: Card;
  portrait: string | undefined;
  selected: boolean;
  canDelete: boolean;
  busy: boolean;
  onSelect: () => void;
  onPlay: () => void;
  onDelete: () => void;
}

/** A saved character (docs/design.md "Card"): portrait, name, job and bank, Play, Delete. */
export function CharacterCard({ card, portrait, selected, canDelete, busy, onSelect, onPlay, onDelete }: Props) {
  const t = useLang();
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={() => !card.online && onPlay()}
      className={`${CARD} cursor-pointer bg-panel ${
        selected ? "border-accent [box-shadow:0_0_2.4vh_rgba(var(--accent-rgb),0.18)]" : "border-line hover:border-line-strong"
      }`}
    >
      <div className="relative flex flex-1 items-end justify-center overflow-hidden bg-[linear-gradient(180deg,var(--panel-raised)_0%,var(--panel)_100%)]">
        {portrait ? (
          <img src={portrait} alt="" className="aspect-square w-full object-cover" />
        ) : (
          <FontAwesomeIcon icon={faUser} className="mb-[-1.2vh] text-[22vh] text-line" />
        )}
        {card.online && (
          <span className="absolute left-[1.2vh] top-[1.2vh] rounded-full border-[0.1vh] border-[rgba(var(--warn-rgb),0.5)] bg-panel px-[1vh] py-[0.3vh] text-[1.1vh] font-semibold uppercase tracking-wide text-warn">
            {t("CHAR_ONLINE")}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-[1.2vh] border-t-[0.1vh] border-line p-[1.6vh]">
        <span className="truncate text-[1.8vh] font-semibold leading-[1.2]">
          {card.firstname} {card.lastname}
        </span>
        <div className="flex flex-col gap-[0.6vh] text-[1.3vh] text-text-2">
          <span className="flex items-center gap-[1vh]">
            <FontAwesomeIcon icon={faBriefcase} className="w-[1.4vh] text-text-3" />
            {card.job ?? t("CHAR_NO_JOB")}
          </span>
          <span className="flex items-center gap-[1vh] tabular-nums">
            <FontAwesomeIcon icon={faBuildingColumns} className="w-[1.4vh] text-text-3" />
            {money(card.bank)}
          </span>
        </div>
        <Button
          variant="primary"
          disabled={card.online || busy}
          onClick={(event) => {
            event.stopPropagation();
            onPlay();
          }}
        >
          {t("CHAR_PLAY")}
        </Button>
        {canDelete && (
          <Button
            variant="destructive"
            size="sm"
            disabled={card.online || busy}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            {t("CHAR_DELETE")}
          </Button>
        )}
      </div>
    </div>
  );
}

/** A free slot: dashed outline, a thin plus, opens the creation dialog. */
export function CreateCard({ onCreate }: { onCreate: () => void }) {
  const t = useLang();
  return (
    <button
      type="button"
      onClick={onCreate}
      className={`${CARD} items-center justify-center gap-[1.6vh] border-dashed border-line-strong bg-[rgba(var(--panel-rgb),0.55)] text-text-2 hover:border-accent hover:text-text`}
    >
      <FontAwesomeIcon icon={faPlus} className="text-[4.4vh] font-thin text-text-3" />
      <span className="text-[1.8vh] font-semibold text-text">{t("CHAR_CREATE_TITLE")}</span>
      <span className="max-w-[20vh] text-center text-[1.3vh] leading-[1.45] text-text-3">{t("CHAR_CREATE_HINT")}</span>
    </button>
  );
}
