import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import type { CharacterCard as Card } from "@aicore-fivem/shared";
import { Tooltip } from "../../components/ui/tooltip";
import { useLang } from "../../lib/lang";
import { cn } from "../../lib/utils";

const initialsOf = (card: Card): string =>
  `${card.firstname.charAt(0)}${card.lastname.charAt(0)}`.toUpperCase();

interface Props {
  card: Card;
  portrait: string | undefined;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onPlay: () => void;
}

/** A saved character in the slot row (tgiann-multichar CharSlot): round portrait or initials; name and job float above while hovered or picked. */
export function CharacterCard({
  card,
  portrait,
  selected,
  busy,
  onSelect,
  onPlay,
}: Props) {
  const t = useLang();
  const [hover, setHover] = useState(false);
  const name = `${card.firstname} ${card.lastname}`;
  return (
    <div className="relative flex w-[10.6vh] flex-col items-center">
      <AnimatePresence initial={false}>
        {(hover || selected) && (
          <motion.div
            initial={{ opacity: 0, y: "0.6vh" }}
            animate={{ opacity: 1, y: "0vh" }}
            exit={{
              opacity: 0,
              y: "0.4vh",
              transition: { duration: 0.12, ease: "easeOut" },
            }}
            transition={{
              type: "spring",
              duration: 0.28,
              bounce: 0,
              opacity: { type: "tween", duration: 0.22, ease: "easeOut" },
            }}
            className="pointer-events-none absolute bottom-[12vh] flex w-max max-w-[20vh] flex-col items-center text-center"
          >
            <span className="max-w-full truncate text-[1.8vh] leading-[1.3]">
              {name}
            </span>
            <span className="text-[1.4vh] leading-[1.3] text-warn [font-variant:all-small-caps]">
              {card.job ?? t("CHAR_NO_JOB")}
            </span>
            <span
              aria-hidden
              className="mt-[0.4vh] h-0 w-0 border-x-[0.4vh] border-t-[0.6vh] border-x-transparent border-t-tgi-green"
            />
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        aria-label={name}
        aria-pressed={selected}
        disabled={busy && !selected}
        onClick={onSelect}
        onDoubleClick={() => !card.online && onPlay()}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        className={cn(
          "relative rounded-full border-[0.3vh] p-0 transition-[border-color,opacity,transform] duration-150 ease-out enabled:active:[transform:scale(0.96)] disabled:cursor-not-allowed disabled:opacity-50",
          selected
            ? "border-tgi-green"
            : "border-transparent hover:border-white/30",
        )}
      >
        <span className="relative flex size-[10vh] items-center justify-center overflow-hidden rounded-full bg-[#2b2b2b]">
          {portrait ? (
            <img
              src={portrait}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <span className="text-[3vh] font-semibold text-text-2">
              {initialsOf(card)}
            </span>
          )}
        </span>
        {card.online && (
          <span className="absolute inset-x-0 -bottom-[0.8vh] mx-auto w-max rounded-[0.4vh] bg-warn px-[0.6vh] py-[0.2vh] text-[1.1vh] font-bold text-tgi-green-text uppercase">
            {t("CHAR_ONLINE")}
          </span>
        )}
      </button>
    </div>
  );
}

/** A free slot: a green plus in a faint circle that opens the creation screen. */
export function CreateCard({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: () => void;
}) {
  const t = useLang();
  return (
    <Tooltip content={t("CHAR_CREATE_TITLE")}>
      <button
        type="button"
        aria-label={t("CHAR_CREATE_TITLE")}
        disabled={busy}
        onClick={onCreate}
        className="flex size-[10.6vh] items-center justify-center rounded-full border-[0.3vh] border-transparent bg-black/20 text-tgi-green transition-[background-color,border-color,transform,opacity] duration-150 ease-out hover:border-tgi-green-40 hover:bg-black/40 enabled:active:[transform:scale(0.96)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FontAwesomeIcon icon={faPlus} className="text-[2.6vh]" />
      </button>
    </Tooltip>
  );
}
