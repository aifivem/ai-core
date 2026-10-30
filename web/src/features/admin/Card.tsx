import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { CardSpec } from "@aicore-fivem/shared";
import { useEditor } from "./context";
import { Field } from "./Field";
import { iconOf } from "./icons";

/** A section card (tgiann-core SectionCard): icon box, title, one sentence on what it does in the game, then its fields as an inset row list. */
export function Card({ card }: { card: CardSpec }) {
  const { t } = useEditor();
  return (
    <section className="relative flex flex-col gap-[1.4vh] rounded-[1.2vh] bg-surface p-[1.6vh] [box-shadow:0_0_0_1px_rgba(255,255,255,0.07)]">
      <header className="flex items-center gap-[1.4vh]">
        <span className="flex size-[4.2vh] shrink-0 items-center justify-center rounded-[0.8vh] bg-tgi-green-10 text-[1.7vh] text-tgi-green">
          <FontAwesomeIcon icon={iconOf(card.icon)} aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-[0.5vh]">
          <h3 className="text-[1.6vh] leading-[1.2] font-semibold">{t(card.title)}</h3>
          {card.desc && <p className="text-[1.3vh] leading-[1.4] text-text-3">{t(card.desc)}</p>}
        </div>
      </header>
      <div className="flex flex-col divide-y divide-white/6 rounded-[1vh] bg-black/20 px-[1.6vh]">
        {card.fields.map((field) => (
          <Field key={field.path} spec={field} />
        ))}
      </div>
    </section>
  );
}
