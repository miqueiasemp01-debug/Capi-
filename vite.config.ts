import { defineConfig } from "vite";

export default defineConfig({
  base: "/Capi-/",
  build: {
    outDir: "dist",
    target: "es2020",
  },
});
