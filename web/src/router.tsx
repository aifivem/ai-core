import { createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { App } from "./App";
import { AdminRoot } from "./features/admin/AdminRoot";
import { Prompts } from "./features/prompts/Prompts";

/**
 * Where the admin panel is (script, tab, record) lives in the router; memory history (NUI has no url), the browser
 * preview seeds it from the hash. The character screen has a single view and no route.
 */
const rootRoute = createRootRoute({
  component: () => (
    <>
      <App />
      <Prompts />
      <AdminRoot />
    </>
  ),
});
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: () => null });
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/$resource/$tab",
  validateSearch: (search: Record<string, unknown>): { key?: string } => (typeof search.key === "string" ? { key: search.key } : {}),
  component: () => null,
});

const start = window.location.hash.startsWith("#/") ? window.location.hash.slice(1) : "/";

export const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute, adminRoute]),
  history: createMemoryHistory({ initialEntries: [start] }),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
