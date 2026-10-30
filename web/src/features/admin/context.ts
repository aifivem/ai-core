import { createContext, useContext } from "react";

/** What every field of an editor writes to: one script's file, one record (none for a settings file). */
export interface EditorContext {
  resource: string;
  file: string;
  key: string | undefined;
  /** The record (or settings object) the paths read from. */
  record: unknown;
  t: (key: string, ...args: Array<string | number>) => string;
}

export const EditorCtx = createContext<EditorContext | null>(null);

export function useEditor(): EditorContext {
  const ctx = useContext(EditorCtx);
  if (!ctx) throw new Error("field outside an editor");
  return ctx;
}
