/** Dotted paths into panel data (`spawn.select.ped`, `grades.2.label`; list indexes are 0-based here). */

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

export function getAt(root: unknown, path: string): unknown {
  let current = root;
  for (const part of path.split(".")) {
    if (Array.isArray(current)) current = current[Number(part)];
    else if (isObject(current)) current = current[part];
    else return undefined;
  }
  return current;
}

/** A copy of `root` with `value` at `parts` (objects and arrays on the way are copied, never mutated). */
export function setIn(root: unknown, parts: string[], value: unknown): unknown {
  const [head, ...rest] = parts;
  if (head === undefined) return value;
  if (Array.isArray(root)) {
    const copy = [...root];
    copy[Number(head)] = setIn(copy[Number(head)], rest, value);
    return copy;
  }
  const base = isObject(root) ? root : {};
  return { ...base, [head]: setIn(base[head], rest, value) };
}

/** The section a path writes (its first part) and the section's new value. */
export function sectionWrite(record: unknown, path: string, value: unknown): { section: string; value: unknown } {
  const [section = "", ...rest] = path.split(".");
  return { section, value: setIn(getAt(record, section), rest, value) };
}
