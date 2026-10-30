// The resource's `common` path alias for bun: the server modules the bench imports only read `ResourceName` from it.
import { plugin } from "bun";

plugin({
  name: "ai-core-common",
  setup(build) {
    build.module("common", () => ({
      exports: { ResourceName: "ai-core" },
      loader: "object",
    }));
  },
});
