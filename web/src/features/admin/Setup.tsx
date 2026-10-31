import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import { cn } from "../../lib/utils";
import { useAppSelector } from "../../store";
import { finishSetup, loadPanelData } from "./actions";
import { EditorCtx } from "./context";
import { Field } from "./Field";
import { iconOf } from "./icons";
import { usePanelLang } from "./lang";
import { getAt } from "./path";
import { SETUP_STEPS, widgetOf, type SetupField } from "./setupSteps";

/** One field of a script's panel inside the guide: the same live-saving control as on its own tab. */
function GuideField({ field }: { field: SetupField }) {
  const t = usePanelLang(field.resource);
  const panels = useAppSelector((s) => s.admin.panels);
  const found = widgetOf(panels, field);
  // A step on a records file needs that script's records (not in the open summary).
  const unloaded = found?.panel.loaded === false && field.key !== undefined;
  useEffect(() => {
    if (unloaded) void loadPanelData(field.resource);
  }, [unloaded, field.resource]);
  if (!found) return null;
  const data = found.panel.data[field.file];
  const record = field.key === undefined ? data : getAt(data, field.key);
  if (record === undefined) return null;
  return (
    <EditorCtx.Provider
      value={{
        resource: field.resource,
        file: field.file,
        key: field.key,
        record,
        t,
      }}
    >
      <Field spec={found.spec} />
    </EditorCtx.Provider>
  );
}

/** The setup guide: the first settings of a new server step by step; every value saves live like everywhere else. */
export function Setup() {
  const panels = useAppSelector((s) => s.admin.panels);
  const t = usePanelLang("ai-core");
  const steps = SETUP_STEPS.filter((step) =>
    step.fields.some((f) => widgetOf(panels, f) !== null),
  );
  const [index, setIndex] = useState(0);
  const [seen, setSeen] = useState(() => new Set<number>([0]));
  const step = steps[index];
  const last = index === steps.length - 1;
  const go = (next: number) => {
    setIndex(next);
    setSeen((s) => new Set(s).add(next));
  };

  return (
    <div className="flex min-h-0 flex-1 gap-[2vh]">
      <nav className="flex w-[30vh] shrink-0 flex-col gap-[0.6vh]">
        {steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => go(i)}
            className={cn(
              "flex h-[5.4vh] items-center gap-[1.2vh] rounded-[1vh] px-[1.2vh] text-left transition-colors duration-150",
              i === index ? "bg-tgi-green-15" : "hover:bg-white/5",
            )}
          >
            <span
              className={cn(
                "flex size-[3.2vh] shrink-0 items-center justify-center rounded-full text-[1.25vh] font-bold",
                i === index
                  ? "bg-tgi-green text-tgi-green-text"
                  : seen.has(i)
                    ? "bg-tgi-green-15 text-tgi-green"
                    : "bg-control text-text-3",
              )}
            >
              {seen.has(i) && i !== index ? (
                <FontAwesomeIcon icon={faCheck} aria-hidden />
              ) : (
                i + 1
              )}
            </span>
            <span
              className={cn(
                "truncate text-[1.45vh] font-medium",
                i === index ? "text-text" : "text-text-2",
              )}
            >
              {t(s.title)}
            </span>
          </button>
        ))}
      </nav>
      {step && (
        <section className="flex min-w-0 flex-1 flex-col gap-[1.6vh] rounded-[1.2vh] bg-surface p-[2vh] [box-shadow:0_0_0_1px_rgba(255,255,255,0.07)]">
          <header className="flex items-center gap-[1.4vh]">
            <span className="flex size-[4.6vh] shrink-0 items-center justify-center rounded-[0.9vh] bg-tgi-green-10 text-[1.9vh] text-tgi-green">
              <FontAwesomeIcon icon={iconOf(step.icon)} aria-hidden />
            </span>
            <div className="flex min-w-0 flex-col gap-[0.5vh]">
              <h2 className="font-display text-[1.8vh] leading-[1.15] font-extrabold uppercase">
                {t(step.title)}
              </h2>
              <p className="text-[1.35vh] leading-[1.45] text-text-3">
                {t(step.desc)}
              </p>
            </div>
          </header>
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col divide-y divide-white/6 rounded-[1vh] bg-black/20 px-[1.6vh]">
              {step.fields.map((f) => (
                <GuideField
                  key={`${f.resource}/${f.file}/${f.key ?? ""}/${f.path}`}
                  field={f}
                />
              ))}
            </div>
          </ScrollArea>
          <footer className="flex items-center gap-[1vh]">
            <span className="flex-1 text-[1.25vh] text-text-3">
              {t("ADMIN_SETUP_STEP", index + 1, steps.length)}
            </span>
            {index > 0 && (
              <Button variant="ghost" onClick={() => go(index - 1)}>
                {t("ADMIN_SETUP_BACK")}
              </Button>
            )}
            {last ? (
              <Button variant="primary" onClick={() => void finishSetup()}>
                {t("ADMIN_SETUP_FINISH")}
              </Button>
            ) : (
              <Button variant="primary" onClick={() => go(index + 1)}>
                {t("ADMIN_SETUP_NEXT")}
              </Button>
            )}
          </footer>
        </section>
      )}
    </div>
  );
}
