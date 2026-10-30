import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCakeCandles, faCheck, faMars, faUser, faVenus } from "@fortawesome/free-solid-svg-icons";
import { toCreateCharacter, type Sex } from "@aicore-fivem/shared";
import { PillBar, PillButton, RoundAction, ScreenHeader, columnDelay, screenEnter } from "../../components/Screen";
import { useLang } from "../../lib/lang";
import { cn } from "../../lib/utils";
import { create } from "./actions";
import { update, useScreen } from "./store";

const BUBBLE = "flex size-[3.7vh] shrink-0 items-center justify-center rounded-full bg-black/20 text-[1.7vh] text-tgi-green";

/** Rounded field of the form (tgiann-multichar PillField): icon bubble left, green frame while focused, red while invalid. */
function PillField({ icon, invalid, children }: { icon: ReactNode; invalid: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex h-[4.7vh] min-w-0 flex-1 items-center gap-[1vh] rounded-full border bg-white/3 p-[0.5vh] transition-[border-color] duration-150",
        invalid ? "border-danger" : "border-white/10 focus-within:border-tgi-green-60",
      )}
    >
      <span className={BUBBLE}>{icon}</span>
      {children}
    </div>
  );
}

const INPUT = "h-full min-w-0 flex-1 bg-transparent pr-[1.4vh] text-[1.6vh] text-tgi-green outline-none [color-scheme:dark] placeholder:text-white/40";

/** New character in a free slot (tgiann-multichar create screen): title left, back / form / create on the right. */
export function CreateDialog({ slot }: { slot: number }) {
  const t = useLang();
  const { busy, error } = useScreen();
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [birthdate, setBirthdate] = useState("2000-01-01");
  const [sex, setSex] = useState<Sex>("male");

  const submit = (): void => {
    const input = toCreateCharacter({ slot, firstname, lastname, birthdate, sex });
    if ("error" in input) return update({ error: input.error });
    void create(input);
  };

  return (
    <div className="relative grid h-full grid-cols-[1fr_auto] p-[2.4vh]">
      <motion.div {...screenEnter} transition={columnDelay(0)}>
        <ScreenHeader title={t("CHAR_CREATE_TITLE")} desc={t("CHAR_CREATE_SUBTITLE", slot)} />
      </motion.div>
      <motion.div {...screenEnter} transition={columnDelay(1)} className="flex min-h-0 flex-col items-end justify-between">
        <RoundAction label={t("CHAR_BACK")} icon={faArrowLeft} disabled={busy} onClick={() => update({ view: { kind: "list" }, error: null })} />
        <form
          className="flex w-[46vh] flex-col gap-[1vh] rounded-[1.4vh] bg-[rgba(6,6,6,0.64)] p-[1vh]"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <PillField icon={<FontAwesomeIcon icon={faUser} />} invalid={error === "CHAR_ERR_FIRSTNAME"}>
            <input className={INPUT} value={firstname} maxLength={20} autoFocus placeholder={t("CHAR_FIRSTNAME")} aria-label={t("CHAR_FIRSTNAME")} onChange={(e) => setFirstname(e.target.value)} />
          </PillField>
          <PillField icon={<FontAwesomeIcon icon={faUser} />} invalid={error === "CHAR_ERR_LASTNAME"}>
            <input className={INPUT} value={lastname} maxLength={20} placeholder={t("CHAR_LASTNAME")} aria-label={t("CHAR_LASTNAME")} onChange={(e) => setLastname(e.target.value)} />
          </PillField>
          <PillField icon={<FontAwesomeIcon icon={faCakeCandles} />} invalid={error === "CHAR_ERR_BIRTHDATE"}>
            <input className={INPUT} type="date" value={birthdate} aria-label={t("CHAR_BIRTHDATE")} onChange={(e) => setBirthdate(e.target.value)} />
          </PillField>
          <div role="radiogroup" aria-label={t("CHAR_SEX")} className="flex gap-[1vh]">
            {(["male", "female"] as const).map((option) => {
              const active = sex === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSex(option)}
                  className={cn(
                    "flex h-[4.7vh] min-w-0 flex-1 items-center gap-[1vh] rounded-full border bg-white/3 p-[0.5vh] text-left text-[1.6vh] transition-[border-color,background-color,transform] duration-150 ease-out hover:bg-white/6 active:[transform:scale(0.98)]",
                    active ? "border-tgi-green-60" : "border-white/10",
                  )}
                >
                  <span className={BUBBLE}>
                    <FontAwesomeIcon icon={option === "male" ? faMars : faVenus} />
                  </span>
                  <span className={cn("flex-1 truncate", active ? "text-tgi-green" : "text-text-2")}>{t(option === "male" ? "CHAR_MALE" : "CHAR_FEMALE")}</span>
                  {active && (
                    <span className="mr-[0.6vh] flex size-[2.9vh] items-center justify-center rounded-full bg-tgi-green text-[1.3vh] text-tgi-green-text">
                      <FontAwesomeIcon icon={faCheck} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <button type="submit" className="hidden" />
        </form>
        <PillBar>
          <PillButton label={t("CHAR_CREATE")} icon={faCheck} pending={busy} onClick={submit} />
        </PillBar>
      </motion.div>
    </div>
  );
}
