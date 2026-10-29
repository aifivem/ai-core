import type { TabSpec } from "@aicore-fivem/shared";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Card } from "./Card";
import { EditorCtx, type EditorContext } from "./context";

/** One column of cards over a settings object or one record, every field saving live. */
export function Editor({ tab, ctx }: { tab: TabSpec; ctx: EditorContext }) {
  return (
    <EditorCtx.Provider value={ctx}>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-[1.6vh] p-[2.4vh]">
          {tab.cards.map((card) => (
            <Card key={card.title} card={card} />
          ))}
        </div>
      </ScrollArea>
    </EditorCtx.Provider>
  );
}
