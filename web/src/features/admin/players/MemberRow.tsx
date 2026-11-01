import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { Button } from "../../../components/ui/button";
import { Select } from "../../../components/ui/select";
import { Switch } from "../../../components/ui/switch";
import { runAction } from "./actions";
import type { Kind, useDefs } from "./defs";
import type { T, useAction } from "./parts";

/** One job or gang of a character: its grade, the duty / active switch and remove. */
export function MemberRow({
  kind,
  id,
  m,
  current,
  online,
  defs,
  run,
  t,
}: {
  kind: Kind;
  id: number;
  m: { name: string; grade: number };
  current: string | null;
  online: boolean;
  defs: ReturnType<typeof useDefs>;
  run: ReturnType<typeof useAction>["run"];
  t: T;
}) {
  return (
    <div className="flex min-h-[5vh] items-center gap-[1.2vh] py-[0.8vh]">
      <span className="min-w-0 flex-1 truncate text-[1.4vh] font-medium">
        {defs.label(kind, m.name)}
      </span>
      <div className="w-[20vh]">
        <Select
          value={String(m.grade)}
          aria-label={defs.label(kind, m.name)}
          options={defs.grades(kind, m.name)}
          onChange={(g) =>
            void run(() => runAction(kind, [id, m.name, Number(g)]))
          }
        />
      </div>
      <label
        className="flex items-center gap-[0.8vh] text-[1.25vh] text-text-3"
        title={
          kind === "job" && !online ? t("ADMIN_PLAYERS_ONLINE_ONLY") : undefined
        }
      >
        {t(kind === "job" ? "ADMIN_PLAYERS_DUTY" : "ADMIN_PLAYERS_ACTIVE")}
        <Switch
          checked={current === m.name}
          disabled={kind === "job" && !online}
          onCheckedChange={(on) =>
            void run(() =>
              runAction(kind === "job" ? "duty" : "activeGang", [
                id,
                on ? m.name : null,
              ]),
            )
          }
        />
      </label>
      <Button
        variant="icon"
        aria-label={t("ADMIN_PLAYERS_REMOVE")}
        title={t("ADMIN_PLAYERS_REMOVE")}
        onClick={() =>
          void run(() =>
            runAction(kind === "job" ? "removeJob" : "removeGang", [
              id,
              m.name,
            ]),
          )
        }
      >
        <FontAwesomeIcon icon={faTrash} aria-hidden />
      </Button>
    </div>
  );
}
