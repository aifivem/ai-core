import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleExclamation } from "@fortawesome/free-solid-svg-icons";
import { Brand, Tagline } from "../../components/Brand";
import { useLang } from "../../lib/lang";
import { play, selectCard } from "./actions";
import { CharacterCard, CreateCard } from "./CharacterCard";
import { CreateDialog } from "./CreateDialog";
import { DeleteDialog } from "./DeleteDialog";
import { update, useScreen } from "./store";

/** Character select (docs/design.md): night Los Santos backdrop, brand, a row of character cards and free slots. */
export function CharacterScreen() {
  const t = useLang();
  const { open, screen, selected, view, busy, error, portraits } = useScreen();
  if (!open || !screen) return null;

  const slots = Array.from({ length: screen.slots }, (_, i) => i + 1);
  const deleting = view.kind === "delete" ? screen.characters.find((c) => c.id === view.characterId) : undefined;

  return (
    <div className="absolute inset-0 animate-fade bg-bg">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(./backgrounds/${screen.branding.background}.jpg)` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(var(--bg-rgb),0.55)_0%,rgba(var(--bg-rgb),0.15)_35%,rgba(var(--bg-rgb),0.85)_100%)]" />

      <div className="absolute inset-x-[5vh] top-[5vh] flex items-start justify-between">
        <Brand branding={screen.branding} />
        <Tagline branding={screen.branding} />
      </div>

      <div className="absolute inset-x-0 top-1/2 flex justify-center overflow-x-auto px-[5vh] [transform:translateY(-44%)]">
        <div className="flex animate-rise gap-[2vh]">
          {slots.map((slot) => {
            const card = screen.characters.find((c) => c.slot === slot);
            if (!card) return <CreateCard key={slot} onCreate={() => update({ view: { kind: "create", slot }, error: null })} />;
            return (
              <CharacterCard
                key={slot}
                card={card}
                portrait={portraits[card.id]}
                selected={selected === card.id}
                canDelete={screen.canDelete}
                busy={busy}
                onSelect={() => selectCard(card.id)}
                onPlay={() => void play(card.id)}
                onDelete={() => update({ view: { kind: "delete", characterId: card.id }, error: null })}
              />
            );
          })}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-[5vh] flex justify-center">
        <span className="text-[1.2vh] uppercase tracking-[0.24em] text-text-3">{t("CHAR_SUBTITLE", screen.characters.length, screen.slots)}</span>
      </div>

      {view.kind === "create" && <CreateDialog slot={view.slot} />}
      {deleting && <DeleteDialog card={deleting} />}

      {error && (
        <div className="absolute inset-x-0 bottom-[9vh] flex justify-center">
          <div className="flex animate-rise items-center gap-[1vh] rounded-[0.6vh] border-[0.1vh] border-[rgba(var(--danger-rgb),0.6)] bg-panel px-[1.6vh] py-[1.1vh] text-[1.3vh] text-danger">
            <FontAwesomeIcon icon={faCircleExclamation} />
            <span className="leading-[1.4]">{t(error)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
