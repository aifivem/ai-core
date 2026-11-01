/**
 * External character screens (multichar scripts) ai-core steps aside for, in detection order: `auto` uses the first
 * one running, else ai-core's own screen. No FiveM code here: the panel schema (and the web preview) import it. What
 * each one reads and calls, and its tested state: `docs/compat/multichar.md`. A new one = a line here.
 */
export const MULTICHARS: ReadonlyArray<{ resource: string; version?: string }> =
  [
    { resource: "tgiann-multichar", version: "2.0.1" },
    { resource: "qb-multicharacter", version: "1.5.0" },
    { resource: "esx_multicharacter", version: "1.16.3" },
    { resource: "0r-multicharacterv3" },
    { resource: "0r-multicharacterv2" },
    { resource: "0r-multicharacter" },
    { resource: "um-multicharacter" },
  ];
