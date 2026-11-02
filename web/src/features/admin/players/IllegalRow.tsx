import type { CharacterView } from "../../../../../resource/common/adminPlayers";
import { Switch } from "../../../components/ui/switch";
import { runAction } from "./actions";
import { Note, Row, useAction, type T } from "./parts";

/** Legal / illegal status (metadata `illegal`), saved on each flip; the new value arrives as a metadata delta. */
export function IllegalRow({ view, t }: { view: CharacterView; t: T }) {
  const { busy, note, run } = useAction();
  return (
    <Row label={t("ADMIN_PLAYERS_F_ILLEGAL")}>
      <Note note={note} t={t} />
      <span title={t("ADMIN_PLAYERS_H_ILLEGAL")}>
        <Switch
          checked={view.metadata.illegal === true}
          disabled={busy}
          aria-label={t("ADMIN_PLAYERS_F_ILLEGAL")}
          onCheckedChange={(on) =>
            void run(() => runAction("illegal", [view.charId, on]))
          }
        />
      </span>
    </Row>
  );
}
