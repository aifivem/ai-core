import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useNuiEvent } from "fivem-nui-react";
import { NuiMessage } from "../../../../resource/common/nui";
import { mockPrompts } from "../../dev/promptMock";

interface Prompt {
  key: string;
  text: string;
  button: string;
}

const toPrompt = (value: unknown): Prompt | null => {
  if (typeof value !== "object" || value === null) return null;
  const { key, text, button } = value as Record<string, unknown>;
  return typeof key === "string" && typeof text === "string" && typeof button === "string" ? { key, text, button } : null;
};

// Stable mock reference: a new object per render would re-fire the browser mock.
const SHOW_OPTIONS = { mockData: mockPrompts(), mockDelay: 300 };

/**
 * Prompts on the right edge, middle height (Dark Minimal): the key in an accent cap, the action next to it. The last
 * shown one is on top and is the one the interaction key acts on.
 */
export function Prompts() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);

  useNuiEvent(
    NuiMessage.promptShow,
    (value: unknown) => {
      const list = Array.isArray(value) ? value : [value];
      for (const item of list) {
        const prompt = toPrompt(item);
        if (prompt) setPrompts((prev) => [...prev.filter((p) => p.key !== prompt.key), prompt]);
      }
    },
    SHOW_OPTIONS,
  );
  useNuiEvent(NuiMessage.promptHide, (key: unknown) => setPrompts((prev) => prev.filter((p) => p.key !== key)));

  return (
    <div className="pointer-events-none absolute inset-y-0 right-[3vh] flex flex-col-reverse items-end justify-center gap-[0.8vh]">
      <AnimatePresence initial={false} mode="popLayout">
        {[...prompts].reverse().map((prompt, index) => (
          <motion.div
            key={prompt.key}
            initial={{ opacity: 0, x: "2vh" }}
            animate={{ opacity: index === 0 ? 1 : 0.6, x: 0 }}
            exit={{ opacity: 0, x: "2vh", transition: { duration: 0.15, ease: "easeOut" } }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="flex items-center gap-[1.2vh] rounded-[0.8vh] border border-line bg-[rgba(var(--panel-rgb),0.92)] py-[0.6vh] pl-[0.6vh] pr-[1.6vh] [box-shadow:0_0.8vh_2.4vh_rgba(0,0,0,0.35)]"
          >
            <span className="flex h-[3.2vh] min-w-[3.2vh] items-center justify-center rounded-[0.6vh] border border-accent bg-[rgba(var(--accent-rgb),0.1)] px-[0.8vh] text-[1.4vh] font-semibold text-accent">
              {prompt.button}
            </span>
            <span className="max-w-[36vh] truncate text-[1.4vh] font-medium leading-[1.3] text-text">{prompt.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
