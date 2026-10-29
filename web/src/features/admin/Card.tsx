import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { CardSpec } from "@aicore-fivem/shared";
import { useEditor } from "./context";
import { Field } from "./Field";
import { iconOf } from "./icons";

/** A section card: icon, title, one sentence on what it does in the game, then its fields. */
export function Card({ card }: { card: CardSpec }) {
  const { t } = useEditor();
  return (
    <section className="relative flex flex-col gap-[1.6vh] rounded-[1vh] border border-line bg-panel p-[1.8vh]">
      <header className="flex items-start gap-[1.2vh]">
        <span className="flex size-[3.4vh] shrink-0 items-center justify-center rounded-[0.8vh] bg-[rgba(var(--accent-rgb),0.1)] text-[1.5vh] text-accent">
          <FontAwesomeIcon icon={iconOf(card.icon)} aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-[0.3vh]">
          <h3 className="text-[1.5vh] font-semibold leading-[1.3]">{t(card.title)}</h3>
          {card.desc && <p className="text-[1.25vh] leading-[1.45] text-text-3">{t(card.desc)}</p>}
        </div>
      </header>
      <div className="flex flex-col gap-[1.8vh]">
        {card.fields.map((field) => (
          <Field key={field.path} spec={field} />
        ))}
      </div>
    </section>
  );
}
