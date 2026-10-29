import { useState, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMars, faVenus } from "@fortawesome/free-solid-svg-icons";
import { toCreateCharacter, type Sex } from "@aicore-fivem/shared";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { useLang } from "../../lib/lang";
import { create } from "./actions";
import { update, useScreen } from "./store";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-[0.6vh]">
      <span className="text-[1.2vh] uppercase tracking-[0.12em] text-text-3">{label}</span>
      {children}
    </label>
  );
}

const INPUT =
  "h-[4.2vh] rounded-[0.6vh] border-[0.1vh] border-line bg-raised px-[1.2vh] text-[1.4vh] text-text outline-none focus:border-accent [color-scheme:dark]";

/** New character in a free slot: name, birth date, sex. */
export function CreateDialog({ slot }: { slot: number }) {
  const t = useLang();
  const { busy } = useScreen();
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
    <Dialog
      title={t("CHAR_CREATE_TITLE")}
      description={t("CHAR_CREATE_SUBTITLE", slot)}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={() => update({ view: { kind: "list" }, error: null })}>
            {t("CHAR_BACK")}
          </Button>
          <Button variant="filled" className="flex-1" disabled={busy} onClick={submit}>
            {t("CHAR_CREATE")}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-[1.6vh]"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="grid grid-cols-2 gap-[1.2vh]">
          <Field label={t("CHAR_FIRSTNAME")}>
            <input className={INPUT} value={firstname} maxLength={20} autoFocus onChange={(e) => setFirstname(e.target.value)} />
          </Field>
          <Field label={t("CHAR_LASTNAME")}>
            <input className={INPUT} value={lastname} maxLength={20} onChange={(e) => setLastname(e.target.value)} />
          </Field>
        </div>
        <Field label={t("CHAR_BIRTHDATE")}>
          <input className={INPUT} type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
        </Field>
        <div className="flex flex-col gap-[0.6vh]">
          <span className="text-[1.2vh] uppercase tracking-[0.12em] text-text-3">{t("CHAR_SEX")}</span>
          <div className="grid grid-cols-2 gap-[1vh]">
            {(["male", "female"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSex(option)}
                className={`flex h-[4.2vh] items-center justify-center gap-[0.8vh] rounded-[0.6vh] border-[0.1vh] text-[1.4vh] transition-colors duration-150 ${
                  sex === option ? "border-accent bg-[rgba(var(--accent-rgb),0.1)] text-accent" : "border-line bg-raised text-text-3 hover:text-text"
                }`}
              >
                <FontAwesomeIcon icon={option === "male" ? faMars : faVenus} />
                {t(option === "male" ? "CHAR_MALE" : "CHAR_FEMALE")}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Dialog>
  );
}
