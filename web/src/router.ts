import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

/**
 * Where the admin panel is (script, tab, record) lives in the router; memory history (NUI has no url), the browser
 * preview seeds it from the hash. The character screen has a single view and no route.
 */
/**
 * The root route gets its view (`Root.tsx`) in `main.tsx`: the screens navigate through `router`, so this file
 * imports none of them.
 */
export const rootRoute = createRootRoute();
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => null,
});
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: () => null,
});
const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/setup",
  component: () => null,
});
const externalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/external/$id",
  component: () => null,
});
/** The Players section: the list, or one character with `?char=<id>`. */
const playersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/players",
  validateSearch: (search: Record<string, unknown>): { char?: number } =>
    typeof search.char === "number" && Number.isInteger(search.char)
      ? { char: search.char }
      : {},
  component: () => null,
});
/** The Bans section, `?q=` a search to start with. */
const bansRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/bans",
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search.q === "string" ? { q: search.q } : {},
  component: () => null,
});
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/$resource/$tab",
  validateSearch: (search: Record<string, unknown>): { key?: string } =>
    typeof search.key === "string" ? { key: search.key } : {},
  component: () => null,
});

const start = window.location.hash.startsWith("#/")
  ? window.location.hash.slice(1)
  : "/";

export const router = createRouter({
  routeTree: rootRoute.addChildren([
    indexRoute,
    dashboardRoute,
    setupRoute,
    externalRoute,
    playersRoute,
    bansRoute,
    adminRoute,
  ]),
  history: createMemoryHistory({ initialEntries: [start] }),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
