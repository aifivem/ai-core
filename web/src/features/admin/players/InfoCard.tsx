import { useEffect, useState } from "react";
import { faIdCard, faUser } from "@fortawesome/free-solid-svg-icons";
import type { CharacterView } from "../../../../../resource/common/adminPlayers";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { runAction } from "./actions";
import { Note, PCard, Row, Rows, useAction, type T } from "./parts";

/** Name, birth date and sex as one form (saved together, checked like the character creation form). */
export function InfoCard({ view, t }: { view: CharacterView; t: T }) {
  const [form, setForm] = useState({
    firstname: view.firstname,
    lastname: view.lastname,
    birthdate: view.birthdate,
    sex: view.sex as string,
  });
  // A change from elsewhere (another admin, a delta) replaces the form.
  useEffect(
    () =>
      setForm({
        firstname: view.firstname,
        lastname: view.lastname,
        birthdate: view.birthdate,
        sex: view.sex,
      }),
    [view.firstname, view.lastname, view.birthdate, view.sex],
  );
  const { busy, note, run } = useAction();
  const changed =
    form.firstname !== view.firstname ||
    form.lastname !== view.lastname ||
    form.birthdate !== view.birthdate ||
    form.sex !== view.sex;
  const field = (key: "firstname" | "lastname" | "birthdate") => (
    <Input
      value={form[key]}
      aria-label={t(`ADMIN_PLAYERS_F_${key.toUpperCase()}`)}
      placeholder={key === "birthdate" ? "1994-06-12" : undefined}
      className="w-[24vh]"
      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
    />
  );
  return (
    <PCard
      icon={faUser}
      title={t("ADMIN_PLAYERS_C_INFO")}
      desc={t("ADMIN_PLAYERS_C_INFO_DESC")}
    >
      <Rows>
        <Row label={t("ADMIN_PLAYERS_F_FIRSTNAME")}>{field("firstname")}</Row>
        <Row label={t("ADMIN_PLAYERS_F_LASTNAME")}>{field("lastname")}</Row>
        <Row label={t("ADMIN_PLAYERS_F_BIRTHDATE")}>{field("birthdate")}</Row>
        <Row label={t("ADMIN_PLAYERS_F_SEX")}>
          <div className="w-[24vh]" title={t("ADMIN_PLAYERS_H_SEX")}>
            <Select
              value={form.sex}
              aria-label={t("ADMIN_PLAYERS_F_SEX")}
              options={[
                { value: "male", label: t("ADMIN_PLAYERS_MALE") },
                { value: "female", label: t("ADMIN_PLAYERS_FEMALE") },
              ]}
              onChange={(sex) => setForm({ ...form, sex })}
            />
          </div>
        </Row>
      </Rows>
      <div className="flex items-center justify-end gap-[1.2vh]">
        <Note note={note} t={t} />
        <Button
          variant="primary"
          disabled={!changed}
          busy={busy}
          onClick={() => void run(() => runAction("info", [view.charId, form]))}
        >
          {t("ADMIN_PLAYERS_SAVE_INFO")}
        </Button>
      </div>
    </PCard>
  );
}

/** The FiveM account behind the character (read only). */
export function AccountCard({ view, t }: { view: CharacterView; t: T }) {
  return (
    <PCard
      icon={faIdCard}
      title={t("ADMIN_PLAYERS_C_ACCOUNT")}
      desc={t("ADMIN_PLAYERS_C_ACCOUNT_DESC")}
    >
      <Rows>
        <Row label={t("ADMIN_PLAYERS_F_ACCOUNT_NAME")}>{view.user.name}</Row>
        <Row label={t("ADMIN_PLAYERS_COL_ID")} mono>
          {view.citizenid}
        </Row>
        <Row label={t("ADMIN_PLAYERS_F_SLOT")}>{view.slot}</Row>
        <Row label="fivem" mono>
          {view.user.fivem}
        </Row>
        <Row label="license" mono>
          {view.user.license ?? "-"}
        </Row>
        <Row label="discord" mono>
          {view.user.discord ?? "-"}
        </Row>
      </Rows>
    </PCard>
  );
}
