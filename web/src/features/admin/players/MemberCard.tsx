import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBriefcase,
  faPeopleGroup,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import type { CharacterView } from "../../../../../resource/common/adminPlayers";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { useAppSelector } from "../../../store";
import { LookupBox } from "../widgets/lookup";
import { runAction } from "./actions";
import { useDefs, type Kind } from "./defs";
import { Note, PCard, Rows, useAction, type T } from "./parts";
import { MemberRow } from "./MemberRow";

/** A character's jobs (with duty) or gangs (with the active one): grade per row, remove, add. */
export function MemberCard({
  kind,
  view,
  t,
}: {
  kind: Kind;
  view: CharacterView;
  t: T;
}) {
  const defs = useDefs();
  const unemployed = useAppSelector((state) => {
    const settings = state.admin.panels.find((p) => p.resource === "ai-core")
      ?.data.settings as { jobs?: { unemployed?: unknown } } | undefined;
    return typeof settings?.jobs?.unemployed === "string"
      ? settings.jobs.unemployed
      : "unemployed";
  });
  const { busy, note, run } = useAction();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [grade, setGrade] = useState("0");
  const list =
    kind === "job"
      ? view.jobs.map((m) => ({ name: m.job, grade: m.grade }))
      : view.gangs.map((m) => ({ name: m.gang, grade: m.grade }));
  const current = kind === "job" ? view.duty : view.activeGang;
  const online = view.source !== null;
  const options = useMemo(
    () =>
      defs
        .options(kind)
        .filter(
          (o) =>
            !list.some((m) => m.name === o.value) &&
            !(kind === "job" && o.value === unemployed),
        ),
    [defs, kind, list, unemployed],
  );
  const id = view.charId;

  const add = async () => {
    if (!picked) return;
    const ok = await run(() => runAction(kind, [id, picked, Number(grade)]));
    if (ok) {
      setPicked(null);
      setQuery("");
      setGrade("0");
    }
  };

  return (
    <PCard
      icon={kind === "job" ? faBriefcase : faPeopleGroup}
      title={t(
        kind === "job" ? "ADMIN_PLAYERS_C_JOBS" : "ADMIN_PLAYERS_C_GANGS",
      )}
      desc={t(
        kind === "job"
          ? "ADMIN_PLAYERS_C_JOBS_DESC"
          : "ADMIN_PLAYERS_C_GANGS_DESC",
      )}
    >
      <Rows>
        {list.length === 0 && (
          <p className="py-[1.4vh] text-[1.35vh] text-text-3">
            {t(
              kind === "job"
                ? "ADMIN_PLAYERS_NO_JOBS"
                : "ADMIN_PLAYERS_NO_GANGS",
            )}
          </p>
        )}
        {list.map((m) => (
          <MemberRow
            key={m.name}
            kind={kind}
            id={id}
            m={m}
            current={current}
            online={online}
            defs={defs}
            run={run}
            t={t}
          />
        ))}
      </Rows>
      <div className="flex items-center gap-[1vh]">
        <div className="min-w-0 flex-1">
          <LookupBox
            source={options}
            query={query}
            onQuery={(q) => {
              setQuery(q);
              setPicked(null);
            }}
            onPick={(o) => {
              setPicked(o.value);
              setQuery(o.label);
              setGrade("0");
            }}
            empty={t("ADMIN_NO_MATCH")}
            anchor={(input) => (
              <Input
                {...input}
                onChange={(e) => input.onChange(e.target.value)}
                placeholder={t(
                  kind === "job"
                    ? "ADMIN_PLAYERS_PICK_JOB"
                    : "ADMIN_PLAYERS_PICK_GANG",
                )}
              />
            )}
          />
        </div>
        <div className="w-[20vh]">
          <Select
            value={grade}
            aria-label={t(
              kind === "job"
                ? "ADMIN_PLAYERS_ADD_JOB"
                : "ADMIN_PLAYERS_ADD_GANG",
            )}
            options={
              picked ? defs.grades(kind, picked) : [{ value: "0", label: "0" }]
            }
            onChange={setGrade}
          />
        </div>
        <Button disabled={!picked} busy={busy} onClick={() => void add()}>
          <FontAwesomeIcon icon={faPlus} aria-hidden />
          {t(
            kind === "job" ? "ADMIN_PLAYERS_ADD_JOB" : "ADMIN_PLAYERS_ADD_GANG",
          )}
        </Button>
      </div>
      <Note note={note} t={t} />
    </PCard>
  );
}
