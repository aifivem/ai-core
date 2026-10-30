import { useEffect, useState } from "react";
import { faSliders } from "@fortawesome/free-solid-svg-icons";
import type { CharacterView } from "../../../../../resource/common/adminPlayers";
import { Input } from "../../../components/ui/input";
import { Switch } from "../../../components/ui/switch";
import { runAction } from "./actions";
import { Note, PCard, Row, Rows, useAction, type T } from "./parts";

type Save = (value: unknown) => void;

/** A text or number value saved on Enter or when the box loses focus (only when it changed). */
function TextValue({ value, save }: { value: string | number; save: Save }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    if (text === String(value)) return;
    if (typeof value === "number") {
      const n = Number(text);
      if (text.trim() === "" || !Number.isFinite(n))
        return setText(String(value));
      save(n);
    } else save(text);
  };
  return (
    <Input
      value={text}
      inputMode={typeof value === "number" ? "decimal" : undefined}
      className="w-[20vh] text-right tabular-nums"
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
    />
  );
}

/** The metadata bag: scalar values edited in place, lists and objects shown as JSON. */
export function MetaCard({ view, t }: { view: CharacterView; t: T }) {
  const { note, run } = useAction();
  const keys = Object.keys(view.metadata).sort();
  const save = (key: string) => (value: unknown) =>
    void run(() => runAction("meta", [view.charId, key, value]));
  return (
    <PCard
      icon={faSliders}
      title={t("ADMIN_PLAYERS_C_META")}
      desc={t("ADMIN_PLAYERS_C_META_DESC")}
    >
      <Rows>
        {keys.length === 0 && (
          <p className="py-[1.4vh] text-[1.35vh] text-text-3">
            {t("ADMIN_PLAYERS_NO_META")}
          </p>
        )}
        {keys.map((key) => {
          const value = view.metadata[key];
          return (
            <Row key={key} label={<span className="font-mono">{key}</span>}>
              {typeof value === "boolean" ? (
                <Switch checked={value} onCheckedChange={save(key)} />
              ) : typeof value === "number" || typeof value === "string" ? (
                <TextValue value={value} save={save(key)} />
              ) : (
                <span className="font-mono text-[1.2vh] break-all text-text-2">
                  {JSON.stringify(value)}
                </span>
              )}
            </Row>
          );
        })}
      </Rows>
      <Note note={note} t={t} />
    </PCard>
  );
}
