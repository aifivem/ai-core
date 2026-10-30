# ai-core NUI

Two screens in one page: the character screen (`src/features/characters`, its own small store and `lib/nui.ts`) and the admin panel (`src/features/admin`, the `tgiann-ui` stack: Redux `src/store`, TanStack Router `src/router.tsx` for script / tab / record, Radix primitives `src/components/ui`, fivem-nui-react).

## Admin panel

- Schema driven: `Field.tsx` only dispatches, each widget is in `widgets/`; a new widget = a new case there plus the spec in `@aicore-fivem/shared` `admin.ts`.
- Every navigation and NUI call goes through `features/admin/actions.ts`; components never call the router or fetchNui.
- Live save per field: the value shows at once, `FieldShell` shows saving / saved / the refusal under the field; a list shows the state of its rows.
- Texts: the script's own lang table first, ai-core's generic panel words second (`lang.ts`).
- Browser preview: `bun run webdev`, `?view=admin#/admin/ai-core/<tab>?key=<record>` (real schema and data files from `dev/adminMock.ts`), `&error=1` refuses every edit.
- Another script's panel in the browser: fivem-nui-react listens to messages only when `window.invokeNative` exists, so define it before the page loads (puppeteer `evaluateOnNewDocument`), open `#/admin/<resource>/<tab>?key=<record>` and post `{ action: "adminOpen", data: { panels: [{ resource, schema, texts, data }], texts } }` built from the script's schema, `data/*.json` and `locales/en.json`.

## Pitfalls

- `useNuiEvent`'s `mockData` must be one stable reference (module constant): a new object per render re-runs the effect and the browser mock re-opens the panel with the original data after every edit.
