import { Dialog as DialogPrimitive } from "radix-ui";
import { faTrashCan } from "@fortawesome/free-solid-svg-icons";
import type { CharacterCard } from "@aicore-fivem/shared";
import { PillBar, PillButton } from "../../components/Screen";
import { useLang } from "../../lib/lang";
import { remove } from "./actions";
import { update, useScreen } from "./store";

/**
 * Deleting a character for good (TGIANN confirm popup): dark scrim, the question in the middle, a pill bar under it.
 * The safe choice keeps the character; Escape and a click on the scrim keep it too.
 */
export function DeleteDialog({ card }: { card: CharacterCard | undefined }) {
  const t = useLang();
  const { busy } = useScreen();
  const keep = () => !busy && update({ view: { kind: "list" }, error: null });
  return (
    <DialogPrimitive.Root open={card !== undefined} onOpenChange={(open) => !open && keep()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[90] flex animate-fade items-center justify-center bg-black/70">
          {card && (
            <DialogPrimitive.Content onOpenAutoFocus={(event) => event.preventDefault()} className="flex w-[60vh] animate-pop flex-col items-center gap-[2vh] text-center">
              <div className="flex flex-col items-center gap-[0.8vh]">
                <DialogPrimitive.Title className="text-[2vh] leading-[1.3] text-white/90 uppercase">{t("CHAR_DELETE_TITLE", `${card.firstname} ${card.lastname}`)}</DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-[1.5vh] leading-[1.45] text-white/60">{t("CHAR_DELETE_TEXT")}</DialogPrimitive.Description>
              </div>
              <PillBar className="gap-[0.7vh] p-[1vh]">
                <PillButton label={t("CHAR_DELETE_CONFIRM")} icon={faTrashCan} variant="danger" className="px-[2vh]" pending={busy} onClick={() => void remove(card.id)} />
                <PillButton label={t("CHAR_DELETE_KEEP")} variant="dark" className="px-[2vh]" disabled={busy} onClick={keep} />
              </PillBar>
            </DialogPrimitive.Content>
          )}
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
