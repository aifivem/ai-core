# ai-core NUI

Two screens in one page: the character screen (`src/features/characters`, its own small store and `lib/nui.ts`) and the admin panel (`src/features/admin`, the `aicore-ui` stack: Redux `src/store`, TanStack Router `src/router.tsx` for script / tab / record, Radix primitives `src/components/ui`, fivem-nui-react).

## Look

- TGIANN (`docs/design.md`): tokens in `src/index.css` (`tgi-green-*`, `panel`, `surface`, `control`, `text-2/3/4`, `danger*`), Unbounded 800 as `font-display` for uppercase titles; no other palette, no raw hex that has a token.
- Full-screen building blocks (screen title, vignette, round action, pill bar and pill buttons, column enter motion) are in `components/Screen.tsx`; shadcn primitives in `components/ui` carry the TGIANN skin (pill inputs and buttons, `primary` = the one filled green action).
- The admin panel copies tgiann-core's admin lib panel (sidebar, header, record list, section cards with an inset row list).
- Previews: `?view=create|delete|error|menu|notify|prompt|admin`; menu, notify, prompt and admin open without the character screen.

## Admin panel

- Routes: `/admin` dashboard (`Dashboard.tsx`), `/admin/setup` the setup guide (`Setup.tsx`), `/admin/$resource/$tab` a script's tab, `/admin/external/$id` another script's page in an iframe. Lookup lists, other panels and the free camera state (`picking`: the panel hides behind a key help bar) live in the admin slice.
- Global search (`GlobalSearch.tsx` in the header, Ctrl+K, and the dashboard box) runs on one index (`searchIndex.ts`: scripts, tabs, every field label / hint / card, records by their label) built from the open snapshots in the admin's language; a hit opens the tab (the record), a settings field scrolls into view and flashes (`jumpTo`, admin slice `focus`, `FieldShell`).
- Setup guide: steps in `setupSteps.ts` name fields of any script's panel (`resource`, `file`, `key?`, `path`); each renders the field's own widget from that script's schema, so it saves live like its tab; steps whose scripts do not run are left out. The panel opens on it while ai-core's `setupDone` is off; the last step sets it. The welcome card players see after spawning meanwhile is `features/setup/Welcome.tsx` (`?view=welcome`, `&admin=1`).
- Lookup fields: `widgets/lookup.tsx` (`LookupBox` on the Radix popover, arrows / Enter / Escape, 40 shown); `TextW` and `TagsW` switch to it when the spec has `lookup`; a stored value the game does not know shows a red "Not found" chip. Name suggestions (`suggest`) and the free camera point pick ask ai-core's client (`adminPlaceNames`, `adminPickPoint`).
- Blip widget: `widgets/BlipW.tsx` with `blips.json` (FiveM blip reference: sprite names, pictures at docs-backend.fivem.net, colours).
- Schema driven: `Field.tsx` only dispatches, each widget is in `widgets/`; a new widget = a new case there plus the spec in `@aicore-fivem/shared` `admin.ts`.
- A records tab with `table` renders `TableView` (read-only, search over every column, `VirtualList` rows, header and rows share `scrollbar-gutter: stable` so columns line up); `info` and table cells share `showValue` (`values` / `empty` labels).
- Every navigation and NUI call goes through `features/admin/actions.ts`; components never call the router or fetchNui.
- Live save per field: the value shows at once, `FieldShell` shows saving / saved / the refusal under the field; a list shows the state of its rows.
- Texts: the script's own lang table first, ai-core's generic panel words second (`lang.ts`).
- Browser preview: `bun run webdev`, `?view=admin#/admin/ai-core/<tab>?key=<record>` (real schema and data files from `dev/adminMock.ts`, sample keybinds and commands there since those come from running scripts), `&error=1` refuses every edit.
- Another script's panel in the browser: fivem-nui-react listens to messages only when `window.invokeNative` exists, so define it before the page loads (puppeteer `evaluateOnNewDocument`), open `#/admin/<resource>/<tab>?key=<record>` and post `{ action: "adminOpen", data: { panels: [{ resource, schema, texts, data }], texts } }` built from the script's schema, `data/*.json` and `locales/en.json`.

## Pitfalls

- `useNuiEvent`'s `mockData` must be one stable reference (module constant): a new object per render re-runs the effect and the browser mock re-opens the panel with the original data after every edit.
