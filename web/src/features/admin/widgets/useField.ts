import { saveField } from "../editActions";
import { useEditor } from "../context";
import { getAt } from "../path";

/** The value at a path and its writer, for the editor the field sits in. */
export function useField(path: string): [unknown, (value: unknown) => void] {
  const { resource, file, key, record } = useEditor();
  return [
    getAt(record, path),
    (value) => void saveField(resource, file, key, path, value),
  ];
}
