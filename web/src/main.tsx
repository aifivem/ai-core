import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "@tanstack/react-router";
import { config } from "@fortawesome/fontawesome-svg-core";
import { applyPreview } from "./dev/preview";
import { Root } from "./Root";
import { rootRoute, router } from "./router";
import { store } from "./store";
import "./index.css";

// FA's injected unlayered CSS would beat Tailwind's icon sizes; its styles come from index.css in @layer base.
config.autoAddCss = false;
applyPreview();
rootRoute.update({ component: Root });

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    </StrictMode>,
  );
}
