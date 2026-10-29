import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import type { CharacterCard } from "@aicore-fivem/shared";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { useLang } from "../../lib/lang";
import { remove } from "./actions";
import { update, useScreen } from "./store";

/** Deleting a character for good: names what goes with it; the safe choice keeps it. */
export function DeleteDialog({ card }: { card: CharacterCard }) {
  const t = useLang();
  const { busy } = useScreen();
  return (
    <Dialog
      title={t("CHAR_DELETE_TITLE", `${card.firstname} ${card.lastname}`)}
      description={t("CHAR_DELETE_TEXT")}
      icon={
        <span className="flex size-[4.4vh] shrink-0 items-center justify-center rounded-full border-[0.1vh] border-[rgba(var(--danger-rgb),0.6)] text-[1.8vh] text-danger">
          <FontAwesomeIcon icon={faTriangleExclamation} />
        </span>
      }
      footer={
        <>
          <Button variant="secondary" className="flex-1" disabled={busy} onClick={() => update({ view: { kind: "list" }, error: null })}>
            {t("CHAR_DELETE_KEEP")}
          </Button>
          <Button variant="destructive" className="flex-1" disabled={busy} onClick={() => void remove(card.id)}>
            {t("CHAR_DELETE_CONFIRM")}
          </Button>
        </>
      }
    />
  );
}
