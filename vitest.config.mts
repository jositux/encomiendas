import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
      // Los servicios/server actions importan "server-only", que revienta
      // a propósito si algo lo importa fuera de un Server Component real
      // (ver node_modules/server-only/index.js). Bajo Vitest no existe ese
      // contexto, así que se resuelve a un módulo vacío en vez de mockearlo
      // archivo por archivo.
      "server-only": path.resolve(dirname, "./test/mocks/server-only.ts"),
    },
  },
});
