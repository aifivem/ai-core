import { useEffect, useState } from "react";
import { faIdCard, faUser } from "@fortawesome/free-solid-svg-icons";
import type { CharacterView } from "../../../../../resource/common/adminPlayers";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { runAction } from "./actions";
import { IllegalRow } from "./IllegalRow";
import { Note, PCard, Row, Rows, useAction, type T } from "./parts";

/** Metadata `height` as the form's text (empty = not set). */
const heightOf = (view: CharacterView): string => {
  const h = view.metadata.height;
  return typeof h === "number" && h > 0 ? String(h) : "";
};

/** Name, birth date, sex, nationality and height as one form (saved together, checked like the character creation form). */
export function InfoCard({ view, t }: { view: CharacterView; t: T }) {
  const height = heightOf(view);
  const [form, setForm] = useState({
    firstname: view.firstname,
    lastname: view.lastname,
    birthdate: view.birthdate,
    sex: view.sex as string,
    nationality: view.nationality,
    height,
  });
  // A change from elsewhere (another admin, a delta) replaces the form.
  useEffect(
    () =>
      setForm({
        firstname: view.firstname,
        lastname: view.lastname,
        birthdate: view.birthdate,
        sex: view.sex,
        nationality: view.nationality,
        height,
      }),
    [
      view.firstname,
      view.lastname,
      view.birthdate,
      view.sex,
      view.nationality,
      height,
    ],
  );
  const { busy, note, run } = useAction();
  const changed =
    form.firstname !== view.firstname ||
    form.lastname !== view.lastname ||
    form.birthdate !== view.birthdate ||
    form.sex !== view.sex ||
    form.nationality !== view.nationality ||
    form.height !== height;
  const save = () =>
    runAction("info", [
      view.charId,
      { ...form, height: form.height === "" ? 0 : Number(form.height) },
    ]);
  const field = (
    key: "firstname" | "lastname" | "birthdate" | "nationality",
  ) => (
    <Input
      value={form[key]}
      aria-label={t(`ADMIN_PLAYERS_F_${key.toUpperCase()}`)}
      placeholder={
        key === "birthdate"
          ? "1994-06-12"
          : key === "nationality"
            ? t("ADMIN_PLAYERS_PH_NATIONALITY")
            : undefined
      }
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
        <Row label={t("ADMIN_PLAYERS_F_NATIONALITY")}>
          {field("nationality")}
        </Row>
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
        <Row label={t("ADMIN_PLAYERS_F_HEIGHT")}>
          <Input
            value={form.height}
            inputMode="numeric"
            aria-label={t("ADMIN_PLAYERS_F_HEIGHT")}
            title={t("ADMIN_PLAYERS_H_HEIGHT")}
            placeholder={t("ADMIN_PLAYERS_PH_HEIGHT")}
            className="w-[24vh]"
            onChange={(e) =>
              setForm({
                ...form,
                height: e.target.value.replace(/[^\d]/g, "").slice(0, 3),
              })
            }
          />
        </Row>
        {view.illegalFeature && <IllegalRow view={view} t={t} />}
      </Rows>
      <div className="flex items-center justify-end gap-[1.2vh]">
        <Note note={note} t={t} />
        <Button
          variant="primary"
          disabled={!changed}
          busy={busy}
          onClick={() => void run(save)}
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
