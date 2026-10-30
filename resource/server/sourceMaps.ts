import { isRecord } from "@aicore-fivem/lib/shared";

/** Lines the client error reporter puts in front of a client bundle (reporter, `try{`). */
const WRAPPER_LINES = 2;
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const DIGIT = new Map([...B64].map((c, i) => [c, i]));

/** Segments of one generated line: [generated column, source index, source line, source column], sorted. */
type Line = number[][];
interface Decoded {
  sources: string[];
  lines: Line[];
}

function decodeVlq(text: string): number[] {
  const out: number[] = [];
  let value = 0;
  let shift = 0;
  for (const char of text) {
    const digit = DIGIT.get(char) ?? 0;
    value += (digit & 31) << shift;
    if (digit & 32) shift += 5;
    else {
      out.push(value & 1 ? -(value >>> 1) : value >>> 1);
      value = 0;
      shift = 0;
    }
  }
  return out;
}

function decode(raw: string): Decoded | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !isRecord(json) ||
    typeof json.mappings !== "string" ||
    !Array.isArray(json.sources)
  )
    return null;
  const sources = json.sources.map((s) => String(s).replace(/^(\.\.\/)+/, ""));
  let src = 0;
  let srcLine = 0;
  let srcCol = 0;
  const lines = json.mappings.split(";").map((text) => {
    let col = 0;
    return text
      ? text.split(",").flatMap((segment) => {
          const [dc = 0, ds, dl, dcol] = decodeVlq(segment);
          col += dc;
          if (ds === undefined || dl === undefined || dcol === undefined)
            return [];
          src += ds;
          srcLine += dl;
          srcCol += dcol;
          return [[col, src, srcLine, srcCol]];
        })
      : [];
  });
  return { sources, lines };
}

/**
 * Client bundles are minified; their hidden source maps (never in `files`, so players cannot download them) turn the
 * positions in a client error back into source files and lines. One decoded map per resource, dropped on restart.
 */
class SourceMaps {
  private readonly maps = new Map<string, Decoded | null>();

  constructor() {
    on("onResourceStart", (resource: string) => this.maps.delete(resource));
  }

  private get(resource: string): Decoded | null {
    if (!this.maps.has(resource)) {
      const raw =
        GetResourceState(resource) === "started"
          ? LoadResourceFile(resource, "dist/client.js.map")
          : null;
      this.maps.set(resource, raw ? decode(raw) : null);
    }
    return this.maps.get(resource) ?? null;
  }

  /** `@res/dist/client.js:line:col` positions in a client error, written as source positions when a map has them. */
  resolve(text: string): string {
    return text.replace(
      /@([\w.-]{1,64})\/dist\/client\.js:(\d+):(\d+)/g,
      (whole, resource: string, line: string, col: string) => {
        const map = this.get(resource);
        const segments = map?.lines[Number(line) - 1 - WRAPPER_LINES];
        if (!map || !segments?.length) return whole;
        const column = Number(col) - 1;
        let found: number[] | undefined;
        for (const segment of segments) {
          if ((segment[0] ?? 0) > column) break;
          found = segment;
        }
        if (!found) return whole;
        const [, src = 0, srcLine = 0, srcCol = 0] = found;
        return `@${resource}/${map.sources[src] ?? "?"}:${srcLine + 1}:${srcCol + 1}`;
      },
    );
  }
}

export const sourceMaps = new SourceMaps();
