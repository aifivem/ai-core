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
  return typeof key === "string" &&
    typeof text === "string" &&
    typeof button === "string"
    ? { key, text, button }
    : null;
};

// Stable mock reference: a new object per render would re-fire the browser mock.
const SHOW_OPTIONS = { mockData: mockPrompts(), mockDelay: 300 };

/**
 * Prompts on the right edge, middle height (tgiann-core draw text pill): the key in a round cap, the action next to it.
 * The last shown one is on top, has the green key cap and is the one the interaction key acts on.
 */
export function Prompts() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);

  useNuiEvent(
    NuiMessage.promptShow,
    (value: unknown) => {
      const list = Array.isArray(value) ? value : [value];
      for (const item of list) {
        const prompt = toPrompt(item);
        if (prompt)
          setPrompts((prev) => [
            ...prev.filter((p) => p.key !== prompt.key),
            prompt,
          ]);
      }
    },
    SHOW_OPTIONS,
  );
  useNuiEvent(NuiMessage.promptHide, (key: unknown) =>
    setPrompts((prev) => prev.filter((p) => p.key !== key)),
  );

  return (
    <div className="pointer-events-none absolute inset-y-0 right-[3vh] flex flex-col-reverse items-end justify-center gap-[0.8vh]">
      <AnimatePresence initial={false} mode="popLayout">
        {[...prompts].reverse().map((prompt, index) => (
          <motion.div
            key={prompt.key}
            initial={{ opacity: 0, x: "2vh" }}
            animate={{ opacity: index === 0 ? 1 : 0.6, x: 0 }}
            exit={{
              opacity: 0,
              x: "2vh",
              transition: { duration: 0.15, ease: "easeOut" },
            }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="flex h-[4.4vh] items-center gap-[1.2vh] rounded-full bg-[rgba(19,19,19,0.75)] pr-[1.8vh] pl-[0.6vh]"
          >
            <span
              className={`flex h-[3.2vh] min-w-[3.2vh] items-center justify-center rounded-full px-[0.8vh] text-[1.4vh] font-bold ${index === 0 ? "bg-tgi-green text-tgi-green-text" : "bg-white/10 text-text"}`}
            >
              {prompt.button}
            </span>
            <span className="max-w-[36vh] truncate text-[1.4vh] leading-[1.3] font-medium">
              {prompt.text}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
