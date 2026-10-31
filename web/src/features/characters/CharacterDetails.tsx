import { AnimatePresence, motion } from "motion/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuildingColumns,
  faCakeCandles,
  faFlag,
  faMoneyBill,
  faVenusMars,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import type { CharacterCard } from "@aicore-fivem/shared";
import { useLang } from "../../lib/lang";
import { groupDigits } from "@aicore-fivem/lib/shared";

const money = (value: number): string => `$${groupDigits(value)}`;
/** "1994-05-12" -> "12/05/1994". */
const dateOf = (iso: string): string => iso.split("-").reverse().join("/");

function StatRow({
  icon,
  label,
  value,
}: {
  icon: IconDefinition;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-[1.4vh]">
      <FontAwesomeIcon icon={icon} className="w-[2.3vh] text-[2vh]" />
      <div className="flex min-w-0 flex-col">
        <span className="text-[1.4vh] leading-[1.3] text-text-3 uppercase">
          {label}
        </span>
        <span className="truncate text-[1.7vh] leading-[1.3] uppercase tabular-nums">
          {value}
        </span>
      </div>
    </div>
  );
}

/** Left column (tgiann-multichar CharDetails): the picked character's slot, name, job and stats. */
export function CharacterDetails({
  card,
}: {
  card: CharacterCard | undefined;
}) {
  const t = useLang();
  return (
    <AnimatePresence mode="wait" initial={false}>
      {card && (
        <motion.div
          key={card.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="flex w-[40vh] flex-col gap-[2vh]"
        >
          <div className="flex flex-col gap-[0.8vh] border-b border-white/10 pb-[2vh]">
            <div className="flex gap-[0.6vh] text-[1.6vh]">
              <span className="text-text-3">{t("CHAR_NUMBER")}</span>
              <span className="text-tgi-green tabular-nums">
                {String(card.slot).padStart(2, "0")}
              </span>
            </div>
            <h2 className="font-display text-[3.2vh] leading-[1.1] font-extrabold tracking-[-0.01em] break-words uppercase">
              {card.firstname} {card.lastname}
            </h2>
            <span className="text-[1.6vh] text-text-3">
              {card.job ?? t("CHAR_NO_JOB")}
            </span>
          </div>
          <div className="flex flex-col gap-[1.4vh]">
            <StatRow
              icon={faBuildingColumns}
              label={t("CHAR_BANK")}
              value={money(card.bank)}
            />
            <StatRow
              icon={faMoneyBill}
              label={t("CHAR_CASH")}
              value={money(card.cash)}
            />
            <StatRow
              icon={faCakeCandles}
              label={t("CHAR_BIRTHDATE")}
              value={dateOf(card.birthdate)}
            />
            <StatRow
              icon={faVenusMars}
              label={t("CHAR_SEX")}
              value={t(card.sex === "male" ? "CHAR_MALE" : "CHAR_FEMALE")}
            />
            {card.nationality && (
              <StatRow
                icon={faFlag}
                label={t("CHAR_NATIONALITY")}
                value={card.nationality}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
